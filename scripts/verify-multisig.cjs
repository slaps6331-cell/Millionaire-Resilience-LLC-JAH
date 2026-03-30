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

// ── Expected signer addresses (hardcoded constants from the contracts) ──────
const EXPECTED_SIGNERS = {
  story:   "0x597856e93f19877a399f686D2F43b298e2268618",
  coinbase: "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
};

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
 * @param {string} label         - Human-readable signer label ("ThirdWeb" / "Coinbase")
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

  // ── 2. Resolve signatures ─────────────────────────────────────────────────
  // Priority: env var → signature-morpho-config.json → multisig-transaction.json
  let storySig   = process.env.STORY_SIGNATURE || null;
  let coinbaseSig = process.env.COINBASE_SIGNATURE || null;

  if (!storySig && sigConfig.signatures) {
    storySig = sigConfig.signatures.story || null;
  }
  if (!coinbaseSig && sigConfig.signatures) {
    coinbaseSig = sigConfig.signatures.coinbase || null;
  }

  // Fall back to multisig-transaction.json
  if ((!storySig || !coinbaseSig) && fs.existsSync(MULTISIG_TX_FILE)) {
    const txFile = JSON.parse(fs.readFileSync(MULTISIG_TX_FILE, "utf8"));
    if (txFile.signatures && Array.isArray(txFile.signatures)) {
      for (const entry of txFile.signatures) {
        if (
          entry.label === "Story" &&
          !storySig &&
          entry.signature
        ) {
          storySig = entry.signature;
        }
        if (
          entry.label === "Coinbase" &&
          !coinbaseSig &&
          entry.signature
        ) {
          coinbaseSig = entry.signature;
        }
      }
    }
  }

  // ── 3. Verify each signature ──────────────────────────────────────────────
  // NOTE: The raw keccak256 hash (signatureHash) is passed here because
  // recoverSigner() applies the EIP-191 prefix internally — this matches
  // the on-chain ecrecover() behaviour exactly.
  const rawHash = sigConfig.signatureHash;

  const storyOk = verifyOne(
    "Story",
    EXPECTED_SIGNERS.story,
    rawHash,
    storySig
  );
  const coinbaseOk = verifyOne(
    "Coinbase",
    EXPECTED_SIGNERS.coinbase,
    rawHash,
    coinbaseSig
  );

  // ── 4. Final result ───────────────────────────────────────────────────────
  console.log("=".repeat(60));
  const bothValid = storyOk && coinbaseOk;

  if (bothValid) {
    console.log("✓ 2/2 signatures verified — ready to submit to Morpho");
  } else {
    const count = [storyOk, coinbaseOk].filter(Boolean).length;
    console.log(`✗ ${count}/2 signatures verified — cannot proceed`);
    console.log(
      "\nObtain the missing signature(s) and re-run this script."
    );
    console.log("See DEPLOYMENT_GUIDE.md §3 for signing instructions.");
  }
  console.log("=".repeat(60));

  process.exit(bothValid ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
