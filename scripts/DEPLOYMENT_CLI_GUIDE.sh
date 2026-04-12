#!/bin/bash
# ============================================================================
# MILLIONAIRE RESILIENCE LLC - SMART CONTRACT DEPLOYMENT CLI GUIDE
# Repository: slaps6331-cell/Millionaire-Resilience-LLC-JAH
# ============================================================================
#
# This script provides structured CLI commands for:
#   1. Environment Setup (Azure VM / Local)
#   2. Multi-Signature Verification with Morpho Protocol
#   3. UCC-1 Filing Integration
#   4. Smart Contract Compilation
#   5. Deployment to StoryScan (Story Protocol) and BaseScan (Base L2)
#
# USAGE: Source this file or run individual sections
#   source scripts/DEPLOYMENT_CLI_GUIDE.sh
#
# ============================================================================

# ============================================================================
# SECTION 0: BASH INPUT RULES REFERENCE
# ============================================================================
#
# SPACES:
#   - Spaces separate arguments
#   - Wrap values with spaces in quotes: echo "Hello World"
#
# QUOTES:
#   - Single quotes ': Preserve literal value (no expansion)
#   - Double quotes ": Allow variable expansion
#
# VARIABLES:
#   - Assign without spaces: NAME="value"
#   - Reference with $: echo "$NAME"
#   - Use {} for clarity: echo "${NAME}_suffix"
#
# SECRETS:
#   - Never hardcode in scripts
#   - Use environment variables or Key Vault
#   - Set file permissions: chmod 600 .env
#
# ============================================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# ============================================================================
# SECTION 1: CONFIGURATION MAP
# ============================================================================

# Network Configuration
declare -A NETWORKS
NETWORKS=(
    ["story_name"]="Story Mainnet"
    ["story_rpc"]="https://mainnet.storyrpc.io"
    ["story_chain_id"]="1514"
    ["story_symbol"]="IP"
    ["story_explorer"]="https://www.storyscan.io"
    ["story_api"]="https://www.storyscan.io/api"
    
    ["base_name"]="Base Mainnet"
    ["base_rpc"]="https://mainnet.base.org"
    ["base_chain_id"]="8453"
    ["base_symbol"]="ETH"
    ["base_explorer"]="https://basescan.org"
    ["base_api"]="https://api.basescan.org/api"
)

# Wallet Configuration
declare -A WALLETS
WALLETS=(
    ["story_deployer"]="0x597856e93f19877a399f686D2F43b298e2268618"
    ["coinbase_wallet"]="0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"
    ["morpho_blue"]="0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"
    ["base_usdc"]="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
)

# Contract List (12 contracts)
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

# UCC-1 Filing Configuration
declare -A UCC1
UCC1=(
    ["filing_number"]="20260000078753"
    ["jurisdiction"]="New Mexico Secretary of State"
    ["ipfs_cid"]="bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a"
    ["auxiliary_docs"]="bafybeidkp74w2idrwkg2qey66uepfaes5ekonxjqt62uztyxawii7yye7y"
    ["financing_statement"]="bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu"
)

# Morpho Protocol Loan Configuration
declare -A MORPHO_LOANS
MORPHO_LOANS=(
    ["btc_principal"]="5000000"
    ["btc_apr"]="400"
    ["eth_principal"]="1000000"
    ["eth_apr"]="600"
    ["lltv"]="860000000000000000"
)

# ============================================================================
# SECTION 2: ENVIRONMENT SETUP
# ============================================================================

setup_environment() {
    echo "============================================================"
    echo "STEP 1: Environment Setup"
    echo "============================================================"
    
    # Update system (Ubuntu/Debian)
    sudo apt update && sudo apt upgrade -y
    
    # Install Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs build-essential git
    
    # Verify installation
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    
    # Install global tools
    npm install -g npx hardhat
    
    echo "✓ Environment setup complete"
}

# ============================================================================
# SECTION 3: REPOSITORY SETUP
# ============================================================================

setup_repository() {
    echo "============================================================"
    echo "STEP 2: Repository Setup"
    echo "============================================================"
    
    # Clone repository
    git clone https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
    cd Millionaire-Resilience-LLC-JAH
    
    # Install dependencies
    npm install --legacy-peer-deps
    
    # Create .env file from template
    if [ ! -f .env ]; then
        cp .env.example .env
        chmod 600 .env
        echo "⚠️  Edit .env file with your secrets before proceeding"
    fi
    
    echo "✓ Repository setup complete"
}

# ============================================================================
# SECTION 4: SECRETS CONFIGURATION
# ============================================================================

configure_secrets() {
    echo "============================================================"
    echo "STEP 3: Secrets Configuration"
    echo "============================================================"
    
    # Option A: Load from Azure Key Vault (recommended for Azure VM)
    load_from_azure_keyvault() {
        export DEPLOYER_PRIVATE_KEY=$(az keyvault secret show \
            --vault-name "YourVaultName" \
            --name "DEPLOYER-PRIVATE-KEY" \
            --query value -o tsv)
        
        export STORYSCAN_API_KEY=$(az keyvault secret show \
            --vault-name "YourVaultName" \
            --name "STORYSCAN-API-KEY" \
            --query value -o tsv)
        
        export ETHERSCAN_API_KEY=$(az keyvault secret show \
            --vault-name "YourVaultName" \
            --name "ETHERSCAN-API-KEY" \
            --query value -o tsv)
        
        export PINATA_JWT=$(az keyvault secret show \
            --vault-name "YourVaultName" \
            --name "PINATA-JWT" \
            --query value -o tsv)
    }
    
    # Option B: Load from .env file (local development)
    load_from_env_file() {
        if [ -f .env ]; then
            set -a
            source .env
            set +a
            echo "✓ Loaded secrets from .env"
        else
            echo "❌ .env file not found"
            exit 1
        fi
    }
    
    # Option C: Export directly (NOT RECOMMENDED - for testing only)
    # export DEPLOYER_PRIVATE_KEY="0x..."
    
    echo "Choose secrets source:"
    echo "  1. Azure Key Vault"
    echo "  2. .env file"
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        1) load_from_azure_keyvault ;;
        2) load_from_env_file ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac
}

# ============================================================================
# SECTION 5: MULTI-SIGNATURE VERIFICATION (MORPHO PROTOCOL)
# ============================================================================

generate_signature_payload() {
    echo "============================================================"
    echo "STEP 4: Generate Multi-Sig Signature Payload"
    echo "============================================================"
    
    # Generate the EIP-191 hash for signing
    node scripts/anchor-signature.cjs
    
    # Display the hash to sign
    EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")
    
    echo ""
    echo "============================================================"
    echo "HASH TO SIGN (copy this for MyEtherWallet):"
    echo "============================================================"
    echo ""
    echo "  $EIP191_HASH"
    echo ""
    echo "============================================================"
    echo ""
    echo "Required Signers:"
    echo "  1. Story Deployer: ${WALLETS[story_deployer]}"
    echo "  2. Coinbase Wallet: ${WALLETS[coinbase_wallet]}"
    echo ""
}

sign_with_private_key() {
    echo "============================================================"
    echo "STEP 5: Sign with Private Key (CLI Method)"
    echo "============================================================"
    
    # Get the hash to sign
    local EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")
    
    # Sign with Story Deployer (requires DEPLOYER_PRIVATE_KEY in env)
    if [ -n "$DEPLOYER_PRIVATE_KEY" ]; then
        echo "Signing with Story Deployer wallet..."
        
        # Using ethers.js for signing
        STORY_SIGNATURE=$(node -e "
            const { ethers } = require('ethers');
            const wallet = new ethers.Wallet('$DEPLOYER_PRIVATE_KEY');
            const hash = '$EIP191_HASH';
            wallet.signMessage(ethers.getBytes(hash)).then(sig => console.log(sig));
        ")
        
        echo "Story Deployer Signature: $STORY_SIGNATURE"
    else
        echo "⚠️  DEPLOYER_PRIVATE_KEY not set - use MyEtherWallet for GUI signing"
    fi
}

# Alternative: Sign using cast (Foundry)
sign_with_cast() {
    echo "============================================================"
    echo "Sign with Foundry cast (Alternative Method)"
    echo "============================================================"
    
    # Install Foundry if not present
    if ! command -v cast &> /dev/null; then
        curl -L https://foundry.paradigm.xyz | bash
        foundryup
    fi
    
    local EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")
    
    # Sign with --no-hash flag (hash is already EIP-191 prefixed)
    cast wallet sign \
        --private-key "$DEPLOYER_PRIVATE_KEY" \
        --no-hash \
        "$EIP191_HASH"
}

verify_multisig() {
    echo "============================================================"
    echo "STEP 6: Verify Multi-Sig Signatures"
    echo "============================================================"
    
    # Run verification script
    node scripts/verify-multisig.cjs
    
    if [ $? -eq 0 ]; then
        echo "✓ 2/2 signatures verified - ready for deployment"
    else
        echo "❌ Signature verification failed"
        exit 1
    fi
}

# ============================================================================
# SECTION 6: SMART CONTRACT COMPILATION
# ============================================================================

compile_contracts() {
    echo "============================================================"
    echo "STEP 7: Compile Smart Contracts"
    echo "============================================================"
    
    # Clean previous artifacts
    rm -rf artifacts cache
    
    # Compile with Hardhat
    npx hardhat compile
    
    # Verify compilation output
    echo ""
    echo "Compiled Contracts:"
    for contract in "${CONTRACTS[@]}"; do
        ARTIFACT="artifacts/contracts/${contract}.sol/${contract}.json"
        if [ -f "$ARTIFACT" ]; then
            SIZE=$(node -e "
                const a = require('./$ARTIFACT');
                const b = a.deployedBytecode.replace('0x','');
                console.log(Math.floor(b.length/2));
            ")
            echo "  ✓ ${contract}: ${SIZE} bytes"
        else
            echo "  ❌ ${contract}: NOT FOUND"
        fi
    done
    
    echo ""
    echo "✓ Compilation complete"
}

# Force recompile (clears cache)
force_compile() {
    npx hardhat compile --force
}

# ============================================================================
# SECTION 7: DEPLOYMENT TO STORY PROTOCOL (STORYSCAN)
# ============================================================================

deploy_to_story() {
    echo "============================================================"
    echo "STEP 8: Deploy to Story Protocol (Chain 1514)"
    echo "============================================================"
    
    # Verify environment
    if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
        echo "❌ DEPLOYER_PRIVATE_KEY not set"
        exit 1
    fi
    
    # Check deployer balance
    echo "Checking deployer balance on Story Protocol..."
    BALANCE=$(node -e "
        const { ethers } = require('ethers');
        const provider = new ethers.JsonRpcProvider('${NETWORKS[story_rpc]}');
        provider.getBalance('${WALLETS[story_deployer]}').then(b => 
            console.log(ethers.formatEther(b) + ' IP')
        );
    ")
    echo "Balance: $BALANCE"
    
    # Deploy contracts
    echo "Deploying contracts to Story Protocol..."
    npx hardhat run scripts/deploy.cjs --network story
    
    # Check deployment output
    if [ -f "deployment-config.story.json" ]; then
        echo ""
        echo "Deployed Contract Addresses:"
        node -e "
            const cfg = require('./deployment-config.story.json');
            Object.entries(cfg.contracts).forEach(([name, addr]) => {
                console.log('  ' + name + ': ' + addr);
            });
        "
        echo ""
        echo "✓ Story Protocol deployment complete"
    else
        echo "❌ Deployment failed - check logs"
        exit 1
    fi
}

verify_on_storyscan() {
    echo "============================================================"
    echo "STEP 9: Verify Contracts on StoryScan"
    echo "============================================================"
    
    if [ -z "$STORYSCAN_API_KEY" ]; then
        echo "⚠️  STORYSCAN_API_KEY not set - skipping verification"
        return
    fi
    
    npx hardhat run scripts/verify.cjs --network story
    
    echo "✓ StoryScan verification complete"
    echo "View contracts: ${NETWORKS[story_explorer]}"
}

# ============================================================================
# SECTION 8: DEPLOYMENT TO BASE L2 (BASESCAN)
# ============================================================================

deploy_to_base() {
    echo "============================================================"
    echo "STEP 10: Deploy to Base L2 (Chain 8453)"
    echo "============================================================"
    
    # Verify environment
    if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
        echo "❌ DEPLOYER_PRIVATE_KEY not set"
        exit 1
    fi
    
    # Check deployer balance
    echo "Checking deployer balance on Base..."
    BALANCE=$(node -e "
        const { ethers } = require('ethers');
        const provider = new ethers.JsonRpcProvider('${NETWORKS[base_rpc]}');
        provider.getBalance('${WALLETS[story_deployer]}').then(b => 
            console.log(ethers.formatEther(b) + ' ETH')
        );
    ")
    echo "Balance: $BALANCE"
    
    # Deploy contracts
    echo "Deploying contracts to Base L2..."
    npx hardhat run scripts/deploy.cjs --network base
    
    # Check deployment output
    if [ -f "deployment-config.base.json" ]; then
        echo ""
        echo "Deployed Contract Addresses:"
        node -e "
            const cfg = require('./deployment-config.base.json');
            Object.entries(cfg.contracts).forEach(([name, addr]) => {
                console.log('  ' + name + ': ' + addr);
            });
        "
        echo ""
        echo "✓ Base L2 deployment complete"
    else
        echo "❌ Deployment failed - check logs"
        exit 1
    fi
}

verify_on_basescan() {
    echo "============================================================"
    echo "STEP 11: Verify Contracts on BaseScan"
    echo "============================================================"
    
    if [ -z "$ETHERSCAN_API_KEY" ]; then
        echo "⚠️  ETHERSCAN_API_KEY not set - skipping verification"
        return
    fi
    
    npx hardhat run scripts/verify.cjs --network base
    
    echo "✓ BaseScan verification complete"
    echo "View contracts: ${NETWORKS[base_explorer]}"
}

# ============================================================================
# SECTION 9: POST-DEPLOYMENT ORCHESTRATION
# ============================================================================

run_post_deployment() {
    echo "============================================================"
    echo "STEP 12: Post-Deployment Orchestration"
    echo "============================================================"
    
    # Generate attestation hashes
    echo "Generating valuation attestation hashes..."
    npm run contracts:attestation-hashes
    
    # Story Protocol orchestration
    echo "Running Story Protocol orchestration..."
    npx hardhat run scripts/post-deploy-orchestrate.cjs --network story
    
    # Base L2 orchestration
    echo "Running Base L2 orchestration..."
    npx hardhat run scripts/post-deploy-orchestrate.cjs --network base
    
    # Record UCC-1 filing
    echo "Recording UCC-1 filing on-chain..."
    npm run contracts:record-ucc1:story
    npm run contracts:record-ucc1:base
    
    echo "✓ Post-deployment orchestration complete"
}

# ============================================================================
# SECTION 10: UCC-1 FILING INTEGRATION
# ============================================================================

pin_ucc1_to_ipfs() {
    echo "============================================================"
    echo "STEP 13: Pin UCC-1 Documents to IPFS (Pinata)"
    echo "============================================================"
    
    if [ -z "$PINATA_JWT" ] && [ -z "$PINATA_API_KEY" ]; then
        echo "⚠️  Pinata credentials not set - skipping IPFS upload"
        return
    fi
    
    # Pin UCC-1 collateral document
    curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $PINATA_JWT" \
        -d @documents/ucc1-filing-collateral.json
    
    echo "✓ UCC-1 documents pinned to IPFS"
}

export_abi_proof() {
    echo "============================================================"
    echo "STEP 14: Export ABI Bytecode Proof"
    echo "============================================================"
    
    node scripts/export-abi-proof.cjs
    
    if [ -f "abi-proof.json" ]; then
        echo "✓ ABI proof exported to abi-proof.json"
        
        # Pin to IPFS
        if [ -n "$PINATA_JWT" ]; then
            echo "Pinning ABI proof to IPFS..."
            npm run contracts:pin-to-pinata
        fi
    fi
}

# ============================================================================
# SECTION 11: MORPHO PROTOCOL MARKET CREATION
# ============================================================================

create_morpho_markets() {
    echo "============================================================"
    echo "STEP 15: Create Morpho Blue Markets"
    echo "============================================================"
    
    echo "Morpho Blue Contract: ${WALLETS[morpho_blue]}"
    echo ""
    echo "Market 1 (BTC Collateral):"
    echo "  Principal: \$${MORPHO_LOANS[btc_principal]} USDC"
    echo "  APR: ${MORPHO_LOANS[btc_apr]} bps (4.00%)"
    echo "  LLTV: 86%"
    echo ""
    echo "Market 2 (ETH Collateral):"
    echo "  Principal: \$${MORPHO_LOANS[eth_principal]} USDC"
    echo "  APR: ${MORPHO_LOANS[eth_apr]} bps (6.00%)"
    echo "  LLTV: 86%"
    echo ""
    
    # Markets are created during post-deploy orchestration on Base
    echo "Markets will be created during Base L2 orchestration"
}

# ============================================================================
# SECTION 12: FULL DEPLOYMENT WORKFLOW
# ============================================================================

run_full_deployment() {
    echo "============================================================"
    echo "FULL DEPLOYMENT WORKFLOW"
    echo "============================================================"
    echo ""
    echo "This will execute the complete deployment pipeline:"
    echo "  1. Load secrets"
    echo "  2. Generate multi-sig payload"
    echo "  3. Compile contracts"
    echo "  4. Deploy to Story Protocol"
    echo "  5. Deploy to Base L2"
    echo "  6. Verify on both explorers"
    echo "  7. Run post-deployment orchestration"
    echo "  8. Record UCC-1 filing"
    echo ""
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" != "y" ]; then
        echo "Aborted"
        exit 0
    fi
    
    # Execute workflow
    configure_secrets
    generate_signature_payload
    compile_contracts
    deploy_to_story
    verify_on_storyscan
    deploy_to_base
    verify_on_basescan
    run_post_deployment
    export_abi_proof
    
    echo ""
    echo "============================================================"
    echo "✓ FULL DEPLOYMENT COMPLETE"
    echo "============================================================"
    echo ""
    echo "Deployment Artifacts:"
    echo "  - deployment-config.story.json"
    echo "  - deployment-config.base.json"
    echo "  - valuation-attestation.json"
    echo "  - abi-proof.json"
    echo "  - signature-morpho-config.json"
    echo ""
    echo "Explorers:"
    echo "  - StoryScan: ${NETWORKS[story_explorer]}"
    echo "  - BaseScan: ${NETWORKS[base_explorer]}"
}

# ============================================================================
# SECTION 13: QUICK COMMANDS REFERENCE
# ============================================================================

show_quick_commands() {
    cat << 'EOF'
============================================================
QUICK COMMANDS REFERENCE
============================================================

# Clone and setup
git clone https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
cd Millionaire-Resilience-LLC-JAH
npm install --legacy-peer-deps

# Load secrets (choose one)
source .env                                    # From .env file
export DEPLOYER_PRIVATE_KEY="0x..."           # Direct export

# Compile contracts
npm run contracts:compile                      # Standard compile
npx hardhat compile --force                    # Force recompile

# Generate multi-sig payload
node scripts/anchor-signature.cjs

# Sign with cast (Foundry)
EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")
cast wallet sign --private-key "$DEPLOYER_PRIVATE_KEY" --no-hash "$EIP191_HASH"

# Verify signatures
node scripts/verify-multisig.cjs

# Deploy to Story Protocol
npm run contracts:deploy:story
npm run contracts:verify:story

# Deploy to Base L2
npm run contracts:deploy:base
npm run contracts:verify:base

# Post-deployment
npm run contracts:orchestrate:story
npm run contracts:orchestrate:base
npm run contracts:record-ucc1:story
npm run contracts:record-ucc1:base

# Export ABI proof
npm run contracts:export-abi-proof
npm run contracts:pin-to-pinata

# Check deployment status
cat deployment-config.story.json | jq '.contracts'
cat deployment-config.base.json | jq '.contracts'

============================================================
EOF
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo "============================================================"
    echo "MILLIONAIRE RESILIENCE LLC - DEPLOYMENT CLI"
    echo "============================================================"
    echo ""
    echo "Select operation:"
    echo "  1. Full deployment workflow"
    echo "  2. Setup environment"
    echo "  3. Configure secrets"
    echo "  4. Generate multi-sig payload"
    echo "  5. Compile contracts"
    echo "  6. Deploy to Story Protocol"
    echo "  7. Deploy to Base L2"
    echo "  8. Verify signatures"
    echo "  9. Post-deployment orchestration"
    echo "  10. Show quick commands"
    echo "  0. Exit"
    echo ""
    read -p "Enter choice: " choice
    
    case $choice in
        1) run_full_deployment ;;
        2) setup_environment ;;
        3) configure_secrets ;;
        4) generate_signature_payload ;;
        5) compile_contracts ;;
        6) deploy_to_story && verify_on_storyscan ;;
        7) deploy_to_base && verify_on_basescan ;;
        8) verify_multisig ;;
        9) run_post_deployment ;;
        10) show_quick_commands ;;
        0) exit 0 ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi
