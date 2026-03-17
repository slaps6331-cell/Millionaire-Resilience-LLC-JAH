#!/usr/bin/env node
"use strict";
/**
 * generate-tx-hashes.cjs
 *
 * Computes deterministic pre-deployment transaction hashes for every
 * smart-contract deployment in the Gladiator Holdings / Millionaire
 * Resilience system, covering both networks:
 *
 *   StoryScan   (Story Protocol mainnet — chainId 1514)
 *   Etherscan   (Base L2              — chainId 8453)
 *
 * The hash for each transaction is:
 *   keccak256(abi.encode(deployer, contractName, chainId, nonce))
 *
 * where `nonce` is the sequential deployer nonce at the time that
 * particular contract is broadcast.  Because the contracts are not yet
 * live on-chain, the script assumes nonce 0 for the first deployment
 * and increments by one per contract (matching Ethereum's CREATE semantics).
 *
 * Additionally the script generates the multi-sig transaction hash that
 * both the ThirdWeb and Coinbase wallets must sign for Morpho Protocol:
 *   keccak256(abi.encode(morphoBlue, "0", "0x", nonce, chainId, gasLimit))
 *
 * Outputs:
 *   tx-hashes.json   — full hash record
 *
 * Usage:
 *   node scripts/generate-tx-hashes.cjs
 */

const { ethers } = require("ethers");
const fs = require("fs");

// ── Network constants ─────────────────────────────────────────────────────

const STORY_CHAIN_ID = 1514;
const BASE_CHAIN_ID  = 8453;

// ── Known addresses (mirrors contract constants) ──────────────────────────

const MR_OWNER       = "0x597856e93f19877a399f686D2F43b298e2268618";
const COINBASE_WALLET = "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a";
const THIRDWEB_WALLET = "0xe45572Dc828eF0E46D852125f0743938aABe1e12";
const MR_IPID         = "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE";

const MORPHO_BLUE     = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const BASE_USDC       = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Story Protocol module addresses (chain 1514)
const STORY_REGISTRY   = "0x1a9d0d28a0422F26D31Be72Edc6f13ea4371E11B";
const STORY_LICENSING  = "0xd81fd78f557b457b4350cB95D20b547bFEb4D857";
const STORY_ROYALTY    = "0xcc8b9f0c9dC370ED1F41D95f74C9F72E08f24C90";

// UCC-1 IPFS CID
const UCC1_CID = "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a";

// Approximate deployment origin date (2026-02-05)
const DEPLOY_EPOCH = Math.floor(new Date("2026-02-05T00:00:00Z").getTime() / 1000);

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Compute a deterministic pre-deployment tx hash for a single contract.
 *
 * @param {string} deployer     - checksummed deployer address
 * @param {string} contractName - string label for the contract
 * @param {number} chainId      - chain ID
 * @param {number} nonce        - deployer nonce at the time of this deployment
 * @returns {string} 0x-prefixed 32-byte keccak256 hash
 */
function deploymentTxHash(deployer, contractName, chainId, nonce) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "string", "uint256", "uint256"],
      [deployer, contractName, chainId, nonce]
    )
  );
}

/**
 * Compute the Morpho multi-sig transaction hash (matches multisig-sign.cjs logic).
 *
 * @param {string} targetContract - Morpho Blue or StoryOrchestrationService address
 * @param {number} nonce          - unique nonce for this signing request
 * @param {number} chainId        - chain ID
 * @returns {string} 0x-prefixed 32-byte keccak256 hash
 */
function morphoMultiSigTxHash(targetContract, nonce, chainId) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes", "uint256", "uint256", "uint256"],
      [targetContract, 0, "0x", nonce, chainId, 8_000_000]
    )
  );
}

/**
 * Build an explorer URL for a given transaction hash.
 *
 * @param {string} explorer - base explorer URL (no trailing slash)
 * @param {string} txHash   - 0x-prefixed tx hash
 */
function explorerUrl(explorer, txHash) {
  return `${explorer}/tx/${txHash}`;
}

// ── Story Protocol (chainId 1514) contracts — deployed in order ──────────

const STORYSCAN_BASE = "https://storyscan.xyz";
const BASESCAN_BASE  = "https://basescan.org";

// Contracts deployed on Story Protocol mainnet
const STORY_CONTRACTS = [
  "StoryAttestationService",
  "StoryOrchestrationService",
  "PILLoanEnforcement",
  "ResilienceToken",
  "AngelCoin",
];

// Contracts deployed on Base L2
const BASE_CONTRACTS = [
  "GladiatorHoldingsSpvLoan",
  "SLAPSIPSpvLoan",
  "StablecoinIPEscrow",
  "PILLoanEnforcement",
  "AngelCoin",
  "ResilienceToken",
];

// ── Build StoryScan hash table ────────────────────────────────────────────

const storyScanHashes = {};
STORY_CONTRACTS.forEach((name, idx) => {
  const txHash = deploymentTxHash(MR_OWNER, name, STORY_CHAIN_ID, idx);
  storyScanHashes[name] = {
    txHash,
    nonce:       idx,
    chainId:     STORY_CHAIN_ID,
    network:     "Story Protocol Mainnet",
    explorerUrl: explorerUrl(STORYSCAN_BASE, txHash),
    note:        "Pre-deployment deterministic hash — replace with live tx hash after deployment",
  };
});

// IP registration tx (registerIpAsset call — nonce follows last deploy)
const ipRegNonce = STORY_CONTRACTS.length;
const ipRegTxHash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "string", "uint256", "uint256"],
    [MR_OWNER, "registerIpAsset_MR", STORY_CHAIN_ID, ipRegNonce]
  )
);
storyScanHashes["registerIpAsset_MR"] = {
  txHash:      ipRegTxHash,
  nonce:       ipRegNonce,
  chainId:     STORY_CHAIN_ID,
  network:     "Story Protocol Mainnet",
  ipId:        MR_IPID,
  tokenId:     15192,
  explorerUrl: explorerUrl(STORYSCAN_BASE, ipRegTxHash),
  note:        "IP asset registration call — Story Protocol IP Registry",
};

// PIL license terms binding tx
const pilNonce = ipRegNonce + 1;
const pilTxHash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "string", "uint256", "uint256"],
    [MR_OWNER, "bindPILTerms_MR", STORY_CHAIN_ID, pilNonce]
  )
);
storyScanHashes["bindPILTerms_MR"] = {
  txHash:      pilTxHash,
  nonce:       pilNonce,
  chainId:     STORY_CHAIN_ID,
  network:     "Story Protocol Mainnet",
  licenseTypes: ["PIL-PER (1%)", "PIL-COM (5%)", "PIL-ENT (12%)"],
  explorerUrl: explorerUrl(STORYSCAN_BASE, pilTxHash),
  note:        "PIL license terms binding call — Story Protocol Licensing Module",
};

// ── Build Basescan hash table ─────────────────────────────────────────────

const basescanHashes = {};
BASE_CONTRACTS.forEach((name, idx) => {
  // Use the plain contract name (matching deploy.cjs) so hashes can be
  // cross-checked against the deployment output.
  const txHash = deploymentTxHash(MR_OWNER, name, BASE_CHAIN_ID, idx);
  basescanHashes[name] = {
    txHash,
    nonce:       idx,
    chainId:     BASE_CHAIN_ID,
    network:     "Base L2",
    explorerUrl: explorerUrl(BASESCAN_BASE, txHash),
    note:        "Pre-deployment deterministic hash — replace with live tx hash after deployment",
  };
});

// Morpho market creation tx — BTC collateral ($5M, 4% APR)
const morphoBtcNonce = BASE_CONTRACTS.length;
const morphoBtcTxHash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "string", "uint256", "uint256"],
    [MR_OWNER, "createMorphoMarket_BTC", BASE_CHAIN_ID, morphoBtcNonce]
  )
);
basescanHashes["createMorphoMarket_BTC"] = {
  txHash:      morphoBtcTxHash,
  nonce:       morphoBtcNonce,
  chainId:     BASE_CHAIN_ID,
  network:     "Base L2",
  marketParams: {
    loanToken:       BASE_USDC,
    collateralToken: "BTC / WBTC",
    lltv:            "86% (860000000000000000 wei)",
    principal_USD:   5_000_000,
    apr_bps:         400,
  },
  morphoBlue:  MORPHO_BLUE,
  explorerUrl: explorerUrl(BASESCAN_BASE, morphoBtcTxHash),
  note:        "Morpho Blue market creation — BTC-collateralised USDC loan",
};

// Morpho market creation tx — ETH collateral ($1M, 6% APR)
const morphoEthNonce = morphoBtcNonce + 1;
const morphoEthTxHash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "string", "uint256", "uint256"],
    [MR_OWNER, "createMorphoMarket_ETH", BASE_CHAIN_ID, morphoEthNonce]
  )
);
basescanHashes["createMorphoMarket_ETH"] = {
  txHash:      morphoEthTxHash,
  nonce:       morphoEthNonce,
  chainId:     BASE_CHAIN_ID,
  network:     "Base L2",
  marketParams: {
    loanToken:       BASE_USDC,
    collateralToken: "ETH / WETH",
    lltv:            "86% (860000000000000000 wei)",
    principal_USD:   1_000_000,
    apr_bps:         600,
  },
  morphoBlue:  MORPHO_BLUE,
  explorerUrl: explorerUrl(BASESCAN_BASE, morphoEthTxHash),
  note:        "Morpho Blue market creation — ETH-collateralised USDC loan",
};

// ── Morpho multi-sig transaction hash ────────────────────────────────────
// This is the payload that both ThirdWeb and Coinbase wallets sign.
// The nonce here is a monotonic counter (not an on-chain tx nonce).

const multiSigNonce = DEPLOY_EPOCH; // epoch-based for determinism
const multiSigTxHash = morphoMultiSigTxHash(MORPHO_BLUE, multiSigNonce, BASE_CHAIN_ID);
const multiSigTxHashStory = morphoMultiSigTxHash(MORPHO_BLUE, multiSigNonce, STORY_CHAIN_ID);

const morphoMultiSig = {
  description:       "2-of-2 multi-signature payload for Morpho Protocol authorization",
  requiredSigners: [
    { label: "ThirdWeb", address: THIRDWEB_WALLET },
    { label: "Coinbase", address: COINBASE_WALLET },
  ],
  signingMethod:     "EIP-191 personal_sign (see DEPLOYMENT_GUIDE.md §3)",
  baseTxHash:       multiSigTxHash,
  storyTxHash:      multiSigTxHashStory,
  basescanUrl:      explorerUrl(BASESCAN_BASE, multiSigTxHash),
  storyscanUrl:     explorerUrl(STORYSCAN_BASE, multiSigTxHashStory),
  walletInstructions: "Run: node scripts/anchor-signature.cjs  then  node scripts/verify-multisig.cjs",
  note:             "Replace with the actual transaction hash returned by the network after broadcast",
};

// ── Assemble output record ────────────────────────────────────────────────

const record = {
  $schema:      "https://docs.story.foundation/tx-hash-schema.json",
  version:      "1.0.0",
  generatedAt:  new Date().toISOString(),
  deployer:     MR_OWNER,
  entity:       "Gladiator Holdings LLC / Millionaire Resilience LLC",

  storyScan: {
    chainId:    STORY_CHAIN_ID,
    explorer:   STORYSCAN_BASE,
    note:       "Story Protocol Mainnet — contracts verified via StoryScan API (STORYSCAN_API_KEY)",
    transactions: storyScanHashes,
  },

  etherscan: {
    chainId:    BASE_CHAIN_ID,
    explorer:   BASESCAN_BASE,
    note:       "Base L2 — contracts verified via Basescan API (ETHERSCAN_API_KEY)",
    transactions: basescanHashes,
  },

  morphoMultiSig,

  verificationInstructions: {
    storyScan: [
      "Deploy contracts:  npx hardhat run scripts/deploy.cjs --network story",
      "Verify source:     npx hardhat verify --network story <CONTRACT_ADDRESS>",
      "StoryScan search:  https://storyscan.xyz/tx/<TX_HASH>",
      "Replace pre-deployment hashes above with the live tx hashes from deployment-config.story.json",
    ],
    etherscan: [
      "Deploy contracts:  npx hardhat run scripts/deploy.cjs --network base",
      "Verify source:     npx hardhat verify --network base <CONTRACT_ADDRESS>",
      "Basescan search:   https://basescan.org/tx/<TX_HASH>",
      "Replace pre-deployment hashes above with the live tx hashes from deployment-config.base.json",
    ],
    multiSig: [
      "1. Run:  node scripts/anchor-signature.cjs  (generates signature-morpho-config.json)",
      "2. ThirdWeb wallet signs the eip191Hash — see documents/multisig-verification-walkthrough.md §2",
      "3. Coinbase wallet signs the eip191Hash   — see documents/multisig-verification-walkthrough.md §3",
      "4. Populate signatures in signature-morpho-config.json",
      "5. Run:  node scripts/verify-multisig.cjs  (verifies both signatures locally)",
      "6. Submit the signed transaction to the network",
    ],
  },
};

// ── Write output ──────────────────────────────────────────────────────────

const OUTPUT_FILE = "tx-hashes.json";
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(record, null, 2));

// ── Console summary ───────────────────────────────────────────────────────

console.log("=".repeat(60));
console.log("Gladiator Holdings — Transaction Hash Registry");
console.log("=".repeat(60));
console.log();

console.log("StoryScan (Story Protocol — chainId 1514):");
for (const [name, entry] of Object.entries(storyScanHashes)) {
  console.log(`  ${name.padEnd(35)} ${entry.txHash}`);
  console.log(`  ${"".padEnd(35)} ${entry.explorerUrl}`);
}
console.log();

console.log("Basescan / Etherscan (Base L2 — chainId 8453):");
for (const [name, entry] of Object.entries(basescanHashes)) {
  console.log(`  ${name.padEnd(35)} ${entry.txHash}`);
  console.log(`  ${"".padEnd(35)} ${entry.explorerUrl}`);
}
console.log();

console.log("Morpho Multi-Sig Transaction Hash (2/2 required):");
console.log(`  Base L2:                            ${multiSigTxHash}`);
console.log(`  Story Protocol:                     ${multiSigTxHashStory}`);
console.log(`  Signers: ThirdWeb (${THIRDWEB_WALLET.slice(0, 10)}...) + Coinbase (${COINBASE_WALLET.slice(0, 10)}...)`);
console.log();
console.log(`Transaction hash registry written to: ${OUTPUT_FILE}`);
console.log("=".repeat(60));
