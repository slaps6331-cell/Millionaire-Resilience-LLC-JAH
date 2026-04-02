// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// FLATTENED CONTRACT - For verification and e-signing package
// Original file: contracts/StoryAttestationService.sol
// OpenZeppelin Contracts v5.x - Dependencies listed but not inlined for verification clarity
// To compile: Install @openzeppelin/contracts and restore import statements
//
// OpenZeppelin Dependencies: Ownable, ReentrancyGuard

/**
 * @title StoryAttestationService
 * @author Gladiator Holdings LLC
 * @notice On-chain attestation service for Gladiator Holdings Multi-SPV IP-backed lending
 * @dev Implements 7 attestation types creating a hermetic seal between UCC-1 filings,
 *      Story Protocol, and Morpho Protocol DeFi lending
 *
 * HERMETIC SEAL FLOW:
 * UCC-1 Filing (NM SOS) → StoryAttestationService → StoryOrchestrationService → StoryScan.io
 *
 * ATTESTATION TYPES (7):
 * 1. CORPORATE_VERIFICATION       - Entity registration and beneficial ownership
 * 2. IP_VALUATION_ATTESTATION      - PatentSight+/IPlytics certified valuations
 * 3. UCC1_BRIDGE_ATTESTATION       - UCC-1 to on-chain bridge records
 * 4. LOAN_COLLATERAL_ATTESTATION   - Morpho Protocol collateral positions
 * 5. REVENUE_ESCROW_ATTESTATION    - PIL licensing revenue escrow status
 * 6. MORPHO_MARKET_ATTESTATION     - Morpho Blue market parameters and positions
 * 7. SPV_SEGREGATION_ATTESTATION   - Risk isolation between protected and at-risk entities
 *
 * CORPORATE STRUCTURE:
 * - Parent: Gladiator Holdings LLC (NM Entity ID: 0008034162)
 * - SPV 1: Millionaire Resilience LLC (EIN: 41-3789881) - PROTECTED
 * - SPV 2: Resilience Blockchain Whetstone LLC (EIN: 41-4131924) - PROTECTED
 * - SPV 3: Slaps Streaming LLC (EIN: 41-4045773) - AT RISK
 *
 * PROTECTED IP PORTFOLIOS ($225M total excluded from default):
 * - MR Social Media Platform: $95M
 * - Resilience Blockchain Whetstone: $45M
 * - LexisNexis PatentSight+/IPlytics: $35M
 * - Infrastructure IP: $50M
 *
 * AT RISK IP PORTFOLIO:
 * - SLAPS Streaming: $75M (secondary collateral only)
 *
 * MORPHO PROTOCOL LOANS:
 * - Loan 1: $5M USDC (BTC collateral, 4% APR, 86% LLTV)
 * - Loan 2: $1M USDC (ETH collateral, 6% APR, 86% LLTV)
 */
contract StoryAttestationService is Ownable, ReentrancyGuard {

    // ============ CONSTANTS ============

    uint256 public constant STORY_CHAIN_ID = 1514;
    uint256 public constant BASE_CHAIN_ID = 8453;

    address public constant MR_OWNER = 0x597856e93f19877a399f686D2F43b298e2268618;
    address public constant COINBASE_WALLET = 0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a;

    address public constant MORPHO_BLUE = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;
    address public constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // ============ STORY PROTOCOL SDK — MAINNET ADDRESSES (Chain 1514) ============
    // Source: https://docs.story.foundation/developers/deployed-smart-contracts
    address public constant IP_ASSET_REGISTRY      = 0x77319B4031e6eF1250907aa00018B8B1c67a244b;
    address public constant LICENSING_MODULE       = 0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f;
    address public constant ROYALTY_MODULE         = 0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086;
    address public constant PIL_LICENSE_TEMPLATE   = 0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316;
    address public constant ROYALTY_POLICY_LAP     = 0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E;
    address public constant LICENSE_REGISTRY       = 0x529a750E02d8E2f15649c13D69a465286a780e24;
    address public constant REGISTRATION_WORKFLOWS = 0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424;

    // ============ 7 ATTESTATION TYPE IDENTIFIERS ============

    bytes32 public constant ATT_CORPORATE_VERIFICATION = keccak256("CORPORATE_VERIFICATION");
    bytes32 public constant ATT_IP_VALUATION = keccak256("IP_VALUATION_ATTESTATION");
    bytes32 public constant ATT_UCC1_BRIDGE = keccak256("UCC1_BRIDGE_ATTESTATION");
    bytes32 public constant ATT_LOAN_COLLATERAL = keccak256("LOAN_COLLATERAL_ATTESTATION");
    bytes32 public constant ATT_REVENUE_ESCROW = keccak256("REVENUE_ESCROW_ATTESTATION");
    bytes32 public constant ATT_MORPHO_MARKET = keccak256("MORPHO_MARKET_ATTESTATION");
    bytes32 public constant ATT_SPV_SEGREGATION = keccak256("SPV_SEGREGATION_ATTESTATION");

    // ============ CORPORATE IDENTITY CONSTANTS ============

    string private constant PARENT_NAME = "Gladiator Holdings LLC";
    string private constant PARENT_ENTITY_ID = "0008034162";
    string private constant PARENT_ENTRY_NUMBER = "5095898";
    string private constant PARENT_EIN = "39-2684612";

    string private constant MR_NAME = "Millionaire Resilience LLC";
    string private constant MR_EIN = "41-3789881";

    string private constant WHETSTONE_NAME = "Resilience Blockchain Whetstone LLC";
    string private constant WHETSTONE_EIN = "41-4131924";

    string private constant SLAPS_NAME = "Slaps Streaming LLC";
    string private constant SLAPS_EIN = "41-4045773";

    string private constant BENEFICIAL_OWNER = "Clifton Kelly Bell";
    string private constant BENEFICIAL_OWNER_ID = "WDL5NTZ8C53B";

    // ============ APPROVED AUDITOR ============

    string private constant AUDITOR_NAME = "Tecknos Associates LLC";
    string private constant AUDITOR_CREDENTIAL_1 = "ASC 820 - Fair Value Measurement";
    string private constant AUDITOR_CREDENTIAL_2 = "IRC 409A - Deferred Compensation Valuation";
    string private constant AUDITOR_ROLE = "Approved Coinbase Auditor";

    struct ApprovedAuditor {
        string name;
        string[] credentials;
        string role;
        address auditorAddress;
        bool active;
        uint256 approvedAt;
        uint256 validUntil;
    }

    mapping(address => ApprovedAuditor) public approvedAuditors;
    address[] public auditorList;
    uint256 public auditorCount;

    event AuditorApproved(address indexed auditorAddress, string name, string role);
    event AuditorRevoked(address indexed auditorAddress, string reason);
    event AuditorValuationSubmitted(address indexed auditorAddress, bytes32 indexed attestationId, string methodology);

    // ============ UCC-1 FILING INTEGRATION ============

    string public ucc1FilingNumber;
    string public ucc1FilingJurisdiction;
    uint256 public ucc1FilingTimestamp;
    bool public ucc1FilingRecorded;

    event UCC1FilingNumberRecorded(string filingNumber, string jurisdiction, uint256 timestamp);

    // ============ SAS/SOS REGISTRY ============

    bytes32 public sasContractHash;
    bytes32 public sosContractHash;
    bool public sasRegistered;
    bool public sosRegistered;
    uint256 public sasRegistrationTimestamp;
    uint256 public sosRegistrationTimestamp;

    event SASRegistered(bytes32 indexed contractHash, uint256 timestamp);
    event SOSRegistered(bytes32 indexed contractHash, uint256 timestamp);
    event RegistryRequestSubmitted(string serviceType, bytes32 contractHash, address requester);

    // ============ VERIFIED DOCUMENT HASHES ============

    bytes32 public constant CERTIFICATE_HASH = 0x9d327eb7fdae91d33c186a9d3b770f5004f679a70a34aeb94716042978a8a4fa;
    bytes32 public constant FILING_NOTICE_HASH = 0x244a289d2c997f7f9d5d01ba8640ff7883b138d97ce7bdb0113e1d99b6f971a3;
    bytes32 public constant STORY_METADATA_HASH = 0xde04cdf71218df1d466b53f7d730ed8e9c8599472abaea515fd62352d030c7c9;
    bytes32 public constant WHETSTONE_EIN_LETTER_HASH = 0xf383541906ec2d1c335d06c53bd0f2b3dce7cbd568f8f37474e92e5769af8420;

    // ============ STRUCTS ============

    struct Attestation {
        bytes32 id;
        bytes32 attestationType;
        address ipAssetId;
        uint256 tokenId;
        bytes32 dataHash;
        address attestor;
        uint256 timestamp;
        uint256 validUntil;
        string metadataURI;
        bool revoked;
        uint256 chainId;
    }

    struct CorporateVerification {
        bytes32 attestationId;
        string entityName;
        string entityId;
        string ein;
        bytes32 certificateHash;
        bytes32 filingNoticeHash;
        bool verified;
        uint256 verifiedAt;
    }

    struct IPValuation {
        bytes32 attestationId;
        address ipAssetId;
        string portfolioName;
        uint256 presentValue;
        uint256 projectedValue5Y;
        uint256 projectedValue10Y;
        uint256 patentSightScore;
        uint256 sepCount;
        uint256 avgEssentiality;
        string methodology;
        bool isProtected;
        uint256 validUntil;
    }

    struct MorphoMarketAttestation {
        bytes32 attestationId;
        bytes32 morphoMarketId;
        address loanToken;
        address collateralToken;
        uint256 lltv;
        uint256 borrowAmount;
        uint256 collateralAmount;
        uint256 interestRate;
        uint256 timestamp;
        bool active;
    }

    struct SPVSegregation {
        bytes32 attestationId;
        string spvName;
        string ein;
        address ipAssetId;
        uint256 portfolioValue;
        bool atRisk;
        string riskStatus;
        uint256 timestamp;
    }

    struct RevenueEscrow {
        bytes32 attestationId;
        uint256 pilPerRevenue;
        uint256 pilComRevenue;
        uint256 pilEntRevenue;
        uint256 totalAnnualRevenue;
        uint256 allocationPercentage;
        address paymentDestination;
        uint256 timestamp;
    }

    // ============ STATE VARIABLES ============

    uint256 public attestationCounter;
    uint256 public corporateVerificationCount;
    uint256 public valuationCount;
    uint256 public morphoMarketCount;
    uint256 public spvSegregationCount;

    mapping(bytes32 => Attestation) public attestations;
    mapping(address => bytes32[]) public ipAttestations;
    mapping(bytes32 => CorporateVerification) public corporateVerifications;
    mapping(address => IPValuation) public ipValuations;
    mapping(bytes32 => MorphoMarketAttestation) public morphoMarkets;
    mapping(string => SPVSegregation) public spvSegregations;
    mapping(address => RevenueEscrow) public revenueEscrows;

    mapping(address => bool) public authorizedAttestors;
    mapping(address => bool) public authorizedValuators;

    bytes32[] public allAttestationIds;

    // ============ EVENTS ============

    event AttestationCreated(
        bytes32 indexed attestationId,
        bytes32 indexed attestationType,
        address indexed ipAssetId,
        address attestor,
        uint256 chainId
    );

    event CorporateVerified(
        bytes32 indexed attestationId,
        string entityName,
        string entityId,
        bytes32 certificateHash
    );

    event IPValuationCertified(
        bytes32 indexed attestationId,
        address indexed ipAssetId,
        uint256 presentValue,
        uint256 patentSightScore,
        bool isProtected
    );

    event MorphoMarketAttested(
        bytes32 indexed attestationId,
        bytes32 indexed morphoMarketId,
        uint256 borrowAmount,
        uint256 collateralAmount
    );

    event SPVSegregationAttested(
        bytes32 indexed attestationId,
        string spvName,
        bool atRisk,
        uint256 portfolioValue
    );

    event RevenueEscrowAttested(
        bytes32 indexed attestationId,
        uint256 totalAnnualRevenue,
        uint256 allocationPercentage,
        address paymentDestination
    );

    event UCC1Bridged(
        bytes32 indexed attestationId,
        bytes32 indexed filingHash,
        address debtor,
        address securedParty,
        string jurisdiction
    );

    event AttestationRevoked(
        bytes32 indexed attestationId,
        address indexed revoker,
        string reason
    );

    event HermeticSealCompleted(
        bytes32 indexed ucc1AttestationId,
        bytes32 indexed morphoAttestationId,
        bytes32 indexed spvAttestationId,
        uint256 totalAttestations
    );

    // ============ CUSTOM ERRORS ============

    error NotAuthorizedAttestor();
    error NotAuthorizedValuator();
    error InvalidPresentValue();
    error ProjectionInvalid5Y();
    error ProjectionInvalid10Y();
    error PatentSightScoreTooLow();
    error InvalidFilingHash();
    error InvalidDebtor();
    error InvalidIPAsset();
    error MustAllocateFull();
    error InvalidPaymentDestination();
    error InvalidMorphoMarketId();
    error InvalidBorrowAmount();
    error ProtectedSPVNeedsIPId();
    error InvalidAttestationType();
    error AttestationRevoked_();
    error AttestationNotFound();
    error NotAuthorized();
    error AlreadyRevoked();
    error InvalidAuditorAddress();
    error AuditorAlreadyApproved();
    error AuditorNotActive();
    error FilingNumberRequired();
    error UCC1AlreadyRecorded();
    error InvalidContractHash();
    error SASAlreadyRegistered();
    error SOSAlreadyRegistered();
    error ServiceTypeRequired();

    // ============ MODIFIERS ============

    modifier onlyAuthorizedAttestor() {
        if (!authorizedAttestors[msg.sender] && msg.sender != owner()) revert NotAuthorizedAttestor();
        _;
    }

    modifier onlyAuthorizedValuator() {
        if (!authorizedValuators[msg.sender] && msg.sender != owner()) revert NotAuthorizedValuator();
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor() Ownable(msg.sender) {
        authorizedAttestors[msg.sender] = true;
        authorizedValuators[msg.sender] = true;
    }

    // ============ INTERNAL ATTESTATION CREATION ============

    function _createAttestation(
        bytes32 attestationType,
        address ipAssetId,
        uint256 tokenId,
        bytes32 dataHash,
        string memory metadataURI,
        uint256 chainId,
        uint256 validityDays
    ) internal returns (bytes32 attestationId) {
        attestationCounter++;
        attestationId = keccak256(abi.encodePacked(
            attestationType,
            ipAssetId,
            block.timestamp,
            attestationCounter
        ));

        Attestation storage att = attestations[attestationId];
        att.id = attestationId;
        att.attestationType = attestationType;
        att.ipAssetId = ipAssetId;
        att.tokenId = tokenId;
        att.dataHash = dataHash;
        att.attestor = msg.sender;
        att.timestamp = block.timestamp;
        att.validUntil = validityDays > 0 ? block.timestamp + (validityDays * 1 days) : 0;
        att.metadataURI = metadataURI;
        att.revoked = false;
        att.chainId = chainId;

        ipAttestations[ipAssetId].push(attestationId);
        allAttestationIds.push(attestationId);

        emit AttestationCreated(attestationId, attestationType, ipAssetId, msg.sender, chainId);

        return attestationId;
    }

    // ============ TYPE 1: CORPORATE VERIFICATION ============

    function attestCorporateVerification(
        string calldata entityName,
        string calldata entityId,
        string calldata ein,
        bytes32 certificateHash,
        bytes32 filingNoticeHash,
        string calldata metadataURI
    ) external onlyAuthorizedAttestor returns (bytes32 attestationId) {
        bytes32 dataHash = keccak256(abi.encode(
            entityName, entityId, ein, certificateHash, filingNoticeHash
        ));

        attestationId = _createAttestation(
            ATT_CORPORATE_VERIFICATION,
            address(0),
            0,
            dataHash,
            metadataURI,
            STORY_CHAIN_ID,
            365
        );

        corporateVerificationCount++;

        CorporateVerification storage cv = corporateVerifications[attestationId];
        cv.attestationId = attestationId;
        cv.entityName = entityName;
        cv.entityId = entityId;
        cv.ein = ein;
        cv.certificateHash = certificateHash;
        cv.filingNoticeHash = filingNoticeHash;
        cv.verified = true;
        cv.verifiedAt = block.timestamp;

        emit CorporateVerified(attestationId, entityName, entityId, certificateHash);

        return attestationId;
    }

    // ============ TYPE 2: IP VALUATION ATTESTATION ============

    function attestIPValuation(
        address ipAssetId,
        string calldata portfolioName,
        uint256 presentValue,
        uint256 projectedValue5Y,
        uint256 projectedValue10Y,
        uint256 patentSightScore,
        uint256 sepCount,
        uint256 avgEssentiality,
        string calldata methodology,
        bool isProtected,
        uint256 validityDays,
        string calldata metadataURI
    ) external onlyAuthorizedValuator returns (bytes32 attestationId) {
        if (presentValue == 0) revert InvalidPresentValue();
        if (projectedValue5Y < presentValue) revert ProjectionInvalid5Y();
        if (projectedValue10Y < projectedValue5Y) revert ProjectionInvalid10Y();
        if (patentSightScore < 70) revert PatentSightScoreTooLow();

        bytes32 dataHash = keccak256(abi.encodePacked(
            ipAssetId, presentValue, projectedValue5Y, projectedValue10Y,
            patentSightScore, methodology, block.timestamp
        ));

        attestationId = _createAttestation(
            ATT_IP_VALUATION,
            ipAssetId,
            0,
            dataHash,
            metadataURI,
            STORY_CHAIN_ID,
            validityDays
        );

        valuationCount++;

        IPValuation storage val = ipValuations[ipAssetId];
        val.attestationId = attestationId;
        val.ipAssetId = ipAssetId;
        val.portfolioName = portfolioName;
        val.presentValue = presentValue;
        val.projectedValue5Y = projectedValue5Y;
        val.projectedValue10Y = projectedValue10Y;
        val.patentSightScore = patentSightScore;
        val.sepCount = sepCount;
        val.avgEssentiality = avgEssentiality;
        val.methodology = methodology;
        val.isProtected = isProtected;
        val.validUntil = block.timestamp + (validityDays * 1 days);

        emit IPValuationCertified(
            attestationId, ipAssetId, presentValue, patentSightScore, isProtected
        );

        return attestationId;
    }

    // ============ TYPE 3: UCC-1 BRIDGE ATTESTATION ============

    function attestUCC1Bridge(
        bytes32 filingHash,
        address debtor,
        address securedParty,
        string calldata jurisdiction,
        string calldata filingNumber,
        address ipAssetId,
        uint256 collateralValue,
        string calldata metadataURI
    ) external onlyAuthorizedAttestor returns (bytes32 attestationId) {
        if (filingHash == bytes32(0)) revert InvalidFilingHash();
        if (debtor == address(0)) revert InvalidDebtor();

        bytes32 dataHash = keccak256(abi.encode(
            filingHash, debtor, securedParty, jurisdiction, filingNumber
        ));

        attestationId = _createAttestation(
            ATT_UCC1_BRIDGE,
            ipAssetId,
            0,
            dataHash,
            metadataURI,
            STORY_CHAIN_ID,
            1825
        );

        emit UCC1Bridged(attestationId, filingHash, debtor, securedParty, jurisdiction);

        return attestationId;
    }

    // ============ TYPE 4: LOAN COLLATERAL ATTESTATION ============

    function attestLoanCollateral(
        address ipAssetId,
        address lender,
        uint256 loanAmount,
        string calldata collateralType,
        uint256 collateralValue,
        string calldata metadataURI
    ) external onlyAuthorizedAttestor returns (bytes32 attestationId) {
        if (ipAssetId == address(0)) revert InvalidIPAsset();

        bytes32 dataHash = keccak256(abi.encodePacked(
            ipAssetId, lender, loanAmount, collateralType, collateralValue
        ));

        attestationId = _createAttestation(
            ATT_LOAN_COLLATERAL,
            ipAssetId,
            0,
            dataHash,
            metadataURI,
            STORY_CHAIN_ID,
            365
        );

        return attestationId;
    }

    // ============ TYPE 5: REVENUE ESCROW ATTESTATION ============

    function attestRevenueEscrow(
        address ipAssetId,
        uint256 pilPerRevenue,
        uint256 pilComRevenue,
        uint256 pilEntRevenue,
        uint256 allocationPercentage,
        address paymentDestination,
        string calldata metadataURI
    ) external onlyAuthorizedAttestor returns (bytes32 attestationId) {
        if (allocationPercentage != 100) revert MustAllocateFull();
        if (paymentDestination == address(0)) revert InvalidPaymentDestination();

        uint256 totalAnnualRevenue = pilPerRevenue + pilComRevenue + pilEntRevenue;

        bytes32 dataHash = keccak256(abi.encodePacked(
            ipAssetId, totalAnnualRevenue, allocationPercentage, paymentDestination
        ));

        attestationId = _createAttestation(
            ATT_REVENUE_ESCROW,
            ipAssetId,
            0,
            dataHash,
            metadataURI,
            STORY_CHAIN_ID,
            365
        );

        RevenueEscrow storage escrow = revenueEscrows[ipAssetId];
        escrow.attestationId = attestationId;
        escrow.pilPerRevenue = pilPerRevenue;
        escrow.pilComRevenue = pilComRevenue;
        escrow.pilEntRevenue = pilEntRevenue;
        escrow.totalAnnualRevenue = totalAnnualRevenue;
        escrow.allocationPercentage = allocationPercentage;
        escrow.paymentDestination = paymentDestination;
        escrow.timestamp = block.timestamp;

        emit RevenueEscrowAttested(
            attestationId, totalAnnualRevenue, allocationPercentage, paymentDestination
        );

        return attestationId;
    }

    // ============ TYPE 6: MORPHO MARKET ATTESTATION ============

    function attestMorphoMarket(
        bytes32 morphoMarketId,
        address loanToken,
        address collateralToken,
        uint256 lltv,
        uint256 borrowAmount,
        uint256 collateralAmount,
        uint256 interestRate,
        string calldata metadataURI
    ) external onlyAuthorizedAttestor returns (bytes32 attestationId) {
        if (morphoMarketId == bytes32(0)) revert InvalidMorphoMarketId();
        if (borrowAmount == 0) revert InvalidBorrowAmount();

        bytes32 dataHash = keccak256(abi.encodePacked(
            morphoMarketId, loanToken, collateralToken, lltv, borrowAmount, collateralAmount
        ));

        attestationId = _createAttestation(
            ATT_MORPHO_MARKET,
            address(0),
            0,
            dataHash,
            metadataURI,
            1,
            365
        );

        morphoMarketCount++;

        MorphoMarketAttestation storage mma = morphoMarkets[morphoMarketId];
        mma.attestationId = attestationId;
        mma.morphoMarketId = morphoMarketId;
        mma.loanToken = loanToken;
        mma.collateralToken = collateralToken;
        mma.lltv = lltv;
        mma.borrowAmount = borrowAmount;
        mma.collateralAmount = collateralAmount;
        mma.interestRate = interestRate;
        mma.timestamp = block.timestamp;
        mma.active = true;

        emit MorphoMarketAttested(attestationId, morphoMarketId, borrowAmount, collateralAmount);

        return attestationId;
    }

    // ============ TYPE 7: SPV SEGREGATION ATTESTATION ============

    function attestSPVSegregation(
        string calldata spvName,
        string calldata ein,
        address ipAssetId,
        uint256 portfolioValue,
        bool atRisk,
        string calldata metadataURI
    ) external onlyAuthorizedAttestor returns (bytes32 attestationId) {
        if (!atRisk) {
            if (ipAssetId == address(0)) revert ProtectedSPVNeedsIPId();
        }

        string memory riskStatus = atRisk ? "AT_RISK" : "PROTECTED";

        bytes32 dataHash = keccak256(abi.encode(
            spvName, ein, ipAssetId, portfolioValue, atRisk
        ));

        attestationId = _createAttestation(
            ATT_SPV_SEGREGATION,
            ipAssetId,
            0,
            dataHash,
            metadataURI,
            STORY_CHAIN_ID,
            365
        );

        spvSegregationCount++;

        SPVSegregation storage seg = spvSegregations[spvName];
        seg.attestationId = attestationId;
        seg.spvName = spvName;
        seg.ein = ein;
        seg.ipAssetId = ipAssetId;
        seg.portfolioValue = portfolioValue;
        seg.atRisk = atRisk;
        seg.riskStatus = riskStatus;
        seg.timestamp = block.timestamp;

        emit SPVSegregationAttested(attestationId, spvName, atRisk, portfolioValue);

        return attestationId;
    }

    // ============ HERMETIC SEAL VERIFICATION ============

    function executeHermeticSeal(
        bytes32 ucc1AttestationId,
        bytes32 morphoAttestationId,
        bytes32 spvAttestationId
    ) external onlyAuthorizedAttestor {
        if (attestations[ucc1AttestationId].attestationType != ATT_UCC1_BRIDGE) revert InvalidAttestationType();
        if (attestations[morphoAttestationId].attestationType != ATT_MORPHO_MARKET) revert InvalidAttestationType();
        if (attestations[spvAttestationId].attestationType != ATT_SPV_SEGREGATION) revert InvalidAttestationType();
        if (attestations[ucc1AttestationId].revoked) revert AttestationRevoked_();
        if (attestations[morphoAttestationId].revoked) revert AttestationRevoked_();
        if (attestations[spvAttestationId].revoked) revert AttestationRevoked_();

        emit HermeticSealCompleted(
            ucc1AttestationId,
            morphoAttestationId,
            spvAttestationId,
            attestationCounter
        );
    }

    function verifyHermeticSealIntegrity() external view returns (
        bool hasUCC1,
        bool hasMorpho,
        bool hasSPV,
        bool hasValuation,
        bool hasRevenue,
        bool hasCorporate,
        uint256 totalAttestations,
        bool sealComplete
    ) {
        hasUCC1 = _hasActiveAttestationType(ATT_UCC1_BRIDGE);
        hasMorpho = _hasActiveAttestationType(ATT_MORPHO_MARKET);
        hasSPV = _hasActiveAttestationType(ATT_SPV_SEGREGATION);
        hasValuation = _hasActiveAttestationType(ATT_IP_VALUATION);
        hasRevenue = _hasActiveAttestationType(ATT_REVENUE_ESCROW);
        hasCorporate = _hasActiveAttestationType(ATT_CORPORATE_VERIFICATION);
        totalAttestations = attestationCounter;
        sealComplete = hasUCC1 && hasMorpho && hasSPV && hasValuation && hasRevenue && hasCorporate;
    }

    function _hasActiveAttestationType(bytes32 attType) internal view returns (bool) {
        for (uint256 i = 0; i < allAttestationIds.length; i++) {
            Attestation storage att = attestations[allAttestationIds[i]];
            if (att.attestationType == attType && !att.revoked) {
                return true;
            }
        }
        return false;
    }

    // ============ REVOCATION ============

    function revokeAttestation(
        bytes32 attestationId,
        string calldata reason
    ) external {
        Attestation storage att = attestations[attestationId];
        if (att.id == bytes32(0)) revert AttestationNotFound();
        if (msg.sender != att.attestor && msg.sender != owner()) revert NotAuthorized();
        if (att.revoked) revert AlreadyRevoked();

        att.revoked = true;

        emit AttestationRevoked(attestationId, msg.sender, reason);
    }

    // ============ VIEW FUNCTIONS ============

    function getAttestation(bytes32 attestationId) external view returns (Attestation memory) {
        return attestations[attestationId];
    }

    function getIPAttestations(address ipAssetId) external view returns (bytes32[] memory) {
        return ipAttestations[ipAssetId];
    }

    function getIPValuation(address ipAssetId) external view returns (IPValuation memory) {
        return ipValuations[ipAssetId];
    }

    function getMorphoMarket(bytes32 marketId) external view returns (MorphoMarketAttestation memory) {
        return morphoMarkets[marketId];
    }

    function getSPVSegregation(string calldata spvName) external view returns (SPVSegregation memory) {
        return spvSegregations[spvName];
    }

    function getRevenueEscrow(address ipAssetId) external view returns (RevenueEscrow memory) {
        return revenueEscrows[ipAssetId];
    }

    function getCorporateVerification(bytes32 attestationId) external view returns (CorporateVerification memory) {
        return corporateVerifications[attestationId];
    }

    function getTotalAttestations() external view returns (uint256) {
        return attestationCounter;
    }

    function getAttestationSummary() external view returns (
        uint256 total,
        uint256 corporate,
        uint256 valuations,
        uint256 morphoMarkets_,
        uint256 spvSegregations_
    ) {
        return (
            attestationCounter,
            corporateVerificationCount,
            valuationCount,
            morphoMarketCount,
            spvSegregationCount
        );
    }

    function verifyValuationForMorphoLending(
        address ipAssetId,
        uint256 requestedLoanAmount,
        uint256 maxLTV
    ) external view returns (
        bool approved,
        uint256 maxLoanAmount,
        string memory reason
    ) {
        IPValuation storage val = ipValuations[ipAssetId];

        if (val.attestationId == bytes32(0)) {
            return (false, 0, "No valuation certified");
        }

        if (val.validUntil < block.timestamp) {
            return (false, 0, "Valuation expired");
        }

        if (attestations[val.attestationId].revoked) {
            return (false, 0, "Valuation attestation revoked");
        }

        if (val.patentSightScore < 70) {
            return (false, 0, "PatentSight score below minimum");
        }

        maxLoanAmount = (val.presentValue * maxLTV) / 10000;

        if (requestedLoanAmount > maxLoanAmount) {
            return (false, maxLoanAmount, "Loan exceeds LTV limit");
        }

        return (true, maxLoanAmount, "Approved for Morpho Protocol lending");
    }

    function getProtectedPortfolioValue() external view returns (
        uint256 mrPlatformValue,
        uint256 whetstoneValue,
        uint256 lexisNexisValue,
        uint256 infrastructureValue,
        uint256 totalProtected,
        uint256 slapsAtRisk
    ) {
        return (
            95_000_000 * 1e6,
            45_000_000 * 1e6,
            35_000_000 * 1e6,
            50_000_000 * 1e6,
            225_000_000 * 1e6,
            75_000_000 * 1e6
        );
    }

    // ============ ADMIN FUNCTIONS ============

    function addAttestor(address attestor) external onlyOwner {
        authorizedAttestors[attestor] = true;
    }

    function removeAttestor(address attestor) external onlyOwner {
        authorizedAttestors[attestor] = false;
    }

    function addValuator(address valuator) external onlyOwner {
        authorizedValuators[valuator] = true;
    }

    function removeValuator(address valuator) external onlyOwner {
        authorizedValuators[valuator] = false;
    }

    // ============ AUDITOR MANAGEMENT ============

    function approveAuditor(
        address auditorAddress,
        string calldata name,
        string[] calldata credentials,
        string calldata role,
        uint256 validityDays
    ) external onlyOwner {
        if (auditorAddress == address(0)) revert InvalidAuditorAddress();
        if (approvedAuditors[auditorAddress].active) revert AuditorAlreadyApproved();

        ApprovedAuditor storage auditor = approvedAuditors[auditorAddress];
        auditor.name = name;
        auditor.credentials = credentials;
        auditor.role = role;
        auditor.auditorAddress = auditorAddress;
        auditor.active = true;
        auditor.approvedAt = block.timestamp;
        auditor.validUntil = validityDays > 0 ? block.timestamp + (validityDays * 1 days) : 0;

        auditorList.push(auditorAddress);
        auditorCount++;

        authorizedValuators[auditorAddress] = true;

        emit AuditorApproved(auditorAddress, name, role);
    }

    function revokeAuditor(address auditorAddress, string calldata reason) external onlyOwner {
        if (!approvedAuditors[auditorAddress].active) revert AuditorNotActive();
        approvedAuditors[auditorAddress].active = false;
        authorizedValuators[auditorAddress] = false;
        emit AuditorRevoked(auditorAddress, reason);
    }

    function getAuditorInfo(address auditorAddress) external view returns (
        string memory name,
        string memory role,
        bool active,
        uint256 approvedAt,
        uint256 validUntil
    ) {
        ApprovedAuditor storage a = approvedAuditors[auditorAddress];
        return (a.name, a.role, a.active, a.approvedAt, a.validUntil);
    }

    function getAuditorCredentials() external pure returns (
        string memory auditorName,
        string memory credential1,
        string memory credential2,
        string memory auditorRole
    ) {
        return (AUDITOR_NAME, AUDITOR_CREDENTIAL_1, AUDITOR_CREDENTIAL_2, AUDITOR_ROLE);
    }

    // ============ UCC-1 FILING NUMBER MANAGEMENT ============

    function recordUCC1FilingNumber(
        string calldata filingNumber,
        string calldata jurisdiction
    ) external onlyOwner {
        if (bytes(filingNumber).length == 0) revert FilingNumberRequired();
        if (ucc1FilingRecorded) revert UCC1AlreadyRecorded();

        ucc1FilingNumber = filingNumber;
        ucc1FilingJurisdiction = jurisdiction;
        ucc1FilingTimestamp = block.timestamp;
        ucc1FilingRecorded = true;

        emit UCC1FilingNumberRecorded(filingNumber, jurisdiction, block.timestamp);
    }

    function updateUCC1FilingNumber(
        string calldata newFilingNumber,
        string calldata jurisdiction
    ) external onlyOwner {
        if (bytes(newFilingNumber).length == 0) revert FilingNumberRequired();
        ucc1FilingNumber = newFilingNumber;
        ucc1FilingJurisdiction = jurisdiction;
        ucc1FilingTimestamp = block.timestamp;
        emit UCC1FilingNumberRecorded(newFilingNumber, jurisdiction, block.timestamp);
    }

    function getUCC1FilingInfo() external view returns (
        string memory filingNumber,
        string memory jurisdiction,
        uint256 filingTimestamp,
        bool recorded
    ) {
        return (ucc1FilingNumber, ucc1FilingJurisdiction, ucc1FilingTimestamp, ucc1FilingRecorded);
    }

    // ============ SAS/SOS REGISTRY FUNCTIONS ============

    function registerSAS(bytes32 contractHash) external onlyOwner {
        if (contractHash == bytes32(0)) revert InvalidContractHash();
        if (sasRegistered) revert SASAlreadyRegistered();

        sasContractHash = contractHash;
        sasRegistered = true;
        sasRegistrationTimestamp = block.timestamp;

        emit SASRegistered(contractHash, block.timestamp);
    }

    function registerSOS(bytes32 contractHash) external onlyOwner {
        if (contractHash == bytes32(0)) revert InvalidContractHash();
        if (sosRegistered) revert SOSAlreadyRegistered();

        sosContractHash = contractHash;
        sosRegistered = true;
        sosRegistrationTimestamp = block.timestamp;

        emit SOSRegistered(contractHash, block.timestamp);
    }

    function requestStoryRegistryEntry(
        string calldata serviceType,
        bytes32 contractHash
    ) external onlyOwner {
        if (bytes(serviceType).length == 0) revert ServiceTypeRequired();
        if (contractHash == bytes32(0)) revert InvalidContractHash();

        emit RegistryRequestSubmitted(serviceType, contractHash, msg.sender);
    }

    function getRegistryStatus() external view returns (
        bool sasIsRegistered,
        bytes32 sasHash,
        uint256 sasTimestamp,
        bool sosIsRegistered,
        bytes32 sosHash,
        uint256 sosTimestamp
    ) {
        return (
            sasRegistered, sasContractHash, sasRegistrationTimestamp,
            sosRegistered, sosContractHash, sosRegistrationTimestamp
        );
    }
}
