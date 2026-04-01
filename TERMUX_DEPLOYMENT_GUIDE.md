# Termux Android Deployment Guide
## Millionaire Resilience LLC — Smart Contract Deployment from Android

> **⚠️ SECURITY FIRST — Read before typing any credentials**
>
> Private keys, JWT tokens, and API keys must **never** be pasted into:
> - GitHub issue or PR comments
> - Chat messages, emails, or screenshots
> - Source code files or public gists
>
> If credentials have already been exposed, **revoke and rotate them immediately**.
> See [SECURITY.md](SECURITY.md) for the incident response procedure.

This guide walks you through compiling, deploying, verifying, and pinning the
Millionaire Resilience LLC smart contracts entirely from an **Android device
running Termux**, including:

1. [Termux Environment Setup](#1-termux-environment-setup)
2. [Repository Setup](#2-repository-setup)
3. [Environment Variables (.env)](#3-environment-variables-env)
4. [Compile Contracts](#4-compile-contracts)
5. [Deploy to Story Protocol (StoryScan)](#5-deploy-to-story-protocol-storyscan)
6. [Deploy to Base (Basescan)](#6-deploy-to-base-basescan)
7. [Verify Contracts on StoryScan & Basescan](#7-verify-contracts-on-storyscan--basescan)
8. [Pin ABI Proof to Pinata IPFS](#8-pin-abi-proof-to-pinata-ipfs)
9. [Multisig Signing (Story + Coinbase Wallets)](#9-multisig-signing-story--coinbase-wallets)
10. [Post-Deploy Orchestration & UCC-1 Recording](#10-post-deploy-orchestration--ucc-1-recording)
11. [Troubleshooting Termux-Specific Issues](#11-troubleshooting-termux-specific-issues)

---

## 1. Termux Environment Setup

### 1.1 Install Termux

1. **Download Termux from F-Droid** (recommended — Google Play version is outdated):
   - <https://f-droid.org/packages/com.termux/>
2. Open Termux and run the following commands one section at a time.

### 1.2 Update Termux and Install Base Packages

```bash
# Update package list and upgrade existing packages
pkg update -y && pkg upgrade -y

# Install essential build tools, git, curl, and OpenSSL
pkg install -y git curl wget openssl-tool binutils build-essential python3

# Install Node.js (LTS — includes npm)
pkg install -y nodejs-lts

# Verify installed versions
node --version    # Must be >= 18.x
npm --version     # Must be >= 9.x
git --version
```

### 1.3 Optional — Install GitHub CLI for Secrets Management

```bash
# Install gh CLI to manage GitHub Secrets without a browser
pkg install -y gh

# Authenticate (opens a device-flow browser window)
gh auth login
```

### 1.4 Increase Termux Memory Limits (Recommended for Hardhat WASM Compiler)

The Solidity WASM compiler used by Hardhat can be memory-intensive. On low-RAM
devices, add a swap file to prevent OOM kills:

```bash
# Create and enable a 2 GB swap file (requires Termux:Boot or root — optional)
fallocate -l 2G ~/swapfile 2>/dev/null || dd if=/dev/zero of=~/swapfile bs=1M count=2048
chmod 600 ~/swapfile
mkswap ~/swapfile
swapon ~/swapfile
```

---

## 2. Repository Setup

### 2.1 Clone the Repository

```bash
# Navigate to Termux home
cd ~

# Clone the repository
git clone https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH.git

# Enter the project directory
cd Millionaire-Resilience-LLC-JAH
```

### 2.2 Install Node Dependencies

```bash
# Install all npm dependencies (Hardhat, ethers, dotenv, etc.)
npm install

# Confirm Hardhat is installed
npx hardhat --version
```

> **Note:** `npm install` downloads approximately 150–300 MB. Ensure you have a
> stable Wi-Fi connection and at least 500 MB free storage.

---

## 3. Environment Variables (.env)

### 3.1 Create Your .env File

```bash
# Copy the example env file to create your working .env
cp .env.example .env

# Open the file with a terminal text editor
nano .env
```

### 3.2 Required Variables — Fill In Your Values

Use `nano` or `vi` to edit `.env`. The minimal required variables for deployment are:

```bash
# ── Deployer Wallet ──────────────────────────────────────────────────────────
# The private key of the wallet paying gas fees (NOT the multisig wallets).
# Requires ≥ 0.5 IP on Story Protocol (chainId 1514) and ≥ 0.01 ETH on Base.
DEPLOYER_PRIVATE_KEY="0xYOUR_PRIVATE_KEY_HERE"

# ── RPC Endpoints (choose one approach) ─────────────────────────────────────
# Option A: Alchemy API key (recommended — avoids public endpoint rate limits)
ALCHEMY_API_KEY="YOUR_ALCHEMY_API_KEY"

# Option B: Direct public RPCs (free but may be rate-limited)
STORY_RPC_URL="https://mainnet.storyrpc.io"
BASE_RPC_URL="https://mainnet.base.org"

# ── Block Explorer API Keys ──────────────────────────────────────────────────
STORYSCAN_API_KEY="YOUR_STORYSCAN_API_KEY"    # https://www.storyscan.io/api-key
ETHERSCAN_API_KEY="YOUR_ETHERSCAN_API_KEY"    # https://basescan.org/apis (same key works for Base)

# ── Pinata IPFS ───────────────────────────────────────────────────────────────
PINATA_JWT="YOUR_PINATA_JWT_TOKEN"            # https://app.pinata.cloud/developers/api-keys
PINATA_API_KEY="YOUR_PINATA_API_KEY"
PINATA_SECRET_API_KEY="YOUR_PINATA_SECRET_API_KEY"
PINATA_GATEWAY_NAME="lavender-neat-urial-76"  # Your Pinata dedicated gateway subdomain
PINATA_GATEWAY_TOKEN="YOUR_GATEWAY_TOKEN"     # Optional — only for restricted gateways

# ── Multisig Wallets (public addresses — no private keys needed here) ────────
STORY_DEPLOYER_ADDRESS="0x597856e93f19877a399f686D2F43b298e2268618"
COINBASE_WALLET_ADDRESS="0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"

# ── UCC-1 Filing Reference ────────────────────────────────────────────────────
UCC1_FILING_NUMBER="20260000078753"
UCC1_FILING_HASH="bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a"
UCC1_FINANCING_STATEMENT_CID="bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu"
UCC1_JURISDICTION="New Mexico Secretary of State"
```

Save and exit nano with `Ctrl+O`, `Enter`, `Ctrl+X`.

### 3.3 Protect Your .env File

```bash
# Make .env readable only by your user
chmod 600 .env

# Confirm .env is in .gitignore (it should already be — never commit secrets)
grep -n "\.env" .gitignore
```

---

## 4. Compile Contracts

### 4.1 Compile All 12 Solidity Contracts

The project uses **Solidity 0.8.26** with `viaIR=true`, `evmVersion=cancun`,
and optimizer `runs=200` (except `StoryAttestationService.sol` which uses
`runs=1` to stay under the 24 576-byte EVM bytecode limit).

```bash
# Clean previous compilation artifacts (optional but recommended)
npx hardhat clean

# Compile all contracts
npm run contracts:compile
# Equivalent: npx hardhat compile
```

Expected output (12 contracts compiled successfully):
```
Compiling 12 files with Solc 0.8.26
Compilation finished successfully
```

### 4.2 Verify Compilation Artifacts Exist

```bash
# List compiled ABIs and bytecode artifacts
ls artifacts/contracts/

# Spot-check one ABI file
cat artifacts/contracts/StoryAttestationService.sol/StoryAttestationService.json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print('ABI entries:', len(d['abi']))"
```

---

## 5. Deploy to Story Protocol (StoryScan)

Story Protocol mainnet: **Chain ID 1514** | Explorer: <https://www.storyscan.io>

### 5.1 Run the Deployment Script

```bash
# Deploy all 12 contracts to Story Protocol mainnet
npm run contracts:deploy:story
# Equivalent: npx hardhat run scripts/deploy.cjs --network story
```

> This deploys all contracts in sequence and writes their addresses to
> `deployment-config.story.json`. Keep this file — it is required for
> verification and post-deploy orchestration.

### 5.2 Check Deployment Output

```bash
# View the deployed contract addresses
cat deployment-config.story.json | python3 -m json.tool

# Save the deployment registry for reference
cat deployment-registry.json | python3 -m json.tool
```

### 5.3 Run the Post-Deploy Orchestration on Story

```bash
# Initialize cross-contract wiring (IP registration, metadata anchoring)
npm run contracts:orchestrate:story
# Equivalent: npx hardhat run scripts/post-deploy-orchestrate.cjs --network story
```

---

## 6. Deploy to Base (Basescan)

Base mainnet: **Chain ID 8453** | Explorer: <https://basescan.org>

### 6.1 Run the Deployment Script

```bash
# Deploy all 12 contracts to Base mainnet
npm run contracts:deploy:base
# Equivalent: npx hardhat run scripts/deploy.cjs --network base
```

### 6.2 Check Deployment Output

```bash
# View the deployed contract addresses on Base
cat deployment-config.base.json | python3 -m json.tool
```

### 6.3 Run the Post-Deploy Orchestration on Base

```bash
# Initialize Morpho Protocol market parameters on Base
npm run contracts:orchestrate:base
# Equivalent: npx hardhat run scripts/post-deploy-orchestrate.cjs --network base
```

---

## 7. Verify Contracts on StoryScan & Basescan

Contract verification publishes the ABI and source code to the block explorer
so anyone can interact with the contracts and inspect their bytecode.

### 7.1 Verify on StoryScan (Story Protocol)

```bash
# Verify all deployed contracts on StoryScan
npm run contracts:verify:story
# Equivalent: npx hardhat run scripts/verify.cjs --network story
```

The `verify.cjs` script reads addresses from `deployment-config.story.json`
and submits them to `https://www.storyscan.io/api` using `STORYSCAN_API_KEY`.

### 7.2 Verify on Basescan (Base L2)

```bash
# Verify all deployed contracts on Basescan
npm run contracts:verify:base
# Equivalent: npx hardhat run scripts/verify.cjs --network base
```

### 7.3 Manual Verification for a Single Contract (Hardhat verify plugin)

If the batch script fails for one contract, verify it individually:

```bash
# Replace <ADDRESS> and <CONSTRUCTOR_ARGS> with the actual values from deployment-config.*.json
npx hardhat verify --network story <ADDRESS> <CONSTRUCTOR_ARG1> <CONSTRUCTOR_ARG2>

# Example for a no-constructor contract:
npx hardhat verify --network base 0xYourContractAddress
```

### 7.4 Check Verification Status

```bash
# Story — open the contract on StoryScan
echo "https://www.storyscan.io/address/$(cat deployment-config.story.json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d['contracts']['StoryAttestationService'])")"

# Base — open the contract on Basescan
echo "https://basescan.org/address/$(cat deployment-config.base.json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d['contracts']['StablecoinIPEscrow'])")"
```

---

## 8. Pin ABI Proof to Pinata IPFS

Pinning the compiled ABI and bytecode proof to IPFS via Pinata creates a
permanent, content-addressed reference that both explorers can use for
ABI/bytecode verification.

### 8.1 Export the ABI Proof JSON

```bash
# Generate abi-proof.json containing all contract ABIs, bytecodes, and deployment info
npm run contracts:export-abi-proof
# Equivalent: node scripts/export-abi-proof.cjs

# Confirm the file was created
ls -lh abi-proof.json
```

### 8.2 Build the IPFS Manifest

```bash
# Build ipfs-manifest.json referencing all IPFS CIDs and deployment addresses
npm run contracts:build-ipfs-manifest
# Equivalent: node scripts/build-ipfs-manifest.cjs

ls -lh ipfs-manifest.json
```

### 8.3 Pin abi-proof.json to Pinata

```bash
# Pin the ABI proof to Pinata (requires PINATA_JWT in .env)
npm run contracts:pin-to-pinata -- abi-proof.json "Millionaire Resilience ABI Proof"
# Equivalent: node scripts/pin-to-pinata.cjs abi-proof.json "Millionaire Resilience ABI Proof"
```

Expected output:
```
Pinning abi-proof.json (XX.X KB) to Pinata…
✓ abi-proof.json pinned
  CID:    bafkrei...
  URL:    https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkrei...
  Record: abi-proof-pin.json
```

### 8.4 Pin the IPFS Manifest

```bash
node scripts/pin-to-pinata.cjs ipfs-manifest.json "Millionaire Resilience IPFS Manifest"
```

### 8.5 Update the ABI Proof CID in .env

After pinning, copy the returned CID into your `.env`:

```bash
# Edit .env and update IPFS_ABI_PROOF_CID with the new CID from abi-proof-pin.json
ABI_PROOF_CID=$(cat abi-proof-pin.json | python3 -c "import json,sys; print(json.load(sys.stdin)['cid'])")
sed -i "s|IPFS_ABI_PROOF_CID=.*|IPFS_ABI_PROOF_CID=\"${ABI_PROOF_CID}\"|" .env
echo "Updated IPFS_ABI_PROOF_CID to: $ABI_PROOF_CID"
```

### 8.6 Verify IPFS Pins via Pinata API

```bash
# List all pins with their names (requires PINATA_JWT)
PINATA_JWT=$(grep PINATA_JWT .env | cut -d'"' -f2)

curl -s -H "Authorization: Bearer $PINATA_JWT" \
  "https://api.pinata.cloud/pinning/pinList?status=pinned&pageLimit=10" | \
  python3 -m json.tool | grep -A2 '"metadata"'
```

---

## 9. Multisig Signing (Story + Coinbase Wallets)

Morpho Protocol requires **2-of-2 signatures** from:
- **Story deployer wallet**: `0x597856e93f19877a399f686D2F43b298e2268618`
- **Coinbase wallet**: `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a`

### 9.1 Step 1 — Anchor the Signature Hash (EIP-191)

This computes the deterministic keccak256 hash of the UCC-1 filing metadata
and generates `signature-morpho-config.json`:

```bash
node scripts/anchor-signature.cjs
```

Output example:
```
Hashes:
  Raw keccak256: 0xabc123...
  EIP-191 hash:  0xdef456...

✓ Signature config written to: signature-morpho-config.json
```

### 9.2 Step 2 — Prepare the Multi-Sig Transaction

```bash
npm run contracts:multisig
# Equivalent: node scripts/multisig-sign.cjs
```

This writes `multisig-transaction.json` containing the transaction hash that
both signers must sign.

```bash
# Inspect the transaction hash both wallets must sign
cat multisig-transaction.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('Transaction hash:', d['transactionHash'])
print('Target contract: ', d['targetContract'])
print('Signers required:', d['requiredSignatures'])
for s in d['signatures']:
    print(f'  {s[\"label\"]}: {s[\"signer\"]}')
"
```

### 9.3 Step 3 — Sign with Each Wallet

Each wallet holder signs the **EIP-191 hash** from `signature-morpho-config.json`
using their preferred tool:

#### Option A: Sign with `cast` (Foundry — install via Termux)

```bash
# Install Foundry cast on Termux
curl -L https://foundry.paradigm.xyz | bash
# Then restart Termux and run:
foundryup

# Sign the EIP-191 hash with the Story deployer private key
EIP191_HASH=$(cat signature-morpho-config.json | python3 -c "import json,sys; print(json.load(sys.stdin)['eip191Hash'])")

# Story wallet signs (replace with actual private key — NEVER share this)
STORY_SIG=$(cast wallet sign --private-key $DEPLOYER_PRIVATE_KEY "$EIP191_HASH")
echo "Story signature: $STORY_SIG"
```

#### Option B: Sign using a Hardware / Software Wallet App

1. Open **Coinbase Wallet**, **MetaMask**, or **Frame** on your device.
2. Navigate to **Sign Message** / **Personal Sign**.
3. Paste the `eip191Hash` value from `signature-morpho-config.json`.
4. Confirm the signature and copy the `0x...` hex output.

### 9.4 Step 4 — Populate Signatures into the Config File

```bash
# Update signature-morpho-config.json with both signatures
python3 - <<'EOF'
import json

with open("signature-morpho-config.json", "r") as f:
    cfg = json.load(f)

# Replace these with the actual 65-byte hex signatures from each wallet
cfg.setdefault("signatures", {})
cfg["signatures"]["story"]   = "0xSTORY_SIGNATURE_HERE"
cfg["signatures"]["coinbase"] = "0xCOINBASE_SIGNATURE_HERE"

with open("signature-morpho-config.json", "w") as f:
    json.dump(cfg, f, indent=2)

print("Signatures written to signature-morpho-config.json")
EOF
```

### 9.5 Step 5 — Verify Both Signatures On-Chain (Dry Run)

```bash
npm run contracts:verify-multisig
# Equivalent: node scripts/verify-multisig.cjs
```

Expected output when both signatures are valid:
```
✓ 2/2 signatures verified — ready to submit to Morpho
```

If either signature is invalid, the script exits with code 1 and shows
`✗  Signature INVALID — recovered address does not match`.

### 9.6 Step 6 — Anchor Signature to Story Protocol (On-Chain)

```bash
npm run contracts:anchor-signature
# Equivalent: node scripts/anchor-signature.cjs

# Then record on Story Protocol
npm run contracts:record-ucc1:story
# Equivalent: npx hardhat run scripts/record-ucc1-filing.cjs --network story
```

---

## 10. Post-Deploy Orchestration & UCC-1 Recording

### 10.1 Generate Transaction and Attestation Hashes

```bash
# Generate tx-hashes.json — deterministic keccak256 hashes for all deployment events
npm run contracts:tx-hashes
# Equivalent: node scripts/generate-tx-hashes.cjs

# Generate valuation-attestation.json — IP valuation attestation for Story Protocol
npm run contracts:attestation-hashes
# Equivalent: node scripts/generate-valuation-attestation.cjs
```

### 10.2 Register IP Metadata on Story Protocol

```bash
npm run contracts:register-metadata
# Equivalent: node scripts/register-ip-metadata.cjs
```

### 10.3 Record UCC-1 Filing On-Chain

```bash
# Record UCC-1 filing (NM SOS #20260000078753) on Story Protocol
npm run contracts:record-ucc1:story

# Record the same filing on Base
npm run contracts:record-ucc1:base
```

### 10.4 Full End-to-End One-Shot Script

Run all steps in sequence (useful after initial setup is confirmed working):

```bash
#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "=== [1/8] Compile ==="
npm run contracts:compile

echo "=== [2/8] Deploy to Story ==="
npm run contracts:deploy:story

echo "=== [3/8] Deploy to Base ==="
npm run contracts:deploy:base

echo "=== [4/8] Verify on StoryScan ==="
npm run contracts:verify:story

echo "=== [5/8] Verify on Basescan ==="
npm run contracts:verify:base

echo "=== [6/8] Export ABI Proof and Pin to Pinata ==="
npm run contracts:export-abi-proof
node scripts/pin-to-pinata.cjs abi-proof.json "Millionaire Resilience ABI Proof"

echo "=== [7/8] Orchestrate (Story + Base) ==="
npm run contracts:orchestrate:story
npm run contracts:orchestrate:base

echo "=== [8/8] Record UCC-1 On-Chain ==="
npm run contracts:record-ucc1:story
npm run contracts:record-ucc1:base

echo "=== Deployment Complete ==="
```

Save this as `scripts/deploy-and-verify.sh`, make it executable, and run it:

```bash
chmod +x scripts/deploy-and-verify.sh
bash scripts/deploy-and-verify.sh 2>&1 | tee deployment-$(date +%Y%m%d-%H%M%S).log
```

---

## 11. Troubleshooting Termux-Specific Issues

### Issue: `ENOMEM` / Out of Memory During Compilation

Hardhat downloads a WASM Solidity compiler the first time it runs. On
low-memory devices this can OOM-kill the process.

```bash
# Check available memory
free -m

# Lower Node.js heap size to 512 MB and retry
NODE_OPTIONS="--max-old-space-size=512" npm run contracts:compile

# If still failing, clear the Hardhat compiler cache and retry
npx hardhat clean
rm -rf ~/.cache/hardhat-nodejs/compilers-v2/
npm run contracts:compile
```

### Issue: `EACCES` Permission Denied on npm install

```bash
# Fix npm global prefix permissions in Termux
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Issue: `Error: Cannot find module` After npm install

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: RPC Rate Limiting / Timeout

```bash
# Switch to Alchemy by setting ALCHEMY_API_KEY in .env
# Get a free key at https://dashboard.alchemy.com → Create App → Story Protocol / Base

# Or manually set the RPC URL directly:
export STORY_RPC_URL="https://mainnet.storyrpc.io"
export BASE_RPC_URL="https://mainnet.base.org"
npm run contracts:deploy:story
```

### Issue: Verification Returns `Already Verified`

This is **not** an error — it means the contract source is already published
on the explorer. No action needed.

### Issue: `Pinata API error 401` When Pinning

```bash
# Confirm PINATA_JWT is set correctly in .env
grep PINATA_JWT .env

# Test the JWT with a direct API call
PINATA_JWT=$(grep "^PINATA_JWT" .env | cut -d'"' -f2)
curl -s -H "Authorization: Bearer $PINATA_JWT" \
  https://api.pinata.cloud/data/testAuthentication | python3 -m json.tool
# Expected: { "message": "Congratulations! You are communicating with the Pinata API!" }
```

### Issue: `git push` Fails (No GitHub Authentication)

```bash
# Configure git credentials using a Personal Access Token (PAT)
git config --global credential.helper store

# The next push will prompt for username + PAT (not your GitHub password)
git push origin main

# Or use SSH (paste your public key to https://github.com/settings/keys):
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub   # Copy this to GitHub SSH keys
git remote set-url origin git@github.com:slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
```

### Issue: Hardhat `Invalid EVM version` or viaIR Warnings

The repo requires **solc 0.8.26**. If Termux installs a different version via
`pkg install`:

```bash
# Use the project-local solc managed by npm (already in node_modules)
npx hardhat compile   # Always use npx — never the system solc directly
```

---

## Quick Reference — All Deployment Commands

```bash
# ── Environment ──────────────────────────────────────────────────────────────
cp .env.example .env && nano .env            # Configure secrets
chmod 600 .env                               # Protect file

# ── Install & Compile ────────────────────────────────────────────────────────
npm install                                  # Install dependencies
npm run contracts:compile                    # Compile 12 Solidity contracts

# ── Deploy ───────────────────────────────────────────────────────────────────
npm run contracts:deploy:story               # Deploy → Story Protocol (chainId 1514)
npm run contracts:deploy:base                # Deploy → Base (chainId 8453)

# ── Verify ───────────────────────────────────────────────────────────────────
npm run contracts:verify:story               # Verify → StoryScan
npm run contracts:verify:base                # Verify → Basescan

# ── IPFS / Pinata ────────────────────────────────────────────────────────────
npm run contracts:export-abi-proof           # Generate abi-proof.json
npm run contracts:build-ipfs-manifest        # Generate ipfs-manifest.json
node scripts/pin-to-pinata.cjs abi-proof.json "MR ABI Proof"
node scripts/pin-to-pinata.cjs ipfs-manifest.json "MR IPFS Manifest"

# ── Multisig ─────────────────────────────────────────────────────────────────
node scripts/anchor-signature.cjs            # Step 1: Compute EIP-191 hash
npm run contracts:multisig                   # Step 2: Prepare multisig-transaction.json
# (collect both signatures — see §9.3 above)
npm run contracts:verify-multisig            # Step 5: Verify 2/2 signatures

# ── Post-Deploy ───────────────────────────────────────────────────────────────
npm run contracts:orchestrate:story          # Orchestrate Story contracts
npm run contracts:orchestrate:base           # Orchestrate Base contracts
npm run contracts:tx-hashes                  # Generate tx-hashes.json
npm run contracts:attestation-hashes         # Generate valuation-attestation.json
npm run contracts:register-metadata          # Register IP metadata on Story
npm run contracts:record-ucc1:story          # Record UCC-1 #20260000078753 on Story
npm run contracts:record-ucc1:base           # Record UCC-1 on Base
```

---

## Multisig Wallet Addresses

| Role | Address | Network |
|------|---------|---------|
| Story Deployer | `0x597856e93f19877a399f686D2F43b298e2268618` | Story Protocol (chainId 1514) |
| Coinbase Wallet | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` | Base / Story |

Both wallets must sign the EIP-191 hash before any Morpho Protocol market
position can be executed. See [§9](#9-multisig-signing-story--coinbase-wallets)
for the full signing workflow.

---

## Pinata IPFS Gateway

| Field | Value |
|-------|-------|
| Gateway subdomain | `lavender-neat-urial-76` |
| Base URL | `https://lavender-neat-urial-76.mypinata.cloud/ipfs/<CID>` |
| ABI Proof CID | `bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay` |
| UCC-1 Filing CID | `bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a` |
| Financing Statement CID | `bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu` |

---

## Related Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — Full GitHub Actions deployment guide
- [docs/PINATA_IPFS_INTEGRATION.md](docs/PINATA_IPFS_INTEGRATION.md) — Pinata IPFS setup details
- [documents/multisig-verification-walkthrough.md](documents/multisig-verification-walkthrough.md) — Detailed multisig walkthrough
- [documents/workflow-deployment-checklist.md](documents/workflow-deployment-checklist.md) — Deployment checklist
- [SECURITY.md](SECURITY.md) — Security policies and incident response
