// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title StoryIPSafeProxyFactory
 * @notice Deploys Gnosis Safe Proxies whose primary owner is a Story Protocol
 *         ERC-6551 Token Bound Account (TBA). The TBA wraps the Story IP-Asset
 *         NFT, allowing the IP itself to:
 *           - own derivative smart contracts,
 *           - sign transactions via the Safe,
 *           - receive automatic royalty routing.
 *
 *         Canonical 1.4.1 addresses (multichain, including Story 1514 + Base 8453):
 *           SafeProxyFactory : 0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67
 *           SafeSingleton    : 0x41675C099F32341bf84BFc5382aF534df5C7461a
 *           ERC6551Registry  : 0x000000006551c19487814612e58FE06813775758
 */

interface ISafeProxyFactory {
    function createProxyWithNonce(
        address singleton,
        bytes calldata initializer,
        uint256 saltNonce
    ) external returns (address proxy);
}

interface IERC6551Registry {
    function createAccount(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt,
        bytes calldata initData
    ) external returns (address);

    function account(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) external view returns (address);
}

contract StoryIPSafeProxyFactory {
    // ── Canonical infra ─────────────────────────────────────────────
    address public constant SAFE_PROXY_FACTORY = 0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67;
    address public constant SAFE_SINGLETON     = 0x41675C099F32341bf84BFc5382aF534df5C7461a;
    address public constant ERC6551_REGISTRY   = 0x000000006551c19487814612e58FE06813775758;

    // ── Story IP-Asset binding defaults ─────────────────────────────
    address public constant STORY_IP_NFT       = 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE;
    uint256 public constant STORY_IP_TOKEN_ID  = 15192;
    uint256 public constant STORY_CHAIN_ID     = 1514;

    address public immutable tbaImplementation;

    event TBAReady(address indexed tba, uint256 chainId, address tokenContract, uint256 tokenId);
    event SafeProxyDeployed(address indexed safeProxy, address indexed owner, uint256 saltNonce);
    event DerivativeDeployed(address indexed derivative, address indexed creatorTBA);

    constructor(address _tbaImplementation) {
        require(_tbaImplementation != address(0), "TBA impl required");
        tbaImplementation = _tbaImplementation;
    }

    /**
     * @notice Step 1 — Derive (and deploy if needed) the ERC-6551 TBA for the
     *         bound Story IP-Asset NFT.
     */
    function ensureStoryIPTBA(uint256 salt) public returns (address tba) {
        tba = IERC6551Registry(ERC6551_REGISTRY).account(
            tbaImplementation, STORY_CHAIN_ID, STORY_IP_NFT, STORY_IP_TOKEN_ID, salt
        );
        if (tba.code.length == 0) {
            tba = IERC6551Registry(ERC6551_REGISTRY).createAccount(
                tbaImplementation, STORY_CHAIN_ID, STORY_IP_NFT, STORY_IP_TOKEN_ID, salt, ""
            );
        }
        emit TBAReady(tba, STORY_CHAIN_ID, STORY_IP_NFT, STORY_IP_TOKEN_ID);
    }

    /**
     * @notice Step 2 — Deploy a Safe Proxy whose sole 1-of-1 owner is the
     *         Story IP TBA. The Safe becomes the executor for downstream
     *         derivative deployments and royalty routing.
     *
     * @dev    `initializer` should be the ABI-encoded call to
     *         `Safe.setup(owners=[tba], threshold=1, ...)`. It can be built
     *         off-chain (see docs/STORY_IP_TBA_SAFE_PROXY_WORKFLOW.md).
     */
    function deploySafeForIP(
        bytes calldata initializer,
        uint256 saltNonce,
        uint256 tbaSalt
    ) external returns (address safeProxy, address tba) {
        tba = ensureStoryIPTBA(tbaSalt);
        safeProxy = ISafeProxyFactory(SAFE_PROXY_FACTORY)
            .createProxyWithNonce(SAFE_SINGLETON, initializer, saltNonce);
        emit SafeProxyDeployed(safeProxy, tba, saltNonce);
    }

    /**
     * @notice Step 3 — Record a derivative contract whose royalty receiver is
     *         the Story IP TBA. The derivative itself must hardcode the TBA
     *         in its `receive()` (see workflow doc).
     */
    function recordDerivative(address derivative, address creatorTBA) external {
        require(derivative != address(0) && creatorTBA != address(0), "zero addr");
        emit DerivativeDeployed(derivative, creatorTBA);
    }
}
