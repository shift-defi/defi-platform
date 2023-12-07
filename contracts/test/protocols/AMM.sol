/* solhint-disable */
// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {Token} from "../tokens/Token.sol";

contract AMM {
    Token public token0;
    Token public token1;
    Token public lpToken;
    Token public incentiveToken;

    constructor(Token token0_, Token token1_) {
        token0 = token0_;
        token1 = token1_;
        lpToken = new Token("", "");
        incentiveToken = new Token("", "");
    }

    function deposit(uint256 amount0, uint256 amount1) external {
        // We have ~AMM~ with 1/3 token0/token1 ratio, so
        if (3 * amount0 > amount1) {
            amount0 = amount1 / 3;
        }
        amount1 = amount0 * 3;

        token0.transferFrom(msg.sender, address(this), amount0);
        token0.burn(address(this), amount0);

        token1.transferFrom(msg.sender, address(this), amount1);
        token1.burn(address(this), amount1);

        lpToken.mint(msg.sender, amount0 * amount1);
    }

    function claimRewards() external {
        incentiveToken.mint(msg.sender, lpToken.balanceOf(msg.sender));
    }

    function withdraw(uint256 amount) external {
        lpToken.burn(msg.sender, amount);

        uint256 tokenAmount = (amount * 10100) / 1e4;
        token0.mint(msg.sender, tokenAmount);
        token1.mint(msg.sender, 3 * tokenAmount);
    }
}
