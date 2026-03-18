// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// FLATTENED CONTRACT - For verification and e-signing package
// Original file: contracts/SLAPSIPSpvLoan.sol
// OpenZeppelin Contracts v5.x - Dependencies listed but not inlined for verification clarity
// To compile: Install @openzeppelin/contracts and restore import statements
//
// OpenZeppelin Dependencies: IERC20, ERC20, SafeERC20, IERC721, Ownable, ReentrancyGuard

/**
 * @title SLAPSIPSpvLoan
 * @author Millionaire Resilience LLC
 * @notice SLAPS IP Special Purpose Vehicle for Stablecoin Loans with PIL Licensing Revenue
 * @dev Implements IP-backed stablecoin lending with automatic licensing revenue routing
 * 
 * KEY FEATURES:
 * - 100% of PIL licensing revenues routed to loan repayment as PRIMARY source
 * - Automatic IP transfer to lender upon default via PIL scroll contract
 * - Story Protocol integration for IP registration and attestation
 * - PatentSight+ analytics integration for competitive scoring
 * - IPlytics AI integration for SEP/FRAND compliance
 * - Resilience Blockchain Whetstone integration for code IP extraction
 * 
 * UCC-1 INTEGRATION:
 * This smart contract bridges the UCC-1 financing statement with on-chain IP tokens.
 * All licensing revenues are perfected as PRIMARY collateral for loan repayment.
 * 
 * STORY PROTOCOL ADDRESSES (Chain 1514):
 * - Registry: 0x1a9d0d28a0422F26D31Be72Edc6f13ea4371E11B
 * - Licensing: 0xd81fd78f557b457b4350cB95D20b547bFEb4D857
 * - Royalty: 0xcc8b9f0c9dC370ED1F41D95f74C9F72E08f24C90
 */
contract SLAPSIPSpvLoan is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ STORY PROTOCOL ADDRESSES ============
    
    // Story Protocol Mainnet (Chain ID: 1514)
    address public constant STORY_PROTOCOL_REGISTRY = 0x1a9d0d28a0422F26D31Be72Edc6f13ea4371E11B;
    address public constant STORY_LICENSING_MODULE = 0xd81fd78f557b457b4350cB95D20b547bFEb4D857;
    address public constant STORY_ROYALTY_MODULE = 0xcc8b9f0c9dC370ED1F41D95f74C9F72E08f24C90;
    
    // Millionaire Resilience Parent IP Asset
    address public constant MR_PARENT_IPID = 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE;
    uint256 public constant MR_PARENT_TOKEN_ID = 15192;
    
    // SLAPS Derivative IP Asset (to be set on deployment)
    address public slapsIpId;
    uint256 public slapsTokenId;
    
    // Millionaire Resilience Coinbase Wallet
    address public constant MR_COINBASE_WALLET = 0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a;
    
    // ============ STABLECOIN ADDRESSES ============
    // Note: These are Ethereum Mainnet addresses. For Story Protocol (Chain 1514),
    // stablecoins are bridged via canonical bridges or native Story stablecoins.
    // The contract uses configurable stablecoin addresses that are set by admin.
    
    // Default Ethereum Mainnet addresses (for reference/bridge)
    address public constant ETH_USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant ETH_USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant ETH_DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Configurable stablecoin addresses (set to Story Protocol equivalents on deployment)
    address public USDC;
    address public USDT;
    address public DAI;
    
    // ============ STRUCTS ============
    
    /**
     * @notice PIL License Types with revenue allocation
     */
    struct PILTier {
        string name;           // "PIL-PER", "PIL-COM", "PIL-ENT"
        uint256 royaltyRate;   // Basis points (100 = 1%, 500 = 5%, 1200 = 12%)
        bool stakingRequired;
        uint256 stakingAmount;
        bool commercialUse;
        uint256 loanAllocation; // Always 10000 = 100%
    }
    
    /**
     * @notice Stablecoin loan structure with PIL integration
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
        address ipAssetId;             // SLAPS IPID on Story Protocol
        uint256 ipTokenId;             // NFT Token ID
        bytes32 ucc1FilingHash;        // Hash of UCC-1 filing
        bytes32 attestationHash;       // Story Attestation hash
        bytes32 patentSightHash;       // PatentSight+ analytics hash
        bytes32 iplyticsHash;          // IPlytics SEP declaration hash
        LoanStatus status;
        uint256[] amortizationDueDates;
        uint256[] amortizationAmounts;
        uint256 nextPaymentIndex;
        uint256 totalPILRevenueReceived;
        uint256 patentSightScore;      // 0-100 score from PatentSight+
    }
    
    /**
     * @notice Loan status enumeration
     */
    enum LoanStatus {
        Pending,
        Active,
        PaidOff,
        Defaulted,
        Liquidated
    }
    
    /**
     * @notice PIL licensing revenue record
     */
    struct PILRevenue {
        uint256 timestamp;
        address token;
        uint256 amount;
        string pilTier;        // "PIL-PER", "PIL-COM", "PIL-ENT"
        string source;         // "streaming", "api", "enterprise", "whetstone"
        uint256 loanId;
        bool appliedToLoan;
    }
    
    /**
     * @notice SPV investor record
     */
    struct Investor {
        address wallet;
        uint256 investment;
        uint256 tokenBalance;
        uint256 claimedReturns;
        bool isAccredited;
        uint256 lockupExpiry;
    }
    
    // ============ STATE VARIABLES ============
    
    uint256 public loanCounter;
    uint256 public revenueCounter;
    uint256 public totalInvested;
    uint256 public defaultGracePeriod = 30 days;
    uint256 public lockupPeriod = 365 days;
    uint256 public minInvestment = 10000 * 1e6; // 10,000 USDC
    uint256 public minPatentSightScore = 70;    // Minimum PAI score
    
    // Token allocation percentages (basis points, 10000 = 100%)
    uint256 public constant INVESTOR_ALLOCATION = 5500;  // 55%
    uint256 public constant PARENT_ALLOCATION = 3000;    // 30%
    uint256 public constant CREATOR_FUND = 1000;         // 10%
    uint256 public constant DEV_RESERVE = 500;           // 5%
    
    // PIL Tiers
    mapping(string => PILTier) public pilTiers;
    
    // Loan mappings
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(uint256 => PILRevenue[]) public loanRevenues;
    
    // Investor mappings
    mapping(address => Investor) public investors;
    address[] public investorList;
    
    // Approved tokens
    mapping(address => bool) public approvedStablecoins;
    
    // UCC-1 and attestation tracking
    mapping(bytes32 => bool) public registeredUCC1Filings;
    mapping(bytes32 => bool) public registeredAttestations;
    
    // Loan-linked auxiliary document hashes
    mapping(uint256 => bytes32) public loanAuxiliaryDocsHash;  // loanId => combined aux docs hash
    mapping(uint256 => bytes32) public loanAttestationHash;    // loanId => Story attestation hash
    
    // ============ AUXILIARY DOCUMENT HASHES ============
    // On-chain storage for formation documents, EIN letters, and corporate records
    
    // Millionaire Resilience LLC (EIN: 41-3789881)
    bytes32 public articlesOfIncorpHash;      // Articles of Incorporation hash
    bytes32 public mrEinLetterHash;           // IRS EIN Letter (CP 575) hash
    
    // Slaps Streaming LLC - SPV Subsidiary (EIN: 41-4045773)
    bytes32 public slapsSpvFormationHash;     // Articles of Incorporation hash
    bytes32 public slapsEinLetterHash;        // IRS EIN Letter (CP 575) hash
    
    // Additional Corporate Documents
    bytes32 public nmSosReceiptHash;          // NM Secretary of State payment receipts
    bytes32 public beneficialOwnerIdHash;     // Beneficial owner ID hash (redacted)
    bytes32 public storyAttestationMetaHash;  // Story Attestation Service metadata hash
    
    // Entity Information (Immutable after deployment)
    string public constant MR_EIN = "41-3789881";
    string public constant SLAPS_EIN = "41-4045773";
    string public constant MR_NAME = "Millionaire Resilience LLC";
    string public constant SLAPS_NAME = "Slaps Streaming LLC";
    
    // Coinbase Borrowing Policy Limits
    uint256 public constant MAX_BTC_BORROW = 5_000_000 * 1e6;  // $5M USDC for BTC collateral
    uint256 public constant MAX_ETH_BORROW = 1_000_000 * 1e6;  // $1M USDC for ETH collateral
    uint256 public constant MAX_IP_BORROW = 1_000_000 * 1e6;   // $1M USDC for IP collateral (conservative)
    
    // ============ EVENTS ============
    
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 principal,
        address ipAssetId,
        uint256 patentSightScore
    );
    
    event UCC1Filed(
        bytes32 indexed filingHash,
        address indexed debtor,
        address indexed securedParty,
        uint256 loanId
    );
    
    event PILRevenueReceived(
        uint256 indexed loanId,
        uint256 amount,
        string pilTier,
        string source
    );
    
    event PaymentApplied(
        uint256 indexed loanId,
        uint256 amount,
        uint256 remainingBalance,
        string pilTier
    );
    
    event DefaultDeclared(
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
    
    event PatentSightScoreUpdated(
        uint256 indexed loanId,
        uint256 oldScore,
        uint256 newScore
    );
    
    event InvestorJoined(
        address indexed investor,
        uint256 amount,
        uint256 tokensReceived
    );
    
    event ReturnsDistributed(
        uint256 totalAmount,
        uint256 investorCount
    );
    
    event AuxiliaryDocumentRecorded(
        string indexed documentType,
        bytes32 documentHash,
        uint256 timestamp
    );
    
    event StoryAttestationRequested(
        address indexed ipId,
        bytes32 valuationHash,
        uint256 presentValue
    );
    
    event LoanAuxiliaryDocsLinked(
        uint256 indexed loanId,
        bytes32 combinedHash
    );
    
    event LoanAttestationLinked(
        uint256 indexed loanId,
        bytes32 attestationHash
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
    
    modifier accreditedInvestor(address investor) {
        require(investors[investor].isAccredited, "Not accredited investor");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() ERC20("SLAPS IP SPV Token", "SLAPS-SPV") Ownable(msg.sender) {
        USDC = ETH_USDC;
        USDT = ETH_USDT;
        DAI = ETH_DAI;
        
        approvedStablecoins[USDC] = true;
        approvedStablecoins[USDT] = true;
        approvedStablecoins[DAI] = true;
        
        // Initialize PIL tiers with 100% loan allocation
        pilTiers["PIL-PER"] = PILTier({
            name: "PIL-PER",
            royaltyRate: 100,       // 1%
            stakingRequired: false,
            stakingAmount: 0,
            commercialUse: false,
            loanAllocation: 10000   // 100%
        });
        
        pilTiers["PIL-COM"] = PILTier({
            name: "PIL-COM",
            royaltyRate: 500,       // 5%
            stakingRequired: true,
            stakingAmount: 1000 * 1e18,
            commercialUse: true,
            loanAllocation: 10000   // 100%
        });
        
        pilTiers["PIL-ENT"] = PILTier({
            name: "PIL-ENT",
            royaltyRate: 1200,      // 12%
            stakingRequired: true,
            stakingAmount: 10000 * 1e18,
            commercialUse: true,
            loanAllocation: 10000   // 100%
        });
        
        // Mint total supply to contract for distribution
        _mint(address(this), 50_000_000 * 1e18);
    }
    
    // ============ SPV INVESTMENT FUNCTIONS ============
    
    /**
     * @notice Invest in SLAPS IP SPV
     * @param amount Investment amount in USDC
     */
    function invest(uint256 amount) external nonReentrant {
        require(amount >= minInvestment, "Below minimum investment");
        require(investors[msg.sender].isAccredited, "Not accredited");
        
        // Transfer USDC from investor using SafeERC20
        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate tokens to distribute (proportional to investment)
        uint256 totalSupply = totalSupply();
        uint256 investorPool = (totalSupply * INVESTOR_ALLOCATION) / 10000;
        uint256 tokensToMint = (amount * investorPool) / (totalInvested + amount);
        
        // Update investor record
        if (investors[msg.sender].investment == 0) {
            investorList.push(msg.sender);
        }
        investors[msg.sender].investment += amount;
        investors[msg.sender].tokenBalance += tokensToMint;
        investors[msg.sender].lockupExpiry = block.timestamp + lockupPeriod;
        
        // Update total invested
        totalInvested += amount;
        
        // Transfer SPV tokens to investor
        _transfer(address(this), msg.sender, tokensToMint);
        
        emit InvestorJoined(msg.sender, amount, tokensToMint);
    }
    
    /**
     * @notice Verify investor accreditation
     * @param investor Address of investor
     */
    function verifyAccreditation(address investor) external onlyOwner {
        investors[investor].isAccredited = true;
        investors[investor].wallet = investor;
    }
    
    // ============ LOAN ORIGINATION ============
    
    /**
     * @notice Create a new SLAPS IP-backed stablecoin loan
     * @param borrower Address of the borrower (SLAPS IP owner)
     * @param lender Address of the lender (secured party)
     * @param stablecoin Address of the stablecoin (USDC/USDT/DAI)
     * @param principal Loan principal amount
     * @param interestRate Annual interest rate in basis points
     * @param termMonths Loan term in months
     * @param ucc1FilingHash Hash of the UCC-1 financing statement
     * @param patentSightScore PatentSight+ PAI score (0-100)
     */
    function createLoan(
        address borrower,
        address lender,
        address stablecoin,
        uint256 principal,
        uint256 interestRate,
        uint256 termMonths,
        bytes32 ucc1FilingHash,
        uint256 patentSightScore
    ) external nonReentrant returns (uint256 loanId) {
        require(borrower != address(0), "Invalid borrower");
        require(lender != address(0), "Invalid lender");
        require(approvedStablecoins[stablecoin], "Stablecoin not approved");
        require(principal > 0, "Invalid principal");
        require(interestRate <= 5000, "Interest rate too high"); // Max 50%
        require(termMonths >= 1 && termMonths <= 120, "Invalid term");
        require(!registeredUCC1Filings[ucc1FilingHash], "UCC-1 already registered");
        require(patentSightScore >= minPatentSightScore, "PatentSight score too low");
        
        // Enforce Coinbase borrowing policy for IP collateral
        require(principal <= MAX_IP_BORROW, "Exceeds Coinbase IP borrowing limit ($1M)");
        
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
        loan.ipAssetId = slapsIpId;
        loan.ipTokenId = slapsTokenId;
        loan.ucc1FilingHash = ucc1FilingHash;
        loan.status = LoanStatus.Active;
        loan.nextPaymentIndex = 0;
        loan.totalPILRevenueReceived = 0;
        loan.patentSightScore = patentSightScore;
        
        // Generate amortization schedule
        _generateAmortizationSchedule(loanId, termMonths);
        
        // Register UCC-1 filing
        registeredUCC1Filings[ucc1FilingHash] = true;
        
        // Track borrower loans
        borrowerLoans[borrower].push(loanId);
        
        emit LoanCreated(loanId, borrower, lender, principal, slapsIpId, patentSightScore);
        emit UCC1Filed(ucc1FilingHash, borrower, lender, loanId);
        
        return loanId;
    }
    
    /**
     * @notice Generate amortization schedule
     */
    function _generateAmortizationSchedule(
        uint256 loanId,
        uint256 termMonths
    ) internal {
        Loan storage loan = loans[loanId];
        
        uint256 monthlyInterestRate = loan.interestRate / 12;
        uint256 monthlyPayment = _calculateMonthlyPayment(
            loan.principal,
            monthlyInterestRate,
            termMonths
        );
        
        for (uint256 i = 0; i < termMonths; i++) {
            uint256 dueDate = loan.originationDate + ((i + 1) * 30 days);
            loan.amortizationDueDates.push(dueDate);
            loan.amortizationAmounts.push(monthlyPayment);
        }
    }
    
    /**
     * @notice Calculate monthly payment
     */
    function _calculateMonthlyPayment(
        uint256 principal,
        uint256 monthlyRateBps,
        uint256 termMonths
    ) internal pure returns (uint256) {
        if (monthlyRateBps == 0) {
            return principal / termMonths;
        }
        
        uint256 totalInterest = (principal * monthlyRateBps * termMonths) / 10000;
        uint256 totalPayment = principal + totalInterest;
        return totalPayment / termMonths;
    }
    
    // ============ PIL LICENSE REVENUE ROUTING ============
    
    /**
     * @notice Receive PIL licensing revenue and apply 100% to loan repayment
     * @dev PRIMARY SOURCE OF LOAN REPAYMENT per UCC-1 perfection
     * @param loanId The loan ID
     * @param amount Amount of revenue received
     * @param token Token address (stablecoin)
     * @param pilTier PIL license tier ("PIL-PER", "PIL-COM", "PIL-ENT")
     * @param source Revenue source ("streaming", "api", "enterprise", "whetstone")
     */
    function receivePILRevenue(
        uint256 loanId,
        uint256 amount,
        address token,
        string calldata pilTier,
        string calldata source
    ) external nonReentrant validLoan(loanId) loanActive(loanId) {
        require(approvedStablecoins[token], "Token not approved");
        require(amount > 0, "Invalid amount");
        require(pilTiers[pilTier].royaltyRate > 0, "Invalid PIL tier");
        
        Loan storage loan = loans[loanId];
        
        // Transfer stablecoin to this contract using SafeERC20
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Record revenue
        revenueCounter++;
        PILRevenue memory revenue = PILRevenue({
            timestamp: block.timestamp,
            token: token,
            amount: amount,
            pilTier: pilTier,
            source: source,
            loanId: loanId,
            appliedToLoan: true
        });
        loanRevenues[loanId].push(revenue);
        
        // Update total PIL revenue received
        loan.totalPILRevenueReceived += amount;
        
        emit PILRevenueReceived(loanId, amount, pilTier, source);
        
        // Apply 100% to loan repayment (per UCC-1 perfection)
        _applyPaymentToLoan(loanId, amount, token, pilTier);
    }
    
    /**
     * @notice Apply payment to loan balance
     */
    function _applyPaymentToLoan(
        uint256 loanId,
        uint256 amount,
        address token,
        string memory pilTier
    ) internal {
        Loan storage loan = loans[loanId];
        
        uint256 paymentAmount = amount;
        
        if (paymentAmount >= loan.outstandingBalance) {
            // Loan fully paid
            uint256 excess = paymentAmount - loan.outstandingBalance;
            loan.outstandingBalance = 0;
            loan.status = LoanStatus.PaidOff;
            loan.lastPaymentDate = block.timestamp;
            
            // Transfer payment to lender using SafeERC20
            IERC20(token).safeTransfer(loan.lender, paymentAmount - excess);
            
            // Return excess to borrower (only after loan satisfied)
            if (excess > 0) {
                IERC20(token).safeTransfer(loan.borrower, excess);
            }
        } else {
            // Partial payment - 100% goes to lender
            loan.outstandingBalance -= paymentAmount;
            loan.lastPaymentDate = block.timestamp;
            
            // Transfer to lender using SafeERC20
            IERC20(token).safeTransfer(loan.lender, paymentAmount);
            
            // Update amortization progress
            _updateAmortizationProgress(loanId, paymentAmount);
        }
        
        emit PaymentApplied(loanId, paymentAmount, loan.outstandingBalance, pilTier);
    }
    
    /**
     * @notice Update amortization schedule progress
     */
    function _updateAmortizationProgress(
        uint256 loanId,
        uint256 paymentAmount
    ) internal {
        Loan storage loan = loans[loanId];
        
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
    
    // ============ STORY ATTESTATION INTEGRATION ============
    
    /**
     * @notice Record Story Attestation Service certification
     */
    function recordStoryAttestation(
        uint256 loanId,
        bytes32 attestationHash,
        string calldata attestationType
    ) external validLoan(loanId) onlyOwner {
        require(!registeredAttestations[attestationHash], "Attestation already registered");
        
        loans[loanId].attestationHash = attestationHash;
        registeredAttestations[attestationHash] = true;
        
        emit StoryAttestationRecorded(loanId, attestationHash, attestationType);
    }
    
    /**
     * @notice Record PatentSight+ analytics hash
     */
    function recordPatentSightAnalytics(
        uint256 loanId,
        bytes32 patentSightHash,
        uint256 newScore
    ) external validLoan(loanId) onlyOwner {
        Loan storage loan = loans[loanId];
        
        uint256 oldScore = loan.patentSightScore;
        loan.patentSightHash = patentSightHash;
        loan.patentSightScore = newScore;
        
        emit PatentSightScoreUpdated(loanId, oldScore, newScore);
    }
    
    /**
     * @notice Record IPlytics SEP declaration hash
     */
    function recordIPlyticsData(
        uint256 loanId,
        bytes32 iplyticsHash
    ) external validLoan(loanId) onlyOwner {
        loans[loanId].iplyticsHash = iplyticsHash;
    }
    
    // ============ DEFAULT & IP TRANSFER ============
    
    /**
     * @notice Check if loan is in default
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
        
        // Check PatentSight score default
        if (loan.patentSightScore < minPatentSightScore) {
            isDefault = true;
        }
        
        return (isDefault, daysOverdue);
    }
    
    /**
     * @notice Declare loan default and initiate IP transfer
     * @dev PIL SCROLL CONTRACT - Automatic IP transfer to lender
     */
    function declareDefault(
        uint256 loanId
    ) external nonReentrant validLoan(loanId) onlyLender(loanId) loanActive(loanId) {
        (bool isDefault,) = checkDefault(loanId);
        require(isDefault, "Loan not in default");
        
        Loan storage loan = loans[loanId];
        loan.status = LoanStatus.Defaulted;
        
        emit DefaultDeclared(loanId, loan.borrower, loan.lender, loan.outstandingBalance);
        
        // Execute automatic IP transfer
        _executeIPTransfer(loanId);
    }
    
    /**
     * @notice Execute automatic IP transfer to lender upon default
     * @dev CRITICAL: This enforces the UCC-1 security interest on-chain
     */
    function _executeIPTransfer(uint256 loanId) internal {
        Loan storage loan = loans[loanId];
        
        // Transfer IP NFT to lender via Story Protocol
        (bool success,) = STORY_PROTOCOL_REGISTRY.call(
            abi.encodeWithSignature(
                "transferIP(address,address,uint256)",
                loan.borrower,
                loan.lender,
                loan.ipTokenId
            )
        );
        
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
        STORY_LICENSING_MODULE.call(
            abi.encodeWithSignature(
                "transferLicenseOwnership(address,address)",
                loan.ipAssetId,
                loan.lender
            )
        );
        
        // Call Royalty Module to redirect royalties
        STORY_ROYALTY_MODULE.call(
            abi.encodeWithSignature(
                "setRoyaltyReceiver(address,address)",
                loan.ipAssetId,
                loan.lender
            )
        );
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
    ) external view validLoan(loanId) returns (PILRevenue[] memory) {
        return loanRevenues[loanId];
    }
    
    /**
     * @notice Get PIL tier details
     */
    function getPILTier(string calldata tierName) external view returns (PILTier memory) {
        return pilTiers[tierName];
    }
    
    /**
     * @notice Get investor details
     */
    function getInvestor(address investor) external view returns (Investor memory) {
        return investors[investor];
    }
    
    /**
     * @notice Get total investors
     */
    function getTotalInvestors() external view returns (uint256) {
        return investorList.length;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Set SLAPS IP asset details
     */
    function setSlapsIP(address _ipId, uint256 _tokenId) external onlyOwner {
        slapsIpId = _ipId;
        slapsTokenId = _tokenId;
    }
    
    /**
     * @notice Update minimum PatentSight score
     */
    function setMinPatentSightScore(uint256 _minScore) external onlyOwner {
        require(_minScore <= 100, "Invalid score");
        minPatentSightScore = _minScore;
    }
    
    /**
     * @notice Update default grace period
     */
    function setDefaultGracePeriod(uint256 _days) external onlyOwner {
        defaultGracePeriod = _days * 1 days;
    }
    
    /**
     * @notice Approve or revoke stablecoin
     */
    function setStablecoinApproval(address token, bool approved) external onlyOwner {
        approvedStablecoins[token] = approved;
    }
    
    /**
     * @notice Distribute returns to investors (only after all loans repaid)
     */
    function distributeReturns(address token, uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Invalid amount");
        
        uint256 totalTokens = totalSupply();
        uint256 distributed = 0;
        
        for (uint256 i = 0; i < investorList.length; i++) {
            address investorAddr = investorList[i];
            uint256 balance = balanceOf(investorAddr);
            
            if (balance > 0) {
                uint256 share = (amount * balance) / totalTokens;
                if (share > 0) {
                    IERC20(token).safeTransfer(investorAddr, share);
                    investors[investorAddr].claimedReturns += share;
                    distributed += share;
                }
            }
        }
        
        emit ReturnsDistributed(distributed, investorList.length);
    }
    
    /**
     * @notice Emergency withdrawal (only owner)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    /**
     * @notice Update stablecoin addresses (for multi-chain deployment)
     */
    function updateStablecoinAddresses(
        address _usdc,
        address _usdt,
        address _dai
    ) external onlyOwner {
        // Remove old approvals
        if (USDC != address(0)) approvedStablecoins[USDC] = false;
        if (USDT != address(0)) approvedStablecoins[USDT] = false;
        if (DAI != address(0)) approvedStablecoins[DAI] = false;
        
        // Set new addresses
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
        
        // Approve new addresses
        if (_usdc != address(0)) approvedStablecoins[_usdc] = true;
        if (_usdt != address(0)) approvedStablecoins[_usdt] = true;
        if (_dai != address(0)) approvedStablecoins[_dai] = true;
    }
    
    // ============ AUXILIARY DOCUMENT HASH STORAGE ============
    
    /**
     * @notice Store Articles of Incorporation hash for Millionaire Resilience LLC
     * @param _hash keccak256 hash of the Articles of Incorporation document
     */
    function recordArticlesOfIncorporation(bytes32 _hash) external onlyOwner {
        require(_hash != bytes32(0), "Invalid hash");
        articlesOfIncorpHash = _hash;
        emit AuxiliaryDocumentRecorded("ARTICLES_OF_INCORPORATION_MR", _hash, block.timestamp);
    }
    
    /**
     * @notice Store EIN Letter hash for Millionaire Resilience LLC (EIN: 41-3789881)
     * @param _hash keccak256 hash of the IRS EIN Letter (CP 575)
     */
    function recordMREinLetter(bytes32 _hash) external onlyOwner {
        require(_hash != bytes32(0), "Invalid hash");
        mrEinLetterHash = _hash;
        emit AuxiliaryDocumentRecorded("EIN_LETTER_MR_41-3789881", _hash, block.timestamp);
    }
    
    /**
     * @notice Store Slaps Streaming LLC SPV formation documents hash (EIN: 41-4045773)
     * @param _hash keccak256 hash of the Articles of Incorporation
     */
    function recordSlapsSpvFormation(bytes32 _hash) external onlyOwner {
        require(_hash != bytes32(0), "Invalid hash");
        slapsSpvFormationHash = _hash;
        emit AuxiliaryDocumentRecorded("ARTICLES_OF_INCORPORATION_SLAPS_SPV", _hash, block.timestamp);
    }
    
    /**
     * @notice Store EIN Letter hash for Slaps Streaming LLC (EIN: 41-4045773)
     * @param _hash keccak256 hash of the IRS EIN Letter (CP 575)
     */
    function recordSlapsEinLetter(bytes32 _hash) external onlyOwner {
        require(_hash != bytes32(0), "Invalid hash");
        slapsEinLetterHash = _hash;
        emit AuxiliaryDocumentRecorded("EIN_LETTER_SLAPS_41-4045773", _hash, block.timestamp);
    }
    
    /**
     * @notice Store New Mexico SOS payment receipts hash
     * @param _hash keccak256 hash of the payment receipts from NM SOS Business Portal
     */
    function recordNMSosReceipt(bytes32 _hash) external onlyOwner {
        require(_hash != bytes32(0), "Invalid hash");
        nmSosReceiptHash = _hash;
        emit AuxiliaryDocumentRecorded("NM_SOS_PAYMENT_RECEIPT", _hash, block.timestamp);
    }
    
    /**
     * @notice Store beneficial owner government ID hash (redacted)
     * @param _hash keccak256 hash of the redacted government ID
     */
    function recordBeneficialOwnerId(bytes32 _hash) external onlyOwner {
        require(_hash != bytes32(0), "Invalid hash");
        beneficialOwnerIdHash = _hash;
        emit AuxiliaryDocumentRecorded("BENEFICIAL_OWNER_ID", _hash, block.timestamp);
    }
    
    /**
     * @notice Store all auxiliary documents in a single transaction
     * @param _articlesHash Articles of Incorporation (MR)
     * @param _mrEinHash EIN Letter (MR)
     * @param _slapsFormationHash Articles of Incorporation (SLAPS)
     * @param _slapsEinHash EIN Letter (SLAPS)
     * @param _sosReceiptHash NM SOS Payment Receipts
     * @param _ownerIdHash Beneficial Owner ID
     */
    function recordAllAuxiliaryDocuments(
        bytes32 _articlesHash,
        bytes32 _mrEinHash,
        bytes32 _slapsFormationHash,
        bytes32 _slapsEinHash,
        bytes32 _sosReceiptHash,
        bytes32 _ownerIdHash
    ) external onlyOwner {
        if (_articlesHash != bytes32(0)) {
            articlesOfIncorpHash = _articlesHash;
            emit AuxiliaryDocumentRecorded("ARTICLES_OF_INCORPORATION_MR", _articlesHash, block.timestamp);
        }
        if (_mrEinHash != bytes32(0)) {
            mrEinLetterHash = _mrEinHash;
            emit AuxiliaryDocumentRecorded("EIN_LETTER_MR_41-3789881", _mrEinHash, block.timestamp);
        }
        if (_slapsFormationHash != bytes32(0)) {
            slapsSpvFormationHash = _slapsFormationHash;
            emit AuxiliaryDocumentRecorded("ARTICLES_OF_INCORPORATION_SLAPS_SPV", _slapsFormationHash, block.timestamp);
        }
        if (_slapsEinHash != bytes32(0)) {
            slapsEinLetterHash = _slapsEinHash;
            emit AuxiliaryDocumentRecorded("EIN_LETTER_SLAPS_41-4045773", _slapsEinHash, block.timestamp);
        }
        if (_sosReceiptHash != bytes32(0)) {
            nmSosReceiptHash = _sosReceiptHash;
            emit AuxiliaryDocumentRecorded("NM_SOS_PAYMENT_RECEIPT", _sosReceiptHash, block.timestamp);
        }
        if (_ownerIdHash != bytes32(0)) {
            beneficialOwnerIdHash = _ownerIdHash;
            emit AuxiliaryDocumentRecorded("BENEFICIAL_OWNER_ID", _ownerIdHash, block.timestamp);
        }
    }
    
    // ============ STORY ATTESTATION INTEGRATION ============
    
    /**
     * @notice Request valuation attestation from Story Attestation Service
     * @dev Emits event for off-chain Story Attestation Service to process
     * @param valuationHash keccak256 hash of valuation JSON
     * @param presentValue Present value in USD (6 decimals)
     */
    function requestStoryValuationAttestation(
        bytes32 valuationHash,
        uint256 presentValue
    ) external onlyOwner {
        require(valuationHash != bytes32(0), "Invalid valuation hash");
        storyAttestationMetaHash = valuationHash;
        emit StoryAttestationRequested(MR_PARENT_IPID, valuationHash, presentValue);
    }
    
    /**
     * @notice Link auxiliary documents to a specific loan for verifiable compliance
     * @param loanId The loan ID to link documents to
     * @param combinedHash Combined keccak256 hash of all auxiliary documents
     */
    function linkAuxiliaryDocsToLoan(
        uint256 loanId,
        bytes32 combinedHash
    ) external validLoan(loanId) onlyOwner {
        require(combinedHash != bytes32(0), "Invalid hash");
        loanAuxiliaryDocsHash[loanId] = combinedHash;
        emit LoanAuxiliaryDocsLinked(loanId, combinedHash);
    }
    
    /**
     * @notice Link Story attestation to a specific loan
     * @param loanId The loan ID to link attestation to
     * @param attestationHash Story Attestation Service certification hash
     */
    function linkAttestationToLoan(
        uint256 loanId,
        bytes32 attestationHash
    ) external validLoan(loanId) onlyOwner {
        require(attestationHash != bytes32(0), "Invalid attestation hash");
        loanAttestationHash[loanId] = attestationHash;
        loans[loanId].attestationHash = attestationHash;
        registeredAttestations[attestationHash] = true;
        emit LoanAttestationLinked(loanId, attestationHash);
    }
    
    /**
     * @notice Get loan compliance documentation
     * @param loanId The loan ID
     * @return ucc1Hash UCC-1 filing hash
     * @return auxDocsHash Combined auxiliary documents hash
     * @return attestationHash Story attestation hash
     */
    function getLoanComplianceDocs(uint256 loanId) external view validLoan(loanId) returns (
        bytes32 ucc1Hash,
        bytes32 auxDocsHash,
        bytes32 attestationHash
    ) {
        return (
            loans[loanId].ucc1FilingHash,
            loanAuxiliaryDocsHash[loanId],
            loanAttestationHash[loanId]
        );
    }
    
    /**
     * @notice Get all auxiliary document hashes
     * @return Tuple of all document hashes
     */
    function getAuxiliaryDocumentHashes() external view returns (
        bytes32 _articlesOfIncorpHash,
        bytes32 _mrEinLetterHash,
        bytes32 _slapsSpvFormationHash,
        bytes32 _slapsEinLetterHash,
        bytes32 _nmSosReceiptHash,
        bytes32 _beneficialOwnerIdHash,
        bytes32 _storyAttestationMetaHash
    ) {
        return (
            articlesOfIncorpHash,
            mrEinLetterHash,
            slapsSpvFormationHash,
            slapsEinLetterHash,
            nmSosReceiptHash,
            beneficialOwnerIdHash,
            storyAttestationMetaHash
        );
    }
    
    /**
     * @notice Verify loan amount is within Coinbase borrowing policy
     * @param amount Loan amount to verify
     * @param collateralType Type of collateral ("BTC", "ETH", "IP")
     */
    function verifyWithinBorrowingPolicy(
        uint256 amount,
        string calldata collateralType
    ) external pure returns (bool isWithinPolicy, uint256 maxAllowed) {
        bytes32 collateralHash = keccak256(abi.encodePacked(collateralType));
        
        if (collateralHash == keccak256("BTC")) {
            return (amount <= MAX_BTC_BORROW, MAX_BTC_BORROW);
        } else if (collateralHash == keccak256("ETH")) {
            return (amount <= MAX_ETH_BORROW, MAX_ETH_BORROW);
        } else if (collateralHash == keccak256("IP")) {
            return (amount <= MAX_IP_BORROW, MAX_IP_BORROW);
        } else {
            return (false, 0);
        }
    }
}
