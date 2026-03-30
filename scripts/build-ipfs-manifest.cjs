#!/usr/bin/env node
"use strict";
/**
 * build-ipfs-manifest.cjs
 *
 * Reads every IPFS CID listed in environment variables (from the Pinata gateway),
 * performs an HTTP HEAD request to verify reachability, and writes
 * ipfs-document-manifest.json.
 *
 * Used by the ipfs-to-storyscan GitHub Actions workflow (Job 2: fetch-ipfs-docs).
 *
 * Environment variables:
 *   PINATA_GATEWAY_NAME   — Pinata dedicated gateway subdomain (optional;
 *                           falls back to public ipfs.io)
 *   PINATA_GATEWAY_TOKEN  — Pinata gateway access token (optional; for
 *                           private/restricted gateways)
 *   UCC1_FILING_HASH      — Pinata CID of the UCC-1 filing document
 *   UCC1_AUXILIARY_DOCS   — Pinata CID of the UCC-1 auxiliary documents
 *   IPFS_GLADIATOR_CERT_CID       (and all other IPFS_* CID env vars)
 *
 * Output:
 *   ipfs-document-manifest.json — one entry per CID with url, sha256, and
 *                                  HTTP reachability result
 */

const https  = require("https");
const http   = require("http");
const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");
require("dotenv").config();

// ── Configuration ──────────────────────────────────────────────────────────

const GATEWAY_NAME  = process.env.PINATA_GATEWAY_NAME || "";
const GATEWAY_TOKEN = process.env.PINATA_GATEWAY_TOKEN || "";

const GATEWAY_BASE = GATEWAY_NAME
  ? `https://${GATEWAY_NAME}.mypinata.cloud/ipfs`
  : "https://ipfs.io/ipfs";

const OUTPUT_FILE = path.join(__dirname, "..", "ipfs-document-manifest.json");

// All CID variables in dependency order (matches .env.example)
const CIDS = {
  ucc1Filing:              process.env.UCC1_FILING_HASH             || "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a",
  ucc1FinancingStatement:  process.env.UCC1_FINANCING_STATEMENT_CID || "bafkreidomwlsf5wabkvhvf63jq424t65mffhnftd4t6spnmhh5t64jn2bu",
  ucc1AuxDocs:          process.env.UCC1_AUXILIARY_DOCS          || "bafybeidkp74w2idrwkg2qey66uepfaes5ekonxjqt62uztyxawii7yye7y",
  gladiatorCert:        process.env.IPFS_GLADIATOR_CERT_CID      || "bafybeiba2j4g34bizjjm26qznc2pf4upgotffrcwjtkw6lj3qa6squrzpu",
  gladiatorNotice:      process.env.IPFS_GLADIATOR_NOTICE_CID    || "bafkreifbikc26xs2cu2mvsghzlrginwm6icqotdp4ntsvq3sn6h4flrhhm",
  mrArticles:           process.env.IPFS_MR_ARTICLES_CID         || "bafkreifxiesrze736sxhvsa5op64q6f3ddvv3rismnvd75wi3yfqilu4py",
  mrEinLetter:          process.env.IPFS_MR_EIN_LETTER_CID       || "bafkreihz5zpp33pimzckaey64mht2vezlbzngoxe46urrfctzqvjvsdboe",
  slapsArticles:        process.env.IPFS_SLAPS_ARTICLES_CID      || "bafkreic3n6bdf25tobljqbjxzvzkbch6s7xkqq5yehmyt3zju4de7ey52u",
  slapsEinLetter:       process.env.IPFS_SLAPS_EIN_LETTER_CID    || "bafkreifnuwchbvbolmhbgionvsltdi3edzasfqytd4zzqlvu42m5m4jhei",
  rbwEinLetter:         process.env.IPFS_RBW_EIN_LETTER_CID      || "bafkreid77fuxwqtwyku5syp3dswmy75rymvxh6v3tf7rfrzqbrizoutxtu",
  nmSosReceipt:         process.env.IPFS_NM_SOS_RECEIPT_CID      || "bafkreigjsqx6d47sgqwkjxgtt3qrjnoz3hdth4hqk7qnxflqog2ikjs2kq",
  beneficialOwnerID:    process.env.IPFS_BENEFICIAL_OWNER_ID_CID || "bafkreie5spkgxxhmafdqylwyfplx37jqhcjrs3es3neasgcnynzgkg5mzi",
  patentsightPortfolio: process.env.IPFS_PATENTSIGHT_PORTFOLIO_CID || "bafkreibxqnmhir5iifpboxdv5ndltm5vnbplso4ndtcuzfnanykudrwdbu",
  patentsightMR:        process.env.IPFS_PATENTSIGHT_MR_CID      || "bafkreihls2yoi265uxzmcmh7wzk2ytyo5yvopmb4jib4blw4nptlchivqm",
  patentsightSLAPS:     process.env.IPFS_PATENTSIGHT_SLAPS_CID   || "bafkreiflmhdsflvv53e24mo2woafdgecpkvfljcbm5heafnzdxzbj5ct4i",
  iplyticsDeclaration:  process.env.IPFS_IPLYTICS_DECLARATION_CID || "bafkreiej7wfskl53hxo4j47g55bxjkyyulihovjjtpjvtf264kfoddxc5i",
};

// ── HTTP helpers ───────────────────────────────────────────────────────────

/**
 * Perform a HEAD request on the given URL and return its status code
 * and content-type header.  Never rejects — connection errors resolve to
 * { status: 0, contentType: "" }.
 */
function headRequest(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith("https") ? https : http;
    const headers = GATEWAY_TOKEN
      ? { "x-pinata-gateway-token": GATEWAY_TOKEN }
      : {};
    const req = mod.request(url, { method: "HEAD", headers }, (res) => {
      resolve({
        status:      res.statusCode || 0,
        contentType: res.headers["content-type"] || "",
      });
    });
    req.on("error", () => resolve({ status: 0, contentType: "" }));
    // 10-second timeout — Pinata CDN should respond well within this window.
    req.setTimeout(10_000, () => {
      req.destroy();
      resolve({ status: 0, contentType: "" });
    });
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const manifest = {
    generatedAt: new Date().toISOString(),
    gateway:     GATEWAY_BASE,
    documents:   {},
  };

  let ok   = 0;
  let fail = 0;

  for (const [key, cid] of Object.entries(CIDS)) {
    if (!cid) {
      manifest.documents[key] = { cid: null, status: "NOT_SET" };
      continue;
    }

    // Append gateway token as query-string for private Pinata gateways.
    const fetchUrl   = `${GATEWAY_BASE}/${cid}${GATEWAY_TOKEN ? "?pinataGatewayToken=" + GATEWAY_TOKEN : ""}`;
    const displayUrl = `${GATEWAY_BASE}/${cid}`;

    process.stdout.write(`  ${key.padEnd(28)} ${cid.slice(0, 22)}… `);

    const res       = await headRequest(fetchUrl);
    const reachable = res.status >= 200 && res.status < 400;

    if (reachable) {
      ok++;
      process.stdout.write("✓\n");
    } else {
      fail++;
      process.stdout.write(`✗ (HTTP ${res.status})\n`);
    }

    manifest.documents[key] = {
      cid,
      url:         displayUrl,
      // SHA-256 of the CID string itself — a deterministic commitment that
      // can be stored on-chain without exposing the gateway URL.
      cidSha256:   "0x" + crypto.createHash("sha256").update(cid).digest("hex"),
      httpStatus:  res.status,
      reachable,
      contentType: res.contentType,
    };
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));

  console.log("=".repeat(60));
  console.log("Pinata IPFS Document Manifest");
  console.log("=".repeat(60));
  console.log(`Gateway:    ${GATEWAY_BASE}`);
  console.log(`Documents:  ${ok} reachable, ${fail} unreachable`);
  if (fail > 0) {
    console.log(
      fail === Object.keys(CIDS).length
        ? "WARNING: No documents reachable — check PINATA_GATEWAY_NAME and gateway token"
        : `WARNING: ${fail} document(s) unreachable (recorded in manifest)`
    );
  }
  console.log(`Output:     ${OUTPUT_FILE}`);
  console.log("=".repeat(60));
  // Always exit 0; unreachable documents are recorded in the manifest as
  // warnings.  The workflow step should not fail because a document is
  // temporarily unavailable.
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
