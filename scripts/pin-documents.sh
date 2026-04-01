#!/usr/bin/env bash
# pin-documents.sh
# Uploads UCC-1 and corporate documents to Pinata IPFS,
# records the returned CIDs, and updates deployment-registry.json.
#
# Usage:
#   export PINATA_JWT="your-jwt-here"
#   bash scripts/pin-documents.sh
#
# Files expected in documents/ directory:
#   ucc-1-financing-statement-2024-nm-0001.pdf
#   ucc-1-auxiliary-docs-bundle.zip
#   (additional documents are pinned if present)

set -euo pipefail

PINATA_JWT="${PINATA_JWT:-}"
PINATA_API_URL="https://api.pinata.cloud/pinning/pinFileToIPFS"
DOCS_DIR="${DOCS_DIR:-./documents}"
REGISTRY_FILE="./deployment-registry.json"
IPFS_PROOF_FILE="./ipfs-proof-$(date +%Y%m%d-%H%M%S).md"

# ── Helpers ───────────────────────────────────────────────────────────────────

ok()   { echo "  ✅ $*"; }
info() { echo "  ℹ️  $*"; }
warn() { echo "  ⚠️  $*"; }
err()  { echo "  ❌ $*" >&2; }
die()  { err "$*"; exit 1; }

# Pin a single file to Pinata and return the CID
pin_file() {
  local file_path="$1"
  local display_name="$2"
  local metadata_json="$3"

  if [[ ! -f "$file_path" ]]; then
    warn "File not found, skipping: $file_path"
    echo ""
    return 0
  fi

  info "Pinning: $display_name"

  local response
  response=$(curl -s -X POST "$PINATA_API_URL" \
    -H "Authorization: Bearer $PINATA_JWT" \
    -F "file=@$file_path" \
    -F "pinataMetadata=$metadata_json" \
    -F 'pinataOptions={"cidVersion":1,"wrapWithDirectory":false}')

  local cid
  cid=$(echo "$response" | grep -o '"IpfsHash":"[^"]*"' | cut -d'"' -f4 || true)

  if [[ -z "$cid" ]]; then
    err "Failed to pin $display_name"
    echo "Pinata response: $response" >&2
    echo ""
    return 1
  fi

  ok "Pinned: $display_name"
  echo "     CID: $cid"
  echo "     URL: https://gateway.pinata.cloud/ipfs/$cid"
  echo ""
  printf '%s' "$cid"
}

# Update a key in deployment-registry.json
update_registry() {
  local key="$1"
  local cid="$2"
  if [[ -z "$cid" ]]; then return; fi

  if command -v node &>/dev/null && [[ -f "$REGISTRY_FILE" ]]; then
    node -e "
      const fs = require('fs');
      const reg = JSON.parse(fs.readFileSync('$REGISTRY_FILE', 'utf8'));
      reg['ipfs-documents'] = reg['ipfs-documents'] || {};
      reg['ipfs-documents']['$key'] = '$cid';
      fs.writeFileSync('$REGISTRY_FILE', JSON.stringify(reg, null, 2));
    "
    info "Registry updated: $key = $cid"
  fi
}

# ── Preflight checks ──────────────────────────────────────────────────────────

echo ""
echo "=========================================="
echo "  Pinata IPFS Document Pinning"
echo "  Entity: Millionaire Resilience LLC"
echo "  Filing: 20260000078753"
echo "=========================================="
echo ""

if [[ -z "$PINATA_JWT" ]]; then
  die "PINATA_JWT is not set. Export it before running this script."
fi

if ! command -v curl &>/dev/null; then
  die "curl is required but not installed."
fi

# Validate Pinata credentials
info "Validating Pinata credentials..."
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $PINATA_JWT" \
  "https://api.pinata.cloud/data/testAuthentication")

if [[ "$AUTH_RESPONSE" != "200" ]]; then
  die "Pinata authentication failed (HTTP $AUTH_RESPONSE). Check your PINATA_JWT."
fi
ok "Pinata credentials valid"
echo ""

PROOF_LINES=()
PROOF_LINES+=("# IPFS Proof Document")
PROOF_LINES+=("**Entity**: Millionaire Resilience LLC")
PROOF_LINES+=("**Filing Number**: 20260000078753")
PROOF_LINES+=("**Pinned at**: $(date -u '+%Y-%m-%dT%H:%M:%SZ')")
PROOF_LINES+=("")
PROOF_LINES+=("| Document | CID | Gateway URL |")
PROOF_LINES+=("| --- | --- | --- |")

add_proof_line() {
  local name="$1" cid="$2"
  if [[ -n "$cid" ]]; then
    PROOF_LINES+=("| $name | \`$cid\` | https://gateway.pinata.cloud/ipfs/$cid |")
  fi
}

# ── Step 1: Primary UCC-1 Filing ─────────────────────────────────────────────

echo "Step 1: Primary UCC-1 Financing Statement"
echo "---"
UCC1_META='{"name":"UCC-1_Financing_Statement_20260000078753","keyvalues":{"filing_number":"20260000078753","jurisdiction":"New Mexico Secretary of State","entity":"Millionaire Resilience LLC","document_type":"UCC-1 Financing Statement"}}'
UCC1_CID=$(pin_file "$DOCS_DIR/ucc-1-financing-statement-2024-nm-0001.pdf" "UCC-1 Financing Statement" "$UCC1_META")
update_registry "ucc1-filing" "$UCC1_CID"
add_proof_line "UCC-1 Financing Statement" "$UCC1_CID"

# ── Step 2: Auxiliary Documents Bundle ───────────────────────────────────────

echo "Step 2: Auxiliary Documents Bundle"
echo "---"
AUX_META='{"name":"UCC1_Auxiliary_Documents_Bundle","keyvalues":{"filing_number":"20260000078753","document_type":"UCC-1 Auxiliary Bundle","contents":"Certificate of Organization, Notice of Filing, Articles of Incorporation, Bylaws, IRS CP575"}}'
AUX_CID=$(pin_file "$DOCS_DIR/ucc-1-auxiliary-docs-bundle.zip" "UCC-1 Auxiliary Bundle" "$AUX_META")
update_registry "ucc1-auxiliary" "$AUX_CID"
add_proof_line "UCC-1 Auxiliary Bundle" "$AUX_CID"

# ── Step 3: Corporate Formation Documents ────────────────────────────────────

echo "Step 3: Corporate Formation Documents"
echo "---"

GLAD_META='{"name":"Gladiator_Holdings_Certificate_Organization","keyvalues":{"entity":"Gladiator Holdings LLC","document_type":"Certificate of Organization","state":"New Mexico"}}'
GLAD_CID=$(pin_file "$DOCS_DIR/gladiator-holdings-cert-of-org.pdf" "Gladiator Holdings - Cert of Org" "$GLAD_META")
update_registry "gladiator-cert-of-org" "$GLAD_CID"
add_proof_line "Gladiator Holdings Cert of Org" "$GLAD_CID"

MR_META='{"name":"MR_LLC_Articles_Incorporation","keyvalues":{"entity":"Millionaire Resilience LLC","ein":"41-3789881","document_type":"Articles of Incorporation","state":"New Mexico"}}'
MR_CID=$(pin_file "$DOCS_DIR/mr-articles-of-incorporation.pdf" "MR LLC - Articles of Incorporation" "$MR_META")
update_registry "mr-articles-of-incorporation" "$MR_CID"
add_proof_line "MR LLC Articles of Incorporation" "$MR_CID"

SLAPS_META='{"name":"SLAPS_Holdings_Articles_Incorporation","keyvalues":{"entity":"SLAPS Holdings LLC","document_type":"Articles of Incorporation","state":"New Mexico"}}'
SLAPS_CID=$(pin_file "$DOCS_DIR/slaps-articles-of-incorporation.pdf" "SLAPS Holdings - Articles" "$SLAPS_META")
update_registry "slaps-articles" "$SLAPS_CID"
add_proof_line "SLAPS Holdings Articles" "$SLAPS_CID"

# ── Step 4: Beneficial Owner Documentation ────────────────────────────────────

echo "Step 4: Beneficial Owner Documentation"
echo "---"
OWNER_META='{"name":"Beneficial_Owner_ID_Clifton_Kelly_Bell","keyvalues":{"owner_name":"Clifton Kelly Bell","document_type":"State ID (Redacted)","state":"Washington","privacy_level":"Redacted for Privacy"}}'
OWNER_CID=$(pin_file "$DOCS_DIR/beneficial-owner-id-redacted.pdf" "Beneficial Owner ID (Redacted)" "$OWNER_META")
update_registry "beneficial-owner-id" "$OWNER_CID"
add_proof_line "Beneficial Owner ID" "$OWNER_CID"

# ── Step 5: Patent Portfolio Documentation ────────────────────────────────────

echo "Step 5: Patent Portfolio Documentation"
echo "---"
PATENT_META='{"name":"PatentSight_Portfolio_Report","keyvalues":{"entity":"Millionaire Resilience LLC","document_type":"PatentSight Analytics Report"}}'
PATENT_CID=$(pin_file "$DOCS_DIR/patentsight-portfolio-report.pdf" "PatentSight Portfolio Report" "$PATENT_META")
update_registry "patentsight-portfolio" "$PATENT_CID"
add_proof_line "PatentSight Portfolio Report" "$PATENT_CID"

SEP_META='{"name":"IPlytics_SEP_Declaration","keyvalues":{"entity":"Millionaire Resilience LLC","document_type":"IPlytics SEP Declaration"}}'
SEP_CID=$(pin_file "$DOCS_DIR/iplytics-sep-declaration.pdf" "IPlytics SEP Declaration" "$SEP_META")
update_registry "iplytics-sep-declaration" "$SEP_CID"
add_proof_line "IPlytics SEP Declaration" "$SEP_CID"

# ── Write IPFS Proof Document ─────────────────────────────────────────────────

printf '%s\n' "${PROOF_LINES[@]}" >"$IPFS_PROOF_FILE"
ok "IPFS proof document saved to: $IPFS_PROOF_FILE"

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "=========================================="
echo "  ✅ Document Pinning Complete"
echo "=========================================="
echo ""
echo "CIDs recorded in: $REGISTRY_FILE"
echo "Proof document:   $IPFS_PROOF_FILE"
echo ""
echo "Verify your pins at:"
echo "  https://app.pinata.cloud/pinmanager"
