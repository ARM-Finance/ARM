import { getUniswapLiquidity } from "../scripts/getUniswapLiquidity";

export default async ({ ethers, getNamedAccounts, deployments }) => {
    const { execute, read, log } = deployments;
    const { deployer, admin } = await getNamedAccounts();
    const deployerSigner = await ethers.getSigner(deployer);
    const votingPowerImplementation = await deployments.get("VotingPower");
    const votingPowerPrism = await deployments.get("VotingPowerPrism");
    const votingPower = new ethers.Contract(votingPowerPrism.address, votingPowerImplementation.abi, deployerSigner);
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const TARGET_TOKEN_LIQUIDITY = process.env.TARGET_TOKEN_LIQUIDITY;
    const TARGET_ETH_LIQUIDITY = process.env.TARGET_ETH_LIQUIDITY;

    let finalized = true;
  
    log(`10) Finalize`);
    // Transfer remaining deployer Arch tokens to multisig
    log(`- Transferring remaining deployer Arch tokens to admin address: ${admin}`);
    let deployerBalance = await read('ARM', 'balanceOf', deployer);
    let adminBalance = await read('ARM', 'balanceOf', admin);
    if(deployerBalance > 0) {
      await execute('ARM', {from: deployer}, 'transfer', admin, deployerBalance);
      deployerBalance = await read('ARM', 'balanceOf', deployer);
      adminBalance = await read('ARM', 'balanceOf', admin);
    }

    // Make sure deployer no longer has balance
    if(deployerBalance > 0) {
      log(`  - ISSUE: deployer balance > 0. Current balance: ${deployerBalance.toString()}`);
      finalized = false;
    }

    // Make sure admin has balance
    if(adminBalance.eq(0)) {
      log(`  - ISSUE: admin balance == 0. Current balance: ${adminBalance.toString()}`);
      finalized = false;
    }

    // Check that admin is vesting owner
    log(`- Checking that vesting contract owner is admin: ${admin}...`);
    const vestingOwner = await read('Vesting', 'owner');
    if(vestingOwner !== admin) {
      log(`  - ISSUE: Vesting contract owner is not admin: ${admin}, current owner: ${vestingOwner}`);
      finalized = false;
    }

    // Check that supply manager contract is token supply manager
    log(`- Checking that supply manager contract is token supply manager...`);
    const supplyManager = await deployments.get("SupplyManager");
    const tokenSupplyManager = await read('ARM', 'supplyManager');
    if(tokenSupplyManager !== supplyManager.address) {
        log(`  - ISSUE: Token supply manager is not contract at ${supplyManager.address}, current supply manager: ${tokenSupplyManager}`);
        finalized = false;
    }

    // Check that voting power is initialized
    log(`- Checking that voting power is initialized...`);
    const vpARM = await votingPower.armToken();
    const vpVesting = await votingPower.vestingContract();
    if(vpARM === ZERO_ADDRESS || vpVesting === ZERO_ADDRESS) {
        log(`  - ISSUE: Voting power has not yet been initialized. Please initialize via prism proxy at ${votingPower.address}`);
        finalized = false;
    }

    // Check if multisig has accepted itself as admin of voting power
    log(`- Checking that ${admin} has accepted role as admin of voting power...`);
    const votingPowerAdmin = await read('VotingPowerPrism', 'proxyAdmin');
    if(votingPowerAdmin !== admin) {
        log(`  - ISSUE: Multisig has not yet called 'acceptAdmin' on the voting power prism proxy at ${votingPower.address}`);
        finalized = false;
    }

    // Check that Uniswap pool has been seeded with target liquidity
    log(`- Checking that Uniswap pool has been created...`);
    const { tokenLiquidity, ethLiquidity } = await getUniswapLiquidity();
    if(tokenLiquidity.lt(TARGET_TOKEN_LIQUIDITY) || ethLiquidity.lt(TARGET_ETH_LIQUIDITY)) {
        log(`  - ISSUE: Liquidity has not been added to Uniswap pool`);
        finalized = false;
    }

    if(finalized) {
        log(`- Deployment finished`);
    } else {
        log(`- Deployment not finalized. Please address issues above and retry.`);
    }
};
  
export const tags = [ "11", "Finalize" ]
export const dependencies = [ "1", "2", "3", "4", "5", "6", "7", "8", "9", "10" ]