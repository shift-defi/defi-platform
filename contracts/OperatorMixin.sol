// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {OperatorLogic} from "./libraries/OperatorLogic.sol";

contract OperatorMixin {
    // TODO: rewrite to one contract for all other contracts

    using OperatorLogic for OperatorLogic.Data;

    OperatorLogic.Data private operatorData;

    modifier operatorCheckApproval(address user) {
        _operatorCheckApproval(user);
        _;
    }

    function operatorSetApproval(address operator, bool approval) external {
        operatorData.setApproval(msg.sender, operator, approval);
    }

    function operatorSetApprovalWithPermit(
        address user,
        address operator,
        bool approval,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // solhint-disable-next-line func-named-parameters
        operatorData.checkApprovalSignature(user, operator, approval, v, r, s);
        operatorData.setApproval(msg.sender, operator, approval);
    }

    function _operatorCheckApproval(address user) internal view {
        if (user != msg.sender) {
            operatorData.checkApproval(user, msg.sender);
        }
    }
}
