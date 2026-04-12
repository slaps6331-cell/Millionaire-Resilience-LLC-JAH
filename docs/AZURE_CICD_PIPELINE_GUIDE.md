# Azure CI/CD Pipeline for Smart Contract Deployment
## Millionaire Resilience LLC - Complete DevOps Implementation

**Repository:** `slaps6331-cell/Millionaire-Resilience-LLC-JAH`  
**Networks:** Story Protocol (Chain 1514) | Base L2 (Chain 8453)  
**Tools:** Hardhat + Foundry | Azure DevOps | Azure Key Vault | Azure Bastion

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Azure Bastion Setup (Secure VM Access)](#2-azure-bastion-setup)
3. [Azure Key Vault Configuration](#3-azure-key-vault-configuration)
4. [Azure DevOps Pipeline Setup](#4-azure-devops-pipeline-setup)
5. [CI Pipeline (Continuous Integration)](#5-ci-pipeline)
6. [CD Pipeline (Continuous Deployment)](#6-cd-pipeline)
7. [Multi-Signature Verification Stage](#7-multi-signature-verification-stage)
8. [Security Scanning Stage](#8-security-scanning-stage)
9. [Deployment Artifacts](#9-deployment-artifacts)
10. [Monitoring & Alerts](#10-monitoring--alerts)
11. [Rollback Procedures](#11-rollback-procedures)
12. [Quick Reference](#12-quick-reference)

---

## 1. Architecture Overview

### Complete CI/CD Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AZURE CI/CD ARCHITECTURE                              │
│                    Smart Contract Deployment Pipeline                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │   GitHub     │────▶│  Azure       │────▶│  Azure DevOps Pipelines      │ │
│  │   Repository │     │  Repos Sync  │     │                              │ │
│  │              │     │  (mirror)    │     │  ┌────────────────────────┐  │ │
│  │  - Solidity  │     └──────────────┘     │  │   CI STAGES            │  │ │
│  │  - Hardhat   │                          │  │   1. Install Deps      │  │ │
│  │  - Foundry   │                          │  │   2. Compile (HH+FF)   │  │ │
│  │  - Tests     │                          │  │   3. Unit Tests        │  │ │
│  └──────────────┘                          │  │   4. Security Scan     │  │ │
│                                            │  │   5. Gas Report        │  │ │
│                                            │  └───────────┬────────────┘  │ │
│                                            │              │               │ │
│  ┌──────────────┐                          │              ▼               │ │
│  │  Azure       │◀─────────────────────────│  ┌────────────────────────┐  │ │
│  │  Key Vault   │                          │  │   CD STAGES            │  │ │
│  │              │                          │  │   6. Multi-Sig Check   │  │ │
│  │  - Private   │─────────────────────────▶│  │   7. Deploy Testnet    │  │ │
│  │    Keys      │    (Secure Injection)    │  │   8. Verify Contracts  │  │ │
│  │  - API Keys  │                          │  │   9. Deploy Mainnet    │  │ │
│  │  - Secrets   │                          │  │  10. Post-Deploy       │  │ │
│  └──────────────┘                          │  └───────────┬────────────┘  │ │
│                                            │              │               │ │
│                                            └──────────────┼───────────────┘ │
│                                                           │                 │
│  ┌────────────────────────────────────────────────────────┼─────────────┐   │
│  │                    DEPLOYMENT TARGETS                  │             │   │
│  │                                                        ▼             │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │   │
│  │  │  Story Protocol  │  │     Base L2      │  │     Pinata      │   │   │
│  │  │   Chain 1514     │  │    Chain 8453    │  │      IPFS       │   │   │
│  │  │                  │  │                  │  │                 │   │   │
│  │  │  - StoryScan.io  │  │  - BaseScan.org  │  │  - UCC-1 Docs   │   │   │
│  │  │  - IP Registry   │  │  - Morpho Blue   │  │  - ABI Proof    │   │   │
│  │  └──────────────────┘  └──────────────────┘  └─────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    SECURE ACCESS (Azure Bastion)                      │   │
│  │                                                                       │   │
│  │   ┌─────────────┐      ┌──────────────┐      ┌──────────────────┐   │   │
│  │   │  Developer  │─────▶│   Azure      │─────▶│   Private VM     │   │   │
│  │   │  Browser    │ SSH  │   Bastion    │ SSH  │   (No Public IP) │   │   │
│  │   │  (Portal)   │      │   (Managed)  │      │                  │   │   │
│  │   └─────────────┘      └──────────────┘      └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Network Accessibility Matrix

| Component | Public Access | Private Access | Method |
|-----------|---------------|----------------|--------|
| Azure VM | ❌ No Public IP | ✅ VNet 10.0.0.0/24 | Azure Bastion |
| Key Vault | ❌ Private Endpoint | ✅ VNet Integration | Managed Identity |
| DevOps Agent | ❌ Self-hosted | ✅ VNet | Private Agent Pool |
| Blockchain RPC | ✅ Outbound | N/A | HTTPS 443 |

---

## 2. Azure Bastion Setup

### Why Bastion?

A VM without a public IP cannot be reached directly from the internet. Azure Bastion provides:
- **Browser-based SSH** directly from Azure Portal
- **No public IP exposure** on your VM
- **No need for VPN** or jump boxes
- **Azure AD authentication** support

### 2.1 Create Bastion Subnet

```bash
#!/bin/bash
# create-bastion.sh

RESOURCE_GROUP="rg-blockchain-deployment"
VNET_NAME="vnet-blockchain"
LOCATION="eastus2"
BASTION_NAME="bastion-blockchain"

echo "============================================================"
echo "Creating Azure Bastion for Secure VM Access"
echo "============================================================"

# Create AzureBastionSubnet (required name)
az network vnet subnet create \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name AzureBastionSubnet \
    --address-prefixes 10.0.1.0/26

# Create public IP for Bastion (required)
az network public-ip create \
    --resource-group "$RESOURCE_GROUP" \
    --name "${BASTION_NAME}-pip" \
    --sku Standard \
    --allocation-method Static

# Create Bastion host
az network bastion create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BASTION_NAME" \
    --public-ip-address "${BASTION_NAME}-pip" \
    --vnet-name "$VNET_NAME" \
    --sku Standard \
    --enable-tunneling true

echo "✓ Azure Bastion created successfully"
echo ""
echo "To connect:"
echo "  1. Go to Azure Portal → Virtual Machines → vm-contract-deployer"
echo "  2. Click 'Connect' → 'Bastion'"
echo "  3. Enter credentials and click 'Connect'"
```

### 2.2 Connect via Bastion

**Method 1: Azure Portal (Browser SSH)**
1. Navigate to: https://portal.azure.com
2. Go to: Virtual Machines → `vm-contract-deployer`
3. Click: **Connect** → **Bastion**
4. Enter: Username (`azureuser`) and SSH Key
5. Click: **Connect**

**Method 2: Azure CLI (Native SSH)**
```bash
# Enable native client support
az network bastion ssh \
    --name bastion-blockchain \
    --resource-group rg-blockchain-deployment \
    --target-resource-id /subscriptions/<sub-id>/resourceGroups/rg-blockchain-deployment/providers/Microsoft.Compute/virtualMachines/vm-contract-deployer \
    --auth-type ssh-key \
    --username azureuser \
    --ssh-key ~/.ssh/vm-contract-deployer-key.pem
```

**Method 3: VS Code Remote SSH via Bastion**
```bash
# Create SSH tunnel through Bastion
az network bastion tunnel \
    --name bastion-blockchain \
    --resource-group rg-blockchain-deployment \
    --target-resource-id /subscriptions/<sub-id>/resourceGroups/rg-blockchain-deployment/providers/Microsoft.Compute/virtualMachines/vm-contract-deployer \
    --resource-port 22 \
    --port 2222

# In another terminal, connect via localhost
ssh -p 2222 azureuser@localhost
```

---

## 3. Azure Key Vault Configuration

### 3.1 Create Key Vault with Private Endpoint

```bash
#!/bin/bash
# create-keyvault-private.sh

RESOURCE_GROUP="rg-blockchain-deployment"
KEY_VAULT_NAME="kv-blockchain-deploy"
LOCATION="eastus2"
VNET_NAME="vnet-blockchain"
SUBNET_NAME="default"

echo "============================================================"
echo "Creating Azure Key Vault with Private Endpoint"
echo "============================================================"

# Create Key Vault
az keyvault create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$KEY_VAULT_NAME" \
    --location "$LOCATION" \
    --sku premium \
    --enable-rbac-authorization false \
    --enable-soft-delete true \
    --enable-purge-protection true

# Create private endpoint subnet
az network vnet subnet create \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "subnet-private-endpoints" \
    --address-prefixes 10.0.2.0/24 \
    --disable-private-endpoint-network-policies true

# Create private endpoint for Key Vault
az network private-endpoint create \
    --resource-group "$RESOURCE_GROUP" \
    --name "pe-keyvault" \
    --vnet-name "$VNET_NAME" \
    --subnet "subnet-private-endpoints" \
    --private-connection-resource-id $(az keyvault show --name "$KEY_VAULT_NAME" --query id -o tsv) \
    --group-ids vault \
    --connection-name "kv-private-connection"

# Create private DNS zone
az network private-dns zone create \
    --resource-group "$RESOURCE_GROUP" \
    --name "privatelink.vaultcore.azure.net"

# Link DNS zone to VNet
az network private-dns link vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --zone-name "privatelink.vaultcore.azure.net" \
    --name "kv-dns-link" \
    --virtual-network "$VNET_NAME" \
    --registration-enabled false

# Create DNS record
az network private-endpoint dns-zone-group create \
    --resource-group "$RESOURCE_GROUP" \
    --endpoint-name "pe-keyvault" \
    --name "kv-dns-zone-group" \
    --private-dns-zone "privatelink.vaultcore.azure.net" \
    --zone-name "keyvault"

echo "✓ Key Vault with private endpoint created"
```

### 3.2 Add Secrets to Key Vault

```bash
#!/bin/bash
# populate-keyvault.sh

KEY_VAULT_NAME="kv-blockchain-deploy"

echo "============================================================"
echo "Adding Deployment Secrets to Key Vault"
echo "============================================================"

# Function to add secret
add_secret() {
    local name=$1
    local description=$2
    echo -n "Enter $description: "
    read -s value
    echo ""
    az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "$name" --value "$value" --output none
    echo "✓ Added: $name"
}

# Required secrets
add_secret "deployer-private-key" "Deployer wallet private key (0x...)"
add_secret "storyscan-api-key" "StoryScan API key"
add_secret "etherscan-api-key" "Etherscan/BaseScan API key"
add_secret "alchemy-api-key" "Alchemy API key"
add_secret "pinata-jwt" "Pinata JWT token"
add_secret "pinata-api-key" "Pinata API key"
add_secret "pinata-secret-key" "Pinata secret key"

# Optional: Coinbase CDP
add_secret "coinbase-api-key-name" "Coinbase CDP API key name"
add_secret "coinbase-api-private-key" "Coinbase CDP private key"

echo ""
echo "✓ All secrets added to Key Vault"
```

### 3.3 Grant Access to DevOps Service Principal

```bash
#!/bin/bash
# grant-devops-access.sh

KEY_VAULT_NAME="kv-blockchain-deploy"
SERVICE_PRINCIPAL_NAME="sp-devops-blockchain"
RESOURCE_GROUP="rg-blockchain-deployment"

# Create service principal for Azure DevOps
SP_OUTPUT=$(az ad sp create-for-rbac \
    --name "$SERVICE_PRINCIPAL_NAME" \
    --role "Key Vault Secrets User" \
    --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP" \
    --output json)

CLIENT_ID=$(echo $SP_OUTPUT | jq -r '.appId')
CLIENT_SECRET=$(echo $SP_OUTPUT | jq -r '.password')
TENANT_ID=$(echo $SP_OUTPUT | jq -r '.tenant')

echo "Service Principal Created:"
echo "  Client ID:     $CLIENT_ID"
echo "  Client Secret: [stored securely]"
echo "  Tenant ID:     $TENANT_ID"

# Grant Key Vault access
az keyvault set-policy \
    --name "$KEY_VAULT_NAME" \
    --spn "$CLIENT_ID" \
    --secret-permissions get list

echo ""
echo "✓ Service Principal granted Key Vault access"
echo ""
echo "Add these to Azure DevOps Service Connection:"
echo "  Subscription ID: $(az account show --query id -o tsv)"
echo "  Tenant ID:       $TENANT_ID"
echo "  Client ID:       $CLIENT_ID"
echo "  Client Secret:   $CLIENT_SECRET"
```

---

## 4. Azure DevOps Pipeline Setup

### 4.1 Create Azure DevOps Project

1. Navigate to: https://dev.azure.com
2. Click: **New Project**
3. Configure:
   - Name: `Millionaire-Resilience-Blockchain`
   - Visibility: Private
   - Version control: Git
   - Work item process: Agile

### 4.2 Connect GitHub Repository

1. Go to: **Project Settings** → **Service connections**
2. Click: **New service connection** → **GitHub**
3. Authorize Azure DevOps to access GitHub
4. Select repository: `slaps6331-cell/Millionaire-Resilience-LLC-JAH`

### 4.3 Create Azure Service Connection

1. Go to: **Project Settings** → **Service connections**
2. Click: **New service connection** → **Azure Resource Manager**
3. Select: **Service principal (manual)**
4. Enter credentials from `grant-devops-access.sh` output

### 4.4 Create Variable Groups

**Variable Group: `blockchain-secrets`**
| Variable | Value Source | Secret |
|----------|--------------|--------|
| `DEPLOYER_PRIVATE_KEY` | Key Vault | ✅ |
| `STORYSCAN_API_KEY` | Key Vault | ✅ |
| `ETHERSCAN_API_KEY` | Key Vault | ✅ |
| `ALCHEMY_API_KEY` | Key Vault | ✅ |
| `PINATA_JWT` | Key Vault | ✅ |

**Variable Group: `blockchain-config`**
| Variable | Value |
|----------|-------|
| `STORY_RPC_URL` | `https://mainnet.storyrpc.io` |
| `BASE_RPC_URL` | `https://mainnet.base.org` |
| `STORY_DEPLOYER_ADDRESS` | `0x597856e93f19877a399f686D2F43b298e2268618` |
| `COINBASE_WALLET_ADDRESS` | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |

---

## 5. CI Pipeline

See `azure-pipelines-ci.yml` in the repository root.

### CI Stages Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CI PIPELINE STAGES                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stage 1: Install                                            │
│  ├── Install Node.js 20.x                                    │
│  ├── Install npm dependencies                                │
│  └── Install Foundry (forge, cast)                           │
│                                                              │
│  Stage 2: Compile                                            │
│  ├── Hardhat compile (Solidity 0.8.26)                       │
│  ├── Foundry compile (forge build)                           │
│  └── Verify bytecode sizes                                   │
│                                                              │
│  Stage 3: Test                                               │
│  ├── Hardhat unit tests                                      │
│  ├── Foundry fuzz tests                                      │
│  └── Coverage report                                         │
│                                                              │
│  Stage 4: Security                                           │
│  ├── Slither static analysis                                 │
│  ├── Mythril symbolic execution                              │
│  └── Gas optimization report                                 │
│                                                              │
│  Stage 5: Artifacts                                          │
│  ├── Publish ABI/bytecode                                    │
│  ├── Publish test results                                    │
│  └── Publish security reports                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. CD Pipeline

See `azure-pipelines-cd.yml` in the repository root.

### CD Stages Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CD PIPELINE STAGES                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stage 1: Multi-Sig Verification                             │
│  ├── Check signature-morpho-config.json                      │
│  ├── Verify EIP-191 signatures                               │
│  └── Require 2/2 signatures                                  │
│                                                              │
│  Stage 2: Deploy to Testnet (Manual Approval)                │
│  ├── Deploy to Story Odyssey (testnet)                       │
│  ├── Deploy to Base Sepolia (testnet)                        │
│  └── Run integration tests                                   │
│                                                              │
│  Stage 3: Deploy to Mainnet (Manual Approval)                │
│  ├── Load secrets from Key Vault                             │
│  ├── Deploy to Story Protocol (1514)                         │
│  ├── Deploy to Base L2 (8453)                                │
│  └── Verify on explorers                                     │
│                                                              │
│  Stage 4: Post-Deployment                                    │
│  ├── Record UCC-1 filing                                     │
│  ├── Create Morpho markets                                   │
│  ├── Pin ABI to IPFS                                         │
│  └── Update deployment registry                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Multi-Signature Verification Stage

The pipeline enforces 2-of-2 multi-signature verification before any mainnet deployment.

### Verification Flow

```
┌─────────────────────────────────────────────────────────────┐
│              MULTI-SIG VERIFICATION GATE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Pipeline checks signature-morpho-config.json             │
│     └── Must contain both signatures                         │
│                                                              │
│  2. Run verify-multisig.cjs                                  │
│     └── Recovers signer addresses from signatures            │
│     └── Compares against expected wallets                    │
│                                                              │
│  3. Verification Matrix:                                     │
│     ┌──────────────────┬──────────────────┬─────────────┐   │
│     │ Story Deployer   │ Coinbase Wallet  │   Result    │   │
│     ├──────────────────┼──────────────────┼─────────────┤   │
│     │       ✅          │       ✅          │ ✅ PROCEED  │   │
│     │       ✅          │       ❌          │ ❌ BLOCKED  │   │
│     │       ❌          │       ✅          │ ❌ BLOCKED  │   │
│     │       ❌          │       ❌          │ ❌ BLOCKED  │   │
│     └──────────────────┴──────────────────┴─────────────┘   │
│                                                              │
│  4. If verification fails:                                   │
│     └── Pipeline stops                                       │
│     └── Notification sent                                    │
│     └── Manual intervention required                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Security Scanning Stage

### Tools Used

| Tool | Purpose | Severity Threshold |
|------|---------|-------------------|
| **Slither** | Static analysis | Medium+ fails build |
| **Mythril** | Symbolic execution | High fails build |
| **Solhint** | Linting | Warning only |
| **Gas Reporter** | Optimization | Info only |

### Security Gate Logic

```yaml
# Security gate in pipeline
- script: |
    SLITHER_ISSUES=$(cat slither-report.json | jq '.results.detectors | length')
    MYTHRIL_ISSUES=$(cat mythril-report.json | jq '.issues | map(select(.severity == "High")) | length')
    
    if [ "$SLITHER_ISSUES" -gt 0 ]; then
      echo "##vso[task.logissue type=error]Slither found $SLITHER_ISSUES issues"
      exit 1
    fi
    
    if [ "$MYTHRIL_ISSUES" -gt 0 ]; then
      echo "##vso[task.logissue type=error]Mythril found $MYTHRIL_ISSUES high severity issues"
      exit 1
    fi
  displayName: 'Security Gate Check'
```

---

## 9. Deployment Artifacts

### Artifact Structure

```
$(Build.ArtifactStagingDirectory)/
├── contracts/
│   ├── StoryAttestationService.json      # ABI + Bytecode
│   ├── AngelCoin.json
│   └── ... (all 12 contracts)
├── deployments/
│   ├── deployment-config.story.json      # Story addresses
│   ├── deployment-config.base.json       # Base addresses
│   └── tx-hashes.json                    # Transaction hashes
├── verification/
│   ├── signature-morpho-config.json      # Multi-sig data
│   └── multisig-transaction.json
├── security/
│   ├── slither-report.json
│   ├── mythril-report.json
│   └── gas-report.txt
└── ipfs/
    ├── abi-proof.json                    # ABI proof for IPFS
    └── ucc1-filing-metadata.json
```

---

## 10. Monitoring & Alerts

### Azure Monitor Integration

```bash
# Create Log Analytics Workspace
az monitor log-analytics workspace create \
    --resource-group rg-blockchain-deployment \
    --workspace-name law-blockchain-deploy

# Create Action Group for alerts
az monitor action-group create \
    --resource-group rg-blockchain-deployment \
    --name ag-deployment-alerts \
    --short-name DeployAlert \
    --email-receiver name=Admin email=admin@company.com

# Create alert for failed deployments
az monitor metrics alert create \
    --resource-group rg-blockchain-deployment \
    --name alert-deployment-failed \
    --scopes /subscriptions/<sub-id>/resourceGroups/rg-blockchain-deployment \
    --condition "count requests > 0 where resultCode == 'Failed'" \
    --action ag-deployment-alerts
```

---

## 11. Rollback Procedures

### Automatic Rollback Trigger

```yaml
# In azure-pipelines-cd.yml
- stage: Rollback
  displayName: 'Rollback on Failure'
  condition: failed()
  jobs:
    - job: RollbackDeployment
      steps:
        - script: |
            echo "Deployment failed. Initiating rollback..."
            # Rollback is complex for blockchain - typically means:
            # 1. Mark failed contracts as deprecated
            # 2. Update frontend to use previous addresses
            # 3. Notify team for manual intervention
          displayName: 'Execute Rollback'
```

### Manual Rollback Steps

1. **Identify failed deployment** in Azure DevOps
2. **Get previous deployment config** from artifacts
3. **Update frontend** to use previous contract addresses
4. **Mark failed contracts** as deprecated on-chain (if possible)
5. **Create incident report**

---

## 12. Quick Reference

### Pipeline Triggers

| Event | CI | CD Testnet | CD Mainnet |
|-------|----|-----------:|------------|
| Push to `main` | ✅ Auto | ❌ | ❌ |
| Push to `develop` | ✅ Auto | ✅ Auto | ❌ |
| Pull Request | ✅ Auto | ❌ | ❌ |
| Tag `v*` | ✅ Auto | ✅ Auto | ⏸️ Approval |
| Manual | ✅ | ✅ | ✅ |

### Required Approvals

| Stage | Approvers Required |
|-------|-------------------|
| Testnet Deploy | 0 (automatic) |
| Mainnet Deploy | 2 (multi-sig holders) |
| Rollback | 1 |

### Environment URLs

| Environment | Network | Explorer |
|-------------|---------|----------|
| Story Testnet | Odyssey | https://odyssey.storyscan.xyz |
| Story Mainnet | 1514 | https://www.storyscan.io |
| Base Testnet | Sepolia | https://sepolia.basescan.org |
| Base Mainnet | 8453 | https://basescan.org |

---

## Document Information

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Repository:** https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH
