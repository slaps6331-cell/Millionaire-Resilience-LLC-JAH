# Deployment Guide

## Millionaire Resilience LLC — Smart Contract Deployment Pipeline

This guide covers deploying smart contracts to **Story Protocol (Chain 1514)** and **Base L2 (Chain 8453)** using the automated GitHub Actions pipeline.

---

## Network Information

| Network | Chain ID | RPC URL | Explorer |
|---|---|---|---|
| Story Protocol | 1514 | `https://mainnet.storyrpc.io` | https://www.storyscan.io |
| Base L2 | 8453 | `https://mainnet.base.org` | https://basescan.org |
| Ethereum Mainnet | 1 | `https://cloudflare-eth.com` | https://etherscan.io |

---

## Smart Contract Architecture

The repository deploys 11 Solidity contracts:

| Contract | Purpose |
|---|---|
| `StoryAttestationService` | Core UCC-1 / IP attestation on Story Protocol |
| `StoryAttestationBridge` | Cross-chain bridge for attestation data |
| `StoryOrchestrationService` | Orchestrates multi-contract Story Protocol calls |
| `SLAPSIPSpvLoan` | SLAPS Holdings SPV loan contract |
| `GladiatorHoldingsSpvLoan` | Gladiator Holdings SPV loan contract |
| `SlapsSPV` | SLAPS Special Purpose Vehicle |
| `SlapsStreaming` | IP royalty streaming contract |
| `StablecoinIPEscrow` | Stablecoin escrow backed by IP assets |
| `PILLoanEnforcement` | Programmable IP License enforcement |
| `AngelCoin` | ERC-20 token for ecosystem participants |
| `ResilienceToken` | ERC-20 governance/utility token |

---

## Deployment Prerequisites

### 1. Deployer Wallet

| Requirement | Detail |
|---|---|
| Story Protocol gas | Minimum **0.5 IP** on Chain 1514 |
| Base L2 gas | Minimum **0.01 ETH** on Chain 8453 |
| Private key format | 64-hex-digit string prefixed with `0x` |

### 2. Required Secrets

Set the following in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `DEPLOYER_PRIVATE_KEY` | Deployer wallet private key (0x format) |
| `ALCHEMY_API_KEY` | Alchemy RPC provider key |
| `STORYSCAN_API_KEY` | Story Protocol block explorer API key |
| `ETHERSCAN_API_KEY` | Etherscan / Basescan verification API key |
| `PINATA_JWT` | Pinata authentication JWT |
| `PINATA_API_KEY` | Pinata API key |
| `PINATA_SECRET_API_KEY` | Pinata secret API key |
| `COINBASE_API_KEY_NAME` | CDP API key ID |
| `COINBASE_API_KEY_PRIVATE_KEY` | CDP private key (PEM format) |
| `THIRDWEB_CLIENT_ID` | ThirdWeb SDK client ID |
| `THIRDWEB_SECRET_KEY` | ThirdWeb SDK secret key |

### 3. Required Variables (Public)

| Variable | Value |
|---|---|
| `STORY_DEPLOYER_ADDRESS` | `0x597856e93f19877a399f686D2F43b298e2268618` |
| `COINBASE_WALLET_ADDRESS` | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |
| `UCC1_FILING_NUMBER` | `20260000078753` |
| `UCC1_FINANCING_STATEMENT_CID` | `bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu` |
| `STORY_RPC_URL` | `https://mainnet.storyrpc.io` |
| `BASE_RPC_URL` | `https://mainnet.base.org` |
| `STORY_PROTOCOL_REGISTRY` | `0x77319B4031e6eF1250907aa00018B8B1c67a244b` |
| `MORPHO_BLUE` | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |

---

## Manual Deployment Instructions

### Via GitHub Actions UI

1. Navigate to **Actions → Deploy Smart Contracts**
2. Click **Run workflow**
3. Select the target network (`story`, `base`, `both`, or `all`)
4. Toggle `verify` to `true` to verify contracts after deployment
5. Click **Run workflow**

### Via GitHub CLI

```bash
# Deploy to Story Protocol only
gh workflow run deploy-contracts.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field network=story \
  --field verify=true \
  --field dry_run=false

# Deploy to Base L2 only
gh workflow run deploy-contracts.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field network=base \
  --field verify=true \
  --field dry_run=false

# Deploy to both networks
gh workflow run deploy-contracts.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field network=both \
  --field verify=true \
  --field dry_run=false
```

### Monitor Deployment

```bash
gh run watch --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH
gh run view  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH --log
```

---

## Post-Deployment Verification

Deployment hashes are automatically recorded in `deployment-registry.json`. You can also verify manually:

- **StoryScan**: https://www.storyscan.io/address/`<contract-address>`
- **Basescan**: https://basescan.org/address/`<contract-address>`

See [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) for workflow automation details.
