#!/usr/bin/env node
"use strict";
/**
 * pin-verification-refresh.cjs
 *
 * Re-pins the canonical verification artifacts (ABI bytecode proof, valuation
 * attestation, signed loan terms, Morpho safe metadata, UCC-1 metadata, signed
 * Steakhouse Prime USDC onboarding bundle) to Pinata so every fresh CID is
 * captured in ipfs-pin-manifest.json.
 *
 * Also builds + pins the signed "Steakhouse Prime USDC Curator Onboarding"
 * bundle that includes the Morpho Blue setAuthorization calldata, the
 * Steakhouse curator vault address, and Clifton Kelly Bell's 3-of-5 sigs.
 */
const fs    = require("fs");
const path  = require("path");
const https = require("https");
const crypto= require("crypto");
const { ethers } = require("ethers");
require("dotenv").config();

const JWT = process.env.PINATA_JWT;
if (!JWT) { console.error("PINATA_JWT missing"); process.exit(1); }

// ── Build signed Steakhouse onboarding bundle ──────────────────────
const sigCfg     = JSON.parse(fs.readFileSync("./signature-morpho-config.json","utf8"));
const verHashes  = JSON.parse(fs.readFileSync("./pinata-verification-hashes.json","utf8"));
const morphoBlue = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const steakhouse = "0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2";
const safe       = "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09";
const usdcBase   = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const morphoIface = new ethers.Interface([
  "function setAuthorization(address authorized,bool isAuthorized)"
]);
const erc20Iface  = new ethers.Interface([
  "function approve(address spender,uint256 amount) returns (bool)"
]);

const steakhouseBundle = {
  documentType: "UCC1_MORPHO_STEAKHOUSE_PRIME_USDC_ONBOARDING_SIGNED",
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  status: "SIGNED_BY_CLIFTON_KELLY_BELL_3OF5",
  curator: {
    name: "Steakhouse Financial",
    vaultName: "Steakhouse Prime USDC",
    vaultAddress: steakhouse,
    curatorMultiSig: "Steakhouse 2-of-3",
    morphoApp: `https://app.morpho.org/base/vault/${steakhouse}/steakhouse-prime-usdc`,
    chain: "Base 8453"
  },
  safe: { address: safe, threshold: "3 of 5", owner: "Clifton Kelly Bell" },
  ucc1Reference: {
    filingNumber: "20260000078753",
    jurisdiction: "New Mexico Secretary of State",
    amendment: 3,
    ucc1Filing: "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",
    ucc1FinancingStatement: "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu"
  },
  onChainCalldata: {
    tx1_authorizeStoryFoundation: {
      to: morphoBlue, chain: "Base 8453",
      data: morphoIface.encodeFunctionData("setAuthorization", [
        "0x597856e93f19877a399f686D2F43b298e2268618", true
      ])
    },
    tx2_authorizeSteakhouseVault: {
      to: morphoBlue, chain: "Base 8453",
      data: morphoIface.encodeFunctionData("setAuthorization", [steakhouse, true])
    },
    tx3_approveSteakhouseSpendUSDC: {
      to: usdcBase, chain: "Base 8453",
      data: erc20Iface.encodeFunctionData("approve", [steakhouse, 6_000_000_000_000n])
    }
  },
  loanTerms: {
    btc: { principal: 5_000_000, currency: "USDC", collateral: "WBTC", lltv: "86%", apr: "4%", term: "24 months" },
    eth: { principal: 1_000_000, currency: "USDC", collateral: "WETH", lltv: "86%", apr: "6%", term: "18 months" },
    repaymentSource: "100% of SLAPS PIL licensing revenue routed through SmartPacts1 until repaid"
  },
  storyAttester: {
    attester: "Story Attestation Service",
    contract: "StoryAttestationService",
    chainId: 1514,
    attestationTypeIds: {
      CORPORATE_VERIFICATION: "0x908b874ceda681a131aff726b1b5c42ff40514be54505fd27602bc763adf38ad",
      IP_VALUATION_ATTESTATION: "0x537b145ce6e67185955db6e27e4f2692ae3c538f0fef75eaffed7d2e6ad6a258",
      UCC1_BRIDGE_ATTESTATION: "0x0cf7f46400094294ea1e3d3741656bc826f486d6ad593c41525e9a8d22672db3",
      LOAN_COLLATERAL_ATTESTATION: "0xd2a93ed375b28631f806632b55b922ddb4bf2e5a6fe51e92581e8906d47d57ae",
      MORPHO_MARKET_ATTESTATION: "0x01b118b286562fc6cfdce780c5d9e22ad2fd8ee3941d3aba1e4de05ba7021d54",
      SPV_SEGREGATION_ATTESTATION: "0xa27e025efd455bf7687dd74e2e8adb215791b761d5f3565f61d22c2798b2dffd"
    },
    teknosAssociates: {
      role: "IP Valuation & Certification Attestor",
      attestationId: "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE",
      hermeticSealHash: "0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413"
    }
  },
  multiSigAttestation: {
    threshold: "3 of 5",
    eip191Hash: sigCfg.eip191Hash,
    hermeticSealHash: "0xed4bd3b5123971b5bd15fb55b0b57d543518c78b22906b45199bfeec1db7f413",
    signaturesValidated: sigCfg.signaturesValidated,
    signatureCount: sigCfg.signatureCount,
    thresholdMet: sigCfg.thresholdMet,
    signatures: {
      signer_story:    { address: "0x5EEFF17e12401b6A8391f5257758E07c157E1e45", sig: sigCfg.signatures.signer3_story },
      signer_base:     { address: "0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A", sig: sigCfg.signatures.signer4_base },
      signer_coinbase: { address: "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a", sig: sigCfg.signatures.signer1_coinbase }
    }
  },
  abiBytecodeReference: {
    abiProofCid: "bafybeib6hyfertedqdtcuidl7myqqrksi4vaf5rr4doebnu7odmgu5xlcq",
    verificationHashesCid: "bafkreicaaap7ponqikpocx4v3oo2nmqeesuuxlel5ichkiynrtdbco3fgq",
    contractHashes: Object.fromEntries(Object.entries(verHashes.contracts).map(
      ([k,v]) => [k, { deployedBytecodeKeccak256: v.deployedBytecodeKeccak256, abiSha256: v.abiSha256 }]
    ))
  }
};

fs.writeFileSync("./steakhouse-onboarding-signed.json", JSON.stringify(steakhouseBundle, null, 2));

// ── Files to re-pin / refresh ──────────────────────────────────────
const files = [
  { src: "abi-proof.json",                       key: "abiProofRefreshed",                 label: "ABI Proof — All 12 + 2 new (StoryIP TBA & Safe Proxy) refreshed" },
  { src: "valuation-attestation.json",           key: "valuationAttestationRefreshed",     label: "Valuation Attestation refreshed" },
  { src: "signature-morpho-config.json",         key: "signatureMorphoConfigRefreshed",    label: "Signature/Morpho Config refreshed" },
  { src: "morpho-loan-terms-signed.json",        key: "morphoLoanTermsSignedRefreshed",    label: "Morpho Loan Terms (signed) refreshed" },
  { src: "morpho-safe-metadata.json",            key: "morphoSafeMetadataRefreshed",       label: "Morpho Safe Metadata refreshed" },
  { src: "ucc1-metadata-pinata.json",            key: "ucc1MetadataPinataRefreshed",       label: "UCC-1 Metadata (Pinata, Amendment 3) refreshed" },
  { src: "pinata-verification-hashes.json",      key: "pinataVerificationHashesRefreshed", label: "Pinata Verification Hashes (keccak256/sha256) refreshed" },
  { src: "deployment-registry.json",             key: "deploymentRegistryRefreshed",       label: "Deployment Registry refreshed" },
  { src: "steakhouse-onboarding-signed.json",    key: "steakhouseOnboardingSigned",        label: "UCC-1 + Morpho Steakhouse Prime USDC v2 Onboarding (signed)" }
];

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
      headers: {
        "Authorization": `Bearer ${JWT}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length
      }
    }, res => {
      let o = ""; res.on("data", d => o += d);
      res.on("end", () => { try { const j = JSON.parse(o); j.IpfsHash ? resolve(j) : reject(new Error(o)); } catch(e){ reject(new Error(o)); } });
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

(async () => {
  const manifest = JSON.parse(fs.readFileSync("./ipfs-pin-manifest.json", "utf8"));
  const out = {};
  for (const f of files) {
    process.stdout.write(`Pinning ${f.src}… `);
    const buf = fs.readFileSync(f.src);
    const k = ethers.keccak256(buf);
    const r = await pinFile(f.src, f.label);
    console.log(`${r.IpfsHash}  (keccak ${k.slice(0,18)}…)`);
    out[f.key] = { cid: r.IpfsHash, keccak256: k, bytes: buf.length };
    manifest.pins[f.key] = { cid: r.IpfsHash, description: f.label, keccak256: k };
  }
  fs.writeFileSync("./ipfs-pin-manifest.json", JSON.stringify(manifest, null, 2));
  fs.writeFileSync("./verification-refresh-results.json", JSON.stringify(out, null, 2));
  console.log("\n=== Final ===");
  for (const [k,v] of Object.entries(out)) console.log(`${k.padEnd(38)} ipfs://${v.cid}`);
})().catch(e => { console.error(e); process.exit(1); });
