import { getUniswapLiquidity } from "../scripts/getUniswapLiquidity";
import { lockLPTokens } from "../scripts/lockLPTokens";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const UNI_PAIR_ABI = [
    {
        "constant": true,
        "inputs": [
            {
            "internalType": "address",
            "name": "owner",
            "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments, getNamedAccounts } = hre;
    const { deploy, log } = deployments;
    const namedAccounts = await getNamedAccounts();
    const { deployer } = namedAccounts;
    // const { poolAddress } = await getUniswapLiquidity();

    log(`12) Vault`);
    // Deploy Vault contract
    const deployResult = await deploy("Vault", {
        from: deployer,
        contract: "Vault",
        // @ts-ignore
        gas: 4455555,
        // args: [poolAddress],
        skipIfAlreadyDeployed: true
    });

    if (deployResult.newlyDeployed) {
                              // @ts-ignore
        log(`- ${ deployResult.contractName } deployed at ${ deployResult.address } using ${ deployResult.receipt.gasUsed } gas`);
    } else {
        log(`- Deployment skipped, using previous deployment at: ${ deployResult.address }`);
    }

    // Lock LP Tokens
    await lockLPTokens();
};

export const skip: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments, ethers, getNamedAccounts } = hre;
    const { log } = deployments;
    const namedAccounts = await getNamedAccounts();
    const { liquidityProvider } = namedAccounts;
                                  // @ts-ignore
    const lpSigner = await ethers.getSigner(liquidityProvider)
    const { poolAddress } = await getUniswapLiquidity();

    if (poolAddress == ZERO_ADDRESS) {
        log(`12) Vault`);
        log(`- Skipping step, Uniswap pool has not been created yet`);
        return true;
    } else {
        const uniPool = new ethers.Contract(poolAddress, UNI_PAIR_ABI, lpSigner);
        const lpBalance = await uniPool.balanceOf(liquidityProvider);

        if (lpBalance.gt(0)) {
            return false;
        } else {
            log(`12) Vault`);
            log(`- Skipping step, liquidity provider does not have any LP tokens`);
            return true;
        }
    }
}

export default func;
export const tags = ["12", "Vault"];
export const dependencies = ["11"];