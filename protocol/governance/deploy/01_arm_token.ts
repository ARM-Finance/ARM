import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer, admin } = await getNamedAccounts();

  const currentTime = Date.now();
  const SIX_MONTHS_IN_SECS = 6 * 30 * 24 * 60 * 60;
  const firstSupplyChangeAllowed = currentTime + SIX_MONTHS_IN_SECS;

  log(`1) ARM Token`);
  // Deploy ARM contract
  const deployResult = await deploy("ARM", {
    from: deployer,
    contract: "ARM",
    // @ts-ignore
    gas: 4455555,
    args: [ admin, deployer, firstSupplyChangeAllowed ],
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
export const tags = [ "1", "ARM" ];