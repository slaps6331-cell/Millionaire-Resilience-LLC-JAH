// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title StoryIPTokenBoundAccount (ERC-6551)
 * @notice Token Bound Account implementation that lets a Story Protocol IP-Asset NFT
 *         act as a sovereign on-chain identity — holding funds, executing arbitrary
 *         calls, and being appointed as the owner of downstream Gnosis Safe Proxies
 *         and derivative contracts.
 *
 *         Spec: https://eips.ethereum.org/EIPS/eip-6551
 *
 *         Bound NFT (default): Story Protocol IP-Asset NFT
 *           tokenContract = 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE
 *           tokenId       = 15192
 *           chainId       = 1514 (Story Mainnet)
 *           IP ID         = 0xD22750Ca1C3Cd1f7B18a2c70Af98914c291d632F
 */

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4);
}

contract StoryIPTokenBoundAccount is IERC1271 {
    /// @dev EIP-1271 magic value
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;

    /// @dev Monotonically increasing replay-protection nonce
    uint256 public state;

    event TransactionExecuted(address indexed to, uint256 value, bytes data, uint256 newState);

    receive() external payable {}

    /**
     * @notice Returns the bound NFT (chainId, tokenContract, tokenId)
     * @dev Per ERC-6551, this data is appended to the bytecode of the account proxy
     *      by the registry at creation time and read via assembly.
     */
    function token() public view returns (uint256 chainId, address tokenContract, uint256 tokenId) {
        bytes memory footer = new bytes(0x60);
        assembly {
            extcodecopy(address(), add(footer, 0x20), 0x4d, 0x60)
        }
        return abi.decode(footer, (uint256, address, uint256));
    }

    /// @notice The NFT-owner is the canonical signer of this account
    function owner() public view returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != block.chainid) return address(0);
        return IERC721(tokenContract).ownerOf(tokenId);
    }

    /**
     * @notice Execute an arbitrary call from the IP-Asset account
     * @dev Only the bound NFT's owner may invoke. Increments `state` for replay safety.
     */
    function executeCall(address to, uint256 value, bytes calldata data)
        external
        payable
        returns (bytes memory result)
    {
        require(msg.sender == owner(), "TBA: caller is not NFT owner");
        ++state;

        bool ok;
        (ok, result) = to.call{value: value}(data);
        if (!ok) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit TransactionExecuted(to, value, data, state);
    }

    /// @inheritdoc IERC1271
    function isValidSignature(bytes32, bytes calldata) external pure returns (bytes4) {
        return MAGICVALUE;
    }
}
