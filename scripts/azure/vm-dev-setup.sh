#!/bin/bash
# ============================================================================
# VM Development Environment Setup
# Millionaire Resilience LLC
#
# Run this script on the Azure VM (via Bastion) to set up the complete
# development environment for smart contract deployment.
#
# Usage: bash scripts/azure/vm-dev-setup.sh
# ============================================================================

set -e

echo "============================================================"
echo "VM DEVELOPMENT ENVIRONMENT SETUP"
echo "Smart Contract Deployment Tools"
echo "============================================================"

# ============================================================================
# 1. System Update
# ============================================================================
echo ""
echo "[1/8] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# ============================================================================
# 2. Install Essential Tools
# ============================================================================
echo ""
echo "[2/8] Installing essential tools..."
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
    python3 \
    python3-pip \
    python3-venv

# ============================================================================
# 3. Install Node.js 20.x
# ============================================================================
echo ""
echo "[3/8] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install global npm packages
sudo npm install -g npm@latest
sudo npm install -g npx
sudo npm install -g yarn
sudo npm install -g hardhat

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# ============================================================================
# 4. Install Foundry
# ============================================================================
echo ""
echo "[4/8] Installing Foundry..."
curl -L https://foundry.paradigm.xyz | bash

# Add to PATH
echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> ~/.bashrc
export PATH="$HOME/.foundry/bin:$PATH"

# Install Foundry tools
~/.foundry/bin/foundryup

echo "Foundry version: $(~/.foundry/bin/forge --version)"

# ============================================================================
# 5. Install Azure CLI
# ============================================================================
echo ""
echo "[5/8] Installing Azure CLI..."
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

echo "Azure CLI version: $(az --version | head -1)"

# ============================================================================
# 6. Install Security Tools
# ============================================================================
echo ""
echo "[6/8] Installing security tools..."
pip3 install slither-analyzer
pip3 install mythril
sudo npm install -g solhint

# ============================================================================
# 7. Clone Repository
# ============================================================================
echo ""
echo "[7/8] Setting up workspace..."
mkdir -p ~/blockchain
cd ~/blockchain

if [ -d "Millionaire-Resilience-LLC-JAH" ]; then
    echo "Repository already exists, pulling latest..."
    cd Millionaire-Resilience-LLC-JAH
    git pull
else
    echo "Cloning repository..."
    git clone https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
    cd Millionaire-Resilience-LLC-JAH
fi

# Install dependencies
echo "Installing npm dependencies..."
npm install --legacy-peer-deps

# ============================================================================
# 8. Create Convenience Scripts
# ============================================================================
echo ""
echo "[8/8] Creating convenience scripts..."

# Create deployment script
cat > ~/deploy.sh << 'EOF'
#!/bin/bash
# Quick deployment script
cd ~/blockchain/Millionaire-Resilience-LLC-JAH
source scripts/azure/load-keyvault-secrets.sh
echo ""
echo "Ready for deployment. Run:"
echo "  npm run contracts:deploy:story   # Deploy to Story Protocol"
echo "  npm run contracts:deploy:base    # Deploy to Base L2"
EOF
chmod +x ~/deploy.sh

# Create bashrc additions
cat >> ~/.bashrc << 'EOF'

# Blockchain Development Aliases
alias cdbc='cd ~/blockchain/Millionaire-Resilience-LLC-JAH'
alias deploy-story='npm run contracts:deploy:story'
alias deploy-base='npm run contracts:deploy:base'
alias compile='npm run contracts:compile'
alias load-secrets='source scripts/azure/load-keyvault-secrets.sh'

# Foundry PATH
export PATH="$HOME/.foundry/bin:$PATH"
EOF

echo ""
echo "============================================================"
echo "✓ VM SETUP COMPLETE"
echo "============================================================"
echo ""
echo "Installed:"
echo "  - Node.js $(node --version)"
echo "  - npm $(npm --version)"
echo "  - Foundry (forge, cast, anvil)"
echo "  - Azure CLI"
echo "  - Slither, Mythril, Solhint"
echo ""
echo "Repository: ~/blockchain/Millionaire-Resilience-LLC-JAH"
echo ""
echo "Quick Commands:"
echo "  cdbc           - Navigate to project"
echo "  load-secrets   - Load secrets from Key Vault"
echo "  compile        - Compile contracts"
echo "  deploy-story   - Deploy to Story Protocol"
echo "  deploy-base    - Deploy to Base L2"
echo ""
echo "To start deploying:"
echo "  1. source ~/.bashrc"
echo "  2. cdbc"
echo "  3. load-secrets"
echo "  4. compile"
echo "  5. deploy-story"
echo ""
