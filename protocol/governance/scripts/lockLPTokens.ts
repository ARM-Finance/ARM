import { ethers, deployments, getNamedAccounts } from "hardhat";
import { ecsign } from "ethereumjs-util";
import { getUniswapLiquidity } from "./getUniswapLiquidity";

const { log } = deployments;

const LIQUIDITY_PROVIDER_PRIVATE_KEY = process.env.LIQUIDITY_PROVIDER_PRIVATE_KEY;
const UNI_PAIR_ABI = [
    {
        "constant": true,
        "inputs": [
            {
            "internalType": "address",
            "name": "owner",
            "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "DOMAIN_SEPARATOR",
        "outputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "PERMIT_TYPEHASH",
        "outputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "stateMutability": "pure",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          }
        ],
        "name": "nonces",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }
];

export async function lockLPTokens() {

    const { admin, liquidityProvider } = await getNamedAccounts();
    const { poolAddress } = await getUniswapLiquidity();
                                 // @ts-ignore
    const lpSigner = await ethers.getSigner(liquidityProvider);

    const vault = await deployments.get("Vault");

    const uniPool = new ethers.Contract(poolAddress, UNI_PAIR_ABI, lpSigner);
    const lpBalance = await uniPool.balanceOf(liquidityProvider);

    const domainSeparator = await uniPool.DOMAIN_SEPARATOR();
    const permitTypehash = await uniPool.PERMIT_TYPEHASH();
    const nonce = await uniPool.nonces(liquidityProvider);

    // Deadline for distributing tokens = now + 25 minutes
    const deadline = Date.now() + 1500;

    // Lock duration
    const SIX_MONTHS_IN_DAYS = 6 * 30;

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
                        [ permitTypehash, liquidityProvider, vault.address, lpBalance, nonce, deadline ]
                    )
                ),
            ]
        )
    );

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(LIQUIDITY_PROVIDER_PRIVATE_KEY, 'hex'));

    log(`- Locking LP tokens...`);
    const result = await deployments.execute(
        'Vault', 
        { from: liquidityProvider, gasLimit: 3333333 }, 
        'lockTokensWithPermit',
        uniPool.address,    // address token (pool address?)
        liquidityProvider,  // address locker
        admin,              // address receiver
        0,                  // uint256 startTime
        lpBalance,          // uint256 amount
        SIX_MONTHS_IN_DAYS, // uint16 lockDurationInDays
        deadline,           // uint256 deadline
        v, r, s
    );

    if (result.status) {
        log(`- Locked ${ lpBalance.toString() } tokens for ${ admin } - Duration: ${ SIX_MONTHS_IN_DAYS } days`);
    } else {
        log(`- There was an issue locking LP tokens`);
        log(result);
    }
}
