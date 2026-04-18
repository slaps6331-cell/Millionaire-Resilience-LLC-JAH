# Wallet Private Key Export & Multi-Sig Configuration Guide

Complete walkthrough for locating and exporting Ethereum private keys from the five wallets used in the Millionaire Resilience LLC 3-of-5 Gnosis Safe multi-signature deployment, with GitHub environment variable mappings.

---

## Table of Contents

1. [Multi-Sig Address-to-Wallet Mapping](#1-multi-sig-address-to-wallet-mapping)
2. [MetaMask — Private Key Export](#2-metamask--private-key-export)
3. [Coinbase Wallet — Private Key Export](#3-coinbase-wallet--private-key-export)
4. [Brave Browser Wallet — Private Key Export](#4-brave-browser-wallet--private-key-export)
5. [Trust Wallet — Private Key Export](#5-trust-wallet--private-key-export)
6. [Blockchain.com Wallet — Private Key Export](#6-blockchaincom-wallet--private-key-export)
7. [GitHub Environment Variable Names](#7-github-environment-variable-names)
8. [Blockchain.com Wallet Beneficial Features for Deployment](#8-blockchaincom-wallet-beneficial-features-for-deployment)
9. [Security Best Practices](#9-security-best-practices)

---

## 1. Multi-Sig Address-to-Wallet Mapping

| Signer | Address | Wallet | GitHub Variable |
|---|---|---|---|
| Signer 1 | `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a` | Coinbase Wallet | `MORPHO_MULTISIG_SIGNER_1` |
| Signer 2 | `0x20A8402c67b9D476ddC1D2DB12f03B30A468f135` | Blockchain.com Wallet | `MORPHO_MULTISIG_SIGNER_2` |
| Signer 3 | `0x5EEFF17e12401b6A8391f5257758E07c157E1e45` | MetaMask | `MORPHO_MULTISIG_SIGNER_3` |
| Signer 4 | `0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A` | Brave Browser Wallet | `MORPHO_MULTISIG_SIGNER_4` |
| Signer 5 | `0xD39447807f18Ba965E8F3F6929c8815794B3C951` | Trust Wallet | `MORPHO_MULTISIG_SIGNER_5` |
| Safe Contract | `0xd314BE0a27c73Cd057308aC4f3dd472c482acc09` | Gnosis Safe (3-of-5) | `MORPHO_SAFE_ADDRESS` |

---

## 2. MetaMask -- Private Key Export

**Signer 3 (Story Protocol Deployer):** `0x5EEFF17e12401b6A8391f5257758E07c157E1e45`

### Browser Extension

1. Click the **MetaMask extension icon** in your browser toolbar
2. Click the **account selector** (circle icon at the top) to ensure you're on the correct account (`0x5EEFF...`)
3. Click the **three vertical dots** (kebab menu) next to the account name
4. Select **Account Details**
5. Click **Show Private Key** (or "Hold to reveal Private Key")
6. Enter your **MetaMask password** when prompted
7. Click **Confirm** after reading the security warning
8. The 64-character hex private key is displayed -- **copy it securely**

### Mobile App

1. Open MetaMask and switch to the target account
2. Tap the **three dots** next to the account name
3. Select **Private Keys** or **Account Details**
4. Enter your password
5. Tap and hold **"Hold to reveal Private Key"**
6. Copy the key securely

### Key File Location

MetaMask stores encrypted keystore data in the browser's local storage:

| Browser | Location |
|---|---|
| Chrome | `%APPDATA%\Google\Chrome\User Data\Default\Local Extension Settings\nkbihfbeogaeaoehlefnkodbefgpgknn\` |
| Firefox | `%APPDATA%\Mozilla\Firefox\Profiles\<profile>\storage\default\moz-extension+++<ext-id>\` |
| Edge | `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Extension Settings\ejbalbakoplchlghecdalmeeeajnimhm\` |

**Note:** These are AES-encrypted LevelDB files. The in-app export method is the recommended approach.

---

## 3. Coinbase Wallet -- Private Key Export

**Signer 1 (Coinbase Wallet):** `0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a`

### Mobile App

1. Open the **Coinbase Wallet** app (formerly "Coinbase Wallet", now branded as the Base app)
2. Tap the **wallet icon** (bottom right)
3. Tap the **gear icon** (Settings, top right)
4. Select your wallet account
5. Tap **"Show private key"**
6. Enter your **wallet password** to authenticate
7. The private key is displayed -- copy it securely

### Browser Extension

1. Click the **Coinbase Wallet extension** icon
2. Click the **Settings gear** icon
3. Select **"Manage wallets"**
4. Click on the account
5. Select **"Show private key"**
6. Enter password and copy

### Recovery Phrase Alternative

If the private key export is not visible, use the **12-word recovery phrase** method:
1. Settings > Security > Recovery Phrase
2. Use a BIP39 tool (offline) to derive the Ethereum private key:
   - Derivation path: `m/44'/60'/0'/0/0`

### CDP Server-Side Export (for automated workflows)

For Coinbase Developer Platform (CDP) wallets used in CI/CD:
```javascript
const account = await cdp.evm.exportAccount({ address: "0xDc2aFCd0..." });
```
Requires `COINBASE_API_KEY_NAME` and `COINBASE_API_KEY_PRIVATE_KEY` scoped with export permissions.

---

## 4. Brave Browser Wallet -- Private Key Export

**Signer 4 (Base Authorization):** `0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A`

### Built-in Brave Wallet

Brave Wallet is a self-custody, non-custodial wallet built directly into the Brave browser.

1. Open Brave browser
2. Navigate to **`brave://wallet/crypto/accounts`** in the address bar
3. Click on the account matching `0x4C7CD4...`
4. Click the **pencil (edit) icon** next to the account name
5. Click the **"Private key"** tab
6. Enter your Brave Wallet password
7. The private key is displayed -- copy it securely

### Alternative Path

1. Click the **wallet icon** in the Brave toolbar (or navigate to `brave://wallet`)
2. Click **Accounts** in the sidebar
3. Click the **three dots** next to the target account
4. Select **Export** or **Show Private Key**
5. Authenticate with your password

### Key File Location

Brave stores wallet data in the browser profile:

| OS | Location |
|---|---|
| Windows | `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\brave_wallet\` |
| macOS | `~/Library/Application Support/BraveSoftware/Brave-Browser/Default/brave_wallet/` |
| Linux | `~/.config/BraveSoftware/Brave-Browser/Default/brave_wallet/` |

**Note:** These files are encrypted. Use the in-app export method.

---

## 5. Trust Wallet -- Private Key Export

**Signer 5 (SPV Custodian):** `0xD39447807f18Ba965E8F3F6929c8815794B3C951`

### Mobile App (Direct Export)

Trust Wallet hides private key export by default for security. Enable it first:

1. Open Trust Wallet
2. Go to **Settings** (gear icon, bottom right)
3. Enable **Developer Mode** (toggle "Enable Private Key Export" if available)
4. Go back and tap **Wallets** or **Manage Wallets**
5. Tap the **three dots** next to your Ethereum wallet
6. Select **"Export Private Key"**
7. Verify with passcode, password, or biometrics
8. Copy the private key securely

### Recovery Phrase Derivation (If Direct Export Unavailable)

In 2025+ versions, Trust Wallet may have removed the direct export option. Use this method instead:

1. Open Trust Wallet > Settings > Wallets
2. Tap the **three dots** next to your wallet > **Manual Backup**
3. Verify your identity and reveal the **12-word recovery phrase**
4. Use Ian Coleman's BIP39 tool (**offline only**):
   - Go to: `https://iancoleman.io/bip39/` (download and run offline)
   - Enter the 12-word mnemonic
   - Select coin: **Ethereum**
   - Derivation path: `m/44'/60'/0'/0/0`
   - Copy the private key from the first derived address row

### Key File Location (Mobile)

| OS | Location |
|---|---|
| Android | `/data/data/com.wallet.crypto.trustapp/files/` (requires root) |
| iOS | Secure Enclave (not directly accessible) |

**Note:** Mobile wallets use hardware-backed encryption. Always use the in-app export method.

---

## 6. Blockchain.com Wallet -- Private Key Export

**Signer 2 (Morpho Authorization):** `0x20A8402c67b9D476ddC1D2DB12f03B30A468f135`

### Web Wallet (Recommended Method)

Private key export is **only available in the web wallet** (not the mobile app).

1. Log in to **https://login.blockchain.com** in your browser
2. Navigate to **Settings** (gear icon, top right)
3. Click **Wallets & Addresses**
4. Select **Ethereum**
5. Read the security warning carefully
6. Click the **"Show"** button to reveal your private key
7. Enter your wallet password if prompted
8. Copy the private key securely

### Important Limitations

- This feature is **web-only** -- not available in the mobile app
- Only works for **non-custodial** Blockchain.com wallets
- Trading Account wallets are custodial and do not provide private key access
- The private key is generated and displayed on-demand (not stored as a file)

### WalletConnect Signing (Alternative to Key Export)

For EIP-191 signing without exporting the private key:

1. Open the Blockchain.com mobile app
2. Tap the **QR scanner** on the home screen
3. Scan the WalletConnect QR code from the dApp
4. Confirm the session connection
5. When prompted, approve the `personal_sign` request (EIP-191)
6. The signature is returned to the dApp without exposing the private key

---

## 7. GitHub Environment Variable Names

### Repository Variables (Public Addresses)

Set these via **Settings > Secrets and variables > Actions > Variables**:

```bash
# Multi-sig signer addresses
MORPHO_MULTISIG_SIGNER_1=0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a   # Coinbase Wallet
MORPHO_MULTISIG_SIGNER_2=0x20A8402c67b9D476ddC1D2DB12f03B30A468f135   # Blockchain.com Wallet
MORPHO_MULTISIG_SIGNER_3=0x5EEFF17e12401b6A8391f5257758E07c157E1e45   # MetaMask
MORPHO_MULTISIG_SIGNER_4=0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A   # Brave Browser Wallet
MORPHO_MULTISIG_SIGNER_5=0xD39447807f18Ba965E8F3F6929c8815794B3C951   # Trust Wallet
MORPHO_SAFE_ADDRESS=0xd314BE0a27c73Cd057308aC4f3dd472c482acc09        # Gnosis Safe Contract
MORPHO_MULTISIG_THRESHOLD=3                                            # 3-of-5 threshold

# Legacy aliases
STORY_DEPLOYER_ADDRESS=0x5EEFF17e12401b6A8391f5257758E07c157E1e45     # = SIGNER_3
COINBASE_WALLET_ADDRESS=0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a    # = SIGNER_1
```

### Environment Secrets (Private Keys)

Set these per GitHub Environment (`story-mainnet`, `base-mainnet`):

```bash
DEPLOYER_PRIVATE_KEY       # The deployer private key for contract deployment (hex, no quotes)
SIGNER1_SIGNATURE          # EIP-191 signature from Coinbase Wallet
SIGNER2_SIGNATURE          # EIP-191 signature from Blockchain.com Wallet
SIGNER3_SIGNATURE          # EIP-191 signature from MetaMask
SIGNER4_SIGNATURE          # EIP-191 signature from Brave Wallet
SIGNER5_SIGNATURE          # EIP-191 signature from Trust Wallet
```

### GitHub CLI Quick Setup

```bash
REPO="slaps6331-cell/Millionaire-Resilience-LLC-JAH"

# Set variables
gh variable set MORPHO_MULTISIG_SIGNER_1 --body "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_2 --body "0x20A8402c67b9D476ddC1D2DB12f03B30A468f135" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_3 --body "0x5EEFF17e12401b6A8391f5257758E07c157E1e45" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_4 --body "0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A" --repo $REPO
gh variable set MORPHO_MULTISIG_SIGNER_5 --body "0xD39447807f18Ba965E8F3F6929c8815794B3C951" --repo $REPO
gh variable set MORPHO_SAFE_ADDRESS --body "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09" --repo $REPO
gh variable set MORPHO_MULTISIG_THRESHOLD --body "3" --repo $REPO
```

---

## 8. Blockchain.com Wallet Beneficial Features for Deployment

The Blockchain.com Wallet offers several features that directly benefit the Azure Blockchain Development Kit deployment workflow and Morpho Protocol multi-sig verification.

### 8.1 WalletConnect v2.0 -- Direct dApp Signing

**Benefit for Multi-Sig Verification:**

Blockchain.com Wallet's WalletConnect v2.0 integration enables **EIP-191 message signing (`personal_sign`) without exporting the private key**. This is the most secure method for the multi-sig verification step because:

- The private key never leaves the wallet
- Signing happens on the user's device
- The signature is transmitted back via the encrypted WalletConnect relay
- Supports `personal_sign`, `eth_signTypedData` (EIP-712), and `eth_sendTransaction`

**Applied to Verification Step:**

```bash
# Instead of exporting the private key and using cast:
# cast wallet sign --private-key "$KEY" --no-hash "$HASH"

# The Blockchain.com signer can use WalletConnect:
# 1. Open the signing dApp (e.g., Safe Wallet at app.safe.global)
# 2. Connect via WalletConnect (scan QR from Blockchain.com app)
# 3. Sign the EIP-191 hash when prompted
# 4. Paste the returned signature into signature-morpho-config.json
```

### 8.2 Multi-Chain Support (Ethereum + Polygon)

**Benefit for Cross-Chain Deployment:**

Blockchain.com Wallet natively supports Ethereum and Polygon networks, allowing the Signer 2 wallet to:

- Sign transactions on Base L2 via WalletConnect
- Monitor deployment gas costs across chains
- Verify contract interactions on both Story Protocol and Base networks

### 8.3 In-Wallet DEX Aggregator Swaps

**Benefit for Gas Management:**

During deployment, the deployer wallet needs ETH for gas on Story Protocol and Base L2. Blockchain.com's in-wallet swap feature can:

- Convert assets to ETH directly without leaving the wallet
- Use the DEX aggregator for optimal swap rates
- Fund the deployer address with gas in a single step

### 8.4 Staking for Yield During Deployment Lockup

**Benefit for Capital Efficiency:**

While the 3-of-5 multi-sig signatures are being collected (which may take days), idle ETH in the Blockchain.com wallet can be staked to earn daily rewards, improving capital efficiency during the deployment window.

### 8.5 Non-Custodial Architecture

**Benefit for Legal Compliance (UCC-1 Perfection):**

The Blockchain.com Wallet is non-custodial, meaning:

- The signer maintains full legal custody of the private key
- No third party (including Blockchain.com) can access or freeze the wallet
- This satisfies the UCC-1 perfection requirement that the secured party maintain provable control over the collateral address

### 8.6 Features Applied to the Deployment Workflow

| Deployment Step | Blockchain.com Feature Applied |
|---|---|
| **EIP-191 Multi-Sig Signing** | WalletConnect v2.0 `personal_sign` -- sign without key export |
| **Signature Verification** | `verify-multisig.cjs` validates the WalletConnect-produced signature |
| **Cross-Chain Monitoring** | Multi-chain support for Ethereum/Base transaction tracking |
| **Gas Funding** | In-wallet DEX swap to fund deployer with ETH |
| **Deployment Idle Period** | ETH staking for yield during signature collection |
| **UCC-1 Legal Compliance** | Non-custodial architecture ensures provable key custody |
| **Safe Wallet Integration** | WalletConnect session to Gnosis Safe for multi-sig tx approval |

---

## 9. Security Best Practices

### General Rules

1. **Never share private keys** with anyone, including support staff from any wallet provider
2. **Never store private keys digitally** (no email, cloud storage, screenshots, or clipboard managers)
3. **Export on a secure device** -- use a trusted computer without malware or remote access software
4. **Use WalletConnect when possible** -- sign messages without exporting keys
5. **Write keys on paper** and store in a secure physical location (safe, bank deposit box)
6. **Verify addresses character-by-character** before signing any transaction
7. **Test with small amounts** before signing large multi-sig transactions

### For the Azure VM Deployment Environment

```bash
# Load the deployer private key from Azure Key Vault (never hardcode)
export DEPLOYER_PRIVATE_KEY=$(az keyvault secret show \
  --vault-name kv-blockchain-deploy \
  --name "DEPLOYER-PRIVATE-KEY" \
  --query value -o tsv)

# Verify the key loads correctly (shows address, not the key)
cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY"

# Clear the key from environment after deployment
unset DEPLOYER_PRIVATE_KEY
```

### For GitHub Actions

- Private keys are stored as **Environment Secrets** (encrypted at rest)
- Environment Secrets are scoped to specific environments (e.g., `story-mainnet`)
- Required reviewers can be configured to gate secret access
- GitHub Actions logs **automatically mask** secret values
