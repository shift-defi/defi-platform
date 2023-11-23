// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {SupportedTokens} from "./SupportedTokens.sol";

contract Supported0Tokens is SupportedTokens {
    function supportedTokens()
        public
        view
        override
        returns (address[] memory t)
    {
        t = new address[](0);
    }

    function _isTokenSupported(
        address
    ) internal view override returns (bool isSupported) {
        return false;
    }
}
