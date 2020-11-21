import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

import { distributeUnlockedTokens } from "../scripts/distributeUnlockedTokens";
import { readGrantsFromFile } from "../scripts/readGrantsFromFile";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments, getNamedAccounts } = hre;
    const { log, execute } = deployments;
    const { deployer, liquidityProvider } = await getNamedAccounts();
    const UNI_TOKEN_LIQUIDITY = process.env.UNI_TOKEN_LIQUIDITY;

    log(`10) Distribute Unlocked Tokens`);
    await distributeUnlockedTokens();
    log(`- Transferring ${ UNI_TOKEN_LIQUIDITY } tokens to liquidity provider address`);
    await execute('ARM', { from: deployer }, 'transfer', liquidityProvider, UNI_TOKEN_LIQUIDITY);
};

export const skip: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments, getNamedAccounts } = hre;
    const { log, read } = deployments;
    const { liquidityProvider } = await getNamedAccounts();

    const DAO_TREASURY_ADDRESS = process.env.DAO_TREASURY_ADDRESS;

    const grants = readGrantsFromFile();
    if (grants.length > 0) {
        const treasuryTokenBalance = await read("ARM", "balanceOf", DAO_TREASURY_ADDRESS);
        const liquidityProviderBalance = await read("ARM", "balanceOf", liquidityProvider);

        if (treasuryTokenBalance.gt(0) || liquidityProviderBalance.gt(0)) {
            log(`10) Distribute Unlocked Tokens`);
            log(`- Skipping step, unlocked tokens already distributed`);
            return true;
        } else {
            return false;
        }
    } else {
        log(`9) Distribute Unlocked Tokens`);
        log(`- Skipping step, could not find grants`);
        return true;
    }
}

export default func;
export const tags = [ "10", "DistributeUnlockedTokens" ];
export const dependencies = ["9"];