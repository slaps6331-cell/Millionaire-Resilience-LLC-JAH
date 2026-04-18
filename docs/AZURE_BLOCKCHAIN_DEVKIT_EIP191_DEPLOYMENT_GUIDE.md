# Azure Blockchain Development Kit & GitHub CLI: EIP-191 Multi-Sig Signing and Smart Contract Deployment

Complete workflow guide for compiling, signing, verifying, and deploying the Millionaire Resilience LLC smart contracts to **Story Protocol Mainnet (Chain 1514)** and **Base L2 (Chain 8453)** using the Azure ecosystem and GitHub CLI.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Azure VM Environment Setup](#2-azure-vm-environment-setup)
3. [Project Initialization with Azure Blockchain Development Kit](#3-project-initialization-with-azure-blockchain-development-kit)
4. [Compile Smart Contracts](#4-compile-smart-contracts)
5. [EIP-191 Signature Generation (3-of-5 Multi-Sig)](#5-eip-191-signature-generation-3-of-5-multi-sig)
6. [Multi-Sig Signature Verification](#6-multi-sig-signature-verification)
7. [Configure GitHub Environment Variables via CLI](#7-configure-github-environment-variables-via-cli)
8. [Deploy to Story Protocol Mainnet (Chain 1514)](#8-deploy-to-story-protocol-mainnet-chain-1514)
9. [Deploy to Base L2 (Chain 8453)](#9-deploy-to-base-l2-chain-8453)
10. [Verify on StoryScan and Basescan](#10-verify-on-storyscan-and-basescan)
11. [Post-Deployment Orchestration](#11-post-deployment-orchestration)
12. [UCC-1 On-Chain Recording](#12-ucc-1-on-chain-recording)
13. [Morpho Protocol Market Configuration](#13-morpho-protocol-market-configuration)
14. [Hermetic Seal & Valuation Attestation Hashes](#14-hermetic-seal--valuation-attestation-hashes)
15. [GitHub Actions CI/CD Trigger](#15-github-actions-cicd-trigger)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Prerequisites

| Component | Version | Installation |
|---|---|---|
| Azure Subscription | Active | https://portal.azure.com |
| Node.js | v20.x LTS | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install -y nodejs` |
| VS Code | Latest | https://code.visualstudio.com |
| Azure Blockchain Dev Kit | VS Code Extension | Extensions Marketplace: "Azure Blockchain Development Kit for Ethereum" |
| Foundry (cast, forge) | Latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| GitHub CLI (gh) | Latest | `curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \| sudo dd of=/usr/share/keyrings/githubcli.gpg && echo "deb [signed-by=/usr/share/keyrings/githubcli.gpg] https://cli.github.com/packages stable main" \| sudo tee /etc/apt/sources.list.d/github-cli.list && sudo apt update && sudo apt install gh` |
| Azure CLI | Latest | `curl -sL https://aka.ms/InstallAzureCLIDeb \| sudo bash` |
| Hardhat | v2.x | Included in `package.json` |

---

## 2. Azure VM Environment Setup

### 2.1 Create Azure VM

```bash
az vm create \
    --resource-group rg-blockchain-deployment \
    --name vm-contract-deployer \
    --image Ubuntu2204 \
    --size Standard_D2s_v3 \
    --admin-username azureuser \
    --generate-ssh-keys \
    --os-disk-size-gb 64
```

### 2.2 Configure Azure Key Vault for Secrets

```bash
az keyvault create --name kv-blockchain-deploy --resource-group rg-blockchain-deployment

az keyvault secret set --vault-name kv-blockchain-deploy --name "DEPLOYER-PRIVATE-KEY" --value "YOUR_PRIVATE_KEY_HERE"
az keyvault secret set --vault-name kv-blockchain-deploy --name "ALCHEMY-API-KEY" --value "YOUR_ALCHEMY_KEY"
az keyvault secret set --vault-name kv-blockchain-deploy --name "PINATA-JWT" --value "YOUR_PINATA_JWT"

az vm identity assign --name vm-contract-deployer --resource-group rg-blockchain-deployment
PRINCIPAL_ID=$(az vm show --name vm-contract-deployer --resource-group rg-blockchain-deployment --query identity.principalId -o tsv)
az keyvault set-policy --name kv-blockchain-deploy --object-id $PRINCIPAL_ID --secret-permissions get list
```

### 2.3 Load Secrets on VM

```bash
az login --identity
export DEPLOYER_PRIVATE_KEY=$(az keyvault secret show --vault-name kv-blockchain-deploy --name "DEPLOYER-PRIVATE-KEY" --query value -o tsv)
export ALCHEMY_API_KEY=$(az keyvault secret show --vault-name kv-blockchain-deploy --name "ALCHEMY-API-KEY" --query value -o tsv)
export PINATA_JWT=$(az keyvault secret show --vault-name kv-blockchain-deploy --name "PINATA-JWT" --query value -o tsv)
```

---

## 3. Project Initialization with Azure Blockchain Development Kit

### 3.1 VS Code Extension Method

1. Open VS Code
2. Press `Ctrl+Shift+P` to open the command palette
3. Select **Azure Blockchain: New Solidity Project**
4. Choose **Create basic project** and select your project folder
5. The extension generates `contracts/`, `scripts/`, and `test/` folders

### 3.2 Existing Repo Method (Recommended)

```bash
git clone https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
cd Millionaire-Resilience-LLC-JAH
npm install --legacy-peer-deps
```

### 3.3 Repo Structure

```
Millionaire-Resilience-LLC-JAH/
+-- contracts/           # 12 Solidity smart contracts
+-- scripts/             # Deployment, signing, and orchestration scripts
+-- docs/                # Architecture and workflow documentation
+-- artifacts/           # Compiled ABIs and bytecode (auto-generated)
+-- archive/             # Non-essential reference files
+-- .github/workflows/   # CI/CD deployment pipelines
+-- mcp-servers/         # Model Context Protocol integrations
+-- hardhat.config.cjs   # Hardhat configuration (Story, Base, Mainnet)
+-- foundry.toml         # Foundry configuration (dual-stack)
+-- signature-morpho-config.json  # Multi-sig signing state
+-- deployment-registry.json      # Deployed contract addresses
+-- valuation-attestation.json    # IP valuation and attestation hashes
```

---

## 4. Compile Smart Contracts

### 4.1 Hardhat Compilation

```bash
npx hardhat compile --force
```

This compiles all 12 contracts:

| # | Contract | Purpose |
|---|---|---|
| 1 | `StoryAttestationService.sol` | IP attestation registration on Story Protocol |
| 2 | `StoryAttestationBridge.sol` | Cross-chain attestation bridge (Story <> Base) |
| 3 | `StoryOrchestrationService.sol` | Deployment orchestration and registry |
| 4 | `UCC1FilingIntegration.sol` | On-chain UCC-1 financing statement recording |
| 5 | `PILLoanEnforcement.sol` | Programmable IP License loan enforcement |
| 6 | `SLAPSIPSpvLoan.sol` | SLAPS IP SPV loan collateral management |
| 7 | `SlapsSPV.sol` | SLAPS Special Purpose Vehicle |
| 8 | `SlapsStreaming.sol` | SLAPS streaming revenue distribution |
| 9 | `GladiatorHoldingsSpvLoan.sol` | Gladiator Holdings SPV loan structure |
| 10 | `StablecoinIPEscrow.sol` | USDC escrow for IP revenue |
| 11 | `ResilienceToken.sol` | Governance/utility token |
| 12 | `AngelCoin.sol` | Angel investment token |

### 4.2 Foundry Compilation (Alternative)

```bash
forge build
```

### 4.3 VS Code Method

Right-click any `.sol` file in the contracts folder and select **Build Contracts**.

---

## 5. EIP-191 Signature Generation (3-of-5 Multi-Sig)

The Morpho Protocol multi-sig requires EIP-191 (`personal_sign`) signatures from at least **3 of 5** Safe wallet owners.

### 5.1 Generate the Signing Hash

```bash
node scripts/anchor-signature.cjs
```

This produces `signature-morpho-config.json` containing:
- `signatureHash`: raw keccak256 hash of the UCC-1 metadata
- `eip191Hash`: the EIP-191 prefixed hash that signers must sign

```bash
EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")
echo "EIP-191 Hash to sign: $EIP191_HASH"
```

**Current EIP-191 Hash:**
```
0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb
```

### 5.2 Signer Addresses

| Signer | Address | Method |
|---|---|---|
| Signer 1 (Coinbase) | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` | Coinbase Wallet / WalletConnect |
| Signer 2 (Morpho Auth) | `0x20A8402c67b9D476ddC1D2DB12f03B30A468f135` | Safe / WalletConnect |
| Signer 3 (Story Deployer) | `0x5EEFF17e12401b6A8391f5257758E07c157E1e45` | MetaMask |
| Signer 4 (Base Auth) | `0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A` | MyEtherWallet |
| Signer 5 (SPV Custodian) | `0xD39447807f18Ba965E8F3F6929c8815794B3C951` | Safe / WalletConnect |

Safe Contract: `0xd314BE0a27c73Cd057308aC4f3dd472c482acc09`

### 5.3 Signing Methods

**Method A: Foundry cast (CLI — Recommended for Azure VM)**

```bash
# Sign with each signer's private key
SIGNATURE=$(cast wallet sign --private-key "$SIGNER_PRIVATE_KEY" --no-hash "$EIP191_HASH")
echo "Signature: $SIGNATURE"
```

**Method B: MetaMask (Browser)**

1. Open MetaMask, connect the signer wallet
2. Open browser console (`F12`):
```javascript
const hash = "0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb";
const signature = await ethereum.request({
  method: "personal_sign",
  params: [hash, "SIGNER_ADDRESS_HERE"]
});
console.log("Signature:", signature);
```

**Method C: MyEtherWallet**

1. Go to https://www.myetherwallet.com/wallet/sign
2. Connect wallet (hardware or software)
3. Select "Sign Message"
4. Paste the EIP-191 hash as the message
5. Sign and copy the 132-character hex signature

**Method D: Safe Wallet (for owners with Safe access)**

1. Open https://app.safe.global
2. Connect via WalletConnect
3. Use the "Sign Message" feature
4. Paste the EIP-191 hash
5. Confirm with the connected owner wallet

### 5.4 Inject Signatures into Config

Once you have at least 3 signatures, update `signature-morpho-config.json`:

```bash
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('signature-morpho-config.json'));
config.signatures.signer1_coinbase = 'YOUR_SIG_1_HERE';
config.signatures.signer2_morpho = 'YOUR_SIG_2_HERE';
config.signatures.signer3_story = 'YOUR_SIG_3_HERE';
// signer4_base and signer5_spv are optional if 3 signatures are already provided
fs.writeFileSync('signature-morpho-config.json', JSON.stringify(config, null, 2));
console.log('Signatures injected successfully');
"
```

---

## 6. Multi-Sig Signature Verification

```bash
node scripts/verify-multisig.cjs
```

Expected output when 3+ signatures are valid:
```
============================================================
Morpho Multi-Sig -- On-Chain Signature Verification
============================================================

Safe contract address: 0xd314BE0a27c73Cd057308aC4f3dd472c482acc09
Multi-sig threshold:   3 of 5

Verifying Signer 1 -- Coinbase Wallet (0xDc2aFCd0...):
  Recovered:    0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a
  [check] Signature valid -- signer address matches

Verifying Signer 2 -- Morpho Authorization (0x20A8402c...):
  Recovered:    0x20A8402c67b9D476ddC1D2DB12f03B30A468f135
  [check] Signature valid -- signer address matches

Verifying Signer 3 -- Story Protocol Deployer (0x5EEFF17e...):
  Recovered:    0x5EEFF17e12401b6A8391f5257758E07c157E1e45
  [check] Signature valid -- signer address matches

============================================================
[check] 3/5 signatures verified (threshold: 3) -- ready to submit to Morpho
============================================================
```

---

## 7. Configure GitHub Environment Variables via CLI

### 7.1 Install and Authenticate GitHub CLI

```bash
gh auth login
gh auth status
```

### 7.2 Set Repository Variables (Public Addresses)

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC-JAH"

# Multi-sig signer addresses
gh variable set MORPHO_MULTISIG_SIGNER_1 --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_2 --body "0x20A8402c67b9D476ddC1D2DB12f03B30A468f135" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_3 --body "0x5EEFF17e12401b6A8391f5257758E07c157E1e45" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_4 --body "0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_5 --body "0xD39447807f18Ba965E8F3F6929c8815794B3C951" --repo $REPO
gh variable set MORPHO_SAFE_ADDRESS --body "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09" --repo $REPO
gh variable set MORPHO_MULTISIG_THRESHOLD --body "3" --repo $REPO
gh variable set STORY_DEPLOYER_ADDRESS --body "0x5EEFF17e12401b6A8391f5257758E07c157E1e45" --repo $REPO
gh variable set COINBASE_WALLET_ADDRESS --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a" --repo $REPO
gh variable set PINATA_GATEWAY_NAME --body "lavender-neat-urial-76" --repo $REPO

# Morpho protocol parameters
gh variable set MORPHO_BLUE --body "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" --repo $REPO
gh variable set BASE_USDC --body "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" --repo $REPO
```

### 7.3 Set Secrets (Private / Sensitive)

```bash
# Global secrets
gh secret set ALCHEMY_API_KEY --repo $REPO
gh secret set PINATA_API_KEY --repo $REPO
gh secret set PINATA_SECRET_API_KEY --repo $REPO
gh secret set PINATA_JWT --repo $REPO
gh secret set PINATA_GATEWAY_TOKEN --repo $REPO

# Per-environment secrets
gh secret set DEPLOYER_PRIVATE_KEY --env story-mainnet --repo $REPO
gh secret set DEPLOYER_PRIVATE_KEY --env base-mainnet --repo $REPO
gh secret set STORYSCAN_API_KEY --env story-mainnet --repo $REPO
gh secret set ETHERSCAN_API_KEY --env base-mainnet --repo $REPO
```

---

## 8. Deploy to Story Protocol Mainnet (Chain 1514)

### 8.1 Local Deployment (Azure VM)

```bash
export DEPLOYER_PRIVATE_KEY=$(az keyvault secret show --vault-name kv-blockchain-deploy --name "DEPLOYER-PRIVATE-KEY" --query value -o tsv)

npx hardhat run scripts/deploy.cjs --network story
```

### 8.2 Verify Balance First

```bash
cast balance $DEPLOYER_ADDRESS --rpc-url https://mainnet.storyrpc.io
```

### 8.3 Expected Output

The deployment script will output contract addresses to `deployment-config.story.json`:
```json
{
  "network": "story",
  "chainId": 1514,
  "contracts": {
    "StoryAttestationService": "0x...",
    "StoryOrchestrationService": "0x...",
    "UCC1FilingIntegration": "0x...",
    ...
  }
}
```

---

## 9. Deploy to Base L2 (Chain 8453)

### 9.1 Local Deployment

```bash
npx hardhat run scripts/deploy.cjs --network base
```

### 9.2 Verify Balance

```bash
cast balance $DEPLOYER_ADDRESS --rpc-url https://mainnet.base.org
```

---

## 10. Verify on StoryScan and Basescan

### 10.1 StoryScan Verification

```bash
npx hardhat verify --network story CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2"
```

Or use the automated script:
```bash
npm run contracts:verify:story
```

### 10.2 Basescan Verification

```bash
npx hardhat verify --network base CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2"
```

Or:
```bash
npm run contracts:verify:base
```

---

## 11. Post-Deployment Orchestration

After deployment, run orchestration to register IP assets and configure cross-chain bridges:

### 11.1 Story Protocol Orchestration

```bash
npm run contracts:orchestrate:story
```

This script:
1. Registers the deployed StoryAttestationService with Story Protocol's IPAssetRegistry
2. Attaches PIL license terms to the IP asset
3. Configures royalty flows via RoyaltyPolicyLAP
4. Records UCC-1 filing hash on-chain
5. Generates `registration-attestation.story.json`

### 11.2 Base L2 Orchestration

```bash
npm run contracts:orchestrate:base
```

This script:
1. Configures Morpho Blue market parameters
2. Sets up IP collateral pools (BTC: $5M at 4% APR, ETH: $1M at 6% APR)
3. Registers SPV loan contracts with the orchestration service
4. Generates `registration-attestation.base.json`

---

## 12. UCC-1 On-Chain Recording

Record the UCC-1 financing statement on both chains:

```bash
npm run contracts:record-ucc1:story
npm run contracts:record-ucc1:base
```

This writes the following data on-chain via `UCC1FilingIntegration.sol`:
- Filing number: `20260000078753`
- Jurisdiction: New Mexico Secretary of State
- IPFS CID: `bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a`
- Debtor address: Story Deployer
- Secured party: Coinbase Wallet
- Collateral description hash

### 12.1 Pinata IPFS Verification

Verify the UCC-1 document is accessible via the Pinata gateway:

```bash
curl -s "https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a" | head -20
```

### 12.2 ABI Proof Verification

The compiled ABI proof is pinned at:
```
https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay
```

---

## 13. Morpho Protocol Market Configuration

After Base deployment and UCC-1 recording, configure the Morpho Protocol lending markets:

### 13.1 Generate Multi-Sig Transaction

```bash
npm run contracts:multisig
```

### 13.2 Sign Transaction (3-of-5)

Each Safe owner signs the transaction hash using one of the methods in Section 5.3.

### 13.3 Submit to Morpho

Once 3 signatures are verified, the transaction is submitted to Morpho Blue at `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` on Base.

**Market Parameters:**

| Market | Loan Token | Collateral | Principal | APR | LLTV |
|---|---|---|---|---|---|
| BTC Market | USDC | WBTC | $5,000,000 | 4.00% | 86% |
| ETH Market | USDC | WETH | $1,000,000 | 6.00% | 86% |

---

## 14. Hermetic Seal & Valuation Attestation Hashes

After all deployments and orchestrations complete, the system generates a set of cryptographic hashes that form a **hermetic seal** over the entire UCC-1 perfection of interest.

### 14.1 Generate Attestation Hashes

```bash
npm run contracts:attestation-hashes
```

### 14.2 Hash Inventory

From `valuation-attestation.json`:

**Attestation Type Identifiers:**

| Type | Hash |
|---|---|
| CORPORATE_VERIFICATION | `0x908b874ceda681a131aff726b1b5c42ff40514be54505fd27602bc763adf38ad` |
| IP_VALUATION_ATTESTATION | `0x537b145ce6e67185955db6e27e4f2692ae3c538f0fef75eaffed7d2e6ad6a258` |
| UCC1_BRIDGE_ATTESTATION | `0x0cf7f46400094294ea1e3d3741656bc826f486d6ad593c41525e9a8d22672db3` |
| LOAN_COLLATERAL_ATTESTATION | `0xd2a93ed375b28631f806632b55b922ddb4bf2e5a6fe51e92581e8906d47d57ae` |
| REVENUE_ESCROW_ATTESTATION | `0xa009d1f0783160ccbe5ad218fa5104d73b48b2703298ffc2494c20a1d32d82dd` |
| MORPHO_MARKET_ATTESTATION | `0x01b118b286562fc6cfdce780c5d9e22ad2fd8ee3941d3aba1e4de05ba7021d54` |
| SPV_SEGREGATION_ATTESTATION | `0xa27e025efd455bf7687dd74e2e8adb215791b761d5f3565f61d22c2798b2dffd` |

**IP Valuation Hashes:**

| Portfolio | Present Value | Valuation Hash |
|---|---|---|
| Millionaire Resilience | $95,000,000 | `0x748cc0dbf1a1a51ff1edfbfab0a79f600b5904a3c5476acaca9adac6c2f5beb3` |
| SLAPS Streaming | $75,000,000 | `0x49988b157b3375869c3ef3dbe8c3dbbcffb4acf3644495c7c0b27bfe1e122b53` |

**UCC-1 Filing Hashes:**

| Field | Value |
|---|---|
| Filing Hash (bytes32) | `0x0fec875f0c70b4c91173ba67d182fd89d2bf614d00fda5bebd018bc6ca0568fe` |
| UCC-1 Data Hash | `0x1c411cef914c5657b20ab367a917b0661cfe48dbf5a309359f06795f26c7a6ea` |
| IPFS CID | `bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a` |

**Revenue Escrow:**

| Field | Value |
|---|---|
| Revenue Escrow Data Hash | `0x8ad9fe4a3fde8c58adf2fd0c3975b0b16f8deae9707060b3a5b90471c9679d03` |
| Annual Revenue | $3,525,000 |
| Payment Destination | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |

**Hermetic Seal Hash:**
```
0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413
```

This hash seals the entire attestation chain: corporate verification + IP valuation + UCC-1 filing + loan collateral + revenue escrow + Morpho market + SPV segregation.

**EIP-191 Multi-Sig Hash (for Morpho authorization):**
```
0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb
```

### 14.3 Orchestration Contract Hashes

These are populated by `post-deploy-orchestrate.cjs` after live deployment:

| Contract | Status |
|---|---|
| StoryAttestationService | `PENDING_DEPLOYMENT` |
| StoryOrchestrationService | `PENDING_DEPLOYMENT` |
| SLAPSIPSpvLoan | `PENDING_DEPLOYMENT` |

---

## 15. GitHub Actions CI/CD Trigger

### 15.1 Automatic Deployment

Push to `main` triggers automatic deployment to both Story and Base:

```bash
git add -A
git commit -m "feat: trigger deployment"
git push origin main
```

### 15.2 Manual Trigger via GitHub CLI

```bash
gh workflow run "Deploy Smart Contracts" \
  --field network=both \
  --field verify=true \
  --field dry_run=false
```

### 15.3 Dry Run (Compile Only)

```bash
gh workflow run "Deploy Smart Contracts" \
  --field network=both \
  --field verify=false \
  --field dry_run=true
```

### 15.4 Monitor Workflow

```bash
gh run list --workflow=deploy-contracts.yml --limit 5
gh run watch
```

---

## 16. Troubleshooting

| Issue | Solution |
|---|---|
| `DEPLOYER_PRIVATE_KEY` missing | Add to GitHub Environment secrets (not repo secrets) |
| Contract too large (>24KB) | `StoryAttestationService` uses `runs=1` optimizer override in `hardhat.config.cjs` |
| StoryScan verification fails | Ensure `STORYSCAN_API_KEY` is set and contract constructor args match |
| Morpho multi-sig fails | Need at least 3 of 5 valid EIP-191 signatures |
| Pinata gateway 403 | Set `PINATA_GATEWAY_TOKEN` secret |
| Gas estimation fails | Check wallet balance: `cast balance ADDRESS --rpc-url RPC_URL` |
| Azure Key Vault access denied | Ensure VM managed identity has `get`/`list` permissions on secrets |

---

## Quick Reference: Complete Deployment Sequence

```bash
# 1. Clone and install
git clone https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
cd Millionaire-Resilience-LLC-JAH && npm install --legacy-peer-deps

# 2. Load secrets (Azure VM method)
az login --identity
export DEPLOYER_PRIVATE_KEY=$(az keyvault secret show --vault-name kv-blockchain-deploy --name "DEPLOYER-PRIVATE-KEY" --query value -o tsv)

# 3. Compile
npx hardhat compile --force

# 4. Generate signing hash
node scripts/anchor-signature.cjs

# 5. Sign (3 of 5 signers)
EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")
cast wallet sign --private-key "$SIGNER_KEY" --no-hash "$EIP191_HASH"

# 6. Inject signatures and verify
node scripts/verify-multisig.cjs

# 7. Deploy
npm run contracts:deploy:story
npm run contracts:deploy:base

# 8. Verify
npm run contracts:verify:story
npm run contracts:verify:base

# 9. Orchestrate
npm run contracts:orchestrate:story
npm run contracts:orchestrate:base

# 10. Record UCC-1
npm run contracts:record-ucc1:story
npm run contracts:record-ucc1:base

# 11. Generate attestation hashes
npm run contracts:attestation-hashes
```
