import ethers from 'ethers';

const mnemo = "...";
const privateKey = "...";
// const wallet = ethers.Wallet.fromMnemonic(mnemo);
// console.log(wallet.privateKey);

console.log(ethers.Wallet.createRandom().privateKey);
