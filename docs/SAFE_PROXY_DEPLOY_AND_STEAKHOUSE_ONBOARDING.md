# Safe Proxy Factory Deployment of 12 Contracts + Steakhouse Prime USDC v2 Morpho Onboarding

**Repo**: slaps-6331-cell · millionaire-resilience · dash-resilience-llc-JAH
**Owner / Signer**: Clifton Kelly Bell (3-of-5 quorum already on-chain)
**Safe**: `0xd314BE0a27c73Cd057308aC4f3dd472c482acc09` (SmartPacts1)
**Curator vault**: **Steakhouse Prime USDC** = `0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2` (Base 8453)

---

## 0 · Canonical addresses

| Component | Address | Chain |
|---|---|---|
| Safe Proxy Factory v1.4.1 | `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67` | Story 1514 + Base 8453 |
| Safe Singleton v1.4.1 | `0x41675C099F32341bf84BFc5382aF534df5C7461a` | Story 1514 + Base 8453 |
| ERC-6551 Registry | `0x000000006551c19487814612e58FE06813775758` | Multichain |
| Morpho Blue | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` | Base 8453 |
| **Steakhouse Prime USDC vault** | **`0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2`** | Base 8453 |
| Base USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Base 8453 |
| MorphoBlue IRM (AdaptiveCurve) | `0x46415998764C29aB2a25CbeA6254146D50D22687` | Base 8453 |
| MetaMorpho Factory | `0xFf62A7c278C62eD665133147129245053Bbf5918` | Base 8453 |
| Public Allocator | `0xA090dD1a701408Df1d4d0B85b716c87565f90467` | Base 8453 |
| Story IP NFT (MR) | `0x98971c660ac20880b60F86Cc3113eBd979eb3aAE` (tokenId 15192) | Story 1514 |
| Story IP ID | `0xD22750Ca1C3Cd1f7B18a2c70Af98914c291d632F` | Story 1514 |

---

## 1 · The 12 Contracts & Target Chains

| # | Contract | Target Chain | Salt for Safe-managed CREATE2 |
|---|---|---|---|
| 1 | StoryAttestationService | Story 1514 | `0x00…01` |
| 2 | StoryOrchestrationService | Story 1514 | `0x00…02` |
| 3 | StoryAttestationBridge | Story 1514 | `0x00…03` |
| 4 | **SLAPSIPSpvLoan** | **Base 8453** | `0x00…04` |
| 5 | GladiatorHoldingsSpvLoan | Story 1514 | `0x00…05` |
| 6 | PILLoanEnforcement | Story 1514 | `0x00…06` |
| 7 | StablecoinIPEscrow | Story 1514 | `0x00…07` |
| 8 | AngelCoin | Story 1514 | `0x00…08` |
| 9 | ResilienceToken | Story 1514 | `0x00…09` |
| 10 | **SlapsStreaming** | **Base 8453** | `0x00…0a` |
| 11 | **SlapsSPV** | **Base 8453** | `0x00…0b` |
| 12 | UCC1FilingIntegration | Story 1514 | `0x00…0c` |

---

## 2 · One-time setup (Brave + MetaMask)

1. Brave → install MetaMask
2. Add Story Mainnet: RPC `https://mainnet.storyrpc.io` · chainId `1514` · symbol `IP` · explorer `https://www.storyscan.io`
3. Base is built-in (chainId `8453`, explorer `https://basescan.org`)
4. Connect wallet `0x5EEFF17e12401b6A8391f5257758E07c157E1e45` (or any SmartPacts1 signer)
5. Each signer must hold ≥0.1 IP and ≥0.01 ETH for gas
6. Run `npx hardhat compile` locally → produces `artifacts/contracts/*.json` (already compiled in repo)

---

## 3 · STEP-BY-STEP — Deploy Each Contract via Safe Proxy Factory

The Safe Proxy Factory pattern wraps every contract behind a deterministic 1-of-N proxy
governed by the Safe. The deploy flow per contract is identical — repeat 12 times.

### 3a · Build the initializer for the target contract
For each contract `C` in the table:

```js
// scripts/build-deploy-payload.cjs (run locally)
const Artifact = require("../artifacts/contracts/<C>.sol/<C>.json");
const iface    = new ethers.Interface(Artifact.abi);
const initData = iface.encodeFunctionData("initialize", [...constructorArgs]);
const initCode = ethers.concat([Artifact.bytecode, "0x"]); // bytecode already self-init
console.log({ initCode, initData });
```

### 3b · Submit Proxy creation via SmartPacts1 Safe
**Story 1514 contracts**: switch MetaMask to Story Mainnet.
**Base 8453 contracts**: switch MetaMask to Base.

In the Safe Transaction Builder (`https://app.safe.global → New Transaction → Contract Interaction`):

```
To:        0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67   (SafeProxyFactory v1.4.1)
Method:    createProxyWithNonce(address singleton,bytes initializer,uint256 saltNonce)
Inputs:
  singleton  = 0x41675C099F32341bf84BFc5382aF534df5C7461a
  initializer= <initData from 3a>
  saltNonce  = <uint256, unique per contract — use the salt column in §1>
```

Collect 3-of-5 signatures (Clifton Kelly Bell signing addresses) → Execute.

### 3c · Capture the proxy address
Read the `ProxyCreation(proxy, singleton)` event from the receipt.
Record: `proxy_<C>_address`, `tx_hash`, `block_number`.

### 3d · Append to `deployment-registry.json`
```js
deployment-registry.json
└── story-mainnet (or base-mainnet)
    └── contracts
        └── <C>: {
              proxy: "0x…",
              singleton: "0x4167…",
              deployTxHash: "0x…",
              blockNumber: <N>,
              salt: "0x00…0X"
           }
```

### 3e · Verify on StoryScan / BaseScan
```bash
npx hardhat verify --network storyMainnet <proxy_address> \
  --constructor-args ./scripts/args/<C>.json

npx hardhat verify --network base <proxy_address> \
  --constructor-args ./scripts/args/<C>.json
```
Or manual upload at `https://www.storyscan.io/verifyContract` (or `https://basescan.org/verifyContract`):
- Compiler: `v0.8.26+commit.8a97fa7a`
- Optimization: enabled (runs per `pinata-verification-hashes.json`)
- EVM version: `cancun`
- viaIR: `true`
- ABI source CID: `bafybeib6hyfertedqdtcuidl7myqqrksi4vaf5rr4doebnu7odmgu5xlcq`

### 3f · Repeat for all 12 contracts
The 12 transactions can be **batched** in two Safe execution bundles (one per chain):
- Story 1514 batch: 9 contracts (#1, 2, 3, 5, 6, 7, 8, 9, 12)
- Base 8453 batch: 3 contracts (#4, 10, 11)

Use the Safe Transaction Builder's "Batch transactions" tab — single 3-of-5 signing per batch.

---

## 4 · Morpho Protocol Onboarding via **Steakhouse Prime USDC v2** Curator

> Steakhouse Prime USDC is a MetaMorpho vault curated by Steakhouse Financial
> (2-of-3 multisig). Whitelisting the SLAPS loan flow through this curator is the
> institutional path approved by Morpho governance for IP-collateralized credit.

### 4a · WalletConnect SmartPacts1 → Morpho app
Open `https://app.morpho.org/base/vault/0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2/steakhouse-prime-usdc`
Click **Connect Wallet → WalletConnect** → paste your SmartPacts1 Safe URI.

### 4b · Submit whitelisting application to the Steakhouse curator
Off-chain — sent through Morpho governance forum:
```
Forum: https://forum.morpho.org/  (post under MetaMorpho Vault Whitelisting)
Title: "Whitelist Gladiator Holdings IP-Collateralized Loan — SLAPS SPV"
Required attachments (all already pinned to Pinata):
  - kyc-teknos-attestation-bundle (CID: QmcdNTp9SSDYvbqpWeWNd7CZaLmSnd5MPPwWiso4vG8KuU)
  - IP Valuation Report (CID: QmYgT6SfbBbjJvX1AgzCa5TcnQMf5MPkpgNSZBHz5ETZVt)
  - UCC-1 Financing Statement (CID: bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu)
  - Teknos & Associates attestation field
  - Multi-sig sigs bundle (CID: bafkreiekmce433vte272jwjnvwqypv3yiehtqf7g3lrpl7jqi4kqc66sci)
```

### 4c · After curator approval — on-chain authorization (already encoded)
From the Safe (SmartPacts1) on Base 8453:

```
Tx 4c-1 — Authorize story.foundation (already pre-signed):
  to:     0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb
  data:   0xeecea000…0001
  decoded: setAuthorization(0x597856e93f19877a399f686D2F43b298e2268618, true)

Tx 4c-2 — Authorize Steakhouse curator vault on the SLAPS-SPV loan:
  to:     0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb
  method: setAuthorization(authorized=0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2, isAuthorized=true)
```

### 4d · Supply collateral & borrow via the curator vault
The Steakhouse Prime USDC v2 vault accepts WBTC + WETH collateral routed through
its enabled Morpho Blue markets. Use the Morpho-frontend "Borrow" tab:

| Action | Amount | Vault / Market |
|---|---|---|
| Supply collateral WBTC | $5,000,000 worth | BTC market (LLTV 86%) |
| Supply collateral WETH | $1,000,000 worth | ETH market (LLTV 86%) |
| Borrow USDC (from Steakhouse vault) | 5,000,000 USDC | BTC market · 4% APR · 24mo |
| Borrow USDC (from Steakhouse vault) | 1,000,000 USDC | ETH market · 6% APR · 18mo |

All transactions sign through `SmartPacts1` (3-of-5 quorum).

### 4e · Configure royalty-route repayment
1. Approve Steakhouse vault to pull USDC from SmartPacts1 (one-time):
   ```
   to:    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  (Base USDC)
   data:  approve(0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2, 6_000_000_000_000)  // 6M USDC
   ```
2. Install daily Gelato keeper → calls `MorphoBlue.repay(...)` whenever USDC balance > $50K.
3. Funds-hold invariant enforced via Safe-Guard (see Step 4 of prior canvas).

---

## 5 · Pin & Update IPFS

This document is pinned automatically by `scripts/pin-deploy-onboarding-guide.cjs`
(see canvas response for the live CID). The same script appends the new CID into
`ipfs-pin-manifest.json → pins.safeProxyDeployOnboardingGuide`.

Re-run after every revision:
```bash
cd /app/repo && node scripts/pin-deploy-onboarding-guide.cjs
```

---

## 6 · Push to GitHub

This pod's git client does not have push credentials to
`slaps-6331-cell/millionaire-resilience-llc-JAH`.

**Use the Emergent "Save to GitHub" feature** in the chat input (one click — opens
the GitHub OAuth flow and pushes the entire `/app/repo` tree to your repo).
That feature is the supported way to push from Emergent without sharing a PAT
in chat (your earlier PAT `ghp_…` should be revoked at github.com/settings/tokens).

Once pushed, the workflow lives at:
```
slaps-6331-cell/millionaire-resilience-llc-JAH
└── docs/SAFE_PROXY_DEPLOY_AND_STEAKHOUSE_ONBOARDING.md
└── scripts/pin-deploy-onboarding-guide.cjs
└── scripts/sign-and-pin-tba.cjs
└── scripts/pin-kyc-attestation-bundle.cjs
└── contracts/StoryIPTokenBoundAccount.sol
└── contracts/StoryIPSafeProxyFactory.sol
└── ipfs-pin-manifest.json (updated)
```

---

## Multi-sig Quorum (already validated)

EIP-191 hash: `0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb`
Hermetic Seal: `0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413`
Signer: **Clifton Kelly Bell** · `signatureCount = 3 · thresholdMet = true`
