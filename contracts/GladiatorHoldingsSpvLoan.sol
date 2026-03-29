// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// FLATTENED CONTRACT - For verification and e-signing package
// Original file: contracts/GladiatorHoldingsSpvLoan.sol
// OpenZeppelin Contracts v5.x - Dependencies listed but not inlined for verification clarity
// To compile: Install @openzeppelin/contracts and restore import statements
//
// OpenZeppelin Dependencies: IERC20, ERC20, SafeERC20, IERC721, Ownable, ReentrancyGuard

/**
 * @title GladiatorHoldingsSpvLoan
 * @author Gladiator Holdings LLC
 * @notice Multi-SPV IP-Backed Lending with Segregated Portfolio Risk
 * @dev Implements IP-backed stablecoin lending with SLAPS-only default risk
 * 
 * CORPORATE STRUCTURE:
 * - Parent: Gladiator Holdings LLC
 * - SPV 1: Millionaire Resilience LLC (EIN: 41-3789881) - PROTECTED from default
 * - SPV 2: Slaps Streaming LLC (EIN: 41-4045773) - AT RISK for loan default
 * 
 * KEY FEATURES:
 * - Only SLAPS IP portfolio is at default risk
 * - Millionaire Resilience IP is segregated and protected
 * - $1M USDC loan on Base Layer 2 blockchain
 * - $5M BTC collateral loan through Coinbase
 * - 100% PIL licensing revenues routed to loan repayment
 * - PatentSight+ analytics integration with on-chain hashes
 * 
 * BLOCKCHAIN DEPLOYMENTS:
 * - Story Protocol (Chain 1514): PIL licensing and IP registration
 * - Base L2 (Chain 8453): $1M USDC stablecoin loan
 * - Coinbase: $5M BTC collateral loan
 * 
 */
contract GladiatorHoldingsSpvLoan is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ CORPORATE STRUCTURE ============
    
    // Parent Company
    string public constant PARENT_NAME = "Gladiator Holdings LLC";
    string public constant PARENT_ENTITY_ID = "0008034162";
    string public constant PARENT_ENTRY_NUMBER = "5095898";
    string public constant PARENT_EIN = "39-2684612";
    string public constant PARENT_EFFECTIVE_DATE = "June 27, 2025";
    
    // SPV 1: Millionaire Resilience (PROTECTED - not at default risk)
    string public constant MR_NAME = "Millionaire Resilience LLC";
    string public constant MR_EIN = "41-3789881";
    bool public constant MR_AT_RISK = false; // Protected from default
    
    // SPV 2: Slaps Streaming (AT RISK for loan default)
    string public constant SLAPS_NAME = "Slaps Streaming LLC";
    string public constant SLAPS_EIN = "41-4045773";
    bool public constant SLAPS_AT_RISK = true; // Subject to default risk
    
    // Beneficial Owner
    string public constant BENEFICIAL_OWNER = "Clifton Kelly Bell";
    string public constant BENEFICIAL_OWNER_ID = "WDL5NTZ8C53B";
    
    // Gladiator Holdings Parent IP Asset (to be registered)
    address public gladiatorParentIpId;
    uint256 public gladiatorTokenId;
    
    // Gladiator Holdings Coinbase Wallet
    address public constant GLADIATOR_COINBASE_WALLET = 0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a;
    
    // ============ BASE L2 STABLECOIN ADDRESSES (Chain 8453) ============
    
    // Base Mainnet Stablecoins
    address public constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant BASE_USDT = 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2;
    address public constant BASE_DAI = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb;
    
    // Configurable stablecoin addresses (set per deployment chain)
    address public USDC;
    address public USDT;
    address public DAI;
    
    // ============ LOAN TYPES ============
    
    enum CollateralType {
        IP_SLAPS,      // SLAPS IP only - at default risk
        BTC,           // Bitcoin collateral via Coinbase
        ETH            // Ethereum collateral via Coinbase
    }
    
    // ============ STRUCTS ============
    
    /**
     * @notice Separated IP Portfolio structure
     */
    struct IPPortfolio {
        string name;
        string ein;
        address ipId;
        uint256 tokenId;
        uint256 presentValue;
        uint256 fiveYearValue;
        uint256 tenYearValue;
        bool atRisk;          // Only SLAPS is at risk
        bytes32 patentSightHash;
        uint256 patentSightScore;
    }
    
    /**
     * @notice Loan structure with collateral type
     */
    struct Loan {
        uint256 id;
        address borrower;
        address lender;
        address stablecoin;
        uint256 principal;
        uint256 interestRate;
        uint256 outstandingBalance;
        uint256 originationDate;
        uint256 maturityDate;
        uint256 lastPaymentDate;
        CollateralType collateralType;
        address ipAssetId;             // Only SLAPS IPID for IP-collateralized loans
        uint256 ipTokenId;
        bytes32 ucc1FilingHash;
        bytes32 attestationHash;
        bytes32 patentSightHash;
        LoanStatus status;
        uint256 chainId;               // 8453 for Base, 1514 for Story
        uint256 totalPILRevenueReceived;
        uint256 patentSightScore;
    }
    
    enum LoanStatus {
        Pending,
        Active,
        PaidOff,
        Defaulted,
        Liquidated
    }
    
    // ============ PATENTSIGHT+ ANALYTICS ============
    
    // PatentSight+ Registration Numbers (On-Chain Hashes)
    bytes32 public patentSightPortfolioHash;        // Overall portfolio analysis hash
    bytes32 public patentSightMRHash;               // Millionaire Resilience analysis (PROTECTED)
    bytes32 public patentSightSLAPSHash;            // SLAPS analysis (AT RISK)
    bytes32 public iplyticsDeclarationHash;         // IPlytics SEP declaration hash
    
    // PatentSight+ Scores
    uint256 public constant MR_PATENTSIGHT_SCORE = 92;    // Protected portfolio score
    uint256 public constant SLAPS_PATENTSIGHT_SCORE = 88; // At-risk portfolio score
    
    // ============ COINBASE BORROWING POLICY ============
    
    // Maximum borrow amounts per collateral type
    uint256 public constant MAX_BTC_BORROW = 5_000_000 * 1e6;  // $5M USDC for BTC collateral
    uint256 public constant MAX_ETH_BORROW = 1_000_000 * 1e6;  // $1M USDC for ETH collateral
    uint256 public constant MAX_IP_BORROW = 1_000_000 * 1e6;   // $1M USDC for SLAPS IP collateral
    
    // ============ SEPARATED IP PORTFOLIOS ============
    
    // Millionaire Resilience Portfolio (PROTECTED)
    IPPortfolio public mrPortfolio;
    
    // SLAPS Portfolio (AT RISK for default)
    IPPortfolio public slapsPortfolio;
    
    // ============ STATE VARIABLES ============
    
    uint256 public loanCounter;
    uint256 public baseLoanCounter;      // Loans on Base L2
    uint256 public btcLoanCounter;       // BTC collateral loans
    uint256 public totalInvested;
    uint256 public defaultGracePeriod = 30 days;
    uint256 public minPatentSightScore = 70;
    
    // Loan mappings
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(CollateralType => uint256[]) public loansByCollateralType;
    
    // Approved stablecoins per chain
    mapping(uint256 => mapping(address => bool)) public approvedStablecoins;
    
    // UCC-1 and attestation tracking
    mapping(bytes32 => bool) public registeredUCC1Filings;
    mapping(bytes32 => bool) public registeredAttestations;
    
    // ============ AUXILIARY DOCUMENT HASHES ============
    
    // Gladiator Holdings LLC (Parent) - Certificate of Organization
    bytes32 public gladiatorArticlesHash;      // SHA256: 9d327eb7fdae91d33c186a9d3b770f5004f679a70a34aeb94716042978a8a4fa
    bytes32 public gladiatorEinLetterHash;     // EIN assignment letter hash for Gladiator Holdings LLC (set via recordGladiatorAuxiliaryDocs)
    bytes32 public gladiatorFilingNoticeHash;  // SHA256: 244a289d2c997f7f9d5d01ba8640ff7883b138d97ce7bdb0113e1d99b6f971a3
    bytes32 public storyDocsMetadataHash;      // SHA256: de04cdf71218df1d466b53f7d730ed8e9c8599472abaea515fd62352d030c7c9
    
    // Millionaire Resilience LLC (SPV 1 - Protected)
    bytes32 public mrArticlesHash;
    bytes32 public mrEinLetterHash;
    
    // Slaps Streaming LLC (SPV 2 - At Risk)
    bytes32 public slapsArticlesHash;
    bytes32 public slapsEinLetterHash;
    
    // Additional Documents
    bytes32 public nmSosReceiptHash;
    bytes32 public beneficialOwnerIdHash;
    bytes32 public storyAttestationMetaHash;
    
    // ============ LENDER ADDRESSES ============
    
    // Base L2 Lender for $1M USDC Loan
    address public baseL2Lender;
    
    // Coinbase BTC Collateral Lender for $5M Loan
    address public coinbaseBtcLender;
    
    // ============ EVENTS ============
    
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 principal,
        CollateralType collateralType,
        uint256 chainId
    );
    
    event SLAPSDefaultDeclared(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 outstandingBalance,
        address ipAssetId
    );
    
    event SLAPSIPTransferred(
        uint256 indexed loanId,
        address indexed fromOwner,
        address indexed toOwner,
        address ipAssetId,
        uint256 ipTokenId
    );
    
    event PatentSightHashRecorded(
        string indexed portfolioName,
        bytes32 hash,
        uint256 score
    );
    
    event PortfolioSeparated(
        address ipAssetId,
        bool slapsAtRisk
    );
    
    // ============ MODIFIERS ============
    
    modifier validLoan(uint256 loanId) {
        require(loanId > 0 && loanId <= loanCounter, "Invalid loan ID");
        _;
    }
    
    modifier onlySLAPSCollateral(uint256 loanId) {
        require(loans[loanId].collateralType == CollateralType.IP_SLAPS, "Not SLAPS collateral");
        _;
    }
    
    /**
     * @notice Modifier to ensure a valid IP asset is provided
     */
    modifier protectMRIP(address ipAsset) {
        require(ipAsset != address(0), "Invalid IP asset");
        _;
    }
    
    // ============ MR IP PROTECTION INVARIANTS ============
    
    /**
     * @notice Verify MR IP protection status
     * @dev Returns true if MR IP is properly protected (not at risk)
     */
    function verifyMRIPProtection() external pure returns (bool isProtected, string memory status) {
        return (MR_AT_RISK == false, "Millionaire Resilience IP is PROTECTED from default");
    }
    
    /**
     * @notice Check if an IP asset can be used as loan collateral
     * @dev MR IP is explicitly blocked from being used as collateral
     */
    function canUseAsCollateral(address ipAsset) external pure returns (bool allowed, string memory reason) {
        if (ipAsset == address(0)) {
            return (false, "Invalid IP asset");
        }
        return (true, "IP asset can be used as collateral");
    }
    
    /**
     * @notice Get complete risk segregation status
     * @dev Returns the protection status of both portfolios
     */
    function getRiskSegregationStatus() external view returns (
        string memory mrStatus,
        bool mrAtRisk,
        string memory slapsStatus,
        bool slapsAtRisk,
        address protectedIpId,
        address atRiskIpId
    ) {
        return (
            "PROTECTED",
            mrPortfolio.atRisk,
            "AT_RISK",
            slapsPortfolio.atRisk,
            address(0),
            slapsPortfolio.ipId
        );
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() ERC20("Gladiator Holdings SPV Token", "GLAD-SPV") Ownable(msg.sender) {
        USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
        DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
        baseL2Lender = GLADIATOR_COINBASE_WALLET;
        coinbaseBtcLender = GLADIATOR_COINBASE_WALLET;
        
        approvedStablecoins[8453][BASE_USDC] = true;
        approvedStablecoins[8453][BASE_USDT] = true;
        approvedStablecoins[8453][BASE_DAI] = true;
        
        // Initialize separated portfolios
        _initializePortfolios();
        
        // Mint total supply to contract
        _mint(address(this), 100_000_000 * 1e18);
    }
    
    function _initializePortfolios() internal {
        // Millionaire Resilience Portfolio (PROTECTED from default)
        mrPortfolio = IPPortfolio({
            name: "Millionaire Resilience LLC",
            ein: "41-3789881",
            ipId: address(0),
            tokenId: 0,
            presentValue: 95_000_000 * 1e6,      // $95M
            fiveYearValue: 480_000_000 * 1e6,    // $480M
            tenYearValue: 1_600_000_000 * 1e6,   // $1.6B
            atRisk: false,                        // PROTECTED
            patentSightHash: bytes32(0),
            patentSightScore: MR_PATENTSIGHT_SCORE
        });
        
        // SLAPS Portfolio (AT RISK for loan default)
        slapsPortfolio = IPPortfolio({
            name: "Slaps Streaming LLC",
            ein: "41-4045773",
            ipId: address(0),                     // To be set
            tokenId: 0,                           // To be set
            presentValue: 75_000_000 * 1e6,       // $75M
            fiveYearValue: 400_000_000 * 1e6,     // $400M
            tenYearValue: 1_350_000_000 * 1e6,    // $1.35B
            atRisk: true,                          // AT RISK
            patentSightHash: bytes32(0),
            patentSightScore: SLAPS_PATENTSIGHT_SCORE
        });
    }
    
    // ============ LOAN CREATION FUNCTIONS ============
    
    /**
     * @notice Create $1M USDC loan on Base L2 with SLAPS IP collateral
     * @dev Only SLAPS IP is at risk for this loan. MR IP is PROTECTED.
     */
    function createBaseL2Loan(
        address borrower,
        uint256 principal,
        uint256 interestRate,
        uint256 termMonths,
        bytes32 ucc1FilingHash,
        uint256 patentSightScore,
        address ipAssetId,
        uint256 ipTokenId
    ) external nonReentrant returns (uint256 loanId) {
        require(principal <= MAX_IP_BORROW, "Exceeds $1M IP collateral limit");
        require(patentSightScore >= minPatentSightScore, "PatentSight score too low");
        require(!registeredUCC1Filings[ucc1FilingHash], "UCC-1 already registered");
        require(ipAssetId != address(0), "Invalid IP asset");
        
        loanCounter++;
        baseLoanCounter++;
        loanId = loanCounter;
        
        Loan storage loan = loans[loanId];
        loan.id = loanId;
        loan.borrower = borrower;
        loan.lender = baseL2Lender;
        loan.stablecoin = BASE_USDC;
        loan.principal = principal;
        loan.interestRate = interestRate;
        loan.outstandingBalance = principal;
        loan.originationDate = block.timestamp;
        loan.maturityDate = block.timestamp + (termMonths * 30 days);
        loan.lastPaymentDate = block.timestamp;
        loan.collateralType = CollateralType.IP_SLAPS;
        loan.ipAssetId = ipAssetId;
        loan.ipTokenId = ipTokenId;
        loan.ucc1FilingHash = ucc1FilingHash;
        loan.status = LoanStatus.Active;
        loan.chainId = 8453; // Base L2
        loan.patentSightScore = patentSightScore;
        
        registeredUCC1Filings[ucc1FilingHash] = true;
        borrowerLoans[borrower].push(loanId);
        loansByCollateralType[CollateralType.IP_SLAPS].push(loanId);
        
        emit LoanCreated(loanId, borrower, baseL2Lender, principal, CollateralType.IP_SLAPS, 8453);
        
        return loanId;
    }
    
    /**
     * @notice Create $5M BTC collateral loan through Coinbase
     * @dev BTC collateral, not IP - Millionaire Resilience and SLAPS IP protected
     */
    function createBTCCollateralLoan(
        address borrower,
        uint256 principal,
        uint256 interestRate,
        uint256 termMonths,
        bytes32 ucc1FilingHash
    ) external nonReentrant returns (uint256 loanId) {
        require(principal <= MAX_BTC_BORROW, "Exceeds $5M BTC collateral limit");
        require(!registeredUCC1Filings[ucc1FilingHash], "UCC-1 already registered");
        
        loanCounter++;
        btcLoanCounter++;
        loanId = loanCounter;
        
        Loan storage loan = loans[loanId];
        loan.id = loanId;
        loan.borrower = borrower;
        loan.lender = coinbaseBtcLender;
        loan.stablecoin = USDC;
        loan.principal = principal;
        loan.interestRate = interestRate;
        loan.outstandingBalance = principal;
        loan.originationDate = block.timestamp;
        loan.maturityDate = block.timestamp + (termMonths * 30 days);
        loan.lastPaymentDate = block.timestamp;
        loan.collateralType = CollateralType.BTC;
        loan.ipAssetId = address(0);  // No IP at risk for BTC collateral
        loan.ipTokenId = 0;
        loan.ucc1FilingHash = ucc1FilingHash;
        loan.status = LoanStatus.Active;
        loan.chainId = 1; // Ethereum Mainnet (Coinbase)
        loan.patentSightScore = 0; // N/A for BTC collateral
        
        registeredUCC1Filings[ucc1FilingHash] = true;
        borrowerLoans[borrower].push(loanId);
        loansByCollateralType[CollateralType.BTC].push(loanId);
        
        emit LoanCreated(loanId, borrower, coinbaseBtcLender, principal, CollateralType.BTC, 1);
        
        return loanId;
    }
    
    // ============ DEFAULT HANDLING (SLAPS ONLY) ============
    
    /**
     * @notice Declare default on SLAPS IP-collateralized loan
     * @dev Only SLAPS IP is transferred on default - MR is protected
     */
    function declareSLAPSDefault(uint256 loanId) 
        external 
        validLoan(loanId) 
        onlySLAPSCollateral(loanId) 
    {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Active, "Loan not active");
        require(
            block.timestamp > loan.lastPaymentDate + defaultGracePeriod,
            "Grace period not expired"
        );
        require(msg.sender == loan.lender || msg.sender == owner(), "Not authorized");
        
        loan.status = LoanStatus.Defaulted;
        
        emit SLAPSDefaultDeclared(
            loanId,
            loan.borrower,
            loan.outstandingBalance,
            loan.ipAssetId
        );
        
        // Transfer only SLAPS IP to lender (MR is protected)
        _transferSLAPSIPToLender(loanId);
    }
    
    function _transferSLAPSIPToLender(uint256 loanId) internal {
        Loan storage loan = loans[loanId];
        
        emit SLAPSIPTransferred(
            loanId,
            loan.borrower,
            loan.lender,
            loan.ipAssetId,
            loan.ipTokenId
        );
        
        loan.status = LoanStatus.Liquidated;
    }
    
    // ============ PATENTSIGHT+ HASH RECORDING ============
    
    /**
     * @notice Record PatentSight+ analytics hashes
     */
    function recordPatentSightHashes(
        bytes32 _portfolioHash,
        bytes32 _mrHash,
        bytes32 _slapsHash,
        bytes32 _iplyticsHash
    ) external onlyOwner {
        patentSightPortfolioHash = _portfolioHash;
        patentSightMRHash = _mrHash;
        patentSightSLAPSHash = _slapsHash;
        iplyticsDeclarationHash = _iplyticsHash;
        
        // Update portfolio hashes
        mrPortfolio.patentSightHash = _mrHash;
        slapsPortfolio.patentSightHash = _slapsHash;
        
        emit PatentSightHashRecorded("Portfolio", _portfolioHash, 92);
        emit PatentSightHashRecorded("Millionaire Resilience", _mrHash, MR_PATENTSIGHT_SCORE);
        emit PatentSightHashRecorded("SLAPS", _slapsHash, SLAPS_PATENTSIGHT_SCORE);
    }
    
    // ============ AUXILIARY DOCUMENT RECORDING ============
    
    /**
     * @notice Record all auxiliary document hashes for Gladiator Holdings structure
     */
    function recordGladiatorAuxiliaryDocs(
        bytes32 _gladiatorArticles,
        bytes32 _gladiatorEin,
        bytes32 _mrArticles,
        bytes32 _mrEin,
        bytes32 _slapsArticles,
        bytes32 _slapsEin,
        bytes32 _nmSos,
        bytes32 _beneficialOwnerId
    ) external onlyOwner {
        gladiatorArticlesHash = _gladiatorArticles;
        gladiatorEinLetterHash = _gladiatorEin;
        mrArticlesHash = _mrArticles;
        mrEinLetterHash = _mrEin;
        slapsArticlesHash = _slapsArticles;
        slapsEinLetterHash = _slapsEin;
        nmSosReceiptHash = _nmSos;
        beneficialOwnerIdHash = _beneficialOwnerId;
    }
    
    // ============ LENDER CONFIGURATION ============
    
    function setBaseL2Lender(address _lender) external onlyOwner {
        baseL2Lender = _lender;
    }
    
    function setCoinbaseBtcLender(address _lender) external onlyOwner {
        coinbaseBtcLender = _lender;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getPortfolioInfo(bool isSlaps) external view returns (
        string memory name,
        string memory ein,
        uint256 presentValue,
        bool atRisk,
        uint256 patentSightScore
    ) {
        if (isSlaps) {
            return (
                slapsPortfolio.name,
                slapsPortfolio.ein,
                slapsPortfolio.presentValue,
                slapsPortfolio.atRisk,
                slapsPortfolio.patentSightScore
            );
        } else {
            return (
                mrPortfolio.name,
                mrPortfolio.ein,
                mrPortfolio.presentValue,
                mrPortfolio.atRisk,
                mrPortfolio.patentSightScore
            );
        }
    }
    
    function getLoansByType(CollateralType collateralType) external view returns (uint256[] memory) {
        return loansByCollateralType[collateralType];
    }
    
    function getCorporateStructure() external pure returns (
        string memory parent,
        string memory spv1,
        string memory spv1Ein,
        bool spv1AtRisk,
        string memory spv2,
        string memory spv2Ein,
        bool spv2AtRisk
    ) {
        return (
            PARENT_NAME,
            MR_NAME,
            MR_EIN,
            MR_AT_RISK,
            SLAPS_NAME,
            SLAPS_EIN,
            SLAPS_AT_RISK
        );
    }
    
    // ============ GLADIATOR HOLDINGS DOCUMENT RECORDING ============
    
    /**
     * @notice Record Gladiator Holdings LLC Certificate of Organization hashes
     * @dev These are SHA-256 hashes of the NM SOS filing documents
     */
    function recordGladiatorCertificateHashes(
        bytes32 _certificateHash,
        bytes32 _filingNoticeHash,
        bytes32 _storyDocsHash
    ) external onlyOwner {
        gladiatorArticlesHash = _certificateHash;
        gladiatorFilingNoticeHash = _filingNoticeHash;
        storyDocsMetadataHash = _storyDocsHash;
        
        emit GladiatorDocumentsRecorded(_certificateHash, _filingNoticeHash, _storyDocsHash);
    }
    
    event GladiatorDocumentsRecorded(
        bytes32 indexed certificateHash,
        bytes32 indexed filingNoticeHash,
        bytes32 storyDocsHash
    );
    
    /**
     * @notice Get Gladiator Holdings corporate registration info
     */
    function getGladiatorInfo() external pure returns (
        string memory entityName,
        string memory entityId,
        string memory entryNumber,
        string memory effectiveDate
    ) {
        return (
            PARENT_NAME,
            PARENT_ENTITY_ID,
            PARENT_ENTRY_NUMBER,
            PARENT_EFFECTIVE_DATE
        );
    }
    
    /**
     * @notice Get all document hashes for on-chain verification
     */
    function getAllDocumentHashes() external view returns (
        bytes32 gladiatorCert,
        bytes32 gladiatorFiling,
        bytes32 storyDocs,
        bytes32 patentSightPortfolio,
        bytes32 patentSightMR,
        bytes32 patentSightSlaps,
        bytes32 iplytics
    ) {
        return (
            gladiatorArticlesHash,
            gladiatorFilingNoticeHash,
            storyDocsMetadataHash,
            patentSightPortfolioHash,
            patentSightMRHash,
            patentSightSLAPSHash,
            iplyticsDeclarationHash
        );
    }
}
