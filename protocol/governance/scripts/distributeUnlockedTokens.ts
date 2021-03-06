import { readGrantsFromFile } from "./readGrantsFromFile";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { ecsign } from "ethereumjs-util";

const { log } = deployments;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const DOMAIN_TYPEHASH = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
);

const PERMIT_TYPEHASH = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
);

export async function distributeUnlockedTokens() {

    const grants = readGrantsFromFile();
    const { deployer } = await getNamedAccounts();
    const multisend = await deployments.get("Multisend")
    const armToken = await deployments.get("ARM")
    const tokenName = await deployments.read('ARM', 'name')
    const decimals = await deployments.read('ARM', 'decimals');
    const decimalMultiplier = ethers.BigNumber.from(10).pow(decimals);

    let recipients = [];
    let amounts = [];
    let totalNumUnlockedTokens = ethers.BigNumber.from(0);
    let unlockedPercentage = 25;

    for (const grant of grants) {

        if (grant.class === "vesting") {
            unlockedPercentage = 25;
        } else if (grant.class === "unlocked") {
            unlockedPercentage = 100;
        } else {
            continue;
        }

        const totalTokenAllocation = ethers.BigNumber.from(parseInt(grant.amount) * 100).mul(decimalMultiplier).div(100);
        const unlockedAmount = totalTokenAllocation.mul(unlockedPercentage).div(100);

        recipients.push(grant.recipient);
        amounts.push(unlockedAmount);
        totalNumUnlockedTokens = totalNumUnlockedTokens.add(unlockedAmount);
    }

    const domainSeparator = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          [ 'bytes32', 'bytes32', 'bytes32', 'uint256', 'address' ],
          [
              DOMAIN_TYPEHASH, 
              ethers.utils.keccak256(ethers.utils.toUtf8Bytes(tokenName)), 
              ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1")), 
              ethers.provider.network.chainId, 
              armToken.address
          ]
        )
      );

    const nonce = await deployments.read('ARM', 'nonces', deployer);

    // Deadline for distributing tokens = now + 25 minutes
    const deadline = Date.now() + 1500;

    const digest = ethers.utils.keccak256(
        ethers.utils.solidityPack(
            [ 'bytes1', 'bytes1', 'bytes32', 'bytes32' ],
            [
                '0x19',
                '0x01',
                domainSeparator,
                ethers.utils.keccak256(
                    ethers.utils.defaultAbiCoder.encode(
                        [ 'bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256' ],
                        [
                            PERMIT_TYPEHASH, 
                            deployer, 
                            multisend.address, 
                            totalNumUnlockedTokens, 
                            nonce, 
                            deadline
                        ]
                    )
                ),
            ]
        )
    );

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(DEPLOYER_PRIVATE_KEY, 'hex'));

    const result = await deployments.execute(
        'Multisend', 
        { from: deployer, gasLimit: 8000000 }, 
        'batchTransferWithPermit', 
        totalNumUnlockedTokens, 
        recipients, 
        amounts, 
        deadline, 
        v, r, s
    );

    if (result.status) {
        log(`- Distributed unlocked tokens`);
    } else {
        log(`- There was an issue distributing unlocked tokens`);
        log(result);
    }
}

if (require.main === module) {
    distributeUnlockedTokens().then(console.log);
}
