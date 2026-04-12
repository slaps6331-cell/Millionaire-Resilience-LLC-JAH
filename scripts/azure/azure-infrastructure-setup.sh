#!/bin/bash
# ============================================================================
# Azure Infrastructure Setup for Smart Contract Deployment
# Millionaire Resilience LLC
#
# This script creates all required Azure resources:
#   - Resource Group
#   - Virtual Network with subnets
#   - Azure Bastion for secure access
#   - Key Vault with private endpoint
#   - Virtual Machine (no public IP)
#   - Managed Identity and RBAC
#
# Usage: bash azure-infrastructure-setup.sh
# ============================================================================

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

# Change these values as needed
RESOURCE_GROUP="rg-blockchain-deployment"
LOCATION="eastus2"
SUBSCRIPTION_NAME=""  # Leave empty to use current subscription

# Naming
VNET_NAME="vnet-blockchain"
VM_NAME="vm-contract-deployer"
KEY_VAULT_NAME="kv-blockchain-$(date +%s)"  # Unique name
BASTION_NAME="bastion-blockchain"

# VM Configuration
VM_SIZE="Standard_D2s_v3"
VM_IMAGE="Ubuntu2204"
VM_ADMIN_USER="azureuser"
VM_DISK_SIZE=64

# Network Configuration
VNET_PREFIX="10.0.0.0/16"
SUBNET_DEFAULT="10.0.0.0/24"
SUBNET_BASTION="10.0.1.0/26"
SUBNET_PRIVATE_ENDPOINTS="10.0.2.0/24"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_step() {
    echo ""
    echo "============================================================"
    echo "STEP: $1"
    echo "============================================================"
}

log_success() {
    echo "✓ $1"
}

log_error() {
    echo "❌ $1"
    exit 1
}

check_az_cli() {
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI not installed. Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    fi
}

check_login() {
    if ! az account show &> /dev/null; then
        echo "Not logged into Azure. Running 'az login'..."
        az login
    fi
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

echo "============================================================"
echo "AZURE INFRASTRUCTURE SETUP"
echo "Smart Contract Deployment Environment"
echo "============================================================"
echo ""
echo "This script will create:"
echo "  - Resource Group: $RESOURCE_GROUP"
echo "  - Virtual Network: $VNET_NAME"
echo "  - Azure Bastion: $BASTION_NAME"
echo "  - Key Vault: $KEY_VAULT_NAME"
echo "  - Virtual Machine: $VM_NAME (no public IP)"
echo ""
read -p "Continue? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Aborted"
    exit 0
fi

# Check prerequisites
check_az_cli
check_login

# Set subscription if specified
if [ -n "$SUBSCRIPTION_NAME" ]; then
    log_step "Setting subscription to: $SUBSCRIPTION_NAME"
    az account set --subscription "$SUBSCRIPTION_NAME"
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Using subscription: $SUBSCRIPTION_ID"

# ============================================================================
# 1. Create Resource Group
# ============================================================================
log_step "Creating Resource Group"

az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output none

log_success "Resource Group created: $RESOURCE_GROUP"

# ============================================================================
# 2. Create Virtual Network
# ============================================================================
log_step "Creating Virtual Network"

az network vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VNET_NAME" \
    --address-prefix "$VNET_PREFIX" \
    --subnet-name "default" \
    --subnet-prefix "$SUBNET_DEFAULT" \
    --output none

log_success "Virtual Network created: $VNET_NAME"

# Create Bastion subnet
az network vnet subnet create \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "AzureBastionSubnet" \
    --address-prefixes "$SUBNET_BASTION" \
    --output none

log_success "Bastion subnet created"

# Create Private Endpoints subnet
az network vnet subnet create \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "subnet-private-endpoints" \
    --address-prefixes "$SUBNET_PRIVATE_ENDPOINTS" \
    --disable-private-endpoint-network-policies true \
    --output none

log_success "Private Endpoints subnet created"

# ============================================================================
# 3. Create Network Security Group
# ============================================================================
log_step "Creating Network Security Group"

az network nsg create \
    --resource-group "$RESOURCE_GROUP" \
    --name "nsg-$VM_NAME" \
    --output none

# Allow SSH from Bastion only (internal)
az network nsg rule create \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "nsg-$VM_NAME" \
    --name "AllowSSHFromBastion" \
    --priority 100 \
    --direction Inbound \
    --access Allow \
    --protocol Tcp \
    --source-address-prefixes "$SUBNET_BASTION" \
    --destination-port-ranges 22 \
    --output none

# Deny all other inbound
az network nsg rule create \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "nsg-$VM_NAME" \
    --name "DenyAllInbound" \
    --priority 4096 \
    --direction Inbound \
    --access Deny \
    --protocol '*' \
    --source-address-prefixes '*' \
    --destination-port-ranges '*' \
    --output none

log_success "Network Security Group created with Bastion-only SSH access"

# ============================================================================
# 4. Create Virtual Machine (No Public IP)
# ============================================================================
log_step "Creating Virtual Machine (No Public IP)"

az vm create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --image "$VM_IMAGE" \
    --size "$VM_SIZE" \
    --admin-username "$VM_ADMIN_USER" \
    --generate-ssh-keys \
    --public-ip-address "" \
    --vnet-name "$VNET_NAME" \
    --subnet "default" \
    --nsg "nsg-$VM_NAME" \
    --os-disk-size-gb "$VM_DISK_SIZE" \
    --storage-sku Premium_LRS \
    --output none

log_success "Virtual Machine created: $VM_NAME (no public IP)"

# Enable system-assigned managed identity
az vm identity assign \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --output none

VM_IDENTITY=$(az vm show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --query identity.principalId \
    --output tsv)

log_success "Managed Identity enabled: $VM_IDENTITY"

# ============================================================================
# 5. Create Azure Bastion
# ============================================================================
log_step "Creating Azure Bastion"

# Create public IP for Bastion
az network public-ip create \
    --resource-group "$RESOURCE_GROUP" \
    --name "${BASTION_NAME}-pip" \
    --sku Standard \
    --allocation-method Static \
    --output none

# Create Bastion host
az network bastion create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BASTION_NAME" \
    --public-ip-address "${BASTION_NAME}-pip" \
    --vnet-name "$VNET_NAME" \
    --sku Standard \
    --enable-tunneling true \
    --output none

log_success "Azure Bastion created: $BASTION_NAME"

# ============================================================================
# 6. Create Key Vault with Private Endpoint
# ============================================================================
log_step "Creating Key Vault"

az keyvault create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$KEY_VAULT_NAME" \
    --location "$LOCATION" \
    --sku premium \
    --enable-soft-delete true \
    --enable-purge-protection true \
    --output none

log_success "Key Vault created: $KEY_VAULT_NAME"

# Create Private Endpoint
log_step "Creating Private Endpoint for Key Vault"

KV_ID=$(az keyvault show --name "$KEY_VAULT_NAME" --query id -o tsv)

az network private-endpoint create \
    --resource-group "$RESOURCE_GROUP" \
    --name "pe-$KEY_VAULT_NAME" \
    --vnet-name "$VNET_NAME" \
    --subnet "subnet-private-endpoints" \
    --private-connection-resource-id "$KV_ID" \
    --group-ids vault \
    --connection-name "kv-private-connection" \
    --output none

# Create Private DNS Zone
az network private-dns zone create \
    --resource-group "$RESOURCE_GROUP" \
    --name "privatelink.vaultcore.azure.net" \
    --output none

# Link DNS zone to VNet
az network private-dns link vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --zone-name "privatelink.vaultcore.azure.net" \
    --name "kv-dns-link" \
    --virtual-network "$VNET_NAME" \
    --registration-enabled false \
    --output none

# Create DNS zone group
az network private-endpoint dns-zone-group create \
    --resource-group "$RESOURCE_GROUP" \
    --endpoint-name "pe-$KEY_VAULT_NAME" \
    --name "kv-dns-zone-group" \
    --private-dns-zone "privatelink.vaultcore.azure.net" \
    --zone-name "keyvault" \
    --output none

log_success "Key Vault Private Endpoint configured"

# Grant VM access to Key Vault
az keyvault set-policy \
    --name "$KEY_VAULT_NAME" \
    --object-id "$VM_IDENTITY" \
    --secret-permissions get list \
    --output none

log_success "VM granted access to Key Vault secrets"

# ============================================================================
# 7. Install VM Extensions
# ============================================================================
log_step "Installing VM Extensions"

# Install Azure CLI on VM
az vm run-command invoke \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --command-id RunShellScript \
    --scripts "curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash" \
    --output none

log_success "Azure CLI installed on VM"

# ============================================================================
# 8. Create Service Principal for DevOps
# ============================================================================
log_step "Creating Service Principal for Azure DevOps"

SP_OUTPUT=$(az ad sp create-for-rbac \
    --name "sp-devops-blockchain-$(date +%s)" \
    --role "Contributor" \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
    --output json)

SP_APP_ID=$(echo $SP_OUTPUT | jq -r '.appId')
SP_PASSWORD=$(echo $SP_OUTPUT | jq -r '.password')
SP_TENANT=$(echo $SP_OUTPUT | jq -r '.tenant')

# Grant Key Vault access to Service Principal
az keyvault set-policy \
    --name "$KEY_VAULT_NAME" \
    --spn "$SP_APP_ID" \
    --secret-permissions get list \
    --output none

log_success "Service Principal created for Azure DevOps"

# ============================================================================
# OUTPUT SUMMARY
# ============================================================================

echo ""
echo "============================================================"
echo "✓ AZURE INFRASTRUCTURE SETUP COMPLETE"
echo "============================================================"
echo ""
echo "Resources Created:"
echo "  Resource Group:  $RESOURCE_GROUP"
echo "  Virtual Network: $VNET_NAME"
echo "  VM:              $VM_NAME (no public IP)"
echo "  Bastion:         $BASTION_NAME"
echo "  Key Vault:       $KEY_VAULT_NAME"
echo ""
echo "============================================================"
echo "NEXT STEPS"
echo "============================================================"
echo ""
echo "1. Connect to VM via Azure Bastion:"
echo "   - Go to: https://portal.azure.com"
echo "   - Navigate to: Virtual Machines → $VM_NAME"
echo "   - Click: Connect → Bastion"
echo "   - Username: $VM_ADMIN_USER"
echo ""
echo "2. Add secrets to Key Vault:"
echo "   az keyvault secret set --vault-name $KEY_VAULT_NAME --name deployer-private-key --value '0x...'"
echo "   az keyvault secret set --vault-name $KEY_VAULT_NAME --name storyscan-api-key --value '...'"
echo "   az keyvault secret set --vault-name $KEY_VAULT_NAME --name etherscan-api-key --value '...'"
echo "   az keyvault secret set --vault-name $KEY_VAULT_NAME --name pinata-jwt --value '...'"
echo ""
echo "3. Configure Azure DevOps Service Connection:"
echo "   Subscription ID: $SUBSCRIPTION_ID"
echo "   Tenant ID:       $SP_TENANT"
echo "   Client ID:       $SP_APP_ID"
echo "   Client Secret:   $SP_PASSWORD"
echo ""
echo "4. Save these values securely - the client secret won't be shown again!"
echo ""

# Save configuration to file
cat > azure-config.json << EOF
{
  "resourceGroup": "$RESOURCE_GROUP",
  "location": "$LOCATION",
  "subscriptionId": "$SUBSCRIPTION_ID",
  "vnet": {
    "name": "$VNET_NAME",
    "addressPrefix": "$VNET_PREFIX"
  },
  "vm": {
    "name": "$VM_NAME",
    "adminUser": "$VM_ADMIN_USER",
    "identityPrincipalId": "$VM_IDENTITY"
  },
  "bastion": {
    "name": "$BASTION_NAME"
  },
  "keyVault": {
    "name": "$KEY_VAULT_NAME"
  },
  "servicePrincipal": {
    "appId": "$SP_APP_ID",
    "tenantId": "$SP_TENANT"
  }
}
EOF

echo "Configuration saved to: azure-config.json"
echo ""
echo "============================================================"
