require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.23",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
          viaIR: true,
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
          viaIR: true,
        },
      },
    ],
  },
  networks: {
    story: {
      // Set STORY_RPC_URL env var to a dedicated node (e.g. Alchemy/QuickNode)
      // to avoid rate-limiting on the public endpoint during deployment.
      url: process.env.STORY_RPC_URL || "https://mainnet.storyrpc.io",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 1514,
    },
    base: {
      // Set BASE_RPC_URL env var to a dedicated node (e.g. Alchemy/QuickNode)
      // to avoid rate-limiting on the public endpoint during deployment.
      // If ALCHEMY_API_KEY is set the Alchemy Base endpoint is used automatically;
      // otherwise falls back to BASE_RPC_URL secret, then the public endpoint.
      url: process.env.ALCHEMY_API_KEY
        ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 8453,
    },
    mainnet: {
      // Ethereum mainnet — verified on Etherscan (etherscan.io).
      // Set ALCHEMY_API_KEY for a dedicated Alchemy endpoint, or provide
      // MAINNET_RPC_URL directly; falls back to the public Cloudflare endpoint.
      url: process.env.ALCHEMY_API_KEY
        ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : process.env.MAINNET_RPC_URL || "https://cloudflare-eth.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 1,
    },
    hardhat: {
      chainId: 1514,
    },
  },
  etherscan: {
    apiKey: {
      story: process.env.STORYSCAN_API_KEY || "",
      base: process.env.ETHERSCAN_API_KEY || "",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "story",
        chainId: 1514,
        urls: {
          apiURL: "https://storyscan.xyz/api",
          browserURL: "https://storyscan.xyz",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
