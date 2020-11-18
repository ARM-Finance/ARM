import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

  const { deployments, getNamedAccounts } = hre;
  const { deploy, execute, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const token = await deployments.get("ARM");

  log(`2) Vesting`);
  // Deploy vesting contract
  const deployResult = await deploy("Vesting", {
    from: deployer,
    contract: "Vesting",
    // @ts-ignore
    gas: 4455555,
    args: [token.address],
    skipIfAlreadyDeployed: true
  });

  if (deployResult.newlyDeployed) {
                         // @ts-ignore
    log(`- ${deployResult.contractName} deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`);

    // Set approval for vesting contract to transfer deployer's tokens
    await execute('ARM', { from: deployer }, 'approve', deployResult.address, hre.ethers.constants.MaxUint256);
    log(`- Set max approval for vesting contract at ${deployResult.address} for deployer: ${deployer}`);
  } else {
    log(`- Deployment skipped, using previous deployment at: ${deployResult.address}`);
  }
};

export default func;
export const tags = [ "2", "Vesting" ];
export const dependencies = ["1"];