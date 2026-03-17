# Security Policy
## Millionaire Resilience LLC — Credential Exposure Response

---

## Reporting a Security Issue

If you discover a security vulnerability in this repository's smart contracts,
deployment scripts, or infrastructure, please **do not open a public GitHub issue**.

Contact the repository owner directly through the GitHub private security advisory
system:  
**Security → Advisories → Report a vulnerability**

---

## ⚠️ Credential Exposure Incident Response

If API keys, private keys, JWT tokens, or other secrets have been accidentally
exposed (e.g., committed to source code, pasted into a GitHub issue, or shared
in a problem statement), **follow these steps immediately**:

### Step 1 — Revoke all exposed credentials NOW

Work through every exposed credential in this order (most critical first):

#### Ethereum Deployer Private Key
If a wallet private key was exposed, the wallet should be considered **permanently
compromised**. Immediately:
1. Transfer **all funds** out of the compromised wallet to a new, secure wallet.
2. Never use the compromised address for any further transactions.
3. Generate a new deployer wallet (see `DEPLOYMENT_GUIDE.md §1.4`).

#### Alchemy API Key
1. Go to <https://dashboard.alchemy.com>.
2. Select the app whose key was exposed.
3. Click **Edit** → **Regenerate API key**.
4. Copy the new key and add it to GitHub Secrets (see §2 of `DEPLOYMENT_GUIDE.md`).

#### Etherscan / Basescan API Key
1. Go to <https://etherscan.io/myapikey>.
2. Click the **delete icon** (🗑) next to the exposed key to delete it.
3. Click **Add** to create a new API key.
4. Add the new key to GitHub Secrets as `ETHERSCAN_API_KEY`.

#### Pinata JWT
1. Go to <https://app.pinata.cloud/keys>.
2. Find the key whose JWT was exposed — identify it by the `scopedKeyKey` field in the
   decoded JWT payload.
3. Click **Revoke** next to that key.
4. Click **New Key** → grant the necessary permissions → generate.
5. Copy the new JWT and add it to GitHub Secrets as `PINATA_JWT`.

#### Coinbase Developer Platform API Key
1. Go to <https://portal.cdp.coinbase.com>.
2. Navigate to **API Keys**.
3. Find the exposed key and click **Delete** or **Revoke**.
4. Click **Create API Key** to generate a replacement.
5. Add the new key to GitHub Secrets as needed.

#### ThirdWeb Client ID / Secret Key
1. Go to <https://thirdweb.com/dashboard> → **Settings → API Keys**.
2. Find the exposed key and click the three-dot menu → **Delete**.
3. Click **Create API Key** → copy the new Client ID and Secret Key.
4. Add them to GitHub Secrets as `THIRDWEB_CLIENT_ID` and `THIRDWEB_SECRET_KEY`.

### Step 2 — Remove exposed values from all locations

- **GitHub issues / PR comments**: Edit the comment and replace the credential with
  `[REDACTED — credential revoked]`.
- **Git history**: If a credential was committed to source code, contact GitHub
  Support to permanently remove it using the BFG Repo-Cleaner or
  `git filter-repo`. See:
  <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository>
- **Any other location** (chat, email, etc.): Inform all recipients that the
  credential has been revoked and must not be used.

### Step 3 — Add new credentials to GitHub Secrets safely

Follow the instructions in `DEPLOYMENT_GUIDE.md §2` to add all replacement
credentials **only** as GitHub repository secrets — never in source code,
issue text, or any document shared externally.

### Step 4 — Audit for unauthorized usage

After revoking exposed credentials, check for unauthorized activity:

| Credential | Where to check |
|------------|----------------|
| Alchemy API Key | <https://dashboard.alchemy.com> → Usage → check for unexpected RPC calls |
| Etherscan API Key | <https://etherscan.io/myapikey> → Usage stats |
| Pinata JWT | <https://app.pinata.cloud> → Usage — check for unexpected uploads |
| Deployer wallet | <https://storyscan.xyz> or <https://basescan.org> — search the address for unexpected transactions |

---

## Preventing Future Exposure

### What goes in `.env` (local only, never committed)
```
DEPLOYER_PRIVATE_KEY=0x...64 hex chars...
ALCHEMY_API_KEY=...
ETHERSCAN_API_KEY=...
PINATA_JWT=eyJ...
```

### What goes in GitHub Secrets
Everything from `.env` that the CI/CD pipeline needs — add via:  
**Settings → Secrets and variables → Actions → New repository secret**

### What NEVER gets shared
- Private keys (64-char hex strings starting with `0x`)
- JWT tokens (long base64 strings)
- API secret keys
- Any value from your `.env` file

### What IS safe to share publicly
- Ethereum **wallet addresses** (starting with `0x`, 42 chars) — these are public
- Contract addresses after deployment
- Transaction hashes
- IPFS content identifiers (CIDs)

---

## Key Concepts: Coinbase API Key vs Ethereum Private Key

These are **completely different things** and cannot be substituted for each other.

| | Coinbase API Key | Ethereum Private Key |
|-|-----------------|---------------------|
| **Format** | UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Hex: `0x` + 64 hex characters |
| **Purpose** | Authenticate REST API calls to Coinbase's backend | Sign Ethereum transactions on-chain |
| **Used for** | Coinbase Developer Platform services | Deploying/interacting with smart contracts |
| **If exposed** | Revoke via Coinbase Developer Portal | Entire wallet is compromised — move all funds |

The `DEPLOYER_PRIVATE_KEY` secret required for contract deployment must be a
**64-hex-character Ethereum private key**, not a Coinbase API UUID.  
See `DEPLOYMENT_GUIDE.md §1.4` for how to create one.
