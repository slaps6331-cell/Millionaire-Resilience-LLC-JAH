# GitHub Repository Environment Variables Reference

Complete reference for all environment variables required by the **Millionaire Resilience LLC** smart contract deployment pipeline, Copilot integration, and GitHub Pages.

---

## 1. Multi-Sig Safe Wallet Addresses (3-of-5)

These are **public addresses** — configure as **Repository Variables** (not Secrets).

**Settings > Secrets and variables > Actions > Variables tab > New repository variable**

| Variable Name | Address | Role |
|---|---|---|
| `MORPHO_MULTISIG_SIGNER_1` | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` | Coinbase Wallet |
| `MORPHO_MULTISIG_SIGNER_2` | `0x20A8402c67b9D476ddC1D2DB12f03B30A468f135` | Morpho Authorization |
| `MORPHO_MULTISIG_SIGNER_3` | `0x5EEFF17e12401b6A8391f5257758E07c157E1e45` | Story Protocol Deployer |
| `MORPHO_MULTISIG_SIGNER_4` | `0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A` | Base Authorization |
| `MORPHO_MULTISIG_SIGNER_5` | `0xD39447807f18Ba965E8F3F6929c8815794B3C951` | SPV Custodian |
| `MORPHO_SAFE_ADDRESS` | `0xd314BE0a27c73Cd057308aC4f3dd472c482acc09` | Safe Contract (3-of-5) |
| `MORPHO_MULTISIG_THRESHOLD` | `3` | Approval threshold |

Legacy aliases (backward compatibility):

| Variable Name | Address | Maps To |
|---|---|---|
| `STORY_DEPLOYER_ADDRESS` | `0x5EEFF17e12401b6A8391f5257758E07c157E1e45` | Same as SIGNER_3 |
| `COINBASE_WALLET_ADDRESS` | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` | Same as SIGNER_1 |

---

## 2. Deployment Secrets (Private Keys & API Keys)

Configure as **Repository Secrets** under **each GitHub Environment** (`story-mainnet`, `base-mainnet`, `eth-mainnet`).

**Settings > Environments > [environment] > Add secret**

| Secret Name | Description | Where to Get |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | Ethereum private key (hex, no quotes) | Export from MetaMask / Coinbase Wallet |
| `ALCHEMY_API_KEY` | Alchemy API key for RPC endpoints | https://dashboard.alchemy.com |
| `STORYSCAN_API_KEY` | StoryScan verification API key | https://www.storyscan.io/apis |
| `ETHERSCAN_API_KEY` | Basescan / Etherscan verification key | https://basescan.org/myapikey |

---

## 3. Pinata IPFS Secrets

Configure as **Repository Secrets** (global, not per-environment).

| Secret Name | Description | Where to Get |
|---|---|---|
| `PINATA_API_KEY` | Pinata REST API key | https://app.pinata.cloud/developers/api-keys |
| `PINATA_SECRET_API_KEY` | Pinata REST API secret | Same page as above |
| `PINATA_JWT` | Pinata JWT bearer token | Same page as above |
| `PINATA_GATEWAY_TOKEN` | Private gateway access token | https://app.pinata.cloud/gateway > Manage Tokens |

Configure as **Repository Variable** (not secret):

| Variable Name | Value | Description |
|---|---|---|
| `PINATA_GATEWAY_NAME` | `lavender-neat-urial-76` | Pinata gateway subdomain |

---

## 4. Coinbase Developer Platform (CDP)

| Secret Name | Description | Where to Get |
|---|---|---|
| `COINBASE_API_KEY_NAME` | CDP API key identifier | https://portal.cdp.coinbase.com/access/api |
| `COINBASE_API_KEY_PRIVATE_KEY` | CDP API private key | Same page |

---

## 5. Thirdweb SDK

| Secret Name | Description | Where to Get |
|---|---|---|
| `THIRDWEB_CLIENT_ID` | Thirdweb client ID | https://thirdweb.com/dashboard/settings/api-keys |
| `THIRDWEB_SECRET_KEY` | Thirdweb secret key | Same page |

---

## 6. UCC-1 / Document Variables

Configure as **Repository Variables**:

| Variable Name | Value |
|---|---|
| `UCC1_FINANCING_STATEMENT_CID` | `bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu` |
| `UCC1_FILING_NUMBER` | `20260000078753` |

---

## 7. Morpho Protocol Parameters

Configure as **Repository Variables**:

| Variable Name | Value | Description |
|---|---|---|
| `MORPHO_BLUE` | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` | Morpho Blue core contract |
| `BASE_USDC` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | USDC on Base |
| `BTC_LOAN_AMOUNT` | `5000000000000` | BTC loan principal (wei) |
| `ETH_LOAN_AMOUNT` | `1000000000000` | ETH loan principal (wei) |
| `BTC_LOAN_APR` | `400` | 4.00% APR in basis points |
| `ETH_LOAN_APR` | `600` | 6.00% APR in basis points |
| `MORPHO_LLTV` | `860000000000000000` | 86% liquidation LTV |

---

## 8. IPFS Corporate Document CIDs

Configure as **Repository Variables**:

| Variable Name | CID |
|---|---|
| `IPFS_GLADIATOR_CERT_CID` | `bafybeiba2j4g34bizjjm26qznc2pf4upgotffrcwjtkw6lj3qa6squrzpu` |
| `IPFS_GLADIATOR_NOTICE_CID` | `bafkreifbikc26xs2cu2mvsghzlrginwm6icqotdp4ntsvq3sn6h4flrhhm` |
| `IPFS_MR_ARTICLES_CID` | `bafkreifxiesrze736sxhvsa5op64q6f3ddvv3rismnvd75wi3yfqilu4py` |
| `IPFS_MR_EIN_LETTER_CID` | `bafkreihz5zpp33pimzckaey64mht2vezlbzngoxe46urrfctzqvjvsdboe` |
| `IPFS_SLAPS_ARTICLES_CID` | `bafkreic3n6bdf25tobljqbjxzvzkbch6s7xkqq5yehmyt3zju4de7ey52u` |
| `IPFS_SLAPS_EIN_LETTER_CID` | `bafkreifnuwchbvbolmhbgionvsltdi3edzasfqytd4zzqlvu42m5m4jhei` |
| `IPFS_RBW_EIN_LETTER_CID` | `bafkreid77fuxwqtwyku5syp3dswmy75rymvxh6v3tf7rfrzqbrizoutxtu` |
| `IPFS_NM_SOS_RECEIPT_CID` | `bafkreigjsqx6d47sgqwkjxgtt3qrjnoz3hdth4hqk7qnxflqog2ikjs2kq` |
| `IPFS_BENEFICIAL_OWNER_ID_CID` | `bafkreie5spkgxxhmafdqylwyfplx37jqhcjrs3es3neasgcnynzgkg5mzi` |
| `IPFS_PATENTSIGHT_PORTFOLIO_CID` | `bafkreibxqnmhir5iifpboxdv5ndltm5vnbplso4ndtcuzfnanykudrwdbu` |
| `IPFS_PATENTSIGHT_MR_CID` | `bafkreihls2yoi265uxzmcmh7wzk2ytyo5yvopmb4jib4blw4nptlchivqm` |
| `IPFS_PATENTSIGHT_SLAPS_CID` | `bafkreiflmhdsflvv53e24mo2woafdgecpkvfljcbm5heafnzdxzbj5ct4i` |
| `IPFS_IPLYTICS_DECLARATION_CID` | `bafkreiej7wfskl53hxo4j47g55bxjkyyulihovjjtpjvtf264kfoddxc5i` |
| `IPFS_ABI_PROOF_CID` | `bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay` |

---

## 9. GitHub Copilot Configuration

For Copilot Workspace and Copilot CLI integration:

| Setting | Location | Value |
|---|---|---|
| GitHub Copilot | **Settings > Copilot** | Enabled for repository |
| Copilot Coding Agent | **Settings > Copilot > Coding agent** | Enable internet access |
| Allowed domains | Coding agent firewall | `mainnet.storyrpc.io`, `mainnet.base.org`, `*.mypinata.cloud`, `*.alchemy.com` |

Install Copilot CLI locally:
```bash
npm install -g @githubnext/copilot-cli
copilot auth login
```

---

## 10. GitHub Pages Configuration

| Setting | Location | Value |
|---|---|---|
| Source | **Settings > Pages** | Deploy from `main` branch, `/docs` folder |
| Custom domain | Optional | Your domain or use `*.github.io` |
| HTTPS | Enforce HTTPS | Enabled |

The `docs/index.html` serves as the GitHub Pages entry point with links to all documentation.

---

## 11. GitHub Environments

Create three environments under **Settings > Environments**:

| Environment | Purpose | Required Secrets |
|---|---|---|
| `story-mainnet` | Story Protocol (Chain 1514) | `DEPLOYER_PRIVATE_KEY`, `ALCHEMY_API_KEY`, `STORYSCAN_API_KEY` |
| `base-mainnet` | Base L2 (Chain 8453) | `DEPLOYER_PRIVATE_KEY`, `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY` |
| `eth-mainnet` | Ethereum Mainnet (Chain 1) | `DEPLOYER_PRIVATE_KEY`, `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY` |

Each environment can optionally have:
- **Required reviewers** (recommended for mainnet)
- **Wait timer** (e.g., 5 minutes for manual review)
- **Deployment branch rules** (`main` only)

---

## Quick Setup Script (GitHub CLI)

```bash
# Install GitHub CLI: https://cli.github.com
# Login
gh auth login

# Set repository variables (public addresses)
gh variable set MORPHO_MULTISIG_SIGNER_1 --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"
gh variable set MORPHO_MULTISIG_SIGNER_2 --body "0x20A8402c67b9D476ddC1D2DB12f03B30A468f135"
gh variable set MORPHO_MULTISIG_SIGNER_3 --body "0x5EEFF17e12401b6A8391f5257758E07c157E1e45"
gh variable set MORPHO_MULTISIG_SIGNER_4 --body "0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A"
gh variable set MORPHO_MULTISIG_SIGNER_5 --body "0xD39447807f18Ba965E8F3F6929c8815794B3C951"
gh variable set MORPHO_SAFE_ADDRESS --body "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09"
gh variable set MORPHO_MULTISIG_THRESHOLD --body "3"
gh variable set STORY_DEPLOYER_ADDRESS --body "0x5EEFF17e12401b6A8391f5257758E07c157E1e45"
gh variable set COINBASE_WALLET_ADDRESS --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"
gh variable set PINATA_GATEWAY_NAME --body "lavender-neat-urial-76"
gh variable set UCC1_FINANCING_STATEMENT_CID --body "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu"
gh variable set UCC1_FILING_NUMBER --body "20260000078753"
gh variable set MORPHO_BLUE --body "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"
gh variable set BASE_USDC --body "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

# Set secrets (replace with actual values)
gh secret set DEPLOYER_PRIVATE_KEY --env story-mainnet
gh secret set DEPLOYER_PRIVATE_KEY --env base-mainnet
gh secret set ALCHEMY_API_KEY
gh secret set STORYSCAN_API_KEY
gh secret set ETHERSCAN_API_KEY
gh secret set PINATA_API_KEY
gh secret set PINATA_SECRET_API_KEY
gh secret set PINATA_JWT
gh secret set PINATA_GATEWAY_TOKEN
gh secret set COINBASE_API_KEY_NAME
gh secret set COINBASE_API_KEY_PRIVATE_KEY
gh secret set THIRDWEB_CLIENT_ID
gh secret set THIRDWEB_SECRET_KEY
```
