# Automated Workflow Deployment Checklist

**Repository:** `slaps6331-cell/Millionaire-Resilience-LLC-JAH`  
**Entity:** Gladiator Holdings LLC / Millionaire Resilience LLC  
**Story Protocol Deployer:** `0x597856e93f19877a399f686D2F43b298e2268618`  
**Coinbase Wallet:** `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a`  
**UCC-1 Filing Number:** `20260000078753` (NM SOS, filed 2026-03-26)

---

## Allowlist Configuration

Before any workflow can deploy to a mainnet environment, the following GitHub
repository configuration must be in place. These settings form the **custom
allowlist** that gates all automated deployments.

### Required GitHub Secrets

Set via `gh secret set <NAME> --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH`:

| Secret | Purpose |
|--------|---------|
| `DEPLOYER_PRIVATE_KEY` | Deployer wallet `0x597856…8618` — used for all on-chain transactions |
| `ALCHEMY_API_KEY` | Alchemy RPC for Story Protocol + Base L2 + Ethereum Mainnet |
| `STORYSCAN_API_KEY` | Source-code verification on StoryScan (chainId 1514) |
| `ETHERSCAN_API_KEY` | Source-code verification on Basescan/Etherscan (chainId 8453/1) |
| `PINATA_JWT` | Pinata IPFS — PSA-compatible JWT (required for pin operations) |
| `PINATA_API_KEY` | Pinata IPFS API key (fallback for non-PSA endpoints) |
| `PINATA_SECRET_API_KEY` | Pinata IPFS secret (fallback) |
| `PINATA_GATEWAY_TOKEN` | Private gateway access token for `lavender-neat-urial-76` |
| `COINBASE_API_KEY_NAME` | Coinbase Developer Platform API key name |
| `COINBASE_API_KEY_PRIVATE_KEY` | Coinbase Developer Platform API private key |
| `THIRDWEB_CLIENT_ID` | ThirdWeb SDK client ID (used by post-deploy orchestration) |
| `THIRDWEB_SECRET_KEY` | ThirdWeb SDK secret key |

### Required GitHub Variables

Set via `gh variable set <NAME> --body <VALUE> --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH`:

| Variable | Value |
|----------|-------|
| `STORY_DEPLOYER_ADDRESS` | `0x597856e93f19877a399f686D2F43b298e2268618` |
| `COINBASE_WALLET_ADDRESS` | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |
| `UCC1_FILING_NUMBER` | `20260000078753` |
| `UCC1_FINANCING_STATEMENT_CID` | `bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu` |
| `STORY_RPC_URL` | `https://mainnet.storyrpc.io` |
| `BASE_RPC_URL` | `https://mainnet.base.org` |
| `STORY_PROTOCOL_REGISTRY` | `0x77319B4031e6eF1250907aa00018B8B1c67a244b` |
| `MORPHO_BLUE` | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |
| `PINATA_GATEWAY_NAME` | `lavender-neat-urial-76` |

### Required GitHub Environments (Protection Rules)

Create with `gh api --method PUT /repos/slaps6331-cell/Millionaire-Resilience-LLC-JAH/environments/<name>`:

| Environment | Protects | Required reviewers |
|-------------|----------|--------------------|
| `story-mainnet` | Story Protocol Mainnet (Chain 1514) | At least 1 required reviewer |
| `base-mainnet` | Base L2 (Chain 8453) | At least 1 required reviewer |
| `eth-mainnet` | Ethereum Mainnet (Chain 1) | At least 1 required reviewer |

---

## Workflow Files — Itemized in Chronological Deployment Order

The following table lists all 13 workflow files in the `.github/workflows/` folder,
ordered by the sequence in which they execute during a full deployment cycle.

| # | Workflow File | Trigger | Purpose |
|---|--------------|---------|---------|
| 1 | `check-contracts.yml` | Push/PR to any branch (contracts, scripts, config) | Compile contracts and run local deployment test |
| 2 | `node.js.yml` | Push/PR to `main` | Node.js CI — install, build, test across Node 18/20/22 |
| 3 | `security-audit.yml` | PR changing contracts or deploy scripts; `workflow_dispatch` | Slither static analysis — security scanning |
| 4 | `deploy-audit-fixes.yml` | Push to `main` (SlapsSPV, AngelCoin, multisig scripts); `workflow_dispatch` | Deploy audit-fixed contracts to Story Protocol |
| 5 | `deploy-contracts.yml` | Push to `main`; `workflow_dispatch` | **Main deployment orchestrator** — Story Protocol + Base L2 |
| 6 | `verify-contracts.yml` | Triggered by `deploy-contracts.yml` completion; `workflow_dispatch` | Verify deployed contracts on StoryScan and Basescan |
| 7 | `ucc1-integration.yml` | Push to `main` (UCC-1 contract/docs); `workflow_dispatch` | Record UCC-1 filing on-chain; pin metadata to Pinata |
| 8 | `register-ip-metadata.yml` | Push to `main` (IPA metadata JSONs); `workflow_dispatch` | Register IP asset metadata on Story Protocol |
| 9 | `ipfs-to-storyscan.yml` | Push to `main` (contracts, scripts, ABIs); `workflow_dispatch` | Build ABI proof, pin to Pinata, register on StoryScan |
| 10 | `pinata-ipfs-sync.yml` | Push to `main` (`documents/**`); `workflow_dispatch` | Sync legal and corporate documents to Pinata IPFS |
| 11 | `pinata-replace-metadata.yml` | `workflow_dispatch` only | Atomically replace (swap) a pinned CID on Pinata PSA |
| 12 | `deploy-pages.yml` | Push to `main` (`docs/**`); `workflow_dispatch` | Build and deploy GitHub Pages documentation site |
| 13 | `static.yml` | Push to `main`; `workflow_dispatch` | Deploy static content to GitHub Pages |

---

## Step-by-Step Deployment Checklist

### Phase 0 — Pre-Flight: Allowlist Setup

```
☐ All 12 GitHub Secrets configured (see table above)
☐ All 9 GitHub Variables configured (see table above)
☐ story-mainnet environment created with required-reviewers
☐ base-mainnet environment created with required-reviewers
☐ eth-mainnet environment created with required-reviewers
☐ GitHub Actions is enabled for this repository
```

Verification command:
```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC-JAH"
gh secret list --repo "$REPO"
gh variable list --repo "$REPO"
```

---

### Phase 1 — Pre-Deploy CI Checks

#### 1. `check-contracts.yml` — Contract Compilation & Local Test

**Trigger:** Automatically on push/PR when `contracts/**`, `scripts/**`, or
`hardhat.config.cjs` changes.

**Jobs (in order):**
1. `compile` — `npm run contracts:compile` → uploads compiled artifacts
2. `test-deploy` (needs: compile) — `node scripts/test-deploy.cjs` using downloaded artifacts

**Manual trigger:**
```bash
gh workflow run check-contracts.yml --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH
```

**Checklist:**
```
☐ compile job passes — all contracts compile under 24 576-byte EVM limit
☐ test-deploy job passes — local deployment test completes without errors
☐ Compiled artifacts uploaded to GitHub Actions artifact store
```

---

#### 2. `node.js.yml` — Node.js CI

**Trigger:** Push or PR to `main`.

**Jobs (in order):**
1. `build` (matrix: Node 18.x, 20.x, 22.x) — `npm ci` → `npm run build` → `npm test`

**Checklist:**
```
☐ Passes on Node 18.x
☐ Passes on Node 20.x
☐ Passes on Node 22.x
```

---

#### 3. `security-audit.yml` — Slither Static Analysis

**Trigger:** PR changing `contracts/**` or deploy scripts; `workflow_dispatch`.

**Jobs (in order):**
1. `static-analysis` — Slither runs against all Solidity contracts; results uploaded as SARIF

**Manual trigger:**
```bash
gh workflow run security-audit.yml --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH
```

**Checklist:**
```
☐ No high-severity Slither findings (or all findings reviewed and accepted)
☐ SARIF results uploaded to GitHub Security tab
```

---

### Phase 2 — Morpho Multi-Sig Preparation

Before deploying to any live network, both Morpho Protocol multi-sig signatures
must be prepared. See `documents/multisig-verification-walkthrough.md` for the
full step-by-step guide.

**Checklist:**
```
☐ Run:  node scripts/anchor-signature.cjs
    → generates signature-morpho-config.json with eip191Hash

STORY PROTOCOL DEPLOYER  (0x597856e93f19877a399f686D2F43b298e2268618)
  ☐ Connect wallet (MetaMask / Frame / Foundry cast)
  ☐ Sign eip191Hash  →  132-char hex signature
  ☐ Record in signature-morpho-config.json  (signatures.story)
  ☐ Record in multisig-transaction.json     (signatures[0].signature)

COINBASE WALLET  (0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a)
  ☐ Connect Coinbase Wallet extension / CDP SDK
  ☐ Sign eip191Hash  →  132-char hex signature
  ☐ Record in signature-morpho-config.json  (signatures.coinbase)
  ☐ Record in multisig-transaction.json     (signatures[1].signature)

VERIFICATION
  ☐ Run:  node scripts/verify-multisig.cjs  →  "✓ 2/2 signatures verified"
  ☐ Exit code 0
```

---

### Phase 3 — Audit Fix Deployment

#### 4. `deploy-audit-fixes.yml` — Deploy Audit-Fixed Contracts

**Trigger:** Push to `main` when `SlapsSPV.sol`, `AngelCoin.sol`, or multisig
scripts change; `workflow_dispatch`.

**Jobs (in order):**
1. `compile` — compile contracts
2. `deploy-story` (needs: compile, environment: story-mainnet) — deploy audit fixes to Story Protocol
3. `deploy-base` (needs: compile, environment: base-mainnet) — deploy audit fixes to Base L2
4. `post-deploy` (needs: deploy-story, deploy-base) — post-deploy orchestration

**Manual trigger (story only):**
```bash
gh workflow run deploy-audit-fixes.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field network=story \
  --field dry_run=false
```

**Required secrets for this workflow:** `DEPLOYER_PRIVATE_KEY`, `ALCHEMY_API_KEY`,
`STORYSCAN_API_KEY`, `ETHERSCAN_API_KEY`

**Checklist:**
```
☐ compile job passes
☐ deploy-story job passes (environment approval obtained for story-mainnet)
☐ deploy-base job passes (environment approval obtained for base-mainnet)
☐ Deployed contract addresses recorded in deployment-config.story.json
☐ Deployed contract addresses recorded in deployment-config.base.json
```

---

### Phase 4 — Main Deployment

#### 5. `deploy-contracts.yml` — Main Deployment Orchestrator

**Trigger:** Push to `main` (auto-deploys both networks); `workflow_dispatch`
with selectable network (`story` / `base` / `mainnet` / `both` / `all`).

**Jobs (in order):**
1. `compile` — compile all 12 contracts; upload artifacts
2. `deploy-story` (needs: compile, environment: story-mainnet) — deploy to Story Protocol (Chain 1514); verify on StoryScan; run post-deploy orchestration
3. `deploy-base` (needs: compile, environment: base-mainnet) — deploy to Base L2 (Chain 8453); verify on Basescan; run post-deploy orchestration
4. `deploy-mainnet` (needs: compile, environment: eth-mainnet, manual only) — deploy to Ethereum Mainnet; verify on Etherscan

**Story Protocol contracts deployed (nonces 0–4):**
| Nonce | Contract | Network |
|-------|----------|---------|
| 0 | `StoryAttestationService` | Story (1514) |
| 1 | `StoryOrchestrationService` | Story (1514) |
| 2 | `PILLoanEnforcement` | Story (1514) |
| 3 | `ResilienceToken` | Story (1514) |
| 4 | `AngelCoin` | Story (1514) |

**Post-deployment operations on Story Protocol (via `post-deploy-orchestrate.cjs`):**
| Operation | Details |
|-----------|---------|
| `registerIpAsset_MR` | Registers IPID `0x98971c…aAE`, tokenId 15192 on IPAssetRegistry |
| `bindPILTerms_MR` | Attaches PIL-PER 1% / PIL-COM 5% / PIL-ENT 12% to the IP asset |

**Base L2 contracts deployed (nonces 0–5):**
| Nonce | Contract | Network |
|-------|----------|---------|
| 0 | `GladiatorHoldingsSpvLoan` | Base (8453) |
| 1 | `SLAPSIPSpvLoan` | Base (8453) |
| 2 | `StablecoinIPEscrow` | Base (8453) |
| 3 | `PILLoanEnforcement` | Base (8453) |
| 4 | `AngelCoin` | Base (8453) |
| 5 | `ResilienceToken` | Base (8453) |

**Post-deployment operations on Base L2 (via `post-deploy-orchestrate.cjs`):**
| Operation | Details |
|-----------|---------|
| `createMorphoMarket_BTC` | Opens BTC-collateralised USDC Morpho Blue market — $5M principal, LLTV 86%, APR 4% |
| `createMorphoMarket_ETH` | Opens ETH-collateralised USDC Morpho Blue market — $1M principal, LLTV 86%, APR 6% |

**Protocol addresses used at deployment:**

*Story Protocol (Chain 1514):*
| Contract | Address |
|----------|---------|
| IPAssetRegistry | `0x77319B4031e6eF1250907aa00018B8B1c67a244b` |
| LicensingModule | `0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f` |
| RoyaltyModule | `0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086` |
| PILicenseTemplate | `0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316` |
| RoyaltyPolicyLAP | `0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E` |
| LicenseRegistry | `0x529a750E02d8E2f15649c13D69a465286a780e24` |
| LicenseToken | `0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC` |
| RegistrationWorkflows | `0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424` |
| LicenseAttachmentWorkflows | `0xcC2E862bCee5B6036Db0de6E06Ae87e524a79fd8` |
| RoyaltyWorkflows | `0x9515faE61E0c0447C6AC6dEe5628A2097aFE1890` |
| DerivativeWorkflows | `0x9e2d496f72C547C2C535B167e06ED8729B374a4f` |

*Base L2 (Chain 8453):*
| Contract | Address |
|----------|---------|
| MorphoBlue | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |
| BaseUSDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |

**Manual trigger (dry run to validate):**
```bash
gh workflow run deploy-contracts.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field network=both \
  --field verify=true \
  --field dry_run=true
```

**Manual trigger (live deployment):**
```bash
gh workflow run deploy-contracts.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field network=both \
  --field verify=true \
  --field dry_run=false
```

**Checklist:**
```
☐ compile job passes
☐ deploy-story job passes (environment approval obtained for story-mainnet)
    ☐ All 5 Story contracts deployed and addresses recorded
    ☐ registerIpAsset_MR call succeeded — IPID confirmed
    ☐ bindPILTerms_MR call succeeded — PIL terms confirmed
    ☐ StoryScan source verification passed
    ☐ Valuation attestation hashes generated
    ☐ Post-deploy orchestration completed (UCC-1 filing recorded)
☐ deploy-base job passes (environment approval obtained for base-mainnet)
    ☐ All 6 Base contracts deployed and addresses recorded
    ☐ createMorphoMarket_BTC succeeded — BTC market live on Morpho Blue
    ☐ createMorphoMarket_ETH succeeded — ETH market live on Morpho Blue
    ☐ Basescan source verification passed
    ☐ Post-deploy orchestration completed (UCC-1 filing recorded)
☐ deployment-config.story.json artifact downloaded and tx-hashes.json updated
☐ deployment-config.base.json artifact downloaded and tx-hashes.json updated
```

---

### Phase 5 — Post-Deployment Verification

#### 6. `verify-contracts.yml` — Verify Deployed Contracts

**Trigger:** Automatically after `deploy-contracts.yml` completes successfully;
`workflow_dispatch`.

**Jobs (in order):**
1. `verify-story` — verify all Story Protocol contracts on StoryScan
2. `verify-base` — verify all Base L2 contracts on Basescan

**Required secrets:** `DEPLOYER_PRIVATE_KEY`, `ALCHEMY_API_KEY`,
`STORYSCAN_API_KEY`, `ETHERSCAN_API_KEY`

**Manual trigger:**
```bash
gh workflow run verify-contracts.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field network=both
```

**Checklist:**
```
☐ verify-story job passes — all Story contracts verified on StoryScan
    ☐ https://www.storyscan.io/address/<CONTRACT_ADDRESS> shows "Verified"
☐ verify-base job passes — all Base contracts verified on Basescan
    ☐ https://basescan.org/address/<CONTRACT_ADDRESS> shows "Verified"
☐ deployment-registry.json updated:
    ☐ storyscan-verified: true
    ☐ basescan-verified: true
```

---

#### 7. `ucc1-integration.yml` — UCC-1 On-Chain Integration

**Trigger:** Push to `main` when `UCC1FilingIntegration.sol`,
`documents/ucc1-filing-collateral.json`, or `scripts/record-ucc1-filing.cjs`
changes; `workflow_dispatch`.

**Purpose:** Deploys (or attaches to) the `UCC1FilingIntegration` contract and
records NM SOS UCC-1 Filing #`20260000078753` on-chain. Pins completed filing
metadata to Pinata.

**Manual trigger (Story, live):**
```bash
gh workflow run ucc1-integration.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field network=story \
  --field dry_run=false \
  --field skip_pinata=false
```

**Checklist:**
```
☐ UCC-1 filing recorded on Story Protocol (record-ucc1-filing.cjs)
    ☐ Filing number 20260000078753 confirmed on-chain
    ☐ All 12 collateral contracts registered in UCC1FilingIntegration
    ☐ IPFS CIDs recorded: filing record + financing statement
☐ UCC-1 filing recorded on Base L2 (if network=both)
☐ Filing metadata pinned to Pinata IPFS
    ☐ Gateway: https://lavender-neat-urial-76.mypinata.cloud/ipfs/<CID>
```

---

#### 8. `register-ip-metadata.yml` — Story Protocol IPA Metadata Registration

**Trigger:** Push to `main` when IPA metadata JSON files change;
`workflow_dispatch`.

**Metadata files:**
- `GladiatorHoldingsIPAMetadata.json`
- `MillionaireResilienceIPAMetadata.json`
- `SlapsStreamingIPAMetadata.json`

**Manual trigger:**
```bash
gh workflow run register-ip-metadata.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field metadata_file=MillionaireResilienceIPAMetadata.json \
  --field dry_run=false
```

**Checklist:**
```
☐ Metadata file pinned to Pinata IPFS
☐ On-chain setMetadata call completed on Story Protocol
    ☐ IP ID: 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE confirmed
☐ story-protocol-registered: true in deployment-registry.json
```

---

### Phase 6 — IPFS Proof and Document Sync

#### 9. `ipfs-to-storyscan.yml` — IPFS ABI Proof → StoryScan

**Trigger:** Push to `main` (contracts, scripts, ABI files); `workflow_dispatch`.

**Jobs (in order):**
1. `build-abi-proof` — export ABI proof JSON via `scripts/export-abi-proof.cjs`
2. `fetch-ipfs-docs` — fetch and validate IPFS document CIDs
3. `deploy-and-verify-story` — deploy + verify contracts on Story Protocol (if needed)
4. `pin-and-register-proof` — pin ABI proof to Pinata; register on StoryScan
5. `dry-run-summary` — print summary of actions taken

**Manual trigger:**
```bash
gh workflow run ipfs-to-storyscan.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH
```

**Checklist:**
```
☐ ABI proof JSON exported and validated
☐ IPFS document CIDs fetched and verified
☐ ABI proof pinned to Pinata IPFS
    ☐ CID recorded in deployment-registry.json (abi-proof)
☐ ABI proof registered on StoryScan
```

---

#### 10. `pinata-ipfs-sync.yml` — Corporate Document Sync to Pinata

**Trigger:** Push to `main` when `documents/**` changes; `workflow_dispatch`.

**Pins the following document categories:**
- UCC-1 filing record and auxiliary documents
- Corporate formation documents (all four entities)
- Patent portfolio and SEP declaration reports
- Beneficial owner identification

**Manual trigger:**
```bash
gh workflow run pinata-ipfs-sync.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field pin_ucc1=true \
  --field pin_auxiliary=true \
  --field pin_patents=true \
  --field dry_run=false
```

**Checklist:**
```
☐ UCC-1 filing document pinned (CID: bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a)
☐ Auxiliary corporate documents pinned (CID: bafybeidkp74w2idrwkg2qey66uepfaes5ekonxjqt62uztyxawii7yye7y)
☐ Patent portfolio reports pinned
☐ All document CIDs accessible via Pinata gateway:
    https://lavender-neat-urial-76.mypinata.cloud/ipfs/<CID>
```

---

#### 11. `pinata-replace-metadata.yml` — Replace IPFS Metadata Pin

**Trigger:** `workflow_dispatch` only (manual).

**Purpose:** Atomically swaps an old IPFS CID for a new one on Pinata PSA using:
- `GET /psa/pins?name=<name>&status=pinned` → find existing `requestid`
- `POST /psa/pins/<requestid>` → swap old CID → new CID

**Required secret:** `PINATA_JWT` with PSA permissions.

**Manual trigger:**
```bash
gh workflow run pinata-replace-metadata.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH \
  --field pin_name=<existing-pin-name> \
  --field new_cid=<new-CID>
```

**Checklist:**
```
☐ Only used when an existing IPFS pin must be updated (e.g., updated legal doc)
☐ Old CID confirmed before swap
☐ New CID confirmed after swap via Pinata gateway
☐ deployment-registry.json updated with new CID if applicable
```

---

### Phase 7 — Documentation Publishing

#### 12. `deploy-pages.yml` — GitHub Pages Docs Deployment

**Trigger:** Push to `main` when `docs/**` changes; `workflow_dispatch`.

**Purpose:** Builds and deploys the `docs/` directory to GitHub Pages.

**Manual trigger:**
```bash
gh workflow run deploy-pages.yml \
  --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH
```

**Checklist:**
```
☐ docs/ directory deployed to GitHub Pages
☐ Site accessible at:
    https://slaps6331-cell.github.io/Millionaire-Resilience-LLC-JAH/
```

---

#### 13. `static.yml` — Static Content to GitHub Pages

**Trigger:** Push to `main`; `workflow_dispatch`.

**Purpose:** Deploys the entire repository root as static content to GitHub Pages.

**Checklist:**
```
☐ Static content deployed successfully
☐ GitHub Pages URL confirmed live
```

---

## Complete Deployment Sequence Summary

```
PHASE 0 — ALLOWLIST SETUP
  ☐ All 12 GitHub Secrets configured
  ☐ All 9 GitHub Variables configured
  ☐ 3 GitHub Environments created (story-mainnet, base-mainnet, eth-mainnet)

PHASE 1 — PRE-DEPLOY CI  (automatic on PR/push)
  ☐ [1] check-contracts.yml  →  compile + test-deploy pass
  ☐ [2] node.js.yml          →  Node 18/20/22 build & test pass
  ☐ [3] security-audit.yml   →  Slither static analysis — no blocking findings

PHASE 2 — MULTI-SIG PREPARATION  (manual, off-chain)
  ☐ node scripts/anchor-signature.cjs  →  eip191Hash generated
  ☐ Story Protocol deployer (0x597856…) signs eip191Hash
  ☐ Coinbase wallet (0xDc2aFC…) signs eip191Hash
  ☐ node scripts/verify-multisig.cjs  →  "✓ 2/2 signatures verified"

PHASE 3 — AUDIT FIX DEPLOYMENT  (automatic on merge to main)
  ☐ [4] deploy-audit-fixes.yml  →  SlapsSPV + AngelCoin deployed

PHASE 4 — MAIN DEPLOYMENT  (automatic on merge to main)
  ☐ [5] deploy-contracts.yml  →  all 12 contracts deployed (Story + Base)
      Story Protocol:  StoryAttestationService, StoryOrchestrationService,
                       PILLoanEnforcement, ResilienceToken, AngelCoin
      Story post-deploy: registerIpAsset_MR (IPID 0x98971c…), bindPILTerms_MR
      Base L2:         GladiatorHoldingsSpvLoan, SLAPSIPSpvLoan,
                       StablecoinIPEscrow, PILLoanEnforcement, AngelCoin,
                       ResilienceToken
      Base post-deploy: createMorphoMarket_BTC ($5M), createMorphoMarket_ETH ($1M)

PHASE 5 — POST-DEPLOYMENT VERIFICATION  (automatic after deploy)
  ☐ [6] verify-contracts.yml     →  StoryScan + Basescan verified
  ☐ [7] ucc1-integration.yml     →  UCC-1 #20260000078753 recorded on-chain
  ☐ [8] register-ip-metadata.yml →  IPA metadata registered on Story Protocol
  ☐     deployment-registry.json updated with live contract addresses
  ☐     tx-hashes.json updated with live transaction hashes

PHASE 6 — IPFS PROOF AND DOCUMENT SYNC  (automatic after deploy)
  ☐ [9]  ipfs-to-storyscan.yml      →  ABI proof pinned + registered on StoryScan
  ☐ [10] pinata-ipfs-sync.yml       →  all legal/corporate docs pinned
  ☐ [11] pinata-replace-metadata.yml →  (on-demand only — use when updating a pin)

PHASE 7 — DOCUMENTATION PUBLISHING  (automatic on docs change)
  ☐ [12] deploy-pages.yml  →  docs/ site published to GitHub Pages
  ☐ [13] static.yml        →  static content published to GitHub Pages

POST-DEPLOYMENT ON-CHAIN CONFIRMATION
  ☐ StoryScan: https://www.storyscan.io/address/0x98971c660ac20880b60F86Cc3113eBd979eb3aAE
      ☐ tokenId 15192 confirmed
      ☐ PIL-PER 1%, PIL-COM 5%, PIL-ENT 12% license terms attached
  ☐ Basescan: https://basescan.org/address/0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb
      ☐ BTC market: $5M USDC, LLTV 86%, 4% APR
      ☐ ETH market: $1M USDC, LLTV 86%, 6% APR
      ☐ Deployer address: 0x597856e93f19877a399f686D2F43b298e2268618
  ☐ deployment-registry.json:
      ☐ morpho-validated: true
      ☐ story-protocol-registered: true
```

---

## Related Files

| File | Purpose |
|------|---------|
| `documents/multisig-verification-walkthrough.md` | Full multi-sig signing guide (Story + Coinbase) |
| `scripts/anchor-signature.cjs` | Generates `signature-morpho-config.json` |
| `scripts/multisig-sign.cjs` | Generates `multisig-transaction.json` |
| `scripts/verify-multisig.cjs` | Verifies both signatures locally (EIP-191 ecrecover) |
| `scripts/deploy.cjs` | Deploys all 12 contracts |
| `scripts/post-deploy-orchestrate.cjs` | Post-deployment UCC-1 and IP registration |
| `scripts/verify.cjs` | Source-code verification (StoryScan, Basescan, Etherscan) |
| `scripts/record-ucc1-filing.cjs` | Records UCC-1 filing on-chain |
| `scripts/register-ip-metadata.cjs` | Registers IPA metadata on Story Protocol |
| `scripts/generate-tx-hashes.cjs` | Generates deterministic pre-deployment tx hashes |
| `deployment-registry.json` | Protocol addresses + IPFS CIDs + verification status |
| `tx-hashes.json` | Pre-deployment and live transaction hashes |
| `docs/GITHUB_ACTIONS_SETUP.md` | GitHub CLI commands to configure secrets, variables, environments |
| `DEPLOYMENT_STATUS.md` | Live deployment readiness report |
| `DEPLOYMENT_GUIDE.md` | Full deployment guide |
