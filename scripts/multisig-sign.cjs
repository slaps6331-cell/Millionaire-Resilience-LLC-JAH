const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

/**
 * Prepares a multi-signature transaction configuration for Morpho Protocol.
 *
 * Morpho Protocol requires 2/2 signatures from:
 *   - Story Protocol deployer: 0x597856e93f19877a399f686D2F43b298e2268618
 *   - Coinbase wallet:         0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a
 *
 * This script generates a transaction hash and outputs a JSON file that
 * both signers must sign before the transaction can be executed.
 *
 * Usage:
 *   node scripts/multisig-sign.cjs
 */

const MULTISIG_SIGNERS = {
  story:   process.env.STORY_DEPLOYER_ADDRESS ||
    "0x597856e93f19877a399f686D2F43b298e2268618",
  coinbase: process.env.COINBASE_WALLET_ADDRESS ||
    "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
};

const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const STORY_CHAIN_ID = 1514;

async function createMultiSigTransaction() {
  console.log("=".repeat(60));
  console.log("Morpho Protocol — Multi-Signature Transaction Setup");
  console.log("=".repeat(60));
  console.log("\nRequired signers (2/2):");
  console.log(`  1. Story deployer: ${MULTISIG_SIGNERS.story}`);
  console.log(`  2. Coinbase:       ${MULTISIG_SIGNERS.coinbase}`);
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
    requiredSignatures: 2,
    signers: Object.values(MULTISIG_SIGNERS),
    signatures: [
      {
        signer: MULTISIG_SIGNERS.story,
        label: "Story",
        signature: null,
        verified: false,
      },
      {
        signer: MULTISIG_SIGNERS.coinbase,
        label: "Coinbase",
        signature: null,
        verified: false,
      },
    ],
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
  console.log("  1. Share multisig-transaction.json with both signers");
  console.log(
    "  2. Each signer signs txData.transactionHash with their private key"
  );
  console.log("  3. Populate the 'signature' fields and set 'verified: true'");
  console.log("  4. Submit the signed transaction to the network");
  console.log("=".repeat(60));
}

createMultiSigTransaction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
