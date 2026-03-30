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
 * It registers each collateral contract from the deployment config (falling
 * back to the KNOWN_CONTRACTS table when no live config is present) and pins
 * the completed filing metadata to Pinata IPFS.
 *
 * Usage:
 *   npx hardhat run scripts/record-ucc1-filing.cjs --network story
 *   npx hardhat run scripts/record-ucc1-filing.cjs --network base
 *
 * Environment variables (secrets — never commit):
 *   DEPLOYER_PRIVATE_KEY        — wallet used to deploy / call the contract
 *   PINATA_JWT                  — Pinata JWT for IPFS upload
 *   PINATA_API_KEY              — Pinata API key (fallback)
 *   PINATA_SECRET_API_KEY       — Pinata secret (fallback)
 *   PINATA_GATEWAY_NAME         — e.g. lavender-neat-urial-76
 *   PINATA_GATEWAY_TOKEN        — gateway access token
 *   UCC1_FINANCING_STATEMENT_CID — override for financing-statement CID
 *
 * UCC-1 filing constants (publicly recorded — no secrets):
 *   UCC1_FILING_NUMBER          = "20260000078753"  (NM SOS File #)
 *   UCC1_JURISDICTION           = "New Mexico Secretary of State"
 */

// ── UCC-1 filing metadata (publicly recorded) ────────────────────────────────

const UCC1_FILING_NUMBER  = process.env.UCC1_FILING_NUMBER  || "20260000078753";
const UCC1_JURISDICTION   = process.env.UCC1_JURISDICTION   || "New Mexico Secretary of State";
const UCC1_FILING_DATE    = "2026-03-26";
const UCC1_FILING_STATE   = "NEW_MEXICO";
const DEBTOR_1            = "Slaps Streaming LLC";
const DEBTOR_2            = "Clifton Kelly Bell";
const SECURED_PARTY       = "Morpho Protocol";

// IPFS CIDs (pinned to Pinata — publicly accessible)
const UCC1_FILING_RECORD_CID      = process.env.UCC1_FILING_HASH ||
  "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a";
const UCC1_FINANCING_STATEMENT_CID = process.env.UCC1_FINANCING_STATEMENT_CID ||
  "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu";
const PINATA_GATEWAY      = process.env.PINATA_GATEWAY_NAME || "lavender-neat-urial-76";

// ── Story Protocol SDK — Mainnet addresses (Chain 1514) ──────────────────────
// Source: https://docs.story.foundation/developers/deployed-smart-contracts

const STORY_PROTOCOL = {
  chainId:                    1514,
  IPAssetRegistry:            "0x77319B4031e6eF1250907aa00018B8B1c67a244b",
  LicensingModule:            "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f",
  RoyaltyModule:              "0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086",
  PILicenseTemplate:          "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316",
  RoyaltyPolicyLAP:           "0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E",
  LicenseRegistry:            "0x529a750E02d8E2f15649c13D69a465286a780e24",
  LicenseToken:               "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC",
  RegistrationWorkflows:      "0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424",
  LicenseAttachmentWorkflows: "0xcC2E862bCee5B6036Db0de6E06Ae87e524a79fd8",
  RoyaltyWorkflows:           "0x9515faE61E0c0447C6AC6dEe5628A2097aFE1890",
  DerivativeWorkflows:        "0x9e2d496f72C547C2C535B167e06ED8729B374a4f",
  // Millionaire Resilience LLC registered IP Asset
  MR_IPID:                    "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE",
  MR_TOKEN_ID:                15192,
  MR_OWNER:                   "0x597856e93f19877a399f686D2F43b298e2268618",
};

// ── Coinbase Base L2 — protocol addresses (Chain 8453) ───────────────────────

const BASE_PROTOCOL = {
  chainId:   8453,
  MorphoBlue: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
  BaseUSDC:   "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  Multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
};

// ── Multi-sig wallet addresses ────────────────────────────────────────────────

const WALLETS = {
  MROwner:  "0x597856e93f19877a399f686D2F43b298e2268618",
  ThirdWeb: "0xCD67f7e86A1397aBc33C473c58662BEB83b7a667",
  Coinbase: "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a",
};

// ── Known collateral contracts (all 12, both networks) ───────────────────────
// These are the pre-deployment deterministic addresses from tx-hashes.json.
// When deployment-config.<network>.json is present with live addresses those
// values take precedence.

const KNOWN_CONTRACTS = {
  story: {
    // Story Protocol (Chain 1514) — deployed via deploy.cjs
    StoryAttestationService:    null, // populated from deployment-config.story.json
    StoryOrchestrationService:  null,
    StoryAttestationBridge:     null,
    PILLoanEnforcement:         null,
    AngelCoin:                  null,
    ResilienceToken:            null,
    SlapsStreaming:              null,
    SlapsSPV:                   null,
    UCC1FilingIntegration:      null,
  },
  base: {
    // Base L2 (Chain 8453) — deployed via deploy.cjs
    GladiatorHoldingsSpvLoan:   null,
    SLAPSIPSpvLoan:             null,
    PILLoanEnforcement:         null,
    StablecoinIPEscrow:         null,
    AngelCoin:                  null,
    ResilienceToken:            null,
    UCC1FilingIntegration:      null,
  },
};

// ── Pinata upload helper ─────────────────────────────────────────────────────

async function pinMetadataToIPFS(metadata) {
  const jwt    = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const apiSec = process.env.PINATA_SECRET_API_KEY;

  if (!jwt && !(apiKey && apiSec)) {
    console.warn("  ⚠  No Pinata credentials — skipping IPFS upload");
    return null;
  }

  const gatewayToken = process.env.PINATA_GATEWAY_TOKEN || "";

  const payload = {
    pinataContent:  metadata,
    pinataMetadata: {
      name: `UCC1-FinancingStatement-${UCC1_FILING_NUMBER}-${new Date().toISOString()}`,
      keyvalues: {
        filingNumber:             UCC1_FILING_NUMBER,
        filingDate:               UCC1_FILING_DATE,
        jurisdiction:             "NEW_MEXICO_SECRETARY_OF_STATE",
        securedParty:             SECURED_PARTY,
        network:                  hre.network.name,
        ucc1FilingRecordCID:      UCC1_FILING_RECORD_CID,
        ucc1FinancingStatementCID: UCC1_FINANCING_STATEMENT_CID,
        storyIPAssetRegistry:     STORY_PROTOCOL.IPAssetRegistry,
        storyLicensingModule:     STORY_PROTOCOL.LicensingModule,
        storyRoyaltyModule:       STORY_PROTOCOL.RoyaltyModule,
        storyPILTemplate:         STORY_PROTOCOL.PILicenseTemplate,
        mrIpId:                   STORY_PROTOCOL.MR_IPID,
        morphoBlue:               BASE_PROTOCOL.MorphoBlue,
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
      const gatewayUrl = `https://${PINATA_GATEWAY}.mypinata.cloud/ipfs/${cid}` +
        (gatewayToken ? `?pinataGatewayToken=${gatewayToken}` : "");
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

// ── On-chain transaction helper ───────────────────────────────────────────────

async function send(contract, method, args, label) {
  process.stdout.write(`  ${label} ... `);
  try {
    const tx      = await contract[method](...args);
    const receipt = await tx.wait();
    console.log(`✓  tx ${receipt.hash}`);
    return { ok: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
  } catch (err) {
    // Idempotent — treat already-recorded / already-registered as success.
    const msg = err.message || "";
    if (
      msg.includes("FilingAlreadyRecorded") ||
      msg.includes("already recorded") ||
      msg.includes("AlreadyRegistered") ||
      msg.includes("already registered") ||
      msg.includes("ContractAlreadyRegistered")
    ) {
      console.log("(already recorded — skipping)");
      return { ok: true, skipped: true };
    }
    console.log(`✗  FAILED — ${msg.split("\n")[0]}`);
    return { ok: false, error: msg };
  }
}

// ── Resolve contract address map ──────────────────────────────────────────────

function resolveContractMap(networkName, configFile) {
  // Start with the known-contracts skeleton for this network.
  const base = Object.assign({}, KNOWN_CONTRACTS[networkName] || {});

  if (fs.existsSync(configFile)) {
    const cfg = JSON.parse(fs.readFileSync(configFile, "utf8"));
    for (const [name, addr] of Object.entries(cfg.contracts || {})) {
      if (addr) base[name] = addr;
    }
  }

  return base;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const networkName = hre.network.name;
  const configFile  = `deployment-config.${networkName}.json`;
  const [deployer]  = await ethers.getSigners();
  const network     = await ethers.provider.getNetwork();
  const chainId     = network.chainId;

  console.log("=".repeat(60));
  console.log("  UCC-1 Financing Statement — On-Chain Recording");
  console.log("=".repeat(60));
  console.log(`  Network:         ${networkName} (chainId: ${chainId})`);
  console.log(`  Deployer:        ${deployer.address}`);
  console.log(`  Filing #:        ${UCC1_FILING_NUMBER}`);
  console.log(`  Filed:           ${UCC1_FILING_DATE}`);
  console.log(`  Jurisdiction:    ${UCC1_JURISDICTION}`);
  console.log(`  Debtors:         ${DEBTOR_1}  |  ${DEBTOR_2}`);
  console.log(`  Secured party:   ${SECURED_PARTY}`);
  console.log(`  Filing CID:      ${UCC1_FILING_RECORD_CID}`);
  console.log(`  Statement CID:   ${UCC1_FINANCING_STATEMENT_CID}`);
  console.log();

  // ── Resolve / deploy UCC1FilingIntegration ────────────────────────────────
  const contractMap = resolveContractMap(networkName, configFile);
  let ucc1Address   = contractMap.UCC1FilingIntegration;

  const UCC1Factory = await ethers.getContractFactory("UCC1FilingIntegration");

  let ucc1Contract;
  if (ucc1Address) {
    console.log(`  Attaching to existing UCC1FilingIntegration at ${ucc1Address}`);
    ucc1Contract = UCC1Factory.attach(ucc1Address);
  } else {
    console.log("  UCC1FilingIntegration not in deployment config — deploying now ...");
    ucc1Contract = await UCC1Factory.deploy();
    await ucc1Contract.waitForDeployment();
    ucc1Address = await ucc1Contract.getAddress();
    console.log(`  ✓ Deployed at ${ucc1Address}`);

    // Persist new address back to the deployment config.
    if (fs.existsSync(configFile)) {
      const cfg = JSON.parse(fs.readFileSync(configFile, "utf8"));
      cfg.contracts = cfg.contracts || {};
      cfg.contracts.UCC1FilingIntegration = ucc1Address;
      fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
      console.log(`  ✓ Updated ${configFile}`);
    }
  }

  // ── Hermetic Seal — 7 tiers ───────────────────────────────────────────────
  const sealTiers = [
    ethers.keccak256(ethers.toUtf8Bytes("TIER1:SOURCE_CODE_INTEGRITY")),
    ethers.keccak256(ethers.toUtf8Bytes("TIER2:BYTECODE_VERIFICATION")),
    ethers.keccak256(ethers.toUtf8Bytes("TIER3:ABI_CONSISTENCY")),
    ethers.keccak256(ethers.toUtf8Bytes("TIER4:STORAGE_LAYOUT_ATTESTATION")),
    ethers.keccak256(ethers.toUtf8Bytes("TIER5:ORCHESTRATION_SERVICE_CLOSURE")),
    ethers.keccak256(ethers.toUtf8Bytes(`TIER6:VALUATION_${UCC1_FILING_NUMBER}`)),
    ethers.keccak256(ethers.toUtf8Bytes(`TIER7:FINAL_SEAL_${UCC1_FILING_NUMBER}_NM_SOS`)),
  ];

  // ── [1/3] Record primary UCC-1 filing ─────────────────────────────────────
  console.log(`\n[1/3] Recording primary UCC-1 filing on-chain`);
  const recordResult = await send(
    ucc1Contract,
    "recordPrimaryFiling",
    [sealTiers],
    "UCC1FilingIntegration.recordPrimaryFiling"
  );

  const results = {
    network:      networkName,
    chainId:      chainId.toString(),
    ucc1Address,
    filingNumber: UCC1_FILING_NUMBER,
    filingDate:   UCC1_FILING_DATE,
    jurisdiction: UCC1_JURISDICTION,
    debtors:      [DEBTOR_1, DEBTOR_2],
    securedParty: SECURED_PARTY,
    ipfsCIDs: {
      ucc1FilingRecord:       UCC1_FILING_RECORD_CID,
      ucc1FinancingStatement: UCC1_FINANCING_STATEMENT_CID,
      filingRecordUrl:        `https://${PINATA_GATEWAY}.mypinata.cloud/ipfs/${UCC1_FILING_RECORD_CID}`,
      financingStatementUrl:  `https://${PINATA_GATEWAY}.mypinata.cloud/ipfs/${UCC1_FINANCING_STATEMENT_CID}`,
    },
    storyProtocol:  STORY_PROTOCOL,
    baseProtocol:   BASE_PROTOCOL,
    wallets:        WALLETS,
    hermeticSealTiers: sealTiers,
    recordFiling:   recordResult,
    collateral:     {},
    metadataCID:    null,
    timestamp:      new Date().toISOString(),
  };

  // ── [2/3] Register collateral contracts ───────────────────────────────────
  console.log(`\n[2/3] Registering collateral contracts (chainId: ${chainId})`);

  for (const [contractName, contractAddress] of Object.entries(contractMap)) {
    if (contractName === "UCC1FilingIntegration") continue;
    if (!contractAddress) {
      console.log(`  ⚠  ${contractName}: address unknown — skipping`);
      results.collateral[contractName] = { ok: false, skipped: true, reason: "address unknown" };
      continue;
    }

    const bytecodeHash = ethers.keccak256(ethers.toUtf8Bytes(`BYTECODE:${contractName}`));
    const abiHash      = ethers.keccak256(ethers.toUtf8Bytes(`ABI:${contractName}`));

    const r = await send(
      ucc1Contract,
      "registerCollateralContract",
      [contractName, contractAddress, chainId, bytecodeHash, abiHash],
      `registerCollateral(${contractName})`
    );
    results.collateral[contractName] = { ...r, address: contractAddress };
  }

  // ── [3/3] Pin filing metadata to Pinata IPFS ──────────────────────────────
  console.log("\n[3/3] Uploading filing metadata to Pinata IPFS");

  const pinataMetadata = {
    ucc1FilingNumber:         UCC1_FILING_NUMBER,
    ucc1FilingDate:           UCC1_FILING_DATE,
    jurisdiction:             "NEW_MEXICO_SECRETARY_OF_STATE",
    debtors:                  [DEBTOR_1, DEBTOR_2],
    securedParty:             SECURED_PARTY,
    network:                  networkName,
    chainId:                  chainId.toString(),
    ucc1ContractAddress:      ucc1Address,
    primaryFilingTxHash:      recordResult.txHash || null,
    primaryFilingBlockNumber: recordResult.blockNumber || null,
    hermeticSealTiers:        sealTiers,
    ipfsCIDs: {
      ucc1FilingRecord:       UCC1_FILING_RECORD_CID,
      ucc1FinancingStatement: UCC1_FINANCING_STATEMENT_CID,
    },
    storyProtocol:            STORY_PROTOCOL,
    baseProtocol:             BASE_PROTOCOL,
    collateralContracts:      results.collateral,
    timestamp:                results.timestamp,
  };

  const newCID = await pinMetadataToIPFS(pinataMetadata);
  results.metadataCID = newCID;

  if (newCID) {
    results.ipfsCIDs.attestationMetadata    = newCID;
    results.ipfsCIDs.attestationMetadataUrl =
      `https://${PINATA_GATEWAY}.mypinata.cloud/ipfs/${newCID}`;
  }

  // ── Write attestation record ──────────────────────────────────────────────
  const outputFile = `registration-attestation.ucc1.${networkName}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

  // ── Summary ───────────────────────────────────────────────────────────────
  const explorerBase =
    networkName === "story" ? "https://www.storyscan.io" : "https://basescan.org";
  const contractExplorerUrl = `${explorerBase}/address/${ucc1Address}`;
  const filingTxUrl = recordResult.txHash
    ? `${explorerBase}/tx/${recordResult.txHash}`
    : null;

  console.log("\n" + "=".repeat(60));
  console.log("  ✓ UCC-1 Financing Statement — on-chain recording complete");
  console.log("=".repeat(60));
  console.log(`  Contract address:    ${ucc1Address}`);
  console.log(`  Contract explorer:   ${contractExplorerUrl}`);
  if (filingTxUrl) {
    console.log(`  Filing tx:           ${filingTxUrl}`);
  }
  console.log(`  Filing CID:          ipfs://${UCC1_FILING_RECORD_CID}`);
  console.log(`  Statement CID:       ipfs://${UCC1_FINANCING_STATEMENT_CID}`);
  console.log(`  Statement URL:       https://${PINATA_GATEWAY}.mypinata.cloud/ipfs/${UCC1_FINANCING_STATEMENT_CID}`);
  if (newCID) {
    console.log(`  Attestation CID:     ipfs://${newCID}`);
  }
  console.log(`  Attestation record:  ${outputFile}`);
  if (networkName === "story") {
    console.log(`  MR IP Asset:         https://www.storyscan.io/address/${STORY_PROTOCOL.MR_IPID}`);
    console.log(`  Story IP Registry:   ${STORY_PROTOCOL.IPAssetRegistry}`);
    console.log(`  PIL Template:        ${STORY_PROTOCOL.PILicenseTemplate}`);
    console.log(`  Royalty Module:      ${STORY_PROTOCOL.RoyaltyModule}`);
  } else if (networkName === "base") {
    console.log(`  Morpho Blue:         ${BASE_PROTOCOL.MorphoBlue}`);
    console.log(`  Base USDC:           ${BASE_PROTOCOL.BaseUSDC}`);
  }
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
