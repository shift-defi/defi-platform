// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

interface ISelfManagedFactory {
    function operator() external returns (address);
}
