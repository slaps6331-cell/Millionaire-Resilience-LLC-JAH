const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
require("dotenv").config();

/**
 * Post-deployment orchestration script.
 *
 * Reads the deployment config produced by deploy.cjs and performs on-chain
 * wiring between the deployed contracts:
 *
 *   1. StoryOrchestrationService.setAttestationServiceAddress(sasAddress)
 *   2. StoryOrchestrationService.setSpvLoanContractAddress(slapsLoanAddress)
 *   3. StoryAttestationService.registerSAS(sasContractHash)
 *   4. StoryAttestationService.registerSOS(sosContractHash)
 *   5. StoryAttestationService.recordUCC1FilingNumber(...)
 *   6. Emits a RegistryRequestSubmitted event for StoryScan indexing
 *
 * Outputs:
 *   registration-attestation.<network>.json  — full attestation record with tx hashes
 *
 * Usage:
 *   npx hardhat run scripts/post-deploy-orchestrate.cjs --network story
 *   npx hardhat run scripts/post-deploy-orchestrate.cjs --network base
 */

// Minimal ABIs — only the functions we need to call post-deployment.
const SAS_ABI = [
  "function registerSAS(bytes32 contractHash) external",
  "function registerSOS(bytes32 contractHash) external",
  "function recordUCC1FilingNumber(string filingNumber, string jurisdiction) external",
  "function requestStoryRegistryEntry(string serviceType, bytes32 contractHash) external",
  "function getRegistryStatus() external view returns (bool, bytes32, uint256, bool, bytes32, uint256)",
  "function ucc1FilingRecorded() external view returns (bool)",
];

const SOS_ABI = [
  "function setAttestationServiceAddress(address _attestationService) external",
  "function setSpvLoanContractAddress(address _spvLoanContract) external",
  "function attestationServiceAddress() external view returns (address)",
  "function spvLoanContractAddress() external view returns (address)",
];

// UCC-1 filing metadata (publicly recorded with New Mexico SOS).
const UCC1_FILING_NUMBER = process.env.UCC1_FILING_NUMBER || "2024-NM-UCC-0001";
const UCC1_JURISDICTION = process.env.UCC1_JURISDICTION || "New Mexico Secretary of State";
const UCC1_FILING_HASH =
  process.env.UCC1_FILING_HASH ||
  "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a";

/**
 * Derive a deterministic bytes32 contract hash from an address so it can be
 * registered with registerSAS / registerSOS on-chain.
 */
function contractHash(address) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["address"], [address])
  );
}

/**
 * Send a transaction, wait for confirmation, and return a compact receipt.
 */
async function send(contract, method, args, label) {
  process.stdout.write(`  ${label} ... `);
  try {
    const tx = await contract[method](...args);
    const receipt = await tx.wait();
    console.log(`✓  tx ${receipt.hash}`);
    return { ok: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
  } catch (err) {
    if (
      err.message.includes("already registered") ||
      err.message.includes("Already Verified") ||
      err.message.includes("already verified")
    ) {
      console.log(`(already done — skipping)`);
      return { ok: true, txHash: null, skipped: true };
    }
    console.log(`✗  FAILED — ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function main() {
  const networkName = hre.network.name;
  const configFile = `deployment-config.${networkName}.json`;

  if (!fs.existsSync(configFile)) {
    console.error(
      `ERROR: ${configFile} not found. Run 'npm run contracts:deploy:${networkName}' first.`
    );
    process.exit(1);
  }

  const deploymentConfig = JSON.parse(fs.readFileSync(configFile, "utf8"));
  const contracts = deploymentConfig.contracts;

  console.log("=".repeat(60));
  console.log("Post-Deployment Orchestration");
  console.log("=".repeat(60));
  console.log(`Network:   ${networkName} (Chain ${deploymentConfig.chainId})`);
  console.log(`Deployer:  ${deploymentConfig.deployer}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();

  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`Signer:   ${signer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH`);
  console.log();

  // ── Attach to deployed contracts ─────────────────────────────────────────
  const sasAddress = contracts.StoryAttestationService;
  const sosAddress = contracts.StoryOrchestrationService;
  const slapsLoanAddress = contracts.SLAPSIPSpvLoan;

  if (!sasAddress || !sosAddress) {
    console.error("ERROR: StoryAttestationService or StoryOrchestrationService not found in config.");
    process.exit(1);
  }

  const sas = new ethers.Contract(sasAddress, SAS_ABI, signer);
  const sos = new ethers.Contract(sosAddress, SOS_ABI, signer);

  console.log(`StoryAttestationService (SAS):   ${sasAddress}`);
  console.log(`StoryOrchestrationService (SOS): ${sosAddress}`);
  if (slapsLoanAddress) console.log(`SLAPSIPSpvLoan:                  ${slapsLoanAddress}`);
  console.log();

  const results = {};

  // ── Step 1: Wire SOS → SAS ────────────────────────────────────────────────
  console.log("[1/5] Wiring SOS → set attestation service address");
  results.setAttestationService = await send(
    sos,
    "setAttestationServiceAddress",
    [sasAddress],
    "SOS.setAttestationServiceAddress"
  );

  // ── Step 2: Wire SOS → SPV loan contract ─────────────────────────────────
  if (slapsLoanAddress) {
    console.log("\n[2/5] Wiring SOS → set SPV loan contract address");
    results.setSpvLoan = await send(
      sos,
      "setSpvLoanContractAddress",
      [slapsLoanAddress],
      "SOS.setSpvLoanContractAddress"
    );
  } else {
    console.log("\n[2/5] SLAPSIPSpvLoan not found in config — skipping SPV loan wiring");
    results.setSpvLoan = { ok: true, skipped: true };
  }

  // ── Step 3: Register SAS on StoryScan ────────────────────────────────────
  console.log("\n[3/5] Registering SAS contract hash on StoryAttestationService");
  const sasHash = contractHash(sasAddress);
  results.registerSAS = await send(
    sas,
    "registerSAS",
    [sasHash],
    "SAS.registerSAS"
  );

  // ── Step 4: Register SOS on StoryScan ────────────────────────────────────
  console.log("\n[4/5] Registering SOS contract hash on StoryAttestationService");
  const sosHash = contractHash(sosAddress);
  results.registerSOS = await send(
    sas,
    "registerSOS",
    [sosHash],
    "SAS.registerSOS"
  );

  // ── Step 5: Record UCC-1 filing + emit registry request ──────────────────
  console.log("\n[5/5] Recording UCC-1 filing number and requesting StoryScan registry entry");

  // Check whether UCC-1 is already recorded before calling recordUCC1FilingNumber
  let ucc1AlreadyRecorded = false;
  try {
    ucc1AlreadyRecorded = await sas.ucc1FilingRecorded();
  } catch (_) {
    // Ignore — we'll let the tx revert cleanly if so
  }

  if (!ucc1AlreadyRecorded) {
    results.recordUCC1 = await send(
      sas,
      "recordUCC1FilingNumber",
      [UCC1_FILING_NUMBER, UCC1_JURISDICTION],
      "SAS.recordUCC1FilingNumber"
    );
  } else {
    console.log("  SAS.recordUCC1FilingNumber ... (already recorded — skipping)");
    results.recordUCC1 = { ok: true, skipped: true };
  }

  const ucc1FilingHash32 = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      [UCC1_FILING_HASH]
    )
  );
  results.registryRequest = await send(
    sas,
    "requestStoryRegistryEntry",
    ["HERMETIC_SEAL_PIPELINE", ucc1FilingHash32],
    "SAS.requestStoryRegistryEntry"
  );

  // ── Read final on-chain state ─────────────────────────────────────────────
  console.log("\n── On-chain registry status ─────────────────────────────────");
  let registryStatus;
  try {
    const [sasReg, sasRegHash, sasTsRaw, sosReg, sosRegHash, sosTsRaw] =
      await sas.getRegistryStatus();
    registryStatus = {
      sasRegistered: sasReg,
      sasContractHash: sasRegHash,
      sasTimestamp: Number(sasTsRaw),
      sosRegistered: sosReg,
      sosContractHash: sosRegHash,
      sosTimestamp: Number(sosTsRaw),
    };
    console.log(`  SAS registered: ${sasReg}  hash: ${sasRegHash}`);
    console.log(`  SOS registered: ${sosReg}  hash: ${sosRegHash}`);
  } catch (err) {
    console.warn(`  Could not read registry status: ${err.message}`);
    registryStatus = { error: err.message };
  }

  let sosWiredAddress;
  try {
    sosWiredAddress = await sos.attestationServiceAddress();
    console.log(`  SOS.attestationServiceAddress: ${sosWiredAddress}`);
  } catch (err) {
    console.warn(`  Could not read SOS.attestationServiceAddress: ${err.message}`);
  }

  // ── Build attestation record ──────────────────────────────────────────────
  const failed = Object.values(results).some((r) => !r.ok);
  const attestation = {
    network: networkName,
    chainId: deploymentConfig.chainId,
    deployer: deploymentConfig.deployer,
    orchestratedAt: new Date().toISOString(),
    contracts: {
      StoryAttestationService: sasAddress,
      StoryOrchestrationService: sosAddress,
      SLAPSIPSpvLoan: slapsLoanAddress || null,
    },
    hashes: {
      sasContractHash: sasHash,
      sosContractHash: sosHash,
      ucc1FilingHashCid: UCC1_FILING_HASH,
      ucc1FilingHash32: ucc1FilingHash32,
    },
    transactions: results,
    registryStatus,
    storyScanUrls: networkName === "story"
      ? {
          sas: `https://storyscan.xyz/address/${sasAddress}`,
          sos: `https://storyscan.xyz/address/${sosAddress}`,
        }
      : networkName === "base"
      ? {
          sas: `https://basescan.org/address/${sasAddress}`,
          sos: `https://basescan.org/address/${sosAddress}`,
        }
      : {},
    status: failed ? "PARTIAL" : "COMPLETE",
  };

  const outputFile = `registration-attestation.${networkName}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(attestation, null, 2));

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log();
  console.log("=".repeat(60));
  if (failed) {
    console.log("⚠ Orchestration completed with errors — see above for details");
  } else {
    console.log("✓ Orchestration complete — hermetic seal pipeline wired");
  }
  console.log(`  Registration attestation written to: ${outputFile}`);
  if (networkName === "story") {
    console.log(`\nStoryScan links:`);
    console.log(`  SAS: https://storyscan.xyz/address/${sasAddress}`);
    console.log(`  SOS: https://storyscan.xyz/address/${sosAddress}`);
  } else if (networkName === "base") {
    console.log(`\nBasescan links:`);
    console.log(`  SAS: https://basescan.org/address/${sasAddress}`);
    console.log(`  SOS: https://basescan.org/address/${sosAddress}`);
  }
  console.log("=".repeat(60));

  if (failed) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
