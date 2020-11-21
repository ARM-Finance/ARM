import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

import { getUniswapLiquidity } from "../scripts/getUniswapLiquidity";

const UNI_ROUTER_ADDRESS = process.env.UNI_ROUTER_ADDRESS;
const UNI_ROUTER_ABI = [
    {
        "inputs": [],
        "name": "WETH",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "pure",
        "type": "function"
    }, {
        "inputs": [{
            "internalType": "address",
            "name": "token",
            "type": "address"
        },
            {
                "internalType": "uint256",
                "name": "amountTokenDesired",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amountTokenMin",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amountETHMin",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "deadline",
                "type": "uint256"
            }
        ],
        "name": "addLiquidityETH",
        "outputs": [{
            "internalType": "uint256",
            "name": "amountToken",
            "type": "uint256"
        },
            {
                "internalType": "uint256",
                "name": "amountETH",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "liquidity",
                "type": "uint256"
            }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];

const WETH_ABI = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "guy",
                "type": "address"
            }, {
                "name": "wad",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments, getNamedAccounts, ethers } = hre;
    const { execute, read, log } = deployments;
    const namedAccounts = await getNamedAccounts();
    const { deployer, liquidityProvider, admin } = namedAccounts;
                                  // @ts-ignore
    const lpSigner = await ethers.getSigner(liquidityProvider);
    const armToken = await deployments.get("ARM");

    const UNI_ETH_LIQUIDITY = process.env.UNI_ETH_LIQUIDITY;
    const UNI_TOKEN_LIQUIDITY = process.env.UNI_TOKEN_LIQUIDITY;

    const uniRouter = new ethers.Contract(UNI_ROUTER_ADDRESS, UNI_ROUTER_ABI, lpSigner);

    log(`11) Create Uniswap Market`);
    // Approve Uniswap router to move `UNI_TOKEN_LIQUIDITY` tokens
    await execute('ARM', { from: liquidityProvider }, 'approve', UNI_ROUTER_ADDRESS, UNI_TOKEN_LIQUIDITY);

    const WETH_ADDRESS = await uniRouter.WETH();
    const weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, lpSigner);
    await weth.approve(UNI_ROUTER_ADDRESS, UNI_ETH_LIQUIDITY);

    // Deadline for adding liquidity = now + 25 minutes
    const deadline = Date.now() + 1500;

    // Create Uniswap market + provide initial liquidity
   const result = await uniRouter.addLiquidityETH(
       armToken.address, 
       UNI_TOKEN_LIQUIDITY, // uint amountTokenDesired
       UNI_TOKEN_LIQUIDITY, // uint amountTokenMin
       UNI_ETH_LIQUIDITY,   // uint amountETHMin
       liquidityProvider, 
       deadline, 
       { 
           from: liquidityProvider,
           value: UNI_ETH_LIQUIDITY, // +10 to account for Uniswap protocol conversions 
           gasLimit: 6666666 
        }
    );

   if (result.hash) {
       const receipt = await ethers.provider.waitForTransaction(result.hash);
       if (receipt.status === 0x1) {
           const { tokenLiquidity, ethLiquidity } = await getUniswapLiquidity();
           log(`- Created Uniswap market. 
           Token liquidity: ${ ethers.utils.formatUnits(tokenLiquidity.toString(), 18) } ARM, 
           Ether liquidity: ${ ethers.utils.formatEther(ethLiquidity.toString()) } WETH`);
       } else {
           log(`- Error creating Uniswap market. Tx:`);
           log(receipt);
       }
   } else {
       log(`- Error creating Uniswap market. Tx:`);
       log(result);
   }

   // Transfer remaining deployer balance to admin
   log(`- Transferring remaining deployer ARM tokens to admin address: ${ admin }`);
   let deployerBalance = await read('ARM', 'balanceOf', deployer);
   if (deployerBalance > 0) {
     await execute('ARM', { from: deployer }, 'transfer', admin, deployerBalance); // it shouldn't happen as we provided all minted tokens to Uniswap already (10k)
   }
};

export const skip: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments, getNamedAccounts, ethers } = hre;
    const { read, log } = deployments;
    const namedAccounts = await getNamedAccounts();
    const { liquidityProvider } = namedAccounts;

    const UNI_ETH_LIQUIDITY = process.env.UNI_ETH_LIQUIDITY;
    const UNI_TOKEN_LIQUIDITY = process.env.UNI_TOKEN_LIQUIDITY;
    const { tokenLiquidity } = await getUniswapLiquidity();

    const lpETHBalance = await ethers.provider.getBalance(liquidityProvider);
    const lpTokenBalance = await read('ARM', 'balanceOf', liquidityProvider);
    
    if (tokenLiquidity.gte(UNI_TOKEN_LIQUIDITY)) {
        log(`11) Create Uniswap Market`);
        log(`- Skipping step, Uniswap liquidity already provided`);
        return true;
    } else if (lpTokenBalance.lt(UNI_TOKEN_LIQUIDITY)) {
        log(`11) Create Uniswap Market`);
        log(`- Skipping step, liquidity provider account does not have enough tokens`);
        return true;
    } else if (lpETHBalance.lt(UNI_ETH_LIQUIDITY)) {
        log(`11) Create Uniswap Market`);
        log(`- Skipping step, liquidity provider account does not have enough ETH`);
        return true;
    } else {
        return false;
    }
}

export default func;
export const tags = [ "11", "UniswapMarket" ];
export const dependencies = ["10"];