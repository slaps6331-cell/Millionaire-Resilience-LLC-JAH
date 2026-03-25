# Security Checklist

## Millionaire Resilience LLC — Pre-Deployment Security Validation

---

## Pre-Deployment Validation

### Deployer Wallet

- [ ] Deployer wallet is a **dedicated deployment wallet** — not the Coinbase or ThirdWeb multi-sig wallet
- [ ] Wallet holds sufficient gas: ≥ 0.5 IP (Story Protocol) and ≥ 0.01 ETH (Base L2)
- [ ] Private key is stored **only** in GitHub Secrets (`DEPLOYER_PRIVATE_KEY`)
- [ ] Private key has **never** been committed to source code, issue comments, or chat messages
- [ ] Private key will be **rotated** immediately after deployment if any exposure is suspected

### Smart Contract Security

- [ ] All contracts compiled without errors on Hardhat 0.8.26
- [ ] Slither static analysis has no **High** or **Critical** severity findings
- [ ] `npm audit` shows no **High** or **Critical** dependency vulnerabilities
- [ ] No `tx.origin` used for authorization in any contract
- [ ] Reentrancy guards (`nonReentrant`) applied to all state-mutating external calls
- [ ] Integer overflow/underflow protected by Solidity 0.8.x built-in checks
- [ ] No hardcoded addresses (use constructor parameters or environment variables)
- [ ] Owner / admin functions protected by `onlyOwner` or equivalent access control

### GitHub Secrets Hygiene

- [ ] All secrets set via GitHub Secrets (Settings → Secrets → Actions), never in workflow YAML
- [ ] `.env` is listed in `.gitignore`
- [ ] `.env.example` contains only placeholder values (no real keys)
- [ ] `SECURITY.md` read and understood by all contributors

---

## Private Key Management

### Storage Rules

| Rule | Requirement |
|---|---|
| GitHub Secrets only | All private keys stored as encrypted GitHub Secrets |
| No source code | Keys must never appear in `.sol`, `.js`, `.cjs`, `.ts`, or `.json` files |
| No issue/PR comments | Keys must never be pasted in GitHub issues, PR descriptions, or comments |
| No chat/email | Keys must never be sent in Slack, Discord, email, or any messaging platform |
| Hardware wallet | For mainnet deployments, use a hardware wallet when possible |

### Key Rotation Procedure

1. Generate a new private key using a hardware wallet or secure key generator
2. Fund the new wallet with sufficient gas on all target networks
3. Update `DEPLOYER_PRIVATE_KEY` in GitHub Secrets
4. Revoke and delete the old key from all storage locations
5. Document the rotation in the audit trail (commit to this file)

### Incident Response

If a private key is suspected to be exposed:

1. **Immediately** rotate the key (see above)
2. Transfer all funds from the compromised wallet
3. Revoke any API keys that may have been exposed simultaneously
4. Review GitHub Actions logs for unauthorized workflow runs
5. Open a security advisory at: **Settings → Security → Advisories**
6. See [SECURITY.md](../SECURITY.md) for full incident response procedure

---

## Secret Rotation Schedule

| Secret | Rotation Frequency | Last Rotated |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | After each deployment or on suspicion of exposure | — |
| `ALCHEMY_API_KEY` | Every 90 days | — |
| `STORYSCAN_API_KEY` | Every 90 days | — |
| `ETHERSCAN_API_KEY` | Every 90 days | — |
| `PINATA_JWT` | Every 90 days | — |
| `PINATA_GATEWAY_TOKEN` | Every 90 days | — |
| `COINBASE_API_KEY_PRIVATE_KEY` | Every 90 days | — |
| `THIRDWEB_SECRET_KEY` | Every 90 days | — |

---

## Audit Trail Requirements

Every deployment must be logged with:

- [ ] Transaction hash(es) recorded in `deployment-registry.json`
- [ ] Contract addresses recorded in `deployment-registry.json`
- [ ] Verification status updated in `deployment-registry.json`
- [ ] Deployer wallet address recorded (no private key — address only)
- [ ] Timestamp recorded (UTC ISO 8601)
- [ ] `deployment-registry.json` committed and pushed to the repository

---

## Post-Deployment Verification

- [ ] All contracts visible on StoryScan: https://www.storyscan.io
- [ ] All contracts visible on Basescan: https://basescan.org
- [ ] Contract source code verified (ABI matches deployed bytecode)
- [ ] Story Protocol IP registration confirmed via `storyscan.io`
- [ ] Morpho Blue market parameters validated on `basescan.org`
- [ ] IPFS CIDs verified accessible via Pinata gateway
- [ ] `deployment-registry.json` updated with all hashes
