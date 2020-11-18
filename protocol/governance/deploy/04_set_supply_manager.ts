import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments, getNamedAccounts } = hre;
    const { execute, log } = deployments;
    const namedAccounts = await getNamedAccounts();
    const { deployer } = namedAccounts;
    const supplyManager = await deployments.get("SupplyManager");

    log(`4) Set Supply Manager`);
    // Set SupplyManager for ARM to SupplyManager contract
    await execute('ARM', { from: deployer }, 'setSupplyManager', supplyManager.address);
    log(`- Set supply manager for ARM to contract at ${ supplyManager.address }`);
};

export const skip: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments } = hre;
    const { log, read } = deployments;
    const supplyManager = await deployments.get("SupplyManager");
    const tokenSupplyManager = await read('ARM', 'supplyManager');
    if (tokenSupplyManager === supplyManager.address) {
        log(`4) Set Supply Manager`);
        log(`- Skipping step, supply manager already set to contract at ${ tokenSupplyManager }`);
        return true;
    } else {
        return false;
    }
}

export default func;
export const tags = [ "4", "SetSupplyManager" ];
export const dependencies = ["3"];