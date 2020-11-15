import { distributeUnlockedTokens} from "../scripts/distributeUnlockedTokens";
import { readGrantsFromFile} from "../scripts/readGrantsFromFile";

export default async function ({ deployments }) {
    const { log } = deployments;
    log(`9) Distribute Unlocked Tokens`);
    await distributeUnlockedTokens();
    log(`- Distributed unlocked tokens`);
};

export async function skip({ deployments }) {
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

export const tags = [ "9", "DistributeUnlockedTokens" ];
export const dependencies = ["8"];