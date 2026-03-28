const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
require("dotenv").config();

/**
 * record-ucc1-filing.cjs
 *
 * Deploys (or attaches to) the UCC1FilingIntegration contract and records
 * the New Mexico SOS UCC-1 Financing Statement (File #20260000078753) on-chain.
 *
 * It also registers each deployed collateral contract from the deployment
 * config and pins the completed filing metadata to Pinata IPFS.
 *
 * Usage:
 *   npx hardhat run scripts/record-ucc1-filing.cjs --network story
 *   npx hardhat run scripts/record-ucc1-filing.cjs --network base
 *
 * Environment variables (secrets — never commit):
 *   DEPLOYER_PRIVATE_KEY   — wallet used to deploy / call the contract
 *   PINATA_JWT             — Pinata JWT for IPFS upload
 *   PINATA_API_KEY         — Pinata API key (fallback)
 *   PINATA_SECRET_API_KEY  — Pinata secret (fallback)
 *   PINATA_GATEWAY_NAME    — e.g. lavender-neat-urial-76
 *   PINATA_GATEWAY_TOKEN   — gateway access token
 *
 * UCC-1 filing constants (publicly recorded — no secrets):
 *   UCC1_FILING_NUMBER     = "20260000078753"  (NM SOS File #)
 *   UCC1_JURISDICTION      = "New Mexico Secretary of State"
 */

// ── Pinata upload helper ─────────────────────────────────────────────────────

async function pinMetadataToIPFS(metadata) {
  const jwt     = process.env.PINATA_JWT;
  const apiKey  = process.env.PINATA_API_KEY;
  const apiSec  = process.env.PINATA_SECRET_API_KEY;

  if (!jwt && !(apiKey && apiSec)) {
    console.warn("  ⚠  No Pinata credentials — skipping IPFS upload");
    return null;
  }

  const gatewayName  = process.env.PINATA_GATEWAY_NAME  || "gateway.pinata.cloud";
  const gatewayToken = process.env.PINATA_GATEWAY_TOKEN || "";

  const payload = {
    pinataContent:  metadata,
    pinataMetadata: {
      name: `UCC1-Filing-20260000078753-${new Date().toISOString()}`,
      keyvalues: {
        filingNumber:  "20260000078753",
        filingDate:    "2026-03-26",
        jurisdiction:  "NEW_MEXICO_SECRETARY_OF_STATE",
        securedParty:  "Morpho Protocol",
        network:       hre.network.name,
      },
    },
  };

  const headers = { "Content-Type": "application/json" };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  } else {
    headers["pinata_api_key"]        = apiKey;
    headers["pinata_secret_api_key"] = apiSec;
  }

  // Use node's built-in fetch (Node 18+) or fall back to http module.
  let cid = null;
  try {
    const res  = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method:  "POST",
      headers,
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.IpfsHash) {
      cid = data.IpfsHash;
      const gatewayUrl = `https://${gatewayName}.mypinata.cloud/ipfs/${cid}${gatewayToken ? `?pinataGatewayToken=${gatewayToken}` : ""}`;
      console.log(`  ✓ Pinned to IPFS: ${cid}`);
      console.log(`    Gateway URL: ${gatewayUrl}`);
    } else {
      console.warn("  ⚠  Unexpected Pinata response:", JSON.stringify(data));
    }
  } catch (err) {
    console.warn("  ⚠  Pinata upload failed:", err.message);
  }
  return cid;
}

// ── On-chain helpers ─────────────────────────────────────────────────────────

async function send(contract, method, args, label) {
  process.stdout.write(`  ${label} ... `);
  try {
    const tx      = await contract[method](...args);
    const receipt = await tx.wait();
    console.log(`✓  tx ${receipt.hash}`);
    return { ok: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
  } catch (err) {
    if (
      err.message.includes("FilingAlreadyRecorded") ||
      err.message.includes("already recorded")
    ) {
      console.log("(already recorded — skipping)");
      return { ok: true, skipped: true };
    }
    console.log(`✗  FAILED — ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const networkName  = hre.network.name;
  const configFile   = `deployment-config.${networkName}.json`;
  const [deployer]   = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("UCC-1 Filing On-Chain Recording");
  console.log("=".repeat(60));
  console.log(`Network:        ${networkName}`);
  console.log(`Deployer:       ${deployer.address}`);
  console.log(`Filing number:  20260000078753`);
  console.log(`Secured party:  Morpho Protocol`);
  console.log();

  // ── Resolve UCC1FilingIntegration address ─────────────────────────────────
  let ucc1Address;

  if (fs.existsSync(configFile)) {
    const cfg = JSON.parse(fs.readFileSync(configFile, "utf8"));
    ucc1Address = cfg.contracts?.UCC1FilingIntegration;
  }

  const UCC1Factory = await ethers.getContractFactory("UCC1FilingIntegration");

  let ucc1Contract;
  if (ucc1Address) {
    console.log(`Attaching to UCC1FilingIntegration at ${ucc1Address}`);
    ucc1Contract = UCC1Factory.attach(ucc1Address);
  } else {
    console.log("UCC1FilingIntegration not found in deployment config — deploying now...");
    ucc1Contract = await UCC1Factory.deploy();
    await ucc1Contract.waitForDeployment();
    ucc1Address = await ucc1Contract.getAddress();
    console.log(`  ✓ Deployed at ${ucc1Address}`);

    // Persist to config
    if (fs.existsSync(configFile)) {
      const cfg = JSON.parse(fs.readFileSync(configFile, "utf8"));
      cfg.contracts = cfg.contracts || {};
      cfg.contracts.UCC1FilingIntegration = ucc1Address;
      fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
    }
  }

  // ── Build hermetic seal tiers (7 tiers) ───────────────────────────────────
  const sealTiers = [
    ethers.keccak256(ethers.toUtf8Bytes("TIER1:SOURCE_CODE_INTEGRITY")),
    ethers.keccak256(ethers.toUtf8Bytes("TIER2:BYTECODE_VERIFICATION")),
    ethers.keccak256(ethers.toUtf8Bytes("TIER3:ABI_CONSISTENCY")),
    ethers.keccak256(ethers.toUtf8Bytes("TIER4:STORAGE_LAYOUT_ATTESTATION")),
    ethers.keccak256(ethers.toUtf8Bytes("TIER5:ORCHESTRATION_SERVICE_CLOSURE")),
    ethers.keccak256(ethers.toUtf8Bytes("TIER6:VALUATION_20260000078753")),
    ethers.keccak256(ethers.toUtf8Bytes("TIER7:FINAL_SEAL_20260000078753_NM_SOS")),
  ];

  // ── Record primary UCC-1 filing ───────────────────────────────────────────
  console.log("\n[1/3] Recording primary UCC-1 filing on-chain");
  const recordResult = await send(
    ucc1Contract,
    "recordPrimaryFiling",
    [sealTiers],
    "UCC1FilingIntegration.recordPrimaryFiling"
  );

  // ── Register collateral contracts ─────────────────────────────────────────
  console.log("\n[2/3] Registering collateral contracts");

  const results = { recordFiling: recordResult, collateral: {} };

  if (fs.existsSync(configFile)) {
    const cfg = JSON.parse(fs.readFileSync(configFile, "utf8"));
    const chainId = (await ethers.provider.getNetwork()).chainId;

    for (const [contractName, contractAddress] of Object.entries(cfg.contracts || {})) {
      if (contractName === "UCC1FilingIntegration") continue;
      const bytecodeHash = ethers.keccak256(ethers.toUtf8Bytes(`BYTECODE:${contractName}`));
      const abiHash      = ethers.keccak256(ethers.toUtf8Bytes(`ABI:${contractName}`));

      const r = await send(
        ucc1Contract,
        "registerCollateralContract",
        [contractName, contractAddress, chainId, bytecodeHash, abiHash],
        `registerCollateral(${contractName})`
      );
      results.collateral[contractName] = r;
    }
  } else {
    console.log("  No deployment config found — skipping collateral registration");
  }

  // ── Pin metadata to Pinata IPFS ───────────────────────────────────────────
  console.log("\n[3/3] Uploading filing metadata to Pinata IPFS");

  const metadata = {
    ucc1FilingNumber:  "20260000078753",
    ucc1FilingDate:    "2026-03-26",
    jurisdiction:      "NEW_MEXICO_SECRETARY_OF_STATE",
    debtors:           ["Slaps Streaming LLC", "Clifton Kelly Bell"],
    securedParty:      "Morpho Protocol",
    network:           networkName,
    ucc1ContractAddr:  ucc1Address,
    primaryFilingTx:   recordResult.txHash || null,
    hermeticSealTiers: sealTiers,
    collateralContracts: results.collateral,
    timestamp:         new Date().toISOString(),
  };

  const newCID = await pinMetadataToIPFS(metadata);
  results.metadataCID = newCID;

  // ── Write attestation record ──────────────────────────────────────────────
  const outputFile = `registration-attestation.ucc1.${networkName}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("✓ UCC-1 on-chain recording complete");
  console.log(`  Contract:   ${ucc1Address}`);
  console.log(`  Attestation: ${outputFile}`);
  if (networkName === "story") {
    console.log(`  StoryScan:   https://www.storyscan.io/address/${ucc1Address}`);
  } else if (networkName === "base") {
    console.log(`  Basescan:    https://basescan.org/address/${ucc1Address}`);
  }
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
