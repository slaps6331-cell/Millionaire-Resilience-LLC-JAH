const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

/**
 * Prepares a 3-of-5 multi-signature transaction configuration for Morpho Protocol.
 *
 * Morpho Protocol requires 3/5 signatures from the Safe multi-sig owners:
 *   1. Coinbase Wallet:         0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a
 *   2. Morpho Authorization:    0x20A8402c67b9D476ddC1D2DB12f03B30A468f135
 *   3. Story Protocol Deployer: 0x5EEFF17e12401b6A8391f5257758E07c157E1e45
 *   4. Base Authorization:      0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A
 *   5. SPV Custodian:           0xD39447807f18Ba965E8F3F6929c8815794B3C951
 *
 * Safe contract: 0xd314BE0a27c73Cd057308aC4f3dd472c482acc09
 *
 * This script generates a transaction hash and outputs a JSON file that
 * at least 3 of the 5 signers must sign before the transaction can be executed.
 *
 * Usage:
 *   node scripts/multisig-sign.cjs
 */

const MULTISIG_SIGNERS = {
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

const SAFE_CONTRACT_ADDRESS = process.env.MORPHO_SAFE_ADDRESS ||
  "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09";

const MULTISIG_THRESHOLD = parseInt(process.env.MORPHO_MULTISIG_THRESHOLD || "3", 10);

const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const STORY_CHAIN_ID = 1514;

const SIGNER_LABELS = {
  signer1_coinbase: "Coinbase Wallet",
  signer2_morpho:   "Morpho Authorization",
  signer3_story:    "Story Protocol Deployer",
  signer4_base:     "Base Authorization",
  signer5_spv:      "SPV Custodian",
};

async function createMultiSigTransaction() {
  console.log("=".repeat(60));
  console.log("Morpho Protocol — 3-of-5 Multi-Signature Transaction Setup");
  console.log("=".repeat(60));
  console.log(`\nSafe contract: ${SAFE_CONTRACT_ADDRESS}`);
  console.log(`Threshold:     ${MULTISIG_THRESHOLD} of ${Object.keys(MULTISIG_SIGNERS).length}`);
  console.log(`\nRequired signers (${MULTISIG_THRESHOLD}/${Object.keys(MULTISIG_SIGNERS).length}):`);
  Object.entries(MULTISIG_SIGNERS).forEach(([key, addr], i) => {
    console.log(`  ${i + 1}. ${SIGNER_LABELS[key]}: ${addr}`);
  });
  console.log();

  // Determine target contract from deployment config if available
  let targetContract = MORPHO_BLUE;
  const networkName = "story";
  const configFile = `deployment-config.${networkName}.json`;
  if (fs.existsSync(configFile)) {
    const deploymentConfig = JSON.parse(fs.readFileSync(configFile, "utf8"));
    targetContract =
      deploymentConfig.contracts.StoryOrchestrationService || MORPHO_BLUE;
    console.log(`Using deployed StoryOrchestrationService: ${targetContract}`);
  }

  // Build the transaction parameters.
  // NOTE: `nonce` here is a unique identifier for this signing request, not
  // an on-chain nonce.  Before broadcasting, replace this with the actual
  // account nonce retrieved via `provider.getTransactionCount(address)`.
  const nonce = Date.now();
  const txData = {
    to: targetContract,
    value: "0",
    data: "0x",
    nonce,
    chainId: STORY_CHAIN_ID,
    gasLimit: "8000000",
    gasPrice: ethers.parseUnits(
      process.env.GAS_PRICE_GWEI || "50",
      "gwei"
    ).toString(),
  };

  // Compute a deterministic transaction hash
  const txHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes", "uint256", "uint256", "uint256"],
      [
        txData.to,
        txData.value,
        txData.data,
        txData.nonce,
        txData.chainId,
        txData.gasLimit,
      ]
    )
  );

  console.log(`Transaction hash: ${txHash}`);
  console.log();

  const multiSigConfig = {
    transactionHash: txHash,
    targetContract,
    chainId: STORY_CHAIN_ID,
    safeContractAddress: SAFE_CONTRACT_ADDRESS,
    threshold: MULTISIG_THRESHOLD,
    requiredSignatures: MULTISIG_THRESHOLD,
    signers: Object.values(MULTISIG_SIGNERS),
    signatures: Object.entries(MULTISIG_SIGNERS).map(([key, addr]) => ({
      signer: addr,
      label: SIGNER_LABELS[key],
      signature: null,
      verified: false,
    })),
    txData,
    ucc1Reference: process.env.UCC1_FILING_HASH ||
      "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",
    ucc1FinancingStatement: process.env.UCC1_FINANCING_STATEMENT_CID ||
      "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu",
    timestamp: new Date().toISOString(),
  };

  const outputFile = "multisig-transaction.json";
  fs.writeFileSync(outputFile, JSON.stringify(multiSigConfig, null, 2));

  console.log("=".repeat(60));
  console.log(`✓ Multi-sig config written to: ${outputFile}`);
  console.log("\nNext steps:");
  console.log("  1. Share multisig-transaction.json with all 5 signers");
  console.log(
    `  2. At least ${MULTISIG_THRESHOLD} signers sign txData.transactionHash with their private key`
  );
  console.log("  3. Populate the 'signature' fields and set 'verified: true'");
  console.log("  4. Run: node scripts/verify-multisig.cjs");
  console.log("  5. Submit the signed transaction via the Safe contract");
  console.log("=".repeat(60));
}

createMultiSigTransaction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
