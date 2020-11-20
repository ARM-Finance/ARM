import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

import { validatePrism } from "../scripts/validatePrism";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer, vpDeployer } = await getNamedAccounts();

  log(`5) Voting Power Prism`);
  // Check whether there are any issues with the voting power prism (selector clashes, etc.)
  const prismValid = await validatePrism();
  if (prismValid) {
    // Deploy VotingPowerPrism contract
    const deployResult = await deploy("VotingPowerPrism", {
      from: vpDeployer,
      contract: "VotingPowerPrism",
      // @ts-ignore
      gas: 4455555,
      args: [deployer],
      skipIfAlreadyDeployed: true
    });
    
    if (deployResult.newlyDeployed) {
                           // @ts-ignore
      log(`- ${deployResult.contractName} deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`);
    } else {
      log(`- Deployment skipped, using previous deployment at: ${deployResult.address}`);
    }
  } else {
    log(`- Prism invalid. Please address issues before attempting another deployment`);
    process.exit(1);
  }
};

export default func;
export const tags = [ "5", "VotingPowerPrism" ];
export const dependencies = ["4"];