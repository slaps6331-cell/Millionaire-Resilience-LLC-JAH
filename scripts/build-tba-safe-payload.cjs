#!/usr/bin/env node
"use strict";

/**
 * build-tba-safe-payload.cjs
 *
 * Produces the exact calldata payloads needed to manually drive the
 * Story IP ► ERC-6551 TBA ► Safe Proxy Factory workflow from Brave + MetaMask.
 *
 * Outputs JSON to ./tba-safe-payloads.json — pin to Pinata after generation.
 *
 * No private key required. Uses ethers v6 read/encode only.
 */

const fs = require("fs");
const { ethers } = require("ethers");

// ── Canonical infra ────────────────────────────────────────────────
const SAFE_PROXY_FACTORY = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";
const SAFE_SINGLETON     = "0x41675C099F32341bf84BFc5382aF534df5C7461a";
const ERC6551_REGISTRY   = "0x000000006551c19487814612e58FE06813775758";
const ERC6551_DEFAULT_IMPL = "0x55266d75D1a14E4572138116aF39863Ed6596E7F"; // Tokenbound default

// ── Story IP binding ───────────────────────────────────────────────
const STORY_CHAIN_ID = 1514n;
const STORY_IP_NFT   = "0x98971c660ac20880b60F86Cc3113eBd979eb3aAE";
const STORY_IP_TOKEN = 15192n;
const STORY_IP_ID    = "0xD22750Ca1C3Cd1f7B18a2c70Af98914c291d632F";

// Story.foundation address (per user instruction)
const STORY_FOUNDATION = "0x597856e93f19877a399f686D2F43b298e2268618";

// ── ERC-6551 calldata ──────────────────────────────────────────────
const registryAbi = [
  "function account(address impl,uint256 chainId,address tokenContract,uint256 tokenId,uint256 salt) view returns (address)",
  "function createAccount(address impl,uint256 chainId,address tokenContract,uint256 tokenId,uint256 salt,bytes initData) returns (address)"
];
const registryIface = new ethers.Interface(registryAbi);

const salt = 0n;
const createAccountData = registryIface.encodeFunctionData("createAccount", [
  ERC6551_DEFAULT_IMPL, STORY_CHAIN_ID, STORY_IP_NFT, STORY_IP_TOKEN, salt, "0x"
]);

// Encode the read-only account(...) view call so the user can preview the
// deterministic TBA address from MetaMask before submitting the create tx.
const accountViewData = registryIface.encodeFunctionData("account", [
  ERC6551_DEFAULT_IMPL, STORY_CHAIN_ID, STORY_IP_NFT, STORY_IP_TOKEN, salt
]);

// ── Safe setup() calldata — owner = TBA ────────────────────────────
const safeIface = new ethers.Interface([
  "function setup(address[] _owners,uint256 _threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address paymentReceiver)"
]);

// We use the address of the TBA as the sole 1-of-1 owner — to be replaced
// by the actual on-chain `account()` lookup result before submission.
const tbaPlaceholder = "0x" + "11".repeat(20); // placeholder — replace at submit time
const safeSetupData = safeIface.encodeFunctionData("setup", [
  [tbaPlaceholder], 1n,
  ethers.ZeroAddress, "0x",
  ethers.ZeroAddress, ethers.ZeroAddress, 0n, ethers.ZeroAddress
]);

// SafeProxyFactory.createProxyWithNonce(singleton, initializer, saltNonce)
const factoryIface = new ethers.Interface([
  "function createProxyWithNonce(address singleton,bytes initializer,uint256 saltNonce) returns (address)"
]);
const saltNonce = BigInt(Date.now());
const createProxyData = factoryIface.encodeFunctionData("createProxyWithNonce", [
  SAFE_SINGLETON, safeSetupData, saltNonce
]);

// ── Morpho onboarding tx (Base L2) ─────────────────────────────────
const MORPHO_BLUE  = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const morphoIface  = new ethers.Interface([
  "function setAuthorization(address authorized,bool isAuthorized)"
]);
const morphoAuthData = morphoIface.encodeFunctionData("setAuthorization", [
  STORY_FOUNDATION, true
]);

const out = {
  generatedAt: new Date().toISOString(),
  summary: "Calldata payloads for the Story-IP ► TBA ► Safe ► Morpho workflow",
  storyIP: {
    ipId: STORY_IP_ID,
    nft: STORY_IP_NFT,
    tokenId: STORY_IP_TOKEN.toString(),
    chainId: Number(STORY_CHAIN_ID),
    storyFoundation: STORY_FOUNDATION
  },
  step1_previewTBA: {
    to: ERC6551_REGISTRY,
    method: "account(address,uint256,address,uint256,uint256) view",
    chain: "Story 1514",
    data: accountViewData,
    notes: "READ-only — returns the deterministic TBA address for the bound Story IP NFT."
  },
  step1_createTBA: {
    to: ERC6551_REGISTRY,
    method: "createAccount(address,uint256,address,uint256,uint256,bytes)",
    chain: "Story 1514",
    data: createAccountData,
    notes: "Call from MetaMask (Brave) on Story Mainnet (chainId 1514). Same address as the preview view above."
  },
  step2_deploySafeProxy: {
    to: SAFE_PROXY_FACTORY,
    method: "createProxyWithNonce(address,bytes,uint256)",
    chain: "Story 1514 (or Base 8453 — pick one)",
    singleton: SAFE_SINGLETON,
    saltNonce: saltNonce.toString(),
    initializerTemplate: safeSetupData,
    note: "Replace the placeholder owner (0x1111...1111) in `initializerTemplate` with the actual TBA address from step 1 before submitting.",
    data: createProxyData
  },
  step3_morphoOnboardStoryFoundation: {
    to: MORPHO_BLUE,
    method: "setAuthorization(address,bool)",
    chain: "Base 8453",
    data: morphoAuthData,
    notes: "Authorizes 0x597856e93f19877a399f686D2F43b298e2268618 (story.foundation) to operate on Morpho Blue Base on behalf of the Safe."
  }
};

fs.writeFileSync("./tba-safe-payloads.json", JSON.stringify(out, null, 2));
console.log("Wrote tba-safe-payloads.json");
console.log(JSON.stringify(out, null, 2));
