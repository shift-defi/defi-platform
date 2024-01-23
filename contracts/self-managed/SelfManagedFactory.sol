// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {ISelfManagedFactory} from "./ISelfManagedFactory.sol";
import {SelfManagedDefii} from "./SelfManagedDefii.sol";

contract SelfManagedFactory is ISelfManagedFactory, Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    address public operator;
    SelfManagedDefii public DEFII_TEMPLATE;
    EnumerableSet.AddressSet private _whitelistedTokens;

    event DefiiCreated(
        address indexed owner,
        address indexed logic,
        address defii
    );

    constructor(address swapRouter) Ownable(msg.sender) {
        DEFII_TEMPLATE = new SelfManagedDefii(swapRouter, address(this));
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

    function whitelistTokens(address[] memory tokens) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            _whitelistedTokens.add(tokens[i]);
        }
    }

    function blacklistTokens(address[] memory tokens) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            _whitelistedTokens.remove(tokens[i]);
        }
    }

    function isTokenWhitelisted(address token) external view returns (bool) {
        return _whitelistedTokens.contains(token);
    }

    function whitelistedTokens() external view returns (address[] memory wt) {
        wt = new address[](_whitelistedTokens.length());
        for (uint256 i = 0; i < wt.length; i++) {
            wt[i] = _whitelistedTokens.at(i);
        }
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
