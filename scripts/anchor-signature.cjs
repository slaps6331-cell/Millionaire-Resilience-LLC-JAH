const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

/**
 * Anchors the Clifton Kelly Bell handwritten signature to an on-chain hash
 * suitable for use with Morpho Protocol's ECDSA-compatible multi-sig flow.
 *
 * The hash encodes:
 *   - Signer name
 *   - Document type (UCC-1 Financing Statement)
 *   - Pinata IPFS CID of the original UCC-1 filing
 *   - Timestamp
 *
 * Usage:
 *   node scripts/anchor-signature.cjs
 */

const SIGNER_NAME = "Clifton Kelly Bell";
const DOCUMENT_TYPE = "UCC-1_FINANCING_STATEMENT";
const UCC1_CID =
  process.env.UCC1_FILING_HASH ||
  "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a";
const PINATA_GATEWAY = "https://lavender-neat-urial-76.mypinata.cloud/ipfs/";

async function anchorSignatureHash() {
  console.log("=".repeat(60));
  console.log("Signature Hash Anchoring — Morpho Protocol / UCC-1");
  console.log("=".repeat(60));

  const timestamp = Math.floor(Date.now() / 1000);

  // Encode signature metadata deterministically
  const signatureData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string", "string", "uint256"],
    [SIGNER_NAME, DOCUMENT_TYPE, UCC1_CID, timestamp]
  );
  const signatureHash = ethers.keccak256(signatureData);

  // EIP-191 personal sign prefix for ECDSA compatibility
  const prefixedHash = ethers.hashMessage(
    ethers.getBytes(signatureHash)
  );

  console.log("\nSignature details:");
  console.log(`  Signer:        ${SIGNER_NAME}`);
  console.log(`  Document type: ${DOCUMENT_TYPE}`);
  console.log(`  UCC-1 CID:     ${UCC1_CID}`);
  console.log(`  Timestamp:     ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);
  console.log(`\nHashes:`);
  console.log(`  Raw keccak256: ${signatureHash}`);
  console.log(`  EIP-191 hash:  ${prefixedHash}`);
  console.log();

  const morphoSignatureConfig = {
    signer: SIGNER_NAME,
    documentType: DOCUMENT_TYPE,
    ucc1Cid: UCC1_CID,
    ucc1Url: `${PINATA_GATEWAY}${UCC1_CID}`,
    timestamp,
    signatureHash,
    eip191Hash: prefixedHash,
    multisigSigners: {
      thirdweb:
        process.env.THIRDWEB_WALLET_ADDRESS ||
        "0xe45572Dc828eF0E46D852125f0743938aABe1e12",
      coinbase:
        process.env.COINBASE_WALLET_ADDRESS ||
        "0xdc2afcd0a97c1e878fdd64497806e52cc530f02a",
    },
    requiredSignatures: 2,
    verificationMethod: "MORPHO_PROTOCOL_MULTISIG",
    generatedAt: new Date().toISOString(),
  };

  const outputFile = "signature-morpho-config.json";
  fs.writeFileSync(outputFile, JSON.stringify(morphoSignatureConfig, null, 2));

  console.log("=".repeat(60));
  console.log(`✓ Signature config written to: ${outputFile}`);
  console.log("\nTo satisfy Morpho Protocol multi-sig:");
  console.log(
    `  Both wallets must sign the EIP-191 hash: ${prefixedHash}`
  );
  console.log("=".repeat(60));
}

anchorSignatureHash()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
