import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

import { distributeUnlockedTokens } from "../scripts/distributeUnlockedTokens";
import { readGrantsFromFile } from "../scripts/readGrantsFromFile";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments } = hre;
    const { log } = deployments;
    log(`9) Distribute Unlocked Tokens`);
    await distributeUnlockedTokens();
    log(`- Distributed unlocked tokens`);
};

export const skip: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments } = hre;
    const { log, read } = deployments;
    const grants = readGrantsFromFile();

    if (grants.length > 0) {
        const firstGranteeTokenBalance = await read("ARM", "balanceOf", grants[0].recipient);
        if (firstGranteeTokenBalance && firstGranteeTokenBalance.gt(0)) {
            log(`9) Distribute Unlocked Tokens`);
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
export const tags = [ "9", "DistributeUnlockedTokens" ];
export const dependencies = ["8"];