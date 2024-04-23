// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {ISelfManagedFactory} from "./ISelfManagedFactory.sol";
import {SelfManagedDefii} from "./SelfManagedDefii.sol";

contract SelfManagedFactory is ISelfManagedFactory, Ownable {
    address public operator;
    SelfManagedDefii public DEFII_TEMPLATE;

    event DefiiCreated(
        address indexed owner,
        address indexed logic,
        address defii
    );

    constructor() Ownable(msg.sender) {
        DEFII_TEMPLATE = new SelfManagedDefii(address(this));
    }

    function createDefiiFor(
        address owner,
        address logic,
        address incentiveVault
    ) external {
        address defii = Clones.cloneDeterministic(
            address(DEFII_TEMPLATE),
            keccak256(abi.encodePacked(owner, logic))
        );

        SelfManagedDefii(payable(defii)).init(logic, owner, incentiveVault);
        emit DefiiCreated(owner, logic, defii);
    }

    function setOperator(address operator_) external onlyOwner {
        operator = operator_;
    }

    function getDefiiFor(
        address owner,
        address logic
    ) external view returns (address defiiAddress) {
        defiiAddress = Clones.predictDeterministicAddress(
            address(DEFII_TEMPLATE),
            keccak256(abi.encodePacked(owner, logic))
        );
        if (defiiAddress.code.length == 0) defiiAddress = address(0);
    }
}
