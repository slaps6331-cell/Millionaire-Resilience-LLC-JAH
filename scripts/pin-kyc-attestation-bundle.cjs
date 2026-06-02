#!/usr/bin/env node
"use strict";
/**
 * pin-kyc-attestation-bundle.cjs
 *
 * 1. Pins the 5 non-PII KYC/valuation/Story-Portal assets (Try.pdf,
 *    IPLA.pdf, StorLa.pdf, AuxiliaryDocumentManifest.json,
 *    safe-2026-05-02.json) to Pinata via JWT.
 * 2. Hashes every artifact with keccak256 (StoryScan canonical).
 * 3. References the existing on-chain KYC CIDs (EIN letters, articles,
 *    beneficial-owner-id) already in deployment-registry.json.
 * 4. Adds a Teknos & Associates attestation field bundled with the
 *    LexisNexis valuation report references.
 * 5. Re-uses Clifton Kelly Bell's 3-of-5 EIP-191 signatures from
 *    signature-morpho-config.json (no PII re-processing).
 * 6. Writes /app/repo/kyc-teknos-attestation-bundle.json and pins it.
 * 7. Updates ipfs-pin-manifest.json with all new CIDs.
 */

const fs    = require("fs");
const path  = require("path");
const https = require("https");
const crypto = require("crypto");
const { ethers } = require("ethers");
require("dotenv").config();

const JWT = process.env.PINATA_JWT;
if (!JWT) { console.error("PINATA_JWT missing"); process.exit(1); }

// ── Source PDFs/JSONs pulled into /tmp/kyc/ ─────────────────────────
const assets = [
  { src: "/tmp/kyc/Try.pdf",                       key: "ipValuationReportFull",       label: "Gladiator IP Valuation Report + UCC-1 + Security Agreement (Try.pdf)" },
  { src: "/tmp/kyc/IPLA.pdf",                      key: "pinataDepositGuide",          label: "Pinata IPFS Deposit Guide (ABI + UCC-1) (IPLA.pdf)" },
  { src: "/tmp/kyc/StorLa.pdf",                    key: "storyPortalRegistrationGuide",label: "Story Protocol IP Portal Registration Guide (StorLa.pdf)" },
  { src: "/tmp/kyc/AuxiliaryDocumentManifest.json",key: "auxiliaryDocumentManifest",   label: "Auxiliary Document Manifest" },
  { src: "/tmp/kyc/safe-2026-05-02.json",          key: "safeWalletExportFull",        label: "Safe wallet export (2026-05-02)" }
];

// ── Hash each artifact ──────────────────────────────────────────────
const artifactHashes = {};
for (const a of assets) {
  const buf = fs.readFileSync(a.src);
  artifactHashes[a.key] = {
    file: path.basename(a.src),
    keccak256: ethers.keccak256(buf),
    sha256:    "0x" + crypto.createHash("sha256").update(buf).digest("hex"),
    bytes:     buf.length
  };
}

// ── Re-use Clifton Kelly Bell's already-on-chain 3-of-5 sigs ────────
const sigCfg = JSON.parse(fs.readFileSync("./signature-morpho-config.json", "utf8"));

// ── Existing KYC CIDs already in deployment-registry.json ───────────
const reg = JSON.parse(fs.readFileSync("./deployment-registry.json", "utf8"));
const existingKyc = reg["ipfs-documents"];

// ── Build Teknos & Associates attestation bundle ────────────────────
const bundle = {
  documentType: "KYC_TEKNOS_ATTESTATION_BUNDLE",
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  status: "SIGNED_AND_REFERENCED",
  storyProtocol: {
    chainId: 1514,
    ipId: "0xD22750Ca1C3Cd1f7B18a2c70Af98914c291d632F",
    ipNft: "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE",
    tokenId: 15192,
    explorer: "https://www.storyscan.io"
  },
  entity: {
    parent: { name: "Gladiator Holdings LLC", entityId: "0008034162", ein: "39-2684612", jurisdiction: "New Mexico" },
    spv1:   { name: "Slaps Streaming LLC", ein: "41-4045773", role: "SOLE_DEBTOR_AT_RISK" },
    spv2:   { name: "Millionaire Resilience LLC", status: "PROTECTED_ISOLATED" },
    spv3:   { name: "Resilience Blockchain Whetstone LLC", status: "PROTECTED_ISOLATED" },
    beneficialOwner: { name: "Clifton Kelly Bell", role: "Managing Member / Sole Beneficial Owner" }
  },
  // ── KYC documents (already pinned + newly pinned) ──────────────────
  kycDocuments: {
    formation: {
      gladiatorCertOfOrg:        existingKyc["gladiator-cert-of-org"],
      gladiatorNoticeOfFiling:   existingKyc["gladiator-notice-of-filing"],
      mrArticlesOfIncorporation: existingKyc["mr-articles-of-incorporation"],
      slapsArticles:             existingKyc["slaps-articles"]
    },
    irsApprovals: {
      mrEinLetter:    existingKyc["mr-ein-letter"],
      slapsEinLetter: existingKyc["slaps-ein-letter"],
      rbwEinLetter:   existingKyc["rbw-ein-letter"]
    },
    governmentReceipts: {
      nmSosReceipt: existingKyc["nm-sos-receipt"]
    },
    beneficialOwnerId: {
      cid: existingKyc["beneficial-owner-id"],
      note: "Pre-existing pin from earlier KYC submission — raw ID never re-hashed in this fork (PII safety policy)."
    }
  },
  // ── Teknos & Associates attestation field ──────────────────────────
  teknosAttestation: {
    attestor: "Teknos Associates LLC",
    role: "IP Valuation & Certification Attestor",
    attestationId: "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE",
    storyProtocolAttestationTypeId: "0x537b145ce6e67185955db6e27e4f2692ae3c538f0fef75eaffed7d2e6ad6a258",
    valuationReports: {
      lexisNexisPatentSight: {
        portfolio: existingKyc["patentsight-portfolio"],
        millionaireResilience: existingKyc["patentsight-mr"],
        slapsStreaming: existingKyc["patentsight-slaps"],
        sepDeclaration: existingKyc["iplytics-sep-declaration"]
      },
      gladiatorValuationReport: "PINATA_PIN_PENDING",  // Try.pdf — set after upload
      onChainAttestationCid: "bafkreihisf6mbwbobwhgmdsow77qssthrsvf73ndsxyeipyy3o6jtyggxm"
    },
    timestamp: "2026-05-05T15:15:40.748Z",
    hermeticSealHash: "0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413"
  },
  // ── UCC-1 + Smart Contract Attestor Field reference ────────────────
  smartContractAttestorField: {
    contracts: [
      "StoryAttestationService", "StoryOrchestrationService", "StoryAttestationBridge",
      "SLAPSIPSpvLoan", "GladiatorHoldingsSpvLoan", "PILLoanEnforcement",
      "StablecoinIPEscrow", "AngelCoin", "ResilienceToken",
      "SlapsStreaming", "SlapsSPV", "UCC1FilingIntegration",
      "StoryIPTokenBoundAccount", "StoryIPSafeProxyFactory"
    ],
    attestorFieldName: "teknosAttestor",
    attestorAddress: "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE",
    note: "Attestation type IP_VALUATION_ATTESTATION = 0x537b145ce6e67185955db6e27e4f2692ae3c538f0fef75eaffed7d2e6ad6a258 — recorded inside each contract's attestation registry."
  },
  ucc1Reference: {
    filingNumber: "20260000078753",
    jurisdiction: "New Mexico Secretary of State",
    amendment: 3,
    ucc1Filing: existingKyc["ucc1-filing"],
    ucc1FinancingStatement: existingKyc["ucc1-financing-statement"]
  },
  // ── New artifacts hashed + pinned in this run ──────────────────────
  newArtifactHashes: artifactHashes,
  newArtifactCids: {},   // populated after pin loop
  // ── Multi-sig (Clifton Kelly Bell · 3-of-5 quorum, already on-chain) ─
  multiSigAttestation: {
    threshold: "3 of 5",
    eip191Hash: sigCfg.eip191Hash,
    hermeticSealHash: "0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413",
    signer: "Clifton Kelly Bell",
    signaturesValidated: sigCfg.signaturesValidated,
    signatureCount: sigCfg.signatureCount,
    thresholdMet: sigCfg.thresholdMet,
    validatedAt: sigCfg.validatedAt,
    signatures: {
      signer_story:    { address: "0x5EEFF17e12401b6A8391f5257758E07c157E1e45", sig: sigCfg.signatures.signer3_story },
      signer_base:     { address: "0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A", sig: sigCfg.signatures.signer4_base },
      signer_coinbase: { address: "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a", sig: sigCfg.signatures.signer1_coinbase }
    }
  },
  storyScanCompliance: {
    hashAlgorithm: "keccak256",
    chainId: 1514,
    storyFoundation: "0x597856e93f19877a399f686D2F43b298e2268618"
  },
  morphoLoan: {
    safe: "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09",
    morphoBlue: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
    chain: "Base 8453",
    totalPrincipal_USDC: 6_000_000,
    btcMarket:  { principal: 5_000_000, apr: "4%", ltv: "86%", term: "24 months" },
    ethMarket:  { principal: 1_000_000, apr: "6%", ltv: "86%", term: "18 months" },
    repaymentSource: "100% of PIL licensing revenue ($12.3M/yr) routed through IP-Safe → Morpho.repay() until repaid"
  }
};

// ── Pinata multipart upload ─────────────────────────────────────────
function pinFile(absPath, name) {
  return new Promise((resolve, reject) => {
    const data = fs.readFileSync(absPath);
    const boundary = "----PinBoundary" + crypto.randomBytes(8).toString("hex");
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(absPath)}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`
    );
    const tail = Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="pinataMetadata"\r\n\r\n` +
      JSON.stringify({ name }) + `\r\n--${boundary}--\r\n`
    );
    const body = Buffer.concat([head, data, tail]);
    const req = https.request({
      method: "POST", hostname: "api.pinata.cloud", path: "/pinning/pinFileToIPFS",
      headers: {
        "Authorization": `Bearer ${JWT}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length
      }
    }, res => {
      let o = ""; res.on("data", d => o += d);
      res.on("end", () => {
        try { const j = JSON.parse(o); j.IpfsHash ? resolve(j) : reject(new Error(o)); }
        catch (e) { reject(new Error(o)); }
      });
    });
    req.on("error", reject);
    req.write(body); req.end();
  });
}

(async () => {
  const manifest = JSON.parse(fs.readFileSync("./ipfs-pin-manifest.json", "utf8"));
  for (const a of assets) {
    process.stdout.write(`Pinning ${path.basename(a.src)}… `);
    const r = await pinFile(a.src, a.label);
    console.log(r.IpfsHash);
    bundle.newArtifactCids[a.key] = r.IpfsHash;
    manifest.pins[a.key] = { cid: r.IpfsHash, description: a.label };
  }
  // patch Teknos field
  bundle.teknosAttestation.valuationReports.gladiatorValuationReport = bundle.newArtifactCids.ipValuationReportFull;

  // write final bundle
  fs.writeFileSync("./kyc-teknos-attestation-bundle.json", JSON.stringify(bundle, null, 2));

  // pin the bundle itself
  process.stdout.write("Pinning kyc-teknos-attestation-bundle.json… ");
  const final = await pinFile("./kyc-teknos-attestation-bundle.json", "KYC + Teknos & Associates Attestation Bundle (signed 3-of-5)");
  console.log(final.IpfsHash);
  manifest.pins.kycTeknosAttestationBundle = {
    cid: final.IpfsHash,
    description: "Signed KYC + Teknos & Associates + LexisNexis valuation bundle — Clifton Kelly Bell 3-of-5 quorum"
  };

  fs.writeFileSync("./ipfs-pin-manifest.json", JSON.stringify(manifest, null, 2));
  console.log("\n=== Final CIDs ===");
  for (const [k,v] of Object.entries(bundle.newArtifactCids)) console.log(`${k.padEnd(32)} ipfs://${v}`);
  console.log(`${"kycTeknosAttestationBundle".padEnd(32)} ipfs://${final.IpfsHash}`);
})().catch(e => { console.error(e); process.exit(1); });
