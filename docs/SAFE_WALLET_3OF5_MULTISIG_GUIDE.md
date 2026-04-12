# Safe Wallet Multi-Sig Configuration Guide
## 3-of-5 Morpho Protocol Standard with SPV Signers

**Millionaire Resilience LLC / Gladiator Holdings LLC**  
**UCC-1 Secured Transactions & On-Chain IP Collateralization**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Special Purpose Vehicle (SPV) Structure](#2-special-purpose-vehicle-spv-structure)
3. [Safe Wallet 3/5 Multi-Sig Configuration](#3-safe-wallet-35-multi-sig-configuration)
4. [Story Protocol Integration (Deployer)](#4-story-protocol-integration-deployer)
5. [Base L2 Integration (Authorization)](#5-base-l2-integration-authorization)
6. [WalletConnect Setup](#6-walletconnect-setup)
7. [Coinbase Gas Sponsorship](#7-coinbase-gas-sponsorship)
8. [IP Licensing & Collateralization](#8-ip-licensing--collateralization)
9. [Morpho Protocol Loan Workflow](#9-morpho-protocol-loan-workflow)
10. [Testing & Verification](#10-testing--verification)
11. [Security Checklist](#11-security-checklist)
12. [Quick Reference](#12-quick-reference)

---

## 1. Architecture Overview

### Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    3/5 MULTI-SIG MORPHO PROTOCOL ARCHITECTURE                        │
│                 SPV-Based UCC-1 Secured IP Collateralization System                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                           SAFE WALLET (3/5 MULTI-SIG)                        │   │
│  │                                                                              │   │
│  │  Required Signatures: 3 of 5                                                 │   │
│  │  Morpho Protocol Standard: Enterprise Security                               │   │
│  │                                                                              │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│   │
│  │  │  SIGNER 1   │ │  SIGNER 2   │ │  SIGNER 3   │ │  SIGNER 4   │ │SIGNER 5││   │
│  │  │             │ │             │ │             │ │             │ │        ││   │
│  │  │ Millionaire │ │  Gladiator  │ │    SLAPS    │ │ Resilience  │ │Coinbase││   │
│  │  │ Resilience  │ │  Holdings   │ │  Streaming  │ │ Blockchain  │ │ Wallet ││   │
│  │  │    LLC      │ │    LLC      │ │    LLC      │ │ Whetstone   │ │  Auth  ││   │
│  │  │   (SPV 1)   │ │   (SPV 2)   │ │   (SPV 3)   │ │   (SPV 4)   │ │        ││   │
│  │  │             │ │             │ │             │ │             │ │        ││   │
│  │  │ 0x5EEFF17e  │ │ 0x4C7CD4eC  │ │ 0x[SPV3]    │ │ 0x[SPV4]    │ │0xDc2aFC││   │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └───┬────┘│   │
│  │         │               │               │               │             │     │   │
│  │         └───────────────┴───────┬───────┴───────────────┴─────────────┘     │   │
│  │                                 │                                            │   │
│  │                                 ▼                                            │   │
│  │                    ┌────────────────────────┐                                │   │
│  │                    │   3/5 THRESHOLD MET    │                                │   │
│  │                    │   Transaction Approved │                                │   │
│  │                    └───────────┬────────────┘                                │   │
│  │                                │                                             │   │
│  └────────────────────────────────┼─────────────────────────────────────────────┘   │
│                                   │                                                  │
│  ┌────────────────────────────────┼─────────────────────────────────────────────┐   │
│  │                    WALLETCONNECT BRIDGE                                       │   │
│  │                                │                                              │   │
│  │     ┌──────────────────────────┼──────────────────────────┐                  │   │
│  │     │                          │                          │                  │   │
│  │     ▼                          ▼                          ▼                  │   │
│  │ ┌──────────────┐      ┌──────────────┐      ┌──────────────────┐            │   │
│  │ │  STORY       │      │    BASE      │      │   COINBASE       │            │   │
│  │ │  PROTOCOL    │      │     L2       │      │   COMMERCE       │            │   │
│  │ │              │      │              │      │                  │            │   │
│  │ │ • IP Registry│      │ • Morpho Blue│      │ • Gas Sponsor    │            │   │
│  │ │ • PIL License│      │ • USDC Loans │      │ • Fee Coverage   │            │   │
│  │ │ • Royalties  │      │ • Collateral │      │ • Paymaster      │            │   │
│  │ │              │      │              │      │                  │            │   │
│  │ │ Chain: 1514  │      │ Chain: 8453  │      │ Smart Wallet     │            │   │
│  │ └──────┬───────┘      └──────┬───────┘      └────────┬─────────┘            │   │
│  │        │                     │                       │                       │   │
│  └────────┼─────────────────────┼───────────────────────┼───────────────────────┘   │
│           │                     │                       │                           │
│           ▼                     ▼                       ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         SECURED TRANSACTION FLOW                             │   │
│  │                                                                              │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │   │
│  │  │   UCC-1      │───▶│  IP Asset    │───▶│ PIL License  │───▶│  Morpho   │ │   │
│  │  │   Filing     │    │ Registration │    │   Binding    │    │   Loan    │ │   │
│  │  │              │    │              │    │              │    │           │ │   │
│  │  │ NM SOS       │    │ Story IP     │    │ Royalty %    │    │ $5M BTC   │ │   │
│  │  │ #2026...     │    │ Registry     │    │ Terms        │    │ $1M ETH   │ │   │
│  │  └──────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │   │
│  │                                                                              │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Multi-Sig Threshold Comparison

| Threshold | Use Case | Security Level | Morpho Compliance |
|-----------|----------|----------------|-------------------|
| 2/3 | Small teams | Standard | ✅ Minimum |
| 3/5 | Enterprise | High | ✅ Recommended |
| 4/7 | DAO/Institution | Maximum | ✅ Premium |

---

## 2. Special Purpose Vehicle (SPV) Structure

### 2.1 SPV Entity Configuration

Each SPV represents a legal entity that holds signing authority for the multi-sig wallet.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPV CORPORATE STRUCTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SPV 1: MILLIONAIRE RESILIENCE LLC                              │
│  ──────────────────────────────────                              │
│  • EIN: 41-3789881                                               │
│  • State: New Mexico                                             │
│  • Role: Primary Deployer (Story Protocol)                       │
│  • Wallet: 0x5EEFF17e12401b6A8391f5257758E07c157E1e45           │
│  • Authority: Smart Contract Deployment                          │
│  • IPFS: bafkreifxiesrze736sxhvsa5op64q6f3ddvv3rismnvd75wi3yfqilu4py│
│                                                                  │
│  SPV 2: GLADIATOR HOLDINGS LLC                                   │
│  ─────────────────────────────                                   │
│  • EIN: [Certificate on file]                                    │
│  • State: New Mexico                                             │
│  • Role: Authorization (Base L2)                                 │
│  • Wallet: 0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A           │
│  • Authority: Loan Authorization                                 │
│  • IPFS: bafybeiba2j4g34bizjjm26qznc2pf4upgotffrcwjtkw6lj3qa6squrzpu│
│                                                                  │
│  SPV 3: SLAPS STREAMING LLC                                      │
│  ──────────────────────────                                      │
│  • EIN: 41-4045773                                               │
│  • State: New Mexico                                             │
│  • Role: IP Licensing & Royalties                                │
│  • Wallet: 0x[SLAPS_STREAMING_WALLET]                           │
│  • Authority: PIL License Management                             │
│  • IPFS: bafkreic3n6bdf25tobljqbjxzvzkbch6s7xkqq5yehmyt3zju4de7ey52u│
│                                                                  │
│  SPV 4: RESILIENCE BLOCKCHAIN WHETSTONE LLC                      │
│  ──────────────────────────────────────────                      │
│  • EIN: 41-4131924                                               │
│  • State: New Mexico                                             │
│  • Role: Technical Operations                                    │
│  • Wallet: 0x[RBW_WALLET]                                       │
│  • Authority: Contract Upgrades                                  │
│  • IPFS: bafkreid77fuxwqtwyku5syp3dswmy75rymvxh6v3tf7rfrzqbrizoutxtu│
│                                                                  │
│  SPV 5: COINBASE AUTHORIZATION WALLET                            │
│  ────────────────────────────────────                            │
│  • Type: Institutional Custody                                   │
│  • Role: Gas Sponsorship & Authorization                         │
│  • Wallet: 0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a           │
│  • Authority: Transaction Approval                               │
│  • Features: Paymaster Integration                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 UCC-1 Secured Interest Perfection

```
┌─────────────────────────────────────────────────────────────────┐
│                UCC-1 SECURITY INTEREST STRUCTURE                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SECURED PARTY: Morpho Protocol (via Smart Contract)            │
│  DEBTOR: SPV Entities (Listed Above)                            │
│                                                                  │
│  COLLATERAL DESCRIPTION:                                         │
│  ────────────────────────                                        │
│  1. All blockchain smart contracts deployed to:                  │
│     • Story Protocol (Chain ID: 1514)                           │
│     • Base L2 (Chain ID: 8453)                                  │
│                                                                  │
│  2. All intellectual property registered on:                     │
│     • Story Protocol IP Registry                                │
│     • IP Asset ID: 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE   │
│     • Token ID: 15192                                           │
│                                                                  │
│  3. All PIL License Terms including:                            │
│     • PIL-PER (Personal): 1% royalty                            │
│     • PIL-COM (Commercial): 5% royalty                          │
│     • PIL-ENT (Enterprise): 12% royalty                         │
│                                                                  │
│  4. All royalty streams and revenue from licensed IP            │
│                                                                  │
│  FILING DETAILS:                                                 │
│  ───────────────                                                 │
│  Filing Number: 20260000078753                                   │
│  Jurisdiction: New Mexico Secretary of State                     │
│  Filing Date: March 26, 2026                                     │
│  IPFS CID: bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Safe Wallet 3/5 Multi-Sig Configuration

### 3.1 Create Safe on Story Protocol

**URL:** https://app.safe.global

#### Step 1: Connect to Story Protocol Network

```
1. Go to https://app.safe.global
2. Click "Create new Safe"
3. Add Custom Network (if not listed):
   
   Network Name:    Story Protocol Mainnet
   RPC URL:         https://mainnet.storyrpc.io
   Chain ID:        1514
   Currency Symbol: IP
   Block Explorer:  https://www.storyscan.io
```

#### Step 2: Configure Owners (5 SPV Signers)

```json
{
  "safe": {
    "network": "Story Protocol",
    "chainId": 1514,
    "threshold": 3,
    "owners": [
      {
        "name": "SPV1 - Millionaire Resilience LLC",
        "address": "0x5EEFF17e12401b6A8391f5257758E07c157E1e45",
        "role": "Primary Deployer"
      },
      {
        "name": "SPV2 - Gladiator Holdings LLC", 
        "address": "0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A",
        "role": "Authorization"
      },
      {
        "name": "SPV3 - SLAPS Streaming LLC",
        "address": "0x[SLAPS_WALLET_ADDRESS]",
        "role": "IP Licensing"
      },
      {
        "name": "SPV4 - Resilience Blockchain Whetstone LLC",
        "address": "0x[RBW_WALLET_ADDRESS]",
        "role": "Technical Ops"
      },
      {
        "name": "SPV5 - Coinbase Authorization",
        "address": "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
        "role": "Gas Sponsor"
      }
    ]
  }
}
```

#### Step 3: Deploy Safe Contract

```
1. Review owner addresses
2. Confirm threshold: 3 of 5
3. Click "Create Safe"
4. Sign transaction with connected wallet
5. Wait for confirmation
6. Save Safe address: 0x[SAFE_STORY_ADDRESS]
```

### 3.2 Create Safe on Base L2

Repeat the same process on Base:

```
Network Name:    Base Mainnet
RPC URL:         https://mainnet.base.org
Chain ID:        8453
Currency Symbol: ETH
Block Explorer:  https://basescan.org
```

### 3.3 Safe Configuration Summary

| Network | Safe Address | Threshold | Owners |
|---------|--------------|-----------|--------|
| Story Protocol | `0x[SAFE_STORY]` | 3/5 | All 5 SPVs |
| Base L2 | `0x[SAFE_BASE]` | 3/5 | All 5 SPVs |

---

## 4. Story Protocol Integration (Deployer)

### 4.1 Connect Safe to Story Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│              STORY PROTOCOL DEPLOYER CONFIGURATION               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SAFE WALLET (Story Protocol)                                    │
│  ─────────────────────────────                                   │
│  Address: 0x[SAFE_STORY_ADDRESS]                                │
│  Network: Story Protocol (1514)                                  │
│  Role: Smart Contract Deployer                                   │
│                                                                  │
│  DEPLOYMENT PERMISSIONS:                                         │
│  ─────────────────────────                                       │
│  ✓ Deploy StoryAttestationService                               │
│  ✓ Deploy StoryOrchestrationService                             │
│  ✓ Deploy StoryAttestationBridge                                │
│  ✓ Register IP Assets                                           │
│  ✓ Bind PIL License Terms                                       │
│  ✓ Configure Royalty Splits                                     │
│                                                                  │
│  IP REGISTRY CONNECTION:                                         │
│  ───────────────────────                                         │
│  IP Registry: 0x77319B4031e6eF1250907aa00018B8B1c67a244b        │
│  PIL Template: 0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 WalletConnect to StoryScan

```
1. Open Safe Wallet App (https://app.safe.global)
2. Select your Story Protocol Safe
3. Click "Apps" in sidebar
4. Search for "WalletConnect"
5. Open WalletConnect app
6. In StoryScan (https://www.storyscan.io):
   - Click "Connect Wallet"
   - Select "WalletConnect"
   - Scan QR code with Safe app
7. Verify connection shows Safe address
```

### 4.3 WalletConnect to IP Portal

```
1. In Safe Wallet, keep WalletConnect open
2. Go to Story Protocol IP Portal:
   - URL: https://app.story.foundation (or equivalent)
3. Click "Connect Wallet"
4. Select "WalletConnect"
5. In Safe app:
   - New session request appears
   - Review and approve connection
6. You can now:
   - Register IP assets
   - Configure licensing terms
   - Manage royalties
```

---

## 5. Base L2 Integration (Authorization)

### 5.1 Connect Safe to Base L2

```
┌─────────────────────────────────────────────────────────────────┐
│              BASE L2 AUTHORIZATION CONFIGURATION                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SAFE WALLET (Base L2)                                          │
│  ─────────────────────                                          │
│  Address: 0x[SAFE_BASE_ADDRESS]                                 │
│  Network: Base Mainnet (8453)                                    │
│  Role: Loan Authorization & Collateral Management               │
│                                                                  │
│  AUTHORIZATION PERMISSIONS:                                      │
│  ──────────────────────────                                      │
│  ✓ Approve Morpho Blue Loans                                    │
│  ✓ Manage USDC Collateral                                       │
│  ✓ Execute Market Transactions                                  │
│  ✓ Withdraw/Deposit Collateral                                  │
│  ✓ Claim Rewards                                                │
│                                                                  │
│  MORPHO BLUE CONTRACTS:                                          │
│  ──────────────────────                                          │
│  Morpho Blue: 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb        │
│  USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913               │
│                                                                  │
│  LOAN POSITIONS:                                                 │
│  ───────────────                                                 │
│  Market 1: $5,000,000 USDC | BTC Collateral | 4.00% APR         │
│  Market 2: $1,000,000 USDC | ETH Collateral | 6.00% APR         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 WalletConnect to BaseScan

```
1. Open Safe Wallet App
2. Select your Base L2 Safe
3. Click "Apps" → "WalletConnect"
4. In BaseScan (https://basescan.org):
   - Click "Connect to Web3"
   - Select "WalletConnect"
   - Scan QR code
5. Verify Safe address connected
```

---

## 6. WalletConnect Setup

### 6.1 Complete WalletConnect Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│                  WALLETCONNECT INTEGRATION MAP                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SAFE WALLET (Hub)                                              │
│       │                                                          │
│       ├───► WalletConnect Session 1: StoryScan                  │
│       │     • Network: Story Protocol (1514)                    │
│       │     • Purpose: Contract verification, TX monitoring     │
│       │                                                          │
│       ├───► WalletConnect Session 2: IP Portal                  │
│       │     • Network: Story Protocol (1514)                    │
│       │     • Purpose: IP registration, licensing               │
│       │                                                          │
│       ├───► WalletConnect Session 3: BaseScan                   │
│       │     • Network: Base L2 (8453)                           │
│       │     • Purpose: Contract verification, TX monitoring     │
│       │                                                          │
│       ├───► WalletConnect Session 4: Morpho App                 │
│       │     • Network: Base L2 (8453)                           │
│       │     • Purpose: Loan management, collateral              │
│       │                                                          │
│       └───► WalletConnect Session 5: Coinbase                   │
│             • Network: Base L2 (8453)                           │
│             • Purpose: Gas sponsorship, paymaster               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Managing Multiple Sessions

```javascript
// WalletConnect session management in Safe
const sessions = {
  storyscan: {
    uri: "wc:[session_id]@2?relay-protocol=irn&symKey=[key]",
    network: 1514,
    dapp: "StoryScan",
    permissions: ["eth_sendTransaction", "personal_sign"]
  },
  ipPortal: {
    uri: "wc:[session_id]@2?relay-protocol=irn&symKey=[key]",
    network: 1514,
    dapp: "Story IP Portal",
    permissions: ["eth_sendTransaction", "personal_sign", "eth_signTypedData"]
  },
  basescan: {
    uri: "wc:[session_id]@2?relay-protocol=irn&symKey=[key]",
    network: 8453,
    dapp: "BaseScan",
    permissions: ["eth_sendTransaction"]
  },
  morpho: {
    uri: "wc:[session_id]@2?relay-protocol=irn&symKey=[key]",
    network: 8453,
    dapp: "Morpho Blue",
    permissions: ["eth_sendTransaction", "eth_signTypedData"]
  }
};
```

---

## 7. Coinbase Gas Sponsorship

### 7.1 Paymaster Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│              COINBASE GAS SPONSORSHIP CONFIGURATION              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  COINBASE PAYMASTER (Base L2)                                   │
│  ────────────────────────────                                   │
│                                                                  │
│  How It Works:                                                   │
│  ─────────────                                                   │
│  1. Safe initiates transaction on Base L2                       │
│  2. Transaction routed through Coinbase Paymaster               │
│  3. Coinbase covers gas fees for qualifying transactions        │
│  4. User pays $0 in gas fees                                    │
│                                                                  │
│  Qualifying Transactions:                                        │
│  ────────────────────────                                        │
│  ✓ Morpho Blue deposits/withdrawals                             │
│  ✓ USDC transfers within Morpho ecosystem                       │
│  ✓ Collateral management                                        │
│  ✓ Loan repayments                                              │
│                                                                  │
│  Configuration:                                                  │
│  ─────────────                                                   │
│  Paymaster Address: 0x[COINBASE_PAYMASTER]                      │
│  Supported Tokens: USDC, ETH, cbETH                             │
│  Max Gas per TX: 500,000 units                                  │
│  Daily Limit: Varies by account tier                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Enable Gas Sponsorship in Safe

```
1. Open Safe on Base L2
2. Go to Settings → Spending Limits
3. Add Coinbase Paymaster as approved contract
4. Enable "Use Paymaster for gas" option
5. Connect Coinbase Wallet as signer #5
6. Verify paymaster integration in test transaction
```

### 7.3 Coinbase Smart Wallet Integration

```javascript
// Coinbase Smart Wallet with Paymaster
const coinbaseConfig = {
  network: "base-mainnet",
  paymaster: {
    enabled: true,
    url: "https://api.developer.coinbase.com/rpc/v1/base/paymaster",
    policyId: "[YOUR_POLICY_ID]"
  },
  sponsoredActions: [
    "morpho_deposit",
    "morpho_withdraw", 
    "morpho_borrow",
    "morpho_repay",
    "usdc_transfer"
  ]
};
```

---

## 8. IP Licensing & Collateralization

### 8.1 PIL License Term Programming

```
┌─────────────────────────────────────────────────────────────────┐
│           PIL LICENSE TERMS FOR COLLATERALIZATION                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LICENSE TIER: PIL-PER (Personal Use)                           │
│  ─────────────────────────────────────                          │
│  • Royalty Rate: 1%                                             │
│  • Commercial Use: No                                           │
│  • Derivatives: Yes (with attribution)                          │
│  • Collateral Value: 10% of IP valuation                        │
│                                                                  │
│  LICENSE TIER: PIL-COM (Commercial Use)                         │
│  ──────────────────────────────────────                         │
│  • Royalty Rate: 5%                                             │
│  • Commercial Use: Yes                                          │
│  • Derivatives: Yes (royalty share)                             │
│  • Collateral Value: 50% of IP valuation                        │
│  • Revenue Share: Required for loans > $100K                    │
│                                                                  │
│  LICENSE TIER: PIL-ENT (Enterprise)                             │
│  ──────────────────────────────────                             │
│  • Royalty Rate: 12%                                            │
│  • Commercial Use: Yes (exclusive options)                      │
│  • Derivatives: Full rights                                     │
│  • Collateral Value: 100% of IP valuation                       │
│  • Revenue Share: Required for all loans                        │
│  • Audit Rights: Included                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Collateralization Schedule

```javascript
// Collateralization configuration for Morpho loans
const collateralizationSchedule = {
  ipAsset: {
    id: "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE",
    tokenId: 15192,
    valuation: 10000000, // $10M IP portfolio valuation
    currency: "USD"
  },
  
  licenses: {
    "PIL-PER": {
      royaltyBps: 100,      // 1%
      collateralRatio: 0.1, // 10% of valuation usable
      maxLoan: 1000000      // $1M max
    },
    "PIL-COM": {
      royaltyBps: 500,      // 5%
      collateralRatio: 0.5, // 50% of valuation usable
      maxLoan: 5000000      // $5M max
    },
    "PIL-ENT": {
      royaltyBps: 1200,     // 12%
      collateralRatio: 1.0, // 100% of valuation usable
      maxLoan: 10000000     // $10M max
    }
  },
  
  morphoMarkets: [
    {
      name: "BTC Collateral Market",
      loanToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
      collateral: "WBTC",
      principal: 5000000,
      aprBps: 400,  // 4%
      lltv: 860000000000000000n, // 86%
      licenseRequired: "PIL-COM"
    },
    {
      name: "ETH Collateral Market",
      loanToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
      collateral: "WETH",
      principal: 1000000,
      aprBps: 600,  // 6%
      lltv: 860000000000000000n, // 86%
      licenseRequired: "PIL-PER"
    }
  ]
};
```

### 8.3 Binding Licenses via Safe

```
Transaction Flow (3/5 signatures required):

1. PROPOSE: SPV1 (Millionaire Resilience) creates transaction
   └─► Call: IPRegistry.bindPILTerms(ipId, licenseTerms)

2. SIGN: SPV2 (Gladiator Holdings) signs
   └─► 1/5 signatures collected

3. SIGN: SPV3 (SLAPS Streaming) signs
   └─► 2/5 signatures collected

4. SIGN: SPV4 (Resilience Blockchain) signs
   └─► 3/5 signatures collected ✓ THRESHOLD MET

5. EXECUTE: Any owner can execute
   └─► Transaction broadcast to Story Protocol
   └─► PIL terms bound to IP asset
```

---

## 9. Morpho Protocol Loan Workflow

### 9.1 Complete Loan Origination Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              MORPHO PROTOCOL LOAN ORIGINATION FLOW               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: IP REGISTRATION (Story Protocol)                       │
│  ─────────────────────────────────────────                       │
│  │                                                               │
│  │  Safe Wallet (Story) ──► IP Registry                         │
│  │       │                                                       │
│  │       └──► registerIpAsset()                                 │
│  │            • IP ID: 0x98971c...                              │
│  │            • Metadata URI: ipfs://...                        │
│  │            • 3/5 signatures required                         │
│  │                                                               │
│  ▼                                                               │
│  STEP 2: LICENSE BINDING (Story Protocol)                       │
│  ────────────────────────────────────────                       │
│  │                                                               │
│  │  Safe Wallet (Story) ──► PIL Template                        │
│  │       │                                                       │
│  │       └──► bindLicenseTerms()                                │
│  │            • PIL-COM: 5% royalty                             │
│  │            • Revenue share enabled                           │
│  │            • 3/5 signatures required                         │
│  │                                                               │
│  ▼                                                               │
│  STEP 3: UCC-1 RECORDING (On-Chain)                             │
│  ──────────────────────────────────                             │
│  │                                                               │
│  │  Safe Wallet (Story) ──► UCC1FilingIntegration               │
│  │       │                                                       │
│  │       └──► recordFiling()                                    │
│  │            • Filing #: 20260000078753                        │
│  │            • IPFS CID: bafkrei...                            │
│  │            • 3/5 signatures required                         │
│  │                                                               │
│  ▼                                                               │
│  STEP 4: COLLATERAL DEPOSIT (Base L2)                           │
│  ─────────────────────────────────────                          │
│  │                                                               │
│  │  Safe Wallet (Base) ──► Morpho Blue                          │
│  │       │                                                       │
│  │       └──► supply()                                          │
│  │            • Asset: WBTC or WETH                             │
│  │            • Amount: Based on LTV                            │
│  │            • Gas: Sponsored by Coinbase                      │
│  │            • 3/5 signatures required                         │
│  │                                                               │
│  ▼                                                               │
│  STEP 5: LOAN ORIGINATION (Base L2)                             │
│  ──────────────────────────────────                             │
│  │                                                               │
│  │  Safe Wallet (Base) ──► Morpho Blue                          │
│  │       │                                                       │
│  │       └──► borrow()                                          │
│  │            • Amount: $5M or $1M USDC                         │
│  │            • APR: 4% or 6%                                   │
│  │            • Gas: Sponsored by Coinbase                      │
│  │            • 3/5 signatures required                         │
│  │                                                               │
│  ▼                                                               │
│  STEP 6: FUND DISTRIBUTION                                       │
│  ─────────────────────────                                       │
│                                                                  │
│  USDC sent to Safe Wallet on Base L2                            │
│  Available for SPV operations                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Transaction Queue Example

```javascript
// Example Safe transaction queue for loan origination
const transactionQueue = [
  {
    step: 1,
    network: "story",
    to: "0x77319B4031e6eF1250907aa00018B8B1c67a244b", // IP Registry
    data: "registerIpAsset(...)",
    signatures: 0,
    threshold: 3,
    status: "pending"
  },
  {
    step: 2,
    network: "story",
    to: "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316", // PIL Template
    data: "bindLicenseTerms(...)",
    signatures: 0,
    threshold: 3,
    status: "queued"
  },
  {
    step: 3,
    network: "base",
    to: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", // Morpho Blue
    data: "supply(...)",
    signatures: 0,
    threshold: 3,
    status: "queued",
    gasSponsored: true
  },
  {
    step: 4,
    network: "base",
    to: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", // Morpho Blue
    data: "borrow(...)",
    signatures: 0,
    threshold: 3,
    status: "queued",
    gasSponsored: true
  }
];
```

---

## 10. Testing & Verification

### 10.1 Safe Connectivity Test

```bash
#!/bin/bash
# test-safe-connectivity.sh

echo "============================================================"
echo "SAFE WALLET CONNECTIVITY TEST"
echo "============================================================"

# Test Story Protocol Safe
echo ""
echo "Testing Story Protocol Safe..."
STORY_SAFE="0x[SAFE_STORY_ADDRESS]"
curl -s "https://safe-transaction-story.safe.global/api/v1/safes/$STORY_SAFE/" | jq '.threshold, .owners'

# Test Base L2 Safe
echo ""
echo "Testing Base L2 Safe..."
BASE_SAFE="0x[SAFE_BASE_ADDRESS]"
curl -s "https://safe-transaction-base.safe.global/api/v1/safes/$BASE_SAFE/" | jq '.threshold, .owners'

echo ""
echo "============================================================"
echo "Connectivity test complete"
```

### 10.2 Multi-Sig Signing Test

```
TEST SCENARIO: Sign a test message with 3/5 signers

1. SPV1 proposes test transaction
2. SPV2 signs → 1/5 ❌ (below threshold)
3. SPV3 signs → 2/5 ❌ (below threshold)
4. SPV4 signs → 3/5 ✓ (threshold met)
5. Transaction becomes executable
6. Any owner can execute

EXPECTED RESULT:
✓ Transaction executes after 3rd signature
✓ SPV5 signature not required (but can be added)
```

### 10.3 WalletConnect Verification

```
For each connected dApp, verify:

☐ StoryScan
  └─ Safe address displays correctly
  └─ Can view transaction history
  └─ Contract verification accessible

☐ IP Portal
  └─ Safe address displays correctly
  └─ Can view registered IP assets
  └─ Can initiate license binding

☐ BaseScan
  └─ Safe address displays correctly
  └─ Can view transaction history
  └─ Contract verification accessible

☐ Morpho App
  └─ Safe address displays correctly
  └─ Can view market positions
  └─ Can initiate supply/borrow
```

---

## 11. Security Checklist

### Pre-Deployment Security

```
SAFE WALLET SECURITY:
☐ 3/5 threshold configured correctly
☐ All 5 owner addresses verified
☐ Each SPV has separate secure key storage
☐ Hardware wallets used for high-value signers
☐ Recovery procedures documented

WALLETCONNECT SECURITY:
☐ Only connect to verified dApps
☐ Review all connection requests
☐ Disconnect unused sessions
☐ Never share session URIs

TRANSACTION SECURITY:
☐ Review all transaction data before signing
☐ Verify recipient addresses
☐ Check gas estimates
☐ Use simulation before execution

UCC-1 COMPLIANCE:
☐ Filing recorded on-chain
☐ IPFS documents accessible
☐ Secured party properly identified
☐ Collateral description accurate
```

---

## 12. Quick Reference

### Key Addresses

| Entity | Address | Network |
|--------|---------|---------|
| SPV1 (Millionaire Resilience) | `0x5EEFF17e12401b6A8391f5257758E07c157E1e45` | Story |
| SPV2 (Gladiator Holdings) | `0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A` | Base |
| SPV5 (Coinbase Auth) | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` | Base |
| Morpho Blue | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` | Base |
| IP Registry | `0x77319B4031e6eF1250907aa00018B8B1c67a244b` | Story |
| PIL Template | `0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316` | Story |

### Network Configuration

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Story Protocol | 1514 | https://mainnet.storyrpc.io | https://www.storyscan.io |
| Base L2 | 8453 | https://mainnet.base.org | https://basescan.org |

### Multi-Sig Requirements

| Action | Threshold | Network |
|--------|-----------|---------|
| Deploy Contracts | 3/5 | Story |
| Register IP | 3/5 | Story |
| Bind Licenses | 3/5 | Story |
| Supply Collateral | 3/5 | Base |
| Borrow USDC | 3/5 | Base |
| Withdraw Funds | 3/5 | Base |

### Quick Commands

```bash
# Generate signature payload
node scripts/anchor-signature.cjs

# Verify multi-sig
node scripts/verify-multisig.cjs

# Deploy to Story (requires Safe execution)
npm run contracts:deploy:story

# Deploy to Base (requires Safe execution)
npm run contracts:deploy:base
```

---

## Document Information

**Version:** 2.0.0  
**Last Updated:** April 12, 2026  
**Repository:** https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH
