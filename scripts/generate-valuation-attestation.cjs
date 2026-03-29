#!/usr/bin/env node
"use strict";
/**
 * generate-valuation-attestation.cjs
 *
 * Computes all deterministic keccak256 attestation hashes and orchestration
 * pre-images from the repository's static data, then writes:
 *
 *   valuation-attestation.json  — complete attestation hash record
 *   yield-summary.json          — loan yield metrics after smart contract deployment
 *
 * Hashes computed:
 *   • Attestation type identifiers  (7 × keccak256(string))
 *   • Corporate document hashes     (already known — reproduced for reference)
 *   • IP valuation dataHash         (keccak256(abi.encodePacked(...)) without timestamp)
 *   • UCC-1 filing hash             (keccak256(abi.encode(cidString)))
 *   • UCC-1 data hash               (keccak256(abi.encodePacked(filingHash32, debtor, securedParty, jurisdiction, filingNumber)))
 *   • Orchestration contract hashes (keccak256(abi.encode(address))) — marked PENDING_DEPLOYMENT
 *   • Hermetic seal pipeline hash   (keccak256 of the combined payload)
 *
 * Yield metrics derived from on-chain constants in StoryOrchestrationService.sol:
 *   BTC_LOAN_APR_BPS = 400  (4.00% APR)
 *   ETH_LOAN_APR_BPS = 600  (6.00% APR)
 *   MORPHO_LLTV       = 86%
 *   TOTAL_ANNUAL_PIL_REVENUE = $12,300,000
 *
 * Usage:
 *   node scripts/generate-valuation-attestation.cjs
 */

const { ethers } = require("ethers");
const fs = require("fs");

// ── Known constants (mirrors StoryAttestationService.sol) ─────────────────

const STORY_CHAIN_ID = 1514n;
// MR IP asset address — not yet registered; ZeroAddress used as deterministic stand-in.
const MR_IPID = ethers.ZeroAddress;
// SLAPS derivative IPID on Story Protocol — not yet assigned; will be populated
// after Story Protocol IP registration is completed.  ZeroAddress is used as a
// deterministic stand-in so the commitment hash is computable today.
const SLAPS_IPID = ethers.ZeroAddress; // "[TO_BE_ASSIGNED]" on Story Protocol
const COINBASE_WALLET = "0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a";
const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// UCC-1 filing data (publicly recorded with New Mexico SOS)
const UCC1_FILING_NUMBER   = "20260000078753";
const UCC1_JURISDICTION    = "New Mexico Secretary of State";
const UCC1_FILING_CID      = "bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a";
const UCC1_DEBTOR          = "0x597856e93f19877a399f686D2F43b298e2268618"; // MR owner / Gladiator Holdings
const UCC1_SECURED_PARTY   = COINBASE_WALLET;

// IP valuation data (from PatentSight+ / IPlytics certified report)
const MR_VALUATION = {
  portfolioName:     "Millionaire Resilience IP Portfolio",
  presentValue:      95_000_000n,
  projectedValue5Y:  500_000_000n,
  projectedValue10Y: 1_700_000_000n,
  patentSightScore:  92n,
  sepCount:          42n,
  avgEssentiality:   88n,
  methodology:       "DCF + PatentSight+ PAI",
  isProtected:       true,
  validityDays:      365n,
};

const SLAPS_VALUATION = {
  portfolioName:     "SLAPS Streaming IP Portfolio",
  presentValue:      75_000_000n,
  projectedValue5Y:  300_000_000n,
  projectedValue10Y: 900_000_000n,
  patentSightScore:  78n,
  sepCount:          18n,
  avgEssentiality:   72n,
  methodology:       "DCF + PatentSight+ PAI",
  isProtected:       false,
  validityDays:      365n,
};

// PIL revenue escrow
const REVENUE_ESCROW = {
  pilPerRevenue:        750_000n,
  pilComRevenue:      1_875_000n,
  pilEntRevenue:        900_000n,
  totalAnnualRevenue: 3_525_000n,
  allocationPct:            100n,
  paymentDestination: COINBASE_WALLET,
};

// ── Attestation type identifiers ──────────────────────────────────────────

function attType(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

const ATT_TYPES = {
  CORPORATE_VERIFICATION:  attType("CORPORATE_VERIFICATION"),
  IP_VALUATION_ATTESTATION: attType("IP_VALUATION_ATTESTATION"),
  UCC1_BRIDGE_ATTESTATION:  attType("UCC1_BRIDGE_ATTESTATION"),
  LOAN_COLLATERAL_ATTESTATION: attType("LOAN_COLLATERAL_ATTESTATION"),
  REVENUE_ESCROW_ATTESTATION:  attType("REVENUE_ESCROW_ATTESTATION"),
  MORPHO_MARKET_ATTESTATION:   attType("MORPHO_MARKET_ATTESTATION"),
  SPV_SEGREGATION_ATTESTATION: attType("SPV_SEGREGATION_ATTESTATION"),
};

// ── Document hashes (from AuxiliaryDocumentManifest.json / contract constants) ──

const DOCUMENT_HASHES = {
  certificateOfOrganization: "0x9d327eb7fdae91d33c186a9d3b770f5004f679a70a34aeb94716042978a8a4fa",
  noticeOfFilingApproval:    "0x244a289d2c997f7f9d5d01ba8640ff7883b138d97ce7bdb0113e1d99b6f971a3",
};

// ── IP valuation dataHash ─────────────────────────────────────────────────
// Replicates: keccak256(abi.encodePacked(ipAssetId, presentValue, ...))
// NOTE: The on-chain version also includes `block.timestamp`; this pre-image
// omits the timestamp and is therefore a *commitment hash* that proves the
// valuation inputs — the final on-chain dataHash will differ by timestamp only.

function ipValuationDataHash(ipAssetId, v) {
  return ethers.keccak256(
    ethers.solidityPacked(
      ["address", "uint256", "uint256", "uint256", "uint256", "string"],
      [
        ipAssetId,
        v.presentValue,
        v.projectedValue5Y,
        v.projectedValue10Y,
        v.patentSightScore,
        v.methodology,
      ]
    )
  );
}

// ── UCC-1 filing hashes ───────────────────────────────────────────────────

// Hash of the IPFS CID itself (matches post-deploy-orchestrate.cjs ucc1FilingHash32)
const ucc1FilingHash32 = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(["string"], [UCC1_FILING_CID])
);

// Data hash stored in on-chain attestation:
// keccak256(abi.encodePacked(filingHash, debtor, securedParty, jurisdiction, filingNumber))
const ucc1DataHash = ethers.keccak256(
  ethers.solidityPacked(
    ["bytes32", "address", "address", "string", "string"],
    [ucc1FilingHash32, UCC1_DEBTOR, UCC1_SECURED_PARTY, UCC1_JURISDICTION, UCC1_FILING_NUMBER]
  )
);

// ── Corporate verification dataHash ───────────────────────────────────────

const corpDataHash = ethers.keccak256(
  ethers.solidityPacked(
    ["bytes32", "bytes32"],
    [DOCUMENT_HASHES.certificateOfOrganization, DOCUMENT_HASHES.noticeOfFilingApproval]
  )
);

// ── Revenue escrow dataHash ────────────────────────────────────────────────

const revenueEscrowDataHash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256", "uint256", "uint256", "uint256", "address"],
    [
      REVENUE_ESCROW.pilPerRevenue,
      REVENUE_ESCROW.pilComRevenue,
      REVENUE_ESCROW.pilEntRevenue,
      REVENUE_ESCROW.totalAnnualRevenue,
      REVENUE_ESCROW.allocationPct,
      REVENUE_ESCROW.paymentDestination,
    ]
  )
);

// ── Hermetic seal pipeline hash ────────────────────────────────────────────
// Combines all static hashes into a single fingerprint for the full pipeline.

const hermeticSealHash = ethers.keccak256(
  ethers.solidityPacked(
    ["bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "bytes32"],
    [
      ATT_TYPES.CORPORATE_VERIFICATION,
      ATT_TYPES.IP_VALUATION_ATTESTATION,
      ATT_TYPES.UCC1_BRIDGE_ATTESTATION,
      ucc1FilingHash32,
      DOCUMENT_HASHES.certificateOfOrganization,
      DOCUMENT_HASHES.noticeOfFilingApproval,
    ]
  )
);

// ── Yield / Loan Economics (from StoryOrchestrationService.sol constants) ──
//
// BTC_LOAN_APR_BPS = 400  → 4.00% APR
// ETH_LOAN_APR_BPS = 600  → 6.00% APR
// MORPHO_LLTV       = 86%
// Monthly payments hard-coded in getProjectedPayoffMonths():
//   btcMonthlyPayment = 217_000 USDC
//   ethMonthlyPayment =  58_000 USDC
// TOTAL_ANNUAL_PIL_REVENUE = 12_300_000 USDC

const BTC_PRINCIPAL   = 5_000_000;
const ETH_PRINCIPAL   = 1_000_000;
const TOTAL_PRINCIPAL = 6_000_000;
const BTC_APR_BPS     = 400;   // 4.00%
const ETH_APR_BPS     = 600;   // 6.00%
const LLTV_PCT        = 86;
const BTC_APR         = BTC_APR_BPS / 10_000;
const ETH_APR         = ETH_APR_BPS / 10_000;

// Annual interest income to lender
const btcAnnualInterest   = BTC_PRINCIPAL * BTC_APR;           // 200_000
const ethAnnualInterest   = ETH_PRINCIPAL * ETH_APR;           //  60_000
const totalAnnualInterest = btcAnnualInterest + ethAnnualInterest; // 260_000

// Weighted APR across both positions
const weightedAPR = (totalAnnualInterest / TOTAL_PRINCIPAL) * 100; // 4.33...%

// Monthly amortization payments (from getProjectedPayoffMonths() in contract)
const BTC_MONTHLY = 217_000;
const ETH_MONTHLY  =  58_000;
const COMBINED_MONTHLY = BTC_MONTHLY + ETH_MONTHLY;  // 275_000

// PIL revenue repayment engine
const PIL_PER_ANNUAL = 800_000;
const PIL_COM_ANNUAL = 3_500_000;
const PIL_ENT_ANNUAL = 8_000_000;
const TOTAL_PIL_ANNUAL = PIL_PER_ANNUAL + PIL_COM_ANNUAL + PIL_ENT_ANNUAL; // 12_300_000
const MONTHLY_PIL = TOTAL_PIL_ANNUAL / 12;   // 1_025_000

// Monthly surplus after loan payments
const MONTHLY_SURPLUS = MONTHLY_PIL - COMBINED_MONTHLY; // 750_000

// Projected payoff — mirrors getProjectedPayoffMonths() Solidity logic
const btcPayoffMonths     = Math.floor(BTC_PRINCIPAL / (MONTHLY_PIL * 5 / 6)) + 1;
const ethPayoffMonths     = Math.floor(ETH_PRINCIPAL / (MONTHLY_PIL / 6)) + 1;
const combinedPayoffMonths = Math.floor(TOTAL_PRINCIPAL / MONTHLY_PIL) + 1;

// Approximate payoff date from deployment (2026-02-05 origin)
const DEPLOYMENT_DATE = new Date("2026-02-05T00:00:00Z");
function addMonths(date, n) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

// ── Assemble attestation record ────────────────────────────────────────────

const attestation = {
  $schema: "https://docs.story.foundation/attestation-schema.json",
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  note: "Pre-deployment attestation hash record. Contract hashes marked PENDING_DEPLOYMENT will be populated by post-deploy-orchestrate.cjs after live deployment.",

  // ── 7 Attestation Type Identifiers ──────────────────────────────────────
  attestationTypeIdentifiers: ATT_TYPES,

  // ── Corporate Document Hashes ─────────────────────────────────────────
  corporateDocumentHashes: {
    certificateOfOrganization: DOCUMENT_HASHES.certificateOfOrganization,
    noticeOfFilingApproval:    DOCUMENT_HASHES.noticeOfFilingApproval,
    combinedCorpDataHash:      corpDataHash,
    entity: "Gladiator Holdings LLC",
    entityId: "0008034162",
    entryNumber: "5095898",
    jurisdiction: "New Mexico",
    effectiveDate: "2025-06-27",
  },

  // ── IP Valuation Attestation Hashes ──────────────────────────────────
  ipValuationHashes: {
    millionaireResilience: {
      ipAsset:             MR_IPID,
      portfolioName:       MR_VALUATION.portfolioName,
      presentValue_USD:    Number(MR_VALUATION.presentValue),
      projectedValue5Y_USD: Number(MR_VALUATION.projectedValue5Y),
      projectedValue10Y_USD: Number(MR_VALUATION.projectedValue10Y),
      patentSightScore:    Number(MR_VALUATION.patentSightScore),
      sepCount:            Number(MR_VALUATION.sepCount),
      methodology:         MR_VALUATION.methodology,
      status:              "PROTECTED",
      valuationDataHash:   ipValuationDataHash(MR_IPID, MR_VALUATION),
      note: "ipAsset uses ZeroAddress placeholder — update to actual IP asset address once assigned. dataHash computed without block.timestamp — final on-chain hash will differ by timestamp only",
    },
    slapsStreaming: {
      ipAsset:             SLAPS_IPID,
      portfolioName:       SLAPS_VALUATION.portfolioName,
      presentValue_USD:    Number(SLAPS_VALUATION.presentValue),
      projectedValue5Y_USD: Number(SLAPS_VALUATION.projectedValue5Y),
      projectedValue10Y_USD: Number(SLAPS_VALUATION.projectedValue10Y),
      patentSightScore:    Number(SLAPS_VALUATION.patentSightScore),
      sepCount:            Number(SLAPS_VALUATION.sepCount),
      methodology:         SLAPS_VALUATION.methodology,
      status:              "AT_RISK (secondary collateral only)",
      valuationDataHash:   ipValuationDataHash(SLAPS_IPID, SLAPS_VALUATION),
      note: "ipAsset uses ZeroAddress placeholder — update to actual Story Protocol IPID once assigned. dataHash also omits block.timestamp.",
    },
    combinedPortfolioValue_USD: 300_000_000,
    whetstone_USD: 45_000_000,
    infrastructure_USD: 50_000_000,
    lexisNexisPatentSight_USD: 35_000_000,
    totalProtected_USD: 225_000_000,
  },

  // ── UCC-1 Filing Hashes ───────────────────────────────────────────────
  ucc1FilingHashes: {
    filingNumber:    UCC1_FILING_NUMBER,
    jurisdiction:    UCC1_JURISDICTION,
    debtor:          UCC1_DEBTOR,
    securedParty:    UCC1_SECURED_PARTY,
    ipfsCid:         UCC1_FILING_CID,
    ucc1FilingHash32,   // keccak256(abi.encode(cid))
    ucc1DataHash,       // keccak256(abi.encodePacked(hash32, debtor, secured, jurisdiction, number))
    loanAmount_USD:  5_000_000,
    primaryCollateral: "Bitcoin (BTC)",
    secondaryCollateral: "SLAPS IP Portfolio",
  },

  // ── Revenue Escrow Hash ───────────────────────────────────────────────
  revenueEscrowHash: {
    annualRevenue_USD:   Number(REVENUE_ESCROW.totalAnnualRevenue),
    allocationPct:       Number(REVENUE_ESCROW.allocationPct),
    paymentDestination:  REVENUE_ESCROW.paymentDestination,
    revenueEscrowDataHash,
  },

  // ── Orchestration Contract Hashes ────────────────────────────────────
  // These are keccak256(abi.encode(deployedAddress)) — computed post-deployment
  orchestrationContractHashes: {
    StoryAttestationService: "PENDING_DEPLOYMENT",
    StoryOrchestrationService: "PENDING_DEPLOYMENT",
    SLAPSIPSpvLoan: "PENDING_DEPLOYMENT",
    note: "Run 'npm run contracts:orchestrate:story' or 'npm run contracts:orchestrate:base' after deployment to populate these hashes.",
  },

  // ── Hermetic Seal Pipeline Hash ───────────────────────────────────────
  hermeticSealHash,

  // ── Known Story Protocol Chain Info ──────────────────────────────────
  storyProtocolAddresses: {
    chainId: 1514,
    mrOwner:           "0x597856e93f19877a399f686D2F43b298e2268618",
    coinbaseWallet:    COINBASE_WALLET,
  },

  // ── Yield Summary (inline reference) ────────────────────────────────
  // Full details in yield-summary.json
  yieldSummaryRef: {
    weightedAPR_pct: `${weightedAPR.toFixed(4)}%`,
    totalPrincipal_USD: TOTAL_PRINCIPAL,
    totalAnnualInterest_USD: totalAnnualInterest,
    combinedMonthlyPayment_USD: COMBINED_MONTHLY,
    projectedPayoffMonths: combinedPayoffMonths,
    details: "yield-summary.json",
  },
};

const yieldSummary = {
  generatedAt: new Date().toISOString(),
  source: "StoryOrchestrationService.sol — on-chain constants (BTC_LOAN_APR_BPS, ETH_LOAN_APR_BPS, getProjectedPayoffMonths)",
  protocol: "Morpho Blue",
  morphoBlue: MORPHO_BLUE,
  blockchain: ["Base L2 (chainId 8453)", "Story Protocol (chainId 1514)"],

  loans: {
    loan1_BTC: {
      description:      "USDC loan collateralised by Bitcoin",
      principal_USD:    BTC_PRINCIPAL,
      collateral:       "BTC (Bitcoin)",
      aprBps:           BTC_APR_BPS,
      apr_pct:          `${(BTC_APR * 100).toFixed(2)}%`,
      lltv_pct:         `${LLTV_PCT}%`,
      annualInterest_USD: btcAnnualInterest,
      monthlyPayment_USD: BTC_MONTHLY,
      projectedPayoffMonths: btcPayoffMonths,
      projectedPayoffDate: addMonths(DEPLOYMENT_DATE, btcPayoffMonths),
    },
    loan2_ETH: {
      description:      "USDC loan collateralised by Ethereum",
      principal_USD:    ETH_PRINCIPAL,
      collateral:       "ETH (Ethereum)",
      aprBps:           ETH_APR_BPS,
      apr_pct:          `${(ETH_APR * 100).toFixed(2)}%`,
      lltv_pct:         `${LLTV_PCT}%`,
      annualInterest_USD: ethAnnualInterest,
      monthlyPayment_USD: ETH_MONTHLY,
      projectedPayoffMonths: ethPayoffMonths,
      projectedPayoffDate: addMonths(DEPLOYMENT_DATE, ethPayoffMonths),
    },
  },

  combined: {
    totalPrincipal_USD:       TOTAL_PRINCIPAL,
    totalAnnualInterest_USD:  totalAnnualInterest,
    weightedAPR_pct:          `${weightedAPR.toFixed(4)}%`,
    combinedMonthlyPayment_USD: COMBINED_MONTHLY,
    projectedPayoffMonths:    combinedPayoffMonths,
    projectedPayoffDate:      addMonths(DEPLOYMENT_DATE, combinedPayoffMonths),
    lltv_pct:                 `${LLTV_PCT}%`,
  },

  pilRevenueRepaymentEngine: {
    description: "100% of licensing revenue routed to loan repayment",
    paymentDestination: COINBASE_WALLET,
    licenseRevenue: {
      "PIL-PER (1% royalty)":   { annualRevenue_USD: PIL_PER_ANNUAL },
      "PIL-COM (5% royalty)":   { annualRevenue_USD: PIL_COM_ANNUAL },
      "PIL-ENT (12% royalty)":  { annualRevenue_USD: PIL_ENT_ANNUAL },
    },
    totalAnnualRevenue_USD:     TOTAL_PIL_ANNUAL,
    monthlyRevenue_USD:         MONTHLY_PIL,
    monthlySurplusAfterPayments_USD: MONTHLY_SURPLUS,
    allocationPct:              "100% to loan repayment until fully paid off",
    postPayoff:                 "After full payoff, licensing revenue flows directly to owner wallet",
  },

  netYieldToLender: {
    summary: `${weightedAPR.toFixed(2)}% weighted APR on $${TOTAL_PRINCIPAL.toLocaleString()} USDC`,
    annualInterestIncome_USD: totalAnnualInterest,
    collateralProtection: `${LLTV_PCT}% LLTV via Morpho Blue — liquidation triggered at ${LLTV_PCT}% LTV`,
    primaryRepaymentSource: "PIL licensing revenue ($12.3M/yr projected)",
    secondaryCollateral: "SLAPS Streaming IP Portfolio ($75M AT_RISK)",
    excludedCollateral: "Millionaire Resilience IP Portfolio ($225M PROTECTED — excluded from default)",
  },
};

// ── Write output ──────────────────────────────────────────────────────────

const OUTPUT_FILE = "valuation-attestation.json";
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(attestation, null, 2));

const YIELD_FILE = "yield-summary.json";
fs.writeFileSync(YIELD_FILE, JSON.stringify(yieldSummary, null, 2));

console.log("=".repeat(60));
console.log("Gladiator Holdings — Valuation Attestation Hash Record");
console.log("=".repeat(60));
console.log();
console.log("Attestation type identifiers:");
for (const [k, v] of Object.entries(ATT_TYPES)) {
  console.log(`  ${k.padEnd(35)} ${v}`);
}
console.log();
console.log("Corporate document hashes:");
console.log(`  certificateOfOrganization  ${DOCUMENT_HASHES.certificateOfOrganization}`);
console.log(`  noticeOfFilingApproval     ${DOCUMENT_HASHES.noticeOfFilingApproval}`);
console.log(`  combinedCorpDataHash       ${corpDataHash}`);
console.log();
console.log("IP valuation commitment hashes:");
console.log(`  MR  (PROTECTED, $95M)      ${ipValuationDataHash(MR_IPID, MR_VALUATION)}  [ipAsset=ZeroAddress placeholder]`);
console.log(`  SLAPS (AT_RISK,  $75M)     ${ipValuationDataHash(SLAPS_IPID, SLAPS_VALUATION)}`);
console.log();
console.log("UCC-1 filing hashes:");
console.log(`  ucc1FilingHash32           ${ucc1FilingHash32}`);
console.log(`  ucc1DataHash               ${ucc1DataHash}`);
console.log();
console.log("Revenue escrow hash:");
console.log(`  revenueEscrowDataHash      ${revenueEscrowDataHash}`);
console.log();
console.log(`Hermetic seal pipeline hash: ${hermeticSealHash}`);
console.log();
console.log("=".repeat(60));
console.log("Yield After Deployment — Morpho Blue Dual Stablecoin Loans");
console.log("=".repeat(60));
console.log();
console.log("  Loan 1  BTC collateral    $5,000,000 USDC @ 4.00% APR (400 bps)");
console.log(`    Annual interest:        $${btcAnnualInterest.toLocaleString()}`);
console.log(`    Monthly payment:        $${BTC_MONTHLY.toLocaleString()}`);
console.log(`    Projected payoff:       ${btcPayoffMonths} months (${addMonths(DEPLOYMENT_DATE, btcPayoffMonths)})`);
console.log(`    LLTV:                   ${LLTV_PCT}%`);
console.log();
console.log("  Loan 2  ETH collateral    $1,000,000 USDC @ 6.00% APR (600 bps)");
console.log(`    Annual interest:        $${ethAnnualInterest.toLocaleString()}`);
console.log(`    Monthly payment:        $${ETH_MONTHLY.toLocaleString()}`);
console.log(`    Projected payoff:       ${ethPayoffMonths} months (${addMonths(DEPLOYMENT_DATE, ethPayoffMonths)})`);
console.log(`    LLTV:                   ${LLTV_PCT}%`);
console.log();
console.log(`  Combined position         $${TOTAL_PRINCIPAL.toLocaleString()} USDC`);
console.log(`    Weighted APR:           ${weightedAPR.toFixed(4)}%`);
console.log(`    Total annual interest:  $${totalAnnualInterest.toLocaleString()}`);
console.log(`    Combined monthly pymt:  $${COMBINED_MONTHLY.toLocaleString()}`);
console.log(`    Payoff (combined):      ${combinedPayoffMonths} months (${addMonths(DEPLOYMENT_DATE, combinedPayoffMonths)})`);
console.log();
console.log("  PIL Revenue Repayment Engine");
console.log(`    PIL-PER (1%  royalty):  $${PIL_PER_ANNUAL.toLocaleString()}/yr`);
console.log(`    PIL-COM (5%  royalty):  $${PIL_COM_ANNUAL.toLocaleString()}/yr`);
console.log(`    PIL-ENT (12% royalty):  $${PIL_ENT_ANNUAL.toLocaleString()}/yr`);
console.log(`    Total annual revenue:   $${TOTAL_PIL_ANNUAL.toLocaleString()}/yr`);
console.log(`    Monthly PIL revenue:    $${MONTHLY_PIL.toLocaleString()}`);
console.log(`    Surplus after payments: $${MONTHLY_SURPLUS.toLocaleString()}/mo`);
console.log();
console.log(`Attestation record written to: ${OUTPUT_FILE}`);
console.log(`Yield summary written to:      ${YIELD_FILE}`);
console.log("=".repeat(60));
