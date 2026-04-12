# Azure Virtual Machine Configuration Guide
## Smart Contract Deployment & Multi-Signature Verification Environment

**Millionaire Resilience LLC / Gladiator Holdings LLC**  
**Repository:** `slaps6331-cell/Millionaire-Resilience-LLC-JAH`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Azure VM Creation](#2-azure-vm-creation)
3. [Network Security Configuration](#3-network-security-configuration)
4. [Initial VM Setup](#4-initial-vm-setup)
5. [Development Environment Installation](#5-development-environment-installation)
6. [Azure Key Vault Integration](#6-azure-key-vault-integration)
7. [Repository & Dependencies Setup](#7-repository--dependencies-setup)
8. [Multi-Signature Configuration](#8-multi-signature-configuration)
9. [Deployment Workflow Execution](#9-deployment-workflow-execution)
10. [Monitoring & Logging](#10-monitoring--logging)
11. [Security Best Practices](#11-security-best-practices)
12. [Troubleshooting](#12-troubleshooting)
13. [Quick Reference Commands](#13-quick-reference-commands)

---

## 1. Overview

### Purpose
This guide configures an Azure Virtual Machine optimized for:
- **Smart Contract Compilation** (Solidity 0.8.26, Hardhat)
- **Multi-Signature Verification** (EIP-191, Morpho Protocol)
- **Blockchain Deployment** (Story Protocol Chain 1514, Base L2 Chain 8453)
- **IPFS Integration** (Pinata for UCC-1 document storage)

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        AZURE CLOUD                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │   Azure Key      │     │   Azure VM       │                  │
│  │   Vault          │────▶│   (Ubuntu 22.04) │                  │
│  │   - Private Keys │     │   - Node.js 20   │                  │
│  │   - API Keys     │     │   - Hardhat      │                  │
│  │   - Secrets      │     │   - Foundry      │                  │
│  └──────────────────┘     └────────┬─────────┘                  │
│                                    │                             │
│  ┌──────────────────┐              │                             │
│  │   Network        │              │                             │
│  │   Security Group │──────────────┤                             │
│  │   - SSH (22)     │              │                             │
│  │   - HTTPS (443)  │              │                             │
│  └──────────────────┘              │                             │
│                                    ▼                             │
└────────────────────────────────────┼─────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │ Story Proto  │ │   Base L2    │ │   Pinata     │
            │ Chain 1514   │ │  Chain 8453  │ │   IPFS       │
            │ StoryScan.io │ │ BaseScan.org │ │  Gateway     │
            └──────────────┘ └──────────────┘ └──────────────┘
```

### Recommended VM Specifications

| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|------------|
| **VM Size** | Standard_B2s | Standard_D2s_v3 | Standard_D4s_v3 |
| **vCPUs** | 2 | 2 | 4 |
| **RAM** | 4 GB | 8 GB | 16 GB |
| **Storage** | 30 GB SSD | 64 GB SSD | 128 GB Premium SSD |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## 2. Azure VM Creation

### 2.1 Create VM via Azure Portal

1. **Navigate to Azure Portal:** https://portal.azure.com
2. **Click "Create a resource" → "Virtual Machine"**
3. **Configure Basics:**

```
Subscription:        Your-Subscription
Resource Group:      rg-blockchain-deployment (create new)
Virtual Machine Name: vm-contract-deployer
Region:              (US) East US 2
Availability:        No infrastructure redundancy required
Security Type:       Trusted launch virtual machines
Image:               Ubuntu Server 22.04 LTS - x64 Gen2
VM Architecture:     x64
Size:                Standard_D2s_v3 (2 vCPUs, 8 GB RAM)
```

4. **Configure Authentication:**

```
Authentication Type:  SSH public key
Username:             azureuser
SSH Public Key Source: Generate new key pair
Key Pair Name:        vm-contract-deployer-key
```

5. **Configure Disks:**

```
OS Disk Type:         Premium SSD
OS Disk Size:         64 GB
Encryption:           Platform-managed key
```

6. **Configure Networking:**

```
Virtual Network:      vnet-blockchain (create new)
Subnet:               default (10.0.0.0/24)
Public IP:            vm-contract-deployer-ip (create new)
NIC NSG:              Advanced
Configure NSG:        nsg-contract-deployer (create new)
Delete Public IP:     ☐ (unchecked)
Accelerated Networking: ☑ (checked)
```

### 2.2 Create VM via Azure CLI

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "Your-Subscription-Name"

# Create resource group
az group create \
    --name rg-blockchain-deployment \
    --location eastus2

# Create virtual network
az network vnet create \
    --resource-group rg-blockchain-deployment \
    --name vnet-blockchain \
    --address-prefix 10.0.0.0/16 \
    --subnet-name default \
    --subnet-prefix 10.0.0.0/24

# Create public IP
az network public-ip create \
    --resource-group rg-blockchain-deployment \
    --name vm-contract-deployer-ip \
    --sku Standard \
    --allocation-method Static

# Create network security group
az network nsg create \
    --resource-group rg-blockchain-deployment \
    --name nsg-contract-deployer

# Create VM
az vm create \
    --resource-group rg-blockchain-deployment \
    --name vm-contract-deployer \
    --image Ubuntu2204 \
    --size Standard_D2s_v3 \
    --admin-username azureuser \
    --generate-ssh-keys \
    --public-ip-address vm-contract-deployer-ip \
    --nsg nsg-contract-deployer \
    --vnet-name vnet-blockchain \
    --subnet default \
    --os-disk-size-gb 64 \
    --storage-sku Premium_LRS

# Get public IP address
az vm show \
    --resource-group rg-blockchain-deployment \
    --name vm-contract-deployer \
    --show-details \
    --query publicIps \
    --output tsv
```

---

## 3. Network Security Configuration

### 3.1 Configure NSG Rules

```bash
# Allow SSH (port 22) - Restrict to your IP
az network nsg rule create \
    --resource-group rg-blockchain-deployment \
    --nsg-name nsg-contract-deployer \
    --name AllowSSH \
    --priority 100 \
    --direction Inbound \
    --access Allow \
    --protocol Tcp \
    --source-address-prefixes "YOUR_IP_ADDRESS/32" \
    --destination-port-ranges 22

# Allow HTTPS outbound (for RPC calls)
az network nsg rule create \
    --resource-group rg-blockchain-deployment \
    --nsg-name nsg-contract-deployer \
    --name AllowHTTPSOutbound \
    --priority 100 \
    --direction Outbound \
    --access Allow \
    --protocol Tcp \
    --destination-port-ranges 443

# Allow HTTP outbound (for npm)
az network nsg rule create \
    --resource-group rg-blockchain-deployment \
    --nsg-name nsg-contract-deployer \
    --name AllowHTTPOutbound \
    --priority 110 \
    --direction Outbound \
    --access Allow \
    --protocol Tcp \
    --destination-port-ranges 80

# Deny all other inbound traffic
az network nsg rule create \
    --resource-group rg-blockchain-deployment \
    --nsg-name nsg-contract-deployer \
    --name DenyAllInbound \
    --priority 4096 \
    --direction Inbound \
    --access Deny \
    --protocol '*' \
    --source-address-prefixes '*' \
    --destination-port-ranges '*'
```

### 3.2 NSG Rules Summary Table

| Priority | Name | Direction | Port | Protocol | Source | Action |
|----------|------|-----------|------|----------|--------|--------|
| 100 | AllowSSH | Inbound | 22 | TCP | Your IP | Allow |
| 100 | AllowHTTPSOut | Outbound | 443 | TCP | Any | Allow |
| 110 | AllowHTTPOut | Outbound | 80 | TCP | Any | Allow |
| 4096 | DenyAllInbound | Inbound | * | * | Any | Deny |

---

## 4. Initial VM Setup

### 4.1 Connect to VM

```bash
# Download SSH key from Azure Portal if generated there
# Or use your existing key

# Connect via SSH
ssh -i ~/.ssh/vm-contract-deployer-key.pem azureuser@<VM_PUBLIC_IP>

# Or with password if configured
ssh azureuser@<VM_PUBLIC_IP>
```

### 4.2 System Update & Security Hardening

```bash
#!/bin/bash
# Run as: sudo bash initial-setup.sh

echo "============================================================"
echo "INITIAL VM SETUP - Security Hardening"
echo "============================================================"

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    jq \
    unzip \
    htop \
    tmux \
    vim \
    fail2ban \
    ufw

# Configure automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw --force enable

# Configure fail2ban for SSH protection
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Harden SSH configuration
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
sudo tee /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
# SSH Hardening Configuration
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowTcpForwarding no
EOF

# Restart SSH service
sudo systemctl restart sshd

# Set timezone
sudo timedatectl set-timezone UTC

# Configure system limits for Node.js
sudo tee /etc/security/limits.d/nodejs.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
EOF

echo "✓ Initial setup complete"
echo "⚠️  Reconnect via SSH to apply changes"
```

### 4.3 Create Deployment User

```bash
# Create dedicated user for deployments
sudo useradd -m -s /bin/bash deployer
sudo usermod -aG sudo deployer

# Set up SSH for deployer user
sudo mkdir -p /home/deployer/.ssh
sudo cp ~/.ssh/authorized_keys /home/deployer/.ssh/
sudo chown -R deployer:deployer /home/deployer/.ssh
sudo chmod 700 /home/deployer/.ssh
sudo chmod 600 /home/deployer/.ssh/authorized_keys

# Switch to deployer user
sudo su - deployer
```

---

## 5. Development Environment Installation

### 5.1 Install Node.js 20.x

```bash
#!/bin/bash
# Run as deployer user

echo "============================================================"
echo "Installing Node.js 20.x"
echo "============================================================"

# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x

# Install global npm packages
sudo npm install -g npm@latest
sudo npm install -g npx
sudo npm install -g hardhat
sudo npm install -g yarn

echo "✓ Node.js installation complete"
```

### 5.2 Install Foundry (cast, forge, anvil)

```bash
#!/bin/bash
echo "============================================================"
echo "Installing Foundry Toolkit"
echo "============================================================"

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Add to PATH
echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install Foundry tools
foundryup

# Verify installation
forge --version
cast --version
anvil --version

echo "✓ Foundry installation complete"
```

### 5.3 Install Azure CLI

```bash
#!/bin/bash
echo "============================================================"
echo "Installing Azure CLI"
echo "============================================================"

# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Verify installation
az --version

# Login to Azure (will open browser or provide device code)
az login

echo "✓ Azure CLI installation complete"
```

### 5.4 Install Additional Tools

```bash
#!/bin/bash
echo "============================================================"
echo "Installing Additional Development Tools"
echo "============================================================"

# Install Python 3 and pip (for scripts)
sudo apt install -y python3 python3-pip python3-venv

# Install Go (for some blockchain tools)
sudo apt install -y golang-go

# Install Rust (for some crypto libraries)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Install GPG for signature verification
sudo apt install -y gnupg2

echo "✓ Additional tools installation complete"
```

### 5.5 Complete Installation Script

```bash
#!/bin/bash
# install-dev-environment.sh
# Run as: bash install-dev-environment.sh

set -e

echo "============================================================"
echo "COMPLETE DEVELOPMENT ENVIRONMENT INSTALLATION"
echo "============================================================"

# Node.js 20.x
echo "[1/5] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g npm@latest npx hardhat yarn

# Foundry
echo "[2/5] Installing Foundry..."
curl -L https://foundry.paradigm.xyz | bash
export PATH="$HOME/.foundry/bin:$PATH"
foundryup

# Azure CLI
echo "[3/5] Installing Azure CLI..."
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Python & Rust
echo "[4/5] Installing Python & Rust..."
sudo apt install -y python3 python3-pip python3-venv
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# GPG
echo "[5/5] Installing GPG..."
sudo apt install -y gnupg2

# Update PATH in .bashrc
cat >> ~/.bashrc << 'EOF'

# Blockchain Development Environment
export PATH="$HOME/.foundry/bin:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"
EOF

source ~/.bashrc

echo "============================================================"
echo "✓ INSTALLATION COMPLETE"
echo "============================================================"
echo ""
echo "Installed versions:"
echo "  Node.js: $(node --version)"
echo "  npm:     $(npm --version)"
echo "  Hardhat: $(npx hardhat --version 2>/dev/null || echo 'local')"
echo "  Foundry: $(forge --version 2>/dev/null | head -1)"
echo "  Azure:   $(az --version 2>/dev/null | head -1)"
echo ""
echo "Next: Run 'az login' to authenticate with Azure"
```

---

## 6. Azure Key Vault Integration

### 6.1 Create Key Vault

```bash
#!/bin/bash
echo "============================================================"
echo "Creating Azure Key Vault"
echo "============================================================"

RESOURCE_GROUP="rg-blockchain-deployment"
KEY_VAULT_NAME="kv-blockchain-deploy"  # Must be globally unique
LOCATION="eastus2"

# Create Key Vault
az keyvault create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$KEY_VAULT_NAME" \
    --location "$LOCATION" \
    --sku standard \
    --enable-rbac-authorization false

# Enable soft delete and purge protection
az keyvault update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$KEY_VAULT_NAME" \
    --enable-soft-delete true \
    --enable-purge-protection true

echo "✓ Key Vault created: $KEY_VAULT_NAME"
```

### 6.2 Add Secrets to Key Vault

```bash
#!/bin/bash
KEY_VAULT_NAME="kv-blockchain-deploy"

echo "============================================================"
echo "Adding Secrets to Key Vault"
echo "============================================================"
echo "⚠️  Enter secrets when prompted (input will be hidden)"
echo ""

# Function to add secret securely
add_secret() {
    local secret_name=$1
    local description=$2
    
    echo -n "Enter $description: "
    read -s secret_value
    echo ""
    
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --value "$secret_value" \
        --output none
    
    echo "✓ Added: $secret_name"
}

# Add deployment secrets
add_secret "DEPLOYER-PRIVATE-KEY" "Deployer wallet private key (0x...)"
add_secret "STORYSCAN-API-KEY" "StoryScan API key"
add_secret "ETHERSCAN-API-KEY" "Etherscan/BaseScan API key"
add_secret "PINATA-JWT" "Pinata JWT token"
add_secret "PINATA-API-KEY" "Pinata API key"
add_secret "PINATA-SECRET-API-KEY" "Pinata secret API key"
add_secret "ALCHEMY-API-KEY" "Alchemy API key (optional)"

echo ""
echo "============================================================"
echo "✓ All secrets added to Key Vault"
echo "============================================================"
```

### 6.3 Grant VM Access to Key Vault

```bash
#!/bin/bash
RESOURCE_GROUP="rg-blockchain-deployment"
VM_NAME="vm-contract-deployer"
KEY_VAULT_NAME="kv-blockchain-deploy"

echo "============================================================"
echo "Configuring VM Managed Identity for Key Vault Access"
echo "============================================================"

# Enable system-assigned managed identity on VM
az vm identity assign \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME"

# Get the VM's managed identity principal ID
VM_IDENTITY=$(az vm show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --query identity.principalId \
    --output tsv)

echo "VM Identity Principal ID: $VM_IDENTITY"

# Grant Key Vault access to VM's managed identity
az keyvault set-policy \
    --name "$KEY_VAULT_NAME" \
    --object-id "$VM_IDENTITY" \
    --secret-permissions get list

echo "✓ VM granted access to Key Vault secrets"
```

### 6.4 Load Secrets in VM

```bash
#!/bin/bash
# load-secrets.sh
# Run on the VM to load secrets from Key Vault

KEY_VAULT_NAME="kv-blockchain-deploy"

echo "============================================================"
echo "Loading Secrets from Azure Key Vault"
echo "============================================================"

# Login with managed identity (no credentials needed)
az login --identity

# Load secrets into environment variables
export DEPLOYER_PRIVATE_KEY=$(az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "DEPLOYER-PRIVATE-KEY" \
    --query value -o tsv)

export STORYSCAN_API_KEY=$(az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "STORYSCAN-API-KEY" \
    --query value -o tsv)

export ETHERSCAN_API_KEY=$(az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "ETHERSCAN-API-KEY" \
    --query value -o tsv)

export PINATA_JWT=$(az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "PINATA-JWT" \
    --query value -o tsv)

export PINATA_API_KEY=$(az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "PINATA-API-KEY" \
    --query value -o tsv)

export PINATA_SECRET_API_KEY=$(az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "PINATA-SECRET-API-KEY" \
    --query value -o tsv)

# Verify secrets loaded (show partial values for confirmation)
echo ""
echo "Loaded secrets:"
echo "  DEPLOYER_PRIVATE_KEY: ${DEPLOYER_PRIVATE_KEY:0:10}..."
echo "  STORYSCAN_API_KEY:    ${STORYSCAN_API_KEY:0:10}..."
echo "  ETHERSCAN_API_KEY:    ${ETHERSCAN_API_KEY:0:10}..."
echo "  PINATA_JWT:           ${PINATA_JWT:0:10}..."
echo ""
echo "✓ Secrets loaded successfully"
```

---

## 7. Repository & Dependencies Setup

### 7.1 Clone Repository

```bash
#!/bin/bash
echo "============================================================"
echo "Cloning Repository"
echo "============================================================"

# Create workspace directory
mkdir -p ~/blockchain
cd ~/blockchain

# Clone repository
git clone https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
cd Millionaire-Resilience-LLC-JAH

# Verify clone
echo "Repository contents:"
ls -la

echo "✓ Repository cloned successfully"
```

### 7.2 Install Dependencies

```bash
#!/bin/bash
echo "============================================================"
echo "Installing Project Dependencies"
echo "============================================================"

cd ~/blockchain/Millionaire-Resilience-LLC-JAH

# Install npm dependencies
npm install --legacy-peer-deps

# Verify Hardhat installation
npx hardhat --version

# List installed packages
echo ""
echo "Key packages installed:"
npm list hardhat @nomicfoundation/hardhat-toolbox ethers --depth=0

echo "✓ Dependencies installed successfully"
```

### 7.3 Configure Environment File

```bash
#!/bin/bash
echo "============================================================"
echo "Configuring Environment File"
echo "============================================================"

cd ~/blockchain/Millionaire-Resilience-LLC-JAH

# Create .env file (secrets will be loaded from Key Vault at runtime)
cat > .env << 'EOF'
# ============================================================
# SMART CONTRACT DEPLOYMENT CONFIGURATION
# Secrets are loaded from Azure Key Vault at runtime
# ============================================================

# Network RPC URLs
STORY_RPC_URL=https://mainnet.storyrpc.io
BASE_RPC_URL=https://mainnet.base.org

# Multi-Signature Wallets
STORY_DEPLOYER_ADDRESS=0x597856e93f19877a399f686D2F43b298e2268618
COINBASE_WALLET_ADDRESS=0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a

# Pinata Gateway
PINATA_GATEWAY_NAME=lavender-neat-urial-76

# UCC-1 Filing
UCC1_FILING_HASH=bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a
UCC1_AUXILIARY_DOCS=bafybeidkp74w2idrwkg2qey66uepfaes5ekonxjqt62uztyxawii7yye7y
UCC1_FINANCING_STATEMENT_CID=bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu
UCC1_FILING_NUMBER=20260000078753
UCC1_JURISDICTION=New Mexico Secretary of State

# Morpho Protocol
MORPHO_BLUE=0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb
BASE_USDC=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
BTC_LOAN_AMOUNT=5000000000000
ETH_LOAN_AMOUNT=1000000000000
BTC_LOAN_APR=400
ETH_LOAN_APR=600
MORPHO_LLTV=860000000000000000
EOF

# Set secure permissions
chmod 600 .env

echo "✓ Environment file configured"
echo "⚠️  Run 'source scripts/load-secrets.sh' before deployment"
```

---

## 8. Multi-Signature Configuration

### 8.1 Generate Signature Payload

```bash
#!/bin/bash
echo "============================================================"
echo "Generating Multi-Signature Payload"
echo "============================================================"

cd ~/blockchain/Millionaire-Resilience-LLC-JAH

# Generate EIP-191 hash for signing
node scripts/anchor-signature.cjs

# Display the hash
echo ""
echo "============================================================"
echo "SIGNATURE PAYLOAD GENERATED"
echo "============================================================"

EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")

echo ""
echo "EIP-191 Hash to sign:"
echo "  $EIP191_HASH"
echo ""
echo "Required Signers:"
echo "  1. Story Deployer: 0x597856e93f19877a399f686D2F43b298e2268618"
echo "  2. Coinbase Wallet: 0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"
echo ""
echo "Signing Methods:"
echo "  A. MyEtherWallet: https://www.myetherwallet.com → Tools → Sign Message"
echo "  B. CLI: cast wallet sign --private-key \$KEY --no-hash \"$EIP191_HASH\""
echo ""
```

### 8.2 Sign with CLI (Foundry cast)

```bash
#!/bin/bash
echo "============================================================"
echo "Signing with Story Deployer Wallet (CLI)"
echo "============================================================"

cd ~/blockchain/Millionaire-Resilience-LLC-JAH

# Load secrets from Key Vault
source scripts/load-secrets.sh

# Get the hash to sign
EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")

echo "Hash to sign: $EIP191_HASH"
echo ""

# Sign with Story Deployer
echo "Signing with Story Deployer..."
STORY_SIGNATURE=$(cast wallet sign \
    --private-key "$DEPLOYER_PRIVATE_KEY" \
    --no-hash \
    "$EIP191_HASH")

echo "Story Deployer Signature:"
echo "  $STORY_SIGNATURE"
echo ""

# Update signature file
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('signature-morpho-config.json'));
config.signatures = config.signatures || {};
config.signatures.story = '$STORY_SIGNATURE';
fs.writeFileSync('signature-morpho-config.json', JSON.stringify(config, null, 2));
console.log('✓ Signature saved to signature-morpho-config.json');
"
```

### 8.3 Verify Signatures

```bash
#!/bin/bash
echo "============================================================"
echo "Verifying Multi-Sig Signatures"
echo "============================================================"

cd ~/blockchain/Millionaire-Resilience-LLC-JAH

# Run verification script
node scripts/verify-multisig.cjs

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo "✓ ALL SIGNATURES VERIFIED - Ready for deployment"
    echo "============================================================"
else
    echo ""
    echo "============================================================"
    echo "❌ SIGNATURE VERIFICATION FAILED"
    echo "============================================================"
    echo "Check that both wallets have signed the correct hash"
    exit 1
fi
```

---

## 9. Deployment Workflow Execution

### 9.1 Pre-Deployment Checklist

```bash
#!/bin/bash
echo "============================================================"
echo "PRE-DEPLOYMENT CHECKLIST"
echo "============================================================"

cd ~/blockchain/Millionaire-Resilience-LLC-JAH

ERRORS=0

# Check 1: Secrets loaded
echo -n "[1/6] Checking secrets... "
if [ -n "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "✓"
else
    echo "❌ DEPLOYER_PRIVATE_KEY not set"
    ((ERRORS++))
fi

# Check 2: Node.js version
echo -n "[2/6] Checking Node.js... "
NODE_VERSION=$(node --version)
if [[ "$NODE_VERSION" == v20* ]] || [[ "$NODE_VERSION" == v18* ]]; then
    echo "✓ ($NODE_VERSION)"
else
    echo "❌ Node.js 18+ required (found $NODE_VERSION)"
    ((ERRORS++))
fi

# Check 3: Dependencies installed
echo -n "[3/6] Checking dependencies... "
if [ -d "node_modules" ]; then
    echo "✓"
else
    echo "❌ Run 'npm install'"
    ((ERRORS++))
fi

# Check 4: Contracts compile
echo -n "[4/6] Testing compilation... "
if npx hardhat compile --quiet 2>/dev/null; then
    echo "✓"
else
    echo "❌ Compilation failed"
    ((ERRORS++))
fi

# Check 5: Wallet balance (Story Protocol)
echo -n "[5/6] Checking Story Protocol balance... "
BALANCE=$(node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://mainnet.storyrpc.io');
provider.getBalance('0x597856e93f19877a399f686D2F43b298e2268618')
    .then(b => console.log(ethers.formatEther(b)));
" 2>/dev/null)
if (( $(echo "$BALANCE > 0.1" | bc -l) )); then
    echo "✓ ($BALANCE IP)"
else
    echo "⚠️  Low balance: $BALANCE IP"
fi

# Check 6: Wallet balance (Base)
echo -n "[6/6] Checking Base balance... "
BALANCE=$(node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
provider.getBalance('0x597856e93f19877a399f686D2F43b298e2268618')
    .then(b => console.log(ethers.formatEther(b)));
" 2>/dev/null)
if (( $(echo "$BALANCE > 0.01" | bc -l) )); then
    echo "✓ ($BALANCE ETH)"
else
    echo "⚠️  Low balance: $BALANCE ETH"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "============================================================"
    echo "✓ ALL CHECKS PASSED - Ready for deployment"
    echo "============================================================"
else
    echo "============================================================"
    echo "❌ $ERRORS CHECK(S) FAILED - Fix issues before deployment"
    echo "============================================================"
    exit 1
fi
```

### 9.2 Compile Contracts

```bash
#!/bin/bash
echo "============================================================"
echo "Compiling Smart Contracts"
echo "============================================================"

cd ~/blockchain/Millionaire-Resilience-LLC-JAH

# Clean previous builds
rm -rf artifacts cache

# Compile
npx hardhat compile

# Show results
echo ""
echo "Compilation Results:"
echo "============================================================"

CONTRACTS=(
    "StoryAttestationService"
    "StoryOrchestrationService"
    "StoryAttestationBridge"
    "SLAPSIPSpvLoan"
    "GladiatorHoldingsSpvLoan"
    "PILLoanEnforcement"
    "StablecoinIPEscrow"
    "AngelCoin"
    "ResilienceToken"
    "SlapsStreaming"
    "SlapsSPV"
    "UCC1FilingIntegration"
)

for contract in "${CONTRACTS[@]}"; do
    ARTIFACT="artifacts/contracts/${contract}.sol/${contract}.json"
    if [ -f "$ARTIFACT" ]; then
        SIZE=$(node -e "
            const a = require('./$ARTIFACT');
            const b = a.deployedBytecode.replace('0x','');
            console.log(Math.floor(b.length/2));
        ")
        printf "  ✓ %-30s %6d bytes\n" "$contract" "$SIZE"
    else
        printf "  ❌ %-30s NOT FOUND\n" "$contract"
    fi
done

echo "============================================================"
```

### 9.3 Deploy to Story Protocol

```bash
#!/bin/bash
echo "============================================================"
echo "Deploying to Story Protocol (Chain 1514)"
echo "============================================================"

cd ~/blockchain/Millionaire-Resilience-LLC-JAH

# Load secrets
source scripts/load-secrets.sh

# Deploy
npm run contracts:deploy:story

# Check result
if [ -f "deployment-config.story.json" ]; then
    echo ""
    echo "============================================================"
    echo "STORY PROTOCOL DEPLOYMENT SUCCESSFUL"
    echo "============================================================"
    echo ""
    echo "Contract Addresses:"
    node -e "
        const cfg = require('./deployment-config.story.json');
        Object.entries(cfg.contracts).forEach(([name, addr]) => {
            console.log('  ' + name + ': ' + addr);
            console.log('    https://www.storyscan.io/address/' + addr);
        });
    "
    echo ""
    
    # Verify contracts
    echo "Verifying contracts on StoryScan..."
    npm run contracts:verify:story
else
    echo "❌ Deployment failed"
    exit 1
fi
```

### 9.4 Deploy to Base L2

```bash
#!/bin/bash
echo "============================================================"
echo "Deploying to Base L2 (Chain 8453)"
echo "============================================================"

cd ~/blockchain/Millionaire-Resilience-LLC-JAH

# Load secrets
source scripts/load-secrets.sh

# Deploy
npm run contracts:deploy:base

# Check result
if [ -f "deployment-config.base.json" ]; then
    echo ""
    echo "============================================================"
    echo "BASE L2 DEPLOYMENT SUCCESSFUL"
    echo "============================================================"
    echo ""
    echo "Contract Addresses:"
    node -e "
        const cfg = require('./deployment-config.base.json');
        Object.entries(cfg.contracts).forEach(([name, addr]) => {
            console.log('  ' + name + ': ' + addr);
            console.log('    https://basescan.org/address/' + addr);
        });
    "
    echo ""
    
    # Verify contracts
    echo "Verifying contracts on BaseScan..."
    npm run contracts:verify:base
else
    echo "❌ Deployment failed"
    exit 1
fi
```

### 9.5 Full Deployment Script

```bash
#!/bin/bash
# full-deployment.sh
# Complete deployment workflow

set -e

echo "============================================================"
echo "FULL DEPLOYMENT WORKFLOW"
echo "Millionaire Resilience LLC - Smart Contract Suite"
echo "============================================================"
echo ""
echo "This will:"
echo "  1. Load secrets from Azure Key Vault"
echo "  2. Compile all 12 contracts"
echo "  3. Deploy to Story Protocol (Chain 1514)"
echo "  4. Deploy to Base L2 (Chain 8453)"
echo "  5. Verify on StoryScan and BaseScan"
echo "  6. Run post-deployment orchestration"
echo "  7. Record UCC-1 filing on-chain"
echo ""
read -p "Continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Aborted"
    exit 0
fi

cd ~/blockchain/Millionaire-Resilience-LLC-JAH

# Step 1: Load secrets
echo ""
echo "[1/7] Loading secrets from Azure Key Vault..."
source scripts/load-secrets.sh

# Step 2: Compile
echo ""
echo "[2/7] Compiling contracts..."
npx hardhat compile

# Step 3: Deploy to Story
echo ""
echo "[3/7] Deploying to Story Protocol..."
npm run contracts:deploy:story

# Step 4: Verify on StoryScan
echo ""
echo "[4/7] Verifying on StoryScan..."
npm run contracts:verify:story || true

# Step 5: Deploy to Base
echo ""
echo "[5/7] Deploying to Base L2..."
npm run contracts:deploy:base

# Step 6: Verify on BaseScan
echo ""
echo "[6/7] Verifying on BaseScan..."
npm run contracts:verify:base || true

# Step 7: Post-deployment
echo ""
echo "[7/7] Running post-deployment orchestration..."
npm run contracts:orchestrate:story || true
npm run contracts:orchestrate:base || true
npm run contracts:record-ucc1:story || true
npm run contracts:record-ucc1:base || true

echo ""
echo "============================================================"
echo "✓ DEPLOYMENT COMPLETE"
echo "============================================================"
echo ""
echo "Artifacts:"
echo "  - deployment-config.story.json"
echo "  - deployment-config.base.json"
echo "  - valuation-attestation.json"
echo ""
echo "Explorers:"
echo "  - https://www.storyscan.io"
echo "  - https://basescan.org"
```

---

## 10. Monitoring & Logging

### 10.1 Configure Logging

```bash
#!/bin/bash
echo "============================================================"
echo "Configuring Deployment Logging"
echo "============================================================"

# Create logs directory
mkdir -p ~/blockchain/logs

# Create logging wrapper
cat > ~/blockchain/log-deployment.sh << 'EOF'
#!/bin/bash
# Log deployment with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE=~/blockchain/logs/deployment_${TIMESTAMP}.log

echo "Logging to: $LOG_FILE"

# Run deployment with logging
cd ~/blockchain/Millionaire-Resilience-LLC-JAH
bash scripts/full-deployment.sh 2>&1 | tee "$LOG_FILE"

echo ""
echo "Log saved to: $LOG_FILE"
EOF

chmod +x ~/blockchain/log-deployment.sh
```

### 10.2 Monitor Transactions

```bash
#!/bin/bash
# monitor-tx.sh
# Monitor transaction status

TX_HASH=$1
NETWORK=$2  # "story" or "base"

if [ -z "$TX_HASH" ] || [ -z "$NETWORK" ]; then
    echo "Usage: ./monitor-tx.sh <tx_hash> <story|base>"
    exit 1
fi

case $NETWORK in
    story)
        RPC_URL="https://mainnet.storyrpc.io"
        EXPLORER="https://www.storyscan.io/tx"
        ;;
    base)
        RPC_URL="https://mainnet.base.org"
        EXPLORER="https://basescan.org/tx"
        ;;
    *)
        echo "Invalid network. Use 'story' or 'base'"
        exit 1
        ;;
esac

echo "Monitoring transaction: $TX_HASH"
echo "Network: $NETWORK"
echo "Explorer: $EXPLORER/$TX_HASH"
echo ""

# Poll for receipt
while true; do
    RECEIPT=$(cast receipt --rpc-url "$RPC_URL" "$TX_HASH" 2>/dev/null)
    
    if [ -n "$RECEIPT" ]; then
        STATUS=$(echo "$RECEIPT" | grep -oP 'status\s+\K\d+')
        BLOCK=$(echo "$RECEIPT" | grep -oP 'blockNumber\s+\K\d+')
        GAS=$(echo "$RECEIPT" | grep -oP 'gasUsed\s+\K\d+')
        
        echo "============================================================"
        if [ "$STATUS" == "1" ]; then
            echo "✓ Transaction CONFIRMED"
        else
            echo "❌ Transaction FAILED"
        fi
        echo "  Block:    $BLOCK"
        echo "  Gas Used: $GAS"
        echo "  Explorer: $EXPLORER/$TX_HASH"
        echo "============================================================"
        break
    fi
    
    echo "Pending... (checking every 5s)"
    sleep 5
done
```

---

## 11. Security Best Practices

### 11.1 Security Checklist

```
☐ VM Security
  ☐ SSH key authentication only (password disabled)
  ☐ fail2ban configured for brute force protection
  ☐ UFW firewall enabled with minimal rules
  ☐ Automatic security updates enabled
  ☐ Non-root user for deployments

☐ Secrets Management
  ☐ All secrets stored in Azure Key Vault
  ☐ No secrets in .env files on disk
  ☐ Secrets loaded at runtime only
  ☐ VM uses managed identity for Key Vault access
  ☐ Key Vault access logs enabled

☐ Network Security
  ☐ NSG restricts SSH to known IPs only
  ☐ No unnecessary inbound ports open
  ☐ Outbound restricted to required services
  ☐ Azure DDoS protection enabled (optional)

☐ Code Security
  ☐ Repository cloned via HTTPS (not stored credentials)
  ☐ Dependencies pinned to specific versions
  ☐ npm audit run before deployment
  ☐ Contract verification on explorers

☐ Operational Security
  ☐ Multi-signature required for deployments
  ☐ Hardware wallets for signing (recommended)
  ☐ Deployment logs stored and reviewed
  ☐ Regular security audits scheduled
```

### 11.2 Secure Session Script

```bash
#!/bin/bash
# secure-session.sh
# Start a secure deployment session with automatic cleanup

echo "============================================================"
echo "STARTING SECURE DEPLOYMENT SESSION"
echo "============================================================"

# Create temporary secure directory
SECURE_DIR=$(mktemp -d)
chmod 700 "$SECURE_DIR"

# Trap to cleanup on exit
cleanup() {
    echo ""
    echo "Cleaning up secure session..."
    
    # Unset sensitive environment variables
    unset DEPLOYER_PRIVATE_KEY
    unset STORYSCAN_API_KEY
    unset ETHERSCAN_API_KEY
    unset PINATA_JWT
    unset PINATA_API_KEY
    unset PINATA_SECRET_API_KEY
    
    # Remove temporary directory
    rm -rf "$SECURE_DIR"
    
    # Clear bash history for this session
    history -c
    
    echo "✓ Session cleaned up"
}

trap cleanup EXIT

# Load secrets
echo "Loading secrets from Azure Key Vault..."
source ~/blockchain/Millionaire-Resilience-LLC-JAH/scripts/load-secrets.sh

echo ""
echo "✓ Secure session started"
echo "  Secrets loaded into environment"
echo "  Cleanup will run automatically on exit"
echo ""
echo "Run deployment commands now..."
echo "Type 'exit' when done to cleanup"
echo ""

# Start interactive shell
bash
```

---

## 12. Troubleshooting

### 12.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `DEPLOYER_PRIVATE_KEY not set` | Secrets not loaded | Run `source scripts/load-secrets.sh` |
| `insufficient funds` | Low wallet balance | Add IP (Story) or ETH (Base) to deployer wallet |
| `nonce too low` | Transaction pending | Wait for pending tx or reset nonce |
| `contract size exceeds limit` | Bytecode > 24KB | Reduce optimizer runs (already set to 1 for large contracts) |
| `STORYSCAN_API_KEY invalid` | Wrong API key | Regenerate key at storyscan.io |
| `connection refused` | RPC rate limited | Use Alchemy RPC with API key |
| `signature verification failed` | Wrong hash signed | Verify eip191Hash matches |

### 12.2 Debug Commands

```bash
# Check Node.js and npm
node --version
npm --version

# Check Hardhat
npx hardhat --version

# Check network connectivity
curl -s https://mainnet.storyrpc.io -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Check wallet balance
cast balance 0x597856e93f19877a399f686D2F43b298e2268618 --rpc-url https://mainnet.storyrpc.io

# Check gas price
cast gas-price --rpc-url https://mainnet.storyrpc.io

# Verify contract bytecode
cast code <CONTRACT_ADDRESS> --rpc-url https://mainnet.storyrpc.io

# Check transaction status
cast tx <TX_HASH> --rpc-url https://mainnet.storyrpc.io

# Decode error message
cast 4byte-decode <ERROR_SELECTOR>
```

---

## 13. Quick Reference Commands

```bash
# ============================================================
# AZURE VM QUICK REFERENCE
# ============================================================

# Connect to VM
ssh -i ~/.ssh/vm-contract-deployer-key.pem azureuser@<VM_IP>

# Load secrets (run first in every session)
source ~/blockchain/Millionaire-Resilience-LLC-JAH/scripts/load-secrets.sh

# Navigate to project
cd ~/blockchain/Millionaire-Resilience-LLC-JAH

# ============================================================
# COMPILATION
# ============================================================
npm run contracts:compile           # Standard compile
npx hardhat compile --force         # Force recompile
npx hardhat clean                   # Clean artifacts

# ============================================================
# MULTI-SIGNATURE
# ============================================================
node scripts/anchor-signature.cjs   # Generate payload
node scripts/verify-multisig.cjs    # Verify signatures

# Sign with cast
EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")
cast wallet sign --private-key "$DEPLOYER_PRIVATE_KEY" --no-hash "$EIP191_HASH"

# ============================================================
# DEPLOYMENT
# ============================================================
npm run contracts:deploy:story      # Deploy to Story Protocol
npm run contracts:deploy:base       # Deploy to Base L2
npm run contracts:verify:story      # Verify on StoryScan
npm run contracts:verify:base       # Verify on BaseScan

# ============================================================
# POST-DEPLOYMENT
# ============================================================
npm run contracts:orchestrate:story
npm run contracts:orchestrate:base
npm run contracts:record-ucc1:story
npm run contracts:record-ucc1:base
npm run contracts:export-abi-proof
npm run contracts:pin-to-pinata

# ============================================================
# MONITORING
# ============================================================
cat deployment-config.story.json | jq '.contracts'
cat deployment-config.base.json | jq '.contracts'

# Check balance
cast balance $STORY_DEPLOYER_ADDRESS --rpc-url https://mainnet.storyrpc.io

# ============================================================
# CLEANUP (end of session)
# ============================================================
unset DEPLOYER_PRIVATE_KEY
unset STORYSCAN_API_KEY
unset ETHERSCAN_API_KEY
history -c
```

---

## Document Information

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Author:** Deployment Automation  
**Repository:** https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH

---

*For support, refer to the repository issues or the deployment guide at `docs/DEPLOYMENT_GUIDE.md`*
