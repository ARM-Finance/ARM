import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments, getNamedAccounts, ethers } = hre;
    const { execute, log } = deployments;
    const { deployer, admin } = await getNamedAccounts();
                                        // @ts-ignore
    const deployerSigner = await ethers.getSigner(deployer);

    const votingPowerImplementation = await deployments.get("VotingPower");
    const votingPowerPrism = await deployments.get("VotingPowerPrism");
    const votingPower = new ethers.Contract(votingPowerPrism.address, votingPowerImplementation.abi, deployerSigner);
    const token = await deployments.get("ARM");
    const vesting = await deployments.get("Vesting");

    log(`7) Initialize Voting Power`);
    // Set pending implementation for voting power prism
    await execute('VotingPowerPrism', { from: deployer }, 'setPendingProxyImplementation', votingPowerImplementation.address);
    log(`- Set pending voting power implementation for prism at ${ votingPowerPrism.address } to contract at ${ votingPowerImplementation.address }`);

    // Accept voting power implementation
    await execute('VotingPower', { from: deployer }, 'become', votingPowerPrism.address);
    log(`- Accepted pending voting power implementation of contract at ${ votingPowerImplementation.address }`);

    // Initialize voting power contract
    await votingPower.initialize(token.address, vesting.address);
    log(`- Initialized voting power at ${ votingPowerImplementation.address } via prism at ${ votingPowerPrism.address }`);

    // Set pending admin for voting power
    await execute('VotingPowerPrism', { from: deployer }, 'setPendingProxyAdmin', admin);
    log(`- Set pending voting power admin for prism at ${votingPowerPrism.address} to ${ admin }`);
    log(`- ${admin} can now call 'acceptAdmin' via the voting power prism proxy to become the admin`);

    // Accept pending admin for voting power
    await execute('VotingPowerPrism', { from: admin }, 'acceptProxyAdmin');
    log(`- Accept pending voting power admin for prism at ${votingPowerPrism.address} with ${ admin }`);

    // Set voting power address in vesting contract
    await execute('Vesting', { from: deployer }, 'setVotingPowerContract', votingPowerPrism.address);
    log(`- Set voting power address in vesting contract at ${ vesting.address } to prism at ${ votingPowerPrism.address }`);
};

export const skip: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const { deployments, getNamedAccounts, ethers } = hre;
    const { log } = deployments;
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

    const { deployer } = await getNamedAccounts();
                                            // @ts-ignore
    const deployerSigner = await ethers.getSigner(deployer);
    const token = await deployments.get("ARM");

    const votingPowerImplementation = await deployments.get("VotingPower");
    const votingPowerPrism = await deployments.get("VotingPowerPrism");

    if (token.address !== ZERO_ADDRESS && votingPowerImplementation.address !== ZERO_ADDRESS && votingPowerPrism.address) {
        const votingPower = new ethers.Contract(votingPowerPrism.address, votingPowerImplementation.abi, deployerSigner);
        try {
            const vpARM = await votingPower.armToken();
            if (token.address !== "0x0000000000000000000000000000000000000000" && vpARM === token.address) {
                log(`7) Initialize Voting Power`);
                log(`- Skipping step, voting power prism at ${votingPower.address} already initialized`);
                return true;
            } else {
                return false;
            }
        } catch(e) {
            console.log('- ERROR:', e);
            return false;
        }
    } else {
        return false;
    }
};

export default func;
export const tags = [ "7", "VotingPowerInit" ];
export const dependencies = ["6"];