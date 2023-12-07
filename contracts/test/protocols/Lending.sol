/* solhint-disable */
// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {Token} from "../tokens/Token.sol";

contract Lending {
    Token public depositToken;
    Token public lpToken;
    Token public incentiveToken;

    constructor(Token depositToken_) {
        depositToken = depositToken_;
        lpToken = new Token("", "");
        incentiveToken = new Token("", "");
    }

    function deposit(uint256 amount) external {
        depositToken.transferFrom(msg.sender, address(this), amount);
        depositToken.burn(address(this), amount);

        lpToken.mint(msg.sender, amount);
    }

    function claimRewards() external {
        incentiveToken.mint(msg.sender, lpToken.balanceOf(msg.sender));
    }

    function withdraw(uint256 amount) external {
        lpToken.burn(msg.sender, amount);

        uint256 tokenAmount = (amount * 10100) / 1e4;
        depositToken.mint(msg.sender, tokenAmount);
    }
}
