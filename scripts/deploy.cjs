const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;

/**
 * Deployment script for Gladiator Holdings LLC smart contracts.
 *
 * Targets:
 *   - Story Protocol mainnet (Chain 1514) — verified on StoryScan
 *   - Base L2 (Chain 8453) — verified on Etherscan/Basescan
 *
 * Multi-signature requirement (Morpho Protocol):
 *   - ThirdWeb wallet:  0xe45572Dc828eF0E46D852125f0743938aABe1e12
 *   - Coinbase wallet:  0xdc2afcd0a97c1e878fdd64497806e52cc530f02a
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network story
 *   npx hardhat run scripts/deploy.js --network base
 */

const MULTISIG_SIGNERS = {
  thirdweb: "0xe45572Dc828eF0E46D852125f0743938aABe1e12",
  coinbase: "0xdc2afcd0a97c1e878fdd64497806e52cc530f02a",
};

async function deployContract(name, factory, ...args) {
  console.log(`  Deploying ${name}...`);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`  ✓ ${name} deployed at: ${address}\n`);
  return { contract, address };
}

async function main() {
  console.log("=".repeat(60));
  console.log("Gladiator Holdings LLC — Smart Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`\nNetwork:   ${hre.network.name} (Chain ${network.chainId})`);
  console.log(`Deployer:  ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:   ${ethers.formatEther(balance)} ETH`);
  console.log(`\nMulti-sig signers (Morpho Protocol — 2/2 required):`);
  console.log(`  ThirdWeb: ${MULTISIG_SIGNERS.thirdweb}`);
  console.log(`  Coinbase: ${MULTISIG_SIGNERS.coinbase}`);
  console.log();

  const deploymentConfig = {
    deployer: deployer.address,
    network: hre.network.name,
    chainId: Number(network.chainId),
    timestamp: new Date().toISOString(),
    multisigSigners: MULTISIG_SIGNERS,
    contracts: {},
  };

  // ── 1. StoryAttestationService ──────────────────────────────────────
  console.log("[1/11] StoryAttestationService");
  const StoryAttestationService = await ethers.getContractFactory(
    "StoryAttestationService"
  );
  const { address: sasAddress } = await deployContract(
    "StoryAttestationService",
    StoryAttestationService
  );
  deploymentConfig.contracts.StoryAttestationService = sasAddress;

  // ── 2. StoryOrchestrationService ────────────────────────────────────
  console.log("[2/11] StoryOrchestrationService");
  const StoryOrchestrationService = await ethers.getContractFactory(
    "StoryOrchestrationService"
  );
  const { address: sosAddress } = await deployContract(
    "StoryOrchestrationService",
    StoryOrchestrationService
  );
  deploymentConfig.contracts.StoryOrchestrationService = sosAddress;

  // ── 3. StoryAttestationBridge ────────────────────────────────────────
  console.log("[3/11] StoryAttestationBridge");
  const StoryAttestationBridge = await ethers.getContractFactory(
    "StoryAttestationBridge"
  );
  const { address: sabAddress } = await deployContract(
    "StoryAttestationBridge",
    StoryAttestationBridge
  );
  deploymentConfig.contracts.StoryAttestationBridge = sabAddress;

  // ── 4. SLAPSIPSpvLoan ───────────────────────────────────────────────
  console.log("[4/11] SLAPSIPSpvLoan");
  const SLAPSIPSpvLoan = await ethers.getContractFactory("SLAPSIPSpvLoan");
  const { address: slapsLoanAddress } = await deployContract(
    "SLAPSIPSpvLoan",
    SLAPSIPSpvLoan
  );
  deploymentConfig.contracts.SLAPSIPSpvLoan = slapsLoanAddress;

  // ── 5. GladiatorHoldingsSpvLoan ─────────────────────────────────────
  console.log("[5/11] GladiatorHoldingsSpvLoan");
  const GladiatorHoldingsSpvLoan = await ethers.getContractFactory(
    "GladiatorHoldingsSpvLoan"
  );
  const { address: gladLoanAddress } = await deployContract(
    "GladiatorHoldingsSpvLoan",
    GladiatorHoldingsSpvLoan
  );
  deploymentConfig.contracts.GladiatorHoldingsSpvLoan = gladLoanAddress;

  // ── 6. PILLoanEnforcement ───────────────────────────────────────────
  console.log("[6/11] PILLoanEnforcement");
  const PILLoanEnforcement = await ethers.getContractFactory(
    "PILLoanEnforcement"
  );
  const { address: pilAddress } = await deployContract(
    "PILLoanEnforcement",
    PILLoanEnforcement
  );
  deploymentConfig.contracts.PILLoanEnforcement = pilAddress;

  // ── 7. StablecoinIPEscrow ───────────────────────────────────────────
  console.log("[7/11] StablecoinIPEscrow");
  const StablecoinIPEscrow = await ethers.getContractFactory(
    "StablecoinIPEscrow"
  );
  const { address: escrowAddress } = await deployContract(
    "StablecoinIPEscrow",
    StablecoinIPEscrow
  );
  deploymentConfig.contracts.StablecoinIPEscrow = escrowAddress;

  // ── 8. AngelCoin ────────────────────────────────────────────────────
  console.log("[8/11] AngelCoin (ANGEL)");
  const AngelCoin = await ethers.getContractFactory("AngelCoin");
  const { address: angelAddress } = await deployContract(
    "AngelCoin",
    AngelCoin
  );
  deploymentConfig.contracts.AngelCoin = angelAddress;

  // ── 9. ResilienceToken ──────────────────────────────────────────────
  console.log("[9/11] ResilienceToken (RSIL)");
  const ResilienceToken = await ethers.getContractFactory("ResilienceToken");
  const { address: rsilAddress } = await deployContract(
    "ResilienceToken",
    ResilienceToken
  );
  deploymentConfig.contracts.ResilienceToken = rsilAddress;

  // ── 10. SlapsStreaming ───────────────────────────────────────────────
  console.log("[10/11] SlapsStreaming");
  const SlapsStreaming = await ethers.getContractFactory("SlapsStreaming");
  const { address: streamingAddress } = await deployContract(
    "SlapsStreaming",
    SlapsStreaming
  );
  deploymentConfig.contracts.SlapsStreaming = streamingAddress;

  // ── 11. SlapsSPV ────────────────────────────────────────────────────
  console.log("[11/11] SlapsSPV");
  const SlapsSPV = await ethers.getContractFactory("SlapsSPV");
  const { address: spvAddress } = await deployContract("SlapsSPV", SlapsSPV);
  deploymentConfig.contracts.SlapsSPV = spvAddress;

  // ── Save results ─────────────────────────────────────────────────────
  const outputFile = `deployment-config.${hre.network.name}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(deploymentConfig, null, 2));

  console.log("=".repeat(60));
  console.log("✓ All contracts deployed successfully");
  console.log(`  Results saved to: ${outputFile}`);
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log(
    "  1. Run: npx hardhat run scripts/verify.js --network " + hre.network.name
  );
  console.log("  2. Run: node scripts/multisig-sign.js");
  console.log(
    "  3. Review multisig-transaction.json and collect both signatures"
  );
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
