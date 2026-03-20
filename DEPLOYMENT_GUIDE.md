# Smart Contract Deployment Guide
## Millionaire Resilience LLC — Gladiator Holdings Multi-SPV System

> **⚠️ SECURITY FIRST — Read before sharing or storing any credentials**
>
> API keys, JWT tokens, and private keys must **never** be pasted into:
> - GitHub issue or PR comments
> - The problem statement of any AI coding assistant
> - Chat messages, emails, or documents shared with third parties
> - Source code files (including `.env` — use `.env.example` for templates only)
>
> If credentials have already been exposed in any of the above, **revoke and rotate
> them immediately** before proceeding. See [SECURITY.md](SECURITY.md) for the
> step-by-step incident response procedure.

This guide covers:
1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [GitHub Secrets Setup](#2-github-secrets-setup)
3. [On-Chain Signature Verification — Morpho Multi-Sig](#3-on-chain-signature-verification--morpho-multi-sig)
4. [Running the Deployment](#4-running-the-deployment)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Troubleshooting](#6-troubleshooting)
7. [GitHub Pages Configuration](#7-github-pages-configuration)
8. [Deploying with GitHub CLI (`gh`)](#8-deploying-with-github-cli-gh)

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
| **ThirdWeb** | `0xCD67f7e86A1397aBc33C473c58662BEB83b7a667` | ThirdWeb Embedded Wallet |
| **Coinbase** | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` | Coinbase Wallet (smart wallet or EOA) |

Both wallet holders must be available and ready to sign when the deployment reaches the Morpho multi-sig step.

### 1.3 API Keys Required

Gather the following before starting. All will be stored as GitHub Secrets — **never in source code**.

| Key | Where to obtain |
|-----|-----------------|
| `DEPLOYER_PRIVATE_KEY` | See §1.4 — create a **dedicated Ethereum wallet** and export its private key |
| `ALCHEMY_API_KEY` | <https://dashboard.alchemy.com> → Create App → Network: Story Protocol **and** Base → copy API key |
| `STORYSCAN_API_KEY` | <https://storyscan.xyz> → Register → API Keys |
| `ETHERSCAN_API_KEY` | <https://etherscan.io/myapikey> (also valid for Basescan) |
| `COINBASE_API_KEY_NAME` | <https://portal.cdp.coinbase.com/access/api> → Create API key → copy **Key Name** (UUID) |
| `COINBASE_API_KEY_PRIVATE_KEY` | Same page → copy **Private Key** (EC key in PEM format) |
| `STORY_RPC_URL` *(optional)* | Alchemy Story Protocol endpoint — auto-constructed from `ALCHEMY_API_KEY` if set |
| `BASE_RPC_URL` *(optional)* | Alchemy Base endpoint — auto-constructed from `ALCHEMY_API_KEY` if set |
| `THIRDWEB_CLIENT_ID` | <https://thirdweb.com/dashboard> → Settings → API Keys |
| `THIRDWEB_SECRET_KEY` | Same dashboard as above |
| `PINATA_JWT` | <https://app.pinata.cloud> → API Keys → New Key |

> **Coinbase CDP API keys vs. Ethereum private key**
>
> `COINBASE_API_KEY_NAME` / `COINBASE_API_KEY_PRIVATE_KEY` are Coinbase Developer Platform
> web-service credentials. They authenticate REST API calls to Coinbase's backend (e.g. CDP
> wallet management, IPFS pinning) and are **not** used to sign on-chain transactions.
> The `DEPLOYER_PRIVATE_KEY` (a 64-character hex Ethereum private key) is still required
> to sign and broadcast contract deployments to the blockchain.

### 1.4 Creating the Deployer Wallet (Ethereum Private Key)

> **⚠️ Important distinction**: A Coinbase API key (a UUID like
> `04c523e7-73f7-49ab-99af-0cacf80d4831`) is **not** an Ethereum private key and
> **cannot** be used to deploy contracts. These are two completely different things.

A **Coinbase API key** is a web-service credential for the Coinbase Developer Platform
API. It authenticates REST API calls to Coinbase's backend services.

A **deployer private key** is the 32-byte (64 hex character) secret that controls an
Ethereum wallet address. It is used to cryptographically sign deployment transactions
submitted directly to the blockchain.

**How to create a dedicated deployer wallet and export its private key:**

**Option A — MetaMask (recommended for most users):**
1. Open MetaMask → click the account circle → **Add account or hardware wallet**.
2. Choose **Add a new account** → name it "MR Deployer".
3. Click the three-dot menu next to the new account → **Account details**.
4. Click **Show private key** → enter your MetaMask password.
5. Copy the 64-character hex string (starts with `0x`). This is your `DEPLOYER_PRIVATE_KEY`.

**Option B — Cast (Foundry) command line:**
```bash
cast wallet new
# Output:
# Address:     0xYourNewAddress
# Private key: 0xYour64CharHexPrivateKey
```

**Option C — Node.js one-liner (requires ethers installed):**
```bash
node -e "const { ethers } = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Key:', w.privateKey);"
```

In all cases, the private key will be exactly **66 characters long** ("`0x`" + 64 hex digits), for example:
```
0x4c0883a69102937d6231471b5dbb6e538eba2ef666039b34ca3b68e2e2ab9638
```

Fund this wallet with gas before running the deployment (see §1.1).

> **After deployment**: rotate this key — see the post-deployment checklist in §5.5.

---

## 2. GitHub Secrets Setup

All sensitive credentials are stored as **encrypted GitHub repository secrets**. They are injected into the deployment workflow at runtime and are never logged or committed.

### Option A — GitHub CLI (recommended)

If you have the [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`), you can set every secret from the command line without touching the browser.

```bash
# Set each secret — gh will prompt you for the value so it never appears in
# your shell history.  Alternatively pipe the value via stdin (see below).
gh secret set DEPLOYER_PRIVATE_KEY
gh secret set ALCHEMY_API_KEY
gh secret set COINBASE_API_KEY_NAME
gh secret set COINBASE_API_KEY_PRIVATE_KEY
gh secret set STORYSCAN_API_KEY
gh secret set ETHERSCAN_API_KEY
gh secret set STORY_RPC_URL        # optional — only if not using ALCHEMY_API_KEY
gh secret set BASE_RPC_URL         # optional — only if not using ALCHEMY_API_KEY
gh secret set THIRDWEB_CLIENT_ID
gh secret set THIRDWEB_SECRET_KEY
gh secret set PINATA_JWT
```

To pass a value non-interactively (e.g. in a setup script), pipe it via stdin:

```bash
echo "$MY_PRIVATE_KEY" | gh secret set DEPLOYER_PRIVATE_KEY
```

Set the optional repository **variables** (public wallet addresses — not secrets):

```bash
gh variable set THIRDWEB_WALLET_ADDRESS --body "0xCD67f7e86A1397aBc33C473c58662BEB83b7a667"
gh variable set COINBASE_WALLET_ADDRESS --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"
gh variable set UCC1_FILING_NUMBER      --body "2024-NM-UCC-0001"
```

Confirm everything was saved:

```bash
gh secret list
gh variable list
```

### Option B — GitHub web UI

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
| `DEPLOYER_PRIVATE_KEY` | 64-hex-char private key of the wallet paying deployment gas. **Must start with `0x`. This is NOT a Coinbase API key UUID.** See §1.4. | Story + Base deployment |
| `ALCHEMY_API_KEY` | Alchemy API key — the workflow uses this to auto-build both Story (`https://story-mainnet.g.alchemy.com/v2/<key>`) and Base (`https://base-mainnet.g.alchemy.com/v2/<key>`) RPC URLs. Obtain at <https://dashboard.alchemy.com>. | Story + Base deployment (recommended) |
| `COINBASE_API_KEY_NAME` | Coinbase Developer Platform API key name (UUID). Used to authenticate CDP services (e.g. IPFS, wallet APIs). Obtain at <https://portal.cdp.coinbase.com/access/api>. | Base deployment / CDP services |
| `COINBASE_API_KEY_PRIVATE_KEY` | Coinbase CDP API private key (EC key in PEM format). Paired with `COINBASE_API_KEY_NAME`. Same portal as above. | Base deployment / CDP services |
| `STORYSCAN_API_KEY` | StoryScan API key for contract source verification | Story deployment |
| `ETHERSCAN_API_KEY` | Etherscan/Basescan API key for contract source verification | Base deployment |
| `STORY_RPC_URL` | Override Story Protocol RPC URL. Only needed if you want to use a non-Alchemy endpoint. Auto-constructed from `ALCHEMY_API_KEY` when set. | Story deployment |
| `BASE_RPC_URL` | Dedicated Base L2 RPC endpoint *(defaults to public if omitted, or Alchemy if `ALCHEMY_API_KEY` is set)* | Base deployment |
| `THIRDWEB_CLIENT_ID` | ThirdWeb project client ID | ThirdWeb wallet integration |
| `THIRDWEB_SECRET_KEY` | ThirdWeb project secret key | ThirdWeb wallet integration |
| `PINATA_JWT` | Pinata IPFS JWT token | IPFS document pinning |

### Optional Repository Variables (not secrets — public wallet addresses)

Navigate to **Settings → Secrets and variables → Actions → Variables tab** and add:

| Variable Name | Value |
|---------------|-------|
| `THIRDWEB_WALLET_ADDRESS` | `0xCD67f7e86A1397aBc33C473c58662BEB83b7a667` |
| `COINBASE_WALLET_ADDRESS` | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |
| `UCC1_FILING_NUMBER` | Official UCC-1 filing number assigned by the NM SOS (e.g. `2024-NM-UCC-0001`) |

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

1. Open the [ThirdWeb Dashboard](https://thirdweb.com/dashboard) and connect the wallet at `0xCD67f7e86A1397aBc33C473c58662BEB83b7a667`.
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
    "thirdweb": "0xCD67f7e86A1397aBc33C473c58662BEB83b7a667",
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
      "signer":    "0xCD67f7e86A1397aBc33C473c58662BEB83b7a667",
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

Verifying ThirdWeb (0xCD67f7...):
  Recovered:    0xCD67f7e86A1397aBc33C473c58662BEB83b7a667
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

Before deploying to mainnet, always run a dry-run compile to catch any Solidity compilation errors.

**GitHub CLI (recommended):**

```bash
gh workflow run deploy-contracts.yml \
  --field network=story \
  --field verify=true \
  --field dry_run=true
```

Watch the run in real time:

```bash
gh run watch
```

**GitHub web UI:**

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

**GitHub CLI:**

```bash
gh workflow run deploy-contracts.yml \
  --field network=story \
  --field verify=true \
  --field dry_run=false
```

Then watch progress and approve the `story-mainnet` environment gate:

```bash
# Stream live logs
gh run watch

# Or view a compact summary of all steps
gh run view --log
```

> The `story-mainnet` **environment protection gate** requires a human approval before deployment begins. Open the run URL printed by `gh run watch` (or `gh run list`) and click **Review deployments → Approve**, or run `gh run view` and follow the approval link.

**GitHub web UI:**

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

**GitHub CLI:**

```bash
gh workflow run deploy-contracts.yml \
  --field network=base \
  --field verify=true \
  --field dry_run=false
```

Approve the `base-mainnet` environment gate the same way as §4.2. The workflow targets `base-mainnet` and verifies contracts on Basescan.

**GitHub web UI:** Repeat §4.2 with **Network** set to `base`.

### 4.4 Deploy to Both Networks Simultaneously

**GitHub CLI:**

```bash
gh workflow run deploy-contracts.yml \
  --field network=both \
  --field verify=true \
  --field dry_run=false
```

**GitHub web UI:** Set **Network** to `both`.

The `deploy-story` and `deploy-base` jobs run in parallel.

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

**GitHub CLI:**

```bash
# List recent runs to find the run number
gh run list --workflow=deploy-contracts.yml

# Download all artifacts from a specific run (replace <run-id> with the ID
# printed by the command above)
gh run download <run-id>

# Or download a specific artifact by name
gh run download <run-id> --name deployment-story-<run-number>
gh run download <run-id> --name deployment-base-<run-number>
```

**GitHub web UI:**

1. In the completed workflow run, scroll to **Artifacts**.
2. Download `deployment-story-<run#>` (contains `deployment-config.story.json`, `multisig-transaction.json`, and `registration-attestation.story.json`).
3. Save these files securely — they are the authoritative record of deployed addresses.

### 5.3 Registration Attestation & Orchestration

The workflow automatically runs `scripts/post-deploy-orchestrate.cjs` after each deployment. This script:

1. Connects to the deployed `StoryOrchestrationService` and calls `setAttestationServiceAddress(sasAddress)` — wires the SOS to the SAS.
2. Calls `setSpvLoanContractAddress(slapsLoanAddress)` — wires the SPV loan contract into the SOS.
3. Calls `StoryAttestationService.registerSAS(contractHash)` — marks the SAS as registered on the hermetic seal.
4. Calls `StoryAttestationService.registerSOS(contractHash)` — marks the SOS as registered.
5. Records the UCC-1 filing number and jurisdiction on-chain.
6. Emits a `RegistryRequestSubmitted` event for StoryScan indexing.

The output is saved to `registration-attestation.<network>.json` and uploaded as a workflow artifact. The job summary includes a table of all transaction hashes and a final registry status row.

**To run orchestration manually (after a deployment that skipped it):**

```bash
# Story Protocol
npx hardhat run scripts/post-deploy-orchestrate.cjs --network story

# Base L2
npx hardhat run scripts/post-deploy-orchestrate.cjs --network base
```

Or via npm:

```bash
npm run contracts:orchestrate:story
npm run contracts:orchestrate:base
```

The script is idempotent — steps that are already complete (e.g. `SAS already registered`) are skipped gracefully.

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
| Ethereum Mainnet | [etherscan.io](https://etherscan.io) | Automatic via `npm run contracts:verify:mainnet` |

If automatic verification fails, manually verify:
```bash
npx hardhat verify --network story <CONTRACT_ADDRESS>
npx hardhat verify --network base <CONTRACT_ADDRESS>
npx hardhat verify --network mainnet <CONTRACT_ADDRESS>
```

### 5.6 Post-Deployment Security Checklist

| Check | Action |
|-------|--------|
| ☐ Rotate deployer key | After deployment, the deployer private key should no longer be needed. Remove it from GitHub Secrets and consider revoking the wallet. |
| ☐ Transfer ownership | Call `transferOwnership(<multisig_address>)` on each deployed contract to hand control to the multi-sig wallets. |
| ☐ Verify `onlyOwner` functions | Test that each `onlyOwner` function reverts from non-owner addresses. |
| ✅ Set contract addresses | Automated by `post-deploy-orchestrate.cjs` — `setAttestationServiceAddress` and `setSpvLoanContractAddress` are called in the workflow. |
| ✅ Register SAS/SOS | Automated by `post-deploy-orchestrate.cjs` — `registerSAS` and `registerSOS` are called in the workflow. |
| ☐ Record auxiliary docs | Call `recordArticlesOfIncorporation` on `SLAPSIPSpvLoan` with the articles hash. |
| ☐ Confirm StoryScan | Each contract should show "Verified" source code badge on StoryScan. |
| ☐ Archive deployment config | Store `deployment-config.*.json` and `registration-attestation.*.json` in a secure, backed-up location. |

---

## 6. Troubleshooting

### "Couldn't download compiler version list"

The Solidity compiler must be downloaded from the internet. This error means the CI runner lacks network access to `binaries.soliditylang.org`. This should not occur on GitHub-hosted runners. If running locally, check your network proxy settings.

### "Insufficient funds"

The deployer wallet does not hold enough gas. Fund it and re-run the workflow.

### "DEPLOYER_PRIVATE_KEY not set"

The GitHub Secret was not found. Verify the secret name exactly matches `DEPLOYER_PRIVATE_KEY` (case-sensitive) in **Settings → Secrets and variables → Actions**.

### "Invalid private key" / "could not detect network"

The `DEPLOYER_PRIVATE_KEY` value is malformed. Common causes:
- You used a **Coinbase API key UUID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) instead of an Ethereum private key. These are two different things — see §1.4.
- You copied the private key without the `0x` prefix. Add `0x` to the start.
- You included extra whitespace or quotes in the secret value.

The value stored in the `DEPLOYER_PRIVATE_KEY` secret must be exactly **66 characters** long: `0x` followed by 64 lowercase hex characters.

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

## 7. GitHub Pages Configuration

The repository publishes a static informational site via GitHub Pages from the
`docs/` folder on the `main` branch. Full configuration instructions are
provided in [GITHUB_PAGES.md](GITHUB_PAGES.md). A summary is given below.

### 7.1 Enabling GitHub Pages

1. Go to **Settings → Pages** in the repository.
2. Under **Build and deployment → Source**, select **Deploy from a branch**.
3. Set the branch to **`main`** and the folder to **`/docs`**.
4. Click **Save**.

After ~1–2 minutes the site will be live at:
```
https://slaps6331-cell.github.io/Millionaire-Resilience-LLC-JAH/
```

### 7.2 Automated Deployment

A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) automatically
deploys the `docs/` folder to GitHub Pages on every push to `main`. No secrets
or API keys are required—deployment uses the built-in `GITHUB_TOKEN`.

To switch from branch-based deployment to the Actions workflow:

1. Go to **Settings → Pages**.
2. Change **Source** to **GitHub Actions**.
3. The next push to `main` will trigger `deploy-pages.yml`.

> **Note:** GitHub Pages hosts a **static informational website only**. It does
> not deploy smart contracts. See §4 (Running the Deployment) for contract deployment.

---

## 8. Deploying with GitHub CLI (`gh`)

All steps in this guide can be performed from the command line using the
[GitHub CLI](https://cli.github.com) (`gh`) instead of the browser UI. This
section mirrors §2 (Secrets Setup) and §4 (Running the Deployment) entirely
from the terminal.

### 8.1 Install and Authenticate

**Install:**

```bash
# macOS
brew install gh

# Windows (winget)
winget install --id GitHub.cli

# Linux (apt)
sudo apt install gh

# Linux (rpm)
sudo dnf install gh
```

**Authenticate:**

```bash
gh auth login
# Follow the prompts:
#   → GitHub.com
#   → HTTPS
#   → Login with a web browser  (or paste a Personal Access Token)
```

Confirm you are targeting the correct repository:

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC"
gh repo view "$REPO"
```

> **Required token scopes**: `repo`, `workflow`, `write:secrets`, `read:org`.
> If you use a Personal Access Token instead of browser login, ensure all four
> scopes are enabled.

---

### 8.2 Set GitHub Secrets

Use `gh secret set` for every credential listed in §2. Each command prompts
you to paste the value, or you can pipe it in non-interactively.

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC"

# Deployer Ethereum private key (prompted — paste your 0x-prefixed key, 66 chars including prefix)
gh secret set DEPLOYER_PRIVATE_KEY --repo "$REPO"

# Alchemy API key
gh secret set ALCHEMY_API_KEY --repo "$REPO"

# Coinbase Developer Platform credentials
gh secret set COINBASE_API_KEY_NAME --repo "$REPO"
gh secret set COINBASE_API_KEY_PRIVATE_KEY --repo "$REPO"

# Block-explorer API keys (for source verification)
gh secret set STORYSCAN_API_KEY --repo "$REPO"
gh secret set ETHERSCAN_API_KEY --repo "$REPO"

# Optional RPC URL overrides (skip if using ALCHEMY_API_KEY)
gh secret set STORY_RPC_URL --repo "$REPO"
gh secret set BASE_RPC_URL --repo "$REPO"

# ThirdWeb credentials
gh secret set THIRDWEB_CLIENT_ID --repo "$REPO"
gh secret set THIRDWEB_SECRET_KEY --repo "$REPO"

# Pinata IPFS JWT
gh secret set PINATA_JWT --repo "$REPO"
```

**Non-interactive (pipe from environment variable):**

```bash
echo "$DEPLOYER_PRIVATE_KEY" | gh secret set DEPLOYER_PRIVATE_KEY --repo "$REPO"
echo "$ALCHEMY_API_KEY"      | gh secret set ALCHEMY_API_KEY      --repo "$REPO"
# … repeat for each secret
```

Verify that all secrets are registered (names only — values are never shown):

```bash
gh secret list --repo "$REPO"
```

---

### 8.3 Set Repository Variables

Use `gh variable set` for the public wallet addresses and filing number (§2):

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC"

gh variable set THIRDWEB_WALLET_ADDRESS \
  --body "0xCD67f7e86A1397aBc33C473c58662BEB83b7a667" \
  --repo "$REPO"

gh variable set COINBASE_WALLET_ADDRESS \
  --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a" \
  --repo "$REPO"

gh variable set UCC1_FILING_NUMBER \
  --body "2024-NM-UCC-0001" \
  --repo "$REPO"
```

---

### 8.4 Create GitHub Environments

The deployment workflow requires `story-mainnet` and `base-mainnet` environments
(§2 — *GitHub Environments*). Create them via the REST API:

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC"

gh api --method PUT "/repos/$REPO/environments/story-mainnet"
gh api --method PUT "/repos/$REPO/environments/base-mainnet"
```

To add a required reviewer (replace `YOUR_GITHUB_USERNAME`):

```bash
REVIEWER_ID=$(gh api /users/YOUR_GITHUB_USERNAME --jq '.id')

gh api --method PUT "/repos/$REPO/environments/story-mainnet" \
  --field "reviewers[][type]=User" \
  --field "reviewers[][id]=$REVIEWER_ID"

gh api --method PUT "/repos/$REPO/environments/base-mainnet" \
  --field "reviewers[][type]=User" \
  --field "reviewers[][id]=$REVIEWER_ID"
```

---

### 8.5 Pre-flight Dry Run

Before deploying to mainnet, compile all contracts without broadcasting any
transactions:

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC"

gh workflow run deploy-contracts.yml \
  --repo "$REPO" \
  --field network=story \
  --field verify=true \
  --field dry_run=true
```

Watch the run to completion:

```bash
gh run watch --repo "$REPO"
```

Or stream the full log:

```bash
gh run view --repo "$REPO" --log
```

---

### 8.6 Deploy to Story Protocol (Chain 1514)

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC"

gh workflow run deploy-contracts.yml \
  --repo "$REPO" \
  --field network=story \
  --field verify=true \
  --field dry_run=false
```

The `story-mainnet` environment protection gate will pause the run. Approve it
from the CLI (requires repo admin or write access):

```bash
# Find the run ID of the pending run
RUN_ID=$(gh run list --repo "$REPO" \
  --workflow deploy-contracts.yml --limit 1 --json databaseId --jq '.[0].databaseId')

# Approve the pending deployment
gh api --method POST \
  "/repos/$REPO/actions/runs/$RUN_ID/pending_deployments" \
  --field "environment_ids[]=$(gh api "/repos/$REPO/environments/story-mainnet" --jq '.id')" \
  --field state=approved \
  --field comment="Approved via gh CLI"
```

Then watch it finish:

```bash
gh run watch "$RUN_ID" --repo "$REPO"
```

---

### 8.7 Deploy to Base L2 (Chain 8453)

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC"

gh workflow run deploy-contracts.yml \
  --repo "$REPO" \
  --field network=base \
  --field verify=true \
  --field dry_run=false
```

Approve the `base-mainnet` environment gate the same way as §8.6.

---

### 8.8 Deploy to Both Networks Simultaneously

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC"

gh workflow run deploy-contracts.yml \
  --repo "$REPO" \
  --field network=both \
  --field verify=true \
  --field dry_run=false
```

The `deploy-story` and `deploy-base` jobs run in parallel. Each environment gate
must be approved separately — run the approval command from §8.6 twice (once for
each pending deployment).

---

### 8.9 Download Deployment Artifacts

After a successful run, download the deployment JSON files:

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC"

# Get the run ID of the most recent deploy run
RUN_ID=$(gh run list --repo "$REPO" \
  --workflow deploy-contracts.yml --limit 1 \
  --json databaseId --jq '.[0].databaseId')

# Download ALL artifacts from that run into ./deployment-artifacts/
gh run download "$RUN_ID" --repo "$REPO" --dir ./deployment-artifacts

# Or download a specific artifact by name
RUN_NUMBER=$(gh run view "$RUN_ID" --repo "$REPO" --json number --jq '.number')
gh run download "$RUN_ID" --repo "$REPO" \
  --name "deployment-story-$RUN_NUMBER" \
  --dir ./deployment-artifacts
```

The downloaded folder will contain:

| File | Contents |
|------|----------|
| `deployment-config.story.json` | All 11 deployed contract addresses on Story Protocol |
| `multisig-transaction.json` | Morpho multi-sig transaction config (see §5.3) |
| `registration-attestation.story.json` | On-chain orchestration tx hashes |
| `deployment-config.base.json` | All 11 deployed contract addresses on Base L2 |
| `registration-attestation.base.json` | On-chain orchestration tx hashes (Base) |

---

### 8.10 One-Shot Setup Script

Save the snippet below to a **temporary file** (never commit it — it reads live
secret values from your environment):

```bash
#!/usr/bin/env bash
# Usage: export each variable, then run:  bash /tmp/setup-gh-secrets.sh
set -euo pipefail

REPO="slaps6331-cell/Millionaire-Resilience-LLC"

echo "── Setting secrets ──────────────────────────────────────"
echo "$DEPLOYER_PRIVATE_KEY"          | gh secret set DEPLOYER_PRIVATE_KEY          --repo "$REPO"
echo "$ALCHEMY_API_KEY"               | gh secret set ALCHEMY_API_KEY               --repo "$REPO"
echo "$COINBASE_API_KEY_NAME"         | gh secret set COINBASE_API_KEY_NAME         --repo "$REPO"
echo "$COINBASE_API_KEY_PRIVATE_KEY"  | gh secret set COINBASE_API_KEY_PRIVATE_KEY  --repo "$REPO"
echo "$STORYSCAN_API_KEY"             | gh secret set STORYSCAN_API_KEY             --repo "$REPO"
echo "$ETHERSCAN_API_KEY"             | gh secret set ETHERSCAN_API_KEY             --repo "$REPO"
echo "$THIRDWEB_CLIENT_ID"            | gh secret set THIRDWEB_CLIENT_ID            --repo "$REPO"
echo "$THIRDWEB_SECRET_KEY"           | gh secret set THIRDWEB_SECRET_KEY           --repo "$REPO"
echo "$PINATA_JWT"                    | gh secret set PINATA_JWT                    --repo "$REPO"

echo "── Setting variables ────────────────────────────────────"
gh variable set THIRDWEB_WALLET_ADDRESS \
  --body "0xCD67f7e86A1397aBc33C473c58662BEB83b7a667" --repo "$REPO"
gh variable set COINBASE_WALLET_ADDRESS \
  --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a" --repo "$REPO"
gh variable set UCC1_FILING_NUMBER \
  --body "${UCC1_FILING_NUMBER:-2024-NM-UCC-0001}" --repo "$REPO"

echo "── Creating environments ────────────────────────────────"
gh api --method PUT "/repos/$REPO/environments/story-mainnet" > /dev/null
gh api --method PUT "/repos/$REPO/environments/base-mainnet"  > /dev/null

echo "✓ All secrets, variables, and environments are configured."
echo "  Run a dry run next:  gh workflow run deploy-contracts.yml --repo $REPO --field network=story --field verify=true --field dry_run=true"
```

Run it:

```bash
bash /tmp/setup-gh-secrets.sh
```

> **Security reminder**: Never save the script with real values embedded. Export
> environment variables in your shell session, then run the script. Delete the
> script file after use.

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
| ThirdWeb | `0xCD67f7e86A1397aBc33C473c58662BEB83b7a667` |
| Coinbase | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |

---

## Appendix B — Quick Command Reference

### npm / Hardhat commands (local)

```bash
# Compile all 11 contracts
npm run contracts:compile

# Local deployment test (Hardhat in-memory — no gas needed)
npm run contracts:test

# Deploy to Story Protocol mainnet
npm run contracts:deploy:story

# Deploy to Base L2 mainnet
npm run contracts:deploy:base

# Deploy to Ethereum mainnet
npm run contracts:deploy:mainnet

# Verify contracts on StoryScan
npm run contracts:verify:story

# Verify contracts on Basescan
npm run contracts:verify:base

# Verify contracts on Etherscan
npm run contracts:verify:mainnet

# Generate Morpho multi-sig transaction config
npm run contracts:multisig

# Anchor UCC-1 signature hash (EIP-191)
node scripts/anchor-signature.cjs

# Verify both multi-sig signatures locally
node scripts/verify-multisig.cjs

# Start local Hardhat node (for manual testing)
npm run contracts:node
```

### GitHub CLI commands

> Requires the [GitHub CLI](https://cli.github.com) installed and authenticated:
> `gh auth login`

```bash
# ── Secrets & variables ─────────────────────────────────────────────────────

# Set all required secrets (gh prompts for each value interactively)
gh secret set DEPLOYER_PRIVATE_KEY
gh secret set ALCHEMY_API_KEY
gh secret set COINBASE_API_KEY_NAME
gh secret set COINBASE_API_KEY_PRIVATE_KEY
gh secret set STORYSCAN_API_KEY
gh secret set ETHERSCAN_API_KEY
gh secret set STORY_RPC_URL          # optional
gh secret set BASE_RPC_URL           # optional
gh secret set THIRDWEB_CLIENT_ID
gh secret set THIRDWEB_SECRET_KEY
gh secret set PINATA_JWT

# Set repository variables (public wallet addresses)
gh variable set THIRDWEB_WALLET_ADDRESS --body "0xCD67f7e86A1397aBc33C473c58662BEB83b7a667"
gh variable set COINBASE_WALLET_ADDRESS --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"
gh variable set UCC1_FILING_NUMBER      --body "2024-NM-UCC-0001"

# Confirm secrets and variables are saved
gh secret list
gh variable list

# ── Triggering deployments ───────────────────────────────────────────────────

# Dry run — compile only, no deployment
gh workflow run deploy-contracts.yml \
  --field network=story \
  --field verify=true \
  --field dry_run=true

# Deploy to Story Protocol mainnet
gh workflow run deploy-contracts.yml \
  --field network=story \
  --field verify=true \
  --field dry_run=false

# Deploy to Base L2 mainnet
gh workflow run deploy-contracts.yml \
  --field network=base \
  --field verify=true \
  --field dry_run=false

# Deploy to both networks simultaneously
gh workflow run deploy-contracts.yml \
  --field network=both \
  --field verify=true \
  --field dry_run=false

# ── Monitoring & artifacts ───────────────────────────────────────────────────

# List recent deployment runs
gh run list --workflow=deploy-contracts.yml

# Stream live logs for the most recent run
gh run watch

# View a completed run summary with step-by-step logs
gh run view --log

# Download all artifacts from a specific run
gh run download <run-id>

# Download a named artifact
gh run download <run-id> --name deployment-story-<run-number>
gh run download <run-id> --name deployment-base-<run-number>
```
