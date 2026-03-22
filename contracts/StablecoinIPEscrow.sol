// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// FLATTENED CONTRACT - For verification and e-signing package
// Original file: contracts/StablecoinIPEscrow.sol
// OpenZeppelin Contracts v5.x - Dependencies listed but not inlined for verification clarity
// To compile: Install @openzeppelin/contracts and restore import statements
//
// OpenZeppelin Dependencies: IERC20, SafeERC20, IERC721, Ownable, ReentrancyGuard, Pausable

/**
 * @title StablecoinIPEscrow
 * @author Millionaire Resilience LLC
 * @notice IP-Escrowed Stablecoin Loan System with Morpho DeFi Integration
 * @dev Enables IP-backed loans with stablecoin (USDC/USDT) collateral
 * 
 * Integration Points:
 * - Coinbase Wallet for user authentication
 * - Morpho Blue DeFi for optimized lending rates
 * - Story Protocol for IP asset verification
 * - Centrifuge for real-world asset tokenization
 */
contract StablecoinIPEscrow is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Story Protocol Integration
    address public constant STORY_PROTOCOL_IPID = 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE;
    
    // Millionaire Resilience Coinbase Wallet
    address public constant MR_COINBASE_WALLET = 0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a;
    
    // Supported Stablecoins (Mainnet addresses)
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Morpho Blue Protocol Address (Ethereum Mainnet)
    address public morphoBlue;
    
    // Centrifuge Integration
    address public centrifugePool;
    
    // Loan configuration
    uint256 public constant MAX_LTV = 8000; // 80% loan-to-value ratio
    uint256 public constant LIQUIDATION_THRESHOLD = 8500; // 85%
    uint256 public constant MIN_LOAN_AMOUNT = 1000 * 10**6; // $1,000 minimum
    uint256 public constant MAX_LOAN_AMOUNT = 10_000_000 * 10**6; // $10M maximum
    
    // Interest rate configuration (basis points)
    uint256 public baseInterestRate = 500; // 5% base
    uint256 public riskPremium = 200; // 2% risk premium
    
    // Platform fees
    uint256 public originationFee = 100; // 1%
    uint256 public platformFee = 50; // 0.5%

    // Escrow loan structure
    struct EscrowLoan {
        uint256 id;
        address borrower;
        address stablecoin;
        uint256 loanAmount;
        uint256 collateralAmount;
        uint256 interestRate;
        uint256 termDays;
        uint256 startTimestamp;
        uint256 amountRepaid;
        bool isActive;
        bool isLiquidated;
        IPAssetEscrow ipEscrow;
    }

    // IP Asset Escrow structure
    struct IPAssetEscrow {
        address nftContract;
        uint256 tokenId;
        string storyProtocolIPID;
        uint256 appraisedValue;
        bytes32 documentHash;
        bool isReleased;
    }

    // Morpho market parameters
    struct MorphoMarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    // Counters
    uint256 public loanIdCounter;
    uint256 public totalLoansOriginated;
    uint256 public totalValueLocked;
    uint256 public totalInterestEarned;

    // Mappings
    mapping(uint256 => EscrowLoan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => bool) public approvedStablecoins;
    mapping(address => bool) public approvedIPContracts;
    mapping(address => uint256) public userCreditScore;
    mapping(bytes32 => bool) public usedDocumentHashes;

    // Liquidity providers
    mapping(address => uint256) public lpDeposits;
    mapping(address => uint256) public lpRewards;
    uint256 public totalLiquidity;

    // Events
    event LoanOriginated(
        uint256 indexed loanId,
        address indexed borrower,
        address stablecoin,
        uint256 amount,
        uint256 interestRate
    );
    event IPAssetEscrowed(
        uint256 indexed loanId,
        address nftContract,
        uint256 tokenId,
        string storyProtocolIPID
    );
    event LoanRepayment(uint256 indexed loanId, uint256 amount, uint256 remaining);
    event LoanLiquidated(uint256 indexed loanId, address liquidator, uint256 collateralSeized);
    event IPAssetReleased(uint256 indexed loanId, address indexed borrower);
    event LiquidityDeposited(address indexed provider, uint256 amount);
    event LiquidityWithdrawn(address indexed provider, uint256 amount);
    event MorphoIntegrationUpdated(address indexed newMorpho);
    event CentrifugePoolUpdated(address indexed newPool);

    address public constant MORPHO_BLUE_ADDRESS = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;

    constructor() Ownable(msg.sender) {
        morphoBlue = MORPHO_BLUE_ADDRESS;
        
        approvedStablecoins[USDC] = true;
        approvedStablecoins[USDT] = true;
        approvedStablecoins[DAI] = true;
    }

    // ============ MODIFIERS ============

    modifier validStablecoin(address token) {
        require(approvedStablecoins[token], "Stablecoin not approved");
        _;
    }

    modifier validLoan(uint256 loanId) {
        require(loans[loanId].borrower != address(0), "Loan does not exist");
        _;
    }

    modifier onlyBorrower(uint256 loanId) {
        require(loans[loanId].borrower == msg.sender, "Not loan borrower");
        _;
    }

    // ============ LOAN ORIGINATION ============

    /**
     * @notice Originate a new IP-escrowed stablecoin loan
     * @param stablecoin Address of the stablecoin to borrow
     * @param loanAmount Amount to borrow (in stablecoin decimals)
     * @param termDays Loan term in days
     * @param nftContract Address of IP NFT contract
     * @param tokenId Token ID of IP NFT to escrow
     * @param storyProtocolIPID Story Protocol IP ID for verification
     * @param appraisedValue Appraised value of the IP asset in USD
     * @param documentHash Hash of legal documents (MLA, UCC-1)
     */
    function originateLoan(
        address stablecoin,
        uint256 loanAmount,
        uint256 termDays,
        address nftContract,
        uint256 tokenId,
        string calldata storyProtocolIPID,
        uint256 appraisedValue,
        bytes32 documentHash
    ) external validStablecoin(stablecoin) whenNotPaused nonReentrant returns (uint256) {
        require(loanAmount >= MIN_LOAN_AMOUNT, "Below minimum loan amount");
        require(loanAmount <= MAX_LOAN_AMOUNT, "Exceeds maximum loan amount");
        require(termDays >= 30 && termDays <= 1825, "Term must be 30-1825 days");
        require(!usedDocumentHashes[documentHash], "Document hash already used");
        require(approvedIPContracts[nftContract], "IP contract not approved");

        // Verify LTV ratio
        uint256 requiredCollateral = (loanAmount * 10000) / MAX_LTV;
        require(appraisedValue >= requiredCollateral, "Insufficient IP collateral value");

        // Calculate interest rate based on credit score
        uint256 interestRate = calculateInterestRate(msg.sender, termDays);

        // Escrow the IP NFT
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        loanIdCounter++;
        uint256 newLoanId = loanIdCounter;

        loans[newLoanId] = EscrowLoan({
            id: newLoanId,
            borrower: msg.sender,
            stablecoin: stablecoin,
            loanAmount: loanAmount,
            collateralAmount: appraisedValue,
            interestRate: interestRate,
            termDays: termDays,
            startTimestamp: block.timestamp,
            amountRepaid: 0,
            isActive: true,
            isLiquidated: false,
            ipEscrow: IPAssetEscrow({
                nftContract: nftContract,
                tokenId: tokenId,
                storyProtocolIPID: storyProtocolIPID,
                appraisedValue: appraisedValue,
                documentHash: documentHash,
                isReleased: false
            })
        });

        borrowerLoans[msg.sender].push(newLoanId);
        usedDocumentHashes[documentHash] = true;
        totalLoansOriginated++;
        totalValueLocked += loanAmount;

        // Calculate and deduct origination fee
        uint256 fee = (loanAmount * originationFee) / 10000;
        uint256 disbursement = loanAmount - fee;

        // Transfer stablecoins to borrower (from liquidity pool or Morpho)
        require(totalLiquidity >= disbursement, "Insufficient liquidity");
        totalLiquidity -= disbursement;
        IERC20(stablecoin).safeTransfer(msg.sender, disbursement);

        emit LoanOriginated(newLoanId, msg.sender, stablecoin, loanAmount, interestRate);
        emit IPAssetEscrowed(newLoanId, nftContract, tokenId, storyProtocolIPID);

        return newLoanId;
    }

    /**
     * @notice Calculate interest rate based on borrower profile
     */
    function calculateInterestRate(address borrower, uint256 termDays) public view returns (uint256) {
        uint256 creditScore = userCreditScore[borrower];
        if (creditScore == 0) creditScore = 650; // Default

        uint256 creditAdjustment = 0;
        if (creditScore >= 800) {
            creditAdjustment = 0; // No adjustment for excellent credit
        } else if (creditScore >= 700) {
            creditAdjustment = 100; // +1%
        } else if (creditScore >= 650) {
            creditAdjustment = 200; // +2%
        } else {
            creditAdjustment = 400; // +4%
        }

        // Term adjustment: longer terms = higher rates
        uint256 termAdjustment = (termDays / 365) * 50; // +0.5% per year

        return baseInterestRate + riskPremium + creditAdjustment + termAdjustment;
    }

    // ============ LOAN REPAYMENT ============

    /**
     * @notice Make a loan repayment
     */
    function repayLoan(uint256 loanId, uint256 amount) 
        external 
        validLoan(loanId) 
        nonReentrant 
    {
        EscrowLoan storage loan = loans[loanId];
        require(loan.isActive, "Loan not active");
        require(!loan.isLiquidated, "Loan was liquidated");

        uint256 totalOwed = calculateTotalOwed(loanId);
        uint256 remaining = totalOwed - loan.amountRepaid;
        require(remaining > 0, "Loan fully repaid");

        uint256 repaymentAmount = amount;
        if (repaymentAmount > remaining) {
            repaymentAmount = remaining;
        }

        // Transfer stablecoins from borrower
        IERC20(loan.stablecoin).safeTransferFrom(msg.sender, address(this), repaymentAmount);

        loan.amountRepaid += repaymentAmount;
        totalLiquidity += repaymentAmount;

        // Calculate interest earned
        uint256 principalPortion = (repaymentAmount * loan.loanAmount) / totalOwed;
        uint256 interestPortion = repaymentAmount - principalPortion;
        totalInterestEarned += interestPortion;

        emit LoanRepayment(loanId, repaymentAmount, remaining - repaymentAmount);

        // Check if loan is fully repaid
        if (loan.amountRepaid >= totalOwed) {
            _releaseIPAsset(loanId);
        }
    }

    /**
     * @notice Calculate total amount owed including interest
     */
    function calculateTotalOwed(uint256 loanId) public view validLoan(loanId) returns (uint256) {
        EscrowLoan storage loan = loans[loanId];
        
        // Simple interest calculation
        uint256 interest = (loan.loanAmount * loan.interestRate * loan.termDays) / (10000 * 365);
        
        return loan.loanAmount + interest;
    }

    /**
     * @notice Release escrowed IP asset after full repayment
     */
    function _releaseIPAsset(uint256 loanId) internal {
        EscrowLoan storage loan = loans[loanId];
        require(!loan.ipEscrow.isReleased, "Already released");

        loan.isActive = false;
        loan.ipEscrow.isReleased = true;
        totalValueLocked -= loan.loanAmount;

        // Transfer IP NFT back to borrower
        IERC721(loan.ipEscrow.nftContract).transferFrom(
            address(this),
            loan.borrower,
            loan.ipEscrow.tokenId
        );

        // Update credit score for successful repayment
        if (userCreditScore[loan.borrower] < 850) {
            userCreditScore[loan.borrower] += 15;
        }

        emit IPAssetReleased(loanId, loan.borrower);
    }

    // ============ LIQUIDATION ============

    /**
     * @notice Check if a loan is liquidatable
     */
    function isLiquidatable(uint256 loanId) public view validLoan(loanId) returns (bool) {
        EscrowLoan storage loan = loans[loanId];
        if (!loan.isActive || loan.isLiquidated) return false;

        // Check if loan is past due
        uint256 loanEndTime = loan.startTimestamp + (loan.termDays * 1 days);
        if (block.timestamp > loanEndTime) return true;

        // Check LTV breach (if IP value decreased)
        uint256 currentLTV = (loan.loanAmount * 10000) / loan.collateralAmount;
        return currentLTV >= LIQUIDATION_THRESHOLD;
    }

    /**
     * @notice Liquidate an underwater or defaulted loan
     */
    function liquidateLoan(uint256 loanId) external validLoan(loanId) nonReentrant {
        require(isLiquidatable(loanId), "Loan not liquidatable");

        EscrowLoan storage loan = loans[loanId];
        loan.isActive = false;
        loan.isLiquidated = true;
        totalValueLocked -= loan.loanAmount;

        // Decrease borrower credit score
        if (userCreditScore[loan.borrower] >= 50) {
            userCreditScore[loan.borrower] -= 50;
        }

        // Transfer IP NFT to liquidator (or auction contract)
        IERC721(loan.ipEscrow.nftContract).transferFrom(
            address(this),
            msg.sender,
            loan.ipEscrow.tokenId
        );

        emit LoanLiquidated(loanId, msg.sender, loan.collateralAmount);
    }

    // ============ LIQUIDITY PROVISION ============

    /**
     * @notice Deposit stablecoins as liquidity
     */
    function depositLiquidity(address stablecoin, uint256 amount) 
        external 
        validStablecoin(stablecoin) 
        whenNotPaused 
        nonReentrant 
    {
        require(amount > 0, "Amount must be greater than 0");

        IERC20(stablecoin).safeTransferFrom(msg.sender, address(this), amount);
        
        lpDeposits[msg.sender] += amount;
        totalLiquidity += amount;

        emit LiquidityDeposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw deposited liquidity
     */
    function withdrawLiquidity(address stablecoin, uint256 amount) 
        external 
        validStablecoin(stablecoin) 
        nonReentrant 
    {
        require(lpDeposits[msg.sender] >= amount, "Insufficient deposit");
        require(totalLiquidity >= amount, "Insufficient liquidity");

        lpDeposits[msg.sender] -= amount;
        totalLiquidity -= amount;

        IERC20(stablecoin).safeTransfer(msg.sender, amount);

        emit LiquidityWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Claim LP rewards
     */
    function claimLPRewards() external nonReentrant {
        uint256 rewards = lpRewards[msg.sender];
        require(rewards > 0, "No rewards to claim");

        lpRewards[msg.sender] = 0;
        
        // Pay rewards in platform's preferred stablecoin
        IERC20(USDC).safeTransfer(msg.sender, rewards);
    }

    // ============ MORPHO INTEGRATION ============

    // ============ MORPHO BLUE INTERFACE ============

    /**
     * @notice Morpho Blue market ID struct for proper encoding
     */
    struct MarketId {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    /**
     * @notice Supply liquidity to Morpho Blue for yield optimization
     * @dev Uses Morpho Blue's supply function signature
     * @param marketId The market identifier struct
     * @param assets Amount of assets to supply
     * @param shares Amount of shares to receive (0 for auto-calculation)
     */
    function supplyToMorpho(
        MarketId calldata marketId,
        uint256 assets,
        uint256 shares
    ) external onlyOwner nonReentrant returns (uint256 assetsSupplied, uint256 sharesReceived) {
        require(morphoBlue != address(0), "Morpho not configured");
        require(assets <= totalLiquidity || shares > 0, "Insufficient liquidity");

        // Approve Morpho Blue to spend tokens
        IERC20(marketId.loanToken).approve(morphoBlue, assets);
        
        // Call Morpho Blue supply function
        (bool success, bytes memory returnData) = morphoBlue.call(
            abi.encodeWithSignature(
                "supply((address,address,address,address,uint256),uint256,uint256,address,bytes)",
                marketId,
                assets,
                shares,
                address(this),
                ""
            )
        );
        
        require(success, "Morpho supply failed");
        (assetsSupplied, sharesReceived) = abi.decode(returnData, (uint256, uint256));
        
        if (assets > 0) {
            totalLiquidity -= assets;
        }
        
        return (assetsSupplied, sharesReceived);
    }

    /**
     * @notice Withdraw liquidity from Morpho Blue
     */
    function withdrawFromMorpho(
        MarketId calldata marketId,
        uint256 assets,
        uint256 shares
    ) external onlyOwner nonReentrant returns (uint256 assetsWithdrawn, uint256 sharesBurned) {
        require(morphoBlue != address(0), "Morpho not configured");

        // Call Morpho Blue withdraw function
        (bool success, bytes memory returnData) = morphoBlue.call(
            abi.encodeWithSignature(
                "withdraw((address,address,address,address,uint256),uint256,uint256,address,address)",
                marketId,
                assets,
                shares,
                address(this),
                address(this)
            )
        );
        
        require(success, "Morpho withdraw failed");
        (assetsWithdrawn, sharesBurned) = abi.decode(returnData, (uint256, uint256));
        
        totalLiquidity += assetsWithdrawn;
        
        return (assetsWithdrawn, sharesBurned);
    }

    /**
     * @notice Get current position in a Morpho market
     */
    function getMorphoPosition(
        MarketId calldata marketId
    ) external view returns (uint256 supplyShares, uint256 borrowShares, uint256 collateral) {
        if (morphoBlue == address(0)) return (0, 0, 0);
        
        (bool success, bytes memory returnData) = morphoBlue.staticcall(
            abi.encodeWithSignature(
                "position((address,address,address,address,uint256),address)",
                marketId,
                address(this)
            )
        );
        
        if (!success) return (0, 0, 0);
        return abi.decode(returnData, (uint256, uint256, uint256));
    }

    /**
     * @notice Get market data from Morpho
     */
    function getMorphoMarketData(
        MarketId calldata marketId
    ) external view returns (
        uint128 totalSupplyAssets,
        uint128 totalSupplyShares,
        uint128 totalBorrowAssets,
        uint128 totalBorrowShares
    ) {
        if (morphoBlue == address(0)) return (0, 0, 0, 0);
        
        (bool success, bytes memory returnData) = morphoBlue.staticcall(
            abi.encodeWithSignature(
                "market((address,address,address,address,uint256))",
                marketId
            )
        );
        
        if (!success) return (0, 0, 0, 0);
        return abi.decode(returnData, (uint128, uint128, uint128, uint128));
    }

    // ============ ADMIN FUNCTIONS ============

    function approveStablecoin(address token, bool approved) external onlyOwner {
        approvedStablecoins[token] = approved;
    }

    function approveIPContract(address nftContract, bool approved) external onlyOwner {
        approvedIPContracts[nftContract] = approved;
    }

    function setMorphoBlue(address _morpho) external onlyOwner {
        morphoBlue = _morpho;
        emit MorphoIntegrationUpdated(_morpho);
    }

    function setCentrifugePool(address _pool) external onlyOwner {
        centrifugePool = _pool;
        emit CentrifugePoolUpdated(_pool);
    }

    function setBaseInterestRate(uint256 rate) external onlyOwner {
        require(rate <= 2000, "Rate cannot exceed 20%");
        baseInterestRate = rate;
    }

    function setRiskPremium(uint256 premium) external onlyOwner {
        require(premium <= 1000, "Premium cannot exceed 10%");
        riskPremium = premium;
    }

    function setOriginationFee(uint256 fee) external onlyOwner {
        require(fee <= 500, "Fee cannot exceed 5%");
        originationFee = fee;
    }

    function updateCreditScore(address user, uint256 score) external onlyOwner {
        require(score <= 850, "Score cannot exceed 850");
        userCreditScore[user] = score;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawFees(address stablecoin, uint256 amount) external onlyOwner nonReentrant {
        uint256 available = IERC20(stablecoin).balanceOf(address(this)) - totalLiquidity;
        require(amount <= available, "Exceeds available fees");
        IERC20(stablecoin).safeTransfer(msg.sender, amount);
    }

    // ============ VIEW FUNCTIONS ============

    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    function getLoanDetails(uint256 loanId) external view returns (
        address borrower,
        address stablecoin,
        uint256 loanAmount,
        uint256 collateralAmount,
        uint256 interestRate,
        uint256 termDays,
        uint256 amountRepaid,
        uint256 totalOwed,
        bool isActive,
        bool isLiquidated
    ) {
        EscrowLoan storage loan = loans[loanId];
        return (
            loan.borrower,
            loan.stablecoin,
            loan.loanAmount,
            loan.collateralAmount,
            loan.interestRate,
            loan.termDays,
            loan.amountRepaid,
            calculateTotalOwed(loanId),
            loan.isActive,
            loan.isLiquidated
        );
    }

    function getIPEscrowDetails(uint256 loanId) external view returns (
        address nftContract,
        uint256 tokenId,
        string memory storyProtocolIPID,
        uint256 appraisedValue,
        bytes32 documentHash,
        bool isReleased
    ) {
        IPAssetEscrow storage escrow = loans[loanId].ipEscrow;
        return (
            escrow.nftContract,
            escrow.tokenId,
            escrow.storyProtocolIPID,
            escrow.appraisedValue,
            escrow.documentHash,
            escrow.isReleased
        );
    }

    function getPlatformStats() external view returns (
        uint256 _totalLoansOriginated,
        uint256 _totalValueLocked,
        uint256 _totalLiquidity,
        uint256 _totalInterestEarned
    ) {
        return (
            totalLoansOriginated,
            totalValueLocked,
            totalLiquidity,
            totalInterestEarned
        );
    }

    // ============ ERC721 RECEIVER ============

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
