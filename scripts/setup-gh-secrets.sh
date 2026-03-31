#!/usr/bin/env bash
# setup-gh-secrets.sh
# Automates GitHub CLI secret and variable setup for Millionaire Resilience LLC.
#
# Usage:
#   1. Export all required environment variables in your shell session.
#   2. Run: bash scripts/setup-gh-secrets.sh
#
# Required env vars (must be set before running):
#   DEPLOYER_PRIVATE_KEY, ALCHEMY_API_KEY, STORYSCAN_API_KEY,
#   ETHERSCAN_API_KEY, COINBASE_API_KEY_NAME, COINBASE_API_KEY_PRIVATE_KEY,
#   THIRDWEB_CLIENT_ID, THIRDWEB_SECRET_KEY, PINATA_JWT, PINATA_API_KEY,
#   PINATA_SECRET_API_KEY

set -euo pipefail

REPO="${REPO:-slaps6331-cell/Millionaire-Resilience-LLC-JAH}"

# ── Helpers ──────────────────────────────────────────────────────────────────

ok()   { echo "  ✅ $*"; }
warn() { echo "  ⚠️  $*"; }
err()  { echo "  ❌ $*" >&2; }
die()  { err "$*"; exit 1; }

check_required_var() {
  local var_name="$1"
  local value="${!var_name:-}"
  if [[ -z "$value" ]]; then
    die "Required variable \$$var_name is not set. Export it before running this script."
  fi
}

set_secret() {
  local name="$1"
  local value="$2"
  printf '%s' "$value" | gh secret set "$name" --repo "$REPO"
  ok "Secret $name"
}

set_variable() {
  local name="$1"
  local value="$2"
  gh variable set "$name" --body "$value" --repo "$REPO"
  ok "Variable $name = $value"
}

# ── Prerequisites check ───────────────────────────────────────────────────────

echo ""
echo "=========================================="
echo "  Millionaire Resilience LLC — GH Setup"
echo "  Repo: $REPO"
echo "=========================================="
echo ""

if ! command -v gh &>/dev/null; then
  die "GitHub CLI (gh) is not installed. Install it from https://cli.github.com/"
fi

if ! gh auth status &>/dev/null; then
  die "Not authenticated. Run: gh auth login"
fi

echo "Validating required environment variables..."
for var in \
  DEPLOYER_PRIVATE_KEY \
  ALCHEMY_API_KEY \
  STORYSCAN_API_KEY \
  ETHERSCAN_API_KEY \
  COINBASE_API_KEY_NAME \
  COINBASE_API_KEY_PRIVATE_KEY \
  THIRDWEB_CLIENT_ID \
  THIRDWEB_SECRET_KEY \
  PINATA_JWT \
  PINATA_API_KEY \
  PINATA_SECRET_API_KEY; do
  check_required_var "$var"
done
ok "All required variables present"
echo ""

# ── Secrets ───────────────────────────────────────────────────────────────────

echo "Setting GitHub Actions Secrets..."
set_secret DEPLOYER_PRIVATE_KEY         "$DEPLOYER_PRIVATE_KEY"
set_secret ALCHEMY_API_KEY              "$ALCHEMY_API_KEY"
set_secret STORYSCAN_API_KEY            "$STORYSCAN_API_KEY"
set_secret ETHERSCAN_API_KEY            "$ETHERSCAN_API_KEY"
set_secret COINBASE_API_KEY_NAME        "$COINBASE_API_KEY_NAME"
set_secret COINBASE_API_KEY_PRIVATE_KEY "$COINBASE_API_KEY_PRIVATE_KEY"
set_secret THIRDWEB_CLIENT_ID          "$THIRDWEB_CLIENT_ID"
set_secret THIRDWEB_SECRET_KEY         "$THIRDWEB_SECRET_KEY"
set_secret PINATA_JWT                   "$PINATA_JWT"
set_secret PINATA_API_KEY               "$PINATA_API_KEY"
set_secret PINATA_SECRET_API_KEY        "$PINATA_SECRET_API_KEY"

# Optional secrets
if [[ -n "${PINATA_GATEWAY_TOKEN:-}" ]]; then
  set_secret PINATA_GATEWAY_TOKEN "$PINATA_GATEWAY_TOKEN"
fi

echo ""

# ── Public Variables ──────────────────────────────────────────────────────────

echo "Setting Repository Variables (public)..."
set_variable STORY_DEPLOYER_ADDRESS   "0x597856e93f19877a399f686D2F43b298e2268618"
set_variable COINBASE_WALLET_ADDRESS  "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"
set_variable UCC1_FILING_NUMBER       "2024-NM-UCC-0001"
set_variable STORY_RPC_URL            "https://mainnet.storyrpc.io"
set_variable BASE_RPC_URL             "https://mainnet.base.org"
set_variable STORY_PROTOCOL_REGISTRY  "0x77319B4031e6eF1250907aa00018B8B1c67a244b" # Story Protocol IPAssetRegistry (mainnet)
set_variable MORPHO_BLUE              "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"

if [[ -n "${PINATA_GATEWAY_NAME:-}" ]]; then
  set_variable PINATA_GATEWAY_NAME "$PINATA_GATEWAY_NAME"
fi
echo ""

# ── GitHub Environments ───────────────────────────────────────────────────────

echo "Creating GitHub Environments..."
for env in story-mainnet base-mainnet eth-mainnet; do
  gh api --method PUT "/repos/$REPO/environments/$env" >/dev/null
  ok "Environment $env"
done
echo ""

# ── Verification ─────────────────────────────────────────────────────────────

echo "Verifying setup..."
echo ""
echo "--- Secrets (names only) ---"
gh secret list --repo "$REPO"
echo ""
echo "--- Variables ---"
gh variable list --repo "$REPO"
echo ""

echo "=========================================="
echo "  ✅ Setup complete — ready for deployment"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  Deploy to Story Protocol:"
echo "    gh workflow run deploy-contracts.yml --repo $REPO --field network=story --field verify=true --field dry_run=false"
echo ""
echo "  Deploy to Base L2:"
echo "    gh workflow run deploy-contracts.yml --repo $REPO --field network=base --field verify=true --field dry_run=false"
echo ""
echo "  Sync IPFS documents:"
echo "    gh workflow run pinata-ipfs-sync.yml --repo $REPO"
