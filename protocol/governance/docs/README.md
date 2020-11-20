# ARM Governance

If you have feedback or run into any issues, feel free to open a new GitHub issue for the repository.
For general questions and discussion, please join the [ARM Finance Discord](https://discord.gg/QzAXrxa) or [Telegram](https://t.me/joinchat/JfgdIRhOSw3F3qnnst8sfg) and stay tuned for announcements in the coming weeks.

## Prerequisites
* Unix OS

## Install
* [Node.js 15](https://github.com/nvm-sh/nvm)
* [NPM 7](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

###### Optional Install
* [MythX](https://github.com/dmuhs/mythx-cli/)

## ⠧ Contract Overview
ARM governance is made up of a series of Ethereum smart contracts governed by ARM token holders.
The initial set of smart contracts form the base for controlling the project decisions 
and configurations for the broader ARM Finance ecosystem protocols and applications.

ARM governance is intended to follow the principles of progressive decentralization, 
from the moment ARM tokens are deployed, ARM token holders may join private comm 
channels and use their holdings to signal preferences on governance decisions. 
Additional contracts may be developed by the community itself in the future.


## ⠧ Smart Contracts
The initial set of smart contracts deployed for ARM:
- ARM Token Contract
- Supply Manager Contract
- Token Vesting Contract
- Voting Power Prism (Proxy)
- Voting Power Implementation Contract
- Multisend
- Vault

## ⠧ ARM Token
The ARM token is ERC-20 compliant, with add-ons to allow for off-chain signing (approvals + transfers),
to learn more refer to:
 * [EIP-712](https://eips.ethereum.org/EIPS/eip-712)
 * [EIP-2612](https://eips.ethereum.org/EIPS/eip-2612)
 * [EIP-3009](https://eips.ethereum.org/EIPS/eip-3009)
 
The contract is non-upgradable and uses immutable logic which includes configurations for modifying total supply and token metadata.

Supply changes must be initiated by a **supplyManager** address (see _Supply Manager_, below). 
The configurations are restricted to hardcoded limits with the following default values:
- Time between supply changes (mints/burns): `365 days` (min. 90 days)
- Maximum inflation per mint: `2%` (min. 0%; max 6.5%)

Token metadata changes (name and symbol) must be initiated by a **metadataManager** address.
- Manager: `Team Multisig`

	
## ⠧ Multisend
Multisend is a simple contract that allows the sender to transfer multiple token balances in one transaction.


## ⠧ Vault
Vaults are used to lock up tokens without providing any voting power (unlike Vesting).


## ⠧ Supply Manager
The Supply Manager contract controls the configurable values for the ARM token supply.
- Admin: `Team Multisig`

All decisions made by the Supply Manager are enacted via propose/accept scheme, where proposals have a minimum waiting period (i.e. timelock) before they can be accepted.
Proposals can be canceled at any time by the admin (resetting the waiting period for new proposals of that type).

Initially the proposal length is set to:
- Proposal length: `30 days` (min 7 days)

The community may develop and deploy a replacement Supply Manager contract in the future. 
It is **not** possible for the Supply Manager contract to circumvent any hardcoded limits in the ARM token.


## ⠧ Token Vesting
The Token Vesting contract allows early investors, team members and other Grant recipients to claim unlocked tokens according to individual vesting schedules. 
Accounts with token balances in this contract receive Voting Power (see _Voting Power Proxy_, below).

The Token Vesting contract stores vesting tokens and distributes vested tokens. Vesting is linear and continuous, with an optional cliff. Vested balances may only be claimed by the Grant recipient.

Grants are initiated with the following parameters:
- Recipient
- Start time
- Token balance
- Vesting duration (days)
- Cliff duration (days)

Each account may have a maximum of one active Grant. The contract owner is the only account which may create new Grants.


## ⠧ Voting Power Prism (Proxy)
The Voting Power Prism proxy contract keeps track of how many votes each ARM holder has.

Voting Power increases when tokens are staked. 
Voting Power decreases when tokens are unstaked. 
Balances in the Token Vesting contract are considered staked for the purpose of Voting Power calculations.

Voting Power snapshots are stored following the Diamond Storage technique outlined by the Diamond Standard 
(see [EIP-2535](https://eips.ethereum.org/EIPS/eip-2535)). 
This ensures that snapshots remain available even if the underlying logic to form subsequent snapshots changes.
Additional contracts may be developed by the community itself, to modify how Voting Power is tracked.


## ⠧ Voting Power Implementation Contract
The Voting Power Implementation contract determines how votes are recorded for snapshots.

Initially, the ARM token is used to calculate Voting Power. 
This contract may be redeployed to allow for extended functionality, such as delegation or accepting additional tokens.
