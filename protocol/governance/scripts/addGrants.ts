import { readGrantsFromFile } from "./readGrantsFromFile";
import { ethers, deployments } from "hardhat";

const { log } = deployments;
let vestingDurationInDays = 180;
let vestingCliffInDays = 180;
let vestingPercentage = 75;

export async function addGrants(startTime) {
    const grants = readGrantsFromFile();
    const owner = await deployments.read('Vesting', 'owner');
    const decimals = await deployments.read('ARM', 'decimals');
    const decimalMultiplier = ethers.BigNumber.from(10).pow(decimals);
    for (const grant of grants) {
        if (grant.class === "vesting") {
            vestingDurationInDays = 180;
            vestingCliffInDays = 0;
            vestingPercentage = 75;
        } else if (grant.class === "team") {
            vestingDurationInDays = 360;
            vestingCliffInDays = 180;
            vestingPercentage = 100;
        } else {
            continue;
        }
        const totalTokenAllocation = ethers.BigNumber.from(grant.amount).mul(decimalMultiplier);
        const grantAmount = totalTokenAllocation.mul(vestingPercentage).div(100);
        log(`- Creating grant for ${ grant.recipient } (class: ${ grant.class }) - Total allocation: ${ totalTokenAllocation }, Grant amount: ${ grantAmount }`);
        await deployments.execute(
            'Vesting',
            { from: owner, gasLimit: 6000000 },
            'addTokenGrant',
            grant.recipient, 
            startTime, 
            grantAmount, 
            vestingDurationInDays, 
            vestingCliffInDays
        );
        const newGrant = await deployments.read('Vesting', 'getTokenGrant', grant.recipient);
        log(`- New grant created for ${ grant.recipient }:`);
        log(`  - Start Time: ${ newGrant[0] }`);
        log(`  - Amount: ${ newGrant[1] }`);
        log(`  - Duration: ${ newGrant[2] }`);
        log(`  - Cliff: ${ newGrant[3] }`);
    }
}

if (require.main === module) {
    const startTime = Date.now() + 21600;
    addGrants(startTime).then(r => console.log(r));
}
