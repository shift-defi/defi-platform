// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {SupportedTokens} from "./SupportedTokens.sol";

contract Supported1Token is SupportedTokens {
    address private immutable T0;

    constructor(address t0) {
        T0 = t0;
    }

    function supportedTokens()
        public
        view
        override
        returns (address[] memory t)
    {
        t = new address[](1);
        t[0] = T0;
    }

    function _isTokenSupported(
        address token
    ) internal view override returns (bool isSupported) {
        return token == T0;
    }
}
