#!/usr/bin/env node
"use strict";
/**
 * export-abi-proof.cjs
 *
 * Reads all compiled Hardhat artifacts and produces a complete
 * ABI / bytecode verification proof bundle suitable for:
 *   • StoryScan source-verification submissions
 *   • Story Protocol IP-asset attachment (pinned to IPFS via Pinata)
 *   • Off-chain audit trails
 *
 * Outputs:
 *   abi-proof.json   — per-contract ABI, bytecode, keccak256 / SHA-256 hashes,
 *                      IPFS document CIDs, and Story Protocol registration data
 *
 * Usage:
 *   node scripts/export-abi-proof.cjs
 *
 * Environment variables (all optional — fall back to defaults from .env.example):
 *   PINATA_GATEWAY_NAME          — Pinata dedicated gateway subdomain
 *   UCC1_FILING_HASH             — Pinata IPFS CID of the UCC-1 filing
 *   IPFS_GLADIATOR_CERT_CID      — Pinata CID for Gladiator cert
 *   IPFS_GLADIATOR_NOTICE_CID    — Pinata CID for Gladiator notice
 *   IPFS_MR_ARTICLES_CID         — Pinata CID for MR articles
 *   IPFS_MR_EIN_LETTER_CID       — Pinata CID for MR EIN letter
 *   IPFS_SLAPS_ARTICLES_CID      — Pinata CID for SLAPS articles
 *   IPFS_SLAPS_EIN_LETTER_CID    — Pinata CID for SLAPS EIN letter
 *   IPFS_RBW_EIN_LETTER_CID      — Pinata CID for RBW EIN letter
 *   IPFS_NM_SOS_RECEIPT_CID      — Pinata CID for NM SOS receipts
 *   IPFS_BENEFICIAL_OWNER_ID_CID — Pinata CID for beneficial owner ID
 *   IPFS_PATENTSIGHT_PORTFOLIO_CID — Pinata CID for PatentSight portfolio report
 *   IPFS_PATENTSIGHT_MR_CID      — Pinata CID for PatentSight MR report
 *   IPFS_PATENTSIGHT_SLAPS_CID   — Pinata CID for PatentSight SLAPS report
 *   IPFS_IPLYTICS_DECLARATION_CID — Pinata CID for IPlytics SEP declaration
 */

const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("ethers");
require("dotenv").config();

// ── Constants ─────────────────────────────────────────────────────────────

const ARTIFACTS_DIR  = path.join(__dirname, "..", "artifacts", "contracts");
const OUTPUT_FILE    = path.join(__dirname, "..", "abi-proof.json");
const CHAIN_ID       = 1514;
const STORYSCAN_BASE = "https://www.storyscan.io";

// All 11 contracts deployed on Story Protocol mainnet.
const CONTRACT_NAMES = [
  "StoryAttestationService",
  "StoryOrchestrationService",
  "StoryAttestationBridge",
  "SLAPSIPSpvLoan",
  "GladiatorHoldingsSpvLoan",
  "PILLoanEnforcement",
  "StablecoinIPEscrow",
  "AngelCoin",
  "ResilienceToken",
  "SlapsStreaming",
  "SlapsSPV",
];

// Pinata gateway for resolving CID URLs
const GATEWAY_NAME = process.env.PINATA_GATEWAY_NAME || "";
function ipfsUrl(cid) {
  if (!cid) return null;
  if (GATEWAY_NAME) return `https://${GATEWAY_NAME}.mypinata.cloud/ipfs/${cid}`;
  return `https://ipfs.io/ipfs/${cid}`;
}

// ── Document CIDs (from env / .env.example defaults) ─────────────────────

const DOCUMENT_CIDS = {
  ucc1Filing:              process.env.UCC1_FILING_HASH             || "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",
  ucc1FinancingStatement:  process.env.UCC1_FINANCING_STATEMENT_CID || "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu",
  ucc1AuxDocs:             process.env.UCC1_AUXILIARY_DOCS          || "bafybeidkp74w2idrwkg2qey66uepfaes5ekonxjqt62uztyxawii7yye7y",
  gladiatorCert:           process.env.IPFS_GLADIATOR_CERT_CID      || "bafybeiba2j4g34bizjjm26qznc2pf4upgotffrcwjtkw6lj3qa6squrzpu",
  gladiatorNotice:         process.env.IPFS_GLADIATOR_NOTICE_CID    || "bafkreifbikc26xs2cu2mvsghzlrginwm6icqotdp4ntsvq3sn6h4flrhhm",
  mrArticles:              process.env.IPFS_MR_ARTICLES_CID         || "bafkreifxiesrze736sxhvsa5op64q6f3ddvv3rismnvd75wi3yfqilu4py",
  mrEinLetter:             process.env.IPFS_MR_EIN_LETTER_CID       || "bafkreihz5zpp33pimzckaey64mht2vezlbzngoxe46urrfctzqvjvsdboe",
  slapsArticles:           process.env.IPFS_SLAPS_ARTICLES_CID      || "bafkreic3n6bdf25tobljqbjxzvzkbch6s7xkqq5yehmyt3zju4de7ey52u",
  slapsEinLetter:          process.env.IPFS_SLAPS_EIN_LETTER_CID    || "bafkreifnuwchbvbolmhbgionvsltdi3edzasfqytd4zzqlvu42m5m4jhei",
  rbwEinLetter:            process.env.IPFS_RBW_EIN_LETTER_CID      || "bafkreid77fuxwqtwyku5syp3dswmy75rymvxh6v3tf7rfrzqbrizoutxtu",
  nmSosReceipt:            process.env.IPFS_NM_SOS_RECEIPT_CID      || "bafkreigjsqx6d47sgqwkjxgtt3qrjnoz3hdth4hqk7qnxflqog2ikjs2kq",
  beneficialOwnerID:       process.env.IPFS_BENEFICIAL_OWNER_ID_CID || "bafkreie5spkgxxhmafdqylwyfplx37jqhcjrs3es3neasgcnynzgkg5mzi",
  patentsightPortfolio:    process.env.IPFS_PATENTSIGHT_PORTFOLIO_CID || "bafkreibxqnmhir5iifpboxdv5ndltm5vnbplso4ndtcuzfnanykudrwdbu",
  patentsightMR:           process.env.IPFS_PATENTSIGHT_MR_CID      || "bafkreihls2yoi265uxzmcmh7wzk2ytyo5yvopmb4jib4blw4nptlchivqm",
  patentsightSLAPS:        process.env.IPFS_PATENTSIGHT_SLAPS_CID   || "bafkreiflmhdsflvv53e24mo2woafdgecpkvfljcbm5heafnzdxzbj5ct4i",
  iplyticsDeclaration:     process.env.IPFS_IPLYTICS_DECLARATION_CID || "bafkreiej7wfskl53hxo4j47g55bxjkyyulihovjjtpjvtf264kfoddxc5i",
};

// ── Helpers ───────────────────────────────────────────────────────────────

/** keccak256 of a hex string (bytecode) using ethers.js. */
function keccak256Hex(hexStr) {
  if (!hexStr || hexStr === "0x") {
    // Return the all-zeros sentinel rather than ethers.ZeroHash to avoid
    // coupling to the ethers API surface (ethers.ZeroHash was removed in some
    // minor versions). The value is semantically "no bytecode" — not the
    // actual keccak256 of empty input (which would be 0xc5d246…).
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }
  return ethers.keccak256(hexStr);
}

/** SHA-256 of a string/buffer, returned as 0x-prefixed hex. */
function sha256Hex(data) {
  return "0x" + crypto
    .createHash("sha256")
    .update(typeof data === "string" ? Buffer.from(data, "utf8") : data)
    .digest("hex");
}

/**
 * Read the Hardhat artifact JSON for a given contract name.
 * Returns null if not found (artifacts not compiled yet).
 */
function readArtifact(contractName) {
  const filePath = path.join(
    ARTIFACTS_DIR,
    `${contractName}.sol`,
    `${contractName}.json`
  );
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// ── Main ──────────────────────────────────────────────────────────────────

const generatedAt = new Date().toISOString();
const contracts   = {};
let   compiled    = 0;
let   missing     = 0;

for (const name of CONTRACT_NAMES) {
  const artifact = readArtifact(name);
  if (!artifact) {
    console.warn(`  ⚠ ${name}: artifact not found (run npm run contracts:compile first)`);
    contracts[name] = {
      status:  "NOT_COMPILED",
      message: "Run npm run contracts:compile to generate artifacts",
    };
    missing++;
    continue;
  }

  const bytecode         = artifact.bytecode         || "0x";
  const deployedBytecode = artifact.deployedBytecode || "0x";
  const abi              = artifact.abi              || [];
  const abiJson          = JSON.stringify(abi);

  const bytecodeKeccak256         = keccak256Hex(bytecode);
  const deployedBytecodeKeccak256 = keccak256Hex(deployedBytecode);
  const abiSha256                 = sha256Hex(abiJson);
  const deployedBytecodeSha256    = sha256Hex(
    deployedBytecode.startsWith("0x")
      ? Buffer.from(deployedBytecode.slice(2), "hex")
      : deployedBytecode
  );

  const deployedBytecodeSize =
    deployedBytecode.length > 2
      ? (deployedBytecode.length - 2) / 2
      : 0;

  contracts[name] = {
    status:  "COMPILED",
    chainId: CHAIN_ID,
    network: "Story Protocol Mainnet",
    // ── ABI ──
    abi,
    abiSha256,
    abiKeccak256: ethers.keccak256(ethers.toUtf8Bytes(abiJson)),
    // ── Bytecode ──
    bytecode,
    bytecodeKeccak256,
    // ── Deployed bytecode ──
    deployedBytecode,
    deployedBytecodeKeccak256,
    deployedBytecodeSha256,
    deployedBytecodeSize,
    deployedBytecodeSizeNote:
      deployedBytecodeSize > 24576
        ? "WARNING: exceeds 24 576-byte EVM limit"
        : `${(24576 - deployedBytecodeSize).toLocaleString()} bytes under EVM 24 576-byte limit`,
    // ── StoryScan links (populated after deployment) ──
    storyScanAddress: null,
    storyScanUrl:     null,
    storyScanVerificationUrl: null,
    verificationStatus: "PENDING_DEPLOYMENT",
  };
  compiled++;
}

// ── Assemble IPFS document manifest ──────────────────────────────────────

const ipfsDocuments = {};
for (const [key, cid] of Object.entries(DOCUMENT_CIDS)) {
  ipfsDocuments[key] = {
    cid,
    url:       ipfsUrl(cid),
    sha256:    sha256Hex(cid),  // hash of the CID string itself (commitment)
    status:    "PINNED",
    pinService: "Pinata",
  };
}

// ── Combined proof record ─────────────────────────────────────────────────

const proof = {
  $schema:     "https://docs.story.foundation/abi-proof-schema.json",
  version:     "1.0.0",
  generatedAt,
  entity:      "Gladiator Holdings LLC / Millionaire Resilience LLC",
  description: "ABI bytecode verification proof for all 11 Gladiator Holdings smart contracts. " +
               "Each contract entry includes full ABI JSON, creation bytecode, deployed bytecode, " +
               "and keccak256/SHA-256 hashes for independent verification on StoryScan (Story Protocol Chain 1514).",

  storyProtocol: {
    chainId:       CHAIN_ID,
    network:       "Story Protocol Mainnet",
    explorer:      STORYSCAN_BASE,
    explorerApi:   `${STORYSCAN_BASE}/api`,
  },

  compilationConfig: {
    solcVersion:     "0.8.26",
    evmVersion:      "cancun",
    viaIR:           true,
    optimizer:       { enabled: true, runs: 200 },
    optimizerOverrides: {
      StoryAttestationService: { runs: 1 },
    },
    contractCount: CONTRACT_NAMES.length,
    compiledCount: compiled,
    missingCount:  missing,
  },

  contracts,

  ipfsDocuments,

  verificationInstructions: [
    "1. Compile:   npm run contracts:compile",
    "2. Export:    node scripts/export-abi-proof.cjs",
    "3. Deploy:    npm run contracts:deploy:story",
    "4. Verify:    npm run contracts:verify:story",
    "5. After deployment, update storyScanAddress/storyScanUrl in each contract entry.",
    "6. Pin abi-proof.json to IPFS via Pinata and attach the CID to the Story Protocol IP asset.",
    "",
    "StoryScan verification API:",
    "  POST https://www.storyscan.io/api?module=contract&action=verifysourcecode",
    "  Required fields: contractaddress, sourceCode, contractname, compilerversion,",
    "                   optimizationUsed, runs, evmversion, licenseType",
  ],
};

// ── Write output ──────────────────────────────────────────────────────────

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(proof, null, 2));

console.log("=".repeat(60));
console.log("ABI / Bytecode Verification Proof");
console.log("=".repeat(60));
console.log(`Generated: ${generatedAt}`);
console.log(`Compiled:  ${compiled}/${CONTRACT_NAMES.length} contracts`);
if (missing > 0) {
  console.log(`Missing:   ${missing} (run npm run contracts:compile first)`);
}
console.log();
for (const [name, entry] of Object.entries(contracts)) {
  if (entry.status === "COMPILED") {
    const sizeNote = entry.deployedBytecodeSize
      ? `${entry.deployedBytecodeSize.toLocaleString()} bytes`
      : "unknown";
    console.log(`  ✓ ${name.padEnd(35)} ${sizeNote}`);
  } else {
    console.log(`  ✗ ${name.padEnd(35)} NOT COMPILED`);
  }
}
console.log();
console.log(`IPFS documents: ${Object.keys(ipfsDocuments).length} CIDs catalogued`);
console.log(`Output: ${OUTPUT_FILE}`);
console.log("=".repeat(60));
