# Wallet Multi-Signature Verification Walkthrough

**Gladiator Holdings LLC / Millionaire Resilience LLC**  
**Morpho Protocol 2-of-2 Multi-Sig — Coinbase & ThirdWeb Wallets**

---

## Overview

Morpho Protocol requires **2-of-2 cryptographic signatures** from both designated
wallet holders before the Morpho Blue market positions ($5M BTC-collateralised +
$1M ETH-collateralised USDC loans) can be activated.  
This document is the authoritative step-by-step guide for both signers.

| Role | Wallet App | Address |
|------|-----------|---------|
| **Signer 1** | ThirdWeb Embedded Wallet | `0xe45572Dc828eF0E46D852125f0743938aABe1e12` |
| **Signer 2** | Coinbase Wallet (smart wallet / EOA) | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |

Both wallets must sign before the deployment workflow can proceed.

---

## Part 1 — Background: What Gets Signed and Why

### 1.1 EIP-191 Personal Signatures

Morpho Protocol uses the **EIP-191 "personal_sign"** standard.  This prevents
replay attacks between networks and distinguishes contract-function calls from
arbitrary-message signatures.

The protocol:
1. Computes a 32-byte `keccak256` hash of the payload (signer name, document type,
   UCC-1 IPFS CID, unix timestamp).
2. Prepends the string `"\x19Ethereum Signed Message:\n32"` to the 32-byte hash.
3. Hashes the combined prefix + message with `keccak256` → this is the
   **EIP-191 hash** (`eip191Hash`).
4. Signs `eip191Hash` using the wallet's private key (ECDSA secp256k1).
5. Produces a 65-byte signature: `r (32) + s (32) + v (1)`.

On-chain, Solidity's `ecrecover(eip191Hash, v, r, s)` recovers the signer address
and asserts it matches the expected wallet.

### 1.2 What the Payload Encodes

```
signatureData = abi.encode(
    "Clifton Kelly Bell",                                    // authorised signer
    "UCC-1_FINANCING_STATEMENT",                            // document type
    "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",  // UCC-1 IPFS CID
    <unix timestamp>                                        // epoch seconds
)
rawHash    = keccak256(signatureData)
eip191Hash = keccak256("\x19Ethereum Signed Message:\n32" + rawHash)
```

Run `node scripts/anchor-signature.cjs` to generate both hashes and write them to
`signature-morpho-config.json`.  Both wallets sign `eip191Hash`.

### 1.3 Transaction Hashes — StoryScan and Basescan

Pre-deployment deterministic hashes for every contract in the system are generated
by `node scripts/generate-tx-hashes.cjs` and stored in `tx-hashes.json`.

**Story Protocol (StoryScan — chainId 1514)**

| Contract | Pre-deployment tx hash |
|----------|----------------------|
| StoryAttestationService | `0x0b09f27824e6d28fe1f7f99e1de371fb51102351a1073fc2374e5bf536fc995f` |
| StoryOrchestrationService | `0x069c423ec29b0afb20cf90796a51994ca3687b72cc1ac4cdc54a11da245cda8f` |
| PILLoanEnforcement | `0x0433a3675178751956ce75cf8ea37600247d63ffa1e08a8ae971ea85ae3686fe` |
| ResilienceToken | `0x57b781319a87a8ae97eca27fb1c70872ea8349beaceb6f46a68fc4143a7129db` |
| AngelCoin | `0x43c9a6a5fabd3ca7ed13256666865bd1c3d7729409457ff3a0766e3f92572c26` |
| registerIpAsset_MR (IPID `0x98971c…aAE`, tokenId 15192) | `0x7d4f4e9c08269e73077cbc7aa3c2b2a8337c5498256a8ab863094524200e6160` |
| bindPILTerms_MR (PIL-PER 1% / PIL-COM 5% / PIL-ENT 12%) | `0x112914ca499c8e4a39af5cff45f3de82af854d3c01fe2d48d8b1122f53f9158e` |

**Base L2 (Basescan/Etherscan — chainId 8453)**

| Contract | Pre-deployment tx hash |
|----------|----------------------|
| GladiatorHoldingsSpvLoan | `0x5cd1a8cab40e5d54b92f8ba159da52069ea24ccc71c62804b9b8ec5031a1b3b8` |
| SLAPSIPSpvLoan | `0x877d4f233e3d874ccef82b8cbbe9aa388aec5042d4dbb585ed5add53f5e8e7c5` |
| StablecoinIPEscrow | `0xf051c5b1651e992d55a10ddf6c0714a38335185e58bd156445645fd8221204c8` |
| PILLoanEnforcement | `0x2a7de548929ce2873fecf9f8c0d415ac325a739687bae7a87d89469cff62762f` |
| AngelCoin | `0x7ec3c48ec1bac3f43bb7935eeb6563a065768b6b1da91dbe9f519fcb655f05ad` |
| ResilienceToken | `0x5628f5c88541999c68e4366d17958a07f3388b8cc92041975a7aea76ceef989f` |
| createMorphoMarket_BTC ($5M, 4% APR, LLTV 86%) | `0x332e0620103288881e9b2654a98262ed41f482a8e8307a38a7a15118d6e6ccb4` |
| createMorphoMarket_ETH ($1M, 6% APR, LLTV 86%) | `0xee2a02919260758547093f4e0e89bde8b1ccc2bd8835c9e5b88b55f1ad1c34cb` |

**Morpho multi-sig transaction hash (the hash both wallets must sign)**

| Network | Multi-sig tx hash |
|---------|------------------|
| Base L2 | `0x6e58e294b02ff40293a67b7011b17c9df8b83f6c205fc24d379fd73a28c3d74e` |
| Story Protocol | `0x60c455a95bcaecb4396a20bc3ed24ba574b91de4bd684148f7fd1e1a115e2db0` |

> **Note:** These are pre-deployment deterministic hashes computed from contract
> names, chain IDs, and deployer nonces.  After live deployment the actual
> on-chain transaction hashes will appear in `deployment-config.story.json` and
> `deployment-config.base.json`; replace the values in `tx-hashes.json`
> accordingly.

---

## Part 2 — ThirdWeb Wallet: Step-by-Step Signing

### Prerequisites

- Access to the ThirdWeb wallet `0xe45572Dc828eF0E46D852125f0743938aABe1e12`
- `signature-morpho-config.json` generated (run `node scripts/anchor-signature.cjs`)

### Step 1 — Generate the signature payload

```bash
node scripts/anchor-signature.cjs
```

Output file: `signature-morpho-config.json`

Open `signature-morpho-config.json` and locate the `eip191Hash` field:

```json
{
  "eip191Hash": "0x<64-char hex>",
  "signatureHash": "0x<64-char hex>",
  ...
}
```

Copy the value of `eip191Hash`.  This is what the ThirdWeb wallet must sign.

### Step 2 — Sign via ThirdWeb Dashboard (GUI method)

1. Open [https://thirdweb.com/dashboard](https://thirdweb.com/dashboard).
2. Click **Connect Wallet** in the top-right corner.
3. Select **ThirdWeb Embedded Wallet** and connect the account
   `0xe45572Dc828eF0E46D852125f0743938aABe1e12`.
4. Navigate to **Wallet SDK → Sign Message** in the left sidebar.
5. In the message field, paste the `eip191Hash` value copied in Step 1.
6. Click **Sign**.
7. The dashboard returns a 132-character hex signature (starts with `0x`,
   followed by 130 hex characters).  Copy the entire value.

### Step 3 — Sign via ThirdWeb TypeScript SDK (programmatic method)

```typescript
import { createThirdwebClient } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import * as fs from "fs";

const config = JSON.parse(fs.readFileSync("signature-morpho-config.json", "utf8"));
const eip191Hash = config.eip191Hash;      // already prefixed — sign as raw bytes

const client = createThirdwebClient({
  clientId: process.env.THIRDWEB_CLIENT_ID,   // from GitHub Secret
});
const account = privateKeyToAccount({
  client,
  privateKey: process.env.THIRDWEB_PRIVATE_KEY,  // never commit — use env var
});

// Sign the raw eip191Hash bytes (already EIP-191-prefixed by anchor-signature.cjs)
const signature = await account.signMessage({
  message: { raw: Buffer.from(eip191Hash.slice(2), "hex") },
});
console.log("ThirdWeb signature:", signature);
```

### Step 4 — Sign via cast (Foundry CLI method)

> **Security:** Never pass private keys as inline arguments — they appear in shell
> history.  Export from a `.env` file or use an encrypted keystore instead.

```bash
# Load from .env (recommended)
source .env   # file must contain: export THIRDWEB_PRIVATE_KEY=0x...

# Export the hash from the config file
EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")

# Sign with the ThirdWeb private key (--no-hash because the hash is already EIP-191 prefixed)
cast wallet sign \
  --private-key "$THIRDWEB_PRIVATE_KEY" \
  --no-hash \
  "$EIP191_HASH"
```

### Step 5 — Record the ThirdWeb signature

Add the signature to `signature-morpho-config.json`:

```json
{
  "signatures": {
    "thirdweb": "0x<the 132-char hex signature from Step 2, 3, or 4>",
    "coinbase":  null
  }
}
```

Also update `multisig-transaction.json`:

```json
{
  "signatures": [
    {
      "signer":    "0xe45572Dc828eF0E46D852125f0743938aABe1e12",
      "label":     "ThirdWeb",
      "signature": "0x<the 132-char hex signature>",
      "verified":  true
    },
    {
      "signer":    "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
      "label":     "Coinbase",
      "signature": null,
      "verified":  false
    }
  ]
}
```

---

## Part 3 — Coinbase Wallet: Step-by-Step Signing

### Prerequisites

- Access to the Coinbase Wallet account `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a`
- `signature-morpho-config.json` already generated (Step 1 above)

### Step 1 — Locate the eip191Hash

Open `signature-morpho-config.json` and copy the `eip191Hash` field (same hash
the ThirdWeb wallet signed in Part 2).

### Step 2 — Sign via Coinbase Wallet Browser Extension (GUI method)

1. Open the Coinbase Wallet browser extension.
2. Confirm you are on the account `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a`.
   If not, click the account selector and switch.
3. Open [https://www.myetherwallet.com](https://www.myetherwallet.com).
4. Click **Tools** (top navigation) → **Sign Message**.
5. Connect your Coinbase Wallet when prompted.
6. Paste the `eip191Hash` into the **Message** field.
7. Click **Sign**.  The Coinbase Wallet extension popup appears — review the
   message hash, then click **Sign** to confirm.
8. Copy the returned 132-character hex signature.

### Step 3 — Sign via Coinbase Wallet SDK (programmatic method)

```javascript
"use strict";
const { CoinbaseWalletSDK } = require("@coinbase/wallet-sdk");
const { ethers } = require("ethers");
const fs = require("fs");

const config = JSON.parse(fs.readFileSync("signature-morpho-config.json", "utf8"));
const eip191Hash = config.eip191Hash;

const sdk = new CoinbaseWalletSDK({
  appName:    "Millionaire Resilience LLC",
  appLogoUrl: "https://millionaire-resilience.com/logo.png",
});
const ethereum  = sdk.makeWeb3Provider();
const provider  = new ethers.BrowserProvider(ethereum);
const signer    = await provider.getSigner();

// ethers signMessage applies EIP-191 prefix; pass raw bytes to skip double-prefix
const rawBytes  = ethers.getBytes(eip191Hash);
const signature = await signer.signMessage(rawBytes);
console.log("Coinbase signature:", signature);
```

### Step 4 — Sign via cast (Foundry CLI method)

> **Security:** Never pass private keys as inline arguments — they appear in shell
> history.  Export from a `.env` file or use an encrypted keystore instead.

```bash
# Load from .env (recommended)
source .env   # file must contain: export COINBASE_PRIVATE_KEY=0x...

EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")

cast wallet sign \
  --private-key "$COINBASE_PRIVATE_KEY" \
  --no-hash \
  "$EIP191_HASH"
```

### Step 5 — Record the Coinbase signature

Update `signature-morpho-config.json` with the Coinbase signature:

```json
{
  "signatures": {
    "thirdweb": "0x<ThirdWeb signature from Part 2>",
    "coinbase":  "0x<the 132-char Coinbase signature>"
  }
}
```

Update `multisig-transaction.json`:

```json
{
  "signatures": [
    {
      "signer":    "0xe45572Dc828eF0E46D852125f0743938aABe1e12",
      "label":     "ThirdWeb",
      "signature": "0x<ThirdWeb signature>",
      "verified":  true
    },
    {
      "signer":    "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
      "label":     "Coinbase",
      "signature": "0x<Coinbase signature>",
      "verified":  true
    }
  ]
}
```

---

## Part 4 — Local Verification Before Submission

After both signatures are recorded, verify them locally with:

```bash
node scripts/verify-multisig.cjs
```

### Expected output (both valid)

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

Verifying ThirdWeb (0xe45572Dc...):
  Recovered:    0xe45572Dc828eF0E46D852125f0743938aABe1e12
  ✓  Signature valid — signer address matches

Verifying Coinbase (0xDc2aFCd0...):
  Recovered:    0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a
  ✓  Signature valid — signer address matches

============================================================
✓ 2/2 signatures verified — ready to submit to Morpho
============================================================
```

Exit code `0` means both signatures are valid and the transaction is ready.

### Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `✗ No valid signature provided` | Signature field is `null` or missing | Complete the signing step for that wallet |
| `✗ Signature INVALID — recovered address does not match` | Wrong wallet signed, or `--no-hash` flag missing | Re-sign using the correct account and the `--no-hash` flag |
| `ERROR: signature-morpho-config.json not found` | anchor-signature.cjs not yet run | Run `node scripts/anchor-signature.cjs` first |
| `Failed to parse or recover signature` | Signature is malformed (not 130 hex chars) | Re-copy the full signature from the wallet app |

---

## Part 5 — On-Chain Verification Reference

### 5.1 Solidity ecrecover pattern (Morpho Protocol)

```solidity
function verifySignature(
    bytes32 messageHash,
    bytes calldata signature,
    address expectedSigner
) internal pure returns (bool) {
    // Apply EIP-191 prefix — matches personal_sign behaviour
    bytes32 ethSignedHash = keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
    );

    // Decompose 65-byte signature
    bytes32 r;
    bytes32 s;
    uint8   v;
    assembly {
        r := calldataload(signature.offset)
        s := calldataload(add(signature.offset, 32))
        v := byte(0, calldataload(add(signature.offset, 64)))
    }

    // Recover signer and compare
    address recovered = ecrecover(ethSignedHash, v, r, s);
    return recovered != address(0) && recovered == expectedSigner;
}
```

### 5.2 StoryScan — verify IP registration

After live deployment:

1. Open [https://storyscan.xyz](https://storyscan.xyz).
2. Search for the IP asset address:  
   `0x98971c660ac20880b60F86Cc3113eBd979eb3aAE`
3. Confirm token ID **15192** under the Gladiator Holdings parent entity.
4. Verify PIL license terms are attached (PIL-PER 1%, PIL-COM 5%, PIL-ENT 12%).
5. Confirm royalty routing to `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a`.

### 5.3 Basescan — verify Morpho market positions

After live deployment:

1. Open [https://basescan.org](https://basescan.org).
2. Search for Morpho Blue:  
   `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb`
3. Navigate to **Contract → Read Contract → market**.
4. Verify BTC market: principal $5,000,000 USDC, LLTV 86%, APR 400 bps.
5. Verify ETH market: principal $1,000,000 USDC, LLTV 86%, APR 600 bps.
6. Confirm the deployer address matches  
   `0x597856e93f19877a399f686D2F43b298e2268618`.

---

## Part 6 — Quick-Reference Checklist

```
PRE-SIGNING
  ☐ signature-morpho-config.json generated
      → node scripts/anchor-signature.cjs
  ☐ eip191Hash value noted

THIRDWEB WALLET  (0xe45572Dc828eF0E46D852125f0743938aABe1e12)
  ☐ Wallet connected in ThirdWeb Dashboard or SDK
  ☐ eip191Hash signed  → 132-char hex signature
  ☐ Signature recorded in signature-morpho-config.json  (signatures.thirdweb)
  ☐ Signature recorded in multisig-transaction.json     (signatures[0].signature)

COINBASE WALLET  (0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a)
  ☐ Wallet connected in Coinbase Wallet extension / SDK
  ☐ eip191Hash signed  → 132-char hex signature
  ☐ Signature recorded in signature-morpho-config.json  (signatures.coinbase)
  ☐ Signature recorded in multisig-transaction.json     (signatures[1].signature)

VERIFICATION
  ☐ node scripts/verify-multisig.cjs  →  "✓ 2/2 signatures verified"
  ☐ Exit code 0

DEPLOYMENT
  ☐ npx hardhat run scripts/deploy.cjs --network story
  ☐ npx hardhat run scripts/deploy.cjs --network base
  ☐ npx hardhat run scripts/post-deploy-orchestrate.cjs --network story
  ☐ npx hardhat run scripts/post-deploy-orchestrate.cjs --network base
  ☐ Update tx-hashes.json with live tx hashes from deployment-config.*.json
  ☐ Verify contracts on StoryScan and Basescan
```

---

## Related Files

| File | Purpose |
|------|---------|
| `scripts/anchor-signature.cjs` | Generates `signature-morpho-config.json` with `eip191Hash` |
| `scripts/multisig-sign.cjs` | Generates `multisig-transaction.json` with signing metadata |
| `scripts/verify-multisig.cjs` | Verifies both signatures locally (EIP-191 ecrecover) |
| `scripts/generate-tx-hashes.cjs` | Generates `tx-hashes.json` with StoryScan + Basescan hashes |
| `signature-morpho-config.json` | Signature payload + both signatures (populate after signing) |
| `multisig-transaction.json` | Multi-sig transaction config (populate after signing) |
| `tx-hashes.json` | Pre-deployment tx hashes for all contracts on both chains |
| `DEPLOYMENT_GUIDE.md` | Full deployment guide including GitHub Secrets setup |
