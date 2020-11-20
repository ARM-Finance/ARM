import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const token = await deployments.get("ARM");

  log(`9) Multisend`);
  // Deploy vesting contract
  const deployResult = await deploy("Multisend", {
    from: deployer,
    contract: "Multisend",
    // @ts-ignore
    gas: 4455555,
    args: [token.address],
    skipIfAlreadyDeployed: true
  });

  if (deployResult.newlyDeployed) {
                         // @ts-ignore
    log(`- ${ deployResult.contractName } deployed at ${ deployResult.address } using ${ deployResult.receipt.gasUsed } gas`);
    log(`- Set max approval for vesting contract at ${ deployResult.address } for deployer: ${ deployer }`);
  } else {
    log(`- Deployment skipped, using previous deployment at: ${ deployResult.address }`);
  }
};

export default func;
export const tags = [ "9", "Multisend" ];
export const dependencies = ["8"];