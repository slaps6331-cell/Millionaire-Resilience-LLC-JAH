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
  -F 'pinataMetadata={"name":"UCC-1_Financing_Statement_2024-NM-UCC-0001","keyvalues":{"filing_number":"2024-NM-UCC-0001","jurisdiction":"New Mexico SOS","entity":"Millionaire Resilience LLC"}}' \
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
    "filing_number": "2024-NM-UCC-0001",
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
