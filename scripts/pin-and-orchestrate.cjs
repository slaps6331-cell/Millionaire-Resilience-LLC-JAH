#!/usr/bin/env node
"use strict";
/**
 * pin-and-orchestrate.cjs
 *
 * One-shot orchestrator for the Baby Spiritual Guerilla / Gladiator Holdings
 * 1000-year umbrella trust drop:
 *
 *   1. Pin selected docs/contracts to Pinata IPFS (UCC-1, trade secrets,
 *      valuation reports, SPV/Gladiator Holdings draft, SG888 TBA source).
 *   2. Produce an EIP-191 signing pre-image bundle for Clifton Kelly Bell
 *      (0x20A8402c67b9D476ddC1D2DB12f03B30A468f135) covering every pinned
 *      trade-secret + UCC-1 document.
 *   3. Build a Gnosis Safe Transaction Builder batch (v1.0 schema) for the
 *      SmartPacts1 3-of-5 multisig 0xd314BE0a27c73Cd057308aC4f3dd472c482acc09
 *      that:
 *        a. Records the UCC-1 primary filing (UCC1FilingIntegration)
 *        b. Registers SpiritualGuerrilla888TBA as collateral
 *        c. Pre-computes & creates the ERC-6551 TBA bound to Story IP NFT
 *        d. Updates the Hermetic Seal tiers
 *   4. Compute the four canonical hashes the Story protocol orchestration
 *      requires:
 *        - orchestrationHash
 *        - valuationHash
 *        - attestationHash
 *        - deploymentHash
 *   5. Write final manifest `pinata-bundle-manifest.json` and pin it too.
 *
 * Env:
 *   PINATA_JWT  (required)
 *
 * Run:
 *   node scripts/pin-and-orchestrate.cjs
 */

const https  = require("https");
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const ROOT       = path.resolve(__dirname, "..");
const PINATA_JWT = process.env.PINATA_JWT;
if (!PINATA_JWT) { console.error("PINATA_JWT not set"); process.exit(1); }
const GATEWAY    = "lavender-neat-urial-76.mypinata.cloud";

const SETTLOR_ADDRESS   = "0x20A8402c67b9D476ddC1D2DB12f03B30A468f135"; // Clifton Kelly Bell
const SAFE_3OF5         = "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09"; // SmartPacts1
const UCC1_CONTRACT     = "0x0000000000000000000000000000000000000000"; // placeholder until deployed
const STORY_IP_NFT      = "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE";
const STORY_IP_TOKENID  = 15192;
const STORY_CHAIN_ID    = 1514;
const BASE_CHAIN_ID     = 8453;
const ERC6551_REGISTRY  = "0x000000006551c19487814612e58FE06813775758";

// ---------------------------------------------------------------------------
//  Pinata pinning helper (multipart form-data, no deps)
// ---------------------------------------------------------------------------
function pinFile(absPath, pinName) {
  return new Promise((resolve, reject) => {
    const content  = fs.readFileSync(absPath);
    const fileName = path.basename(absPath);
    const boundary = "----PinataBoundary" + crypto.randomBytes(8).toString("hex");
    const parts = [
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      content,
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="pinataMetadata"\r\n\r\n${JSON.stringify({name: pinName})}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="pinataOptions"\r\n\r\n${JSON.stringify({cidVersion: 1})}\r\n`),
      Buffer.from(`--${boundary}--\r\n`),
    ];
    const body = Buffer.concat(parts);
    const req = https.request({
      hostname: "api.pinata.cloud",
      path:     "/pinning/pinFileToIPFS",
      method:   "POST",
      headers:  {
        Authorization:    `Bearer ${PINATA_JWT}`,
        "Content-Type":   `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Pinata ${res.statusCode}: ${data}`));
        }
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const sha256 = (buf) => "0x" + crypto.createHash("sha256").update(buf).digest("hex");

// ---------------------------------------------------------------------------
//  Files to pin (per user spec: UCC-1, trade-secret docs, valuation reports,
//  new SPV / Gladiator Holdings draft, plus the new SG888 TBA contract)
// ---------------------------------------------------------------------------
const targets = [
  {
    key:  "umbrellaTrustDraft",
    path: "docs/GLADIATOR_HOLDINGS_UMBRELLA_TRUST_DRAFT.md",
    name: "Gladiator Holdings 1000-Year Umbrella Trust Draft",
  },
  {
    key:  "tradeSecretsSigned",
    path: "docs/TRADE_SECRETS_GLADIATOR_HOLDINGS_SIGNED.md",
    name: "Gladiator Holdings Trade Secrets Register (Signed)",
  },
  {
    key:  "monotheisticContentFilter",
    path: "docs/MONOTHEISTIC_CONTENT_FILTER_ORACLE.md",
    name: "Monotheistic Content Filter Oracle Design",
  },
  {
    key:  "babySpiritualGuerillaValuation",
    path: "valuation/baby-spiritual-guerilla-valuation.json",
    name: "Baby Spiritual Guerilla DCF Valuation",
  },
  {
    key:  "sg888TBASource",
    path: "contracts/SpiritualGuerrilla888TBA.sol",
    name: "SpiritualGuerrilla888 ERC-6551 TBA Source",
  },
  {
    key:  "ucc1MetadataPinata",
    path: "ucc1-metadata-pinata.json",
    name: "UCC-1 Metadata (Pinata)",
  },
  {
    key:  "valuationAttestation",
    path: "valuation-attestation.json",
    name: "Valuation Attestation",
  },
  {
    key:  "portfolioInventory",
    path: "portfolio-inventory.json",
    name: "IP Portfolio Inventory + Valuation Index",
  },
];

// ---------------------------------------------------------------------------
//  Build EIP-191 signing pre-image for each trade-secret document
// ---------------------------------------------------------------------------
function eip191Preimage(messageHexNo0x) {
  // EIP-191 personal_sign:  keccak256("\x19Ethereum Signed Message:\n" + len + msg)
  // We use SHA-256 of file as the digest the signer endorses (off-chain).
  const msg     = Buffer.from(messageHexNo0x, "hex");
  const prefix  = Buffer.from(`\x19Ethereum Signed Message:\n${msg.length}`);
  // EIP-191 uses keccak256 — we expose both the prefixed bytes (for MetaMask
  // / Safe to keccak themselves) and a SHA-256 fingerprint for archival.
  return {
    prefixedBytesHex:   "0x" + Buffer.concat([prefix, msg]).toString("hex"),
    sha256Fingerprint:  "0x" + crypto.createHash("sha256").update(Buffer.concat([prefix, msg])).digest("hex"),
  };
}

// ---------------------------------------------------------------------------
//  Safe Transaction Builder batch (v1.0 schema)
// ---------------------------------------------------------------------------
function buildSafeBatch(ipfsCIDs) {
  return {
    version: "1.0",
    chainId: String(STORY_CHAIN_ID),
    createdAt: Date.now(),
    meta: {
      name: "Baby Spiritual Guerilla — SG888 TBA Deployment + UCC-1 Hand-off",
      description:
        "Records the NM SOS UCC-1 filing 20260000078753 on-chain, registers " +
        "the new SpiritualGuerrilla888TBA (ERC-6551) implementation as " +
        "collateral, creates the deterministic Token Bound Account for the " +
        "Story IP NFT, and refreshes the Hermetic Seal tier hashes pinned " +
        "at Pinata IPFS.",
      txBuilderVersion: "1.16.5",
      createdFromSafeAddress: SAFE_3OF5,
      createdFromOwnerAddress: SETTLOR_ADDRESS,
      checksum:
        "0x" +
        crypto.createHash("sha256").update(JSON.stringify(ipfsCIDs)).digest("hex"),
    },
    transactions: [
      {
        to: UCC1_CONTRACT,
        value: "0",
        data: null,
        contractMethod: {
          name: "recordPrimaryFiling",
          payable: false,
          inputs: [{ name: "_hermeticSealTiers", type: "bytes32[]", internalType: "bytes32[]" }],
        },
        contractInputsValues: {
          _hermeticSealTiers: JSON.stringify([
            ipfsCIDs.orchestrationHash,
            ipfsCIDs.valuationHash,
            ipfsCIDs.attestationHash,
            ipfsCIDs.deploymentHash,
          ]),
        },
      },
      {
        to: UCC1_CONTRACT,
        value: "0",
        data: null,
        contractMethod: {
          name: "registerCollateralContract",
          payable: false,
          inputs: [
            { name: "_contractName",  type: "string",  internalType: "string"  },
            { name: "_contractAddr",  type: "address", internalType: "address" },
            { name: "_chainId",       type: "uint256", internalType: "uint256" },
            { name: "_bytecodeHash",  type: "bytes32", internalType: "bytes32" },
            { name: "_abiHash",       type: "bytes32", internalType: "bytes32" },
          ],
        },
        contractInputsValues: {
          _contractName: "SpiritualGuerrilla888TBA",
          _contractAddr: "0x0000000000000000000000000000000000000000",
          _chainId:      String(STORY_CHAIN_ID),
          _bytecodeHash: ipfsCIDs.deploymentHash,
          _abiHash:      ipfsCIDs.orchestrationHash,
        },
      },
      {
        to: ERC6551_REGISTRY,
        value: "0",
        data: null,
        contractMethod: {
          name: "createAccount",
          payable: false,
          inputs: [
            { name: "implementation", type: "address", internalType: "address" },
            { name: "salt",           type: "uint256", internalType: "uint256" },
            { name: "chainId",        type: "uint256", internalType: "uint256" },
            { name: "tokenContract",  type: "address", internalType: "address" },
            { name: "tokenId",        type: "uint256", internalType: "uint256" },
            { name: "initData",       type: "bytes",   internalType: "bytes"   },
          ],
        },
        contractInputsValues: {
          implementation: "0x0000000000000000000000000000000000000000",
          salt:           "0",
          chainId:        String(STORY_CHAIN_ID),
          tokenContract:  STORY_IP_NFT,
          tokenId:        String(STORY_IP_TOKENID),
          initData:       "0x",
        },
      },
      {
        to: UCC1_CONTRACT,
        value: "0",
        data: null,
        contractMethod: {
          name: "updateHermeticSeal",
          payable: false,
          inputs: [
            { name: "_filingHash",  type: "bytes32",   internalType: "bytes32"   },
            { name: "_newSealTiers", type: "bytes32[]", internalType: "bytes32[]" },
          ],
        },
        contractInputsValues: {
          _filingHash: ipfsCIDs.orchestrationHash,
          _newSealTiers: JSON.stringify([
            ipfsCIDs.orchestrationHash,
            ipfsCIDs.valuationHash,
            ipfsCIDs.attestationHash,
            ipfsCIDs.deploymentHash,
          ]),
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
//  Main
// ---------------------------------------------------------------------------
(async () => {
  console.log("► Pinning target files to Pinata IPFS…\n");

  const pinned = {};
  const fileHashes = {};

  for (const t of targets) {
    const abs = path.join(ROOT, t.path);
    if (!fs.existsSync(abs)) { console.warn("   ✗ missing:", t.path); continue; }
    const buf  = fs.readFileSync(abs);
    const hash = sha256(buf);
    fileHashes[t.key] = hash;
    process.stdout.write(`   • ${t.path}…  `);
    const res = await pinFile(abs, t.name);
    pinned[t.key] = {
      cid:        res.IpfsHash,
      gatewayUrl: `https://${GATEWAY}/ipfs/${res.IpfsHash}`,
      size:       res.PinSize,
      sha256:     hash,
      path:       t.path,
      name:       t.name,
    };
    console.log(`CID ${res.IpfsHash}`);
  }

  // -------------------------------------------------------------------------
  //  Build EIP-191 signature bundle for Clifton Kelly Bell over every pinned
  //  trade-secret / UCC-1 document. Note: this PRODUCES the bytes-to-sign;
  //  the actual `signature` field is left null because we do NOT hold the
  //  private key. The Safe owner signs these bytes from MetaMask / Safe UI
  //  and the resulting signature is dropped in-place.
  // -------------------------------------------------------------------------
  const signatureBundle = {
    documentType: "EIP191_SIGNATURE_BUNDLE",
    signer: { name: "Clifton Kelly Bell", address: SETTLOR_ADDRESS },
    generatedAt: new Date().toISOString(),
    instructions:
      "For each item below, sign `prefixedBytesHex` with MetaMask " +
      "personal_sign using the Settlor address. Paste the resulting " +
      "65-byte signature back into the `signature` field. Then re-run " +
      "`scripts/pin-and-orchestrate.cjs` to re-pin and refresh hashes.",
    items: {},
  };
  for (const [key, p] of Object.entries(pinned)) {
    if (key === "sg888TBASource" || key === "portfolioInventory") continue;
    const pre = eip191Preimage(p.sha256.slice(2));
    signatureBundle.items[key] = {
      file:               p.path,
      cid:                p.cid,
      sha256:             p.sha256,
      prefixedBytesHex:   pre.prefixedBytesHex,
      eip191Fingerprint:  pre.sha256Fingerprint,
      signature:          null,
    };
  }
  fs.writeFileSync(
    path.join(ROOT, "trade-secrets-signature-bundle.json"),
    JSON.stringify(signatureBundle, null, 2),
  );

  // -------------------------------------------------------------------------
  //  Compute the four orchestrator hashes
  // -------------------------------------------------------------------------
  const orchestrationPayload = {
    bundle: pinned,
    settlor: SETTLOR_ADDRESS,
    safe:    SAFE_3OF5,
    storyIP: { nft: STORY_IP_NFT, tokenId: STORY_IP_TOKENID, chainId: STORY_CHAIN_ID },
    erc6551Registry: ERC6551_REGISTRY,
    ucc1Filing: "20260000078753",
  };
  const valuationPayload   = JSON.parse(fs.readFileSync(path.join(ROOT, "valuation/baby-spiritual-guerilla-valuation.json")));
  const attestationPayload = JSON.parse(fs.readFileSync(path.join(ROOT, "valuation-attestation.json")));
  const deploymentPayload  = {
    implementationSource: pinned.sg888TBASource,
    expectedBytecode:     "0x__PENDING_HARDHAT_COMPILE__",
    settlor: SETTLOR_ADDRESS,
    safe:    SAFE_3OF5,
    storyIP: { nft: STORY_IP_NFT, tokenId: STORY_IP_TOKENID, chainId: STORY_CHAIN_ID },
  };

  const orchestrationHash = sha256(Buffer.from(JSON.stringify(orchestrationPayload)));
  const valuationHash     = sha256(Buffer.from(JSON.stringify(valuationPayload)));
  const attestationHash   = sha256(Buffer.from(JSON.stringify(attestationPayload)));
  const deploymentHash    = sha256(Buffer.from(JSON.stringify(deploymentPayload)));

  // -------------------------------------------------------------------------
  //  Build Safe Transaction Builder batch
  // -------------------------------------------------------------------------
  const safeBatch = buildSafeBatch({
    orchestrationHash, valuationHash, attestationHash, deploymentHash,
  });
  fs.writeFileSync(
    path.join(ROOT, "safe-tx-builder", "sg888-tba-deployment-batch.json"),
    JSON.stringify(safeBatch, null, 2),
  );

  // -------------------------------------------------------------------------
  //  Final manifest — pin it as the bundle root
  // -------------------------------------------------------------------------
  const manifest = {
    documentType: "BABY_SPIRITUAL_GUERILLA_GLADIATOR_HOLDINGS_BUNDLE",
    version: "2.0.0",
    generatedAt: new Date().toISOString(),
    umbrellaTrust: "Gladiator Holdings LLC (1000-year)",
    settlor: { name: "Clifton Kelly Bell", address: SETTLOR_ADDRESS },
    safe3of5: SAFE_3OF5,
    pinata: { gateway: GATEWAY, pins: pinned },
    orchestrationHash,
    valuationHash,
    attestationHash,
    deploymentHash,
    storyIP: {
      ipId:    "0xD22750Ca1C3Cd1f7B18a2c70Af98914c291d632F",
      nft:     STORY_IP_NFT,
      tokenId: STORY_IP_TOKENID,
      chainId: STORY_CHAIN_ID,
    },
    safeTransactionBuilderFile: "safe-tx-builder/sg888-tba-deployment-batch.json",
    tradeSecretsSignatureBundle: "trade-secrets-signature-bundle.json",
    ucc1Filing: {
      number: "20260000078753",
      jurisdiction: "New Mexico Secretary of State",
      status: "PERFECTED",
    },
  };
  const manifestPath = path.join(ROOT, "pinata-bundle-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Pin the manifest itself
  process.stdout.write("► Pinning final manifest…  ");
  const manifestPin = await pinFile(manifestPath, "Baby Spiritual Guerilla Bundle Manifest");
  manifest.manifestSelfPin = {
    cid: manifestPin.IpfsHash,
    gatewayUrl: `https://${GATEWAY}/ipfs/${manifestPin.IpfsHash}`,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`CID ${manifestPin.IpfsHash}\n`);

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  ORCHESTRATION HASH :", orchestrationHash);
  console.log("  VALUATION HASH     :", valuationHash);
  console.log("  ATTESTATION HASH   :", attestationHash);
  console.log("  DEPLOYMENT HASH    :", deploymentHash);
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  Manifest CID       :", manifestPin.IpfsHash);
  console.log("  Manifest URL       :", `https://${GATEWAY}/ipfs/${manifestPin.IpfsHash}`);
  console.log("══════════════════════════════════════════════════════════════════");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
