/**
 * Local deployment test script.
 *
 * Deploys all 11 smart contracts to Hardhat's in-memory local network and
 * confirms each contract is reachable on-chain.  This is used by the CI
 * "Check Smart Contracts" workflow and can also be run locally:
 *
 *   node scripts/test-deploy.cjs
 *
 * No environment variables are required — Hardhat provides auto-funded test
 * accounts automatically.
 */

const hre = require("hardhat");
const { ethers } = hre;

const CONTRACT_NAMES = [
  "StoryAttestationService",
  "StoryOrchestrationService",
  "StoryAttestationBridge",
  "SLAPSIPSpvLoan",
  "GladiatorHoldingsSpvLoan",
  "PILLoanEnforcement",
  "StablecoinIPEscrow",
  "AngelCoin",
  "ResilienceToken",
  "SlapsStreaming",
  "SlapsSPV",
];

async function main() {
  console.log("=".repeat(60));
  console.log("Local Deployment Test — Hardhat In-Memory Network");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`Network:  ${hre.network.name} (Chain ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log();

  const results = {};
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < CONTRACT_NAMES.length; i++) {
    const name = CONTRACT_NAMES[i];
    process.stdout.write(
      `[${String(i + 1).padStart(2, " ")}/${CONTRACT_NAMES.length}] ${name} ... `
    );

    try {
      const Factory = await ethers.getContractFactory(name);
      const contract = await Factory.deploy();
      await contract.waitForDeployment();
      const address = await contract.getAddress();

      // Confirm the contract has code at the deployed address
      const code = await ethers.provider.getCode(address);
      if (code === "0x") throw new Error("No bytecode at deployed address");

      results[name] = { address, status: "OK" };
      console.log(`✓  ${address}`);
      passed++;
    } catch (err) {
      results[name] = { address: null, status: "FAIL", error: err.message };
      console.log(`✗  FAILED — ${err.message}`);
      failed++;
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log(
    `Result: ${passed}/${CONTRACT_NAMES.length} deployed — ${failed} failed`
  );
  console.log("=".repeat(60));

  if (failed > 0) {
    console.error("\nFailed contracts:");
    for (const [name, info] of Object.entries(results)) {
      if (info.status === "FAIL") {
        console.error(`  ✗ ${name}: ${info.error}`);
      }
    }
    process.exit(1);
  }

  console.log(
    "\n✓ All contracts deploy successfully on the local network.\n"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
