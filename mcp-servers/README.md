# MCP Servers for Blockchain Deployment
## Millionaire Resilience LLC - Azure VM Integration

This directory contains Model Context Protocol (MCP) servers for automating smart contract deployment to Story Protocol and Base L2.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP SERVER ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌──────────────────────────────────┐   │
│  │   AI Assistant  │───▶│         MCP SERVERS              │   │
│  │   (Claude/GPT)  │    │                                  │   │
│  └─────────────────┘    │  ┌──────────────────────────┐   │   │
│                         │  │  blockchain-deployer     │   │   │
│                         │  │  - Compile contracts     │   │   │
│                         │  │  - Deploy to Story/Base  │   │   │
│                         │  │  - Check balances        │   │   │
│                         │  └──────────────────────────┘   │   │
│                         │                                  │   │
│                         │  ┌──────────────────────────┐   │   │
│                         │  │  azure-keyvault          │   │   │
│                         │  │  - Load secrets          │   │   │
│                         │  │  - Manage credentials    │   │   │
│                         │  └──────────────────────────┘   │   │
│                         │                                  │   │
│                         │  ┌──────────────────────────┐   │   │
│                         │  │  contract-verifier       │   │   │
│                         │  │  - Verify on StoryScan   │   │   │
│                         │  │  - Verify on BaseScan    │   │   │
│                         │  └──────────────────────────┘   │   │
│                         │                                  │   │
│                         │  ┌──────────────────────────┐   │   │
│                         │  │  multisig-manager        │   │   │
│                         │  │  - Generate payload      │   │   │
│                         │  │  - Verify 2/2 sigs       │   │   │
│                         │  └──────────────────────────┘   │   │
│                         │                                  │   │
│                         │  ┌──────────────────────────┐   │   │
│                         │  │  ipfs-pinata             │   │   │
│                         │  │  - Pin UCC-1 docs        │   │   │
│                         │  │  - Pin ABI proofs        │   │   │
│                         │  └──────────────────────────┘   │   │
│                         │                                  │   │
│                         └──────────────────────────────────┘   │
│                                      │                          │
│                                      ▼                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    EXTERNAL SERVICES                     │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │   │
│  │  │  Story   │  │   Base   │  │  Azure   │  │ Pinata  │ │   │
│  │  │ Protocol │  │    L2    │  │ KeyVault │  │  IPFS   │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd mcp-servers
npm install
```

### 2. Configure Environment

Create `.env` in the mcp-servers directory:

```bash
# Azure Key Vault
AZURE_KEY_VAULT_NAME=kv-blockchain-deploy

# Project path
PROJECT_ROOT=/home/azureuser/blockchain/Millionaire-Resilience-LLC-JAH

# Network RPC URLs
STORY_RPC_URL=https://mainnet.storyrpc.io
BASE_RPC_URL=https://mainnet.base.org

# Wallet addresses
STORY_DEPLOYER_ADDRESS=0x597856e93f19877a399f686D2F43b298e2268618
COINBASE_WALLET_ADDRESS=0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a

# Pinata
PINATA_GATEWAY=https://lavender-neat-urial-76.mypinata.cloud
```

### 3. Add to MCP Configuration

Copy `mcp-config.json` to your MCP client configuration:

```json
{
  "mcpServers": {
    "blockchain-deployer": {
      "command": "node",
      "args": ["/path/to/mcp-servers/blockchain-deployer/index.js"]
    }
  }
}
```

---

## Available Servers

### 1. Blockchain Deployer (`blockchain-deployer`)

Compile and deploy smart contracts to Story Protocol and Base L2.

**Tools:**

| Tool | Description |
|------|-------------|
| `compile_contracts` | Compile with Hardhat/Foundry |
| `deploy_to_story` | Deploy to Story Protocol (1514) |
| `deploy_to_base` | Deploy to Base L2 (8453) |
| `get_deployment_status` | Check deployed addresses |
| `estimate_gas` | Estimate deployment costs |
| `check_wallet_balance` | Check deployer balance |

**Example Usage:**
```
User: Compile all contracts and check if they're ready for deployment
AI: [calls compile_contracts] [calls check_wallet_balance]
```

---

### 2. Azure Key Vault (`azure-keyvault`)

Securely load deployment credentials from Azure Key Vault.

**Tools:**

| Tool | Description |
|------|-------------|
| `load_deployment_secrets` | Load all secrets to env |
| `get_secret` | Get a specific secret |
| `list_secrets` | List available secrets |
| `check_keyvault_connection` | Verify connectivity |

**Example Usage:**
```
User: Load the deployment credentials
AI: [calls load_deployment_secrets]
```

---

### 3. Contract Verifier (`contract-verifier`)

Verify deployed contracts on StoryScan and BaseScan.

**Tools:**

| Tool | Description |
|------|-------------|
| `verify_on_storyscan` | Verify on StoryScan |
| `verify_on_basescan` | Verify on BaseScan |
| `check_verification_status` | Check if verified |
| `verify_all_contracts` | Verify all deployed |

**Example Usage:**
```
User: Verify the AngelCoin contract on BaseScan
AI: [calls verify_on_basescan with contractAddress and contractName]
```

---

### 4. Multi-Sig Manager (`multisig-manager`)

Manage 2/2 multi-signature verification for Morpho Protocol.

**Tools:**

| Tool | Description |
|------|-------------|
| `generate_signature_payload` | Create EIP-191 hash |
| `verify_signature` | Verify single signature |
| `verify_multisig` | Verify 2/2 requirement |
| `add_signature` | Add wallet signature |
| `sign_with_private_key` | Sign with deployer key |

**Example Usage:**
```
User: Generate the signature payload for the UCC-1 filing
AI: [calls generate_signature_payload]
    Hash to sign: 0x43ebfc7d0c89240d220e6ddecca21c295ed529f6be2d8cb1d802b6305b416189
```

---

### 5. IPFS Pinata (`ipfs-pinata`)

Pin documents and proofs to IPFS via Pinata.

**Tools:**

| Tool | Description |
|------|-------------|
| `pin_json` | Pin JSON to IPFS |
| `pin_file` | Pin file to IPFS |
| `pin_abi_proof` | Generate & pin ABI proof |
| `list_pins` | List pinned content |
| `get_gateway_url` | Get IPFS gateway URL |

**Example Usage:**
```
User: Pin the ABI proof to IPFS
AI: [calls pin_abi_proof]
    CID: bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay
```

---

## Deployment Workflow

### Complete Deployment via MCP

```
Step 1: Load Secrets
  AI: [calls azure-keyvault.load_deployment_secrets]

Step 2: Compile Contracts
  AI: [calls blockchain-deployer.compile_contracts]

Step 3: Generate Multi-Sig Payload
  AI: [calls multisig-manager.generate_signature_payload]
  → User signs with both wallets on MyEtherWallet

Step 4: Add Signatures
  AI: [calls multisig-manager.add_signature for each wallet]

Step 5: Verify Multi-Sig
  AI: [calls multisig-manager.verify_multisig]
  → Must show 2/2 verified

Step 6: Deploy to Story Protocol
  AI: [calls blockchain-deployer.deploy_to_story]

Step 7: Deploy to Base L2
  AI: [calls blockchain-deployer.deploy_to_base]

Step 8: Verify Contracts
  AI: [calls contract-verifier.verify_all_contracts for each network]

Step 9: Pin ABI Proof
  AI: [calls ipfs-pinata.pin_abi_proof]
```

---

## Running Servers Manually

```bash
# Start individual servers
npm run start:deployer
npm run start:keyvault
npm run start:verifier
npm run start:multisig
npm run start:ipfs
```

---

## Security Notes

1. **Never commit secrets** - All sensitive data comes from Azure Key Vault
2. **Use managed identity** - VM should use managed identity for Key Vault access
3. **Private keys stay in memory** - Loaded at runtime, not stored on disk
4. **Multi-sig required** - 2/2 signatures needed for mainnet deployment

---

## Network Configuration

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| Story Protocol | 1514 | https://mainnet.storyrpc.io | https://www.storyscan.io |
| Base L2 | 8453 | https://mainnet.base.org | https://basescan.org |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `DEPLOYER_PRIVATE_KEY not set` | Call `load_deployment_secrets` first |
| `Key Vault connection failed` | Check VM managed identity permissions |
| `Insufficient balance` | Add IP (Story) or ETH (Base) to deployer wallet |
| `Signature verification failed` | Ensure correct hash was signed |

---

## Related Documentation

- [Azure VM Configuration Guide](../docs/AZURE_VM_CONFIGURATION_GUIDE.md)
- [CI/CD Pipeline Guide](../docs/AZURE_CICD_PIPELINE_GUIDE.md)
- [MyEtherWallet Signing Workflow](../docs/MYETHERWALLET_SIGNING_WORKFLOW.md)
