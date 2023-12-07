// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {RemoteCalls} from "../../defii/remote-calls/RemoteCalls.sol";

contract RemoteCallsStub is RemoteCalls {
    function remoteCallType() external pure override returns (RemoteCallsType) {
        return RemoteCallsType.LZ; // wrong remote type
    }

    function _remoteCall(
        bytes memory calldata_,
        bytes calldata
    ) internal override {
        _finishRemoteCall(calldata_);
    }
}
