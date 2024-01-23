/* solhint-disable */
// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {ExecutionSimulation} from "../../defii/execution/ExecutionSimulation.sol";
import {RemoteDefiiAgent} from "../../defii/RemoteDefiiAgent.sol";
import {RemoteDefiiPrincipal} from "../../defii/RemoteDefiiPrincipal.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {Supported0Tokens} from "../../defii/supported-tokens/Supported0Tokens.sol";
import {Supported2Tokens} from "../../defii/supported-tokens/Supported2Tokens.sol";
import {Logic} from "../../defii/execution/Logic.sol";

import {RemoteCallsStub} from "../misc/RemoteCallsStub.sol";
import {AMM} from "../protocols/AMM.sol";

/// @notice Stub remote defii with 2 tokens
/// @dev We need 2 contracts with same addresses, so Defii2 is smart router,
/// which tries to call both principal and agent
contract Defii2 {
    enum Chain {
        PRINCIPAL,
        AGENT
    }

    address public immutable principal;
    address public immutable agent;

    Chain currentChain;

    error CallFailed(bytes calldata_, bytes principalData, bytes agentData);

    constructor(address principal_, address agent_) {
        principal = principal_;
        agent = agent_;

        Defii2Principal(principal).setupFundsHolder();
        Defii2Agent(agent).setupFundsHolder();
    }

    function simulateExit(
        uint256 shares,
        address[] calldata tokens
    ) external returns (int256[] memory balanceChanges) {
        (, bytes memory result) = agent.delegatecall(
            abi.encodeWithSelector(
                ExecutionSimulation.simulateExitAndRevert.selector,
                shares,
                tokens
            )
        );
        balanceChanges = abi.decode(result, (int256[]));
    }

    function receiveTokenWithMessage(
        address token,
        uint256 amount,
        bytes calldata message
    ) external {
        address target;

        if (currentChain == Chain.PRINCIPAL) {
            target = agent;
        } else {
            target = principal;
        }

        (bool success, bytes memory data) = target.delegatecall(
            abi.encodeWithSelector(
                this.receiveTokenWithMessage.selector,
                token,
                amount,
                message
            )
        );
        if (!success) {
            assembly {
                revert(add(data, 32), mload(data))
            }
        }
    }

    fallback(bytes calldata calldata_) external payable returns (bytes memory) {
        bool success;
        bytes memory agentData;
        bytes memory principalData;

        currentChain = Chain.PRINCIPAL;
        (success, principalData) = principal.delegatecall(calldata_);
        if (success) return principalData;

        currentChain = Chain.AGENT;
        (success, agentData) = agent.delegatecall(calldata_);
        if (success) return agentData;

        bytes memory error_; // If we have resutl only for principal or for agent, we propagate error

        if (principalData.length > 0 && agentData.length == 0) {
            error_ = principalData;
        } else if (agentData.length > 0 && principalData.length == 0) {
            error_ = agentData;
        }

        if (error_.length > 0) {
            assembly {
                revert(add(error_, 32), mload(error_))
            }
        }

        revert CallFailed(calldata_, principalData, agentData);
    }
}

contract Defii2Principal is
    RemoteDefiiPrincipal,
    Supported2Tokens,
    RemoteCallsStub
{
    constructor(
        address swapRouter,
        address operatorRegistry,
        address notion,
        AMM amm
    )
        RemoteDefiiPrincipal(
            swapRouter,
            operatorRegistry,
            block.chainid,
            notion,
            "DEFII 2"
        )
        Supported2Tokens(address(amm.token0()), address(amm.token1()))
    {}

    function setupFundsHolder() external {
        Ownable(FUNDS_HOLDER).transferOwnership(msg.sender);
    }
}

contract DefiiLogic is Logic {
    AMM public immutable amm;

    constructor(AMM amm_) {
        amm = amm_;
    }

    function accountLiquidity(
        address account
    ) public view override returns (uint256) {
        return amm.lpToken().balanceOf(account);
    }

    function enter() external payable override {
        amm.token0().approve(address(amm), type(uint256).max);
        amm.token1().approve(address(amm), type(uint256).max);

        amm.deposit(
            amm.token0().balanceOf(address(this)),
            amm.token1().balanceOf(address(this))
        );
    }

    function claimRewards(address recipient) external payable override {
        amm.claimRewards();
        amm.incentiveToken().transfer(
            recipient,
            amm.incentiveToken().balanceOf(address(this))
        );
    }

    function exit(uint256 liquidity) external payable override {
        amm.withdraw(liquidity);
    }

    function withdrawLiquidity(
        address to,
        uint256 liquidity
    ) external payable override {
        amm.lpToken().transfer(to, liquidity);
    }
}

contract Defii2Agent is RemoteDefiiAgent, Supported2Tokens, RemoteCallsStub {
    constructor(
        address swapRouter,
        address operatorRegistry,
        AMM amm
    )
        Supported2Tokens(address(amm.token0()), address(amm.token1()))
        RemoteDefiiAgent(
            swapRouter,
            operatorRegistry,
            block.chainid,
            ExecutionConstructorParams({
                logic: address(new DefiiLogic(amm)),
                incentiveVault: address(777),
                treasury: address(1337),
                fixedFee: 10,
                performanceFee: 50
            })
        )
    {}

    function setupFundsHolder() external {
        Ownable(FUNDS_HOLDER).transferOwnership(msg.sender);
    }
}
