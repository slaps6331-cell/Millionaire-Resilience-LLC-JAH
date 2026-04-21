# Morpho Protocol 3-of-5 Safe Signing for Pre-Deployment UCC-1 Filing

Complete guide for signing the UCC-1 filing authorization via Safe{Wallet} Transaction Builder, using the Morpho Protocol multi-signature workflow with StakeMe validator integration and Story Protocol IP verification.

---

## Table of Contents

1. [Pre-Deployment UCC-1 Filing Flow](#1-pre-deployment-ucc-1-filing-flow)
2. [Step 1: Obtain Contract ABI and Address](#step-1-obtain-contract-abi-and-address)
3. [Step 2: Open Safe Transaction Builder](#step-2-open-safe-transaction-builder)
4. [Step 3: Propose the UCC-1 Authorization Transaction](#step-3-propose-the-ucc-1-authorization-transaction)
5. [Step 4: Collect 3-of-5 Signatures](#step-4-collect-3-of-5-signatures)
6. [Step 5: Execute the Transaction](#step-5-execute-the-transaction)
7. [Story Protocol IP Verification Benefits](#story-protocol-ip-verification-benefits)
8. [StakeMe Validator Integration](#stakeme-validator-integration)
9. [Thirdweb RPC Integration](#thirdweb-rpc-integration)
10. [Verification Artifacts for StoryScan & Basescan](#verification-artifacts-for-storyscan--basescan)
11. [Pinata IPFS Pinning Commands](#pinata-ipfs-pinning-commands)

---

## 1. Pre-Deployment UCC-1 Filing Flow

```
+--------------------+     +---------------------+     +------------------+
|  1. Generate Hash  | --> |  2. Sign in Safe    | --> |  3. Execute TX   |
|  (anchor-signature)|     |  (3-of-5 threshold) |     |  (on-chain)      |
+--------------------+     +---------------------+     +------------------+
         |                          |                           |
         v                          v                           v
  signature-morpho-       Safe{Wallet} TX Builder       UCC-1 recorded on
  config.json with        with Morpho ABI               Story Protocol &
  eip191Hash                                            Base L2
```

### Safe Wallet Configuration

| Field | Value |
|---|---|
| Safe Contract | `0xd314BE0a27c73Cd057308aC4f3dd472c482acc09` |
| Threshold | 3 of 5 |
| Signer 1 (Coinbase) | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |
| Signer 2 (Blockchain.com) | `0x20A8402c67b9D476ddC1D2DB12f03B30A468f135` |
| Signer 3 (MetaMask) | `0x5EEFF17e12401b6A8391f5257758E07c157E1e45` |
| Signer 4 (Brave) | `0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A` |
| Signer 5 (Trust Wallet) | `0xD39447807f18Ba965E8F3F6929c8815794B3C951` |

### EIP-191 Hash to Sign

```
0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb
```

---

## Step 1: Obtain Contract ABI and Address

### Morpho Blue Contract (Base L2)

| Field | Value |
|---|---|
| Contract | Morpho Blue |
| Address | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |
| Chain | Base (8453) |
| Explorer | https://basescan.org/address/0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb |

The ABI is auto-fetched by Safe{Wallet} if the contract is verified on Basescan. If not, use the authorization ABI:

```json
[
  {
    "inputs": [
      { "name": "authorized", "type": "address" },
      { "name": "isAuthorized", "type": "bool" }
    ],
    "name": "setAuthorization",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "authorization", "type": "tuple",
        "components": [
          { "name": "authorizer", "type": "address" },
          { "name": "authorized", "type": "address" },
          { "name": "isAuthorized", "type": "bool" },
          { "name": "nonce", "type": "uint256" },
          { "name": "deadline", "type": "uint256" }
        ]
      },
      { "name": "signature", "type": "tuple",
        "components": [
          { "name": "v", "type": "uint8" },
          { "name": "r", "type": "bytes32" },
          { "name": "s", "type": "bytes32" }
        ]
      }
    ],
    "name": "setAuthorizationWithSig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

### UCC-1 Filing Contract (This Repo)

| Field | Value |
|---|---|
| Contract | UCC1FilingIntegration |
| Chain | Story (1514) + Base (8453) |
| Bytecode keccak256 | See `verification-artifacts/UCC1FilingIntegration.storyscan.json` |
| Deployed Size | 6,887 bytes |

---

## Step 2: Open Safe Transaction Builder

1. Navigate to **https://app.safe.global**
2. Connect your wallet (any of the 5 signers)
3. Select the Safe at `0xd314BE0a27c73Cd057308aC4f3dd472c482acc09`
4. Go to **Apps** > **Transaction Builder**

---

## Step 3: Propose the UCC-1 Authorization Transaction

### 3.1 Configure the Transaction

In the Transaction Builder:

1. **To Address:** `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` (Morpho Blue)
2. **ABI:** Paste the authorization ABI from Step 1 (or it auto-loads if verified)
3. **Method:** Select `setAuthorization`
4. **Parameters:**
   - `authorized`: `0xd314BE0a27c73Cd057308aC4f3dd472c482acc09` (Safe contract itself)
   - `isAuthorized`: `true`
5. Click **Add transaction**

### 3.2 Add UCC-1 Filing Hash Transaction

Add a second transaction to the batch:

1. **To Address:** UCC1FilingIntegration contract address (after deployment)
2. **Method:** `recordFiling` or the appropriate UCC-1 function
3. **Parameters:**
   - `filingNumber`: `20260000078753`
   - `jurisdiction`: `New Mexico Secretary of State`
   - `ipfsCid`: `bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a`
   - `hermeticSealHash`: `0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413`
4. Click **Add transaction**

### 3.3 Verify Raw Data

Before proceeding, verify:
- **To address** matches Morpho Blue (`0xBBBBBbb...`)
- **Data field** contains the correct function selector
- No unexpected permissions are being granted

### 3.4 Create Batch

Click **Create Batch** then **Send Transaction** to propose it to the Safe.

---

## Step 4: Collect 3-of-5 Signatures

Each Safe owner signs the proposal through the Safe interface:

| Signer | Wallet | Method |
|---|---|---|
| Signer 1 | Coinbase Wallet | WalletConnect QR scan |
| Signer 2 | Blockchain.com | WalletConnect QR scan |
| Signer 3 | MetaMask | Direct browser connection |
| Signer 4 | Brave Wallet | Direct browser connection |
| Signer 5 | Trust Wallet | WalletConnect QR scan |

**Minimum 3 signatures required.** Each signer:
1. Opens https://app.safe.global
2. Connects their wallet
3. Views the pending transaction
4. Clicks **Confirm** to add their signature

### EIP-191 Signing (Alternative: CLI Method)

For signers who prefer CLI:

```bash
# Using Foundry cast
EIP191_HASH="0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb"
cast wallet sign --private-key "$SIGNER_KEY" --no-hash "$EIP191_HASH"
```

Inject signatures into config:

```bash
node -e "
const fs = require('fs');
const c = JSON.parse(fs.readFileSync('signature-morpho-config.json'));
c.signatures.signer1_coinbase = 'PASTE_132_CHAR_SIG';
c.signatures.signer2_morpho   = 'PASTE_132_CHAR_SIG';
c.signatures.signer3_story    = 'PASTE_132_CHAR_SIG';
fs.writeFileSync('signature-morpho-config.json', JSON.stringify(c, null, 2));
"

# Verify
node scripts/verify-multisig.cjs
```

---

## Step 5: Execute the Transaction

Once 3-of-5 signatures are collected:

1. Any signer opens the Safe and views the confirmed transaction
2. Click **Execute** to broadcast it on-chain
3. The transaction is submitted to the network
4. Wait for 2+ block confirmations

---

## Story Protocol IP Verification Benefits

Story Protocol's architecture provides key advantages for the UCC-1 perfection workflow:

| Feature | Benefit for UCC-1 Filing |
|---|---|
| **Programmable IP Registry** | Every IP asset registered as unique on-chain entity — single source of truth for ownership |
| **Proof-of-Creativity Protocol** | Verification and execution of smart contracts across EVM chains — consistent rule enforcement |
| **Immutable Provenance** | History of IP assets permanently recorded — prevents tampering and fraudulent ownership claims |
| **Automated Verification** | Smart contracts replace manual legal audits — reduces clearance from weeks to minutes |
| **Modular Architecture** | Core modules handle Licensing, Royalty, and Dispute logic; Periphery contracts simplify IP management |
| **Frictionless Monetization** | Royalty modules automatically return revenue to creators — no intermediaries |
| **Enhanced Trust** | Blockchain verification acts as digital notary — increases asset valuation for institutional investors |

### Story Protocol Deployment Lifecycle Applied to UCC-1

1. **Creation**: UCC-1 rules coded in `UCC1FilingIntegration.sol` (Solidity)
2. **Validation**: Consensus mechanism ensures network agreement on contract terms
3. **Deployment**: Contract broadcast to Story Protocol mainnet (Chain 1514)
4. **Verification**: Deployed bytecode verified against source on StoryScan using Verifier Alliance standards

### Story Protocol Contract Addresses (Mainnet)

| Contract | Address |
|---|---|
| IPAssetRegistry | `0x77319B4031e6eF1250907aa00018B8B1c67a244b` |
| LicensingModule | `0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f` |
| RoyaltyModule | `0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086` |
| PILicenseTemplate | `0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316` |
| RoyaltyPolicyLAP | `0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E` |
| RegistrationWorkflows | `0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424` |
| MR IP Asset ID | `0x98971c660ac20880b60F86Cc3113eBd979eb3aAE` (Token 15192) |

---

## StakeMe Validator Integration

### RPC Endpoints

| Endpoint | URL |
|---|---|
| Story RPC (Tendermint) | `https://story-rpc.stakeme.pro:443` |
| Story REST API | `https://story-rest.stakeme.pro:443` |
| Story EVM RPC | `https://story-evm-rpc.stakeme.pro:443` |

### Peers Configuration

```bash
# Persistent Peer
PEER="ee5386dd25b97cba63234f8a76aca9b6dcb3f157@story-peer.stakeme.pro:26656"

# Seed Node
SEED="c1d973eea1b2c637777ab32783b3d37f2b52ba36@b1.storyrpc.io:52656"

# Live Peers
PEERS="e4656f3eea64c17c216f8a88501d8b277081c49d@168.119.10.134:26656,2d413dc6e361286b05aa8f2c76f1fbbb6691fc73@213.133.109.166:26656,fea4d79b1686ad7c53651721ad8f5e256e02f874@148.72.141.192:26646,bc0ab3d745c235087eb9d0164936a7093c0149b7@69.67.149.105:26656,e9733f8b2cf170c0be1a5443064eab42abc05a0a@67.213.124.67:26656,90bd163b57ebd020a66eb20b0cdc70ca0b4113bf@65.108.74.54:22425,676335cdbce6a2923f90290e7de2058b169a64cd@217.182.198.92:32425,9dc59634f2dc5da4c19bc3a12cd5131cc5e80ac8@5.9.106.71:22425,d53d3c04bb740fb37f03886861f6724223da8a02@15.235.227.25:26656,4128fbba4541ca4cf212eda8903d3e6f43ff70dc@142.132.250.163:32425"
sed -i "/^\[p2p\]/,/^\[/ s|^persistent_peers *=.*|persistent_peers = \"$PEERS\"|" $HOME/.story/config/config.toml
```

### State Sync Configuration

```bash
story tendermint unsafe-reset-all --home $HOME/.story
STATESYNC_RPC=https://story-rpc.stakeme.pro:443
LATEST_HEIGHT=$(curl -s $STATESYNC_RPC/block | jq -r .result.block.header.height)
BLOCK_HEIGHT=$((LATEST_HEIGHT - 1000))
TRUST_HASH=$(curl -s "$STATESYNC_RPC/block?height=$BLOCK_HEIGHT" | jq -r .result.block_id.hash)

sed -i.bak -E "s|^(enable[[:space:]]+=[[:space:]]+).*$|\1true| ; \
s|^(rpc_servers[[:space:]]+=[[:space:]]+).*$|\1\"$STATESYNC_RPC,$STATESYNC_RPC\"| ; \
s|^(trust_height[[:space:]]+=[[:space:]]+).*$|\1$BLOCK_HEIGHT| ; \
s|^(trust_hash[[:space:]]+=[[:space:]]+).*$|\1\"$TRUST_HASH\"| ; \
s|^(seeds[[:space:]]+=[[:space:]]+).*$|\1\"\"|" $HOME/.story/story/config/config.toml
```

### Validator Staking Setup

```bash
# Query latest block via StakeMe RPC
curl -s https://story-rpc.stakeme.pro:443/block | jq '.result.block.header.height'

# Query validator status
curl -s https://story-rest.stakeme.pro:443/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED | jq '.validators | length'

# EVM RPC for contract interactions
curl -X POST "https://story-evm-rpc.stakeme.pro:443" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## Thirdweb RPC Integration

### Gateway Endpoint

```
https://1.rpc.thirdweb.com/eccb68351bc5fb4cc8ea27242b2dbc53
```

### Test Connection

```bash
curl -X POST "https://1.rpc.thirdweb.com/eccb68351bc5fb4cc8ea27242b2dbc53" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Hardhat Integration

The Thirdweb RPC is configured as the primary RPC in `hardhat.config.cjs`:

```javascript
// Set THIRDWEB_RPC_URL to use Thirdweb as primary RPC
// Falls back to Alchemy, then StakeMe, then public endpoint
THIRDWEB_RPC_URL="https://1.rpc.thirdweb.com/eccb68351bc5fb4cc8ea27242b2dbc53"
```

### GitHub Environment Variables for Thirdweb

| Variable | Value | Type |
|---|---|---|
| `THIRDWEB_CLIENT_ID` | From Thirdweb dashboard | Secret |
| `THIRDWEB_SECRET_KEY` | From Thirdweb dashboard | Secret |
| `THIRDWEB_RPC_URL` | `https://1.rpc.thirdweb.com/eccb68351bc5fb4cc8ea27242b2dbc53` | Variable |

---

## Verification Artifacts for StoryScan & Basescan

All 12 contracts have been compiled and verification artifacts generated in `verification-artifacts/`:

| Contract | Size | Keccak256 (deployed) | EVM Check |
|---|---|---|---|
| StoryAttestationService | 23,342 bytes | See `.storyscan.json` | PASS (1,234 under limit) |
| StoryOrchestrationService | 13,436 bytes | See `.storyscan.json` | PASS |
| StoryAttestationBridge | 10,270 bytes | See `.storyscan.json` | PASS |
| SLAPSIPSpvLoan | 17,017 bytes | See `.storyscan.json` | PASS |
| GladiatorHoldingsSpvLoan | 11,890 bytes | See `.storyscan.json` | PASS |
| PILLoanEnforcement | 9,580 bytes | See `.storyscan.json` | PASS |
| StablecoinIPEscrow | 11,403 bytes | See `.storyscan.json` | PASS |
| AngelCoin | 6,920 bytes | See `.storyscan.json` | PASS |
| ResilienceToken | 5,163 bytes | See `.storyscan.json` | PASS |
| SlapsStreaming | 14,079 bytes | See `.storyscan.json` | PASS |
| SlapsSPV | 12,130 bytes | See `.storyscan.json` | PASS |
| UCC1FilingIntegration | 6,887 bytes | See `.storyscan.json` | PASS |

---

## Pinata IPFS Pinning Commands

Copy and paste these commands to pin the ABI proof and verification artifacts to Pinata:

### Pin ABI Proof (Complete — 12 Contracts)

```bash
PINATA_JWT="YOUR_PINATA_JWT_HERE"
GATEWAY="lavender-neat-urial-76"

curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -F "file=@abi-proof.json" \
  -F 'pinataMetadata={"name":"ABI_Proof_12_Contracts_v2","keyvalues":{"documentType":"ABI_BYTECODE_PROOF","contractCount":"12","solcVersion":"0.8.26","evmVersion":"cancun","viaIR":"true","networks":"Story_1514,Base_8453","safeAddress":"0xd314BE0a27c73Cd057308aC4f3dd472c482acc09","threshold":"3of5"}}' \
  -F 'pinataOptions={"cidVersion":1}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('ABI Proof CID:', d['IpfsHash']); print('URL: https://$GATEWAY.mypinata.cloud/ipfs/' + d['IpfsHash'])"
```

### Pin Verification Bundle

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -F "file=@verification-artifacts/verification-bundle.json" \
  -F 'pinataMetadata={"name":"Verification_Bundle_12_Contracts","keyvalues":{"documentType":"VERIFICATION_BUNDLE","compiler":"v0.8.26","evmVersion":"cancun","contractCount":"12"}}' \
  -F 'pinataOptions={"cidVersion":1}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Bundle CID:', d['IpfsHash'])"
```

### Pin Valuation Attestation

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"pinataContent\":$(cat valuation-attestation.json),\"pinataMetadata\":{\"name\":\"Valuation_Attestation_MR_SLAPS\",\"keyvalues\":{\"hermeticSeal\":\"0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413\",\"totalValuation\":\"300000000\",\"morphoBlue\":\"0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Attestation CID:', d['IpfsHash'])"
```

### Pin Multi-Sig Config

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"pinataContent\":$(cat signature-morpho-config.json),\"pinataMetadata\":{\"name\":\"MultiSig_3of5_Safe_Config\",\"keyvalues\":{\"safeAddress\":\"0xd314BE0a27c73Cd057308aC4f3dd472c482acc09\",\"threshold\":\"3\",\"eip191Hash\":\"0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('MultiSig CID:', d['IpfsHash'])"
```

### Verify Pins Are Accessible

```bash
GATEWAY_TOKEN="2sNDwplwFPMa4DlVD_TFnHh2dcXM2UunGR5Ts7abPjjmb2q-5GZzfjfJMK2u9x-V"

# Check existing ABI proof
curl -s -o /dev/null -w "ABI Proof: %{http_code}\n" \
  "https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay?pinataGatewayToken=$GATEWAY_TOKEN"

# Check UCC-1 filing
curl -s -o /dev/null -w "UCC-1 Filing: %{http_code}\n" \
  "https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a?pinataGatewayToken=$GATEWAY_TOKEN"

# Check UCC-1 financing statement
curl -s -o /dev/null -w "UCC-1 Statement: %{http_code}\n" \
  "https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu?pinataGatewayToken=$GATEWAY_TOKEN"
```
