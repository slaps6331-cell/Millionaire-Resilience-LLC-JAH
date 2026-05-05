# Manual ABI Bytecode & JSON Artifact Input for StoryScan/Basescan Verification
## With Token Staking & Wallet Collection Guide

---

## PART 1: IPFS CIDs for Manual Verification Input

### Primary Verification Documents

| Document | CID | Manual Input URL |
|---|---|---|
| **ABI Proof (all 12 contracts)** | `bafybeib6hyfertedqdtcuidl7myqqrksi4vaf5rr4doebnu7odmgu5xlcq` | `https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafybeib6hyfertedqdtcuidl7myqqrksi4vaf5rr4doebnu7odmgu5xlcq` |
| **Verification Hashes** | `bafkreicaaap7ponqikpocx4v3oo2nmqeesuuxlel5ichkiynrtdbco3fgq` | `https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreicaaap7ponqikpocx4v3oo2nmqeesuuxlel5ichkiynrtdbco3fgq` |
| **UCC-1 Metadata (SLAPS only)** | `bafkreighs42gi545oujhlsmuqyniwq5za2hqh5lc2yif6ywpmqe3lse4lu` | `https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreighs42gi545oujhlsmuqyniwq5za2hqh5lc2yif6ywpmqe3lse4lu` |
| **Morpho Loan Terms (Signed)** | `bafkreigdd6kho6ylra3n5o6cncnpfa3td4s4mvhwch4lebg4uu3shclt2a` | `https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreigdd6kho6ylra3n5o6cncnpfa3td4s4mvhwch4lebg4uu3shclt2a` |
| **NFT Metadata** | `bafkreic3ajesc2aktnua7hdwg22dt22ru7pskj3dty6xuy4jy5oin33yuy` | `https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreic3ajesc2aktnua7hdwg22dt22ru7pskj3dty6xuy4jy5oin33yuy` |
| **Formation Document** | `bafybeih7ibt2pm46hx5q6witd7tsw6ojw7gb552toiqukfx62ixrowk3au` | `https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafybeih7ibt2pm46hx5q6witd7tsw6ojw7gb552toiqukfx62ixrowk3au` |

**Gateway Token** (append to any URL above for authenticated access):
```
?pinataGatewayToken=2sNDwplwFPMa4DlVD_TFnHh2dcXM2UunGR5Ts7abPjjmb2q-5GZzfjfJMK2u9x-V
```

---

## PART 2: Manual StoryScan Verification Steps

### Step-by-Step for EACH Contract

1. **Go to** https://www.storyscan.io/address/YOUR_CONTRACT_ADDRESS
2. **Click** the "Contract" tab
3. **Click** "Verify and Publish"
4. **Fill in:**

| Field | Value |
|---|---|
| Compiler Type | `Solidity (Standard-Json-Input)` |
| Compiler Version | `v0.8.26+commit.8a97fa7a` |
| License | `MIT License (MIT)` |

5. **Upload** the Standard JSON Input file:
   - Download from: `https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafybeib6hyfertedqdtcuidl7myqqrksi4vaf5rr4doebnu7odmgu5xlcq`
   - Or generate locally: `cat artifacts/build-info/*.json | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['input']))" > standard-input.json`

6. **Contract Name** (enter exactly):
   - `contracts/StoryAttestationService.sol:StoryAttestationService`
   - `contracts/StoryOrchestrationService.sol:StoryOrchestrationService`
   - (etc. for each contract)

7. **Constructor Arguments**: Leave empty (all contracts use no-arg constructors)

8. **Click Verify**

### Compiler Settings (Must Match Exactly)

```
Compiler:        v0.8.26+commit.8a97fa7a
EVM Version:     cancun
Optimization:    Enabled
Runs:            200 (EXCEPT StoryAttestationService = 1)
Via IR:          true (CRITICAL - must be checked)
License:         MIT
```

---

## PART 3: Manual Basescan Verification Steps

Same process as StoryScan, but at https://basescan.org:

1. Go to `https://basescan.org/address/YOUR_CONTRACT_ADDRESS`
2. Click "Contract" → "Verify and Publish"
3. Same compiler settings as above
4. Upload same Standard JSON Input
5. Click Verify

---

## PART 4: Contract Verification Data (Copy & Paste)

### All 12 Contracts — Hashes for Manual Reference

```
1. StoryAttestationService
   Deployed Size:        23,342 bytes (under 24,576 limit)
   Deployed keccak256:   0xa3e5b1a8fb433b231656e8198682a737e0364521e0eb2da6e5de6b242ffc5d85
   ABI SHA-256:          0x9dad5377a2025878b4be535bdd5082f90e4dd521ee1d65346c0fb2084549eb05
   Optimizer:            1 run
   Chain:                Story Protocol (1514)

2. StoryOrchestrationService
   Deployed Size:        13,436 bytes
   Deployed keccak256:   0xe1945219332b1807544822b4cdbd745001150f027a5110e5e6466a3a1f813d02
   ABI SHA-256:          0x1d7ac972b62012670a86c35d8ae86f9ba043ab7ef0d16b2a8d784224786a6185
   Optimizer:            200 runs
   Chain:                Story Protocol (1514)

3. StoryAttestationBridge
   Deployed Size:        10,270 bytes
   Deployed keccak256:   0x345f6feb62dea7eacd5aa09ab9c2a799318293b591ed54280bcab8646bf5939e
   ABI SHA-256:          0x42763e590650422d7a5e93c26b3e49871b56c39e1869380e19b92e543bca1ada
   Optimizer:            200 runs
   Chain:                Story Protocol (1514)

4. SLAPSIPSpvLoan (AT RISK — Morpho Collateral)
   Deployed Size:        17,017 bytes
   Deployed keccak256:   0x9f5c804d4a5d98a7ae2163ed3e7fdcf7c39586b03cea6819d59b5351f4947c30
   ABI SHA-256:          0xc7539acbdd0482cd7e81b75808f05bb865246839946dcf9b4b82986db3801349
   Optimizer:            200 runs
   Chain:                Base L2 (8453)

5. GladiatorHoldingsSpvLoan (PROTECTED)
   Deployed Size:        11,890 bytes
   Deployed keccak256:   0xb65b6ad1596d92f17e5ec96f86d3f88591776daf778bcc225b8e8de40fdee850
   ABI SHA-256:          0xb7c81fcdcc44a54fa0bd12d7fc8183c87c64f489b0b33e1074826bfafeb3d7d6
   Optimizer:            200 runs
   Chain:                Story Protocol (1514)

6. PILLoanEnforcement (PROTECTED)
   Deployed Size:        9,580 bytes
   Deployed keccak256:   0x046e1d794991dcb2c92ac9ae70bdf7950fbcb83cfbcf886a61548d9aae7b9c0a
   ABI SHA-256:          0x2942e2ebd0a6bcb6b4592b4707c3e174f7e264d35e9570bc7fca7268a15094a4
   Optimizer:            200 runs
   Chain:                Story Protocol (1514)

7. StablecoinIPEscrow (PROTECTED)
   Deployed Size:        11,403 bytes
   Deployed keccak256:   0x9369e53e73790998a6c249e1f807d10060a548920d2a64e34a52de0bec483634
   ABI SHA-256:          0x8c1f31c333fabedc719e9cef8f4b554223e488b6936962c89567f766e85fdfb2
   Optimizer:            200 runs
   Chain:                Base L2 (8453)

8. AngelCoin (PROTECTED — Staking Only)
   Deployed Size:        6,920 bytes
   Deployed keccak256:   0x9be0712e4e59c7226b17b20ddcaea298e2d992af05f330d8776dacdb78e90dc4
   ABI SHA-256:          0x92c6b4152d67a78f8e164ac0ceb6bd8f36f04a7a8e485a60fb99ddb0e4933e54
   Optimizer:            200 runs
   Chain:                Both (1514 + 8453)

9. ResilienceToken (PROTECTED — Staking Only)
   Deployed Size:        5,163 bytes
   Deployed keccak256:   0xf3000f7ec324feab4497ca6a7a25abacf2c98b0aad337babde01a959d604de0f
   ABI SHA-256:          0x96a654d6925340dc3ed0c5c77f8beea6082b5e9b54674aa48ae96937cd299e9d
   Optimizer:            200 runs
   Chain:                Both (1514 + 8453)

10. SlapsStreaming (AT RISK — Morpho Collateral)
    Deployed Size:        14,079 bytes
    Deployed keccak256:   0x7e773dd024bc97bad616b7726c260f084b4a4fe3494910e1ed07e5ae9ce92211
    ABI SHA-256:          0x28b0a5bdc9da1195b6ca21431d578bb0dc822d2992ab4812ebdbe2fffdc374fb
    Optimizer:            200 runs
    Chain:                Base L2 (8453)

11. SlapsSPV (AT RISK — Morpho Collateral)
    Deployed Size:        12,130 bytes
    Deployed keccak256:   0xf5189d910dae1ead2e30774c04ac9d7a906d13028df558c4bd7ad462560fbf78
    ABI SHA-256:          0x4f04e33fa7fc609a69be1e33849d9f2400446e8ec3d0386941c3938b4e5b458a
    Optimizer:            200 runs
    Chain:                Base L2 (8453)

12. UCC1FilingIntegration
    Deployed Size:        6,887 bytes
    Deployed keccak256:   0x8c427d4379b38eb2f3777163cc3e69f6d69c13b7d3fa25389dc28dd36ea32b0e
    ABI SHA-256:          0xfba2d0d1c937e185408c18c53b7c64e9e0a0b3d324d753d92a780665f058e3d8
    Optimizer:            200 runs
    Chain:                Story Protocol (1514)
```

---

## PART 5: How to Collect Tokens After Deployment

### Step 1: Add Token to MetaMask

1. Open MetaMask
2. Switch network to **Story Protocol** (Chain 1514) or **Base** (Chain 8453)
3. Click **"Import tokens"** at the bottom
4. Paste the **deployed contract address** (received after deployment)
5. MetaMask auto-detects: Token Symbol + Decimals
6. Click **"Add Custom Token"** → **"Import Tokens"**
7. Your balance appears

### Step 2: Add Token to Coinbase Wallet

1. Open Coinbase Wallet app
2. Tap **"Receive"** → **"More assets"** → **"Custom token"**
3. Paste the deployed contract address
4. Token appears with balance

### Step 3: Add Token to Safe{Wallet}

1. Go to https://app.safe.global
2. Select Safe: `0xd314BE0a27c73Cd057308aC4f3dd472c482acc09`
3. Go to **Assets** → tokens auto-appear after deployment
4. Or click **"Add custom token"** → paste address

---

## PART 6: How to Stake Tokens

### Option A: Stake IP Tokens on Story Protocol

**Via Story Explorer:**
1. Go to https://explorer.story.foundation/staking
2. Connect MetaMask (Story Protocol network)
3. Select validator:
   - StakeMe: `ee5386dd25b97cba63234f8a76aca9b6dcb3f157@story-peer.stakeme.pro:26656`
4. Enter amount of IP to stake
5. Click **"Delegate"** → Confirm in MetaMask
6. Receive **stIP tokens** representing your staked position

**Via CLI:**
```bash
story staking delegate \
  --validator-addr VALIDATOR_ADDRESS \
  --amount 1000000000000000000 \
  --from 0x5EEFF17e12401b6A8391f5257758E07c157E1e45
```

### Option B: Stake for Morpho Stablecoin Loans (stIP → Morpho)

This flow allows you to **earn staking rewards while securing a loan**:

```
1. Stake IP tokens → Receive stIP
2. Deposit stIP as collateral in Morpho
3. Borrow USDC against stIP
4. Continue earning staking yield
5. Repay loan from PIL revenue + staking rewards
```

**Steps:**
1. Stake IP tokens via Story Protocol staking dashboard
2. Receive stIP (staked IP tokens) in your wallet
3. Connect to Morpho app (https://app.morpho.org) via Safe wallet
4. Select **stIP** as collateral token
5. Supply stIP to the appropriate market
6. Borrow USDC at the configured LLTV (86%)
7. USDC sent to Coinbase Wallet (`0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a`)

### Option C: Stake ResilienceToken (RSIL) — Protected Asset

ResilienceToken is **PROTECTED** from Morpho collateral claims. Staking is for governance/yield only:

1. Add ResilienceToken to MetaMask (address after deployment)
2. Go to the staking dashboard
3. Approve the staking contract to spend your RSIL tokens
4. Stake desired amount
5. Earn yield (not connected to any loan)

### Option D: Stake AngelCoin (ANGEL) — Protected Asset

Same as ResilienceToken — **PROTECTED**, staking only:

1. Add AngelCoin to MetaMask
2. Approve and stake
3. Earn yield independent of Morpho

---

## PART 7: Wallet Summary — Which Tokens Go Where

| Token | Wallet | Purpose | Morpho Risk |
|---|---|---|---|
| IP (native) | MetaMask / Story Explorer | Staking for stIP | NO |
| stIP | Safe Wallet / Morpho | Collateral for USDC loan | YES (SLAPS PIL only) |
| RSIL | MetaMask / Coinbase | Governance + yield staking | NO — PROTECTED |
| ANGEL | MetaMask / Coinbase | Investment + yield staking | NO — PROTECTED |
| USDC (borrowed) | Coinbase Wallet | Loan proceeds | N/A |
| SLAPS PIL Revenue | Escrow → Coinbase | Loan repayment source | YES — at risk |

### Wallet Addresses

| Wallet | Address | Networks | Use |
|---|---|---|---|
| MetaMask (Deployer) | `0x5EEFF17e12401b6A8391f5257758E07c157E1e45` | Story, Base | Deployment, Staking |
| Coinbase Wallet | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` | Base, ETH | USDC receipt, PIL collection |
| Safe Wallet (3/5) | `0xd314BE0a27c73Cd057308aC4f3dd472c482acc09` | ETH, Base | Multi-sig governance |
| Brave Wallet | `0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A` | Base | Signer #4 |
| Trust Wallet | `0xD39447807f18Ba965E8F3F6929c8815794B3C951` | Cross-chain | Signer #5 |

---

## PART 8: Key Hashes for UCC-1 Amendment 3 Filing (NM SOS)

These hashes are required for the UCC-1 Amendment 3 filing with the New Mexico Secretary of State:

| Hash | Value | Purpose |
|---|---|---|
| Hermetic Seal | `0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413` | Seals entire attestation chain |
| EIP-191 Multi-Sig | `0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb` | 3-of-5 authorization hash |
| UCC-1 Filing (bytes32) | `0x0fec875f0c70b4c91173ba67d182fd89d2bf614d00fda5bebd018bc6ca0568fe` | On-chain filing reference |
| UCC-1 Data Hash | `0x1c411cef914c5657b20ab367a917b0661cfe48dbf5a309359f06795f26c7a6ea` | Filing content integrity |
| Revenue Escrow | `0x8ad9fe4a3fde8c58adf2fd0c3975b0b16f8deae9707060b3a5b90471c9679d03` | PIL revenue routing proof |

### For the Amendment Filing Form:

```
FILING NUMBER:     20260000078753
AMENDMENT:         3
JURISDICTION:      New Mexico Secretary of State
DEBTOR:            Slaps Streaming LLC (EIN: 41-4045773)
SECURED PARTY:     Gladiator Holdings LLC (Entity ID: 0008034162)
COLLATERAL:        SLAPS Streaming IP assets, smart contracts, and PIL revenue
IPFS EVIDENCE:     bafkreighs42gi545oujhlsmuqyniwq5za2hqh5lc2yif6ywpmqe3lse4lu
BLOCKCHAIN PROOF:  0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413
```
