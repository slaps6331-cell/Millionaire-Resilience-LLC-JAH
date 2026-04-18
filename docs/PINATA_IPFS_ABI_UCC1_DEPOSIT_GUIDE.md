# Pinata IPFS Deposit Guide: ABI Proof & UCC-1 Metadata for Blockchain Verification

Comprehensive step-by-step guide for depositing ABI bytecode proof and UCC-1 financing statement metadata into Pinata IPFS storage, formatted for StoryScan, Basescan, and Morpho Protocol verification.

---

## Table of Contents

1. [Overview: What Gets Pinned and Why](#1-overview-what-gets-pinned-and-why)
2. [Compatible Applications for Pinata IPFS Upload](#2-compatible-applications-for-pinata-ipfs-upload)
3. [ABI Proof JSON Format (StoryScan & Basescan)](#3-abi-proof-json-format-storyscan--basescan)
4. [UCC-1 Filing Metadata Format (Morpho Protocol)](#4-ucc-1-filing-metadata-format-morpho-protocol)
5. [Pinata Upload Envelope Format](#5-pinata-upload-envelope-format)
6. [Step-by-Step: Generate and Pin ABI Proof](#6-step-by-step-generate-and-pin-abi-proof)
7. [Step-by-Step: Generate and Pin UCC-1 Metadata](#7-step-by-step-generate-and-pin-ucc-1-metadata)
8. [StoryScan Verification Rules & Requirements](#8-storyscan-verification-rules--requirements)
9. [Basescan Verification Rules & Requirements](#9-basescan-verification-rules--requirements)
10. [Morpho Protocol Verification Requirements](#10-morpho-protocol-verification-requirements)
11. [File Layout: How Metadata Sits in the JSON](#11-file-layout-how-metadata-sits-in-the-json)
12. [GitHub Secrets Format Rules](#12-github-secrets-format-rules)
13. [Verification Checklist](#13-verification-checklist)

---

## 1. Overview: What Gets Pinned and Why

| Document | Purpose | Consumers |
|---|---|---|
| **ABI Proof** (`abi-proof.json`) | Proves contract bytecode integrity and compilation settings | StoryScan, Basescan, auditors |
| **UCC-1 Filing Metadata** | Links legal financing statement to on-chain collateral | Morpho Protocol, Story Protocol IP Registry |
| **Valuation Attestation** | Cryptographic seal over IP portfolio valuation | Morpho market configuration |
| **Multi-Sig Config** | 3-of-5 Safe wallet configuration for authorization | Morpho Protocol authorization |
| **Deployment Registry** | Deployed contract addresses and verification status | All verifiers |

---

## 2. Compatible Applications for Pinata IPFS Upload

### Recommended (Best Compatibility)

| Application | Method | Best For |
|---|---|---|
| **Pinata Web App** | Browser upload at https://app.pinata.cloud | Manual one-off uploads, small files |
| **Pinata API (curl)** | REST API via command line | Automated CI/CD, scripted uploads |
| **Node.js script** (`pin-to-pinata.cjs`) | Custom script in this repo | ABI proof + metadata with proper keyvalues |
| **IPFS Desktop** | Pin locally, then remote pin to Pinata | Large files, offline preparation |
| **Filebase** | S3-compatible IPFS pinning | Teams familiar with AWS S3 |

### Also Compatible

| Application | Notes |
|---|---|
| **web3.storage** | Free tier, W3UP protocol — CIDs compatible with Pinata gateways |
| **Infura IPFS** | REST API similar to Pinata — same CID output |
| **Fleek** | Deploy + IPFS pin in one step — good for docs sites |
| **Thirdweb Storage** | SDK-based upload — integrates well with Hardhat projects |
| **Brave Browser IPFS** | Built-in IPFS node — can pin locally then replicate |

### NOT Recommended

| Application | Reason |
|---|---|
| Generic file hosts (Dropbox, GDrive) | Not content-addressable, URLs change |
| Regular HTTP uploads | No CID guarantee, no permanent addressing |
| Centralized JSON APIs without pinning | Content may be garbage-collected |

### Why Pinata is Optimal

1. **Dedicated gateway** (`lavender-neat-urial-76.mypinata.cloud`) — fast, authenticated access
2. **Metadata tagging** (`keyvalues`) — searchable by filing number, jurisdiction, contract name
3. **Guaranteed persistence** — paid pinning ensures content is never garbage-collected
4. **CIDv1 support** — Base32 CIDs compatible with all IPFS gateways and block explorers

---

## 3. ABI Proof JSON Format (StoryScan & Basescan)

This is the exact format expected by StoryScan and Basescan verification systems. The `export-abi-proof.cjs` script in this repo generates it automatically.

```json
{
  "$schema": "https://docs.story.foundation/abi-proof-schema.json",
  "version": "1.0.0",
  "generatedAt": "2026-04-13T00:00:00.000Z",
  "entity": "Gladiator Holdings LLC / Millionaire Resilience LLC",

  "compilationConfig": {
    "solcVersion": "0.8.26",
    "evmVersion": "cancun",
    "viaIR": true,
    "optimizer": { "enabled": true, "runs": 200 },
    "optimizerOverrides": {
      "StoryAttestationService": { "runs": 1 }
    },
    "contractCount": 12,
    "compiledCount": 12,
    "missingCount": 0
  },

  "contracts": {
    "StoryAttestationService": {
      "status": "COMPILED",
      "chainId": 1514,
      "network": "Story Protocol Mainnet",
      "abi": [ "..." ],
      "bytecode": "0x608060...",
      "deployedBytecode": "0x608060...",
      "bytecodeKeccak256": "0x...",
      "deployedBytecodeKeccak256": "0x...",
      "abiSha256": "0x...",
      "abiKeccak256": "0x...",
      "deployedBytecodeSha256": "0x...",
      "deployedBytecodeSize": 23500,
      "deployedBytecodeSizeNote": "1,076 bytes under EVM 24,576-byte limit",
      "storyScanAddress": null,
      "storyScanUrl": null,
      "verificationStatus": "PENDING_DEPLOYMENT"
    },
    "StoryOrchestrationService": { "..." },
    "StoryAttestationBridge": { "..." },
    "SLAPSIPSpvLoan": { "..." },
    "GladiatorHoldingsSpvLoan": { "..." },
    "PILLoanEnforcement": { "..." },
    "StablecoinIPEscrow": { "..." },
    "AngelCoin": { "..." },
    "ResilienceToken": { "..." },
    "SlapsStreaming": { "..." },
    "SlapsSPV": { "..." },
    "UCC1FilingIntegration": { "..." }
  },

  "ipfsDocuments": {
    "ucc1Filing": {
      "cid": "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",
      "url": "https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",
      "status": "PINNED",
      "pinService": "Pinata"
    },
    "ucc1FinancingStatement": {
      "cid": "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu",
      "url": "https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu",
      "status": "PINNED",
      "pinService": "Pinata"
    },
    "abiProof": {
      "cid": "bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay",
      "url": "https://lavender-neat-urial-76.mypinata.cloud/ipfs/bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay",
      "status": "PINNED",
      "pinService": "Pinata"
    }
  }
}
```

### Key Requirements

- **No quotes around hex values in JSON** — `"0x608060..."` is the correct JSON format (string containing hex)
- **Hashes must be keccak256** for bytecode (EVM standard: `ethers.keccak256(bytecode)`)
- **ABI should be SHA-256** hashed for document integrity: `crypto.createHash('sha256').update(JSON.stringify(abi)).digest('hex')`
- **Include `deployedBytecodeSize`** to verify EVM limit (must be < 24,576 bytes)
- **`viaIR: true`** must be set — this repo uses IR-based codegen

---

## 4. UCC-1 Filing Metadata Format (Morpho Protocol)

This is the document structure for the UCC-1 financing statement that gets pinned for Morpho Protocol collateral verification.

```json
{
  "documentMetadata": {
    "type": "UCC-1-FILING-SMART-CONTRACT-INTEGRATION",
    "version": "2.0.0",
    "timestamp": "2026-03-26T00:00:00Z",
    "jurisdiction": "NEW_MEXICO_SECRETARY_OF_STATE"
  },

  "ucc1FilingStatement": {
    "filingNumber": "20260000078753",
    "filingDate": "2026-03-26",
    "debtors": [
      {
        "name": "Millionaire Resilience LLC",
        "ein": "41-3789881",
        "address": "New Mexico",
        "blockchainAddress": "0x5EEFF17e12401b6A8391f5257758E07c157E1e45"
      },
      {
        "name": "Slaps Streaming LLC",
        "ein": "41-4045773",
        "address": "New Mexico",
        "blockchainAddress": "0x5EEFF17e12401b6A8391f5257758E07c157E1e45"
      }
    ],
    "securedParty": {
      "name": "Gladiator Holdings LLC",
      "entityId": "0008034162",
      "address": "New Mexico",
      "blockchainAddress": "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"
    },
    "collateral": {
      "type": "BLOCKCHAIN_SMART_CONTRACTS_AND_IP",
      "networks": ["Story Protocol (Chain 1514)", "Base (Chain 8453)"],
      "description": "All intellectual property, patent portfolios, SEP declarations, streaming revenue, and deployed smart contracts"
    }
  },

  "smartContractCollateral": {
    "safeContract": "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09",
    "multisigThreshold": "3-of-5",
    "deployedContracts": [
      {
        "contractName": "StoryAttestationService",
        "chainId": 1514,
        "network": "Story Protocol Mainnet",
        "explorer": "https://www.storyscan.io"
      },
      {
        "contractName": "StoryOrchestrationService",
        "chainId": 1514,
        "network": "Story Protocol Mainnet",
        "explorer": "https://www.storyscan.io"
      },
      {
        "contractName": "UCC1FilingIntegration",
        "chainId": 1514,
        "network": "Story Protocol Mainnet",
        "explorer": "https://www.storyscan.io"
      },
      {
        "contractName": "SLAPSIPSpvLoan",
        "chainId": 8453,
        "network": "Base L2",
        "explorer": "https://basescan.org"
      },
      {
        "contractName": "GladiatorHoldingsSpvLoan",
        "chainId": 8453,
        "network": "Base L2",
        "explorer": "https://basescan.org"
      },
      {
        "contractName": "StablecoinIPEscrow",
        "chainId": 8453,
        "network": "Base L2",
        "explorer": "https://basescan.org"
      }
    ]
  },

  "morphoProtocol": {
    "morphoBlue": "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
    "baseUSDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "markets": {
      "BTC": { "principal_USD": 5000000, "apr_bps": 400, "lltv": "860000000000000000" },
      "ETH": { "principal_USD": 1000000, "apr_bps": 600, "lltv": "860000000000000000" }
    },
    "eip191Hash": "0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb",
    "hermeticSealHash": "0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413"
  },

  "ipfsReferences": {
    "ucc1Filing": "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",
    "ucc1FinancingStatement": "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu",
    "ucc1AuxiliaryDocs": "bafybeidkp74w2idrwkg2qey66uepfaes5ekonxjqt62uztyxawii7yye7y",
    "abiProof": "bafkreidlihfltbmbcfnq6uiupwod4rgmferre4v2o3edbi5gsst3gytpay"
  }
}
```

---

## 5. Pinata Upload Envelope Format

When uploading to Pinata via the API, your request must wrap the content in this envelope:

```json
{
  "pinataContent": {
    "...your document JSON goes here..."
  },
  "pinataMetadata": {
    "name": "UCC1-Filing-20260000078753-NM-SOS",
    "keyvalues": {
      "documentType": "UCC-1 Financing Statement",
      "filingNumber": "20260000078753",
      "jurisdiction": "NEW_MEXICO",
      "networks": "Story_1514,Base_8453",
      "status": "FILED",
      "safeAddress": "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09",
      "threshold": "3-of-5"
    }
  },
  "pinataOptions": {
    "cidVersion": 1,
    "wrapWithDirectory": false
  }
}
```

### Critical Rules for `keyvalues`

- All values must be **flat strings** — no nested objects, no arrays, no numbers
- Maximum 10 key-value pairs per pin
- Key names: max 255 characters
- Values: max 255 characters each
- No special characters in keys (use underscores, not hyphens)

---

## 6. Step-by-Step: Generate and Pin ABI Proof

### Step 1: Compile All 12 Contracts

```bash
cd Millionaire-Resilience-LLC-JAH
npm install --legacy-peer-deps
npx hardhat compile --force
```

### Step 2: Generate ABI Proof

```bash
node scripts/export-abi-proof.cjs
```

This reads `artifacts/contracts/*/` and produces `abi-proof.json` with:
- Full ABI arrays for each contract
- Creation bytecode and deployed bytecode (hex strings)
- `keccak256` hashes of both bytecodes
- `SHA-256` hash of the ABI JSON
- `deployedBytecodeSize` (bytes) with EVM limit check

### Step 3: Verify the Proof Locally

```bash
# Check bytecode size for each contract
node -e "
const proof = require('./abi-proof.json');
for (const [name, data] of Object.entries(proof.contracts)) {
  if (data.status === 'COMPILED') {
    const size = data.deployedBytecodeSize;
    const status = size < 24576 ? 'OK' : 'EXCEEDS LIMIT';
    console.log(name.padEnd(35), size, 'bytes', status);
  }
}
"
```

### Step 4: Pin to Pinata IPFS

**Method A: Using the repo's built-in script**

```bash
export PINATA_JWT="YOUR_JWT_HERE"
export PINATA_GATEWAY_NAME="lavender-neat-urial-76"

node scripts/pin-to-pinata.cjs abi-proof.json "ABI_Proof_12_Contracts_v1"
```

Output: `abi-proof-pin.json` containing `{ cid, url, name, size, pinnedAt }`

**Method B: Using curl**

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -F "file=@abi-proof.json" \
  -F 'pinataMetadata={"name":"ABI_Proof_12_Contracts","keyvalues":{"documentType":"ABI_BYTECODE_PROOF","contractCount":"12","solcVersion":"0.8.26","evmVersion":"cancun","viaIR":"true","optimizerRuns":"200","networks":"Story_1514,Base_8453"}}' \
  -F 'pinataOptions={"cidVersion":1}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('CID:', d['IpfsHash']); print('URL: https://lavender-neat-urial-76.mypinata.cloud/ipfs/' + d['IpfsHash'])"
```

**Method C: Pinata Web App**

1. Go to https://app.pinata.cloud > **Files** > **Upload** > **File**
2. Select `abi-proof.json`
3. Name: `ABI_Proof_12_Contracts`
4. Add metadata keys manually (documentType, contractCount, etc.)
5. Click **Upload**

### Step 5: Record the CID

Update `.env` or GitHub variable with the new CID:
```bash
gh variable set IPFS_ABI_PROOF_CID --body "NEW_CID_HERE" --repo slaps6331-cell/Millionaire-Resilience-LLC-JAH
```

---

## 7. Step-by-Step: Generate and Pin UCC-1 Metadata

### Step 1: Prepare the UCC-1 Document

The UCC-1 metadata is pre-configured in the repo. Generate the full document:

```bash
node scripts/record-ucc1-filing.cjs
```

Or construct manually following the format in Section 4 above.

### Step 2: Pin UCC-1 Filing to Pinata

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "pinataContent": {
      "documentMetadata": {
        "type": "UCC-1-FILING-SMART-CONTRACT-INTEGRATION",
        "version": "2.0.0",
        "timestamp": "2026-03-26T00:00:00Z",
        "jurisdiction": "NEW_MEXICO_SECRETARY_OF_STATE"
      },
      "ucc1FilingStatement": {
        "filingNumber": "20260000078753",
        "filingDate": "2026-03-26",
        "securedParty": {
          "name": "Gladiator Holdings LLC",
          "blockchainAddress": "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a"
        },
        "collateral": {
          "type": "BLOCKCHAIN_SMART_CONTRACTS_AND_IP",
          "networks": ["Story Protocol (Chain 1514)", "Base (Chain 8453)"]
        }
      },
      "morphoProtocol": {
        "morphoBlue": "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
        "eip191Hash": "0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb",
        "hermeticSealHash": "0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413",
        "safeContract": "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09"
      }
    },
    "pinataMetadata": {
      "name": "UCC1_Filing_20260000078753_Morpho_Integration",
      "keyvalues": {
        "documentType": "UCC-1_FINANCING_STATEMENT",
        "filingNumber": "20260000078753",
        "jurisdiction": "NEW_MEXICO",
        "safeAddress": "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09",
        "morphoBlue": "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
        "status": "FILED"
      }
    }
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('CID:', d['IpfsHash'])"
```

---

## 8. StoryScan Verification Rules & Requirements

StoryScan (Story Protocol Chain 1514) follows the Etherscan verification standard.

| Requirement | Value for This Repo |
|---|---|
| Contract Address | Deployed address (from `deployment-config.story.json`) |
| Compiler Version | `v0.8.26+commit.8a97fa7a` |
| Optimization | Enabled, 200 runs (1 run for StoryAttestationService) |
| EVM Version | `cancun` |
| Via IR | `true` |
| License | MIT |
| Constructor Args | `0x` (empty — all contracts have no-arg constructors) |
| Source Format | Standard JSON Input (recommended) or Flattened Solidity |

### StoryScan API Call

```bash
curl -X POST "https://www.storyscan.io/api" \
  -d "module=contract" \
  -d "action=verifysourcecode" \
  -d "contractaddress=CONTRACT_ADDRESS_HERE" \
  -d "sourceCode=$(cat artifacts/build-info/*.json | python3 -c 'import sys,json; print(json.dumps(json.load(sys.stdin)[\"input\"]))')" \
  -d "codeformat=solidity-standard-json-input" \
  -d "contractname=contracts/StoryAttestationService.sol:StoryAttestationService" \
  -d "compilerversion=v0.8.26+commit.8a97fa7a" \
  -d "optimizationUsed=1" \
  -d "runs=1" \
  -d "evmversion=cancun" \
  -d "apikey=$STORYSCAN_API_KEY"
```

### Automated Verification (Hardhat Plugin)

```bash
STORYSCAN_API_KEY=YOUR_KEY npx hardhat verify --network story CONTRACT_ADDRESS
```

---

## 9. Basescan Verification Rules & Requirements

Basescan (Base Chain 8453) uses the standard Etherscan API.

| Requirement | Value for This Repo |
|---|---|
| Contract Address | Deployed address (from `deployment-config.base.json`) |
| Compiler Version | `v0.8.26+commit.8a97fa7a` |
| Optimization | Enabled, 200 runs |
| EVM Version | `cancun` |
| Via IR | `true` |
| License | MIT |
| Constructor Args | `0x` (empty) |

### Basescan API Call

```bash
curl -X POST "https://api.basescan.org/api" \
  -d "module=contract" \
  -d "action=verifysourcecode" \
  -d "contractaddress=CONTRACT_ADDRESS_HERE" \
  -d "sourceCode=$(cat artifacts/build-info/*.json | python3 -c 'import sys,json; print(json.dumps(json.load(sys.stdin)[\"input\"]))')" \
  -d "codeformat=solidity-standard-json-input" \
  -d "contractname=contracts/StoryAttestationService.sol:StoryAttestationService" \
  -d "compilerversion=v0.8.26+commit.8a97fa7a" \
  -d "optimizationUsed=1" \
  -d "runs=200" \
  -d "evmversion=cancun" \
  -d "apikey=$ETHERSCAN_API_KEY"
```

---

## 10. Morpho Protocol Verification Requirements

Morpho Protocol requires the following for market authorization:

1. **EIP-191 signature** from 3-of-5 Safe owners on the authorization hash
2. **UCC-1 filing** pinned to IPFS proving legal perfection of collateral interest
3. **ABI proof** confirming contract integrity
4. **Hermetic seal hash** over the entire attestation chain

| Field | Value |
|---|---|
| Morpho Blue contract | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |
| Base USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| EIP-191 Hash | `0x602b1b4f5a2e8bfa60aec337688b21fdccbfef6a21befe412133ddac9a2c04fb` |
| Hermetic Seal | `0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413` |
| Safe Contract | `0xd314BE0a27c73Cd057308aC4f3dd472c482acc09` |
| Threshold | 3 of 5 |
| UCC-1 Filing CID | `bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a` |
| UCC-1 Financing CID | `bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu` |

---

## 11. File Layout: How Metadata Sits in the JSON

### ABI Proof (`abi-proof.json`) Layout

```
abi-proof.json
|
+-- $schema                    "https://docs.story.foundation/abi-proof-schema.json"
+-- version                    "1.0.0"
+-- generatedAt                ISO 8601 timestamp
+-- entity                     "Gladiator Holdings LLC / Millionaire Resilience LLC"
|
+-- compilationConfig
|   +-- solcVersion            "0.8.26"
|   +-- evmVersion             "cancun"
|   +-- viaIR                  true
|   +-- optimizer.enabled      true
|   +-- optimizer.runs         200
|   +-- optimizerOverrides     { StoryAttestationService: { runs: 1 } }
|
+-- contracts
|   +-- [ContractName]
|       +-- status             "COMPILED"
|       +-- chainId            1514 or 8453
|       +-- abi                [...] (full ABI array)
|       +-- bytecode           "0x608060..." (creation bytecode, hex string)
|       +-- deployedBytecode   "0x608060..." (runtime bytecode, hex string)
|       +-- bytecodeKeccak256  "0x..." (keccak256 of creation bytecode)
|       +-- deployedBytecodeKeccak256  "0x..." (keccak256 of runtime bytecode)
|       +-- abiSha256          "0x..." (SHA-256 of JSON.stringify(abi))
|       +-- deployedBytecodeSize  number (must be < 24576)
|
+-- ipfsDocuments
|   +-- [documentKey]
|       +-- cid                "bafkrei..."
|       +-- url                "https://lavender-neat-urial-76.mypinata.cloud/ipfs/..."
|       +-- status             "PINNED"
|       +-- pinService         "Pinata"
|
+-- verificationInstructions   [...] (array of step strings)
```

### UCC-1 Metadata Layout

```
ucc1-metadata.json
|
+-- documentMetadata
|   +-- type                   "UCC-1-FILING-SMART-CONTRACT-INTEGRATION"
|   +-- version                "2.0.0"
|   +-- timestamp              ISO 8601
|   +-- jurisdiction           "NEW_MEXICO_SECRETARY_OF_STATE"
|
+-- ucc1FilingStatement
|   +-- filingNumber           "20260000078753"
|   +-- filingDate             "2026-03-26"
|   +-- debtors                [...] (array of debtor objects)
|   +-- securedParty           { name, entityId, blockchainAddress }
|   +-- collateral             { type, networks, description }
|
+-- smartContractCollateral
|   +-- safeContract           "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09"
|   +-- multisigThreshold      "3-of-5"
|   +-- deployedContracts      [...] (array with contractName, chainId, explorer)
|
+-- morphoProtocol
|   +-- morphoBlue             "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"
|   +-- eip191Hash             "0x602b1b4f..." (the hash signers must sign)
|   +-- hermeticSealHash       "0xed4bd3b5..." (seals entire attestation chain)
|   +-- safeContract           "0xd314BE0a..." (3-of-5 Gnosis Safe)
|
+-- ipfsReferences
    +-- ucc1Filing             "bafkrei..." (CID of the original filing)
    +-- ucc1FinancingStatement "bafkrei..." (CID of the financing statement)
    +-- abiProof               "bafkrei..." (CID of the ABI proof)
```

---

## 12. GitHub Secrets Format Rules

| Secret | Format | Wrong | Correct |
|---|---|---|---|
| Private Key | Plain hex, 64 chars | `"0xabc..."` with quotes | `0xabc123...def456` |
| API Keys | Plain string | `"ABC123"` with quotes | `ABC123` |
| IPFS CIDs | Plain string | `"bafkrei..."` with quotes | `bafkrei...` |
| JWT Tokens | Plain string | `"eyJ..."` with quotes | `eyJ...` |
| URLs | Plain URL | `"https://..."` | `https://...` |

**NO QUOTES in GitHub Secrets** — paste the raw value only.

**NO QUOTES around hex values in JSON files** — but the JSON string delimiters (`"0x..."`) are correct JSON syntax. The hex value itself has no extra quoting.

---

## 13. Verification Checklist

| Step | Action | Tool | Output |
|---|---|---|---|
| 1 | Compile with exact settings | `npx hardhat compile --force` | `artifacts/` directory |
| 2 | Generate ABI proof | `node scripts/export-abi-proof.cjs` | `abi-proof.json` |
| 3 | Verify bytecode sizes | Check `deployedBytecodeSize < 24576` | Console output |
| 4 | Pin ABI proof to Pinata | `node scripts/pin-to-pinata.cjs abi-proof.json` | CID |
| 5 | Deploy contracts | `npm run contracts:deploy:story` | `deployment-config.story.json` |
| 6 | Wait 2+ confirmations | Automatic | Block confirmation |
| 7 | Verify on StoryScan | `npm run contracts:verify:story` | "Verified" status |
| 8 | Verify on Basescan | `npm run contracts:verify:base` | "Verified" status |
| 9 | Pin UCC-1 metadata | curl to Pinata API | CID |
| 10 | Run orchestration | `npm run contracts:orchestrate:story` | Registration attestation |
| 11 | Generate attestation hashes | `npm run contracts:attestation-hashes` | `valuation-attestation.json` |
| 12 | Pin deployment registry | curl to Pinata API | CID |
| 13 | Update GitHub Pages | Push to `main` or trigger workflow | Live docs site |
