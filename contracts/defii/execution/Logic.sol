// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

abstract contract Logic {
    error NotImplemented();
    error WrongBuildingBlockId(uint256);

    function claimRewards(address recipient) external payable virtual {
        revert NotImplemented();
    }

    function emergencyExit() external payable virtual {
        revert NotImplemented();
    }

    function exitBuildingBlock(uint256 buildingBlockId) external payable virtual {
        revert NotImplemented();
    }

    function withdrawLiquidity(
        address recipient,
        uint256 amount
    ) external payable virtual {
        revert NotImplemented();
    }

    function enter() external payable virtual;

    function exit(uint256 liquidity) external payable virtual;

    function accountLiquidity(
        address account
    ) external view virtual returns (uint256);
}
