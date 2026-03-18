// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// FLATTENED CONTRACT - For verification and e-signing package
// Original file: contracts/StoryOrchestrationService.sol
// OpenZeppelin Contracts v5.x - Dependencies listed but not inlined for verification clarity
// To compile: Install @openzeppelin/contracts and restore import statements
//
// OpenZeppelin Dependencies: Ownable, ReentrancyGuard

/**
 * @title StoryOrchestrationService
 * @author Gladiator Holdings LLC
 * @notice Orchestrates the hermetic seal between UCC-1 filings, Story Protocol,
 *         Morpho Protocol, and StoryScan.io verification
 * @dev Bridges StoryAttestationService attestations into the complete
 *      on-chain verification pipeline for IP-backed DeFi lending
 *
 * HERMETIC SEAL PIPELINE:
 * ┌─────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────────┐    ┌──────────────┐
 * │ NM SOS UCC-1    │ →  │ StoryAttestationService  │ →  │ StoryOrchestrationService    │ →  │ StoryScan.io │
 * │ Filing          │    │ (7 attestation types)     │    │ (Pipeline orchestration)     │    │ Verification │
 * └─────────────────┘    └──────────────────────────┘    └──────────────────────────────┘    └──────────────┘
 *
 * ORCHESTRATED FLOWS:
 * 1. UCC-1 → Story Attestation → PIL License Binding → Morpho Collateral Report
 * 2. PIL Revenue Collection → Story Royalty Module → Loan Repayment Routing
 * 3. Default Detection → PIL Acceleration → Morpho Liquidation → SLAPS IP Transfer
 * 4. SPV Segregation Verification → Protected/At-Risk Classification → StoryScan Registry
 *
 * MORPHO PROTOCOL INTEGRATION:
 * - Loan 1: $5M USDC (BTC collateral, 4% APR via Morpho Blue)
 * - Loan 2: $1M USDC (ETH collateral, 6% APR via Morpho Blue)
 * - Morpho Blue: 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb
 * - LLTV: 86% for both markets
 *
 * STORY PROTOCOL INTEGRATION:
 * - Registry: 0x1a9d0d28a0422F26D31Be72Edc6f13ea4371E11B
 * - Licensing: 0xd81fd78f557b457b4350cB95D20b547bFEb4D857
 * - Royalty: 0xCC8b9f0c9Dc370Ed1F41d95F74C9f72E08f24C90
 * - Parent IPID: 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE (Token 15192)
 */
contract StoryOrchestrationService is Ownable, ReentrancyGuard {

    // ============ PROTOCOL ADDRESSES ============

    address public constant MORPHO_BLUE = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;
    address public constant STORY_REGISTRY = 0x1a9d0d28a0422F26D31Be72Edc6f13ea4371E11B;
    address public constant STORY_LICENSING = 0xd81fd78f557b457b4350cB95D20b547bFEb4D857;
    address public constant STORY_ROYALTY = 0xCC8b9f0c9Dc370Ed1F41d95F74C9f72E08f24C90;

    address public constant MR_IPID = 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE;
    uint256 public constant MR_TOKEN_ID = 15192;
    address public constant COINBASE_WALLET = 0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a;
    address public constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // ============ PIL LICENSE TYPES ============

    uint256 public constant PIL_PER_ROYALTY_BPS = 100;
    uint256 public constant PIL_COM_ROYALTY_BPS = 500;
    uint256 public constant PIL_ENT_ROYALTY_BPS = 1200;

    uint256 public constant PIL_PER_ANNUAL_REVENUE = 800_000 * 1e6;
    uint256 public constant PIL_COM_ANNUAL_REVENUE = 3_500_000 * 1e6;
    uint256 public constant PIL_ENT_ANNUAL_REVENUE = 8_000_000 * 1e6;
    uint256 public constant TOTAL_ANNUAL_PIL_REVENUE = 12_300_000 * 1e6;

    // ============ MORPHO LOAN PARAMETERS ============

    uint256 public constant BTC_LOAN_PRINCIPAL = 5_000_000 * 1e6;
    uint256 public constant ETH_LOAN_PRINCIPAL = 1_000_000 * 1e6;
    uint256 public constant TOTAL_LOAN_PRINCIPAL = 6_000_000 * 1e6;
    uint256 public constant BTC_LOAN_APR_BPS = 400;
    uint256 public constant ETH_LOAN_APR_BPS = 600;
    uint256 public constant MORPHO_LLTV = 860000000000000000;

    // ============ ENUMS ============

    enum PipelineStage {
        NOT_STARTED,
        UCC1_FILED,
        ATTESTATIONS_CREATED,
        PIL_BOUND,
        MORPHO_CONFIGURED,
        REVENUE_ROUTING_ACTIVE,
        HERMETIC_SEAL_COMPLETE,
        STORYSCAN_VERIFIED
    }

    enum DefaultStage {
        NO_DEFAULT,
        PIL_REVENUE_ACCELERATED,
        MORPHO_LIQUIDATION_INITIATED,
        SLAPS_IP_TRANSFER_PENDING,
        SLAPS_IP_TRANSFERRED,
        DEFICIENCY_JUDGMENT
    }

    // ============ STRUCTS ============

    struct HermeticSealPipeline {
        bytes32 pipelineId;
        PipelineStage stage;
        bytes32 ucc1FilingHash;
        bytes32 ucc1AttestationId;
        bytes32 corporateAttestationId;
        bytes32 valuationAttestationId;
        bytes32 morphoBtcAttestationId;
        bytes32 morphoEthAttestationId;
        bytes32 spvSegregationAttestationId;
        bytes32 revenueEscrowAttestationId;
        bytes32 loanCollateralAttestationId;
        uint256 createdAt;
        uint256 completedAt;
        string storyScanRegistryUrl;
        bool isSealed;
    }

    struct PILRevenueRoute {
        address sourceIpId;
        address paymentDestination;
        uint256 allocationPercentage;
        uint256 totalCollected;
        uint256 totalRouted;
        uint256 lastCollectionTimestamp;
        bool active;
    }

    struct MorphoLoanPosition {
        bytes32 marketId;
        address loanToken;
        address collateralToken;
        uint256 principal;
        uint256 collateralAmount;
        uint256 interestRate;
        uint256 originationDate;
        uint256 totalRepaid;
        uint256 outstandingBalance;
        bool active;
        DefaultStage defaultStatus;
    }

    struct DefaultCascade {
        uint256 loanId;
        DefaultStage stage;
        uint256 pilRevenueAccelerated;
        uint256 morphoCollateralLiquidated;
        bool slapsIPTransferred;
        uint256 deficiencyAmount;
        uint256 initiatedAt;
        uint256 completedAt;
    }

    struct StoryScanEntry {
        bytes32 pipelineId;
        string entityName;
        string entityId;
        string riskStatus;
        address ipAssetId;
        uint256 portfolioValue;
        bytes32[] attestationIds;
        uint256 registeredAt;
        bool verified;
    }

    // ============ STATE VARIABLES ============

    uint256 public pipelineCounter;
    uint256 public defaultCascadeCounter;

    HermeticSealPipeline public activePipeline;
    mapping(bytes32 => HermeticSealPipeline) public pipelines;
    mapping(address => PILRevenueRoute) public revenueRoutes;
    mapping(bytes32 => MorphoLoanPosition) public morphoPositions;
    mapping(uint256 => DefaultCascade) public defaultCascades;
    mapping(string => StoryScanEntry) public storyScanRegistry;

    address public attestationServiceAddress;
    address public spvLoanContractAddress;

    // ============ EVENTS ============

    event PipelineCreated(
        bytes32 indexed pipelineId,
        bytes32 indexed ucc1FilingHash,
        PipelineStage stage
    );

    event PipelineAdvanced(
        bytes32 indexed pipelineId,
        PipelineStage fromStage,
        PipelineStage toStage
    );

    event HermeticSealCompleted(
        bytes32 indexed pipelineId,
        uint256 totalAttestations,
        uint256 timestamp
    );

    event PILRevenueRouted(
        address indexed sourceIpId,
        address indexed destination,
        uint256 amount,
        uint256 totalRouted
    );

    event MorphoPositionCreated(
        bytes32 indexed marketId,
        uint256 principal,
        uint256 collateralAmount,
        uint256 interestRate
    );

    event DefaultCascadeInitiated(
        uint256 indexed cascadeId,
        DefaultStage stage,
        uint256 outstandingBalance
    );

    event DefaultCascadeAdvanced(
        uint256 indexed cascadeId,
        DefaultStage fromStage,
        DefaultStage toStage
    );

    event StoryScanRegistered(
        bytes32 indexed pipelineId,
        string entityName,
        string riskStatus,
        address ipAssetId
    );

    // ============ MODIFIERS ============

    modifier onlyAuthorized() {
        require(
            msg.sender == owner() ||
            msg.sender == attestationServiceAddress ||
            msg.sender == spvLoanContractAddress,
            "Not authorized"
        );
        _;
    }

    modifier pipelineAtStage(PipelineStage requiredStage) {
        require(activePipeline.stage == requiredStage, "Pipeline not at required stage");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor() Ownable(msg.sender) {
        attestationServiceAddress = address(0);
        spvLoanContractAddress = address(0);
    }

    function setAttestationServiceAddress(address _attestationService) external onlyOwner {
        require(_attestationService != address(0), "Invalid address");
        attestationServiceAddress = _attestationService;
    }

    function setSpvLoanContractAddress(address _spvLoanContract) external onlyOwner {
        require(_spvLoanContract != address(0), "Invalid address");
        spvLoanContractAddress = _spvLoanContract;
    }

    // ============ PIPELINE ORCHESTRATION ============

    function initiatePipeline(
        bytes32 ucc1FilingHash
    ) external onlyAuthorized returns (bytes32 pipelineId) {
        require(ucc1FilingHash != bytes32(0), "Invalid UCC-1 filing hash");

        pipelineCounter++;
        pipelineId = keccak256(abi.encodePacked(
            "HERMETIC_SEAL",
            ucc1FilingHash,
            block.timestamp,
            pipelineCounter
        ));

        HermeticSealPipeline storage pipeline = pipelines[pipelineId];
        pipeline.pipelineId = pipelineId;
        pipeline.stage = PipelineStage.UCC1_FILED;
        pipeline.ucc1FilingHash = ucc1FilingHash;
        pipeline.createdAt = block.timestamp;
        pipeline.isSealed = false;

        activePipeline = pipeline;

        emit PipelineCreated(pipelineId, ucc1FilingHash, PipelineStage.UCC1_FILED);

        return pipelineId;
    }

    function recordAttestations(
        bytes32 pipelineId,
        bytes32 ucc1AttestationId,
        bytes32 corporateAttestationId,
        bytes32 valuationAttestationId,
        bytes32 morphoBtcAttestationId,
        bytes32 morphoEthAttestationId,
        bytes32 spvSegregationAttestationId,
        bytes32 revenueEscrowAttestationId,
        bytes32 loanCollateralAttestationId
    ) external onlyAuthorized {
        HermeticSealPipeline storage pipeline = pipelines[pipelineId];
        require(pipeline.stage == PipelineStage.UCC1_FILED, "Must be at UCC1_FILED stage");

        pipeline.ucc1AttestationId = ucc1AttestationId;
        pipeline.corporateAttestationId = corporateAttestationId;
        pipeline.valuationAttestationId = valuationAttestationId;
        pipeline.morphoBtcAttestationId = morphoBtcAttestationId;
        pipeline.morphoEthAttestationId = morphoEthAttestationId;
        pipeline.spvSegregationAttestationId = spvSegregationAttestationId;
        pipeline.revenueEscrowAttestationId = revenueEscrowAttestationId;
        pipeline.loanCollateralAttestationId = loanCollateralAttestationId;

        PipelineStage oldStage = pipeline.stage;
        pipeline.stage = PipelineStage.ATTESTATIONS_CREATED;
        activePipeline = pipeline;

        emit PipelineAdvanced(pipelineId, oldStage, PipelineStage.ATTESTATIONS_CREATED);
    }

    function bindPILLicenses(
        bytes32 pipelineId
    ) external onlyAuthorized {
        HermeticSealPipeline storage pipeline = pipelines[pipelineId];
        require(pipeline.stage == PipelineStage.ATTESTATIONS_CREATED, "Must be at ATTESTATIONS_CREATED");

        PipelineStage oldStage = pipeline.stage;
        pipeline.stage = PipelineStage.PIL_BOUND;
        activePipeline = pipeline;

        emit PipelineAdvanced(pipelineId, oldStage, PipelineStage.PIL_BOUND);
    }

    function configureMorphoPositions(
        bytes32 pipelineId,
        bytes32 btcMarketId,
        bytes32 ethMarketId
    ) external onlyAuthorized {
        HermeticSealPipeline storage pipeline = pipelines[pipelineId];
        require(pipeline.stage == PipelineStage.PIL_BOUND, "Must be at PIL_BOUND");

        morphoPositions[btcMarketId] = MorphoLoanPosition({
            marketId: btcMarketId,
            loanToken: BASE_USDC,
            collateralToken: address(0),
            principal: BTC_LOAN_PRINCIPAL,
            collateralAmount: 0,
            interestRate: BTC_LOAN_APR_BPS,
            originationDate: block.timestamp,
            totalRepaid: 0,
            outstandingBalance: BTC_LOAN_PRINCIPAL,
            active: true,
            defaultStatus: DefaultStage.NO_DEFAULT
        });

        morphoPositions[ethMarketId] = MorphoLoanPosition({
            marketId: ethMarketId,
            loanToken: BASE_USDC,
            collateralToken: address(0),
            principal: ETH_LOAN_PRINCIPAL,
            collateralAmount: 0,
            interestRate: ETH_LOAN_APR_BPS,
            originationDate: block.timestamp,
            totalRepaid: 0,
            outstandingBalance: ETH_LOAN_PRINCIPAL,
            active: true,
            defaultStatus: DefaultStage.NO_DEFAULT
        });

        PipelineStage oldStage = pipeline.stage;
        pipeline.stage = PipelineStage.MORPHO_CONFIGURED;
        activePipeline = pipeline;

        emit MorphoPositionCreated(btcMarketId, BTC_LOAN_PRINCIPAL, 0, BTC_LOAN_APR_BPS);
        emit MorphoPositionCreated(ethMarketId, ETH_LOAN_PRINCIPAL, 0, ETH_LOAN_APR_BPS);
        emit PipelineAdvanced(pipelineId, oldStage, PipelineStage.MORPHO_CONFIGURED);
    }

    function activateRevenueRouting(
        bytes32 pipelineId,
        address sourceIpId
    ) external onlyAuthorized {
        HermeticSealPipeline storage pipeline = pipelines[pipelineId];
        require(pipeline.stage == PipelineStage.MORPHO_CONFIGURED, "Must be at MORPHO_CONFIGURED");

        revenueRoutes[sourceIpId] = PILRevenueRoute({
            sourceIpId: sourceIpId,
            paymentDestination: COINBASE_WALLET,
            allocationPercentage: 100,
            totalCollected: 0,
            totalRouted: 0,
            lastCollectionTimestamp: block.timestamp,
            active: true
        });

        PipelineStage oldStage = pipeline.stage;
        pipeline.stage = PipelineStage.REVENUE_ROUTING_ACTIVE;
        activePipeline = pipeline;

        emit PipelineAdvanced(pipelineId, oldStage, PipelineStage.REVENUE_ROUTING_ACTIVE);
    }

    function completeSeal(
        bytes32 pipelineId
    ) external onlyAuthorized {
        HermeticSealPipeline storage pipeline = pipelines[pipelineId];
        require(pipeline.stage == PipelineStage.REVENUE_ROUTING_ACTIVE, "Must be at REVENUE_ROUTING_ACTIVE");

        PipelineStage oldStage = pipeline.stage;
        pipeline.stage = PipelineStage.HERMETIC_SEAL_COMPLETE;
        pipeline.completedAt = block.timestamp;
        pipeline.isSealed = true;
        activePipeline = pipeline;

        emit PipelineAdvanced(pipelineId, oldStage, PipelineStage.HERMETIC_SEAL_COMPLETE);
        emit HermeticSealCompleted(pipelineId, 7, block.timestamp);
    }

    // ============ PIL REVENUE ROUTING ============

    function recordPILRevenueCollection(
        address sourceIpId,
        uint256 amount
    ) external onlyAuthorized {
        PILRevenueRoute storage route = revenueRoutes[sourceIpId];
        require(route.active, "Revenue route not active");

        route.totalCollected += amount;
        route.lastCollectionTimestamp = block.timestamp;
    }

    function routePILRevenueToLoan(
        address sourceIpId,
        bytes32 morphoMarketId,
        uint256 amount
    ) external onlyAuthorized nonReentrant {
        PILRevenueRoute storage route = revenueRoutes[sourceIpId];
        require(route.active, "Revenue route not active");
        require(route.totalCollected >= route.totalRouted + amount, "Insufficient collected revenue");

        MorphoLoanPosition storage position = morphoPositions[morphoMarketId];
        require(position.active, "Morpho position not active");

        route.totalRouted += amount;
        position.totalRepaid += amount;

        if (position.totalRepaid >= position.principal) {
            position.outstandingBalance = 0;
            position.active = false;
        } else {
            position.outstandingBalance = position.principal - position.totalRepaid;
        }

        emit PILRevenueRouted(sourceIpId, route.paymentDestination, amount, route.totalRouted);
    }

    // ============ DEFAULT CASCADE ============

    function initiateDefaultCascade(
        bytes32 morphoMarketId
    ) external onlyAuthorized returns (uint256 cascadeId) {
        MorphoLoanPosition storage position = morphoPositions[morphoMarketId];
        require(position.active, "Position not active");
        require(position.outstandingBalance > 0, "No outstanding balance");

        defaultCascadeCounter++;
        cascadeId = defaultCascadeCounter;

        DefaultCascade storage cascade = defaultCascades[cascadeId];
        cascade.loanId = cascadeId;
        cascade.stage = DefaultStage.PIL_REVENUE_ACCELERATED;
        cascade.initiatedAt = block.timestamp;

        position.defaultStatus = DefaultStage.PIL_REVENUE_ACCELERATED;

        emit DefaultCascadeInitiated(cascadeId, DefaultStage.PIL_REVENUE_ACCELERATED, position.outstandingBalance);

        return cascadeId;
    }

    function advanceDefaultCascade(
        uint256 cascadeId,
        DefaultStage newStage
    ) external onlyAuthorized {
        DefaultCascade storage cascade = defaultCascades[cascadeId];
        require(cascade.initiatedAt > 0, "Cascade not found");
        require(uint256(newStage) > uint256(cascade.stage), "Can only advance forward");

        DefaultStage oldStage = cascade.stage;
        cascade.stage = newStage;

        if (newStage == DefaultStage.SLAPS_IP_TRANSFERRED || newStage == DefaultStage.DEFICIENCY_JUDGMENT) {
            cascade.completedAt = block.timestamp;
        }

        if (newStage == DefaultStage.SLAPS_IP_TRANSFERRED) {
            cascade.slapsIPTransferred = true;
        }

        emit DefaultCascadeAdvanced(cascadeId, oldStage, newStage);
    }

    // ============ STORYSCAN REGISTRY ============

    function registerOnStoryScan(
        bytes32 pipelineId,
        string calldata entityName,
        string calldata entityId,
        string calldata riskStatus,
        address ipAssetId,
        uint256 portfolioValue,
        bytes32[] calldata attestationIds
    ) external onlyAuthorized {
        HermeticSealPipeline storage pipeline = pipelines[pipelineId];
        require(pipeline.isSealed, "Pipeline not sealed");

        StoryScanEntry storage entry = storyScanRegistry[entityName];
        entry.pipelineId = pipelineId;
        entry.entityName = entityName;
        entry.entityId = entityId;
        entry.riskStatus = riskStatus;
        entry.ipAssetId = ipAssetId;
        entry.portfolioValue = portfolioValue;
        entry.attestationIds = attestationIds;
        entry.registeredAt = block.timestamp;
        entry.verified = true;

        PipelineStage oldStage = pipeline.stage;
        pipeline.stage = PipelineStage.STORYSCAN_VERIFIED;
        activePipeline = pipeline;

        emit StoryScanRegistered(pipelineId, entityName, riskStatus, ipAssetId);
        emit PipelineAdvanced(pipelineId, oldStage, PipelineStage.STORYSCAN_VERIFIED);
    }

    // ============ VIEW FUNCTIONS ============

    function getPipelineStatus(bytes32 pipelineId) external view returns (
        PipelineStage stage,
        bool isSealed,
        uint256 createdAt,
        uint256 completedAt,
        bytes32 ucc1FilingHash
    ) {
        HermeticSealPipeline storage p = pipelines[pipelineId];
        return (p.stage, p.isSealed, p.createdAt, p.completedAt, p.ucc1FilingHash);
    }

    function getActivePipelineStage() external view returns (PipelineStage) {
        return activePipeline.stage;
    }

    function getMorphoPosition(bytes32 marketId) external view returns (MorphoLoanPosition memory) {
        return morphoPositions[marketId];
    }

    function getRevenueRoute(address ipId) external view returns (PILRevenueRoute memory) {
        return revenueRoutes[ipId];
    }

    function getDefaultCascade(uint256 cascadeId) external view returns (DefaultCascade memory) {
        return defaultCascades[cascadeId];
    }

    function getStoryScanEntry(string calldata entityName) external view returns (StoryScanEntry memory) {
        return storyScanRegistry[entityName];
    }

    function getProjectedPayoffMonths() external pure returns (
        uint256 btcLoanMonths,
        uint256 ethLoanMonths,
        uint256 combinedMonths,
        uint256 totalAnnualRevenue,
        uint256 monthlyRevenue
    ) {
        uint256 monthlyPIL = TOTAL_ANNUAL_PIL_REVENUE / 12;
        uint256 btcMonthlyPayment = 217_000 * 1e6;
        uint256 ethMonthlyPayment = 58_000 * 1e6;
        uint256 combinedMonthly = btcMonthlyPayment + ethMonthlyPayment;
        uint256 surplusMonthly = monthlyPIL - combinedMonthly;

        btcLoanMonths = surplusMonthly > 0 ? BTC_LOAN_PRINCIPAL / (monthlyPIL * 5 / 6) + 1 : 24;
        ethLoanMonths = surplusMonthly > 0 ? ETH_LOAN_PRINCIPAL / (monthlyPIL / 6) + 1 : 18;
        combinedMonths = surplusMonthly > 0 ? TOTAL_LOAN_PRINCIPAL / monthlyPIL + 1 : 24;

        return (btcLoanMonths, ethLoanMonths, combinedMonths, TOTAL_ANNUAL_PIL_REVENUE, monthlyPIL);
    }

    function getLoanSummary() external pure returns (
        uint256 btcPrincipal,
        uint256 btcAPR,
        uint256 ethPrincipal,
        uint256 ethAPR,
        uint256 totalPrincipal,
        uint256 lltv,
        uint256 annualPILRevenue
    ) {
        return (
            BTC_LOAN_PRINCIPAL,
            BTC_LOAN_APR_BPS,
            ETH_LOAN_PRINCIPAL,
            ETH_LOAN_APR_BPS,
            TOTAL_LOAN_PRINCIPAL,
            MORPHO_LLTV,
            TOTAL_ANNUAL_PIL_REVENUE
        );
    }

    // ============ ADMIN ============

    function setAttestationService(address _service) external onlyOwner {
        attestationServiceAddress = _service;
    }

    function setSPVLoanContract(address _contract) external onlyOwner {
        spvLoanContractAddress = _contract;
    }
}
