// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {Logic} from "../defii/execution/Logic.sol";
import {IDefii} from "../interfaces/IDefii.sol";

abstract contract SelfManagedLogic is Logic {
    error WrongBuildingBlockId(uint256);

    function enterWithParams(bytes memory params) external payable virtual {
        revert NotImplemented();
    }

    function emergencyExitPrivate() external payable virtual {
        revert NotImplemented();
    }

    function exitBuildingBlock(
        uint256 buildingBlockId
    ) external payable virtual;
}
