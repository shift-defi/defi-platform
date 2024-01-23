import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deal";
import 'solidity-docgen';
import "./deploy"

let accounts: string[] = []
if (process.env.DEPLOYER) {
  accounts.push(process.env.DEPLOYER)
}


const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          evmVersion: 'paris',
          optimizer: {
            enabled: true,
            runs: 1
          },
        }
      },
    ]
  },
  networks: {
    hardhat: {},
    arbitrumOne: {
      chainId: 42161,
      url: vars.get("ARBITRUM_RPC"),
      accounts
    },
    optimisticEthereum: {
      chainId: 10,
      url: vars.get("OP_RPC"),
      accounts
    },
    base: {
      chainId: 8453,
      url: vars.get("BASE_RPC"),
      accounts
    },
  },
  etherscan: {
    apiKey: {
      arbitrumOne: vars.get("ARBISCAN_API_KEY"),
      optimisticEthereum: vars.get("OPTIMISTIC_ETHERSCAN_API_KEY"),
      base: vars.get("BASESCAN_API_KEY")
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
    ]
  },
  docgen: {
    pages: "files",
    templates: "docs-templates"
  }
};

export default config;