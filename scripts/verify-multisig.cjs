/**
 * On-chain EIP-191 / ECDSA multi-signature verification script.
 *
 * Replicates the exact ecrecover() check that Morpho Protocol performs
 * on-chain, in JavaScript (via ethers.js), so both signatures can be
 * validated locally before any transaction is submitted to the network.
 *
 * Prerequisites:
 *   1. Run `node scripts/anchor-signature.cjs` to generate
 *      signature-morpho-config.json with the eip191Hash.
 *   2. Obtain signatures from both wallet holders (see DEPLOYMENT_GUIDE.md §3).
 *   3. Populate the STORY_SIGNATURE and COINBASE_SIGNATURE environment
 *      variables (or pass them on the command line — see usage below).
 *
 * Usage:
 *   # With environment variables:
 *   STORY_SIGNATURE=0x... COINBASE_SIGNATURE=0x... node scripts/verify-multisig.cjs
 *
 *   # Or with a .env file containing STORY_SIGNATURE / COINBASE_SIGNATURE:
 *   node scripts/verify-multisig.cjs
 *
 * The script exits with code 0 if both signatures are valid, or 1 if either
 * signature fails to recover to the expected signer address.
 */

"use strict";

const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

// ── Expected signer addresses for the 3-of-5 Morpho multi-sig ───────────────
// Environment variables override defaults so GitHub Actions can inject the
// addresses stored in repository variables.
const EXPECTED_SIGNERS = {
  signer1_coinbase: process.env.MORPHO_MULTISIG_SIGNER_1 ||
    "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
  signer2_morpho: process.env.MORPHO_MULTISIG_SIGNER_2 ||
    "0x20A8402c67b9D476ddC1D2DB12f03B30A468f135",
  signer3_story: process.env.MORPHO_MULTISIG_SIGNER_3 ||
    "0x5EEFF17e12401b6A8391f5257758E07c157E1e45",
  signer4_base: process.env.MORPHO_MULTISIG_SIGNER_4 ||
    "0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A",
  signer5_spv: process.env.MORPHO_MULTISIG_SIGNER_5 ||
    "0xD39447807f18Ba965E8F3F6929c8815794B3C951",
};

// Safe contract address (the multi-sig wallet itself)
const SAFE_CONTRACT_ADDRESS = process.env.MORPHO_SAFE_ADDRESS ||
  "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09";

// 3-of-5 threshold: at least 3 valid signatures required to proceed
const MULTISIG_THRESHOLD = parseInt(process.env.MORPHO_MULTISIG_THRESHOLD || "3", 10);

// ── Signature config file produced by anchor-signature.cjs ──────────────────
const SIGNATURE_CONFIG_FILE = "signature-morpho-config.json";
// ── Multi-sig transaction file produced by multisig-sign.cjs ────────────────
const MULTISIG_TX_FILE = "multisig-transaction.json";

/**
 * Recover the signer address from an EIP-191 signature.
 *
 * Morpho Protocol uses EIP-191 ("personal_sign"), which prepends the standard
 * Ethereum message prefix before recovering:
 *   prefixedHash = keccak256("\x19Ethereum Signed Message:\n32" + messageHash)
 *   signerAddress = ecrecover(prefixedHash, v, r, s)
 *
 * @param {string} messageHash  - 32-byte hex hash (without EIP-191 prefix)
 * @param {string} signature    - 65-byte hex signature (r + s + v)
 * @returns {string} checksummed Ethereum address of recovered signer
 */
function recoverSigner(messageHash, signature) {
  // ethers.verifyMessage applies the EIP-191 prefix internally when given a
  // Uint8Array (raw bytes), matching the behaviour of eth_sign / personal_sign.
  return ethers.verifyMessage(ethers.getBytes(messageHash), signature);
}

/**
 * Verify a single signature and print the result.
 *
 * @param {string} label         - Human-readable signer label ("Story" / "Coinbase")
 * @param {string} expectedAddr  - The expected checksummed signer address
 * @param {string} messageHash   - 32-byte keccak256 hash (without EIP-191 prefix)
 * @param {string|null} signature - 65-byte hex signature, or null if not yet provided
 * @returns {boolean} true if the signature is valid
 */
function verifyOne(label, expectedAddr, messageHash, signature) {
  console.log(`Verifying ${label} (${expectedAddr.slice(0, 10)}...):`);

  if (!signature || signature === "null" || signature.length < 130) {
    console.log(`  ✗  No valid signature provided for ${label}.`);
    console.log(
      `     Obtain a signature by signing the eip191Hash with the ${label} wallet.`
    );
    console.log(`     See DEPLOYMENT_GUIDE.md §3 for step-by-step instructions.\n`);
    return false;
  }

  let recovered;
  try {
    recovered = recoverSigner(messageHash, signature);
  } catch (err) {
    console.log(`  ✗  Failed to parse or recover signature: ${err.message}\n`);
    return false;
  }

  const match =
    recovered.toLowerCase() === expectedAddr.toLowerCase();

  if (match) {
    console.log(`  Recovered:    ${recovered}`);
    console.log(`  ✓  Signature valid — signer address matches\n`);
  } else {
    console.log(`  Recovered:    ${recovered}`);
    console.log(`  Expected:     ${expectedAddr}`);
    console.log(`  ✗  Signature INVALID — recovered address does not match\n`);
  }

  return match;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Morpho Multi-Sig — On-Chain Signature Verification");
  console.log("=".repeat(60));
  console.log();

  // ── 1. Load signature config ─────────────────────────────────────────────
  if (!fs.existsSync(SIGNATURE_CONFIG_FILE)) {
    console.error(
      `ERROR: ${SIGNATURE_CONFIG_FILE} not found.\n` +
        `Run: node scripts/anchor-signature.cjs\n`
    );
    process.exit(1);
  }

  const sigConfig = JSON.parse(fs.readFileSync(SIGNATURE_CONFIG_FILE, "utf8"));
  const eip191Hash = sigConfig.eip191Hash;

  if (!eip191Hash || !eip191Hash.startsWith("0x")) {
    console.error(
      `ERROR: eip191Hash missing or malformed in ${SIGNATURE_CONFIG_FILE}\n`
    );
    process.exit(1);
  }

  console.log("Message details:");
  console.log(`  Signer:        ${sigConfig.signer}`);
  console.log(`  Document:      ${sigConfig.documentType}`);
  console.log(`  UCC-1 CID:     ${sigConfig.ucc1Cid}`);
  console.log(`  Raw hash:      ${sigConfig.signatureHash}`);
  console.log(`  EIP-191 hash:  ${eip191Hash}`);
  console.log();

  // ── 2. Resolve signatures (3-of-5 multi-sig) ────────────────────────────
  // Priority: env var → signature-morpho-config.json → multisig-transaction.json
  const SIGNER_ENV_MAP = {
    signer1_coinbase: "SIGNER1_SIGNATURE",
    signer2_morpho:   "SIGNER2_SIGNATURE",
    signer3_story:    "SIGNER3_SIGNATURE",
    signer4_base:     "SIGNER4_SIGNATURE",
    signer5_spv:      "SIGNER5_SIGNATURE",
  };

  const SIGNER_LABELS = {
    signer1_coinbase: "Signer 1 — Coinbase Wallet",
    signer2_morpho:   "Signer 2 — Morpho Authorization",
    signer3_story:    "Signer 3 — Story Protocol Deployer",
    signer4_base:     "Signer 4 — Base Authorization",
    signer5_spv:      "Signer 5 — SPV Custodian",
  };

  const resolvedSigs = {};
  for (const [key, envName] of Object.entries(SIGNER_ENV_MAP)) {
    // 1. Environment variable
    resolvedSigs[key] = process.env[envName] || null;
    // 2. signature-morpho-config.json
    if (!resolvedSigs[key] && sigConfig.signatures) {
      resolvedSigs[key] = sigConfig.signatures[key] || null;
    }
  }

  // 3. Fall back to multisig-transaction.json
  if (fs.existsSync(MULTISIG_TX_FILE)) {
    const txFile = JSON.parse(fs.readFileSync(MULTISIG_TX_FILE, "utf8"));
    if (txFile.signatures && Array.isArray(txFile.signatures)) {
      for (const entry of txFile.signatures) {
        for (const [key, label] of Object.entries(SIGNER_LABELS)) {
          if (!resolvedSigs[key] && entry.signer &&
              entry.signer.toLowerCase() === EXPECTED_SIGNERS[key].toLowerCase() &&
              entry.signature) {
            resolvedSigs[key] = entry.signature;
          }
        }
      }
    }
  }

  // ── 3. Verify each signature (3-of-5 threshold) ──────────────────────────
  // NOTE: The raw keccak256 hash (signatureHash) is passed here because
  // recoverSigner() applies the EIP-191 prefix internally — this matches
  // the on-chain ecrecover() behaviour exactly.
  const rawHash = sigConfig.signatureHash;

  console.log(`Safe contract address: ${SAFE_CONTRACT_ADDRESS}`);
  console.log(`Multi-sig threshold:   ${MULTISIG_THRESHOLD} of ${Object.keys(EXPECTED_SIGNERS).length}\n`);

  const results = {};
  for (const [key, expectedAddr] of Object.entries(EXPECTED_SIGNERS)) {
    results[key] = verifyOne(
      SIGNER_LABELS[key],
      expectedAddr,
      rawHash,
      resolvedSigs[key]
    );
  }

  // ── 4. Final result (3-of-5 threshold check) ─────────────────────────────
  console.log("=".repeat(60));
  const validCount = Object.values(results).filter(Boolean).length;
  const totalSigners = Object.keys(EXPECTED_SIGNERS).length;
  const meetsThreshold = validCount >= MULTISIG_THRESHOLD;

  if (meetsThreshold) {
    console.log(`✓ ${validCount}/${totalSigners} signatures verified (threshold: ${MULTISIG_THRESHOLD}) — ready to submit to Morpho`);
  } else {
    console.log(`✗ ${validCount}/${totalSigners} signatures verified (need ${MULTISIG_THRESHOLD}) — cannot proceed`);
    console.log(
      `\nObtain ${MULTISIG_THRESHOLD - validCount} more signature(s) and re-run this script.`
    );
    console.log("See DEPLOYMENT_GUIDE.md §3 for signing instructions.");
  }
  console.log("=".repeat(60));

  process.exit(meetsThreshold ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
