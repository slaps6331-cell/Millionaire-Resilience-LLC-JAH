#!/usr/bin/env node
"use strict";
/**
 * pin-to-pinata.cjs
 *
 * Pins a single local file to IPFS via the Pinata pinning API and writes
 * a pin-record JSON file containing the resulting CID and gateway URL.
 *
 * Used by the ipfs-to-storyscan GitHub Actions workflow (Job 4:
 * pin-and-register-proof) to pin abi-proof.json and make it permanently
 * addressable on IPFS.
 *
 * Usage:
 *   node scripts/pin-to-pinata.cjs <path-to-file> [pinName]
 *
 * Examples:
 *   node scripts/pin-to-pinata.cjs abi-proof.json
 *   node scripts/pin-to-pinata.cjs abi-proof.json "Gladiator Holdings ABI Proof"
 *
 * Environment variables:
 *   PINATA_JWT           — Pinata JWT bearer token (required)
 *   PINATA_GATEWAY_NAME  — Pinata dedicated gateway subdomain (optional)
 *
 * Output:
 *   <filename>-pin.json  — { cid, url, name, size, pinnedAt }
 *                          (e.g. abi-proof-pin.json for abi-proof.json)
 *
 * Exit codes:
 *   0 — success (file pinned and record written)
 *   1 — error (missing JWT, file not found, Pinata API error)
 *   2 — skipped (PINATA_JWT not set — treated as non-fatal in CI)
 */

const https  = require("https");
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");
require("dotenv").config();

// ── Args & environment ─────────────────────────────────────────────────────

const [, , filePath, pinNameArg] = process.argv;

if (!filePath) {
  console.error("Usage: node scripts/pin-to-pinata.cjs <path-to-file> [pinName]");
  process.exit(1);
}

const absPath = path.resolve(filePath);
const fileName = path.basename(absPath);
const pinName  = pinNameArg || fileName;

const JWT          = process.env.PINATA_JWT || "";
const GATEWAY_NAME = process.env.PINATA_GATEWAY_NAME || "";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Upload a file to Pinata's /pinning/pinFileToIPFS endpoint using a
 * multipart/form-data body built from raw Buffers (no external dependencies).
 */
function pinFileToPinata(fileContent, fileName, pinName, jwt) {
  return new Promise((resolve, reject) => {
    const boundary = "----PinataBoundary" + crypto.randomBytes(8).toString("hex");

    // Build each part of the multipart body as a Buffer.
    const filePart = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: application/json\r\n\r\n`
      ),
      fileContent,
      Buffer.from("\r\n"),
    ]);

    const metaPart = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="pinataMetadata"\r\n\r\n` +
        JSON.stringify({ name: pinName }) + "\r\n"
      ),
    ]);

    const optionsPart = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="pinataOptions"\r\n\r\n` +
        JSON.stringify({ cidVersion: 1 }) + "\r\n"
      ),
    ]);

    const closingBoundary = Buffer.from(`--${boundary}--\r\n`);

    const body = Buffer.concat([filePart, metaPart, optionsPart, closingBoundary]);

    const options = {
      hostname: "api.pinata.cloud",
      path:     "/pinning/pinFileToIPFS",
      method:   "POST",
      headers:  {
        Authorization:   `Bearer ${jwt}`,
        "Content-Type":  `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Pinata API error ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Pinata response: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // Graceful skip when JWT is not configured (allows local dev without creds).
  if (!JWT) {
    console.log(`PINATA_JWT not set — skipping pin for ${fileName}`);
    process.exit(2);
  }

  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(absPath);
  const fileSize    = fileContent.length;

  console.log(`Pinning ${fileName} (${(fileSize / 1024).toFixed(1)} KB) to Pinata…`);

  const result = await pinFileToPinata(fileContent, fileName, pinName, JWT);

  if (!result.IpfsHash) {
    console.error("Pinata did not return an IpfsHash:", JSON.stringify(result));
    process.exit(1);
  }

  const cid = result.IpfsHash;
  const url = GATEWAY_NAME
    ? `https://${GATEWAY_NAME}.mypinata.cloud/ipfs/${cid}`
    : `https://ipfs.io/ipfs/${cid}`;

  const record = {
    cid,
    url,
    name:      pinName,
    fileName,
    size:      fileSize,
    pinnedAt:  new Date().toISOString(),
  };

  // Write record alongside the source file as <name>-pin.json
  const recordFile = path.join(
    path.dirname(absPath),
    fileName.replace(/\.json$/, "") + "-pin.json"
  );
  fs.writeFileSync(recordFile, JSON.stringify(record, null, 2));

  // Emit a human-readable summary
  console.log(`✓ ${fileName} pinned`);
  console.log(`  CID:    ${cid}`);
  console.log(`  URL:    ${url}`);
  console.log(`  Record: ${recordFile}`);

  // Also surface CID and URL in GitHub Actions step summary when available.
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summaryLine =
      `\n**${pinName} CID:** \`${cid}\`\n\n` +
      `**IPFS URL:** [${url}](${url})\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryLine);
  }
}

main().catch((e) => {
  console.error("Pin failed:", e.message || e);
  process.exit(1);
});
