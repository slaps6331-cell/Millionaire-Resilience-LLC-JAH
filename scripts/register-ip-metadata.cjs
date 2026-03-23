/**
 * register-ip-metadata.cjs
 *
 * Pins an IPA metadata JSON file to IPFS via Pinata, computes its SHA-256
 * hash, and calls setMetadata on the Story Protocol IP Account.
 *
 * Usage:
 *   node scripts/register-ip-metadata.cjs <metadata-file> [--dry-run]
 *
 * Environment variables:
 *   PINATA_JWT            — Pinata JWT bearer token (required for pinning)
 *   PINATA_GATEWAY_NAME   — Pinata dedicated gateway hostname (optional)
 *   STORY_RPC_URL         — Story Protocol mainnet RPC URL
 *   DEPLOYER_PRIVATE_KEY  — Private key of the IP Account owner wallet
 *
 * Outputs:
 *   ip-metadata-registration.<slug>.json — registration record with IPFS CID
 *                                          and tx hash
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
require("dotenv").config();

// ── Constants ──────────────────────────────────────────────────────────────

const STORY_RPC_URL =
  process.env.STORY_RPC_URL || "https://mainnet.storyrpc.io";

// Minimal ABI for IPAccount.setMetadata — the canonical Story Protocol
// interface on chain 1514.
const IP_ACCOUNT_ABI = [
  {
    name: "setMetadata",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "metadataURI", type: "string" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "metadata",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "metadataURI", type: "string" },
          { name: "metadataHash", type: "bytes32" },
        ],
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute the SHA-256 hash of a string or Buffer and return it as a 0x-prefixed
 * hex string (32 bytes).
 */
function sha256Hex(data) {
  const hash = crypto
    .createHash("sha256")
    .update(typeof data === "string" ? Buffer.from(data, "utf8") : data)
    .digest("hex");
  return "0x" + hash;
}

/**
 * Minimal HTTPS POST helper that avoids adding extra npm dependencies.
 * Returns the parsed JSON response body.
 */
function httpsPost(urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
        ...headers,
      },
    };
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

/**
 * Pin a JSON object to IPFS via the Pinata pinJSONToIPFS endpoint.
 * Returns the IPFS CID (IpfsHash) on success.
 */
async function pinToIPFS(metadata, pinataJwt, pinName) {
  const payload = {
    pinataContent: metadata,
    pinataMetadata: {
      name: pinName || metadata.title || "IPA Metadata",
      keyvalues: {
        ipType: metadata.ipType || "IP Portfolio",
        chain: "story-1514",
      },
    },
    pinataOptions: { cidVersion: 1 },
  };

  const resp = await httpsPost(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    { Authorization: `Bearer ${pinataJwt}` },
    payload
  );

  if (resp.status !== 200 || !resp.body.IpfsHash) {
    throw new Error(
      `Pinata pinning failed (HTTP ${resp.status}): ${JSON.stringify(resp.body)}`
    );
  }

  return resp.body.IpfsHash;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
  const dryRun = flags.includes("--dry-run");

  if (args.length < 1) {
    console.error(
      "Usage: node scripts/register-ip-metadata.cjs <metadata-file.json> [--dry-run]"
    );
    process.exit(1);
  }

  const metadataFile = path.resolve(args[0]);
  if (!fs.existsSync(metadataFile)) {
    console.error(`ERROR: File not found: ${metadataFile}`);
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("Story Protocol IPA Metadata Registration");
  console.log("=".repeat(60));
  console.log(`Metadata file : ${metadataFile}`);
  console.log(`Mode          : ${dryRun ? "DRY RUN (no on-chain tx)" : "LIVE"}`);
  console.log();

  // ── 1. Read & validate metadata ──────────────────────────────────────────
  const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
  const required = ["title", "description", "createdAt", "creators"];
  for (const field of required) {
    if (!metadata[field]) {
      console.error(`ERROR: Required field '${field}' is missing from metadata.`);
      process.exit(1);
    }
  }
  console.log(`[1/4] Metadata validated — title: "${metadata.title}"`);

  // ── 2. Compute local SHA-256 hash of the raw JSON ────────────────────────
  const rawJson = fs.readFileSync(metadataFile, "utf8");
  const metadataHash = sha256Hex(rawJson);
  console.log(`[2/4] SHA-256 hash : ${metadataHash}`);

  // ── 3. Pin to IPFS via Pinata ─────────────────────────────────────────────
  const pinataJwt = process.env.PINATA_JWT;
  let ipfsCid = null;
  let metadataURI = null;

  if (!pinataJwt) {
    console.warn(
      "  PINATA_JWT not set — skipping IPFS pinning. metadataURI will be placeholder."
    );
    metadataURI = `ipfs://PENDING_PIN_${Date.now()}`;
  } else if (dryRun) {
    console.log("  [dry-run] Skipping Pinata upload.");
    metadataURI = `ipfs://DRY_RUN_PLACEHOLDER`;
  } else {
    process.stdout.write("[3/4] Pinning to IPFS via Pinata ... ");
    const pinName = path.basename(metadataFile, ".json");
    ipfsCid = await pinToIPFS(metadata, pinataJwt, pinName);
    const gatewayName = process.env.PINATA_GATEWAY_NAME;
    metadataURI = gatewayName
      ? `https://${gatewayName}/ipfs/${ipfsCid}`
      : `ipfs://${ipfsCid}`;
    console.log(`✓  CID: ${ipfsCid}`);
    console.log(`   URI: ${metadataURI}`);
  }

  // ── 4. Call setMetadata on the Story Protocol IP Account ─────────────────
  const ipId = metadata.storyProtocol?.ipId;
  const isZeroAddr =
    !ipId || ipId === "0x0000000000000000000000000000000000000000";

  const result = {
    metadataFile: path.basename(metadataFile),
    title: metadata.title,
    ipId: ipId || null,
    ipfsCid,
    metadataURI,
    metadataHash,
    timestamp: new Date().toISOString(),
    dryRun,
    txHash: null,
    skipped: false,
    skipReason: null,
  };

  if (isZeroAddr) {
    console.log(
      `[4/4] setMetadata skipped — ipId is ZeroAddress (IP not yet registered on Story Protocol).`
    );
    result.skipped = true;
    result.skipReason = "ipId is ZeroAddress; register IP on Story Protocol first.";
  } else if (dryRun) {
    console.log(`[4/4] [dry-run] Would call setMetadata on IP Account ${ipId}`);
    result.skipped = true;
    result.skipReason = "dry-run";
  } else {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      console.warn(
        "[4/4] DEPLOYER_PRIVATE_KEY not set — skipping on-chain setMetadata call."
      );
      result.skipped = true;
      result.skipReason = "DEPLOYER_PRIVATE_KEY not set";
    } else {
      try {
        // Lazy-require ethers so the script can still run (in dry-run / pin-only
        // mode) even when hardhat/ethers is not installed.
        const { ethers } = require("ethers");
        const provider = new ethers.JsonRpcProvider(STORY_RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);
        const ipAccount = new ethers.Contract(ipId, IP_ACCOUNT_ABI, wallet);

        process.stdout.write(
          `[4/4] Calling setMetadata on IP Account ${ipId} ... `
        );
        const tx = await ipAccount.setMetadata(metadataURI, metadataHash);
        const receipt = await tx.wait();
        console.log(`✓  tx ${receipt.hash}`);
        result.txHash = receipt.hash;
        result.blockNumber = receipt.blockNumber;
      } catch (err) {
        console.error(`✗  setMetadata FAILED — ${err.message}`);
        result.error = err.message;
      }
    }
  }

  // ── 5. Write output record ─────────────────────────────────────────────
  const slug = path.basename(metadataFile, ".json").toLowerCase().replace(/\s+/g, "-");
  const outFile = `ip-metadata-registration.${slug}.json`;
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log();
  console.log(`Output written to: ${outFile}`);
  console.log();

  if (result.error) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
