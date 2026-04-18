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
 * Multi-signature requirement (Morpho Protocol — 3-of-5 Gnosis Safe):
 *   Signer 1 (Coinbase):         0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a
 *   Signer 2 (Morpho Auth):      0x20A8402c67b9D476ddC1D2DB12f03B30A468f135
 *   Signer 3 (Story Deployer):   0x5EEFF17e12401b6A8391f5257758E07c157E1e45
 *   Signer 4 (Base Auth):        0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A
 *   Signer 5 (SPV Custodian):    0xD39447807f18Ba965E8F3F6929c8815794B3C951
 *   Safe Contract:                0xd314BE0a27c73Cd057308aC4f3dd472c482acc09
 *
 * Usage:
 *   npx hardhat run scripts/deploy.cjs --network story
 *   npx hardhat run scripts/deploy.cjs --network base
 */

const MULTISIG_CONFIG = {
  type: "GNOSIS_SAFE_3_OF_5",
  threshold: 3,
  safeContract: process.env.MORPHO_SAFE_ADDRESS || "0xd314BE0a27c73Cd057308aC4f3dd472c482acc09",
  signers: {
    signer1_coinbase: process.env.MORPHO_MULTISIG_SIGNER_1 || "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
    signer2_morpho:   process.env.MORPHO_MULTISIG_SIGNER_2 || "0x20A8402c67b9D476ddC1D2DB12f03B30A468f135",
    signer3_story:    process.env.MORPHO_MULTISIG_SIGNER_3 || "0x5EEFF17e12401b6A8391f5257758E07c157E1e45",
    signer4_base:     process.env.MORPHO_MULTISIG_SIGNER_4 || "0x4C7CD4eC5232589696d3fFC0D3ddaa9B59FF072A",
    signer5_spv:      process.env.MORPHO_MULTISIG_SIGNER_5 || "0xD39447807f18Ba965E8F3F6929c8815794B3C951",
  },
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
  console.log(`\nMulti-sig (Morpho Protocol — ${MULTISIG_CONFIG.threshold}/${Object.keys(MULTISIG_CONFIG.signers).length}):`);
  console.log(`  Safe contract: ${MULTISIG_CONFIG.safeContract}`);
  Object.entries(MULTISIG_CONFIG.signers).forEach(([key, addr]) => {
    console.log(`  ${key}: ${addr}`);
  });
  console.log();

  const deploymentConfig = {
    deployer: deployer.address,
    network: hre.network.name,
    chainId: Number(network.chainId),
    timestamp: new Date().toISOString(),
    multisigConfig: MULTISIG_CONFIG,
    contracts: {},
  };

  // ── 1. StoryAttestationService ──────────────────────────────────────
  console.log("[1/12] StoryAttestationService");
  const StoryAttestationService = await ethers.getContractFactory(
    "StoryAttestationService"
  );
  const { address: sasAddress } = await deployContract(
    "StoryAttestationService",
    StoryAttestationService
  );
  deploymentConfig.contracts.StoryAttestationService = sasAddress;

  // ── 2. StoryOrchestrationService ────────────────────────────────────
  console.log("[2/12] StoryOrchestrationService");
  const StoryOrchestrationService = await ethers.getContractFactory(
    "StoryOrchestrationService"
  );
  const { address: sosAddress } = await deployContract(
    "StoryOrchestrationService",
    StoryOrchestrationService
  );
  deploymentConfig.contracts.StoryOrchestrationService = sosAddress;

  // ── 3. StoryAttestationBridge ────────────────────────────────────────
  console.log("[3/12] StoryAttestationBridge");
  const StoryAttestationBridge = await ethers.getContractFactory(
    "StoryAttestationBridge"
  );
  const { address: sabAddress } = await deployContract(
    "StoryAttestationBridge",
    StoryAttestationBridge
  );
  deploymentConfig.contracts.StoryAttestationBridge = sabAddress;

  // ── 4. SLAPSIPSpvLoan ───────────────────────────────────────────────
  console.log("[4/12] SLAPSIPSpvLoan");
  const SLAPSIPSpvLoan = await ethers.getContractFactory("SLAPSIPSpvLoan");
  const { address: slapsLoanAddress } = await deployContract(
    "SLAPSIPSpvLoan",
    SLAPSIPSpvLoan
  );
  deploymentConfig.contracts.SLAPSIPSpvLoan = slapsLoanAddress;

  // ── 5. GladiatorHoldingsSpvLoan ─────────────────────────────────────
  console.log("[5/12] GladiatorHoldingsSpvLoan");
  const GladiatorHoldingsSpvLoan = await ethers.getContractFactory(
    "GladiatorHoldingsSpvLoan"
  );
  const { address: gladLoanAddress } = await deployContract(
    "GladiatorHoldingsSpvLoan",
    GladiatorHoldingsSpvLoan
  );
  deploymentConfig.contracts.GladiatorHoldingsSpvLoan = gladLoanAddress;

  // ── 6. PILLoanEnforcement ───────────────────────────────────────────
  console.log("[6/12] PILLoanEnforcement");
  const PILLoanEnforcement = await ethers.getContractFactory(
    "PILLoanEnforcement"
  );
  const { address: pilAddress } = await deployContract(
    "PILLoanEnforcement",
    PILLoanEnforcement
  );
  deploymentConfig.contracts.PILLoanEnforcement = pilAddress;

  // ── 7. StablecoinIPEscrow ───────────────────────────────────────────
  console.log("[7/12] StablecoinIPEscrow");
  const StablecoinIPEscrow = await ethers.getContractFactory(
    "StablecoinIPEscrow"
  );
  const { address: escrowAddress } = await deployContract(
    "StablecoinIPEscrow",
    StablecoinIPEscrow
  );
  deploymentConfig.contracts.StablecoinIPEscrow = escrowAddress;

  // ── 8. AngelCoin ────────────────────────────────────────────────────
  console.log("[8/12] AngelCoin (ANGEL)");
  const AngelCoin = await ethers.getContractFactory("AngelCoin");
  const { address: angelAddress } = await deployContract(
    "AngelCoin",
    AngelCoin
  );
  deploymentConfig.contracts.AngelCoin = angelAddress;

  // ── 9. ResilienceToken ──────────────────────────────────────────────
  console.log("[9/12] ResilienceToken (RSIL)");
  const ResilienceToken = await ethers.getContractFactory("ResilienceToken");
  const { address: rsilAddress } = await deployContract(
    "ResilienceToken",
    ResilienceToken
  );
  deploymentConfig.contracts.ResilienceToken = rsilAddress;

  // ── 10. SlapsStreaming ───────────────────────────────────────────────
  console.log("[10/12] SlapsStreaming");
  const SlapsStreaming = await ethers.getContractFactory("SlapsStreaming");
  const { address: streamingAddress } = await deployContract(
    "SlapsStreaming",
    SlapsStreaming
  );
  deploymentConfig.contracts.SlapsStreaming = streamingAddress;

  // ── 11. SlapsSPV ────────────────────────────────────────────────────
  console.log("[11/12] SlapsSPV");
  const SlapsSPV = await ethers.getContractFactory("SlapsSPV");
  const { address: spvAddress } = await deployContract("SlapsSPV", SlapsSPV);
  deploymentConfig.contracts.SlapsSPV = spvAddress;

  // ── 12. UCC1FilingIntegration ────────────────────────────────────────
  console.log("[12/12] UCC1FilingIntegration");
  const UCC1FilingIntegration = await ethers.getContractFactory(
    "UCC1FilingIntegration"
  );
  const { address: ucc1Address } = await deployContract(
    "UCC1FilingIntegration",
    UCC1FilingIntegration
  );
  deploymentConfig.contracts.UCC1FilingIntegration = ucc1Address;

  // ── Save results ─────────────────────────────────────────────────────
  const outputFile = `deployment-config.${hre.network.name}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(deploymentConfig, null, 2));

  console.log("=".repeat(60));
  console.log("✓ All contracts deployed successfully");
  console.log(`  Results saved to: ${outputFile}`);
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log(
    "  1. Run: npx hardhat run scripts/verify.cjs --network " + hre.network.name
  );
  console.log("  2. Run: node scripts/multisig-sign.cjs");
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
