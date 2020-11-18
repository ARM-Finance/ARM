import { readGrantsFromFile } from "./readGrantsFromFile";
import { ethers, deployments, getNamedAccounts } from "hardhat";

const { log } = deployments;
let unlockedPercentage = 25;

export async function distributeUnlockedTokens() {

    const grants = readGrantsFromFile();
    const { deployer } = await getNamedAccounts();
    const decimals = await deployments.read('ARM', 'decimals');
    const decimalMultiplier = ethers.BigNumber.from(10).pow(decimals);

    for (const grant of grants) {
        if (grant.class === "vesting") {
            unlockedPercentage = 25;
        } else if (grant.class === "unlocked") {
            unlockedPercentage = 100;
        } else {
            continue;
        }

        const totalTokenAllocation = ethers.BigNumber.from(grant.amount).mul(decimalMultiplier);
        const unlockedAmount = totalTokenAllocation.mul(unlockedPercentage).div(100);

        log(`- Sending unlocked tokens to ${ grant.recipient } (class: ${ grant.class }) - 
        Total allocation: ${ totalTokenAllocation }, Unlocked amount: ${ unlockedAmount }`);
        await deployments.execute(
            'ARM',
            { from: deployer, gasLimit: 100000 },
            'transfer',
            grant.recipient, unlockedAmount);

        const newBalance = await deployments.read('ARM', 'balanceOf', grant.recipient);
        log(`- Unlocked token balance for ${grant.recipient}: ${newBalance}`);
    }
}

if (require.main === module) {
    distributeUnlockedTokens().then(console.log);
}
