# MyEtherWallet UCC-1 Morpho Protocol Signing Workflow

**Gladiator Holdings LLC / Millionaire Resilience LLC**  
**2-of-2 Multi-Signature Required Before Smart Contract Deployment**

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites Checklist](#prerequisites-checklist)
3. [Step 1: Generate Signature Payload](#step-1-generate-signature-payload)
4. [Step 2: Sign with Story Protocol Deployer Wallet](#step-2-sign-with-story-protocol-deployer-wallet)
5. [Step 3: Sign with Coinbase Wallet](#step-3-sign-with-coinbase-wallet)
6. [Step 4: Verify Both Signatures](#step-4-verify-both-signatures)
7. [Step 5: Proceed to Deployment](#step-5-proceed-to-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Reference: Transaction Hashes](#reference-transaction-hashes)

---

## Overview

### Why This Is Required

Morpho Protocol requires **2-of-2 cryptographic signatures** from both designated wallet holders before:
- The Morpho Blue market positions can be activated
- Smart contracts can be deployed to StoryScan (Story Protocol) and BaseScan (Base L2)

### Signers Required

| Role | Wallet | Address |
|------|--------|---------|
| **Signer 1** | Story Protocol Deployer | `0x597856e93f19877a399f686D2F43b298e2268618` |
| **Signer 2** | Coinbase Wallet | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |

### What Gets Signed

```
UCC-1 Filing Details:
├── Signer Name:     Clifton Kelly Bell
├── Document Type:   UCC-1_FINANCING_STATEMENT
├── IPFS CID:        bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a
├── Filing Number:   20260000078753
├── Jurisdiction:    New Mexico Secretary of State
└── Secured Party:   Morpho Protocol
```

### Loan Positions Being Authorized

| Loan | Principal | Collateral | APR | LLTV |
|------|-----------|------------|-----|------|
| Loan 1 | $5,000,000 USDC | BTC | 4.00% | 86% |
| Loan 2 | $1,000,000 USDC | ETH | 6.00% | 86% |

---

## Prerequisites Checklist

Before starting, ensure you have:

```
☐ Access to Story Protocol Deployer wallet (0x597856e9...)
☐ Access to Coinbase Wallet (0xDc2aFCd0...)
☐ Node.js v18+ installed
☐ Repository cloned: git clone https://github.com/Slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
☐ Dependencies installed: npm install
☐ Browser with MetaMask OR Coinbase Wallet extension installed
```

---

## Step 1: Generate Signature Payload

### 1.1 Run the Anchor Signature Script

```bash
cd Millionaire-Resilience-LLC-JAH
node scripts/anchor-signature.cjs
```

### 1.2 Verify Output File Created

This creates `signature-morpho-config.json`:

```json
{
  "generatedAt": "2026-04-05T00:00:00.000Z",
  "signer": "Clifton Kelly Bell",
  "documentType": "UCC-1_FINANCING_STATEMENT",
  "ucc1Cid": "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",
  "timestamp": 1743811200,
  "signatureHash": "0x<64-character-hex-hash>",
  "eip191Hash": "0x<64-character-hex-hash-to-sign>",
  "signatures": {
    "story": null,
    "coinbase": null
  }
}
```

### 1.3 Copy the `eip191Hash` Value

**IMPORTANT:** Copy the ENTIRE `eip191Hash` value including the `0x` prefix.

Example: `0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b`

---

## Step 2: Sign with Story Protocol Deployer Wallet

### Method A: MyEtherWallet (Recommended GUI Method)

#### 2.1 Open MyEtherWallet

1. Go to **https://www.myetherwallet.com**
2. Click **"Access My Wallet"** (top right)

#### 2.2 Connect Your Wallet

1. Select **"Browser Extension"** (for MetaMask)
2. In MetaMask popup:
   - Ensure you're on the account: `0x597856e93f19877a399f686D2F43b298e2268618`
   - If not, click the account icon and switch accounts
3. Click **"Connect"** to approve the connection

#### 2.3 Navigate to Sign Message

1. In the left sidebar, click **"Message"**
2. Or go directly to: **Tools → Sign Message**

#### 2.4 Sign the Message

1. In the **"Message"** text box, paste the `eip191Hash` value:
   ```
   0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b
   ```

2. Click **"Sign Message"**

3. MetaMask popup appears:
   - Review the message hash
   - Click **"Sign"**

4. **Copy the signature** - It will be a 132-character hex string:
   ```
   0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b
   ```

#### 2.5 Save the Story Deployer Signature

Update `signature-morpho-config.json`:

```json
{
  "signatures": {
    "story": "0x<paste-your-132-char-signature-here>",
    "coinbase": null
  }
}
```

### Method B: Command Line (cast - Foundry)

```bash
# Load environment variables
source .env

# Get the hash to sign
EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")

# Sign with Story deployer private key
cast wallet sign \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --no-hash \
  "$EIP191_HASH"
```

### Method C: Programmatic (ethers.js)

```javascript
const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

const config = JSON.parse(fs.readFileSync("signature-morpho-config.json", "utf8"));
const eip191Hash = config.eip191Hash;

async function signWithStoryDeployer() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.storyrpc.io");
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  
  const rawBytes = ethers.getBytes(eip191Hash);
  const signature = await wallet.signMessage(rawBytes);
  
  console.log("Story deployer signature:", signature);
  
  // Update config file
  config.signatures.story = signature;
  fs.writeFileSync("signature-morpho-config.json", JSON.stringify(config, null, 2));
}

signWithStoryDeployer();
```

---

## Step 3: Sign with Coinbase Wallet

### Method A: MyEtherWallet + Coinbase Wallet Extension (Recommended)

#### 3.1 Open MyEtherWallet

1. Go to **https://www.myetherwallet.com**
2. Click **"Access My Wallet"**

#### 3.2 Connect Coinbase Wallet

1. Select **"Browser Extension"**
2. If prompted, choose **"Coinbase Wallet"** from the wallet list
3. In Coinbase Wallet popup:
   - Ensure you're on account: `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a`
   - Click **"Connect"**

#### 3.3 Sign the Message

1. Navigate to **Tools → Sign Message**
2. Paste the **SAME** `eip191Hash` value used in Step 2:
   ```
   0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b
   ```
3. Click **"Sign Message"**
4. Coinbase Wallet popup appears:
   - Review the message
   - Click **"Sign"**
5. **Copy the signature** (132-character hex string)

#### 3.4 Save the Coinbase Signature

Update `signature-morpho-config.json`:

```json
{
  "signatures": {
    "story": "0x<story-deployer-signature>",
    "coinbase": "0x<paste-your-coinbase-signature-here>"
  }
}
```

### Method B: Coinbase Wallet Mobile App

1. Open Coinbase Wallet app on your phone
2. Go to **Settings → Developer → Sign Message**
3. Paste the `eip191Hash` value
4. Tap **Sign**
5. Copy the resulting signature

### Method C: Coinbase Wallet SDK (Programmatic)

```javascript
const { CoinbaseWalletSDK } = require("@coinbase/wallet-sdk");
const { ethers } = require("ethers");
const fs = require("fs");

const config = JSON.parse(fs.readFileSync("signature-morpho-config.json", "utf8"));

const sdk = new CoinbaseWalletSDK({
  appName: "Millionaire Resilience LLC",
  appLogoUrl: "https://millionaire-resilience.com/logo.png",
});

const ethereum = sdk.makeWeb3Provider();
const provider = new ethers.BrowserProvider(ethereum);

async function signWithCoinbase() {
  const signer = await provider.getSigner();
  const rawBytes = ethers.getBytes(config.eip191Hash);
  const signature = await signer.signMessage(rawBytes);
  
  console.log("Coinbase signature:", signature);
  
  config.signatures.coinbase = signature;
  fs.writeFileSync("signature-morpho-config.json", JSON.stringify(config, null, 2));
}

signWithCoinbase();
```

---

## Step 4: Verify Both Signatures

### 4.1 Update multisig-transaction.json

Create or update `multisig-transaction.json`:

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-04-05T00:00:00.000Z",
  "morphoBlue": "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
  "ucc1FilingNumber": "20260000078753",
  "ucc1Cid": "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",
  "loans": [
    {
      "type": "BTC",
      "principal": 5000000,
      "apr": 400,
      "lltv": 860000000000000000
    },
    {
      "type": "ETH", 
      "principal": 1000000,
      "apr": 600,
      "lltv": 860000000000000000
    }
  ],
  "signatures": [
    {
      "signer": "0x597856e93f19877a399f686D2F43b298e2268618",
      "label": "Story",
      "signature": "0x<story-signature>",
      "verified": false
    },
    {
      "signer": "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
      "label": "Coinbase",
      "signature": "0x<coinbase-signature>",
      "verified": false
    }
  ],
  "multisigTxHashes": {
    "base": "0x6e58e294b02ff40293a67b7011b17c9df8b83f6c205fc24d379fd73a28c3d74e",
    "story": "0x60c455a95bcaecb4396a20bc3ed24ba574b91de4bd684148f7fd1e1a115e2db0"
  }
}
```

### 4.2 Run Verification Script

```bash
node scripts/verify-multisig.cjs
```

### 4.3 Expected Output (Success)

```
============================================================
Morpho Multi-Sig — On-Chain Signature Verification
============================================================

Message details:
  Signer:        Clifton Kelly Bell
  Document:      UCC-1_FINANCING_STATEMENT
  UCC-1 CID:     bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a
  Raw hash:      0x<64-char hash>
  EIP-191 hash:  0x<64-char eip191Hash>

Verifying Story (0x597856e9...):
  Recovered:    0x597856e93f19877a399f686D2F43b298e2268618
  ✓  Signature valid — signer address matches

Verifying Coinbase (0xDc2aFCd0...):
  Recovered:    0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a
  ✓  Signature valid — signer address matches

============================================================
✓ 2/2 signatures verified — ready to submit to Morpho
============================================================
```

**Exit code 0 = Both signatures verified successfully!**

---

## Step 5: Proceed to Deployment

Once both signatures are verified, you can deploy:

### 5.1 Add GitHub Secrets

Ensure these secrets are set in your GitHub repository environments:

| Secret | Environment |
|--------|-------------|
| `DEPLOYER_PRIVATE_KEY` | `story-mainnet`, `base-mainnet` |
| `STORYSCAN_API_KEY` | `story-mainnet` |
| `ETHERSCAN_API_KEY` | `base-mainnet` |

### 5.2 Trigger Deployment

**Option A: Push to main branch**
```bash
git add signature-morpho-config.json multisig-transaction.json
git commit -m "chore: add verified multi-sig signatures for Morpho Protocol"
git push origin main
```

**Option B: Manual trigger via GitHub Actions**
1. Go to https://github.com/Slaps6331-cell/Millionaire-Resilience-LLC-JAH/actions
2. Click **"Deploy Smart Contracts"**
3. Click **"Run workflow"**
4. Select: Network: `both`, Verify: `true`, Dry run: `false`

### 5.3 Deployment Order

The workflow automatically:

1. **Compile** all 12 contracts
2. **Deploy to Story Protocol** (Chain 1514)
   - StoryAttestationService
   - StoryOrchestrationService
   - StoryAttestationBridge
   - All other contracts...
3. **Deploy to Base L2** (Chain 8453)
   - GladiatorHoldingsSpvLoan
   - SLAPSIPSpvLoan
   - Morpho market creation...
4. **Verify** on StoryScan and BaseScan
5. **Post-deployment orchestration**
   - UCC-1 filing integration
   - IP asset registration
   - PIL license binding

---

## Troubleshooting

### Common Errors and Fixes

| Error | Cause | Solution |
|-------|-------|----------|
| `✗ No valid signature provided` | Signature field is null | Complete signing for that wallet |
| `✗ Signature INVALID — recovered address does not match` | Wrong wallet signed | Re-sign with correct wallet |
| `ERROR: signature-morpho-config.json not found` | Script not run | Run `node scripts/anchor-signature.cjs` |
| `Failed to parse or recover signature` | Malformed signature | Ensure full 132-char hex copied |
| MetaMask shows different account | Wrong account selected | Switch to correct account in MetaMask |

### Signature Format Verification

A valid signature should:
- Start with `0x`
- Be exactly 132 characters total (0x + 130 hex chars)
- Example: `0x1234...abcd1b` (where `1b` or `1c` is the v value)

### If Signature Recovery Fails

1. Ensure you're signing the **exact** `eip191Hash` value
2. Don't modify or trim the hash
3. Use `--no-hash` flag with cast (hash is already EIP-191 prefixed)
4. Try signing again with a fresh browser session

---

## Reference: Transaction Hashes

### Story Protocol (StoryScan - Chain 1514)

| Contract | Pre-deployment tx hash |
|----------|----------------------|
| StoryAttestationService | `0x0b09f27824e6d28fe1f7f99e1de371fb51102351a1073fc2374e5bf536fc995f` |
| StoryOrchestrationService | `0x069c423ec29b0afb20cf90796a51994ca3687b72cc1ac4cdc54a11da245cda8f` |
| PILLoanEnforcement | `0x0433a3675178751956ce75cf8ea37600247d63ffa1e08a8ae971ea85ae3686fe` |
| ResilienceToken | `0x57b781319a87a8ae97eca27fb1c70872ea8349beaceb6f46a68fc4143a7129db` |
| AngelCoin | `0x43c9a6a5fabd3ca7ed13256666865bd1c3d7729409457ff3a0766e3f92572c26` |
| registerIpAsset_MR | `0x7d4f4e9c08269e73077cbc7aa3c2b2a8337c5498256a8ab863094524200e6160` |
| bindPILTerms_MR | `0x112914ca499c8e4a39af5cff45f3de82af854d3c01fe2d48d8b1122f53f9158e` |

### Base L2 (BaseScan - Chain 8453)

| Contract | Pre-deployment tx hash |
|----------|----------------------|
| GladiatorHoldingsSpvLoan | `0x5cd1a8cab40e5d54b92f8ba159da52069ea24ccc71c62804b9b8ec5031a1b3b8` |
| SLAPSIPSpvLoan | `0x877d4f233e3d874ccef82b8cbbe9aa388aec5042d4dbb585ed5add53f5e8e7c5` |
| StablecoinIPEscrow | `0xf051c5b1651e992d55a10ddf6c0714a38335185e58bd156445645fd8221204c8` |
| PILLoanEnforcement | `0x2a7de548929ce2873fecf9f8c0d415ac325a739687bae7a87d89469cff62762f` |
| AngelCoin | `0x7ec3c48ec1bac3f43bb7935eeb6563a065768b6b1da91dbe9f519fcb655f05ad` |
| ResilienceToken | `0x5628f5c88541999c68e4366d17958a07f3388b8cc92041975a7aea76ceef989f` |
| createMorphoMarket_BTC | `0x332e0620103288881e9b2654a98262ed41f482a8e8307a38a7a15118d6e6ccb4` |
| createMorphoMarket_ETH | `0xee2a02919260758547093f4e0e89bde8b1ccc2bd8835c9e5b88b55f1ad1c34cb` |

### Multi-sig Transaction Hashes (to be signed)

| Network | Multi-sig tx hash |
|---------|------------------|
| Base L2 | `0x6e58e294b02ff40293a67b7011b17c9df8b83f6c205fc24d379fd73a28c3d74e` |
| Story Protocol | `0x60c455a95bcaecb4396a20bc3ed24ba574b91de4bd684148f7fd1e1a115e2db0` |

---

## Quick Reference Checklist

```
PRE-SIGNING
  ☐ Repository cloned and dependencies installed
  ☐ node scripts/anchor-signature.cjs executed
  ☐ eip191Hash value copied from signature-morpho-config.json

STORY PROTOCOL DEPLOYER (0x597856e93f19877a399f686D2F43b298e2268618)
  ☐ Connected to MyEtherWallet with correct account
  ☐ Pasted eip191Hash into Sign Message field
  ☐ Clicked Sign and approved in MetaMask
  ☐ Copied 132-char signature
  ☐ Updated signature-morpho-config.json → signatures.story

COINBASE WALLET (0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a)
  ☐ Connected to MyEtherWallet with Coinbase Wallet
  ☐ Pasted SAME eip191Hash into Sign Message field
  ☐ Clicked Sign and approved in Coinbase Wallet
  ☐ Copied 132-char signature
  ☐ Updated signature-morpho-config.json → signatures.coinbase

VERIFICATION
  ☐ node scripts/verify-multisig.cjs executed
  ☐ Output shows "✓ 2/2 signatures verified"
  ☐ Exit code is 0

DEPLOYMENT
  ☐ GitHub Secrets configured (DEPLOYER_PRIVATE_KEY, API keys)
  ☐ Committed signature files to repository
  ☐ Pushed to main branch OR triggered GitHub Actions manually
  ☐ Monitored deployment at GitHub Actions page
  ☐ Verified contracts on StoryScan and BaseScan
```

---

## Support

- **Repository:** https://github.com/Slaps6331-cell/Millionaire-Resilience-LLC-JAH
- **StoryScan:** https://www.storyscan.io
- **BaseScan:** https://basescan.org
- **MyEtherWallet:** https://www.myetherwallet.com
- **Morpho Protocol:** https://morpho.org

---

*Document Version: 1.0.0*  
*Last Updated: April 2026*
