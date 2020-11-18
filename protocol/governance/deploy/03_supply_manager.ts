import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

  const {deployments, getNamedAccounts} = hre;
  const { deploy, log } = deployments;
  const { deployer, admin } = await getNamedAccounts();
  const token = await deployments.get("ARM");

  log(`3) Supply Manager`);
  // Deploy SupplyManager contract
  const deployResult = await deploy("SupplyManager", {
    from: deployer,
    contract: "SupplyManager",
    // @ts-ignore
    gas: 4455555,
    args: [token.address, admin],
    skipIfAlreadyDeployed: true
  });

  if (deployResult.newlyDeployed) {
                         // @ts-ignore
    log(`- ${deployResult.contractName} deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`);
  } else {
    log(`- Deployment skipped, using previous deployment at: ${deployResult.address}`)
  }
};

export default func;
export const tags = [ "3", "SupplyManager" ]
export const dependencies = ["2"]