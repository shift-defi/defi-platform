/* solhint-disable */
// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {ITokenWithMessageReceiver} from "@shift-defi/adapters/contracts/bridge/ITokenWithMessageReceiver.sol";
import {Token} from "../tokens/Token.sol";

contract StubSwapRouter {
    function swap(Token tokenIn, Token tokenOut, uint256 amountIn) external {
        tokenIn.burn(msg.sender, amountIn);
        tokenOut.mint(msg.sender, (amountIn * 990) / 1000);
    }
}
