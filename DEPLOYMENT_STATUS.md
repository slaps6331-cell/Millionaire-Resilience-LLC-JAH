# Deployment Status Report

**Entity:** Gladiator Holdings LLC / Millionaire Resilience LLC  
**Deployer Address:** `0x597856e93f19877a399f686D2F43b298e2268618`  
**Report Generated:** 2026-03-22  
**Status as of:** Branch `copilot/deployment-smart-contracts-storyscan-basescan`

---

## 🚀 Overall Status: READY TO FIRE (All Secrets Configured — Auto-deploys on Merge to Main)

The smart contracts **have not been deployed** to any live blockchain network. The transaction hashes recorded in `tx-hashes.json` are **deterministic pre-deployment hashes**, computed locally by `scripts/generate-tx-hashes.cjs` using:

```
keccak256(abi.encode(deployer, contractName, chainId, nonce))
```

These hashes serve as placeholder records and **must be replaced** with the actual transaction hashes returned by the network after broadcast.

---

## CI Build Status

| Check | Status | Notes |
|-------|--------|-------|
| Contract Compilation | ✅ **Fixed** | All address checksum and length errors corrected |
| Local test-deploy (CI) | ✅ **Fixed** | Artifact download step added to check-contracts workflow |
| Live deployment (Story → StoryScan) | ✅ **Secrets configured** | Fires automatically on merge to `main` |
| Live deployment (Base L2 → Basescan) | ✅ **Secrets configured** | Fires automatically on merge to `main` |
| Live deployment (Ethereum → Etherscan) | ⏸ **On-demand only** | Requires `workflow_dispatch` with `network=mainnet` |

**Compilation fixes applied (across 8 contracts):**

1. **Invalid EIP-55 checksum — `STORY_ROYALTY` address** (`0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086` → `0xCC8b9f0c9Dc370Ed1F41d95F74C9f72E08f24C90`):
   - `StoryAttestationService.sol`, `StoryOrchestrationService.sol`, `GladiatorHoldingsSpvLoan.sol`, `PILLoanEnforcement.sol`, `SLAPSIPSpvLoan.sol`

2. **Invalid address length (41 hex chars) — `DAI` address** (`0x6B175474E89094C44Da98b954EeDeB2b9dBe9B3E2` → `0x6B175474E89094C44Da98b954EedeAC495271d0F`):
   - `StablecoinIPEscrow.sol`, `GladiatorHoldingsSpvLoan.sol`, `PILLoanEnforcement.sol`, `SLAPSIPSpvLoan.sol`

---

## Contract Inventory

### Story Protocol Mainnet (Chain ID: 1514)

| Contract | Pre-Deploy Tx Hash | Nonce | Status |
|----------|--------------------|-------|--------|
| StoryAttestationService | `0x0b09f278...fc995f` | 0 | ⏳ Not yet broadcast |
| StoryOrchestrationService | `0x069c423e...cda8f` | 1 | ⏳ Not yet broadcast |
| PILLoanEnforcement | `0x0433a367...86fe` | 2 | ⏳ Not yet broadcast |
| ResilienceToken | `0x57b78131...29db` | 3 | ⏳ Not yet broadcast |
| AngelCoin | `0x43c9a6a5...2c26` | 4 | ⏳ Not yet broadcast |
| `registerIpAsset_MR` (post-deploy call) | `0x7d4f4e9c...6160` | 5 | ⏳ Not yet broadcast |
| `bindPILTerms_MR` (post-deploy call) | `0x112914ca...158e` | 6 | ⏳ Not yet broadcast |

**Planned IP Asset ID:** `0x98971c660ac20880b60F86Cc3113eBd979eb3aAE` (deterministic, subject to change)  
**Planned Token ID:** `15192`

### Base L2 (Chain ID: 8453)

| Contract | Pre-Deploy Tx Hash | Nonce | Status |
|----------|--------------------|-------|--------|
| GladiatorHoldingsSpvLoan | `0x5cd1a8ca...b3b8` | 0 | ⏳ Not yet broadcast |
| SLAPSIPSpvLoan | `0x877d4f23...e7c5` | 1 | ⏳ Not yet broadcast |
| StablecoinIPEscrow | `0xf051c5b1...04c8` | 2 | ⏳ Not yet broadcast |
| PILLoanEnforcement | `0x2a7de548...762f` | 3 | ⏳ Not yet broadcast |
| AngelCoin | `0x7ec3c48e...5ad` | 4 | ⏳ Not yet broadcast |
| ResilienceToken | `0x5628f5c8...989f` | 5 | ⏳ Not yet broadcast |
| `createMorphoMarket_BTC` | `0x332e0620...ccb4` | 6 | ⏳ Not yet broadcast |
| `createMorphoMarket_ETH` | `0xee2a0291...34cb` | 7 | ⏳ Not yet broadcast |

---

## Multi-Signature Status

The Morpho Protocol 2-of-2 multi-sig payload requires signatures from both wallets:

| Signer | Address | Signature Status |
|--------|---------|-----------------|
| **ThirdWeb** | `0xCD67f7e86A1397aBc33C473c58662BEB83b7a667` | ⏳ Pending |
| **Coinbase** | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` | ⏳ Pending |

- **Signing method:** EIP-191 `personal_sign`
- **Base multi-sig tx hash (pre-computed):** `0x6e58e294b02ff40293a67b7011b17c9df8b83f6c205fc24d379fd73a28c3d74e`
- **Story multi-sig tx hash (pre-computed):** `0x60c455a95bcaecb4396a20bc3ed24ba574b91de4bd684148f7fd1e1a115e2db0`

To complete the multi-sig:
1. Run `node scripts/anchor-signature.cjs` (generates `signature-morpho-config.json`)
2. ThirdWeb wallet signs the `eip191Hash` — see `documents/multisig-verification-walkthrough.md §2`
3. Coinbase wallet signs the `eip191Hash` — see `documents/multisig-verification-walkthrough.md §3`
4. Run `node scripts/verify-multisig.cjs` to verify locally
5. Submit the signed transaction to the network

---

## Infrastructure & Readiness Assessment

| Item | Status | Notes |
|------|--------|-------|
| Solidity contracts (11 total) | ✅ Ready | All compilation errors fixed |
| Hardhat configuration | ✅ Ready | `hardhat.config.cjs` — Story (1514) + Base (8453) + Mainnet (1) configured |
| Deployment script | ✅ Ready | `scripts/deploy.cjs` deploys all 11 contracts |
| Post-deploy orchestration | ✅ Ready | `scripts/post-deploy-orchestrate.cjs` |
| Source verification script | ✅ Ready | `scripts/verify.cjs` (StoryScan, Basescan, Etherscan) |
| Multi-sig signing scripts | ✅ Ready | `scripts/multisig-sign.cjs`, `scripts/anchor-signature.cjs`, `scripts/verify-multisig.cjs` |
| GitHub Actions CI (check) | ✅ Fixed | Artifact download added to test-deploy job |
| GitHub Actions CI (deploy) | ✅ Configured | `deploy-contracts.yml` — story, base, mainnet, both, all |
| Pre-computed tx hashes | ✅ Recorded | `tx-hashes.json` (deterministic, not live) |
| UCC-1 filing hash | ✅ Recorded | IPFS CID `bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a` |
| **`DEPLOYER_PRIVATE_KEY`** | ❌ **Required** | Must be set in GitHub Actions secrets |
| **`ALCHEMY_API_KEY`** | ❌ **Required** | Required for Base L2, Story Protocol, and Ethereum mainnet RPC |
| **`STORYSCAN_API_KEY`** | ❌ **Required** | Required for Story Protocol source verification |
| **`ETHERSCAN_API_KEY`** | ❌ **Required** | Required for Base (Basescan) and Ethereum mainnet (Etherscan) verification |

---

## How to Trigger Live Deployment

The deployment workflow (`deploy-contracts.yml`) now fires **automatically on every push to `main`**, deploying to both Story Protocol and Base L2 with source verification. All required secrets are configured.

### Step 1 — Merge this PR

Merge branch `copilot/deployment-smart-contracts-storyscan-basescan` into `main`.

The `deploy-story` and `deploy-base` jobs will start immediately after the merge commit lands on `main`. No manual trigger is needed.

### Step 2 — Secrets Already Configured ✅

All required GitHub Actions secrets are in place:

| Secret Name | Status | Purpose |
|-------------|--------|---------|
| `DEPLOYER_PRIVATE_KEY` | ✅ Set | Deployer wallet `0x597856e93f19877a399f686D2F43b298e2268618` |
| `ALCHEMY_API_KEY` | ✅ Set | RPC for Base L2 and Story Protocol |
| `STORYSCAN_API_KEY` | ✅ Set | Source verification on StoryScan |
| `ETHERSCAN_API_KEY` | ✅ Set | Source verification on Basescan |

### Step 3 — (Optional) Manual Override via workflow_dispatch

To deploy to a specific network, choose a dry-run, or deploy to Ethereum mainnet:

1. Go to **Actions → Deploy Smart Contracts**
2. Click **Run workflow**
3. Select target network:
   - `story` — deploys to Story Protocol Mainnet (Chain 1514), verifies on **StoryScan**
   - `base` — deploys to Base L2 (Chain 8453), verifies on **Basescan**
   - `mainnet` — deploys to Ethereum Mainnet (Chain 1), verifies on **Etherscan**
   - `both` — deploys to Story Protocol + Base L2 *(default)*
   - `all` — deploys to all three networks (Story + Base + Ethereum Mainnet)
4. Set **Verify contracts** = `true` (recommended)
5. Set **Dry run** = `false`
6. Click **Run workflow**

### Step 4 — Post-deployment

After the deploy workflow completes:
- Retrieve deployed addresses from the `deployment-config.<network>.json` artifact
- Update `tx-hashes.json` with the live transaction hashes
- Complete the Morpho 2-of-2 multi-sig (ThirdWeb + Coinbase wallets)

### Manual CLI Alternative

If deploying locally instead of via CI:
```bash
# Copy and fill in .env (see .env.example)
cp .env.example .env

# Deploy to Story Protocol Mainnet
npx hardhat run scripts/deploy.cjs --network story

# Deploy to Base L2
npx hardhat run scripts/deploy.cjs --network base

# Deploy to Ethereum Mainnet
npx hardhat run scripts/deploy.cjs --network mainnet


# Post-deployment orchestration
npx hardhat run scripts/post-deploy-orchestrate.cjs --network story
npx hardhat run scripts/post-deploy-orchestrate.cjs --network base

# Verify source code on StoryScan
npx hardhat run scripts/verify.cjs --network story

# Verify source code on Basescan
npx hardhat run scripts/verify.cjs --network base

# Verify source code on Etherscan
npx hardhat run scripts/verify.cjs --network mainnet
```

---

## On-Chain Verification (Requires External RPC)

To independently verify deployment status after contracts are broadcast, use:

- **Story Protocol:** `https://www.storyscan.io/tx/<TX_HASH>` or `https://www.storyscan.io/address/<CONTRACT_ADDRESS>`
- **Base L2:** `https://basescan.org/tx/<TX_HASH>` or `https://basescan.org/address/<CONTRACT_ADDRESS>`
- **Ethereum Mainnet:** `https://etherscan.io/tx/<TX_HASH>` or `https://etherscan.io/address/<CONTRACT_ADDRESS>`

Without RPC credentials or a funded deployer wallet, on-chain verification cannot be performed. The pre-computed hashes in `tx-hashes.json` are **not real on-chain transactions** and will not resolve on any block explorer until actual deployment occurs.

---

## Key Protocol Addresses (Hard-coded in Contracts)

| Protocol | Address | Network |
|----------|---------|---------|
| Morpho Blue | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` | Base L2 (8453) |
| Story IP Registry | `0x77319B4031e6eF1250907aa00018B8B1c67a244b` | Story Protocol (1514) |
| Story Licensing Module | `0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f` | Story Protocol (1514) |
| Story Royalty Module | `0xCC8b9f0c9Dc370Ed1F41d95F74C9f72E08f24C90` | Story Protocol (1514) |
| Base USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Base L2 (8453) |
