/* solhint-disable */
// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {LocalDefii} from "../../defii/LocalDefii.sol";
import {Logic} from "../../defii/execution/Logic.sol";

import {Supported1Token} from "../../defii/supported-tokens/Supported1Token.sol";

import {Lending} from "../protocols/Lending.sol";
import "hardhat/console.sol";

contract DefiiLogic is Logic {
    Lending public immutable lending;

    constructor(Lending lending_) {
        lending = lending_;
    }

    function accountLiquidity(
        address account
    ) external view override returns (uint256) {
        return lending.lpToken().balanceOf(account);
    }

    function enter() external payable override {
        lending.depositToken().approve(address(lending), type(uint256).max);
        lending.deposit(lending.depositToken().balanceOf(address(this)));
    }

    function claimRewards(address recipient) external payable override {
        lending.claimRewards();
        lending.incentiveToken().transfer(
            recipient,
            lending.incentiveToken().balanceOf(address(this))
        );
    }

    function exit(uint256 liquidity) external payable override {
        lending.withdraw(liquidity);
    }

    function withdrawLiquidity(
        address recipient,
        uint256 amount
    ) external payable override {
        lending.lpToken().transfer(recipient, amount);
    }

    function exitBuildingBlock(uint256 buildingBlockId) external payable {

    }
}

/// @notice Stub local defii with 1 token
contract Defii1 is LocalDefii, Supported1Token {
    constructor(
        address swapRouter,
        Lending lending,
        address notion
    )
        Supported1Token(address(lending.depositToken()))
        LocalDefii(
            swapRouter,
            notion,
            "Defii 1",
            ExecutionConstructorParams({
                logic: address(new DefiiLogic(lending)),
                incentiveVault: address(777),
                treasury: address(1337),
                fixedFee: 10,
                performanceFee: 50
            })
        )
    {}
}
