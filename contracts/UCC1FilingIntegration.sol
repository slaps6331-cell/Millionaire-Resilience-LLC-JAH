// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UCC1FilingIntegration
 * @author Gladiator Holdings LLC
 * @notice On-chain recording of the New Mexico SOS UCC-1 Financing Statement
 *         that perfects the security interest in the smart contract collateral.
 *
 * FILING DETAILS (New Mexico Secretary of State):
 *   File #:    20260000078753
 *   Filed:     2026-03-26
 *   Debtors:   Slaps Streaming LLC  |  Clifton Kelly Bell
 *   Secured:   Morpho Protocol (251 Little Falls Drive, Wilmington, DE 19807)
 *   Collateral: Collateral uploaded in attachment (blockchain smart contracts,
 *               digital IP, and associated IPFS artifacts)
 *   Designation: Public-Finance Transaction
 *
 * PINATA IPFS DOCUMENT REFERENCES (Optional Filer Reference Data):
 *   Gateway:   https://lavender-neat-urial-76.mypinata.cloud/ipfs/
 *   Token:     2sNDwplwFPMa4DlVD_TFnHh2dcXM2UunGR5Ts7abPjjmb2q-5GZzfjfJMK2u9x-V
 *   CIDs:
 *     [1] bafybeidkp74w2idrwkg2qey66uepfaes5ekonxjqt62uztyxawii7yye7y  (auxiliary docs)
 *     [2] bafkreiacs7ir36sfzaxqb4qp4gpzx26ckrb6ogcbgcfj4ontow263x7fom  (bytecode archive)
 *     [3] bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a  (UCC-1 filing record)
 *     [4] bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu  (UCC-1 financing statement)
 *     [5] bafkreie5spkgxxhmafdqylwyfplx37jqhcjrs3es3neasgcnynzgkg5mzi  (beneficial owner ID)
 *     [6] bafkreibxqnmhir5iifpboxdv5ndltm5vnbplso4ndtcuzfnanykudrwdbu  (patent portfolio)
 */
contract UCC1FilingIntegration is Ownable, ReentrancyGuard {

    // ============ UCC-1 FILING CONSTANTS (New Mexico SOS) ============

    string public constant FILING_NUMBER    = "20260000078753";
    string public constant FILING_DATE      = "2026-03-26";
    string public constant FILING_STATE     = "NEW_MEXICO";
    string public constant JURISDICTION     = "New Mexico Secretary of State";
    string public constant DESIGNATION      = "Public-Finance Transaction";

    // Debtors
    string public constant DEBTOR_1_NAME    = "Slaps Streaming LLC";
    string public constant DEBTOR_2_NAME    = "Clifton Kelly Bell";

    // Secured party
    string public constant SECURED_PARTY    = "Morpho Protocol";
    string public constant SECURED_ADDRESS  = "251 Little Falls Drive, Wilmington, DE 19807";

    // Pinata IPFS gateway (Optional Filer Reference Data)
    string public constant PINATA_GATEWAY              = "lavender-neat-urial-76.mypinata.cloud";
    // Original UCC-1 filing record pinned at NM SOS filing time
    string public constant UCC1_IPFS_CID               = "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a";
    // UCC-1 Financing Statement document (Pinata IPFS pin)
    string public constant UCC1_FINANCING_STATEMENT_CID = "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu";

    // ============ COLLATERAL NETWORKS ============

    uint256 public constant STORY_CHAIN_ID  = 1514;
    uint256 public constant BASE_CHAIN_ID   = 8453;

    // ============ STORAGE ============

    struct UCC1Filing {
        string state;
        string filingNumber;
        string filingDate;
        string debtor;
        string securedParty;
        string collateralType;
        bytes32[] hermeticSealTiers;
        string ipfsCID;
        uint256 recordedAt;
        bool isActive;
    }

    struct CollateralContract {
        string contractName;
        address contractAddress;
        uint256 chainId;
        bytes32 bytecodeHash;
        bytes32 abiHash;
        bool registered;
    }

    mapping(bytes32 => UCC1Filing)       public ucc1Filings;
    mapping(bytes32 => CollateralContract) public collateralContracts;

    bytes32 public primaryFilingHash;
    bool    public primaryFilingRecorded;

    // ============ EVENTS ============

    event UCC1FilingRecorded(
        bytes32 indexed filingHash,
        string          filingNumber,
        string          ipfsCID,
        uint256         timestamp
    );

    event CollateralContractRegistered(
        bytes32 indexed contractKey,
        string          contractName,
        address         contractAddress,
        uint256         chainId
    );

    event HermeticSealUpdated(
        bytes32 indexed filingHash,
        uint256         tierCount,
        uint256         timestamp
    );

    // ============ ERRORS ============

    error FilingAlreadyRecorded(bytes32 filingHash);
    error FilingNotFound(bytes32 filingHash);
    error InvalidFilingNumber();

    // ============ CONSTRUCTOR ============

    constructor() Ownable(msg.sender) {}

    // ============ EXTERNAL FUNCTIONS ============

    /**
     * @notice Record the official NM SOS UCC-1 filing on-chain using the
     *         filing constants embedded in this contract.
     * @param _hermeticSealTiers Array of hermetic seal tier hashes (tiers 1-7).
     * @return filingHash The keccak256 key used to retrieve this filing record.
     */
    function recordPrimaryFiling(
        bytes32[] calldata _hermeticSealTiers
    ) external onlyOwner nonReentrant returns (bytes32 filingHash) {
        filingHash = keccak256(
            abi.encodePacked(FILING_STATE, FILING_NUMBER, DEBTOR_1_NAME, FILING_DATE)
        );

        if (ucc1Filings[filingHash].isActive) {
            revert FilingAlreadyRecorded(filingHash);
        }

        ucc1Filings[filingHash] = UCC1Filing({
            state:            FILING_STATE,
            filingNumber:     FILING_NUMBER,
            filingDate:       FILING_DATE,
            debtor:           DEBTOR_1_NAME,
            securedParty:     SECURED_PARTY,
            collateralType:   "BLOCKCHAIN_SMART_CONTRACTS",
            hermeticSealTiers: _hermeticSealTiers,
            ipfsCID:          UCC1_IPFS_CID,
            recordedAt:       block.timestamp,
            isActive:         true
        });

        primaryFilingHash     = filingHash;
        primaryFilingRecorded = true;

        emit UCC1FilingRecorded(filingHash, FILING_NUMBER, UCC1_IPFS_CID, block.timestamp);
    }

    /**
     * @notice Register a deployed smart contract as UCC-1 collateral.
     * @param _contractName  Human-readable name (e.g. "AngelCoin").
     * @param _contractAddr  Deployed address of the contract.
     * @param _chainId       Chain ID where the contract is deployed.
     * @param _bytecodeHash  keccak256 of the contract bytecode.
     * @param _abiHash       keccak256 of the contract ABI JSON.
     * @return contractKey   The keccak256 key used to look up this record.
     */
    function registerCollateralContract(
        string calldata  _contractName,
        address          _contractAddr,
        uint256          _chainId,
        bytes32          _bytecodeHash,
        bytes32          _abiHash
    ) external onlyOwner nonReentrant returns (bytes32 contractKey) {
        contractKey = keccak256(abi.encodePacked(_contractName, _chainId));

        collateralContracts[contractKey] = CollateralContract({
            contractName:    _contractName,
            contractAddress: _contractAddr,
            chainId:         _chainId,
            bytecodeHash:    _bytecodeHash,
            abiHash:         _abiHash,
            registered:      true
        });

        emit CollateralContractRegistered(contractKey, _contractName, _contractAddr, _chainId);
    }

    /**
     * @notice Update the hermetic seal tiers for an existing filing record.
     * @param _filingHash     Filing hash returned by recordPrimaryFiling.
     * @param _newSealTiers   Updated array of tier hashes.
     */
    function updateHermeticSeal(
        bytes32            _filingHash,
        bytes32[] calldata _newSealTiers
    ) external onlyOwner {
        if (!ucc1Filings[_filingHash].isActive) {
            revert FilingNotFound(_filingHash);
        }
        ucc1Filings[_filingHash].hermeticSealTiers = _newSealTiers;
        emit HermeticSealUpdated(_filingHash, _newSealTiers.length, block.timestamp);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Verify that a filing hash is active (on-chain existence check).
     */
    function verifyFiling(bytes32 _filingHash) external view returns (bool) {
        return ucc1Filings[_filingHash].isActive;
    }

    /**
     * @notice Returns the IPFS gateway URL for the UCC-1 filing record.
     */
    function getFilingIPFSUrl() external pure returns (string memory) {
        return string(
            abi.encodePacked(
                "https://",
                PINATA_GATEWAY,
                "/ipfs/",
                UCC1_IPFS_CID
            )
        );
    }

    /**
     * @notice Returns the IPFS gateway URL for the UCC-1 Financing Statement document.
     */
    function getFinancingStatementIPFSUrl() external pure returns (string memory) {
        return string(
            abi.encodePacked(
                "https://",
                PINATA_GATEWAY,
                "/ipfs/",
                UCC1_FINANCING_STATEMENT_CID
            )
        );
    }

    /**
     * @notice Returns the official NM SOS filing number embedded in this contract.
     */
    function getFilingNumber() external pure returns (string memory) {
        return FILING_NUMBER;
    }
}
