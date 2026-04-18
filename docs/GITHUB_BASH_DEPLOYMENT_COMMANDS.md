# GitHub CLI & Bash Shell Commands for Blockchain Development Kit Deployment

Quick-reference bash commands for deploying the 12 Millionaire Resilience LLC smart contracts using the GitHub CLI and Azure Blockchain Development Kit.

---

## 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH.git
cd Millionaire-Resilience-LLC-JAH

# Install dependencies
npm install --legacy-peer-deps

# Install Foundry (for cast signing)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli.gpg
echo "deb [signed-by=/usr/share/keyrings/githubcli.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list
sudo apt update && sudo apt install gh

# Authenticate GitHub CLI
gh auth login
```

---

## 2. Configure GitHub Environment Variables

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC-JAH"

# ── Multi-Sig Signer Addresses (Repository Variables) ──
gh variable set MORPHO_MULTISIG_SIGNER_1 --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_2 --body "0x20A8402c67b9D476ddC1D2DB12f03B30A468f135" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_3 --body "0x5EEFF17e12401b6A8391f5257758E07c157E1e45" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_4 --body "0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_5 --body "0xD39447807f18Ba965E8F3F6929c8815794B3C951" --repo $REPO
gh variable set MORPHO_SAFE_ADDRESS --body "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09" --repo $REPO
gh variable set MORPHO_MULTISIG_THRESHOLD --body "3" --repo $REPO

# ── Legacy Aliases ──
gh variable set STORY_DEPLOYER_ADDRESS --body "0x5EEFF17e12401b6A8391f5257758E07c157E1e45" --repo $REPO
gh variable set COINBASE_WALLET_ADDRESS --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a" --repo $REPO

# ── Pinata Gateway ──
gh variable set PINATA_GATEWAY_NAME --body "lavender-neat-urial-76" --repo $REPO

# ── UCC-1 Filing ──
gh variable set UCC1_FINANCING_STATEMENT_CID --body "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu" --repo $REPO
gh variable set UCC1_FILING_NUMBER --body "20260000078753" --repo $REPO

# ── Morpho Protocol ──
gh variable set MORPHO_BLUE --body "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" --repo $REPO
gh variable set BASE_USDC --body "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" --repo $REPO

# ── IPFS Document CIDs ──
gh variable set IPFS_GLADIATOR_CERT_CID --body "bafybeiba2j4g34bizjjm26qznc2pf4upgotffrcwjtkw6lj3qa6squrzpu" --repo $REPO
gh variable set IPFS_GLADIATOR_NOTICE_CID --body "bafkreifbikc26xs2cu2mvsghzlrginwm6icqotdp4ntsvq3sn6h4flrhhm" --repo $REPO
gh variable set IPFS_MR_ARTICLES_CID --body "bafkreifxiesrze736sxhvsa5op64q6f3ddvv3rismnvd75wi3yfqilu4py" --repo $REPO
gh variable set IPFS_MR_EIN_LETTER_CID --body "bafkreihz5zpp33pimzckaey64mht2vezlbzngoxe46urrfctzqvjvsdboe" --repo $REPO
gh variable set IPFS_SLAPS_ARTICLES_CID --body "bafkreic3n6bdf25tobljqbjxzvzkbch6s7xkqq5yehmyt3zju4de7ey52u" --repo $REPO
gh variable set IPFS_SLAPS_EIN_LETTER_CID --body "bafkreifnuwchbvbolmhbgionvsltdi3edzasfqytd4zzqlvu42m5m4jhei" --repo $REPO
gh variable set IPFS_ABI_PROOF_CID --body "bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay" --repo $REPO
```

---

## 3. Configure Secrets

```bash
# ── Global Secrets (prompted for value) ──
gh secret set ALCHEMY_API_KEY --repo $REPO
gh secret set PINATA_API_KEY --repo $REPO
gh secret set PINATA_SECRET_API_KEY --repo $REPO
gh secret set PINATA_JWT --repo $REPO
gh secret set PINATA_GATEWAY_TOKEN --repo $REPO
gh secret set COINBASE_API_KEY_NAME --repo $REPO
gh secret set COINBASE_API_KEY_PRIVATE_KEY --repo $REPO

# ── Per-Environment Secrets ──
gh secret set DEPLOYER_PRIVATE_KEY --env story-mainnet --repo $REPO
gh secret set DEPLOYER_PRIVATE_KEY --env base-mainnet --repo $REPO
gh secret set STORYSCAN_API_KEY --env story-mainnet --repo $REPO
gh secret set ETHERSCAN_API_KEY --env base-mainnet --repo $REPO
```

---

## 4. Compile Contracts

```bash
# Hardhat compilation (all 12 contracts)
npx hardhat compile --force

# Verify compilation output
ls artifacts/contracts/*/
```

---

## 5. EIP-191 Signing (3-of-5)

```bash
# Generate the signing hash
node scripts/anchor-signature.cjs

# Read the EIP-191 hash
EIP191_HASH=$(node -e "console.log(require('./signature-morpho-config.json').eip191Hash)")
echo "Sign this hash with 3 of 5 wallets: $EIP191_HASH"

# Sign using Foundry cast (for each signer with CLI access)
cast wallet sign --private-key "$SIGNER_PRIVATE_KEY" --no-hash "$EIP191_HASH"

# Inject signatures into config
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('signature-morpho-config.json'));
config.signatures.signer1_coinbase = 'PASTE_SIG_HERE';
config.signatures.signer2_morpho = 'PASTE_SIG_HERE';
config.signatures.signer3_story = 'PASTE_SIG_HERE';
fs.writeFileSync('signature-morpho-config.json', JSON.stringify(config, null, 2));
console.log('Done');
"

# Verify signatures (need 3 of 5 to pass)
node scripts/verify-multisig.cjs
```

---

## 6. Deploy Contracts

```bash
# ── Story Protocol Mainnet (Chain 1514) ──
npm run contracts:deploy:story
npm run contracts:verify:story
npm run contracts:orchestrate:story
npm run contracts:record-ucc1:story

# ── Base L2 (Chain 8453) ──
npm run contracts:deploy:base
npm run contracts:verify:base
npm run contracts:orchestrate:base
npm run contracts:record-ucc1:base

# ── Generate attestation hashes ──
npm run contracts:attestation-hashes
```

---

## 7. GitHub Actions Deployment

```bash
# Trigger deployment (both networks)
gh workflow run "Deploy Smart Contracts" \
  --field network=both \
  --field verify=true \
  --field dry_run=false \
  --repo $REPO

# Dry run (compile only)
gh workflow run "Deploy Smart Contracts" \
  --field network=both \
  --field verify=false \
  --field dry_run=true \
  --repo $REPO

# Monitor workflow
gh run list --workflow=deploy-contracts.yml --limit 5 --repo $REPO
gh run watch --repo $REPO

# View workflow logs
gh run view --log --repo $REPO
```

---

## 8. Pin Metadata to Pinata IPFS

```bash
# Pin ABI proof
curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -F "file=@abi-proof.json" \
  -F 'pinataMetadata={"name":"ABI_Proof_12_Contracts"}' \
  | jq '.IpfsHash'

# Pin valuation attestation
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d '{"pinataContent":'"$(cat valuation-attestation.json)"',"pinataMetadata":{"name":"Valuation_Attestation"}}' \
  | jq '.IpfsHash'

# Pin multi-sig config
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d '{"pinataContent":'"$(cat signature-morpho-config.json)"',"pinataMetadata":{"name":"MultiSig_3of5_Config"}}' \
  | jq '.IpfsHash'

# Pin deployment registry (after deployment)
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d '{"pinataContent":'"$(cat deployment-registry.json)"',"pinataMetadata":{"name":"Deployment_Registry"}}' \
  | jq '.IpfsHash'

# Verify pin accessibility
curl -s -o /dev/null -w "%{http_code}" \
  "https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay"
```

---

## 9. GitHub Pages Deployment

```bash
# GitHub Pages serves from /docs on main branch
# Push any docs/ changes to trigger rebuild
git add docs/
git commit -m "docs: update GitHub Pages content"
git push origin main

# Check Pages build status
gh api repos/$REPO/pages --jq '.status'

# View Pages URL
gh api repos/$REPO/pages --jq '.html_url'
```

---

## 10. Verify Everything

```bash
# Check all variables are set
gh variable list --repo $REPO

# Check all secrets are set
gh secret list --repo $REPO

# Check environment secrets
gh secret list --env story-mainnet --repo $REPO
gh secret list --env base-mainnet --repo $REPO

# Check latest workflow run
gh run list --workflow=deploy-contracts.yml --limit 1 --repo $REPO

# Check deployer balance (Story)
cast balance 0x5EEFF17e12401b6A8391f5257758E07c157E1e45 --rpc-url https://mainnet.storyrpc.io

# Check deployer balance (Base)
cast balance 0x5EEFF17e12401b6A8391f5257758E07c157E1e45 --rpc-url https://mainnet.base.org
```
