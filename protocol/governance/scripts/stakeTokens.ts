import { ethers, deployments, getNamedAccounts } from "hardhat";
import { ecsign } from "ethereumjs-util";

const { log, read } = deployments;

const STAKER_PRIVATE_KEY = process.env.STAKER_PRIVATE_KEY;
const STAKE_AMOUNT = process.env.STAKE_AMOUNT;


const DOMAIN_TYPEHASH = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
);

const PERMIT_TYPEHASH = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
);

let tokenName;
let decimals;
let decimalMultiplier;
let votingPowerImplementation;
let votingPowerPrism;
let votingPower;

export async function stakeARM(staker, amount) {

    decimals = await deployments.read('ARM', 'decimals');
    decimalMultiplier = ethers.BigNumber.from(10).pow(decimals);

    votingPowerImplementation = await deployments.get("VotingPower");
    votingPowerPrism = await deployments.get("VotingPowerPrism");
    votingPower = new ethers.Contract(votingPowerPrism.address, votingPowerImplementation.abi, staker);

    const result = await votingPower.stake(decimalMultiplier.mul(amount));
    const receipt = await ethers.provider.waitForTransaction(result.hash);

    if (receipt.status) {
        log(`Successfully staked ARM`);
    } else {
        log(`Error staking ARM. Tx:`);
        log(receipt);
    }
}

export async function stakeARMWithPermit(staker, amount) {

    const armToken = await deployments.get("ARM");
    tokenName = await deployments.read('ARM', 'name');
    decimals = await deployments.read('ARM', 'decimals');
    decimalMultiplier = ethers.BigNumber.from(10).pow(decimals);

    votingPowerImplementation = await deployments.get("VotingPower");
    votingPowerPrism = await deployments.get("VotingPowerPrism");
    votingPower = new ethers.Contract(votingPowerPrism.address, votingPowerImplementation.abi, staker);

    const stakeAmount = decimalMultiplier.mul(amount);
    const domainSeparator = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            [ 'bytes32', 'bytes32', 'bytes32', 'uint256', 'address' ],
            [
                DOMAIN_TYPEHASH, 
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes(tokenName)), 
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1")), 
                ethers.provider.network.chainId, armToken.address
            ]
        )
    );

    const nonce = await deployments.read('ARM', 'nonces', staker.address);

    // Deadline for distributing tokens = now + 25 minutes
    const deadline = Date.now() + 1500;

    const digest = ethers.utils.keccak256(
        ethers.utils.solidityPack(
            ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
            [
                '0x19',
                '0x01',
                domainSeparator,
                ethers.utils.keccak256(
                    ethers.utils.defaultAbiCoder.encode(
                        [ 'bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256' ],
                        [
                            PERMIT_TYPEHASH, 
                            staker.address, 
                            votingPower.address, 
                            stakeAmount, 
                            nonce, 
                            deadline
                        ]
                    )
                ),
            ]
        )
    );

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(STAKER_PRIVATE_KEY, 'hex'));
    const result = await votingPower.stakeWithPermit(stakeAmount, deadline, v, r, s);
    const receipt = await ethers.provider.waitForTransaction(result.hash);

    if (receipt.status) {
        log(`Successfully staked ARM`);
    } else {
        log(`Error staking ARM. Tx:`);
        log(receipt);
    }
}

export async function printStakedBalance(staker) {
    decimals = await deployments.read('ARM', 'decimals');
    decimalMultiplier = ethers.BigNumber.from(10).pow(decimals);

    const votingPowerImplementation = await deployments.get("VotingPower");
    const votingPowerPrism = await deployments.get("VotingPowerPrism");
    const votingPower = new ethers.Contract(votingPowerPrism.address, votingPowerImplementation.abi, staker);
    const stakedBalance = await votingPower.getStakedARMAmount(staker.address);
    const votingPowerBalance = await votingPower.balanceOf(staker.address);
    
    log(`-----------------------------------------------------`);
    log(`Staker: ${ staker.address }`);
    log(`Stake Balance: ${ stakedBalance.div(decimalMultiplier).toString() }`);
    log(`Voting Power Balance: ${ votingPowerBalance.div(decimalMultiplier).toString() }`);
    log(`-----------------------------------------------------`);
}

export async function getStakerSigner() {
    const { staker } = await getNamedAccounts();
                                      // @ts-ignore
    const stakerSigner = await ethers.getSigner(staker);
    return stakerSigner;
}
