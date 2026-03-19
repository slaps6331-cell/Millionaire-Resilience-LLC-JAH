# GitHub Pages Configuration

**Repository:** `slaps6331-cell/Millionaire-Resilience-LLC-JAH`

This document explains how GitHub Pages is configured for this repository, why the current settings were chosen, and how to update or redeploy the site.

---

## Recommendation: `main` branch + `/docs` folder

### Why `/docs` on `main`?

| Factor | Details |
|--------|---------|
| **Repo structure** | The repository root contains Solidity contracts, Hardhat scripts, Node packages, and JSON artifacts. Serving from root would expose every file to the Pages crawler. |
| **`docs/` folder** | A dedicated `docs/` folder holds only the static site files (`index.html`, etc.), keeping Pages content cleanly separated from contract/build tooling. |
| **No complex build required** | The Pages site is a self-contained static HTML page. No Vite/Node build step is needed to publish it. |
| **Simple maintenance** | Edits to `docs/index.html` on `main` are automatically picked up by Pages on the next push—no separate branch or manual artifact upload needed. |

> **Alternative considered:** `gh-pages` branch — useful when the frontend requires a build step (e.g., `npm run build`). This repo's Pages content is intentionally kept as a plain HTML file so any contributor can update it without a build toolchain.

---

## Step-by-Step Configuration in GitHub Settings

1. Open the repository on GitHub:
   `https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH`

2. Click **Settings** (top navigation bar).

3. In the left sidebar, click **Pages** (under *Code and automation*).

4. Under **Build and deployment → Source**, select **Deploy from a branch**.

5. Set the branch to **`main`** and the folder to **`/docs`**.

6. Click **Save**.

7. GitHub will show a banner:
   > *Your site is ready to be published at `https://slaps6331-cell.github.io/Millionaire-Resilience-LLC-JAH/`*

8. Wait 1–2 minutes, then visit the URL to confirm the site is live.

---

## Automated Deployment Workflow

A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) is included to deploy the `docs/` folder to GitHub Pages automatically on every push to `main`.

### How it works

```
push to main
    └── deploy-pages.yml
            ├── checkout repo
            ├── upload docs/ as Pages artifact
            └── deploy to GitHub Pages
```

The workflow uses the official `actions/upload-pages-artifact` and `actions/deploy-pages` actions.

### Required permissions

The workflow needs the following permissions (already configured in `deploy-pages.yml`):

| Permission | Value | Reason |
|------------|-------|--------|
| `pages` | `write` | Publish Pages artifact |
| `id-token` | `write` | OIDC authentication with Pages |
| `contents` | `read` | Checkout source |

No secrets or API keys are required—GitHub Pages deployment uses the built-in `GITHUB_TOKEN`.

### Enabling Pages for the Actions workflow

If you previously configured Pages to **Deploy from a branch** (step 4 above) and now want to use the Actions workflow instead:

1. Go to **Settings → Pages**.
2. Change **Source** from *Deploy from a branch* to **GitHub Actions**.
3. The next push to `main` will trigger `deploy-pages.yml` and publish the `docs/` folder.

> Both methods publish the same `docs/index.html`—choose whichever suits your workflow. The Actions method provides deployment logs and status checks in the **Actions** tab.

---

## Updating the Site

The static site lives in `docs/index.html`. To update it:

```bash
# 1. Edit the file
# e.g., update contract addresses after live deployment
vim docs/index.html

# 2. Commit and push to main
git add docs/index.html
git commit -m "docs: update contract addresses after deployment"
git push origin main
```

After the push, GitHub Pages will rebuild and publish within ~1 minute.

---

## Site URL

Once Pages is enabled:

```
https://slaps6331-cell.github.io/Millionaire-Resilience-LLC-JAH/
```

---

## Relationship to Smart Contract Deployment

GitHub Pages hosts a **static informational website only**. It does not deploy smart contracts. Smart contracts are deployed separately via:

- **GitHub Actions:** `.github/workflows/deploy-contracts.yml` (manual `workflow_dispatch`)
- **CLI:** `npx hardhat run scripts/deploy.cjs --network story` / `--network base`

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) and [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) for full deployment instructions.

After live deployment, update the contract address table in `docs/index.html` with the addresses from `deployment-config.<network>.json`.
