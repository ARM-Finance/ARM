import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-abi-exporter";
import "hardhat-log-remover";
import "hardhat-gas-reporter";
// import "@tenderly/hardhat-tenderly";

import { task, HardhatUserConfig } from "hardhat/config";

require('dotenv').config();
const WEB3_PROVIDER_KEY = process.env.WEB3_PROVIDER_KEY;
const FORK_URL = process.env.FORK_URL;
const FORK_BLOCK_NUMBER = process.env.FORK_BLOCK_NUMBER;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const LIQUIDITY_PROVIDER_ADDRESS = process.env.LIQUIDITY_PROVIDER_ADDRESS;
const LIQUIDITY_PROVIDER_PRIVATE_KEY = process.env.LIQUIDITY_PROVIDER_PRIVATE_KEY;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
// const TENDERLY_USERNAME = process.env.TENDERLY_USERNAME
// const TENDERLY_PROJECT_NAME = process.env.TENDERLY_PROJECT_NAME
const REPORT_GAS = process.env.REPORT_GAS;
const CMC_API_KEY = process.env.CMC_API_KEY;

const ARM = '0xa37580e882586bc834912f332052c1dbb19bfb5252e4a6209a8c5514ca161f10';
const CORE = '0xb169e3555400a60ddc713482b313731d7df8f8baeb0bbdeb2132a776d3d90d61';
const accounts = [
  { privateKey: DEPLOYER_PRIVATE_KEY,           balance: "100000000000000000000" },
  { privateKey: LIQUIDITY_PROVIDER_PRIVATE_KEY, balance: "100000000000000000000" },
  { privateKey: ADMIN_PRIVATE_KEY,              balance: "100000000000000000000" },
  { privateKey: ARM,                            balance: "100000000000000000000" },
  { privateKey: CORE,                           balance: "100000000000000000000" },
];
// Default Hardhat network config
let hardhatConfig = {
  hardfork: "muirGlacier",
  live: false,
  saveDeployments: true,
  tags: [ "test" ],
  accounts,
  forking: {
    enabled: true,
    url: '',
    blockNumber: 0
  }
};

// If FORK_URL env var is set, enable forking on Hardhat network
// Documentation: https://hardhat.org/hardhat-network/#mainnet-forking
if (FORK_URL && FORK_URL.length > 0) {
  hardhatConfig.forking.enabled = true;
  hardhatConfig.forking.url = FORK_URL;
  hardhatConfig.tags.push("dev");
  // If FORK_BLOCK_NUMBER env var is set, create fork from specific block
  if (FORK_BLOCK_NUMBER && parseInt(FORK_BLOCK_NUMBER)) {
    hardhatConfig.forking.blockNumber = parseInt(FORK_BLOCK_NUMBER);
  }
} else {
  hardhatConfig.tags.push("local");
}

let localhostConfig = {
  url: 'http://localhost:8545',
  live: false,
  saveDeployments: true,
  tags: [ "local" ]
};

let rinkebyConfig = {
  url: "https://eth-rinkeby.alchemyapi.io/v2/" + WEB3_PROVIDER_KEY,
  chainId: 4,
  live: true,
  saveDeployments: true,
  tags: [ "staging" ],
  accounts: []
};

let mainnetConfig = {
  url: "https://eth-mainnet.alchemyapi.io/v2/" + WEB3_PROVIDER_KEY,
  chainId: 1,
  live: true,
  saveDeployments: true,
  tags: [ "prod", "mainnet", "live" ],
  accounts: [],
};

// Hardhat tasks
// Documentation: https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();
  accounts.forEach(account => console.log(account.address));
});

// Hardhat Config
// Documentation: https://hardhat.org/config/
// Deploy add-ons: https://hardhat.org/plugins/hardhat-deploy.html
const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: hardhatConfig,
    localhost: localhostConfig,
    rinkeby: rinkebyConfig,
    mainnet: mainnetConfig
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  namedAccounts: {
    deployer: {
      default: 0,
      1: DEPLOYER_ADDRESS,
      4: DEPLOYER_ADDRESS
    },
    liquidityProvider: {
      default: 1,
      1: LIQUIDITY_PROVIDER_ADDRESS,
      4: LIQUIDITY_PROVIDER_ADDRESS
    },
    admin: {
      default: 2,
      1: ADMIN_ADDRESS,
      4: ADMIN_ADDRESS
    }
  },
  paths: {
    deploy: './deploy',
    deployments: './deployments',
    imports: './imports',
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  abiExporter: {
    path: './abis',
    clear: true,
    flat: true
  },
  // tenderly: {
  //   username: TENDERLY_USERNAME,
  //   project: TENDERLY_PROJECT_NAME
  // },
  gasReporter: {
    enabled: !!(REPORT_GAS && REPORT_GAS === 'true'),
    coinmarketcap: CMC_API_KEY,
    currency: `EUR`,
    showTimeSpent: true
  },
  solidity: {
    version: "0.7.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 9999
      }
    }
  }
};

export default config;