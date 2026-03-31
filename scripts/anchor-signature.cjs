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
const UCC1_FINANCING_STATEMENT_CID =
  process.env.UCC1_FINANCING_STATEMENT_CID ||
  "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu";

// Build the Pinata gateway base URL from env vars so the token is never hardcoded.
// Set PINATA_GATEWAY_NAME (gateway subdomain) and PINATA_GATEWAY_TOKEN in .env or
// as GitHub Secrets. See .env.example for details.
const PINATA_GATEWAY_NAME =
  process.env.PINATA_GATEWAY_NAME || "lavender-neat-urial-76";
const PINATA_GATEWAY_TOKEN = process.env.PINATA_GATEWAY_TOKEN || "";
const PINATA_GATEWAY = `https://${PINATA_GATEWAY_NAME}.mypinata.cloud/ipfs/`;

/**
 * Append the Pinata gateway token as a query parameter when it is available,
 * so private/restricted gateways can be accessed without hardcoding the token.
 */
function pinataUrl(cid) {
  const base = `${PINATA_GATEWAY}${cid}`;
  return PINATA_GATEWAY_TOKEN ? `${base}?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}` : base;
}

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
    ucc1Url: pinataUrl(UCC1_CID),
    timestamp,
    signatureHash,
    eip191Hash: prefixedHash,
    multisigSigners: {
      story:
        process.env.STORY_DEPLOYER_ADDRESS ||
        "0x597856e93f19877a399f686D2F43b298e2268618",
      coinbase:
        process.env.COINBASE_WALLET_ADDRESS ||
        "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
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
