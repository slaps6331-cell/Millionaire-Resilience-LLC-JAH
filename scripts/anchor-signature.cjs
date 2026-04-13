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
      signer1_coinbase:
        process.env.MORPHO_MULTISIG_SIGNER_1 ||
        "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
      signer2_morpho:
        process.env.MORPHO_MULTISIG_SIGNER_2 ||
        "0x20A8402c67b9D476ddC1D2DB12f03B30A468f135",
      signer3_story:
        process.env.MORPHO_MULTISIG_SIGNER_3 ||
        "0x5EEFF17e12401b6A8391f5257758E07c157E1e45",
      signer4_base:
        process.env.MORPHO_MULTISIG_SIGNER_4 ||
        "0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A",
      signer5_spv:
        process.env.MORPHO_MULTISIG_SIGNER_5 ||
        "0xD39447807f18Ba965E8F3F6929c8815794B3C951",
    },
    safeContractAddress:
      process.env.MORPHO_SAFE_ADDRESS ||
      "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09",
    requiredSignatures: 3,
    multisigThreshold: "3-of-5",
    verificationMethod: "GNOSIS_SAFE_MORPHO_MULTISIG",
    generatedAt: new Date().toISOString(),
  };

  const outputFile = "signature-morpho-config.json";
  fs.writeFileSync(outputFile, JSON.stringify(morphoSignatureConfig, null, 2));

  console.log("=".repeat(60));
  console.log(`✓ Signature config written to: ${outputFile}`);
  console.log("\nTo satisfy Morpho Protocol 3-of-5 multi-sig:");
  console.log(
    `  At least 3 of the 5 Safe owners must sign the EIP-191 hash: ${prefixedHash}`
  );
  console.log("=".repeat(60));
}

anchorSignatureHash()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
