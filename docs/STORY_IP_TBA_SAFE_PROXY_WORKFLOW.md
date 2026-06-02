# Story IP ► ERC-6551 TBA ► Safe Proxy Factory ► Morpho Workflow

**Repo scope**: slaps6331-cell · millionaire-resilience-llc · dash-resilience-llc-JAH
**Status**: Ready for MetaMask (Brave) execution — no private key required in this pod
**Owner of all signing wallets**: Clifton Kelly Bell

---

## 0. Canonical Addresses (multichain — same on Story 1514 & Base 8453)

| Component | Address |
|---|---|
| ERC-6551 Registry (official) | `0x000000006551c19487814612e58FE06813775758` |
| ERC-6551 Account Implementation (Tokenbound default) | `0x55266d75D1a14E4572138116aF39863Ed6596E7F` |
| Safe Proxy Factory (v1.4.1) | `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67` |
| Safe Singleton (v1.4.1) | `0x41675C099F32341bf84BFc5382aF534df5C7461a` |
| Morpho Blue (Base) | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |
| Story IP Asset Registry | `0x77319B4031e6eF1250907aa00018B8B1c67a244b` |
| **Story IP-Asset NFT (MR)** | `0x98971c660ac20880b60F86Cc3113eBd979eb3aAE` · tokenId **15192** |
| **Story IP ID** | `0xD22750Ca1C3Cd1f7B18a2c70Af98914c291d632F` |
| **story.foundation onboarding addr** | `0x597856e93f19877a399f686D2F43b298e2268618` |

---

## Step 1 · Permissionless IP Registration (already complete ✅)

- Story IP Asset is already registered: IP ID `0xD22750Ca1C3Cd1f7B18a2c70Af98914c291d632F`, tokenId `15192`.
- Owner: `0x5EEFF17e12401b6A8391f5257758E07c157E1e45` (Story Deployer · Clifton Kelly Bell).

If re-registering a new derivative IP:
```
to:     0x77319B4031e6eF1250907aa00018B8B1c67a244b   (IPAssetRegistry, Story 1514)
method: register(uint256 chainId, address tokenContract, uint256 tokenId)
```

---

## Step 2 · Create the ERC-6551 Token Bound Account for the IP NFT

**Network**: Story Mainnet (chainId 1514) — connect Brave + MetaMask to Story RPC `https://mainnet.storyrpc.io`

**Transaction**:
```
to:     0x000000006551c19487814612e58FE06813775758
method: createAccount(address implementation,uint256 chainId,address tokenContract,uint256 tokenId,uint256 salt,bytes initData)
args:
  implementation = 0x55266d75D1a14E4572138116aF39863Ed6596E7F
  chainId        = 1514
  tokenContract  = 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE
  tokenId        = 15192
  salt           = 0
  initData       = 0x
```

After mining, **read** the deterministic TBA address by calling the same registry's
`account(impl, chainId, tokenContract, tokenId, salt)` view. Record the result as `TBA_ADDRESS`.

> ⚠️ Save tx hash → `deployment-registry.json → contracts.ERC6551_TBA_tx`

---

## Step 3 · Deploy a Gnosis Safe Proxy owned by the TBA

**Network**: Story 1514 (or duplicate on Base 8453 for cross-chain control)

**3a. Build the Safe setup() initializer** (off-chain — already provided in `scripts/build-tba-safe-payload.cjs`):

```solidity
Safe.setup(
  _owners          = [TBA_ADDRESS],
  _threshold       = 1,
  to               = address(0),
  data             = 0x,
  fallbackHandler  = address(0),
  paymentToken     = address(0),
  payment          = 0,
  paymentReceiver  = address(0)
)
```

**3b. Submit to SafeProxyFactory**:
```
to:     0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67
method: createProxyWithNonce(address singleton,bytes initializer,uint256 saltNonce)
args:
  singleton  = 0x41675C099F32341bf84BFc5382aF534df5C7461a
  initializer= <setup() calldata from step 3a>
  saltNonce  = <unix epoch ms>
```

Capture the `ProxyCreation` event → `SAFE_PROXY_ADDRESS`.

**3c. Fund the proxy**: send 0.05 IP (Story) or 0.005 ETH (Base) to `SAFE_PROXY_ADDRESS` for downstream gas.

> ⚠️ Save tx hash → `deployment-registry.json → contracts.SafeProxy_IP_owned_tx`

---

## Step 4 · Deploy Derivative Contracts Owned by the IP-Safe

Compile each derivative contract with the TBA hardcoded as royalty receiver:

```solidity
receive() external payable {
    uint256 royaltyShare = (msg.value * royaltyPercentage) / 10000;
    (bool ok, ) = TBA_ADDRESS.call{value: royaltyShare}("");
    require(ok, "Royalty distribution failed");
}
```

Then deploy via the Safe:
```
Safe.execTransaction(
  to     = address(0),                            // CREATE
  value  = 0,
  data   = <init code + constructor args>,
  operation = 0,
  ...
)
```

Verify each new contract: `derivative.owner() == SAFE_PROXY_ADDRESS` ✓

---

## Step 5 · Verify on Block Explorers and Save Hashes

| Action | Explorer URL Template |
|---|---|
| Verify TBA contract | `https://www.storyscan.io/address/<TBA>` |
| Verify Safe Proxy   | `https://www.storyscan.io/address/<SAFE_PROXY>` |
| Verify Base mirror  | `https://basescan.org/address/<addr>` |
| Save tx hash        | append to `deployment-registry.json.hashes.deployment` |

Run `npm run contracts:verify:story` and `npm run contracts:verify:base` after each tx.

---

## Step 6 · Deposit / Lock the Registered IP on Story Protocol

> Story Protocol IP deposit/lock requires manual KYC review (admin or oracle).
> The deposit creates a *claim* — tokens are not auto-released until the IP claim
> is approved.

1. Approve the IPAssetRegistry to custody your IP NFT:
   ```
   StoryIPNFT(0x98971c...3aAE).approve(IPAssetRegistry, 15192)
   ```
2. Submit deposit-lock:
   ```
   IPAssetRegistry.lockIP(ipId = 0xD22750Ca...d632F)
   ```
3. Wait for KYC verification (out-of-band — admin/oracle review).
4. Claim issued tokens once approval is granted:
   ```
   IPAssetRegistry.claim(ipId, recipient = SAFE_PROXY_ADDRESS)
   ```

> ⚠️ Save **all** receipts: deposit tx, KYC ticket id, claim tx, claimed-token tx
> → `deployment-registry.json → ipAsset.deposit` (create this object).

---

## Step 7 · Morpho Protocol Onboarding (story.foundation co-signer)

**Network**: Base L2 (8453)

```
to:     0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb  (Morpho Blue)
method: setAuthorization(address authorized, bool isAuthorized)
args:
  authorized   = 0x597856e93f19877a399f686D2F43b298e2268618   (story.foundation)
  isAuthorized = true
```

Submit from the Safe Proxy (`0xd314BE0a27c73Cd057308aC4f3dd472c482acc09`) — the 3-of-5
quorum has already been signed and pinned (see `signature-morpho-config.json`,
EIP-191 hash `0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb`).

Repeat the call to also authorize the IP-Safe (`SAFE_PROXY_ADDRESS` from step 3) so
the IP-asset itself can supply BTC / ETH collateral and borrow USDC against the
$6M loan (BTC $5M @ 4% / 24mo + ETH $1M @ 6% / 18mo).

> ⚠️ Save tx hash → `deployment-registry.json → verification.morpho-validated = true`

---

## Step 8 · Royalty Vesting Rules (admin-reviewed)

In each derivative contract's storage, set:

```solidity
struct VestingRule {
  uint256 cliffMonths;        // e.g. 6
  uint256 vestingMonths;      // e.g. 24
  uint16  royaltyBps;         // e.g. 1000 = 10%
  address beneficiaryTBA;     // = Story IP TBA
}
```

These rules are written by the Safe (3-of-5 multisig) and require off-chain admin
review/KYC before activation — matching Story Protocol's custody policy.

---

## Step 9 · Brave Browser ► MetaMask Signing Checklist

1. Open Brave, install MetaMask if not present.
2. Add Story Mainnet network:
   - RPC URL: `https://mainnet.storyrpc.io`
   - ChainId: `1514`
   - Symbol: `IP`
   - Explorer: `https://www.storyscan.io`
3. Add Base mainnet (built-in).
4. Connect the wallet that owns Story IP NFT (`0x5EEFF...1e45`).
5. Run `node scripts/build-tba-safe-payload.cjs` → produces `tba-safe-payloads.json`.
6. For each step (1–7), paste `to`, `data` into MetaMask's "Send Transaction"
   (Advanced → custom data). Confirm gas. Submit.
7. Save every tx hash into `deployment-registry.json`.

---

## Step 10 · Pin Updated Artifacts to Pinata

```
node scripts/pin-to-pinata.cjs contracts/StoryIPTokenBoundAccount.sol "Story IP ERC-6551 TBA"
node scripts/pin-to-pinata.cjs contracts/StoryIPSafeProxyFactory.sol "Story IP Safe Proxy Factory"
node scripts/pin-to-pinata.cjs docs/STORY_IP_TBA_SAFE_PROXY_WORKFLOW.md "TBA/Safe Workflow Doc"
node scripts/pin-to-pinata.cjs tba-safe-payloads.json "TBA/Safe/Morpho Calldata Payloads"
```

Append each returned CID to `ipfs-pin-manifest.json → pins`.

---

### Architectural Map (recap)

```
[Story IP-Asset NFT  0x9897…3aAE / tokenId 15192]
                │
                │  ERC-6551.createAccount()
                ▼
[Token Bound Account (TBA)  — sovereign on-chain identity for the IP]
                │
                │  appointed as 1-of-1 owner via Safe.setup()
                ▼
[Gnosis Safe Proxy  — multi-sig executor for the IP]
                │
                │  Safe.execTransaction(CREATE …)
                ▼
[Derivative Contracts — hardcoded royalty → TBA → IP NFT owner]
                │
                │  setAuthorization(story.foundation, true)
                ▼
[Morpho Blue on Base — $6M USDC loan (BTC + ETH collateral)]
```
