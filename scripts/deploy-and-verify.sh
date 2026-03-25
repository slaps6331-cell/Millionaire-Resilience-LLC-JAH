#!/usr/bin/env bash
# deploy-and-verify.sh
# Triggers the GitHub Actions deployment workflow, monitors progress,
# and records the resulting deployment hashes.
#
# Usage:
#   bash scripts/deploy-and-verify.sh [story|base|both]
#
# Optional env vars:
#   REPO    — override the target repository (default: slaps6331-cell/Millionaire-Resilience-LLC-JAH)
#   VERIFY  — set to "false" to skip post-deploy verification (default: true)

set -euo pipefail

REPO="${REPO:-slaps6331-cell/Millionaire-Resilience-LLC-JAH}"
NETWORK="${1:-both}"
VERIFY="${VERIFY:-true}"

# ── Helpers ───────────────────────────────────────────────────────────────────

ok()   { echo "  ✅ $*"; }
info() { echo "  ℹ️  $*"; }
err()  { echo "  ❌ $*" >&2; }
die()  { err "$*"; exit 1; }

# ── Prerequisites ─────────────────────────────────────────────────────────────

if ! command -v gh &>/dev/null; then
  die "GitHub CLI (gh) is not installed. Install from https://cli.github.com/"
fi

if ! gh auth status &>/dev/null; then
  die "Not authenticated. Run: gh auth login"
fi

case "$NETWORK" in
  story|base|mainnet|both|all) ;;
  *) die "Invalid network '$NETWORK'. Choose: story, base, mainnet, both, all" ;;
esac

# ── Trigger Deployment ────────────────────────────────────────────────────────

echo ""
echo "=========================================="
echo "  Deploy & Verify — $REPO"
echo "  Network:  $NETWORK"
echo "  Verify:   $VERIFY"
echo "=========================================="
echo ""

info "Triggering deploy-contracts workflow..."
gh workflow run deploy-contracts.yml \
  --repo "$REPO" \
  --field "network=$NETWORK" \
  --field "verify=$VERIFY" \
  --field "dry_run=false"

ok "Workflow triggered"
echo ""

# Give GitHub a moment to register the run
sleep 5

# ── Get Run ID ────────────────────────────────────────────────────────────────

info "Fetching latest run ID..."
RUN_ID=$(gh run list \
  --repo "$REPO" \
  --workflow deploy-contracts.yml \
  --limit 1 \
  --json databaseId \
  --jq '.[0].databaseId')

if [[ -z "$RUN_ID" ]]; then
  die "Could not determine run ID. Check: gh run list --repo $REPO"
fi
ok "Run ID: $RUN_ID"
echo "  URL: https://github.com/$REPO/actions/runs/$RUN_ID"
echo ""

# ── Monitor Deployment ────────────────────────────────────────────────────────

info "Monitoring deployment (this may take several minutes)..."
gh run watch "$RUN_ID" --repo "$REPO" || true
echo ""

# ── Check Result ─────────────────────────────────────────────────────────────

CONCLUSION=$(gh run view "$RUN_ID" \
  --repo "$REPO" \
  --json conclusion \
  --jq '.conclusion')

if [[ "$CONCLUSION" == "success" ]]; then
  ok "Deployment succeeded!"
else
  err "Deployment ended with status: $CONCLUSION"
  echo ""
  echo "  View logs: gh run view $RUN_ID --repo $REPO --log"
  exit 1
fi
echo ""

# ── Fetch Deployment Hashes ───────────────────────────────────────────────────

info "Downloading deployment artifacts..."
ARTIFACT_DIR="/tmp/deploy-artifacts-$RUN_ID"
mkdir -p "$ARTIFACT_DIR"

gh run download "$RUN_ID" \
  --repo "$REPO" \
  --dir "$ARTIFACT_DIR" \
  2>/dev/null || warn "No downloadable artifacts found (hashes may be committed directly)."

if [[ -f deployment-registry.json ]]; then
  echo ""
  echo "--- Deployment Registry (deployment-registry.json) ---"
  cat deployment-registry.json
fi

# ── Generate Deployment Report ────────────────────────────────────────────────

REPORT_FILE="/tmp/deployment-report-$(date +%Y%m%d-%H%M%S).md"
cat >"$REPORT_FILE" <<EOF
# Deployment Report
**Repository**: $REPO
**Network**: $NETWORK
**Run ID**: $RUN_ID
**Run URL**: https://github.com/$REPO/actions/runs/$RUN_ID
**Timestamp**: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
**Status**: $CONCLUSION

## Block Explorer Links
- StoryScan: https://www.storyscan.io
- Basescan: https://basescan.org

## Next Steps
- Review \`deployment-registry.json\` for recorded hashes
- Verify contracts at the block explorer links above
- Run \`gh workflow run verify-contracts.yml --repo $REPO\` for automated verification
EOF

echo ""
ok "Deployment report saved to: $REPORT_FILE"
echo ""
echo "=========================================="
echo "  ✅ Deploy & Verify Complete"
echo "=========================================="
