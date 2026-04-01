# GitHub Actions Setup Guide

## Millionaire Resilience LLC — CI/CD Workflow Reference

---

## Step-by-Step Secrets Setup (GitHub CLI)

### Prerequisites

```bash
# Install GitHub CLI
brew install gh          # macOS
sudo apt install gh      # Ubuntu/Debian

# Authenticate
gh auth login
```

### Set All Secrets at Once

```bash
#!/usr/bin/env bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC-JAH"

# ---- REQUIRED SECRETS ----
# Paste the values in your shell first (never put real values in scripts)

echo "$DEPLOYER_PRIVATE_KEY"         | gh secret set DEPLOYER_PRIVATE_KEY          --repo "$REPO"
echo "$ALCHEMY_API_KEY"              | gh secret set ALCHEMY_API_KEY               --repo "$REPO"
echo "$STORYSCAN_API_KEY"            | gh secret set STORYSCAN_API_KEY             --repo "$REPO"
echo "$ETHERSCAN_API_KEY"            | gh secret set ETHERSCAN_API_KEY             --repo "$REPO"
echo "$COINBASE_API_KEY_NAME"        | gh secret set COINBASE_API_KEY_NAME         --repo "$REPO"
echo "$COINBASE_API_KEY_PRIVATE_KEY" | gh secret set COINBASE_API_KEY_PRIVATE_KEY  --repo "$REPO"
echo "$THIRDWEB_CLIENT_ID"          | gh secret set THIRDWEB_CLIENT_ID            --repo "$REPO"
echo "$THIRDWEB_SECRET_KEY"         | gh secret set THIRDWEB_SECRET_KEY           --repo "$REPO"
echo "$PINATA_JWT"                   | gh secret set PINATA_JWT                    --repo "$REPO"
echo "$PINATA_API_KEY"               | gh secret set PINATA_API_KEY                --repo "$REPO"
echo "$PINATA_SECRET_API_KEY"        | gh secret set PINATA_SECRET_API_KEY         --repo "$REPO"
echo "$PINATA_GATEWAY_TOKEN"         | gh secret set PINATA_GATEWAY_TOKEN          --repo "$REPO"
```

### Set Public Variables

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC-JAH"

gh variable set STORY_DEPLOYER_ADDRESS   --body "0x597856e93f19877a399f686D2F43b298e2268618" --repo "$REPO"
gh variable set COINBASE_WALLET_ADDRESS  --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a" --repo "$REPO"
gh variable set UCC1_FILING_NUMBER       --body "20260000078753"                             --repo "$REPO"
gh variable set STORY_RPC_URL            --body "https://mainnet.storyrpc.io"                --repo "$REPO"
gh variable set BASE_RPC_URL             --body "https://mainnet.base.org"                   --repo "$REPO"
gh variable set STORY_PROTOCOL_REGISTRY  --body "0x77319B4031e6eF1250907aa00018B8B1c67a244b" --repo "$REPO"
gh variable set MORPHO_BLUE              --body "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" --repo "$REPO"
gh variable set PINATA_GATEWAY_NAME      --body "lavender-neat-urial-76"                     --repo "$REPO"
gh variable set UCC1_FINANCING_STATEMENT_CID --body "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu" --repo "$REPO"
```

### Create Deployment Environments

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC-JAH"

gh api --method PUT "/repos/$REPO/environments/story-mainnet"
gh api --method PUT "/repos/$REPO/environments/base-mainnet"
gh api --method PUT "/repos/$REPO/environments/eth-mainnet"
```

### Verify Setup

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC-JAH"
gh secret list   --repo "$REPO"
gh variable list --repo "$REPO"
```

---

## Workflow Reference

### `deploy-contracts.yml` — Main Deployment Orchestrator

| Trigger | Behavior |
|---|---|
| Push to `main` | Deploys to both Story Protocol and Base L2 |
| `workflow_dispatch` | Deploy to selected network with optional verify/dry-run |

**Inputs:**
- `network`: `story` / `base` / `mainnet` / `both` / `all`
- `verify`: Enable contract verification (default: `true`)
- `dry_run`: Compile only, do not deploy (default: `false`)

### `pinata-ipfs-sync.yml` — IPFS Document Pinning

| Trigger | Behavior |
|---|---|
| Push to `main` (paths: `documents/**`) | Automatically pins new/updated documents |
| `workflow_dispatch` | Manual pin with per-document-type toggles |

**Inputs:**
- `pin_ucc1`: Pin UCC-1 filing (default: `true`)
- `pin_auxiliary`: Pin auxiliary bundle (default: `true`)
- `pin_patents`: Pin patent portfolio CIDs (default: `true`)
- `dry_run`: List files, do not upload (default: `false`)

### `verify-contracts.yml` — Post-Deployment Verification

| Trigger | Behavior |
|---|---|
| After `Deploy Smart Contracts` succeeds | Automatically verifies on StoryScan and Basescan |
| `workflow_dispatch` | Manual verification for selected network |

### `security-audit.yml` — Pre-Deployment Security

| Trigger | Behavior |
|---|---|
| Pull requests touching `contracts/**` | Runs Slither, secret scanning, `npm audit` |
| `workflow_dispatch` | Manual security audit |

### `ipfs-to-storyscan.yml` — Full Orchestration Pipeline

| Trigger | Behavior |
|---|---|
| Manual only | Full pipeline: compile → pin IPFS → deploy → verify → orchestrate |

---

## Manual Workflow Dispatch (CLI)

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC-JAH"

# Deploy to Story Protocol
gh workflow run deploy-contracts.yml --repo "$REPO" \
  --field network=story --field verify=true --field dry_run=false

# Deploy to Base L2
gh workflow run deploy-contracts.yml --repo "$REPO" \
  --field network=base --field verify=true --field dry_run=false

# Sync IPFS documents
gh workflow run pinata-ipfs-sync.yml --repo "$REPO"

# Run security audit
gh workflow run security-audit.yml --repo "$REPO"

# Run verification
gh workflow run verify-contracts.yml --repo "$REPO" --field network=both

# Monitor
gh run watch --repo "$REPO"
gh run list  --repo "$REPO" --limit 10
```

---

## Monitoring and Logs

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC-JAH"

# Watch the latest run in real time
gh run watch --repo "$REPO"

# List recent runs
gh run list --repo "$REPO" --limit 20

# View logs for the most recent run
gh run view --repo "$REPO" --log

# Download artifacts (compiled contracts)
gh run download --repo "$REPO"
```
