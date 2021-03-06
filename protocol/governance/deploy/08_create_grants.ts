import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments, getNamedAccounts } = hre;
    const { log, execute } = deployments;
    const { deployer, admin } = await getNamedAccounts();
    const { addGrants } = require("../scripts/addGrants");

    log(`8) Create Grants`);
    // Set start time for grants at now + 48 hours
    const delay = 48 * 60 * 60;
    const startTime = Date.now() + delay;
    // Create grants from file
    await addGrants(startTime);
    log(`- Done creating grants`);
    // Change vesting owner
    log(`- Changing vesting contract owner to admin address: ${ admin }`);
    await execute('Vesting', { from: deployer }, 'changeOwner', admin);
};

export const skip: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments } = hre;
    const { log, read } = deployments;
    const { readGrantsFromFile } = require("../scripts/readGrantsFromFile");
    const grants = readGrantsFromFile();

    if (grants.length > 0) {
        for (const grant of grants) {
            const activeGrant = await read("Vesting", "getTokenGrant", grant.recipient);
            if (activeGrant && activeGrant.amount && activeGrant.amount.gt(0)) {
                log(`8) Create Grants`);
                log(`- Skipping step, grants already created`);
                return true;
            }
        }
        return false;
    } else {
        log(`8) Create Grants`);
        log(`- Skipping step, could not find grants`);
        return true;
    }
}

export default func;
export const tags = [ "8", "CreateGrants" ];
export const dependencies = ["7"];