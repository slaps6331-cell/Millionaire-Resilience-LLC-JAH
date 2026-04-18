# Pinata IPFS Integration Guide

## UCC-1 Filing & Corporate Document Pinning

---

## Pinata Account Setup

1. Create an account at https://app.pinata.cloud
2. Navigate to **API Keys → New Key**
3. Enable these permissions:
   - ✅ `pinFileToIPFS`
   - ✅ `unpinFiles`
   - ✅ `userPinnedDataTotal`
   - ✅ `userPinList`
4. Copy the generated **API Key**, **Secret**, and **JWT** to GitHub Secrets (see [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md))

### Optional: Dedicated Gateway

For faster, authenticated access to pinned files:

1. Navigate to **Gateways** in Pinata dashboard
2. Create a gateway (e.g., `millionaire-resilience`)
3. Set `PINATA_GATEWAY_NAME` variable to the subdomain (e.g., `millionaire-resilience`)
4. Generate a **Gateway Token** and store it as `PINATA_GATEWAY_TOKEN` secret

Gateway URL format: `https://<subdomain>.mypinata.cloud/ipfs/<CID>`

---

## UCC-1 Document Pinning Process

### Automated (GitHub Actions)

The `pinata-ipfs-sync.yml` workflow runs automatically when files are pushed to `documents/`:

```
documents/
├── ucc-1-financing-statement-2024-nm-0001.pdf   ← Primary UCC-1 filing
├── ucc-1-auxiliary-docs-bundle.zip               ← Auxiliary bundle
├── gladiator-holdings-cert-of-org.pdf
├── mr-articles-of-incorporation.pdf
└── beneficial-owner-id-redacted.pdf
```

### Manual Upload via curl

```bash
PINATA_JWT="YOUR_JWT_HERE"

# Pin UCC-1 primary document
curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -F "file=@documents/ucc-1-financing-statement-2024-nm-0001.pdf" \
  -F 'pinataMetadata={"name":"UCC-1_Financing_Statement_20260000078753","keyvalues":{"filing_number":"20260000078753","jurisdiction":"New Mexico SOS","entity":"Millionaire Resilience LLC"}}' \
  -F 'pinataOptions={"cidVersion":1,"wrapWithDirectory":false}' \
  | jq '.IpfsHash'
```

---

## Pre-Pinned Document CIDs

The following documents have already been pinned and their CIDs are recorded in `deployment-registry.json`:

| Document | CID |
|---|---|
| UCC-1 Filing Record       | `bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a` |
| UCC-1 Financing Statement | `bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu` |
| UCC-1 Auxiliary Bundle | `bafybeidkp74w2idrwkg2qey66uepfaes5ekonxjqt62uztyxawii7yye7y` |
| Gladiator Holdings Cert of Org | `bafybeiba2j4g34bizjjm26qznc2pf4upgotffrcwjtkw6lj3qa6squrzpu` |
| Gladiator Holdings Notice of Filing | `bafkreifbikc26xs2cu2mvsghzlrginwm6icqotdp4ntsvq3sn6h4flrhhm` |
| MR LLC Articles of Incorporation | `bafkreifxiesrze736sxhvsa5op64q6f3ddvv3rismnvd75wi3yfqilu4py` |
| MR LLC EIN Letter | `bafkreihz5zpp33pimzckaey64mht2vezlbzngoxe46urrfctzqvjvsdboe` |
| SLAPS Articles | `bafkreic3n6bdf25tobljqbjxzvzkbch6s7xkqq5yehmyt3zju4de7ey52u` |
| SLAPS EIN Letter | `bafkreifnuwchbvbolmhbgionvsltdi3edzasfqytd4zzqlvu42m5m4jhei` |
| RBW EIN Letter | `bafkreid77fuxwqtwyku5syp3dswmy75rymvxh6v3tf7rfrzqbrizoutxtu` |
| NM SOS Receipt | `bafkreigjsqx6d47sgqwkjxgtt3qrjnoz3hdth4hqk7qnxflqog2ikjs2kq` |
| Beneficial Owner ID (Redacted) | `bafkreie5spkgxxhmafdqylwyfplx37jqhcjrs3es3neasgcnynzgkg5mzi` |
| PatentSight Portfolio Report | `bafkreibxqnmhir5iifpboxdv5ndltm5vnbplso4ndtcuzfnanykudrwdbu` |
| PatentSight MR Analysis | `bafkreihls2yoi265uxzmcmh7wzk2ytyo5yvopmb4jib4blw4nptlchivqm` |
| PatentSight SLAPS Analysis | `bafkreiflmhdsflvv53e24mo2woafdgecpkvfljcbm5heafnzdxzbj5ct4i` |
| IPlytics SEP Declaration | `bafkreiej7wfskl53hxo4j47g55bxjkyyulihovjjtpjvtf264kfoddxc5i` |

---

## Document Structure & Metadata

Every document pinned with the `pin-to-pinata.cjs` script includes Pinata metadata:

```json
{
  "name": "<human-readable document name>",
  "keyvalues": {
    "filing_number": "20260000078753",
    "jurisdiction": "New Mexico Secretary of State",
    "entity": "Millionaire Resilience LLC",
    "document_type": "<type>",
    "filing_date": "<YYYY-MM-DD>"
  }
}
```

---

## CID Tracking & Verification

All CIDs are stored in two places:

1. **`deployment-registry.json`** — updated automatically by the `pinata-ipfs-sync` workflow
2. **`.env.example`** — static reference template

### Verify a CID

```bash
# Via public IPFS gateway
curl -I "https://gateway.pinata.cloud/ipfs/<CID>"

# Via dedicated gateway (if configured)
curl -I "https://YOUR_SUBDOMAIN.mypinata.cloud/ipfs/<CID>"

# Via Pinata API
curl -H "Authorization: Bearer $PINATA_JWT" \
  "https://api.pinata.cloud/data/pinList?hashContains=<CID>" \
  | jq '.rows[0]'
```

### Check Pin Status

```bash
curl -H "Authorization: Bearer $PINATA_JWT" \
  "https://api.pinata.cloud/data/userPinnedDataTotal" \
  | jq '.'
```

---

## Metadata Updates for Morpho Protocol, Basescan & StoryScan Verification

When deploying contracts, the following metadata must be pinned/updated on Pinata for on-chain verification on Basescan and StoryScan.

### ABI Proof Pinning

After compilation, the ABI proof must be pinned for contract verification:

```bash
# Generate ABI proof
node scripts/export-abi-proof.cjs

# Pin to Pinata
curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -F "file=@abi-proof.json" \
  -F 'pinataMetadata={"name":"ABI_Proof_12_Contracts","keyvalues":{"version":"3of5-multisig","contracts":"12","networks":"story-1514,base-8453","safe_address":"0xd314BE0a27c73Cd057308aC4f3dd472c482acc09"}}' \
  | jq '.IpfsHash'
```

Current ABI proof CID: `bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay`

### Valuation Attestation Pinning

Pin the valuation attestation for Morpho Protocol market validation:

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "pinataContent": '"$(cat valuation-attestation.json)"',
    "pinataMetadata": {
      "name": "Valuation_Attestation_MR_SLAPS",
      "keyvalues": {
        "hermetic_seal": "0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413",
        "total_valuation_usd": "300000000",
        "morpho_blue": "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
        "multisig_threshold": "3-of-5"
      }
    }
  }' | jq '.IpfsHash'
```

### Multi-Sig Configuration Pinning

Pin the 3-of-5 multi-sig configuration for Morpho Protocol authorization:

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "pinataContent": '"$(cat signature-morpho-config.json)"',
    "pinataMetadata": {
      "name": "Morpho_3of5_MultiSig_Config",
      "keyvalues": {
        "safe_address": "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09",
        "threshold": "3",
        "signers": "5",
        "eip191_hash": "0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb"
      }
    }
  }' | jq '.IpfsHash'
```

### Deployment Registry Pinning (Post-Deployment)

After contracts are deployed, pin the deployment registry for permanent on-chain reference:

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "pinataContent": '"$(cat deployment-registry.json)"',
    "pinataMetadata": {
      "name": "Deployment_Registry_Story_Base",
      "keyvalues": {
        "story_chain": "1514",
        "base_chain": "8453",
        "contract_count": "12",
        "ucc1_filing": "20260000078753"
      }
    }
  }' | jq '.IpfsHash'
```

### StoryScan Registration Metadata

For StoryScan IP asset registration, the following metadata is required:

```bash
# Pin IPA metadata for Story Protocol registration
for metadata in archive/metadata-json/*IPAMetadata.json; do
  NAME=$(basename "$metadata" .json)
  curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
    -H "Authorization: Bearer $PINATA_JWT" \
    -F "file=@$metadata" \
    -F "pinataMetadata={\"name\":\"$NAME\",\"keyvalues\":{\"protocol\":\"story\",\"chain\":\"1514\"}}" \
    | jq '.IpfsHash'
done
```

### Basescan Verification Metadata

For Basescan contract verification, the ABI proof is referenced during the `hardhat verify` step. Ensure the ABI proof CID is accessible:

```bash
# Verify ABI proof is accessible via gateway
curl -s -o /dev/null -w "%{http_code}" \
  "https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay"
# Expected: 200
```
