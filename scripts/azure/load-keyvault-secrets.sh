#!/bin/bash
# ============================================================================
# Load Secrets from Azure Key Vault
# Millionaire Resilience LLC
#
# This script loads deployment secrets from Azure Key Vault into environment
# variables. Run this at the start of any deployment session.
#
# Usage: source scripts/azure/load-keyvault-secrets.sh
# ============================================================================

# Configuration
KEY_VAULT_NAME="${KEY_VAULT_NAME:-kv-blockchain-deploy}"

echo "============================================================"
echo "Loading Secrets from Azure Key Vault"
echo "Key Vault: $KEY_VAULT_NAME"
echo "============================================================"

# Check if already logged in
if ! az account show &> /dev/null; then
    echo "Not logged into Azure..."
    
    # Try managed identity first (for VM)
    if az login --identity &> /dev/null; then
        echo "✓ Logged in with Managed Identity"
    else
        echo "Managed Identity not available, using interactive login..."
        az login
    fi
fi

# Function to load secret
load_secret() {
    local secret_name=$1
    local env_var=$2
    
    local value=$(az keyvault secret show \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --query value \
        --output tsv 2>/dev/null)
    
    if [ -n "$value" ]; then
        export "$env_var"="$value"
        echo "  ✓ $env_var loaded"
    else
        echo "  ⚠️  $env_var not found in Key Vault"
    fi
}

echo ""
echo "Loading deployment secrets..."

# Core deployment secrets
load_secret "deployer-private-key" "DEPLOYER_PRIVATE_KEY"
load_secret "storyscan-api-key" "STORYSCAN_API_KEY"
load_secret "etherscan-api-key" "ETHERSCAN_API_KEY"
load_secret "alchemy-api-key" "ALCHEMY_API_KEY"

# Pinata IPFS secrets
load_secret "pinata-jwt" "PINATA_JWT"
load_secret "pinata-api-key" "PINATA_API_KEY"
load_secret "pinata-secret-key" "PINATA_SECRET_API_KEY"

# Optional: Coinbase CDP
load_secret "coinbase-api-key-name" "COINBASE_API_KEY_NAME"
load_secret "coinbase-api-private-key" "COINBASE_API_KEY_PRIVATE_KEY"

# Optional: Thirdweb
load_secret "thirdweb-client-id" "THIRDWEB_CLIENT_ID"
load_secret "thirdweb-secret-key" "THIRDWEB_SECRET_KEY"

echo ""
echo "============================================================"
echo "✓ Secrets loaded into environment"
echo "============================================================"
echo ""
echo "Available environment variables:"
echo "  DEPLOYER_PRIVATE_KEY:     ${DEPLOYER_PRIVATE_KEY:+SET}${DEPLOYER_PRIVATE_KEY:-NOT SET}"
echo "  STORYSCAN_API_KEY:        ${STORYSCAN_API_KEY:+SET}${STORYSCAN_API_KEY:-NOT SET}"
echo "  ETHERSCAN_API_KEY:        ${ETHERSCAN_API_KEY:+SET}${ETHERSCAN_API_KEY:-NOT SET}"
echo "  ALCHEMY_API_KEY:          ${ALCHEMY_API_KEY:+SET}${ALCHEMY_API_KEY:-NOT SET}"
echo "  PINATA_JWT:               ${PINATA_JWT:+SET}${PINATA_JWT:-NOT SET}"
echo ""
echo "Run deployment commands now. Secrets will be cleared on shell exit."
