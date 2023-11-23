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
  },
  etherscan: {
    apiKey: {
      arbitrumOne: vars.get("ARBISCAN_API_KEY"),
    }
  },
  docgen: {
    pages: "files",
    templates: "docs-templates"
  }
};

export default config;