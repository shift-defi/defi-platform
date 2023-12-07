// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {IVault} from "./interfaces/IVault.sol";
import {IRouter} from "./interfaces/IRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract Router is IRouter, ERC721Holder {
    using SafeERC20 for IERC20;

    function deposit(
        address vault,
        address token,
        uint256 amount,
        uint256 operatorFee,
        address swapRouter,
        bytes calldata swapCalldata
    ) public returns (uint256 positionId) {
        address notion = IVault(vault).NOTION();
        if (token == notion) {
            revert EqualTokens(token);
        }
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        IERC20(token).forceApprove(swapRouter, amount);
        (bool success, ) = swapRouter.call(swapCalldata);
        if (!success) {
            revert SwapFailed();
        }

        uint256 notionBalance = IERC20(notion).balanceOf(address(this));
        IERC20(notion).forceApprove(vault, notionBalance);

        if (IVault(vault).balanceOf(msg.sender) > 0) {
            positionId = IVault(vault).tokenOfOwnerByIndex(msg.sender, 0);
            IVault(vault).depositToPosition(
                positionId,
                notion,
                notionBalance,
                operatorFee
            );
        } else {
            positionId = IVault(vault).deposit(
                notion,
                notionBalance,
                operatorFee
            );
            IVault(vault).safeTransferFrom(
                address(this),
                msg.sender,
                positionId
            );
        }
    }

    function depositWithPermit(
        address vault,
        address token,
        uint256 amount,
        uint256 operatorFee,
        address swapRouter,
        bytes calldata swapCalldata,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) public returns (uint256 positionId) {
        IERC20Permit(token).permit({
            owner: msg.sender,
            spender: address(this),
            value: amount,
            deadline: deadline,
            v: permitV,
            r: permitR,
            s: permitS
        });
        positionId = deposit(
            vault,
            token,
            amount,
            operatorFee,
            swapRouter,
            swapCalldata
        );
    }
}
