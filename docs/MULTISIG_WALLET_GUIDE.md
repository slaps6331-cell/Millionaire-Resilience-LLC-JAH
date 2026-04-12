# Multi-Signature Wallet Guide
## Safe (Gnosis Safe) + Coinbase Wallet + Story Protocol Deployer

**Millionaire Resilience LLC / Gladiator Holdings LLC**  
**2-of-2 Multi-Signature Configuration for Morpho Protocol**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Wallet Configuration](#2-wallet-configuration)
3. [Safe Multi-Sig Setup](#3-safe-multi-sig-setup)
4. [Signature Workflow](#4-signature-workflow)
5. [MyEtherWallet Signing](#5-myetherwallet-signing)
6. [Coinbase Wallet Signing](#6-coinbase-wallet-signing)
7. [Story Deployer Signing](#7-story-deployer-signing)
8. [Verification Process](#8-verification-process)
9. [Deployment Authorization](#9-deployment-authorization)
10. [Security Best Practices](#10-security-best-practices)
11. [Troubleshooting](#11-troubleshooting)
12. [Quick Reference](#12-quick-reference)

---

## 1. Overview

### Multi-Signature Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    2-OF-2 MULTI-SIGNATURE ARCHITECTURE                       │
│                      Morpho Protocol Loan Authorization                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         ┌─────────────────────┐                              │
│                         │   UCC-1 FILING      │                              │
│                         │   IPFS Document     │                              │
│                         │   CID: bafkrei...   │                              │
│                         └──────────┬──────────┘                              │
│                                    │                                         │
│                                    ▼                                         │
│                         ┌─────────────────────┐                              │
│                         │   EIP-191 HASH      │                              │
│                         │   Message to Sign   │                              │
│                         │   0x43ebfc7d...     │                              │
│                         └──────────┬──────────┘                              │
│                                    │                                         │
│                    ┌───────────────┼───────────────┐                         │
│                    │                               │                         │
│                    ▼                               ▼                         │
│   ┌────────────────────────────┐   ┌────────────────────────────┐           │
│   │    SIGNER 1: STORY         │   │    SIGNER 2: COINBASE      │           │
│   │    DEPLOYER WALLET         │   │    WALLET                  │           │
│   │                            │   │                            │           │
│   │  Address:                  │   │  Address:                  │           │
│   │  0x597856e93f19877a399f   │   │  0xDc2aFCd0a97c1e878FdD   │           │
│   │  686D2F43b298e2268618     │   │  64497806E52Cc530f02a     │           │
│   │                            │   │                            │           │
│   │  Signing Methods:          │   │  Signing Methods:          │           │
│   │  • MetaMask               │   │  • Coinbase Wallet App     │           │
│   │  • Hardware Wallet        │   │  • Coinbase Extension      │           │
│   │  • CLI (cast/ethers)      │   │  • WalletConnect           │           │
│   │                            │   │                            │           │
│   │  Role: Primary Deployer   │   │  Role: Authorization       │           │
│   └────────────────┬───────────┘   └───────────────┬────────────┘           │
│                    │                               │                         │
│                    │    ┌───────────────────┐      │                         │
│                    └───▶│   SIGNATURE       │◀─────┘                         │
│                         │   AGGREGATION     │                                │
│                         │                   │                                │
│                         │   2/2 Required    │                                │
│                         └─────────┬─────────┘                                │
│                                   │                                          │
│                                   ▼                                          │
│                    ┌──────────────────────────────┐                          │
│                    │     VERIFICATION GATE        │                          │
│                    │                              │                          │
│                    │  ☐ Story Deployer: SIGNED    │                          │
│                    │  ☐ Coinbase Wallet: SIGNED   │                          │
│                    │  ────────────────────────    │                          │
│                    │  ✓ 2/2 VERIFIED              │                          │
│                    └──────────────┬───────────────┘                          │
│                                   │                                          │
│                                   ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    AUTHORIZED DEPLOYMENTS                            │   │
│   │                                                                      │   │
│   │  ┌──────────────────────┐          ┌──────────────────────┐        │   │
│   │  │   STORY PROTOCOL     │          │      BASE L2         │        │   │
│   │  │   Chain 1514         │          │     Chain 8453       │        │   │
│   │  │                      │          │                      │        │   │
│   │  │  • 12 Contracts      │          │  • 6 Contracts       │        │   │
│   │  │  • IP Registration   │          │  • Morpho Markets    │        │   │
│   │  │  • PIL Licensing     │          │  • SPV Loans         │        │   │
│   │  └──────────────────────┘          └──────────────────────┘        │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Multi-Signature?

| Benefit | Description |
|---------|-------------|
| **Security** | No single point of failure - both parties must agree |
| **Compliance** | Meets UCC-1 filing requirements for secured transactions |
| **Audit Trail** | Cryptographic proof of authorization by all parties |
| **Legal Protection** | On-chain evidence of multi-party consent |

### Loan Positions Requiring Authorization

| Loan | Collateral | Principal | APR | Network |
|------|------------|-----------|-----|---------|
| Loan 1 | BTC | $5,000,000 USDC | 4.00% | Base L2 |
| Loan 2 | ETH | $1,000,000 USDC | 6.00% | Base L2 |

---

## 2. Wallet Configuration

### 2.1 Story Protocol Deployer Wallet

**Address:** `0x597856e93f19877a399f686D2F43b298e2268618`

| Property | Value |
|----------|-------|
| Type | EOA (Externally Owned Account) |
| Primary Use | Contract deployment |
| Networks | Story Protocol (1514), Base L2 (8453) |
| Access Method | MetaMask, Hardware Wallet, or CLI |

**Setup in MetaMask:**
1. Open MetaMask
2. Click account icon → "Import Account"
3. Select "Private Key"
4. Paste private key (from Azure Key Vault)
5. Click "Import"

### 2.2 Coinbase Wallet

**Address:** `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a`

| Property | Value |
|----------|-------|
| Type | EOA or Smart Wallet |
| Primary Use | Transaction authorization |
| Networks | All EVM compatible |
| Access Method | Coinbase Wallet App/Extension |

**Setup Options:**

**Option A: Coinbase Wallet Browser Extension**
1. Install from: https://www.coinbase.com/wallet/downloads
2. Create or import wallet
3. Ensure address matches: `0xDc2aFCd0...`

**Option B: Coinbase Wallet Mobile App**
1. Download from App Store / Google Play
2. Create or recover wallet
3. Enable "Browser" feature for dApp connections

**Option C: Coinbase Prime (Institutional)**
1. Login to Coinbase Prime
2. Navigate to Wallet section
3. Use the designated authorization wallet

---

## 3. Safe Multi-Sig Setup

### 3.1 Create Safe on Story Protocol

**URL:** https://safe.story.foundation (or use Safe{Wallet} at https://app.safe.global)

**Step 1: Connect Wallet**
```
1. Go to https://app.safe.global
2. Click "Create new Safe"
3. Select network: "Story Protocol" (Chain 1514)
4. Connect with Story Deployer wallet (0x597856e9...)
```

**Step 2: Configure Owners**
```
Owner 1 (Story Deployer):
  Name: Story Protocol Deployer
  Address: 0x597856e93f19877a399f686D2F43b298e2268618

Owner 2 (Coinbase):
  Name: Coinbase Authorization Wallet
  Address: 0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a
```

**Step 3: Set Threshold**
```
Threshold: 2 of 2 owners required
```

**Step 4: Deploy Safe**
```
1. Review configuration
2. Click "Create"
3. Confirm transaction in MetaMask
4. Wait for deployment confirmation
5. Save Safe address
```

### 3.2 Create Safe on Base L2

Repeat the process above with:
- Network: Base (Chain 8453)
- URL: https://app.safe.global (select Base network)

### 3.3 Safe Addresses

After creation, you'll have:

| Network | Safe Address | Owners |
|---------|--------------|--------|
| Story Protocol | `0x[SAFE_STORY_ADDRESS]` | 2/2 |
| Base L2 | `0x[SAFE_BASE_ADDRESS]` | 2/2 |

---

## 4. Signature Workflow

### 4.1 Complete Signing Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIGNATURE WORKFLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1: PAYLOAD GENERATION                                     │
│  ─────────────────────────────                                   │
│                                                                  │
│  Step 1.1: Generate EIP-191 Hash                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  $ node scripts/anchor-signature.cjs                      │   │
│  │                                                           │   │
│  │  Output:                                                  │   │
│  │    Signature Hash: 0x[raw_hash]                          │   │
│  │    EIP-191 Hash:   0x43ebfc7d0c89240d220e6ddecca21c...   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Step 1.2: Verify Payload Contents                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Signer:     Clifton Kelly Bell                          │   │
│  │  Document:   UCC-1_FINANCING_STATEMENT                   │   │
│  │  UCC-1 CID:  bafkreialofdl6qhrgyomohyo6giijf7stzl26r... │   │
│  │  Timestamp:  [unix_timestamp]                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ────────────────────────────────────────────────────────────   │
│                                                                  │
│  PHASE 2: STORY DEPLOYER SIGNATURE                               │
│  ─────────────────────────────────                               │
│                                                                  │
│  Step 2.1: Open MyEtherWallet                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  URL: https://www.myetherwallet.com                      │   │
│  │  Click: "Access My Wallet" → "Browser Extension"         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Step 2.2: Connect MetaMask                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  • Select account: 0x597856e93f19877a399f...             │   │
│  │  • Approve connection                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Step 2.3: Sign Message                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Navigate: Tools → Sign Message                          │   │
│  │  Paste:    0x43ebfc7d0c89240d220e6ddecca21c295ed529...   │   │
│  │  Click:    "Sign Message"                                │   │
│  │  Confirm:  In MetaMask popup                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Step 2.4: Save Signature                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Copy: 0x[132-character signature]                       │   │
│  │  Save to: signature-morpho-config.json → signatures.story│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ────────────────────────────────────────────────────────────   │
│                                                                  │
│  PHASE 3: COINBASE WALLET SIGNATURE                              │
│  ──────────────────────────────────                              │
│                                                                  │
│  Step 3.1: Connect Coinbase Wallet                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  URL: https://www.myetherwallet.com                      │   │
│  │  Click: "Access My Wallet"                               │   │
│  │  Select: "Coinbase Wallet" or "WalletConnect"            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Step 3.2: Verify Account                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Ensure connected with: 0xDc2aFCd0a97c1e878FdD...       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Step 3.3: Sign Same Hash                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Navigate: Tools → Sign Message                          │   │
│  │  Paste:    0x43ebfc7d0c89240d220e6ddecca21c295ed529...   │   │
│  │            (SAME hash as Story Deployer)                 │   │
│  │  Click:    "Sign Message"                                │   │
│  │  Confirm:  In Coinbase Wallet popup                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Step 3.4: Save Signature                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Copy: 0x[132-character signature]                       │   │
│  │  Save to: signature-morpho-config.json → signatures.coinbase │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ────────────────────────────────────────────────────────────   │
│                                                                  │
│  PHASE 4: VERIFICATION                                           │
│  ─────────────────────                                           │
│                                                                  │
│  Step 4.1: Run Verification Script                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  $ node scripts/verify-multisig.cjs                      │   │
│  │                                                           │   │
│  │  Expected Output:                                        │   │
│  │  ✓ Story Deployer: VALID                                 │   │
│  │  ✓ Coinbase Wallet: VALID                                │   │
│  │  ✓ 2/2 signatures verified - ready for deployment        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Step 4.2: Proceed to Deployment                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  $ npm run contracts:deploy:story                        │   │
│  │  $ npm run contracts:deploy:base                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. MyEtherWallet Signing

### 5.1 Access MyEtherWallet

1. **Open Browser:** Navigate to https://www.myetherwallet.com
2. **Security Check:** Verify URL and SSL certificate
3. **Click:** "Access My Wallet"

### 5.2 Connect Wallet Options

| Method | Best For | Steps |
|--------|----------|-------|
| Browser Extension | MetaMask, Coinbase Wallet | Click "Browser Extension" → Approve |
| WalletConnect | Mobile wallets | Scan QR code |
| Hardware Wallet | Ledger, Trezor | Connect device → Select app |

### 5.3 Sign Message Interface

```
┌─────────────────────────────────────────────────────────────────┐
│                    MYETHERWALLET - SIGN MESSAGE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Connected: 0x597856e93f19877a399f686D2F43b298e2268618          │
│  Network: Ethereum Mainnet (signing works on any network)       │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Message to Sign:                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 0x43ebfc7d0c89240d220e6ddecca21c295ed529f6be2d8cb │  │  │
│  │  │ 1d802b6305b416189                                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  [ Sign Message ]                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  After signing:                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Signature:                                                │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 0x1234567890abcdef1234567890abcdef1234567890abcdef │  │  │
│  │  │ 1234567890abcdef1234567890abcdef1234567890abcdef12 │  │  │
│  │  │ 34567890abcdef1b                                    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  [ Copy Signature ]                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Coinbase Wallet Signing

### 6.1 Method A: Coinbase Wallet Browser Extension

**Step 1: Install Extension**
- Chrome: https://chrome.google.com/webstore/detail/coinbase-wallet
- Firefox: https://addons.mozilla.org/firefox/addon/coinbase-wallet/

**Step 2: Setup Wallet**
```
1. Click extension icon
2. "Create new wallet" or "I already have a wallet"
3. If importing: Use recovery phrase for 0xDc2aFCd0...
4. Set up password
```

**Step 3: Connect to MyEtherWallet**
```
1. Go to https://www.myetherwallet.com
2. Click "Access My Wallet"
3. Select "Browser Extension"
4. Choose "Coinbase Wallet" in popup
5. Approve connection in Coinbase Wallet
```

**Step 4: Sign Message**
```
1. Navigate to Tools → Sign Message
2. Paste the EIP-191 hash:
   0x43ebfc7d0c89240d220e6ddecca21c295ed529f6be2d8cb1d802b6305b416189
3. Click "Sign Message"
4. Approve in Coinbase Wallet popup
5. Copy the resulting signature
```

### 6.2 Method B: Coinbase Wallet Mobile App

**Step 1: Open App**
```
1. Launch Coinbase Wallet app
2. Ensure correct account (0xDc2aFCd0...)
3. Tap "Browser" tab
```

**Step 2: Navigate to MyEtherWallet**
```
1. Enter URL: myetherwallet.com
2. Tap "Access My Wallet"
3. Select "WalletConnect" or direct connect
```

**Step 3: Sign Message**
```
1. Go to Tools → Sign Message
2. Paste the hash
3. Tap "Sign Message"
4. Confirm on device
5. Copy signature
```

### 6.3 Method C: WalletConnect QR Code

**For Mobile Wallets:**
```
1. On MyEtherWallet, select "WalletConnect"
2. QR code appears
3. In Coinbase Wallet app:
   - Tap "Scan" icon
   - Scan the QR code
   - Approve connection
4. Sign message as normal
```

---

## 7. Story Deployer Signing

### 7.1 Method A: MetaMask

**Prerequisites:**
- Story Deployer private key imported to MetaMask
- Account: `0x597856e93f19877a399f686D2F43b298e2268618`

**Steps:**
```
1. Open MyEtherWallet
2. Click "Access My Wallet" → "Browser Extension"
3. Select MetaMask
4. Choose Story Deployer account
5. Navigate to Tools → Sign Message
6. Paste EIP-191 hash
7. Click "Sign Message"
8. Confirm in MetaMask popup
9. Copy signature
```

### 7.2 Method B: Hardware Wallet (Ledger/Trezor)

**Prerequisites:**
- Ledger/Trezor with Story Deployer account
- Ethereum app installed

**Steps:**
```
1. Connect hardware wallet to computer
2. Unlock and open Ethereum app
3. On MyEtherWallet:
   - Click "Access My Wallet"
   - Select "Hardware" → "Ledger" or "Trezor"
   - Select the correct address
4. Navigate to Tools → Sign Message
5. Paste EIP-191 hash
6. Click "Sign Message"
7. Confirm on hardware device
8. Copy signature
```

### 7.3 Method C: Command Line (cast)

**Prerequisites:**
- Foundry installed
- Private key available (from Key Vault)

**Commands:**
```bash
# Load private key from environment
source scripts/azure/load-keyvault-secrets.sh

# Get the hash to sign
EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")

# Sign with cast (--no-hash because already EIP-191 formatted)
SIGNATURE=$(cast wallet sign \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --no-hash \
  "$EIP191_HASH")

echo "Signature: $SIGNATURE"

# Verify the signature
cast wallet verify \
  --address 0x597856e93f19877a399f686D2F43b298e2268618 \
  "$EIP191_HASH" \
  "$SIGNATURE"
```

### 7.4 Method D: ethers.js Script

```javascript
const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

async function signWithStoryDeployer() {
  // Load config
  const config = JSON.parse(fs.readFileSync('signature-morpho-config.json'));
  const eip191Hash = config.eip191Hash;
  
  // Create wallet
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
  
  // Verify address
  console.log('Signing with:', wallet.address);
  if (wallet.address.toLowerCase() !== '0x597856e93f19877a399f686D2F43b298e2268618'.toLowerCase()) {
    throw new Error('Wrong wallet!');
  }
  
  // Sign the raw hash bytes
  const signature = await wallet.signMessage(ethers.getBytes(config.signatureHash));
  
  console.log('Signature:', signature);
  
  // Update config
  config.signatures = config.signatures || {};
  config.signatures.story = signature;
  fs.writeFileSync('signature-morpho-config.json', JSON.stringify(config, null, 2));
  
  console.log('✓ Signature saved to signature-morpho-config.json');
}

signWithStoryDeployer().catch(console.error);
```

---

## 8. Verification Process

### 8.1 Update Configuration File

After both signatures are collected, update `signature-morpho-config.json`:

```json
{
  "signer": "Clifton Kelly Bell",
  "documentType": "UCC-1_FINANCING_STATEMENT",
  "ucc1Cid": "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",
  "timestamp": 1712505573,
  "signatureHash": "0x[raw_keccak256_hash]",
  "eip191Hash": "0x43ebfc7d0c89240d220e6ddecca21c295ed529f6be2d8cb1d802b6305b416189",
  "signatures": {
    "story": "0x[132_char_story_signature]",
    "coinbase": "0x[132_char_coinbase_signature]"
  },
  "generatedAt": "2026-04-07T12:00:00.000Z"
}
```

### 8.2 Run Verification Script

```bash
node scripts/verify-multisig.cjs
```

### 8.3 Expected Output

```
============================================================
Morpho Multi-Sig — On-Chain Signature Verification
============================================================

Message details:
  Signer:        Clifton Kelly Bell
  Document:      UCC-1_FINANCING_STATEMENT
  UCC-1 CID:     bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a
  Raw hash:      0x[signature_hash]
  EIP-191 hash:  0x43ebfc7d0c89240d220e6ddecca21c295ed529f6be2d8cb1d802b6305b416189

Verifying Story Deployer (0x597856e9...):
  Signature:    0x[story_sig_preview]...
  Recovered:    0x597856e93f19877a399f686D2F43b298e2268618
  ✓ Signature valid — signer address matches

Verifying Coinbase Wallet (0xDc2aFCd0...):
  Signature:    0x[coinbase_sig_preview]...
  Recovered:    0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a
  ✓ Signature valid — signer address matches

============================================================
✓ 2/2 SIGNATURES VERIFIED — READY FOR DEPLOYMENT
============================================================
```

### 8.4 Manual Verification (Optional)

Verify signatures independently using ethers.js:

```javascript
const { ethers } = require('ethers');

const eip191Hash = "0x43ebfc7d0c89240d220e6ddecca21c295ed529f6be2d8cb1d802b6305b416189";
const storySignature = "0x[story_signature]";
const coinbaseSignature = "0x[coinbase_signature]";

// Recover addresses
const storyRecovered = ethers.recoverAddress(eip191Hash, storySignature);
const coinbaseRecovered = ethers.recoverAddress(eip191Hash, coinbaseSignature);

console.log('Story Deployer recovered:', storyRecovered);
console.log('Expected:', '0x597856e93f19877a399f686D2F43b298e2268618');
console.log('Match:', storyRecovered.toLowerCase() === '0x597856e93f19877a399f686D2F43b298e2268618'.toLowerCase());

console.log('Coinbase recovered:', coinbaseRecovered);
console.log('Expected:', '0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a');
console.log('Match:', coinbaseRecovered.toLowerCase() === '0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a'.toLowerCase());
```

---

## 9. Deployment Authorization

### 9.1 Pre-Deployment Checklist

```
☐ signature-morpho-config.json contains both signatures
☐ node scripts/verify-multisig.cjs shows 2/2 verified
☐ Story Deployer wallet has sufficient IP for gas
☐ Story Deployer wallet has sufficient ETH (Base) for gas
☐ Azure Key Vault secrets loaded
☐ Contracts compiled successfully
```

### 9.2 Execute Deployment

**Story Protocol:**
```bash
# Load secrets
source scripts/azure/load-keyvault-secrets.sh

# Deploy to Story Protocol
npm run contracts:deploy:story

# Verify on StoryScan
npm run contracts:verify:story
```

**Base L2:**
```bash
# Deploy to Base
npm run contracts:deploy:base

# Verify on BaseScan
npm run contracts:verify:base
```

### 9.3 Post-Deployment

```bash
# Run post-deployment orchestration
npm run contracts:orchestrate:story
npm run contracts:orchestrate:base

# Record UCC-1 filing on-chain
npm run contracts:record-ucc1:story
npm run contracts:record-ucc1:base

# Pin ABI proof to IPFS
npm run contracts:pin-to-pinata
```

---

## 10. Security Best Practices

### 10.1 Wallet Security

| Practice | Description |
|----------|-------------|
| **Hardware Wallets** | Use Ledger/Trezor for high-value signatures |
| **Separate Devices** | Sign from different devices for each wallet |
| **Verify Addresses** | Always double-check addresses before signing |
| **Air-Gapped Signing** | Consider offline signing for maximum security |

### 10.2 Signature Security

| Practice | Description |
|----------|-------------|
| **Verify Hash** | Confirm the hash matches expected payload |
| **Single Use** | Each signature payload should be unique (timestamp) |
| **No Replay** | Include chain ID and nonce in payload if on-chain |
| **Secure Storage** | Keep signatures encrypted until submission |

### 10.3 Operational Security

```
✓ DO:
  • Use HTTPS for all web connections
  • Verify website URLs and SSL certificates
  • Sign in a private/secure environment
  • Clear browser cache after signing
  • Use unique passwords for each wallet

✗ DON'T:
  • Share private keys via email/chat
  • Sign messages you don't understand
  • Use public WiFi for signing
  • Store signatures in plain text
  • Reuse signatures across transactions
```

---

## 11. Troubleshooting

### 11.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Signature verification failed" | Wrong hash signed | Verify eip191Hash matches exactly |
| "Recovered address doesn't match" | Wrong wallet signed | Check wallet address before signing |
| "Invalid signature format" | Incomplete copy | Ensure full 132-char signature copied |
| "Cannot connect wallet" | Extension blocked | Allow site in wallet settings |
| "Transaction rejected" | User cancelled | Try signing again |

### 11.2 Signature Format Validation

Valid signature format:
- Starts with `0x`
- Exactly 132 characters (0x + 130 hex chars)
- Example: `0x1234...abcd1b`

```javascript
// Validate signature format
function isValidSignature(sig) {
  return /^0x[a-fA-F0-9]{130}$/.test(sig);
}
```

### 11.3 Address Recovery Debug

```javascript
const { ethers } = require('ethers');

const hash = "0x43ebfc7d0c89240d220e6ddecca21c295ed529f6be2d8cb1d802b6305b416189";
const signature = "0x[your_signature]";

try {
  const recovered = ethers.recoverAddress(hash, signature);
  console.log('Recovered address:', recovered);
} catch (error) {
  console.error('Recovery failed:', error.message);
  console.log('Check:');
  console.log('  1. Signature format (should be 132 chars starting with 0x)');
  console.log('  2. Hash format (should be 66 chars starting with 0x)');
}
```

---

## 12. Quick Reference

### 12.1 Key Addresses

| Role | Address |
|------|---------|
| Story Deployer | `0x597856e93f19877a399f686D2F43b298e2268618` |
| Coinbase Wallet | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |
| Morpho Blue | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |

### 12.2 Key URLs

| Service | URL |
|---------|-----|
| MyEtherWallet | https://www.myetherwallet.com |
| Safe{Wallet} | https://app.safe.global |
| StoryScan | https://www.storyscan.io |
| BaseScan | https://basescan.org |
| Coinbase Wallet | https://www.coinbase.com/wallet |

### 12.3 Current EIP-191 Hash

```
0x43ebfc7d0c89240d220e6ddecca21c295ed529f6be2d8cb1d802b6305b416189
```

### 12.4 Quick Commands

```bash
# Generate signature payload
node scripts/anchor-signature.cjs

# Verify signatures
node scripts/verify-multisig.cjs

# Deploy (after verification passes)
npm run contracts:deploy:story
npm run contracts:deploy:base
```

### 12.5 Signing Checklist

```
BEFORE SIGNING:
  ☐ Verify you're on the correct website (myetherwallet.com)
  ☐ Verify SSL certificate is valid
  ☐ Verify wallet address matches expected signer
  ☐ Verify hash matches: 0x43ebfc7d0c89240d220e...

DURING SIGNING:
  ☐ Review message in wallet popup
  ☐ Confirm the action

AFTER SIGNING:
  ☐ Copy COMPLETE signature (132 characters)
  ☐ Save to signature-morpho-config.json
  ☐ Run verification script
  ☐ Confirm 2/2 verified before deployment
```

---

## Document Information

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Repository:** https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH

---

*This document provides guidance for multi-signature operations. Always verify addresses and hashes independently before signing any blockchain transactions.*
