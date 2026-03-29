// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

// FLATTENED CONTRACT - For verification and e-signing package
// Original file: contracts/StoryAttestationBridge.sol
// OpenZeppelin Contracts v5.x - Dependencies listed but not inlined for verification clarity
// To compile: Install @openzeppelin/contracts and restore import statements
//
// OpenZeppelin Dependencies: Ownable

/**
 * @title StoryAttestationBridge
 * @author Millionaire Resilience LLC
 * @notice Bridge between UCC-1 filings and Story Protocol on-chain attestations
 * @dev Integrates Story Attestation Service for IP valuation and collateral certification
 * 
 * PURPOSE:
 * This contract bridges traditional UCC-1 financing statements with on-chain IP tokens,
 * creating a verifiable link between legal security interests and blockchain records.
 * 
 * STORY ATTESTATION SERVICE:
 * - Provides certified valuations recognized by Coinbase and institutional lenders
 * - Creates immutable attestation records linked to IP assets
 * - Enables automated verification for Morpho Blue and Centrifuge protocols
 */
contract StoryAttestationBridge is Ownable {
    
    // ============ CONSTANTS ============
    
    // Story Protocol Mainnet (Chain ID: 1514)
    uint256 public constant STORY_CHAIN_ID = 1514;
    
    // Millionaire Resilience IP Owner wallet
    address public constant MR_OWNER = 0x597856e93f19877a399f686D2F43b298e2268618;
    
    // ============ ATTESTATION TYPES ============
    
    bytes32 public constant ATT_IP_REGISTRATION = keccak256("IP_REGISTRATION");
    bytes32 public constant ATT_VALUATION = keccak256("VALUATION_CERTIFICATION");
    bytes32 public constant ATT_COLLATERAL = keccak256("COLLATERAL_PLEDGE");
    bytes32 public constant ATT_UCC1_BRIDGE = keccak256("UCC1_BRIDGE");
    bytes32 public constant ATT_LICENSE_COMPLIANCE = keccak256("LICENSE_COMPLIANCE");
    
    // ============ STRUCTS ============
    
    /**
     * @notice UCC-1 Filing record bridged to on-chain
     */
    struct UCC1Filing {
        bytes32 filingHash;          // Hash of the UCC-1 document
        address debtor;              // Debtor (borrower)
        address securedParty;        // Secured party (lender)
        string jurisdiction;         // Filing jurisdiction (e.g., "NM")
        string filingNumber;         // State filing number
        uint256 filingDate;          // Date of filing
        uint256 expirationDate;      // UCC-1 expires after 5 years
        address ipAssetId;           // Story Protocol IPID
        uint256 collateralValue;     // Certified collateral value in USD
        bytes32 attestationHash;     // Story Attestation hash
        bool isActive;               // Whether filing is active
    }
    
    /**
     * @notice Story Attestation record
     */
    struct Attestation {
        bytes32 id;
        bytes32 attestationType;
        address ipAssetId;
        uint256 tokenId;
        bytes32 dataHash;            // Hash of attestation data
        address attestor;            // Who created the attestation
        uint256 timestamp;
        uint256 validUntil;          // Expiration (0 = permanent)
        string metadataURI;          // IPFS URI for attestation metadata
        bool revoked;
    }
    
    /**
     * @notice Valuation certification
     */
    struct Valuation {
        bytes32 attestationId;
        address ipAssetId;
        uint256 presentValue;        // Current value in USD (18 decimals)
        uint256 projectedValue5Y;    // 5-year projection
        uint256 projectedValue10Y;   // 10-year projection
        string methodology;          // Valuation methodology
        address valuator;            // Certified valuator address
        uint256 valuationDate;
        uint256 validUntil;          // Valuation validity period
    }
    
    // ============ STATE VARIABLES ============
    
    uint256 public attestationCounter;
    uint256 public ucc1Counter;
    
    mapping(bytes32 => UCC1Filing) public ucc1Filings;
    mapping(bytes32 => Attestation) public attestations;
    mapping(address => Valuation) public valuations;           // IPID => Valuation
    mapping(address => bytes32[]) public ipAttestations;       // IPID => attestation IDs
    mapping(address => bool) public authorizedAttestors;
    mapping(address => bool) public authorizedValuators;
    
    // ============ EVENTS ============
    
    event UCC1FilingBridged(
        bytes32 indexed filingHash,
        address indexed debtor,
        address indexed securedParty,
        address ipAssetId,
        string jurisdiction
    );
    
    event AttestationCreated(
        bytes32 indexed attestationId,
        bytes32 indexed attestationType,
        address indexed ipAssetId,
        address attestor
    );
    
    event ValuationCertified(
        bytes32 indexed attestationId,
        address indexed ipAssetId,
        uint256 presentValue,
        address valuator
    );
    
    event AttestationRevoked(
        bytes32 indexed attestationId,
        address indexed revoker,
        string reason
    );
    
    // ============ MODIFIERS ============
    
    modifier onlyAuthorizedAttestor() {
        require(authorizedAttestors[msg.sender] || msg.sender == owner(), "Not authorized attestor");
        _;
    }
    
    modifier onlyAuthorizedValuator() {
        require(authorizedValuators[msg.sender] || msg.sender == owner(), "Not authorized valuator");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() Ownable(msg.sender) {
        authorizedAttestors[msg.sender] = true;
        authorizedValuators[msg.sender] = true;
    }
    
    // ============ UCC-1 BRIDGE FUNCTIONS ============
    
    /**
     * @notice Bridge a UCC-1 filing to Story Protocol
     * @dev Creates an on-chain record linking UCC-1 to IP assets
     */
    function bridgeUCC1Filing(
        bytes32 filingHash,
        address debtor,
        address securedParty,
        string calldata jurisdiction,
        string calldata filingNumber,
        address ipAssetId,
        uint256 collateralValue,
        string calldata metadataURI
    ) external onlyAuthorizedAttestor returns (bytes32 attestationId) {
        require(filingHash != bytes32(0), "Invalid filing hash");
        require(debtor != address(0), "Invalid debtor");
        require(securedParty != address(0), "Invalid secured party");
        require(ucc1Filings[filingHash].filingHash == bytes32(0), "Filing already bridged");
        
        ucc1Counter++;
        
        // Create attestation for UCC-1 bridge
        attestationId = _createAttestation(
            ATT_UCC1_BRIDGE,
            ipAssetId,
            0,
            filingHash,
            metadataURI
        );
        
        // Record UCC-1 filing
        UCC1Filing storage filing = ucc1Filings[filingHash];
        filing.filingHash = filingHash;
        filing.debtor = debtor;
        filing.securedParty = securedParty;
        filing.jurisdiction = jurisdiction;
        filing.filingNumber = filingNumber;
        filing.filingDate = block.timestamp;
        filing.expirationDate = block.timestamp + (5 * 365 days); // UCC-1 expires after 5 years
        filing.ipAssetId = ipAssetId;
        filing.collateralValue = collateralValue;
        filing.attestationHash = attestationId;
        filing.isActive = true;
        
        emit UCC1FilingBridged(filingHash, debtor, securedParty, ipAssetId, jurisdiction);
        
        return attestationId;
    }
    
    /**
     * @notice File a UCC-1 continuation to extend filing
     */
    function fileUCC1Continuation(
        bytes32 originalFilingHash,
        string calldata newFilingNumber
    ) external onlyAuthorizedAttestor {
        UCC1Filing storage filing = ucc1Filings[originalFilingHash];
        require(filing.isActive, "Filing not active");
        require(block.timestamp < filing.expirationDate, "Filing already expired");
        
        // Extend by 5 years
        filing.expirationDate = block.timestamp + (5 * 365 days);
        filing.filingNumber = newFilingNumber;
    }
    
    /**
     * @notice Terminate a UCC-1 filing (debt satisfied)
     */
    function terminateUCC1Filing(
        bytes32 filingHash
    ) external {
        UCC1Filing storage filing = ucc1Filings[filingHash];
        require(filing.isActive, "Filing not active");
        require(
            msg.sender == filing.securedParty || 
            msg.sender == owner() ||
            authorizedAttestors[msg.sender],
            "Not authorized"
        );
        
        filing.isActive = false;
    }
    
    // ============ ATTESTATION FUNCTIONS ============
    
    /**
     * @notice Create a new attestation
     */
    function _createAttestation(
        bytes32 attestationType,
        address ipAssetId,
        uint256 tokenId,
        bytes32 dataHash,
        string memory metadataURI
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
        att.metadataURI = metadataURI;
        att.revoked = false;
        
        ipAttestations[ipAssetId].push(attestationId);
        
        emit AttestationCreated(attestationId, attestationType, ipAssetId, msg.sender);
        
        return attestationId;
    }
    
    /**
     * @notice Create IP registration attestation
     */
    function attestIPRegistration(
        address ipAssetId,
        uint256 tokenId,
        bytes32 registrationHash,
        string calldata metadataURI
    ) external onlyAuthorizedAttestor returns (bytes32) {
        return _createAttestation(
            ATT_IP_REGISTRATION,
            ipAssetId,
            tokenId,
            registrationHash,
            metadataURI
        );
    }
    
    /**
     * @notice Create collateral pledge attestation
     */
    function attestCollateralPledge(
        address ipAssetId,
        address lender,
        uint256 loanAmount,
        string calldata metadataURI
    ) external onlyAuthorizedAttestor returns (bytes32) {
        bytes32 pledgeHash = keccak256(abi.encodePacked(
            ipAssetId,
            lender,
            loanAmount,
            block.timestamp
        ));
        
        return _createAttestation(
            ATT_COLLATERAL,
            ipAssetId,
            0,
            pledgeHash,
            metadataURI
        );
    }
    
    /**
     * @notice Revoke an attestation
     */
    function revokeAttestation(
        bytes32 attestationId,
        string calldata reason
    ) external {
        Attestation storage att = attestations[attestationId];
        require(att.id != bytes32(0), "Attestation not found");
        require(
            msg.sender == att.attestor || 
            msg.sender == owner(),
            "Not authorized"
        );
        require(!att.revoked, "Already revoked");
        
        att.revoked = true;
        
        emit AttestationRevoked(attestationId, msg.sender, reason);
    }
    
    // ============ VALUATION FUNCTIONS ============
    
    /**
     * @notice Certify IP valuation via Story Attestation Service
     * @dev Creates a certified valuation recognized by institutional lenders
     */
    function certifyValuation(
        address ipAssetId,
        uint256 presentValue,
        uint256 projectedValue5Y,
        uint256 projectedValue10Y,
        string calldata methodology,
        uint256 validityDays,
        string calldata metadataURI
    ) external onlyAuthorizedValuator returns (bytes32 attestationId) {
        require(presentValue > 0, "Invalid present value");
        require(projectedValue5Y >= presentValue, "5Y projection invalid");
        require(projectedValue10Y >= projectedValue5Y, "10Y projection invalid");
        
        // Create valuation data hash
        bytes32 valuationHash = keccak256(abi.encodePacked(
            ipAssetId,
            presentValue,
            projectedValue5Y,
            projectedValue10Y,
            methodology,
            block.timestamp
        ));
        
        // Create attestation
        attestationId = _createAttestation(
            ATT_VALUATION,
            ipAssetId,
            0,
            valuationHash,
            metadataURI
        );
        
        // Set validity period
        attestations[attestationId].validUntil = block.timestamp + (validityDays * 1 days);
        
        // Store valuation
        Valuation storage val = valuations[ipAssetId];
        val.attestationId = attestationId;
        val.ipAssetId = ipAssetId;
        val.presentValue = presentValue;
        val.projectedValue5Y = projectedValue5Y;
        val.projectedValue10Y = projectedValue10Y;
        val.methodology = methodology;
        val.valuator = msg.sender;
        val.valuationDate = block.timestamp;
        val.validUntil = block.timestamp + (validityDays * 1 days);
        
        emit ValuationCertified(attestationId, ipAssetId, presentValue, msg.sender);
        
        return attestationId;
    }
    
    /**
     * @notice Get current certified valuation for IP
     */
    function getValuation(
        address ipAssetId
    ) external view returns (
        uint256 presentValue,
        uint256 projectedValue5Y,
        uint256 projectedValue10Y,
        bool isValid,
        uint256 validUntil
    ) {
        Valuation storage val = valuations[ipAssetId];
        isValid = val.validUntil > block.timestamp;
        
        return (
            val.presentValue,
            val.projectedValue5Y,
            val.projectedValue10Y,
            isValid,
            val.validUntil
        );
    }
    
    /**
     * @notice Verify valuation is valid for lending
     */
    function verifyValuationForLending(
        address ipAssetId,
        uint256 requestedLoanAmount,
        uint256 maxLTV
    ) external view returns (
        bool approved,
        uint256 maxLoanAmount,
        string memory reason
    ) {
        Valuation storage val = valuations[ipAssetId];
        
        // Check valuation exists
        if (val.attestationId == bytes32(0)) {
            return (false, 0, "No valuation certified");
        }
        
        // Check valuation validity
        if (val.validUntil < block.timestamp) {
            return (false, 0, "Valuation expired");
        }
        
        // Check attestation not revoked
        if (attestations[val.attestationId].revoked) {
            return (false, 0, "Valuation attestation revoked");
        }
        
        // Calculate max loan amount
        maxLoanAmount = (val.presentValue * maxLTV) / 10000;
        
        if (requestedLoanAmount > maxLoanAmount) {
            return (false, maxLoanAmount, "Loan exceeds LTV limit");
        }
        
        return (true, maxLoanAmount, "Approved");
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get UCC-1 filing status
     */
    function getUCC1Filing(
        bytes32 filingHash
    ) external view returns (UCC1Filing memory) {
        return ucc1Filings[filingHash];
    }
    
    /**
     * @notice Get attestation details
     */
    function getAttestation(
        bytes32 attestationId
    ) external view returns (Attestation memory) {
        return attestations[attestationId];
    }
    
    /**
     * @notice Get all attestations for an IP
     */
    function getIPAttestations(
        address ipAssetId
    ) external view returns (bytes32[] memory) {
        return ipAttestations[ipAssetId];
    }
    
    /**
     * @notice Verify UCC-1 filing is active
     */
    function verifyUCC1Active(
        bytes32 filingHash
    ) external view returns (bool isActive, uint256 expirationDate) {
        UCC1Filing storage filing = ucc1Filings[filingHash];
        isActive = filing.isActive && filing.expirationDate > block.timestamp;
        return (isActive, filing.expirationDate);
    }
    
    /**
     * @notice Get Millionaire Resilience IP owner info
     */
    function getMillionaireResilienceInfo() external pure returns (
        address owner,
        uint256 chainId
    ) {
        return (MR_OWNER, STORY_CHAIN_ID);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Add authorized attestor
     */
    function addAttestor(address attestor) external onlyOwner {
        authorizedAttestors[attestor] = true;
    }
    
    /**
     * @notice Remove authorized attestor
     */
    function removeAttestor(address attestor) external onlyOwner {
        authorizedAttestors[attestor] = false;
    }
    
    /**
     * @notice Add authorized valuator
     */
    function addValuator(address valuator) external onlyOwner {
        authorizedValuators[valuator] = true;
    }
    
    /**
     * @notice Remove authorized valuator
     */
    function removeValuator(address valuator) external onlyOwner {
        authorizedValuators[valuator] = false;
    }
}
