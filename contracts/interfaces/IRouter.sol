// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

interface IRouter {
    error SwapFailed();
    error EqualTokens(address token);

    function deposit(
        address vault,
        address token,
        uint256 amount,
        uint256 operatorFee,
        bytes calldata swapCalldata
    ) external returns (uint256 positionId);

    function depositWithPermit(
        address vault,
        address token,
        uint256 amount,
        uint256 operatorFee,
        bytes calldata swapCalldata,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external returns (uint256 positionId);
}
