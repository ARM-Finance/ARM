// @ts-ignore
import { deployments } from "hardhat";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const tokenFixture = deployments.createFixture(async ({deployments, getNamedAccounts, getUnnamedAccounts, ethers}, options) => {

    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    const admin = accounts[2];
    const alice = accounts[3];
    const bob = accounts[4];
    const currentTime = Date.now();
    const SIX_MONTHS_IN_SECS = 6 * 30 * 24 * 60 * 60;
    const firstSupplyChangeAllowed = currentTime + SIX_MONTHS_IN_SECS;
    const ArchTokenFactory = await ethers.getContractFactory("ARM");
    const ARM = await ArchTokenFactory.deploy(admin.address, deployer.address, firstSupplyChangeAllowed);

    return {
        armToken: ARM,
        deployer: deployer,
        admin: admin,
        alice: alice,
        bob: bob,
        ZERO_ADDRESS: ZERO_ADDRESS
    };
});

export const governanceFixture = deployments.createFixture(async ({deployments, getNamedAccounts, getUnnamedAccounts, ethers}, options) => {

    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    const admin = accounts[2];
    const alice = accounts[3];
    const bob = accounts[4];
    const currentTime = Date.now();
    const SIX_MONTHS_IN_SECS = 6 * 30 * 24 * 60 * 60;
    const firstSupplyChangeAllowed = currentTime + SIX_MONTHS_IN_SECS;
    const ARMTokenFactory = await ethers.getContractFactory("ARM");
    const ARM = await ARMTokenFactory.deploy(admin.address, deployer.address, firstSupplyChangeAllowed);
    const VestingFactory = await ethers.getContractFactory("Vesting");
    const Vesting = await VestingFactory.deploy(ARM.address);
    const VotingPowerFactory = await ethers.getContractFactory("VotingPower");
    const VotingPowerImp = await VotingPowerFactory.deploy();
    const VotingPowerPrismFactory = await ethers.getContractFactory("VotingPowerPrism");
    const VotingPowerPrism = await VotingPowerPrismFactory.deploy();
    const VotingPower = new ethers.Contract(VotingPowerPrism.address, VotingPowerImp.interface, deployer);

    return {
        armToken: ARM,
        vesting: Vesting,
        votingPower: VotingPower,
        votingPowerImplementation: VotingPowerImp,
        votingPowerPrism: VotingPowerPrism,
        deployer: deployer,
        admin: admin,
        alice: alice,
        bob: bob,
        ZERO_ADDRESS: ZERO_ADDRESS
    };
});
