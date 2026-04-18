# MetaMask Deployment Workflow for StoryScan & Basescan

Complete guide for deploying 12 smart contracts to **Story Protocol Mainnet** and **Base L2** using MetaMask as the transaction signer, with environment secrets separated from the development environment.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Secrets Separation Architecture](#2-secrets-separation-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Step 1: Compile Contracts](#step-1-compile-contracts)
5. [Step 2: Connect MetaMask to Networks](#step-2-connect-metamask-to-networks)
6. [Step 3: Deploy via MetaMask (Remix IDE)](#step-3-deploy-via-metamask-remix-ide)
7. [Step 4: Deploy via MetaMask (Hardhat + MetaMask)](#step-4-deploy-via-metamask-hardhat--metamask)
8. [Step 5: Record Deployed Addresses](#step-5-record-deployed-addresses)
9. [Step 6: Verify on StoryScan & Basescan](#step-6-verify-on-storyscan--basescan)
10. [Step 7: Post-Deployment Orchestration](#step-7-post-deployment-orchestration)
11. [Step 8: Pin to Pinata IPFS](#step-8-pin-to-pinata-ipfs)
12. [Step 9: GitHub Actions Automated Verification](#step-9-github-actions-automated-verification)
13. [Step 10: GitHub Pages Deployment](#step-10-github-pages-deployment)
14. [Contract Deployment Order](#contract-deployment-order)
15. [Troubleshooting](#troubleshooting)

---

## 1. Architecture Overview

The MetaMask deployment path separates concerns:

```
+---------------------------+     +----------------------------+
|  DEVELOPMENT ENVIRONMENT  |     |  SECRETS ENVIRONMENT       |
|  (Repository / Azure VM)  |     |  (GitHub Encrypted Store)  |
|                           |     |                            |
|  contracts/  (Solidity)   |     |  DEPLOYER_PRIVATE_KEY      |
|  artifacts/  (Compiled)   |     |  ALCHEMY_API_KEY           |
|  scripts/    (Tooling)    |     |  STORYSCAN_API_KEY         |
|  docs/       (Reference)  |     |  ETHERSCAN_API_KEY         |
|                           |     |  PINATA_JWT                |
|  NO private keys here     |     |  PINATA_GATEWAY_TOKEN      |
+---------------------------+     +----------------------------+
            |                                  |
            v                                  v
+---------------------------+     +----------------------------+
|  METAMASK (Browser)       |     |  GITHUB ACTIONS (CI/CD)    |
|                           |     |                            |
|  Signs transactions       |     |  Compiles contracts        |
|  Deploys to mainnet       |     |  Verifies on explorers     |
|  User retains key custody |     |  Orchestrates post-deploy  |
|                           |     |  Pins to Pinata IPFS       |
+---------------------------+     |  Updates GitHub Pages      |
                                  +----------------------------+
```

**Key principle:** The repository contains ZERO private keys or secrets. All sensitive values live exclusively in:
- **MetaMask** (user's browser — for transaction signing)
- **GitHub Environment Secrets** (encrypted — for CI/CD automation)
- **Azure Key Vault** (optional — for VM-based deployments)

---

## 2. Secrets Separation Architecture

### What Goes WHERE

| Category | Location | Examples |
|---|---|---|
| **Source Code** | Repository (`contracts/`, `scripts/`) | Solidity files, deployment scripts, configs |
| **Public Addresses** | Repository Variables (`vars.*`) | Multi-sig signers, Safe contract, IPFS CIDs |
| **Private Keys** | MetaMask wallet OR GitHub Env Secrets | `DEPLOYER_PRIVATE_KEY` |
| **API Keys** | GitHub Secrets (global) | `ALCHEMY_API_KEY`, `PINATA_JWT`, `STORYSCAN_API_KEY` |
| **Deployment Data** | GitHub Artifacts (per-run) | `deployment-config.story.json`, ABI proof |

### Repository MUST NOT Contain

- Private keys (deployer or signer)
- API keys or JWT tokens
- Mnemonic / seed phrases
- `.env` files with real values (only `.env.example` with placeholders)

### .env.example (Reference Only)

The `.env.example` file in the repo serves as a **template** — it documents every variable but contains only placeholder values. Developers copy it to `.env` (gitignored) and fill in their own values locally.

### GitHub Environments

| Environment | Purpose | Secrets Scoped |
|---|---|---|
| `story-mainnet` | Story Protocol deployment (Chain 1514) | `DEPLOYER_PRIVATE_KEY`, `STORYSCAN_API_KEY` |
| `base-mainnet` | Base L2 deployment (Chain 8453) | `DEPLOYER_PRIVATE_KEY`, `ETHERSCAN_API_KEY` |
| `github-pages` | Documentation hosting | None (read-only) |

---

## 3. Prerequisites

| Component | Required For | Installation |
|---|---|---|
| MetaMask browser extension | Transaction signing | https://metamask.io/download |
| Node.js v20 | Contract compilation | `nvm install 20` |
| GitHub CLI | Workflow triggers | https://cli.github.com |
| Foundry (optional) | CLI signing alternative | `curl -L https://foundry.paradigm.xyz \| bash` |

### MetaMask Account Setup

Ensure MetaMask has the deployer account imported:
- **Deployer address:** `0x5EEFF17e12401b6A8391f5257758E07c157E1e45`
- The account must hold sufficient ETH/IP for gas on both networks

---

## Step 1: Compile Contracts

```bash
git clone https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
cd Millionaire-Resilience-LLC-JAH
npm install --legacy-peer-deps
npx hardhat compile --force
```

This produces the `artifacts/` directory with ABI and bytecode for all 12 contracts.

---

## Step 2: Connect MetaMask to Networks

### Add Story Protocol Mainnet to MetaMask

1. Open MetaMask > Settings > Networks > Add Network
2. Enter:

| Field | Value |
|---|---|
| Network Name | Story Protocol Mainnet |
| RPC URL | `https://mainnet.storyrpc.io` |
| Chain ID | `1514` |
| Currency Symbol | `IP` |
| Block Explorer | `https://www.storyscan.io` |

### Add Base Mainnet to MetaMask

1. Open MetaMask > Settings > Networks > Add Network
2. Enter:

| Field | Value |
|---|---|
| Network Name | Base |
| RPC URL | `https://mainnet.base.org` |
| Chain ID | `8453` |
| Currency Symbol | `ETH` |
| Block Explorer | `https://basescan.org` |

---

## Step 3: Deploy via MetaMask (Remix IDE)

This method requires no private key in any file or environment — MetaMask signs everything in the browser.

### 3.1 Open Remix IDE

Navigate to https://remix.ethereum.org

### 3.2 Import Contracts

1. In Remix, click **File Explorer** > **Upload Folder**
2. Upload the entire `contracts/` directory (12 `.sol` files)
3. Also upload `node_modules/@openzeppelin/` if contracts import OpenZeppelin

### 3.3 Compile in Remix

1. Go to the **Solidity Compiler** tab
2. Set compiler version to **0.8.26**
3. Enable **Optimization** (200 runs, or 1 run for StoryAttestationService)
4. Enable **viaIR**
5. Click **Compile** for each contract

### 3.4 Deploy Each Contract

1. Go to the **Deploy & Run Transactions** tab
2. Set Environment to **Injected Provider - MetaMask**
3. MetaMask will prompt to connect — confirm
4. Select the contract from the dropdown
5. Click **Deploy**
6. **MetaMask popup:** Review the transaction details and click **Confirm**
7. Wait for the transaction to be mined
8. Copy the deployed contract address from Remix

### 3.5 Switch Networks

- Deploy Story Protocol contracts (1-3, 6-12) on **Story Protocol Mainnet**
- Deploy Base L2 contracts (4-5, 6-12) on **Base**
- Switch networks in MetaMask between deployments

---

## Step 4: Deploy via MetaMask (Hardhat + MetaMask)

For users who prefer the Hardhat scripted deployment but want MetaMask to hold the key:

### 4.1 Export Private Key from MetaMask (Temporary)

1. Open MetaMask > Account Details > Show Private Key
2. Copy the key

### 4.2 Set Environment Variable (Session Only)

```bash
# Set for this terminal session only — NOT saved to any file
export DEPLOYER_PRIVATE_KEY="0xYOUR_KEY_HERE"

# Deploy to Story Protocol
npx hardhat run scripts/deploy.cjs --network story

# Deploy to Base L2
npx hardhat run scripts/deploy.cjs --network base

# IMMEDIATELY clear the key from environment
unset DEPLOYER_PRIVATE_KEY
```

### 4.3 Azure Key Vault Method (Most Secure)

```bash
# Load from Key Vault — key never touches the filesystem
export DEPLOYER_PRIVATE_KEY=$(az keyvault secret show \
  --vault-name kv-blockchain-deploy \
  --name "DEPLOYER-PRIVATE-KEY" \
  --query value -o tsv)

npx hardhat run scripts/deploy.cjs --network story
npx hardhat run scripts/deploy.cjs --network base

unset DEPLOYER_PRIVATE_KEY
```

---

## Step 5: Record Deployed Addresses

After deployment (via either method), save the contract addresses:

```bash
# If deployed via Hardhat, the file is auto-generated:
cat deployment-config.story.json
cat deployment-config.base.json

# If deployed via Remix, create the config manually:
node -e "
const fs = require('fs');
const config = {
  network: 'story',
  chainId: 1514,
  deployer: '0x5EEFF17e12401b6A8391f5257758E07c157E1e45',
  timestamp: new Date().toISOString(),
  contracts: {
    StoryAttestationService: 'PASTE_ADDRESS_HERE',
    StoryOrchestrationService: 'PASTE_ADDRESS_HERE',
    StoryAttestationBridge: 'PASTE_ADDRESS_HERE',
    SLAPSIPSpvLoan: 'PASTE_ADDRESS_HERE',
    GladiatorHoldingsSpvLoan: 'PASTE_ADDRESS_HERE',
    PILLoanEnforcement: 'PASTE_ADDRESS_HERE',
    StablecoinIPEscrow: 'PASTE_ADDRESS_HERE',
    AngelCoin: 'PASTE_ADDRESS_HERE',
    ResilienceToken: 'PASTE_ADDRESS_HERE',
    SlapsStreaming: 'PASTE_ADDRESS_HERE',
    SlapsSPV: 'PASTE_ADDRESS_HERE',
    UCC1FilingIntegration: 'PASTE_ADDRESS_HERE'
  }
};
fs.writeFileSync('deployment-config.story.json', JSON.stringify(config, null, 2));
console.log('Saved deployment-config.story.json');
"
```

---

## Step 6: Verify on StoryScan & Basescan

### 6.1 Automated Verification (Hardhat)

```bash
# Verify all Story Protocol contracts
npm run contracts:verify:story

# Verify all Base L2 contracts
npm run contracts:verify:base
```

### 6.2 Manual Verification (StoryScan)

1. Go to https://www.storyscan.io/address/CONTRACT_ADDRESS
2. Click **Contract** > **Verify and Publish**
3. Select: Solidity (Single file) / Compiler 0.8.26 / MIT License
4. Paste the flattened source (from `archive/flattened-contracts/`)
5. Enable Optimization (runs: 200, or 1 for StoryAttestationService)
6. Click **Verify**

### 6.3 Manual Verification (Basescan)

1. Go to https://basescan.org/address/CONTRACT_ADDRESS
2. Click **Contract** > **Verify and Publish**
3. Same process as StoryScan above

---

## Step 7: Post-Deployment Orchestration

```bash
# Story Protocol: register IP assets, attach licenses, record UCC-1
npm run contracts:orchestrate:story
npm run contracts:record-ucc1:story

# Base L2: configure Morpho markets, register SPV loans
npm run contracts:orchestrate:base
npm run contracts:record-ucc1:base

# Generate attestation hashes
npm run contracts:attestation-hashes
```

---

## Step 8: Pin to Pinata IPFS

```bash
# Pin ABI proof
node scripts/export-abi-proof.cjs
node scripts/pin-to-pinata.cjs

# Pin deployment registry
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"pinataContent\":$(cat deployment-registry.json),\"pinataMetadata\":{\"name\":\"Deployment_Registry\"}}"

# Pin valuation attestation
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"pinataContent\":$(cat valuation-attestation.json),\"pinataMetadata\":{\"name\":\"Valuation_Attestation\"}}"
```

---

## Step 9: GitHub Actions Automated Verification

After deploying via MetaMask, trigger the automated verification and Pinata pinning workflow:

### 9.1 Via GitHub CLI

```bash
# Trigger the MetaMask deployment workflow
gh workflow run "MetaMask Deployment — Compile, Pin & Verify" \
  --field network=both \
  --field deployment_config_story="$(cat deployment-config.story.json)" \
  --field deployment_config_base="$(cat deployment-config.base.json)"

# Monitor
gh run watch
```

### 9.2 Via GitHub UI

1. Go to **Actions** > **MetaMask Deployment -- Compile, Pin & Verify**
2. Click **Run workflow**
3. Select network: `both`
4. Paste `deployment-config.story.json` contents
5. Paste `deployment-config.base.json` contents
6. Click **Run workflow**

The workflow will:
1. Compile and export ABI proof
2. Pin ABI proof, valuation attestation, and multi-sig config to Pinata
3. Verify contracts on StoryScan and Basescan
4. Run post-deployment orchestration
5. Pin deployment registry to Pinata
6. Deploy updated documentation to GitHub Pages

---

## Step 10: GitHub Pages Deployment

GitHub Pages automatically deploys from `docs/` on every push to `main`. The MetaMask workflow also triggers a Pages deployment after successful verification.

### Manual Trigger

```bash
gh workflow run "Deploy GitHub Pages"
```

### Verify Pages

```bash
gh api repos/slaps6331-cell/Millionaire-Resilience-LLC-JAH/pages --jq '.html_url'
```

---

## Contract Deployment Order

Deploy in this order to satisfy constructor dependencies:

| # | Contract | Network | Dependencies |
|---|---|---|---|
| 1 | `StoryAttestationService` | Story (1514) | None |
| 2 | `StoryOrchestrationService` | Story (1514) | None |
| 3 | `StoryAttestationBridge` | Story (1514) | None |
| 4 | `UCC1FilingIntegration` | Both | None |
| 5 | `PILLoanEnforcement` | Both | None |
| 6 | `SLAPSIPSpvLoan` | Both | None |
| 7 | `GladiatorHoldingsSpvLoan` | Both | None |
| 8 | `SlapsSPV` | Both | None |
| 9 | `SlapsStreaming` | Both | None |
| 10 | `StablecoinIPEscrow` | Both | None |
| 11 | `ResilienceToken` | Both | None |
| 12 | `AngelCoin` | Both | None |

All contracts have no-argument constructors, so they can be deployed in any order. The recommended order above groups by functional dependency for orchestration.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| MetaMask doesn't show Story network | Add custom network manually (see Step 2) |
| "Insufficient funds" error | Check deployer balance: Settings > Networks in MetaMask |
| Contract too large (>24KB) | StoryAttestationService uses `runs=1` optimizer — ensure Remix matches |
| StoryScan verification fails | Ensure exact compiler settings match (0.8.26, optimizer, viaIR) |
| Basescan verification fails | Check `ETHERSCAN_API_KEY` is set correctly |
| GitHub Actions can't find deployment config | Paste the full JSON in the workflow dispatch input |
| Pinata pinning fails | Verify `PINATA_JWT` secret is set and not expired |
