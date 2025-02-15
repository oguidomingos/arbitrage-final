import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ]
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.POLYGON_RPC_URL || "",
        blockNumber: 51141535,
        enabled: true,
      },
      chainId: 137,
      mining: {
        auto: true,
        interval: 1000,
      },
      gas: "auto",
      gasPrice: "auto",
      initialBaseFeePerGas: 0,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 137,
      gas: 30000000,
      gasPrice: 50000000000, // 50 gwei
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
      },
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  mocha: {
    timeout: 100000
  }
};

export default config;
