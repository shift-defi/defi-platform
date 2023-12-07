/* solhint-disable */
// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BridgeAdapter} from "@shift-defi/adapters/contracts/bridge/BridgeAdapter.sol";
import {ITokenWithMessageReceiver} from "@shift-defi/adapters/contracts/bridge/ITokenWithMessageReceiver.sol";

import {Token} from "../tokens/Token.sol";

contract StubBridgeAdapter is BridgeAdapter {
    function estimateFee(
        Token calldata,
        Message calldata
    ) external view returns (uint256) {}

    function _startBridge(
        Token calldata token,
        Message calldata message,
        bytes32
    ) internal override {
        IERC20(token.address_).approve(msg.sender, token.amount);

        ITokenWithMessageReceiver(msg.sender).receiveTokenWithMessage(
            token.address_,
            token.amount,
            message.content
        );
    }
}
