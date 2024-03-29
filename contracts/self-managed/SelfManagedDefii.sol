// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Metadata, IERC20} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {Logic} from "../defii/execution/Logic.sol";
import {Execution} from "../defii/execution/Execution.sol";
import {SupportedTokens} from "../defii/supported-tokens/SupportedTokens.sol";
import {LocalInstructions} from "../defii/instructions/LocalInstructions.sol";
import {IDefii} from "../interfaces/IDefii.sol";
import {ISelfManagedFactory} from "./ISelfManagedFactory.sol";

contract SelfManagedDefii is LocalInstructions, Ownable {
    using Address for address;
    using Address for address payable;
    using SafeERC20 for IERC20;

    // immutable like
    ISelfManagedFactory public immutable FACTORY;
    address public LOGIC;

    address public incentiveVault;

    modifier onlyOwnerOrOperator() {
        if (msg.sender != owner() && msg.sender != FACTORY.operator())
            revert Ownable.OwnableUnauthorizedAccount(msg.sender);
        _;
    }

    constructor(
        address swapRouter,
        address factory
    ) LocalInstructions(swapRouter) Ownable(factory) {
        FACTORY = ISelfManagedFactory(factory);
    }

    receive() external payable {}

    function init(
        address logic,
        address owner,
        address incentiveVault_
    ) external {
        require(LOGIC == address(0));
        LOGIC = logic;

        incentiveVault = incentiveVault_;
        _transferOwnership(owner);
    }

    function enter(
        IDefii.Instruction[] calldata instructions
    ) external onlyOwner {
        uint256 n = instructions.length;
        for (uint256 i = 0; i < n - 1; i++) {
            IDefii.SwapInstruction memory instruction = _decodeSwap(
                instructions[i]
            );
            if (!FACTORY.isTokenWhitelisted(instruction.tokenIn))
                revert SupportedTokens.TokenNotSupported(instruction.tokenIn);
            if (!FACTORY.isTokenWhitelisted(instruction.tokenOut))
                revert SupportedTokens.TokenNotSupported(instruction.tokenOut);
            _doSwap(instruction);
        }

        uint256 minLiquidityDelta = _decodeMinLiquidityDelta(
            instructions[n - 1]
        );
        uint256 liquidityBefore = totalLiquidity();
        LOGIC.functionDelegateCall(abi.encodeCall(Logic.enter, ()));
        uint256 liquidityAfter = totalLiquidity();

        if (
            liquidityBefore > liquidityAfter ||
            (liquidityAfter - liquidityBefore) < minLiquidityDelta
        ) {
            revert Execution.EnterFailed();
        }
    }

    function exit(
        uint256 liquidity,
        IDefii.MinTokensDeltaInstruction memory minTokensDelta
    ) external onlyOwner {
        if (liquidity == 0) liquidity = totalLiquidity();

        uint256 n = minTokensDelta.tokens.length;
        for (uint256 i = 0; i < n; i++) {
            minTokensDelta.deltas[i] += IERC20(minTokensDelta.tokens[i])
                .balanceOf(address(this));
        }

        LOGIC.functionDelegateCall(abi.encodeCall(Logic.exit, (liquidity)));

        for (uint256 i = 0; i < n; i++) {
            if (
                IERC20(minTokensDelta.tokens[i]).balanceOf(address(this)) <
                minTokensDelta.deltas[i]
            ) {
                revert Execution.ExitFailed();
            }
        }
    }

    function claimRewards() external onlyOwnerOrOperator {
        LOGIC.functionDelegateCall(
            abi.encodeCall(Logic.claimRewards, (incentiveVault))
        );
    }

    function emergencyExit() external onlyOwnerOrOperator {
        LOGIC.functionDelegateCall(
            abi.encodeCall(Logic.emergencyExit, ())
        );
    }

    function withdrawLiquidity(address account, uint256 amount) external onlyOwner {
        LOGIC.functionDelegateCall(
            abi.encodeCall(Logic.withdrawLiquidity, (account, amount))
        );
    }

    function withdrawERC20(IERC20 token) external onlyOwnerOrOperator {
        uint256 tokenAmount = token.balanceOf(address(this));
        if (tokenAmount > 0) {
            token.safeTransfer(owner(), tokenAmount);
        }
    }

    function withdrawETH() external onlyOwnerOrOperator {
        payable(owner()).sendValue(address(this).balance);
    }

    function changeIncentiveVault(address incentiveVault_) external onlyOwner {
        incentiveVault = incentiveVault_;
    }

    function runMultipleTx(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external {
        // we don't need onlyOwner modifier, owner checks in runTx
        require(targets.length == datas.length);
        require(targets.length == values.length);

        for (uint256 i = 0; i < targets.length; i++) {
            runTx(targets[i], values[i], datas[i]);
        }
    }

    function simulateExit(
        address[] calldata tokens
    ) external returns (int256[] memory balanceChanges) {
        try this.simulateExitAndRevert(tokens) {} catch (bytes memory result) {
            balanceChanges = abi.decode(result, (int256[]));
        }
    }

    function simulateExitAndRevert(address[] calldata tokens) external {
        int256[] memory balanceChanges = new int256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            balanceChanges[i] = int256(
                IERC20(tokens[i]).balanceOf(address(this))
            );
        }

        LOGIC.functionDelegateCall(
            abi.encodeCall(Logic.exit, (totalLiquidity()))
        );

        for (uint256 i = 0; i < tokens.length; i++) {
            balanceChanges[i] =
                int256(IERC20(tokens[i]).balanceOf(address(this))) -
                balanceChanges[i];
        }

        bytes memory returnData = abi.encode(balanceChanges);
        uint256 returnDataLength = returnData.length;

        assembly {
            revert(add(returnData, 0x20), returnDataLength)
        }
    }

    function simulateClaimRewards(
        address[] calldata rewardTokens
    ) external returns (int256[] memory balanceChanges) {
        try this.simulateClaimRewardsAndRevert(rewardTokens) {} catch (
            bytes memory result
        ) {
            balanceChanges = abi.decode(result, (int256[]));
        }
    }

    function simulateClaimRewardsAndRevert(
        address[] calldata rewardTokens
    ) external {
        int256[] memory balanceChanges = new int256[](rewardTokens.length);
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            balanceChanges[i] = int256(
                IERC20(rewardTokens[i]).balanceOf(incentiveVault)
            );
        }

        LOGIC.functionDelegateCall(
            abi.encodeCall(Logic.claimRewards, (incentiveVault))
        );

        for (uint256 i = 0; i < rewardTokens.length; i++) {
            balanceChanges[i] =
                int256(IERC20(rewardTokens[i]).balanceOf(incentiveVault)) -
                balanceChanges[i];
        }

        bytes memory returnData = abi.encode(balanceChanges);
        uint256 returnDataLength = returnData.length;
        assembly {
            revert(add(returnData, 0x20), returnDataLength)
        }
    }

    function runTx(
        address target,
        uint256 value,
        bytes memory data
    ) public onlyOwner {
        target.functionCallWithValue(data, value);
    }

    function totalLiquidity() public view returns (uint256) {
        return Logic(LOGIC).accountLiquidity(address(this));
    }
}
