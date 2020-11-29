// SPDX-License-Identifier: MIT
// COPYRIGHT cVault.finance TEAM
// COPYRIGHT ARM Finance LLC
pragma solidity ^0.7.0;

interface IERC95 {
    function wrapAtomic(address) external;
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function skim(address to) external;
    function unpauseTransfers() external;
}