// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

library OperatorLogic {
    struct Data {
        mapping(address user => mapping(address operator => bool isApproved)) approvals;
        mapping(address user => uint256 nonce) nonces;
    }

    string constant EIP191_PREFIX_FOR_EIP712_STRUCTURED_DATA = "\x19\x01";
    bytes32 constant OPERATOR_APPROVAL_SIGNATURE_HASH =
        keccak256(
            "OperatorSetApproval(address user,address operator,bool approval,uint256 nonce)"
        );
    bytes32 constant DOMAIN_SEPARATOR =
        keccak256(abi.encode(keccak256("EIP712Domain()")));

    event OperatorApprovalChanged(
        address indexed user,
        address indexed operator,
        bool approval
    );

    error InvalidSignature();
    error OperatorNotAuthorized(address user, address operator);

    function checkApprovalSignature(
        Data storage data,
        address user,
        address operator,
        bool approval,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {
        // solhint-disable-next-line func-named-parameters
        bytes32 digest = keccak256(
            abi.encodePacked(
                EIP191_PREFIX_FOR_EIP712_STRUCTURED_DATA,
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        OPERATOR_APPROVAL_SIGNATURE_HASH,
                        user,
                        operator,
                        approval,
                        data.nonces[user]++
                    )
                )
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        if (recoveredAddress != user) {
            revert InvalidSignature();
        }
    }

    function setApproval(
        Data storage data,
        address user,
        address operator,
        bool approval
    ) internal {
        data.approvals[user][operator] = approval;
        emit OperatorApprovalChanged(user, operator, approval);
    }

    function checkApproval(
        Data storage data,
        address user,
        address operator
    ) internal view {
        if (!data.approvals[user][operator]) {
            revert OperatorNotAuthorized(user, msg.sender);
        }
    }
}
