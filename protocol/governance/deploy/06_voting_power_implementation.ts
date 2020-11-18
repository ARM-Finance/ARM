import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log(`6) Voting Power Implementation`);
  // Deploy VotingPower implementation contract
  const deployResult = await deploy("VotingPower", {
    from: deployer,
    contract: "VotingPower",
    // @ts-ignore
    gas: 4000000,
    skipIfAlreadyDeployed: true
  });

  if (deployResult.newlyDeployed) {
                         // @ts-ignore
    log(`- ${deployResult.contractName} deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`);
  } else {
    log(`- Deployment skipped, using previous deployment at: ${deployResult.address}`);
  }
};

export default func;
export const tags = [ "6", "VotingPower" ];
export const dependencies = ["5"];