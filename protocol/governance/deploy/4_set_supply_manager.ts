export default async function ({ getNamedAccounts, deployments }) {
    const { execute, log } = deployments;
    const namedAccounts = await getNamedAccounts();
    const { deployer } = namedAccounts;
    const supplyManager = await deployments.get("SupplyManager");

    log(`4) Set Supply Manager`)
    // Set SupplyManager for ARM to SupplyManager contract
    await execute('ARM', {from: deployer}, 'setSupplyManager', supplyManager.address);
    log(`- Set supply manager for ARM to contract at ${supplyManager.address}`);
};

export const skip = async function({ deployments }) {
    const { log, read } = deployments;
    const supplyManager = await deployments.get("SupplyManager");
    const tokenSupplyManager = await read('ARM', 'supplyManager');
    if(tokenSupplyManager === supplyManager.address) {
        log(`4) Set Supply Manager`)
        log(`- Skipping step, supply manager already set to contract at ${tokenSupplyManager}`)
        return true
    } else{
        return false
    }
}

export const tags = [ "4", "SetSupplyManager" ];
export const dependencies = ["3"]