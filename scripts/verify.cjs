const hre = require("hardhat");
const fs = require("fs");

/**
 * Verifies deployed contracts on StoryScan (Story Protocol) or Etherscan.
 *
 * Usage:
 *   npx hardhat run scripts/verify.cjs --network story
 *   npx hardhat run scripts/verify.cjs --network base
 *
 * Requires deployment-config.<network>.json produced by deploy.js.
 */
async function main() {
  const networkName = hre.network.name;
  const configFile = `deployment-config.${networkName}.json`;

  if (!fs.existsSync(configFile)) {
    console.error(`ERROR: ${configFile} not found. Run deploy.js first.`);
    process.exit(1);
  }

  const deploymentConfig = JSON.parse(fs.readFileSync(configFile, "utf8"));

  console.log("=".repeat(60));
  console.log(`Verifying contracts on ${networkName}`);
  console.log("=".repeat(60));
  console.log(`Deployed at: ${deploymentConfig.timestamp}`);
  console.log(`Deployer:    ${deploymentConfig.deployer}\n`);

  let verified = 0;
  let failed = 0;

  for (const [contractName, contractAddress] of Object.entries(
    deploymentConfig.contracts
  )) {
    console.log(`Verifying ${contractName} at ${contractAddress}...`);
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log(`  ✓ ${contractName} verified\n`);
      verified++;
    } catch (error) {
      if (
        error.message.includes("Already Verified") ||
        error.message.includes("already verified")
      ) {
        console.log(`  ✓ ${contractName} already verified\n`);
        verified++;
      } else {
        console.error(`  ✗ ${contractName} verification failed: ${error.message}\n`);
        failed++;
      }
    }
  }

  console.log("=".repeat(60));
  console.log(`Verification complete: ${verified} verified, ${failed} failed`);

  if (networkName === "story") {
    console.log("\nView on StoryScan: https://www.storyscan.io");
  } else if (networkName === "base") {
    console.log("\nView on Basescan:  https://basescan.org");
  } else if (networkName === "mainnet") {
    console.log("\nView on Etherscan: https://etherscan.io");
  }
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
