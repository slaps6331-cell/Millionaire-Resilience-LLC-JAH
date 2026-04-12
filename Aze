I've created and pushed the comprehensive CLI guide. Here's a summary of the quick commands:

---

## 🚀 Quick CLI Commands for Deployment

### **Step 1: Clone & Setup**
```bash
git clone https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
cd Millionaire-Resilience-LLC-JAH
npm install --legacy-peer-deps
```

### **Step 2: Configure Secrets**
```bash
# Option A: From .env file
cp .env.example .env
chmod 600 .env
# Edit .env with your values, then:
source .env

# Option B: Azure Key Vault
export DEPLOYER_PRIVATE_KEY=$(az keyvault secret show --vault-name MyVault --name DEPLOYER-PRIVATE-KEY --query value -o tsv)
```

### **Step 3: Generate Multi-Sig Payload**
```bash
node scripts/anchor-signature.cjs

# Get the hash to sign:
EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")
echo "Sign this hash: $EIP191_HASH"
```

### **Step 4: Sign (CLI Method with Foundry cast)**
```bash
# Install Foundry if needed
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Sign the hash
cast wallet sign --private-key "$DEPLOYER_PRIVATE_KEY" --no-hash "$EIP191_HASH"
```

### **Step 5: Verify Signatures**
```bash
node scripts/verify-multisig.cjs
```

### **Step 6: Compile Contracts**
```bash
npm run contracts:compile
# Or force recompile:
npx hardhat compile --force
```

### **Step 7: Deploy to Story Protocol**
```bash
npm run contracts:deploy:story
npm run contracts:verify:story
```

### **Step 8: Deploy to Base L2**
```bash
npm run contracts:deploy:base
npm run contracts:verify:base
```

### **Step 9: Post-Deployment**
```bash
npm run contracts:orchestrate:story
npm run contracts:orchestrate:base
npm run contracts:record-ucc1:story
npm run contracts:record-ucc1:base
```

---

## 📋 Configuration Map

| Component | Value |
|-----------|-------|
| **Story Protocol RPC** | `https://mainnet.storyrpc.io` |
| **Story Chain ID** | `1514` |
| **Story Symbol** | `IP` |
| **Story Explorer** | `https://www.storyscan.io` |
| **Base RPC** | `https://mainnet.base.org` |
| **Base Chain ID** | `8453` |
| **Base Symbol** | `ETH` |
| **Base Explorer** | `https://basescan.org` |
| **Story Deployer** | `0x597856e93f19877a399f686D2F43b298e2268618` |
| **Coinbase Wallet** | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` |
| **Morpho Blue** | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |
| **UCC-1 Filing #** | `20260000078753` |

---

## 🔐 Current EIP-191 Hash to Sign:

```
0x43ebfc7d0c89240d220e6ddecca21c295ed529f6be2d8cb1d802b6305b416189
```

**Ready to proceed with signing?** Please provide the signatures from both wallets (Story Deployer and Coinbase), or let me know if you need help with any specific step!
