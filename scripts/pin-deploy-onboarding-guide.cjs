#!/usr/bin/env node
"use strict";
/**
 * pin-deploy-onboarding-guide.cjs
 * Pins the Safe Proxy Factory + Steakhouse onboarding guide to Pinata
 * and updates ipfs-pin-manifest.json.
 */
const fs    = require("fs");
const path  = require("path");
const https = require("https");
const crypto = require("crypto");
const { ethers } = require("ethers");
require("dotenv").config();

const JWT = process.env.PINATA_JWT;
if (!JWT) { console.error("PINATA_JWT missing"); process.exit(1); }

const GUIDE = "docs/SAFE_PROXY_DEPLOY_AND_STEAKHOUSE_ONBOARDING.md";
const buf   = fs.readFileSync(GUIDE);
const keccak = ethers.keccak256(buf);

function pinFile(absPath, name) {
  return new Promise((resolve, reject) => {
    const data = fs.readFileSync(absPath);
    const boundary = "----P" + crypto.randomBytes(8).toString("hex");
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(absPath)}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`);
    const tail = Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="pinataMetadata"\r\n\r\n` +
      JSON.stringify({ name }) + `\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, data, tail]);
    const req = https.request({
      method: "POST", hostname: "api.pinata.cloud", path: "/pinning/pinFileToIPFS",
      headers: {
        "Authorization": `Bearer ${JWT}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length
      }
    }, res => {
      let o = ""; res.on("data", d => o += d);
      res.on("end", () => {
        try { const j = JSON.parse(o); j.IpfsHash ? resolve(j) : reject(new Error(o)); }
        catch (e) { reject(new Error(o)); }
      });
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

(async () => {
  console.log(`keccak256: ${keccak}`);
  const pin = await pinFile(GUIDE, "Safe Proxy Deploy + Steakhouse Prime USDC Onboarding Guide");
  console.log(`CID:       ${pin.IpfsHash}`);

  const manifest = JSON.parse(fs.readFileSync("./ipfs-pin-manifest.json", "utf8"));
  manifest.pins.safeProxyDeployOnboardingGuide = {
    cid: pin.IpfsHash,
    keccak256: keccak,
    description: "Step-by-step Safe Proxy Factory deployment of 12 contracts + Steakhouse Prime USDC v2 Morpho onboarding"
  };
  fs.writeFileSync("./ipfs-pin-manifest.json", JSON.stringify(manifest, null, 2));
  console.log("ipfs-pin-manifest.json updated");
})().catch(e => { console.error(e); process.exit(1); });
