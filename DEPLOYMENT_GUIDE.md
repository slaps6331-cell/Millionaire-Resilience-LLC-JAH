# Smart Contract Deployment Guide
## Millionaire Resilience LLC — Gladiator Holdings Multi-SPV System

This guide covers:
1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [GitHub Secrets Setup](#2-github-secrets-setup)
3. [On-Chain Signature Verification — Morpho Multi-Sig](#3-on-chain-signature-verification--morpho-multi-sig)
4. [Running the Deployment](#4-running-the-deployment)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Pre-Deployment Checklist

Before triggering the deployment workflow, confirm **every item** in this checklist.

### 1.1 Deployer Wallet

| Check | Requirement |
|-------|-------------|
| ☐ Wallet created | A dedicated deployment wallet (separate from the Coinbase or ThirdWeb multi-sig wallets) |
| ☐ Story Protocol gas | Minimum **0.5 IP** in the deployer wallet on Story Protocol mainnet (Chain 1514) |
| ☐ Base L2 gas | Minimum **0.01 ETH** in the deployer wallet on Base L2 (Chain 8453) |
| ☐ Private key exported | The deployer private key is ready to paste into GitHub Secrets (see §2) |

> **Security rule**: The deployer wallet is used only for gas payment. It must never hold the multi-sig keys or any significant funds after deployment.

### 1.2 Multi-Signature Wallets (Morpho Protocol)

Morpho Protocol requires **2-of-2 signatures** from both of these wallets before any Morpho market position can be executed:

| Label | Address | Wallet App |
|-------|---------|------------|
| **ThirdWeb** | `0xe45572Dc828eF0E46D852125f0743938aABe1e12` | ThirdWeb Embedded Wallet |
| **Coinbase** | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` | Coinbase Wallet (smart wallet or EOA) |

Both wallet holders must be available and ready to sign when the deployment reaches the Morpho multi-sig step.

### 1.3 API Keys Required

Gather the following before starting. All will be stored as GitHub Secrets — **never in source code**.

| Key | Where to obtain |
|-----|-----------------|
| `DEPLOYER_PRIVATE_KEY` | Export from your deployer wallet (MetaMask, Coinbase Wallet, etc.) |
| `STORYSCAN_API_KEY` | <https://storyscan.xyz> → Register → API Keys |
| `ETHERSCAN_API_KEY` | <https://etherscan.io/myapikey> (also works for Basescan) |
| `STORY_RPC_URL` *(optional)* | Alchemy, QuickNode, or Ankr — Story Protocol endpoint |
| `BASE_RPC_URL` *(optional)* | Alchemy, QuickNode, or Ankr — Base L2 endpoint |
| `THIRDWEB_CLIENT_ID` | <https://thirdweb.com/dashboard> → Settings → API Keys |
| `THIRDWEB_SECRET_KEY` | Same dashboard as above |
| `PINATA_JWT` | <https://app.pinata.cloud> → API Keys → New Key |

---

## 2. GitHub Secrets Setup

All sensitive credentials are stored as **encrypted GitHub repository secrets**. They are injected into the deployment workflow at runtime and are never logged or committed.

### Step-by-step: Adding a GitHub Secret

1. Navigate to the repository:  
   `https://github.com/slaps6331-cell/Millionaire-Resilience-LLC`

2. Click **Settings** (top navigation bar).

3. In the left sidebar, click **Secrets and variables → Actions**.

4. Click **New repository secret**.

5. Fill in:
   - **Name**: exact name from the table below (copy-paste to avoid typos)
   - **Secret**: the actual key value

6. Click **Add secret**.

7. Repeat for every secret in the table below.

### Required Secrets

| Secret Name | Description | Required for |
|-------------|-------------|-------------|
| `DEPLOYER_PRIVATE_KEY` | Private key of the wallet paying deployment gas. **Must start with `0x`.** | Story + Base deployment |
| `STORYSCAN_API_KEY` | StoryScan API key for contract source verification | Story deployment |
| `ETHERSCAN_API_KEY` | Etherscan/Basescan API key for contract source verification | Base deployment |
| `STORY_RPC_URL` | Dedicated Story Protocol RPC endpoint *(defaults to public if omitted)* | Story deployment |
| `BASE_RPC_URL` | Dedicated Base L2 RPC endpoint *(defaults to public if omitted)* | Base deployment |
| `THIRDWEB_CLIENT_ID` | ThirdWeb project client ID | ThirdWeb wallet integration |
| `THIRDWEB_SECRET_KEY` | ThirdWeb project secret key | ThirdWeb wallet integration |
| `PINATA_JWT` | Pinata IPFS JWT token | IPFS document pinning |

### Optional Repository Variables (not secrets — public wallet addresses)

Navigate to **Settings → Secrets and variables → Actions → Variables tab** and add:

| Variable Name | Value |
|---------------|-------|
| `THIRDWEB_WALLET_ADDRESS` | `0xe45572Dc828eF0E46D852125f0743938aABe1e12` |
| `COINBASE_WALLET_ADDRESS` | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |

> These wallet addresses are already hardcoded as defaults in the workflow. Setting them as repository variables allows you to update them without a code change.

### GitHub Environments (Deployment Protection)

The deployment workflow uses two **GitHub Environments** to enforce approval gates before any production deployment begins.

1. Go to **Settings → Environments → New environment**.
2. Create **`story-mainnet`**:
   - Enable **Required reviewers** — add yourself and any co-owners.
   - Enable **Prevent self-review** if desired.
3. Create **`base-mainnet`** with the same settings.

This ensures no deployment can proceed without a human approval click.

---

## 3. On-Chain Signature Verification — Morpho Multi-Sig

The Morpho Protocol integration requires both wallet holders to produce valid cryptographic signatures before any Morpho market position (the \$5M BTC loan and \$1M ETH loan) can be activated. This section explains exactly how that works and how to produce and verify the signatures.

### 3.1 Background: EIP-191 Personal Signatures

Morpho Protocol uses the **EIP-191** ("personal_sign") standard for off-chain authorizations. This standard:

1. Takes an arbitrary message (in this case, a `keccak256` hash of transaction parameters).
2. Prepends `\x19Ethereum Signed Message:\n32` to the message.
3. Hashes the combined prefix + message with `keccak256`.
4. Signs the resulting hash using the **private key** of the signer.
5. Produces a 65-byte signature: `r` (32 bytes) + `s` (32 bytes) + `v` (1 byte).

On-chain verification uses Solidity's `ecrecover(prefixedHash, v, r, s)` to recover the signer's address from the signature, then asserts that the recovered address matches the expected wallet address.

### 3.2 What Gets Signed

The scripts in this repository compute the signature payload as follows (see `scripts/anchor-signature.cjs`):

```
signatureData = abi.encode(
    "Clifton Kelly Bell",           // signer name
    "UCC-1_FINANCING_STATEMENT",    // document type
    "<UCC-1 IPFS CID>",             // Pinata IPFS CID of UCC-1 filing
    <unix timestamp>                // epoch seconds at time of signing
)

rawHash     = keccak256(signatureData)
eip191Hash  = keccak256("\x19Ethereum Signed Message:\n32" + rawHash)
```

Both wallets must sign `eip191Hash`. The resulting signatures are stored in `signature-morpho-config.json`.

### 3.3 Step-by-Step: ThirdWeb Wallet Signing

**Using the ThirdWeb dashboard (recommended):**

1. Open the [ThirdWeb Dashboard](https://thirdweb.com/dashboard) and connect the wallet at `0xe45572Dc828eF0E46D852125f0743938aABe1e12`.
2. Navigate to **Wallet SDK → Sign Message**.
3. Paste the `eip191Hash` value from `signature-morpho-config.json`.
4. Click **Sign**. The dashboard will return a 132-character hex string (`0x` + 130 hex chars).
5. Record the signature.

**Using the ThirdWeb TypeScript SDK programmatically:**

```typescript
import { createThirdwebClient, prepareContractCall } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";

const client = createThirdwebClient({ clientId: process.env.THIRDWEB_CLIENT_ID });
const account = privateKeyToAccount({ client, privateKey: process.env.THIRDWEB_PRIVATE_KEY });

// eip191Hash is the value from signature-morpho-config.json
const signature = await account.signMessage({ message: { raw: eip191Hash } });
console.log("ThirdWeb signature:", signature);
```

**Using `cast` (Foundry) from the command line:**

```bash
cast wallet sign --private-key $THIRDWEB_PRIVATE_KEY \
    --no-hash \
    "$(cat signature-morpho-config.json | jq -r '.eip191Hash')"
```

### 3.4 Step-by-Step: Coinbase Wallet Signing

**Using Coinbase Wallet browser extension:**

1. Open the Coinbase Wallet extension and select the account `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a`.
2. Navigate to your dApp or use a tool like [**MyEtherWallet**](https://www.myetherwallet.com) → **Message → Sign Message**.
3. Paste the `eip191Hash` from `signature-morpho-config.json`.
4. Approve the signature request in the Coinbase Wallet popup.
5. Copy the returned 132-character hex signature.

**Using Coinbase Wallet SDK programmatically (Node.js):**

```javascript
const { CoinbaseWalletSDK } = require("@coinbase/wallet-sdk");
const { ethers } = require("ethers");

const sdk = new CoinbaseWalletSDK({ appName: "Millionaire Resilience LLC" });
const provider = new ethers.BrowserProvider(sdk.makeWeb3Provider());
const signer = await provider.getSigner();

const eip191Hash = "<value from signature-morpho-config.json>";
const signature = await signer.signMessage(ethers.getBytes(eip191Hash));
console.log("Coinbase signature:", signature);
```

**Using `cast` (Foundry) from the command line:**

```bash
cast wallet sign --private-key $COINBASE_PRIVATE_KEY \
    --no-hash \
    "$(cat signature-morpho-config.json | jq -r '.eip191Hash')"
```

### 3.5 Populating the Signature Files

After both signers produce their signatures, update `signature-morpho-config.json`:

```json
{
  "multisigSigners": {
    "thirdweb": "0xe45572Dc828eF0E46D852125f0743938aABe1e12",
    "coinbase":  "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"
  },
  "signatures": {
    "thirdweb": "0x<130 hex characters>",
    "coinbase":  "0x<130 hex characters>"
  }
}
```

And update `multisig-transaction.json`:

```json
{
  "signatures": [
    {
      "signer":    "0xe45572Dc828eF0E46D852125f0743938aABe1e12",
      "label":     "ThirdWeb",
      "signature": "0x<130 hex characters>",
      "verified":  true
    },
    {
      "signer":    "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
      "label":     "Coinbase",
      "signature": "0x<130 hex characters>",
      "verified":  true
    }
  ]
}
```

### 3.6 Verifying Both Signatures Locally

Run the included verification script to confirm both signatures recover to the correct wallet addresses before submitting anything on-chain:

```bash
# First generate the signature config
node scripts/anchor-signature.cjs

# Then verify both signatures (after populating them)
node scripts/verify-multisig.cjs
```

Expected output:

```
============================================================
Morpho Multi-Sig — On-Chain Signature Verification
============================================================

Message details:
  Signer:       Clifton Kelly Bell
  Document:     UCC-1_FINANCING_STATEMENT
  EIP-191 hash: 0x...

Verifying ThirdWeb (0xe45572...):
  Recovered:    0xe45572Dc828eF0E46D852125f0743938aABe1e12
  ✓  Signature valid — signer address matches

Verifying Coinbase (0xDc2aFc...):
  Recovered:    0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a
  ✓  Signature valid — signer address matches

============================================================
✓ 2/2 signatures verified — ready to submit to Morpho
============================================================
```

### 3.7 On-Chain Verification (Solidity Reference)

The EIP-191 recovery pattern used by Morpho Protocol in Solidity:

```solidity
function verifySignature(
    bytes32 messageHash,
    bytes calldata signature,
    address expectedSigner
) internal pure returns (bool) {
    // Apply EIP-191 prefix
    bytes32 ethSignedHash = keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
    );

    // Recover signer from signature
    (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
    address recovered = ecrecover(ethSignedHash, v, r, s);

    return recovered == expectedSigner;
}
```

This is exactly what `scripts/verify-multisig.cjs` replicates in JavaScript using `ethers.js` before submitting to the network.

---

## 4. Running the Deployment

### 4.1 Pre-flight: Dry Run

Before deploying to mainnet, always run a dry-run compile to catch any Solidity compilation errors:

1. Go to **Actions → Deploy Smart Contracts**.
2. Click **Run workflow**.
3. Set inputs:
   - **Network**: `story`
   - **Verify**: `true`
   - **Dry run**: ✅ `true`
4. Click **Run workflow**.

If the dry run passes (all 11 contracts compile successfully), proceed to §4.2.

You can also run the local test-deploy against Hardhat's in-memory network:

```bash
npm run contracts:test
```

### 4.2 Deploy to Story Protocol (Chain 1514)

1. Go to **Actions → Deploy Smart Contracts**.
2. Click **Run workflow**.
3. Set inputs:
   - **Network**: `story`
   - **Verify**: ✅ `true`
   - **Dry run**: `false`
4. Click **Run workflow**.
5. The `story-mainnet` environment protection gate will appear — click **Review deployments → Approve**.
6. Monitor the job steps in real time.

The workflow will:
- Compile all 11 contracts
- Deploy each to Story Protocol mainnet in sequence
- Verify each contract's source code on StoryScan
- Generate `multisig-transaction.json` for the Morpho multi-sig step
- Upload deployment artifacts (retained for 90 days)
- Post a table of all deployed addresses to the job summary

### 4.3 Deploy to Base L2 (Chain 8453)

Repeat §4.2 with **Network** set to `base`. The workflow targets the `base-mainnet` environment and verifies on Basescan.

### 4.4 Deploy to Both Networks Simultaneously

Set **Network** to `both`. The `deploy-story` and `deploy-base` jobs run in parallel.

### 4.5 Deployment Order (All 11 Contracts)

The `scripts/deploy.cjs` script deploys in this order to satisfy contract dependencies:

| # | Contract | Purpose |
|---|----------|---------|
| 1 | `StoryAttestationService` | 7-type attestation layer; must exist before orchestration |
| 2 | `StoryOrchestrationService` | Hermetic Seal Pipeline controller |
| 3 | `StoryAttestationBridge` | Cross-chain attestation bridge (Story ↔ Base) |
| 4 | `SLAPSIPSpvLoan` | SLAPS Streaming SPV loan contract |
| 5 | `GladiatorHoldingsSpvLoan` | Parent holding company SPV loan |
| 6 | `PILLoanEnforcement` | PIL license enforcement and collateral |
| 7 | `StablecoinIPEscrow` | USDC/USDT escrow with Morpho integration |
| 8 | `AngelCoin` | ANGEL ERC-20 token |
| 9 | `ResilienceToken` | RSIL ERC-20 token |
| 10 | `SlapsStreaming` | SLAPS streaming revenue contract |
| 11 | `SlapsSPV` | SLAPS SPV structure contract |

### 4.6 Gas Estimates

| Network | Estimated Total Gas | Estimated Cost |
|---------|--------------------|--------------:|
| Story Protocol | ~42M gas | ~0.05–0.15 IP |
| Base L2 | ~42M gas | ~0.003–0.01 ETH |

These estimates are based on the Alchemy gas optimization data in `AlchemyGasOptimization.json`. Fund the deployer wallet with **at least 2× the estimated cost** as a safety buffer.

---

## 5. Post-Deployment Verification

### 5.1 Confirm Deployed Addresses

The workflow job summary will display a table like:

| Contract | Address |
|----------|---------|
| StoryAttestationService | `0x...` |
| StoryOrchestrationService | `0x...` |
| ... | ... |

Each address links directly to StoryScan or Basescan.

### 5.2 Download Deployment Artifacts

1. In the completed workflow run, scroll to **Artifacts**.
2. Download `deployment-story-<run#>` (contains `deployment-config.story.json` and `multisig-transaction.json`).
3. Save these files securely — they are the authoritative record of deployed addresses.

### 5.3 Complete the Morpho Multi-Sig

After deployment, the `multisig-transaction.json` artifact contains the transaction hash that both wallets must sign.

1. Download `multisig-transaction.json` from the workflow artifacts.
2. Share the `transactionHash` field with both signer wallet holders.
3. Each holder signs using the method in §3.3 or §3.4.
4. Populate the `signatures` array and set `verified: true` for each.
5. Run local verification: `node scripts/verify-multisig.cjs`
6. Once both signatures pass verification, submit the transaction to Story Protocol via your preferred wallet interface.

### 5.4 Source Verification on Block Explorers

| Network | Explorer | Verification |
|---------|----------|-------------|
| Story Protocol | [storyscan.xyz](https://storyscan.xyz) | Automatic via `npm run contracts:verify:story` |
| Base L2 | [basescan.org](https://basescan.org) | Automatic via `npm run contracts:verify:base` |

If automatic verification fails, manually verify:
```bash
npx hardhat verify --network story <CONTRACT_ADDRESS>
npx hardhat verify --network base <CONTRACT_ADDRESS>
```

### 5.5 Post-Deployment Security Checklist

| Check | Action |
|-------|--------|
| ☐ Rotate deployer key | After deployment, the deployer private key should no longer be needed. Remove it from GitHub Secrets and consider revoking the wallet. |
| ☐ Transfer ownership | Call `transferOwnership(<multisig_address>)` on each deployed contract to hand control to the multi-sig wallets. |
| ☐ Verify `onlyOwner` functions | Test that each `onlyOwner` function reverts from non-owner addresses. |
| ☐ Set contract addresses | Call `setAttestationService` and `setSPVLoanContract` on `StoryOrchestrationService` with the deployed addresses. |
| ☐ Record auxiliary docs | Call `recordArticlesOfIncorporation` on `SLAPSIPSpvLoan` with the articles hash. |
| ☐ Confirm StoryScan | Each contract should show "Verified" source code badge on StoryScan. |
| ☐ Archive deployment config | Store `deployment-config.*.json` in a secure, backed-up location. |

---

## 6. Troubleshooting

### "Couldn't download compiler version list"

The Solidity compiler must be downloaded from the internet. This error means the CI runner lacks network access to `binaries.soliditylang.org`. This should not occur on GitHub-hosted runners. If running locally, check your network proxy settings.

### "Insufficient funds"

The deployer wallet does not hold enough gas. Fund it and re-run the workflow.

### "DEPLOYER_PRIVATE_KEY not set"

The GitHub Secret was not found. Verify the secret name exactly matches `DEPLOYER_PRIVATE_KEY` (case-sensitive) in **Settings → Secrets and variables → Actions**.

### "Nonce too low" / "replacement transaction underpriced"

A previous deployment transaction is stuck in the mempool. Either:
- Wait for it to confirm, then re-run.
- Or speed it up by sending a 0 ETH transaction from the deployer address with a higher gas price.

### "Already Verified" during verification

This is not an error — the contract source was already submitted. The workflow counts this as a success.

### Signature verification fails

Run `node scripts/verify-multisig.cjs` and check:
- The signature was produced from the correct wallet address.
- The signature used `personal_sign` (EIP-191), not `eth_sign` (raw hash).
- The `eip191Hash` in `signature-morpho-config.json` matches what was signed.

---

## Appendix A — Contract Addresses Reference

### Protocol Addresses (hardcoded in contracts)

| Constant | Address | Network |
|----------|---------|---------|
| `MORPHO_BLUE` | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` | Base L2 |
| `STORY_REGISTRY` | `0x1a9d0d28a0422F26D31Be72Edc6f13ea4371E11B` | Story Protocol |
| `STORY_LICENSING` | `0xd81fd78f557b457b4350cB95D20b547bFEb4D857` | Story Protocol |
| `STORY_ROYALTY` | `0xcc8b9f0c9dC370ED1F41D95f74C9F72E08f24C90` | Story Protocol |
| `MR_IPID` | `0x98971c660ac20880b60F86Cc3113eBd979eb3aAE` | Story Protocol |
| `BASE_USDC` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Base L2 |

### Multi-Sig Signers

| Label | Address |
|-------|---------|
| ThirdWeb | `0xe45572Dc828eF0E46D852125f0743938aABe1e12` |
| Coinbase | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |

---

## Appendix B — Quick Command Reference

```bash
# Compile all 11 contracts
npm run contracts:compile

# Local deployment test (Hardhat in-memory — no gas needed)
npm run contracts:test

# Deploy to Story Protocol mainnet
npm run contracts:deploy:story

# Deploy to Base L2 mainnet
npm run contracts:deploy:base

# Verify contracts on StoryScan
npm run contracts:verify:story

# Verify contracts on Basescan
npm run contracts:verify:base

# Generate Morpho multi-sig transaction config
npm run contracts:multisig

# Anchor UCC-1 signature hash (EIP-191)
node scripts/anchor-signature.cjs

# Verify both multi-sig signatures locally
node scripts/verify-multisig.cjs

# Start local Hardhat node (for manual testing)
npm run contracts:node
```
