# Multi-Signature Signing Instructions
## Deployment Wallets for Story Protocol & Base Mainnet

**Generated:** April 12, 2026  
**Status:** Ready for Signing

---

## EIP-191 Hash to Sign

```
0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb
```

**⚠️ IMPORTANT:** Both wallets must sign this EXACT hash.

---

## Wallet 1: Story Mainnet (MetaMask)

**Address:** `0x5EEFF17e12401b6A8391f5257758E07c157E1e45`  
**Network:** Story Protocol Mainnet (Chain 1514)  
**Signing Method:** MetaMask

### Step-by-Step Instructions:

1. **Open MyEtherWallet**
   ```
   URL: https://www.myetherwallet.com
   ```

2. **Connect MetaMask**
   - Click "Access My Wallet"
   - Select "Browser Extension"
   - Choose MetaMask
   - **Verify Address:** `0x5EEFF17e12401b6A8391f5257758E07c157E1e45`

3. **Navigate to Sign Message**
   - Click "Tools" in the left sidebar
   - Select "Sign Message"

4. **Sign the Hash**
   - Paste this hash in the message field:
   ```
   0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb
   ```
   - Click "Sign Message"
   - **Confirm in MetaMask popup**

5. **Copy Signature**
   - Copy the entire 132-character signature (starts with `0x`)
   - Save it securely

### Network Configuration (if needed):

| Field | Value |
|-------|-------|
| Network Name | Story Mainnet |
| RPC URL | `https://mainnet.storyrpc.io` |
| Chain ID | `1514` |
| Symbol | `IP` |
| Explorer | `https://www.storyscan.io` |

---

## Wallet 2: Base Mainnet (MyEtherWallet)

**Address:** `0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A`  
**Network:** Base Mainnet (Chain 8453)  
**Signing Method:** MyEtherWallet / WalletConnect

### Step-by-Step Instructions:

1. **Open MyEtherWallet**
   ```
   URL: https://www.myetherwallet.com
   ```

2. **Connect Wallet**
   - Click "Access My Wallet"
   - Choose your connection method:
     - "Browser Extension" (if using Coinbase Wallet extension)
     - "WalletConnect" (for mobile wallet)
     - "Hardware" (for Ledger/Trezor)
   - **Verify Address:** `0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A`

3. **Navigate to Sign Message**
   - Click "Tools" in the left sidebar
   - Select "Sign Message"

4. **Sign the Hash**
   - Paste this hash in the message field:
   ```
   0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb
   ```
   - Click "Sign Message"
   - **Confirm in your wallet popup**

5. **Copy Signature**
   - Copy the entire 132-character signature (starts with `0x`)
   - Save it securely

### Network Configuration (if needed):

| Field | Value |
|-------|-------|
| Network Name | Base Mainnet |
| RPC URL | `https://mainnet.base.org` |
| Chain ID | `8453` |
| Symbol | `ETH` |
| Explorer | `https://basescan.org` |

---

## After Signing Both Wallets

### Provide Signatures in This Format:

```
Story Mainnet Signature (0x5EEFF17e...):
0x[paste your 132-character signature here]

Base Mainnet Signature (0x4C7CD4eC...):
0x[paste your 132-character signature here]
```

### What Happens Next:

1. ✅ Signatures will be verified against expected addresses
2. ✅ Configuration file will be updated
3. ✅ Multi-sig requirement (2/2) will be confirmed
4. ✅ Deployment to Story Protocol and Base will be authorized

---

## Verification Checklist

Before signing, verify:

- [ ] You are on the correct website: `myetherwallet.com`
- [ ] SSL certificate is valid (green padlock)
- [ ] Wallet address matches expected address
- [ ] Hash matches exactly: `0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb`

After signing:

- [ ] Signature is 132 characters (including `0x`)
- [ ] Signature starts with `0x`
- [ ] Both signatures collected

---

## Security Notes

- **Never share your private keys**
- **Only sign on official myetherwallet.com**
- **Verify the hash matches before signing**
- **Keep signatures secure until submission**

---

## Quick Reference

| Item | Value |
|------|-------|
| **Hash to Sign** | `0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb` |
| **Story Wallet** | `0x5EEFF17e12401b6A8391f5257758E07c157E1e45` |
| **Base Wallet** | `0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A` |
| **Required Signatures** | 2 of 2 |
| **MyEtherWallet URL** | https://www.myetherwallet.com |
