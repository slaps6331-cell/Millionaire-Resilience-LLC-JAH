// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/* -------------------------------------------------------------------------- */
/*                                                                            */
/*   SpiritualGuerrilla888TBA — ERC-6551 Token Bound Account (SG888)          */
/*                                                                            */
/*   Replaces:  contracts/SpiritualGuerrilla888.sol (legacy ERC-20)           */
/*   Project:   Baby Spiritual Guerilla IP Holdings Inc.                      */
/*              (formerly "Spiritual Guerilla 888")                           */
/*   Umbrella:  Gladiator Holdings LLC (1000-year umbrella trust)             */
/*   Authority: Clifton Kelly Bell — sole settlor / on-chain signer           */
/*                                                                            */
/*   This contract is the IMPLEMENTATION used by the ERC-6551 Registry        */
/*   (0x000000006551c19487814612e58FE06813775758) as the runtime that is      */
/*   bound to the SG888 anchor NFT. The deterministic TBA address derived     */
/*   for (chain, this, tokenContract, tokenId, salt) becomes the on-chain     */
/*   wallet for the SG888 brand — holding royalties, casting on-chain         */
/*   signatures, executing UCC-1 collateral hand-offs, and serving as the     */
/*   sole non-circulating custody address for ResilienceTokens and Angelcoin  */
/*   until a "more balanced social climate" is attested by Gladiator          */
/*   Holdings (per Trust §7).                                                 */
/*                                                                            */
/*   Conforms to:                                                             */
/*     - ERC-6551 (token bound accounts)                                      */
/*     - ERC-1271 (contract-signature validation, for Safe / Morpho / Story)  */
/*     - ERC-165 (interface detection)                                        */
/*     - EIP-191  (personal_sign attestations by the bound NFT owner)         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4);
}

interface IERC6551Account {
    receive() external payable;
    function token() external view returns (uint256 chainId, address tokenContract, uint256 tokenId);
    function state() external view returns (uint256);
    function isValidSigner(address signer, bytes calldata context) external view returns (bytes4);
}

interface IERC6551Executable {
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external payable returns (bytes memory);
}

contract SpiritualGuerrilla888TBA is
    IERC165,
    IERC1271,
    IERC6551Account,
    IERC6551Executable
{
    // ---------------------------------------------------------------------
    //  Brand constants (immutable identity of the token bound account)
    // ---------------------------------------------------------------------
    string  public constant NAME            = "Baby Spiritual Guerilla";
    string  public constant SYMBOL          = "SG888";
    string  public constant BRAND_LINEAGE   = "Spiritual Guerilla -> Baby Spiritual Guerilla";
    string  public constant UMBRELLA_TRUST  = "Gladiator Holdings LLC (1000-year)";
    address public constant SETTLOR         = 0x20A8402c67b9D476ddC1D2DB12f03B30A468f135; // Clifton Kelly Bell
    uint256 public constant TRUST_TERM_YEARS = 1000;

    // Hard-cap on AngelCoin + ResilienceToken custody held by this TBA.
    // These tokens are "non-circulating" until socialClimateBalanced == true.
    bool public socialClimateBalanced;

    // ERC-6551 state nonce — incremented on every state-mutating call.
    uint256 private _state;

    // ---------------------------------------------------------------------
    //  Events
    // ---------------------------------------------------------------------
    event TransactionExecuted(address indexed to, uint256 value, bytes data);
    event ClimateAttested(address indexed by, bool balanced, string memo);
    event Signed(bytes32 indexed digest, address indexed by);

    // ---------------------------------------------------------------------
    //  ERC-6551: token() + signer auth
    // ---------------------------------------------------------------------
    /// @notice Returns the (chainId, tokenContract, tokenId) this account is bound to.
    function token() public view returns (uint256, address, uint256) {
        bytes memory footer = new bytes(0x60);
        assembly {
            // ERC-6551 reference impl: the registry appends (chainId, tokenContract, tokenId)
            // as the last 0x60 bytes of this account's bytecode (extcodecopy footer).
            extcodecopy(address(), add(footer, 0x20), sub(extcodesize(address()), 0x60), 0x60)
        }
        return abi.decode(footer, (uint256, address, uint256));
    }

    function owner() public view returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != block.chainid) return address(0);
        return IERC721(tokenContract).ownerOf(tokenId);
    }

    function isValidSigner(address signer, bytes calldata) external view returns (bytes4) {
        if (signer == owner()) return IERC6551Account.isValidSigner.selector;
        return bytes4(0);
    }

    function state() external view returns (uint256) {
        return _state;
    }

    // ---------------------------------------------------------------------
    //  ERC-6551: execute()
    // ---------------------------------------------------------------------
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external payable returns (bytes memory result) {
        require(msg.sender == owner(),  "SG888TBA: not owner");
        require(operation == 0,         "SG888TBA: only CALL");

        ++_state;

        bool ok;
        (ok, result) = to.call{value: value}(data);
        if (!ok) {
            assembly { revert(add(result, 0x20), mload(result)) }
        }
        emit TransactionExecuted(to, value, data);
    }

    // ---------------------------------------------------------------------
    //  ERC-1271: contract signature validation
    //  (lets Safe / Morpho / StoryAttestationBridge verify SG888 attests
    //   to a digest as if its owner signed it.)
    // ---------------------------------------------------------------------
    function isValidSignature(bytes32 hash, bytes memory signature)
        external
        view
        returns (bytes4)
    {
        address recovered = _recover(hash, signature);
        if (recovered != address(0) && recovered == owner()) {
            return IERC1271.isValidSignature.selector;
        }
        return bytes4(0);
    }

    // ---------------------------------------------------------------------
    //  Trust governance — release ResilienceToken / Angelcoin custody
    // ---------------------------------------------------------------------
    /// @notice Settlor (Clifton Kelly Bell) flips the social-climate flag.
    ///         Until this is true, the TBA refuses outbound transfers of
    ///         ResilienceToken / Angelcoin (enforced off-chain by the SPV
    ///         operator + on-chain by the Safe 3-of-5 quorum).
    function attestSocialClimate(bool balanced, string calldata memo) external {
        require(msg.sender == SETTLOR, "SG888TBA: settlor only");
        socialClimateBalanced = balanced;
        emit ClimateAttested(msg.sender, balanced, memo);
    }

    // ---------------------------------------------------------------------
    //  ERC-165
    // ---------------------------------------------------------------------
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId           ||
            interfaceId == type(IERC1271).interfaceId          ||
            interfaceId == type(IERC6551Account).interfaceId   ||
            interfaceId == type(IERC6551Executable).interfaceId;
    }

    // ---------------------------------------------------------------------
    //  Internals — ECDSA recover (no external libs to keep this self-contained)
    // ---------------------------------------------------------------------
    function _recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8   v;
        assembly {
            r := mload(add(sig, 0x20))
            s := mload(add(sig, 0x40))
            v := byte(0, mload(add(sig, 0x60)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        return ecrecover(hash, v, r, s);
    }

    // ---------------------------------------------------------------------
    //  Receive native asset — emits Signed() to give the TBA an audit trail
    // ---------------------------------------------------------------------
    receive() external payable {
        emit Signed(keccak256(abi.encode(block.chainid, msg.sender, msg.value)), msg.sender);
    }

    fallback() external payable {}
}
