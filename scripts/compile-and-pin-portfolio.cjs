#!/usr/bin/env node
"use strict";
/**
 * compile-and-pin-portfolio.cjs
 *
 * 1. Builds a consolidated ABI bundle covering:
 *      - The 12 original contracts (Millionaire-Resilience-LLC-JAH)
 *      - The 2 new ERC-6551 / Safe Proxy Factory contracts (this fork)
 *      - SpiritualGuerrilla888.sol (cloned from external repo + compiled at /tmp/sg888)
 * 2. Builds a portfolio inventory JSON itemising IP, trade secrets, and branded
 *    assets per repo / SPV with valuation hashes (LexisNexis PatentSight + IPlytics).
 * 3. Pins both bundles + per-contract artifact extracts to Pinata.
 */

const fs    = require("fs");
const path  = require("path");
const https = require("https");
const crypto= require("crypto");
const { ethers } = require("ethers");
require("dotenv").config();

const JWT = process.env.PINATA_JWT;
if (!JWT) { console.error("PINATA_JWT missing"); process.exit(1); }

// ── Load valuation hashes already on-chain ────────────────────────
const val = JSON.parse(fs.readFileSync("./valuation-attestation.json", "utf8"));
const reg = JSON.parse(fs.readFileSync("./deployment-registry.json", "utf8"));

// ── Collect all ABIs from this repo's artifacts dir ───────────────
const localContracts = [
  "StoryAttestationService","StoryOrchestrationService","StoryAttestationBridge",
  "SLAPSIPSpvLoan","GladiatorHoldingsSpvLoan","PILLoanEnforcement",
  "StablecoinIPEscrow","AngelCoin","ResilienceToken",
  "SlapsStreaming","SlapsSPV","UCC1FilingIntegration",
  "StoryIPTokenBoundAccount","StoryIPSafeProxyFactory"
];

const abiBundle = {
  generatedAt: new Date().toISOString(),
  compiler: "0.8.26+commit.8a97fa7a",
  evmVersion: "cancun",
  optimizer: { enabled: true },
  repositories: {
    "Millionaire-Resilience-LLC-JAH": { contracts: {} },
    "SpiritualGuerrilla888":          { contracts: {} }
  }
};

for (const c of localContracts) {
  const artifactPath = `./artifacts/contracts/${c}.sol/${c}.json`;
  if (!fs.existsSync(artifactPath)) continue;
  const a = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  abiBundle.repositories["Millionaire-Resilience-LLC-JAH"].contracts[c] = {
    abi: a.abi,
    bytecode: a.bytecode,
    deployedBytecode: a.deployedBytecode,
    bytecodeKeccak256:        ethers.keccak256(a.bytecode),
    deployedBytecodeKeccak256:ethers.keccak256(a.deployedBytecode),
    abiSha256: "0x" + crypto.createHash("sha256").update(JSON.stringify(a.abi)).digest("hex"),
    deployedBytecodeSize: (a.deployedBytecode.length - 2) / 2
  };
}

// SpiritualGuerrilla888 from /tmp/sg888
const sgPath = "/tmp/sg888/artifacts/contracts/SpiritualGuerrilla888.sol/SpiritualGuerrilla888.json";
if (fs.existsSync(sgPath)) {
  const a = JSON.parse(fs.readFileSync(sgPath, "utf8"));
  abiBundle.repositories["SpiritualGuerrilla888"].contracts["SpiritualGuerrilla888"] = {
    abi: a.abi,
    bytecode: a.bytecode,
    deployedBytecode: a.deployedBytecode,
    bytecodeKeccak256:         ethers.keccak256(a.bytecode),
    deployedBytecodeKeccak256: ethers.keccak256(a.deployedBytecode),
    abiSha256: "0x" + crypto.createHash("sha256").update(JSON.stringify(a.abi)).digest("hex"),
    deployedBytecodeSize: (a.deployedBytecode.length - 2) / 2,
    standard: "ERC-20",
    maxSupply: "888,000,000",
    symbol: "SG888"
  };
}

fs.writeFileSync("./portfolio-abi-bundle.json", JSON.stringify(abiBundle, null, 2));

// ── Portfolio inventory (itemized) ────────────────────────────────
const inventory = {
  documentType: "IP_PORTFOLIO_INVENTORY_AND_VALUATION_INDEX",
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  parentEntity: { name: "Gladiator Holdings LLC", entityId: "0008034162", jurisdiction: "New Mexico" },
  valuationStandard: "WIPO DCF + LexisNexis PatentSight+ + IPlytics SEP",
  grandTotalCollateral_USD: 7_350_000_000,
  presentIPPortfolioValue_USD: 300_000_000,
  totalProtectedValue_USD: 225_000_000,
  atRiskValue_USD: 75_000_000,
  repositories: {
    "Millionaire-Resilience-LLC-JAH": {
      githubUrl: "https://github.com/slaps6331-cell/Millionaire-Resilience-LLC-JAH",
      role: "PARENT_ORCHESTRATION_REPO",
      assets: {
        intellectualProperty: [
          { name: "Millionaire Resilience: Killer Instinct (eBook)", author: "Clifton Kelly Bell",
            ipId: "0xD22750Ca1C3Cd1f7B18a2c70Af98914c291d632F",
            ipNft: "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE", tokenId: 15192,
            presentValue_USD: 95_000_000, status: "PROTECTED",
            patentSightScore: 92, sepCount: 42,
            valuationDataHash: val.ipValuationHashes.millionaireResilience.valuationDataHash },
          { name: "SLAPS Streaming IP Portfolio", presentValue_USD: 75_000_000, status: "AT_RISK",
            patentSightScore: 78, sepCount: 18,
            valuationDataHash: val.ipValuationHashes.slapsStreaming.valuationDataHash },
          { name: "Resilience Blockchain Whetstone (Developer IP)", presentValue_USD: 45_000_000, status: "PROTECTED" },
          { name: "IP Legal Monitoring Platform (LexisNexis)", presentValue_USD: 35_000_000, status: "PROTECTED" },
          { name: "Shared Infrastructure IP", presentValue_USD: 50_000_000, status: "PROTECTED" }
        ],
        tradeSecrets: [
          "MR Royalty distribution algorithm (DCF + PatentSight+ weighting)",
          "SLAPS streaming codec optimisation",
          "Resilience Whetstone developer-incentive curve",
          "PIL licensing rev-share waterfall (3-tier)",
          "Smart-contract attestation Hermetic Seal protocol"
        ],
        brandedAssets: [
          { brand: "Millionaire Resilience", trademarkStatus: "USPTO filed" },
          { brand: "Killer Instinct (sub-brand)", trademarkStatus: "USPTO filed" },
          { brand: "SLAPS Streaming", trademarkStatus: "USPTO filed" },
          { brand: "Resilience Blockchain Whetstone", trademarkStatus: "USPTO filed" }
        ],
        smartContracts: localContracts,
        ipfsValuationReports: {
          patentSightPortfolio: reg["ipfs-documents"]["patentsight-portfolio"],
          patentSightMR:        reg["ipfs-documents"]["patentsight-mr"],
          patentSightSLAPS:     reg["ipfs-documents"]["patentsight-slaps"],
          iplyticsSEPDeclaration: reg["ipfs-documents"]["iplytics-sep-declaration"],
          gladiatorValuationReport_TryPdf: "QmYgT6SfbBbjJvX1AgzCa5TcnQMf5MPkpgNSZBHz5ETZVt"
        }
      }
    },
    "SpiritualGuerrilla888": {
      githubUrl: "https://github.com/slaps6331-cell/SpiritualGuerrilla888",
      role: "EXTERNAL_TOKEN_SPV",
      entity: "Spiritual Guerilla IP Holdings Inc.",
      assets: {
        intellectualProperty: [
          { name: "SpiritualGuerrilla888 (SG888) — ERC-20", standard: "ERC-20",
            symbol: "SG888", maxSupply: "888,000,000",
            presentValue_USD: 12_000_000,
            status: "TOKEN_UTILITY_LAYER",
            note: "External token; NOT pledged as Morpho collateral. Forms part of cross-platform incentive layer." }
        ],
        tradeSecrets: [
          "Token emission curve + cap structure",
          "Spiritual Guerrilla utility scheduling"
        ],
        brandedAssets: [
          { brand: "Spiritual Guerrilla 888", trademarkStatus: "USPTO pending" }
        ],
        smartContracts: ["SpiritualGuerrilla888"]
      }
    }
  },
  valuationHashes: val.ipValuationHashes,
  hermeticSealHash: val.hermeticSealHash,
  storyAttester: {
    contract: "StoryAttestationService",
    chainId: 1514,
    attestor: "Teknos Associates LLC",
    attestationId: "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE",
    attestationTypeIds: val.attestationTypeIdentifiers
  }
};

fs.writeFileSync("./portfolio-inventory.json", JSON.stringify(inventory, null, 2));

// ── Pinata pinning ────────────────────────────────────────────────
function pinFile(absPath, name) {
  return new Promise((resolve, reject) => {
    const data = fs.readFileSync(absPath);
    const boundary = "----P" + crypto.randomBytes(8).toString("hex");
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(absPath)}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`);
    const tail = Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="pinataMetadata"\r\n\r\n` +
      JSON.stringify({ name }) + `\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, data, tail]);
    const req = https.request({
      method: "POST", hostname: "api.pinata.cloud", path: "/pinning/pinFileToIPFS",
      headers: { "Authorization": `Bearer ${JWT}`,
                 "Content-Type": `multipart/form-data; boundary=${boundary}`,
                 "Content-Length": body.length }
    }, res => {
      let o = ""; res.on("data", d => o += d);
      res.on("end", () => { try { const j = JSON.parse(o); j.IpfsHash ? resolve(j) : reject(new Error(o)); } catch(e){ reject(new Error(o)); } });
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

(async () => {
  const manifest = JSON.parse(fs.readFileSync("./ipfs-pin-manifest.json", "utf8"));
  const results = {};

  for (const f of [
    { p: "./portfolio-abi-bundle.json",      n: "Consolidated ABI Bundle (15 contracts: MR-LLC-JAH + SG888)", k: "portfolioAbiBundle" },
    { p: "./portfolio-inventory.json",       n: "IP Portfolio Inventory + Valuation Index (LexisNexis + IPlytics)", k: "portfolioInventory" }
  ]) {
    process.stdout.write(`Pinning ${f.p}… `);
    const buf = fs.readFileSync(f.p);
    const k = ethers.keccak256(buf);
    const r = await pinFile(f.p, f.n);
    console.log(`${r.IpfsHash}  (keccak ${k.slice(0,18)}…)`);
    results[f.k] = { cid: r.IpfsHash, keccak256: k };
    manifest.pins[f.k] = { cid: r.IpfsHash, description: f.n, keccak256: k };
  }

  fs.writeFileSync("./ipfs-pin-manifest.json", JSON.stringify(manifest, null, 2));
  fs.writeFileSync("./portfolio-pin-results.json", JSON.stringify(results, null, 2));
  console.log("\n=== Final CIDs ===");
  for (const [k,v] of Object.entries(results)) console.log(`${k.padEnd(28)} ipfs://${v.cid}`);
})().catch(e => { console.error(e); process.exit(1); });
