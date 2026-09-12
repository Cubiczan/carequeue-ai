import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Load environment variables from .env file
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local development
    hardhat: {
      chainId: 31337,
    },
    // HashKey Chain Testnet
    "hashkey-testnet": {
      url: process.env.RPC_URL || "https://hashkeychain-testnet.alt.technology",
      chainId: 133,
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : [],
      gasPrice: 1000000000, // 1 gwei
    },
  },
  etherscan: {
    apiKey: {
      "hashkey-testnet": process.env.HASHKEY_API_KEY || "placeholder",
    },
    customChains: [
      {
        network: "hashkey-testnet",
        chainId: 133,
        urls: {
          apiURL: "https://api.hashkeychain-testnet.alt.technology/api",
          browserURL: "https://testnet-explorer.hsk.xyz",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;
