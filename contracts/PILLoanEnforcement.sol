// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// FLATTENED CONTRACT - For verification and e-signing package
// Original file: contracts/PILLoanEnforcement.sol
// OpenZeppelin Contracts v5.x - Dependencies listed but not inlined for verification clarity
// To compile: Install @openzeppelin/contracts and restore import statements
//
// OpenZeppelin Dependencies: IERC20, IERC721, Ownable, ReentrancyGuard

/**
 * @title PILLoanEnforcement
 * @author Millionaire Resilience LLC
 * @notice PIL-based loan enforcement contract similar to a SAFE note
 * @dev Implements automatic IP transfer to lenders upon default via Story Protocol
 * 
 * UCC-1 INTEGRATION:
 * This smart contract bridges the UCC-1 financing statement with on-chain IP tokens.
 * Upon default, intellectual property is automatically transferred to the lender,
 * enforcing the security interest filed under the Uniform Commercial Code.
 * 
 * STORY PROTOCOL INTEGRATION:
 * - Connects to Story Protocol IP Asset Registry
 * - Uses PIL (Programmable IP License) for licensing terms
 * - Leverages Story Attestation Service for valuation certification
 */
contract PILLoanEnforcement is Ownable, ReentrancyGuard {
    
    // ============ STORY PROTOCOL ADDRESSES ============
    
    // Story Protocol Mainnet (Chain ID: 1514)
    address public constant STORY_PROTOCOL_REGISTRY = 0x1a9d0d28a0422F26D31Be72Edc6f13ea4371E11B;
    address public constant STORY_LICENSING_MODULE = 0xd81fd78f557b457b4350cB95D20b547bFEb4D857;
    address public constant STORY_ROYALTY_MODULE = 0xCC8b9f0c9Dc370Ed1F41d95F74C9f72E08f24C90;
    
    // Millionaire Resilience IP Asset
    address public constant MR_IPID = 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE;
    uint256 public constant MR_TOKEN_ID = 15192;
    
    // Millionaire Resilience Coinbase Wallet
    address public constant MR_COINBASE_WALLET = 0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a;
    
    // ============ STABLECOIN ADDRESSES ============
    
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // ============ STRUCTS ============
    
    /**
     * @notice PIL License Terms (Programmable IP License)
     */
    struct PILTerms {
        uint256 royaltyRate;           // Basis points (e.g., 500 = 5%)
        bool stakingRequired;          // Whether staking is required
        uint256 stakingAmount;         // Required stake amount
        bool transferable;             // Whether license is transferable
        bool commercialUse;            // Whether commercial use is permitted
        string licenseType;            // "PIL-PER", "PIL-COM", "PIL-ENT"
    }
    
    /**
     * @notice Loan structure with UCC-1 integration
     */
    struct Loan {
        uint256 id;
        address borrower;
        address lender;
        address stablecoin;
        uint256 principal;
        uint256 interestRate;          // Basis points annual
        uint256 outstandingBalance;
        uint256 originationDate;
        uint256 maturityDate;
        uint256 lastPaymentDate;
        address ipAssetId;             // Story Protocol IPID
        uint256 ipTokenId;             // NFT Token ID
        bytes32 ucc1FilingHash;        // Hash of UCC-1 filing
        bytes32 attestationHash;       // Story Attestation hash
        LoanStatus status;
        uint256[] amortizationDueDates;
        uint256[] amortizationAmounts;
        uint256 nextPaymentIndex;
    }
    
    /**
     * @notice Loan status enumeration
     */
    enum LoanStatus {
        Active,
        PaidOff,
        Defaulted,
        Liquidated
    }
    
    /**
     * @notice Licensing revenue record
     */
    struct LicenseRevenue {
        uint256 timestamp;
        address token;
        uint256 amount;
        string source;                 // "PIL-PER", "PIL-COM", "PIL-ENT", "ROYALTY"
        uint256 loanId;
        bool appliedToDebt;
    }
    
    // ============ STATE VARIABLES ============
    
    uint256 public loanCounter;
    uint256 public revenueCounter;
    uint256 public defaultGracePeriod = 30 days;
    
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(uint256 => LicenseRevenue[]) public loanRevenues;
    mapping(address => bool) public approvedStablecoins;
    mapping(bytes32 => bool) public registeredUCC1Filings;
    
    // ============ EVENTS ============
    
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 principal,
        address ipAssetId
    );
    
    event UCC1Filed(
        bytes32 indexed filingHash,
        address indexed debtor,
        address indexed securedParty,
        uint256 loanId
    );
    
    event LicenseRevenueReceived(
        uint256 indexed loanId,
        address indexed ipAssetId,
        uint256 amount,
        address token,
        string source
    );
    
    event PaymentApplied(
        uint256 indexed loanId,
        uint256 amount,
        uint256 remainingBalance,
        bool fromLicenseRevenue
    );
    
    event LoanDefaulted(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 outstandingBalance
    );
    
    event IPTransferredToLender(
        uint256 indexed loanId,
        address indexed ipAssetId,
        uint256 tokenId,
        address indexed newOwner
    );
    
    event StoryAttestationRecorded(
        uint256 indexed loanId,
        bytes32 attestationHash,
        string attestationType
    );
    
    // ============ MODIFIERS ============
    
    modifier validLoan(uint256 loanId) {
        require(loanId > 0 && loanId <= loanCounter, "Invalid loan ID");
        _;
    }
    
    modifier onlyBorrower(uint256 loanId) {
        require(msg.sender == loans[loanId].borrower, "Not borrower");
        _;
    }
    
    modifier onlyLender(uint256 loanId) {
        require(msg.sender == loans[loanId].lender, "Not lender");
        _;
    }
    
    modifier loanActive(uint256 loanId) {
        require(loans[loanId].status == LoanStatus.Active, "Loan not active");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() Ownable(msg.sender) {
        approvedStablecoins[USDC] = true;
        approvedStablecoins[USDT] = true;
        approvedStablecoins[DAI] = true;
    }
    
    // ============ LOAN ORIGINATION ============
    
    /**
     * @notice Create a new IP-backed stablecoin loan
     * @dev Registers UCC-1 filing hash on-chain
     * @param borrower Address of the borrower (IP owner)
     * @param lender Address of the lender (secured party)
     * @param stablecoin Address of the stablecoin (USDC/USDT/DAI)
     * @param principal Loan principal amount
     * @param interestRate Annual interest rate in basis points
     * @param termMonths Loan term in months
     * @param ipAssetId Story Protocol IPID
     * @param ipTokenId NFT Token ID
     * @param ucc1FilingHash Hash of the UCC-1 financing statement
     */
    function createLoan(
        address borrower,
        address lender,
        address stablecoin,
        uint256 principal,
        uint256 interestRate,
        uint256 termMonths,
        address ipAssetId,
        uint256 ipTokenId,
        bytes32 ucc1FilingHash
    ) external nonReentrant returns (uint256 loanId) {
        require(borrower != address(0), "Invalid borrower");
        require(lender != address(0), "Invalid lender");
        require(approvedStablecoins[stablecoin], "Stablecoin not approved");
        require(principal > 0, "Invalid principal");
        require(interestRate <= 5000, "Interest rate too high"); // Max 50%
        require(termMonths >= 1 && termMonths <= 120, "Invalid term");
        require(!registeredUCC1Filings[ucc1FilingHash], "UCC-1 already registered");
        
        loanCounter++;
        loanId = loanCounter;
        
        // Calculate maturity date
        uint256 maturityDate = block.timestamp + (termMonths * 30 days);
        
        // Create loan record
        Loan storage loan = loans[loanId];
        loan.id = loanId;
        loan.borrower = borrower;
        loan.lender = lender;
        loan.stablecoin = stablecoin;
        loan.principal = principal;
        loan.interestRate = interestRate;
        loan.outstandingBalance = principal;
        loan.originationDate = block.timestamp;
        loan.maturityDate = maturityDate;
        loan.lastPaymentDate = block.timestamp;
        loan.ipAssetId = ipAssetId;
        loan.ipTokenId = ipTokenId;
        loan.ucc1FilingHash = ucc1FilingHash;
        loan.status = LoanStatus.Active;
        loan.nextPaymentIndex = 0;
        
        // Generate amortization schedule
        _generateAmortizationSchedule(loanId, termMonths);
        
        // Register UCC-1 filing
        registeredUCC1Filings[ucc1FilingHash] = true;
        
        // Track borrower loans
        borrowerLoans[borrower].push(loanId);
        
        emit LoanCreated(loanId, borrower, lender, principal, ipAssetId);
        emit UCC1Filed(ucc1FilingHash, borrower, lender, loanId);
        
        return loanId;
    }
    
    /**
     * @notice Generate amortization schedule with principal + interest payments
     */
    function _generateAmortizationSchedule(
        uint256 loanId,
        uint256 termMonths
    ) internal {
        Loan storage loan = loans[loanId];
        
        // Calculate monthly payment (principal + interest)
        uint256 monthlyInterestRate = loan.interestRate / 12;
        uint256 monthlyPayment = _calculateMonthlyPayment(
            loan.principal,
            monthlyInterestRate,
            termMonths
        );
        
        // Generate schedule
        for (uint256 i = 0; i < termMonths; i++) {
            uint256 dueDate = loan.originationDate + ((i + 1) * 30 days);
            loan.amortizationDueDates.push(dueDate);
            loan.amortizationAmounts.push(monthlyPayment);
        }
    }
    
    /**
     * @notice Calculate monthly payment using standard amortization formula
     */
    function _calculateMonthlyPayment(
        uint256 principal,
        uint256 monthlyRateBps,
        uint256 termMonths
    ) internal pure returns (uint256) {
        if (monthlyRateBps == 0) {
            return principal / termMonths;
        }
        
        // Simplified calculation (for production, use more precise math)
        uint256 totalInterest = (principal * monthlyRateBps * termMonths) / 10000;
        uint256 totalPayment = principal + totalInterest;
        return totalPayment / termMonths;
    }
    
    // ============ STORY ATTESTATION INTEGRATION ============
    
    /**
     * @notice Record Story Attestation Service certification
     * @param loanId The loan ID
     * @param attestationHash Hash from Story Attestation Service
     * @param attestationType Type of attestation (VALUATION, REGISTRATION, etc.)
     */
    function recordStoryAttestation(
        uint256 loanId,
        bytes32 attestationHash,
        string calldata attestationType
    ) external validLoan(loanId) onlyOwner {
        loans[loanId].attestationHash = attestationHash;
        
        emit StoryAttestationRecorded(loanId, attestationHash, attestationType);
    }
    
    /**
     * @notice Request valuation attestation from Story Attestation Service
     * @dev Called off-chain, hash recorded on-chain
     */
    function requestValuationAttestation(
        uint256 loanId
    ) external view validLoan(loanId) returns (
        address ipAssetId,
        uint256 tokenId,
        bytes32 currentAttestation
    ) {
        Loan storage loan = loans[loanId];
        return (loan.ipAssetId, loan.ipTokenId, loan.attestationHash);
    }
    
    // ============ LICENSE REVENUE ROUTING ============
    
    /**
     * @notice Receive licensing revenue and apply to loan repayment
     * @dev PRIMARY SOURCE OF LOAN REPAYMENT per UCC-1 perfection
     * @param loanId The loan ID
     * @param amount Amount of revenue received
     * @param token Token address (stablecoin)
     * @param source Revenue source type
     */
    function receiveLicenseRevenue(
        uint256 loanId,
        uint256 amount,
        address token,
        string calldata source
    ) external nonReentrant validLoan(loanId) loanActive(loanId) {
        require(approvedStablecoins[token], "Token not approved");
        require(amount > 0, "Invalid amount");
        
        Loan storage loan = loans[loanId];
        
        // Transfer stablecoin to this contract
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        // Record revenue
        revenueCounter++;
        LicenseRevenue memory revenue = LicenseRevenue({
            timestamp: block.timestamp,
            token: token,
            amount: amount,
            source: source,
            loanId: loanId,
            appliedToDebt: false
        });
        loanRevenues[loanId].push(revenue);
        
        emit LicenseRevenueReceived(loanId, loan.ipAssetId, amount, token, source);
        
        // Apply to loan repayment (100% of licensing revenues)
        _applyPaymentToLoan(loanId, amount, token, true);
    }
    
    /**
     * @notice Apply payment to loan balance
     */
    function _applyPaymentToLoan(
        uint256 loanId,
        uint256 amount,
        address token,
        bool fromLicenseRevenue
    ) internal {
        Loan storage loan = loans[loanId];
        
        // Convert if different stablecoin (simplified - assume 1:1 for stablecoins)
        uint256 paymentAmount = amount;
        
        if (paymentAmount >= loan.outstandingBalance) {
            // Loan fully paid
            uint256 excess = paymentAmount - loan.outstandingBalance;
            loan.outstandingBalance = 0;
            loan.status = LoanStatus.PaidOff;
            loan.lastPaymentDate = block.timestamp;
            
            // Return excess to borrower
            if (excess > 0) {
                IERC20(token).transfer(loan.borrower, excess);
            }
            
            // Transfer remaining payment to lender
            if (paymentAmount > excess) {
                IERC20(token).transfer(loan.lender, paymentAmount - excess);
            }
        } else {
            // Partial payment
            loan.outstandingBalance -= paymentAmount;
            loan.lastPaymentDate = block.timestamp;
            
            // Transfer to lender
            IERC20(token).transfer(loan.lender, paymentAmount);
            
            // Update amortization progress
            _updateAmortizationProgress(loanId, paymentAmount);
        }
        
        emit PaymentApplied(loanId, paymentAmount, loan.outstandingBalance, fromLicenseRevenue);
    }
    
    /**
     * @notice Update amortization schedule progress
     */
    function _updateAmortizationProgress(
        uint256 loanId,
        uint256 paymentAmount
    ) internal {
        Loan storage loan = loans[loanId];
        
        // Mark payments as made based on amount
        uint256 remaining = paymentAmount;
        while (remaining > 0 && loan.nextPaymentIndex < loan.amortizationAmounts.length) {
            uint256 scheduled = loan.amortizationAmounts[loan.nextPaymentIndex];
            if (remaining >= scheduled) {
                remaining -= scheduled;
                loan.nextPaymentIndex++;
            } else {
                break;
            }
        }
    }
    
    // ============ DEFAULT & IP TRANSFER ============
    
    /**
     * @notice Check if loan is in default
     * @param loanId The loan ID
     * @return isDefault Whether loan is in default
     * @return daysOverdue Number of days overdue
     */
    function checkDefault(
        uint256 loanId
    ) public view validLoan(loanId) returns (bool isDefault, uint256 daysOverdue) {
        Loan storage loan = loans[loanId];
        
        if (loan.status != LoanStatus.Active) {
            return (false, 0);
        }
        
        // Check if any scheduled payment is overdue
        if (loan.nextPaymentIndex < loan.amortizationDueDates.length) {
            uint256 nextDueDate = loan.amortizationDueDates[loan.nextPaymentIndex];
            
            if (block.timestamp > nextDueDate + defaultGracePeriod) {
                daysOverdue = (block.timestamp - nextDueDate) / 1 days;
                isDefault = true;
            }
        }
        
        // Check maturity
        if (block.timestamp > loan.maturityDate && loan.outstandingBalance > 0) {
            daysOverdue = (block.timestamp - loan.maturityDate) / 1 days;
            isDefault = true;
        }
        
        return (isDefault, daysOverdue);
    }
    
    /**
     * @notice Declare loan default and initiate IP transfer
     * @dev PIL SCROLL CONTRACT - Similar to SAFE note conversion
     * @param loanId The loan ID
     */
    function declareDefault(
        uint256 loanId
    ) external nonReentrant validLoan(loanId) onlyLender(loanId) loanActive(loanId) {
        (bool isDefault, ) = checkDefault(loanId);
        require(isDefault, "Loan not in default");
        
        Loan storage loan = loans[loanId];
        loan.status = LoanStatus.Defaulted;
        
        emit LoanDefaulted(loanId, loan.borrower, loan.lender, loan.outstandingBalance);
        
        // Initiate IP transfer
        _executeIPTransfer(loanId);
    }
    
    /**
     * @notice Execute automatic IP transfer to lender upon default
     * @dev CRITICAL: This enforces the UCC-1 security interest on-chain
     */
    function _executeIPTransfer(uint256 loanId) internal {
        Loan storage loan = loans[loanId];
        
        // Transfer IP NFT to lender via Story Protocol
        // Note: In production, this would call Story Protocol's transfer functions
        (bool success,) = STORY_PROTOCOL_REGISTRY.call(
            abi.encodeWithSignature(
                "transferIP(address,address,uint256)",
                loan.borrower,
                loan.lender,
                loan.ipTokenId
            )
        );
        
        // If direct transfer fails, record for manual execution
        if (!success) {
            // Emit event for off-chain execution
            emit IPTransferredToLender(
                loanId,
                loan.ipAssetId,
                loan.ipTokenId,
                loan.lender
            );
        }
        
        // Update loan status
        loan.status = LoanStatus.Liquidated;
        
        // Reassign licensing rights to lender
        _reassignLicensingRights(loanId);
        
        emit IPTransferredToLender(
            loanId,
            loan.ipAssetId,
            loan.ipTokenId,
            loan.lender
        );
    }
    
    /**
     * @notice Reassign all licensing rights to lender
     */
    function _reassignLicensingRights(uint256 loanId) internal {
        Loan storage loan = loans[loanId];
        
        // Call Story Protocol Licensing Module to transfer rights
        (bool success,) = STORY_LICENSING_MODULE.call(
            abi.encodeWithSignature(
                "transferLicenseOwnership(address,address)",
                loan.ipAssetId,
                loan.lender
            )
        );
        
        // Best-effort call to Royalty Module to redirect royalties (may not be deployed on this chain)
        if (success) {
            // solhint-disable-next-line avoid-low-level-calls
            STORY_ROYALTY_MODULE.call(
                abi.encodeWithSignature(
                    "setRoyaltyReceiver(address,address)",
                    loan.ipAssetId,
                    loan.lender
                )
            );
        }
    }
    
    // ============ PIL LICENSE FUNCTIONS ============
    
    /**
     * @notice Get PIL license terms for a loan's IP
     * @param licenseType Type of license (PIL-PER, PIL-COM, PIL-ENT)
     */
    function getPILTerms(
        uint256, /* loanId */
        string calldata licenseType
    ) external pure returns (PILTerms memory terms) {
        bytes32 typeHash = keccak256(bytes(licenseType));
        
        if (typeHash == keccak256("PIL-PER")) {
            // Personal License
            terms = PILTerms({
                royaltyRate: 100,          // 1%
                stakingRequired: false,
                stakingAmount: 0,
                transferable: false,
                commercialUse: false,
                licenseType: "PIL-PER"
            });
        } else if (typeHash == keccak256("PIL-COM")) {
            // Commercial License
            terms = PILTerms({
                royaltyRate: 500,          // 5%
                stakingRequired: true,
                stakingAmount: 1000 * 1e18, // 1,000 tokens
                transferable: true,
                commercialUse: true,
                licenseType: "PIL-COM"
            });
        } else if (typeHash == keccak256("PIL-ENT")) {
            // Enterprise License
            terms = PILTerms({
                royaltyRate: 1200,         // 12%
                stakingRequired: true,
                stakingAmount: 10000 * 1e18, // 10,000 tokens
                transferable: true,
                commercialUse: true,
                licenseType: "PIL-ENT"
            });
        }
        
        return terms;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get loan details
     */
    function getLoan(uint256 loanId) external view validLoan(loanId) returns (Loan memory) {
        return loans[loanId];
    }
    
    /**
     * @notice Get amortization schedule
     */
    function getAmortizationSchedule(
        uint256 loanId
    ) external view validLoan(loanId) returns (
        uint256[] memory dueDates,
        uint256[] memory amounts,
        uint256 nextPaymentIndex
    ) {
        Loan storage loan = loans[loanId];
        return (
            loan.amortizationDueDates,
            loan.amortizationAmounts,
            loan.nextPaymentIndex
        );
    }
    
    /**
     * @notice Get loan revenues
     */
    function getLoanRevenues(
        uint256 loanId
    ) external view validLoan(loanId) returns (LicenseRevenue[] memory) {
        return loanRevenues[loanId];
    }
    
    /**
     * @notice Get borrower's active loans
     */
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }
    
    /**
     * @notice Calculate total debt owed (principal + accrued interest)
     */
    function calculateTotalDebt(
        uint256 loanId
    ) external view validLoan(loanId) returns (uint256 totalDebt) {
        Loan storage loan = loans[loanId];
        
        if (loan.status != LoanStatus.Active) {
            return loan.outstandingBalance;
        }
        
        // Calculate accrued interest since last payment
        uint256 timeSincePayment = block.timestamp - loan.lastPaymentDate;
        uint256 accruedInterest = (loan.outstandingBalance * loan.interestRate * timeSincePayment) / (365 days * 10000);
        
        return loan.outstandingBalance + accruedInterest;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Update grace period for defaults
     */
    function setDefaultGracePeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod >= 7 days && newPeriod <= 90 days, "Invalid period");
        defaultGracePeriod = newPeriod;
    }
    
    /**
     * @notice Add approved stablecoin
     */
    function addApprovedStablecoin(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        approvedStablecoins[token] = true;
    }
    
    /**
     * @notice Remove approved stablecoin
     */
    function removeApprovedStablecoin(address token) external onlyOwner {
        approvedStablecoins[token] = false;
    }
    
    /**
     * @notice Emergency withdrawal (owner only)
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        IERC20(token).transfer(recipient, amount);
    }
}
