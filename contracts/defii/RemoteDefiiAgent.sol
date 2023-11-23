// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IDefii} from "../interfaces/IDefii.sol";
import {IRemoteDefiiAgent} from "../interfaces/IRemoteDefiiAgent.sol";
import {IRemoteDefiiPrincipal} from "../interfaces/IRemoteDefiiPrincipal.sol";
import {OperatorMixin} from "../OperatorMixin.sol";
import {ExecutionSimulation} from "./execution/ExecutionSimulation.sol";
import {RemoteInstructions} from "./instructions/RemoteInstructions.sol";
import {RemoteCalls} from "./remote-calls/RemoteCalls.sol";
import {SupportedTokens} from "./supported-tokens/SupportedTokens.sol";

abstract contract RemoteDefiiAgent is
    IRemoteDefiiAgent,
    RemoteInstructions,
    RemoteCalls,
    ExecutionSimulation,
    SupportedTokens,
    OperatorMixin
{
    using SafeERC20 for IERC20;

    uint256 internal _totalShares;
    mapping(address vault => mapping(uint256 positionId => uint256))
        public userShares;

    event RemoteEnter(address indexed vault, uint256 indexed postionId);
    event RemoteExit(address indexed vault, uint256 indexed postionId);

    constructor(
        address swapRouter_,
        uint256 remoteChainId_,
        ExecutionConstructorParams memory executionParams
    )
        RemoteInstructions(swapRouter_, remoteChainId_)
        ExecutionSimulation(executionParams)
    {
        fundsOwner[TREASURY][0] = TREASURY;
    }

    function remoteEnter(
        address vault,
        uint256 positionId,
        IDefii.Instruction[] calldata instructions
    ) external payable operatorCheckApproval(fundsOwner[vault][positionId]) {
        // instructions
        // [SWAP, SWAP, ..., SWAP, MIN_LIQUIDITY_DELTA, REMOTE_CALL]

        address[] memory tokens = supportedTokens();
        for (uint256 i = 0; i < tokens.length; i++) {
            _releaseToken(vault, positionId, tokens[i], 0);
        }

        uint256 nInstructions = instructions.length;
        for (uint256 i = 0; i < nInstructions - 2; i++) {
            IDefii.SwapInstruction memory instruction = _decodeSwap(
                instructions[i]
            );
            _checkToken(instruction.tokenOut);
            _doSwap(instruction);
        }

        uint256 shares = _enter(
            _decodeMinLiquidityDelta(instructions[nInstructions - 2])
        );
        _totalShares += shares;

        _startRemoteCall(
            abi.encodeWithSelector(
                IRemoteDefiiPrincipal.mintShares.selector,
                vault,
                positionId,
                shares
            ),
            _decodeRemoteCall(instructions[nInstructions - 1])
        );

        for (uint256 i = 0; i < tokens.length; i++) {
            _holdToken(vault, positionId, tokens[i], 0);
        }
        emit RemoteEnter(vault, positionId);
    }

    function remoteExit(
        address vault,
        uint256 positionId,
        uint256 shares,
        IDefii.Instruction[] calldata instructions
    ) external payable {
        address owner = fundsOwner[vault][positionId];
        _operatorCheckApproval(owner);

        _exit(shares);
        userShares[vault][positionId] -= shares;
        _totalShares -= shares;

        for (uint256 i = 0; i < instructions.length; i++) {
            if (instructions[i].type_ == IDefii.InstructionType.BRIDGE) {
                IDefii.BridgeInstruction
                    memory bridgeInstruction = _decodeBridge(instructions[i]);
                _checkToken(bridgeInstruction.token);
                _doBridge(vault, positionId, owner, bridgeInstruction);
            } else if (
                instructions[i].type_ == IDefii.InstructionType.SWAP_BRIDGE
            ) {
                IDefii.SwapBridgeInstruction
                    memory swapBridgeInstruction = _decodeSwapBridge(
                        instructions[i]
                    );
                _checkToken(swapBridgeInstruction.tokenOut);
                _doSwapBridge(vault, positionId, owner, swapBridgeInstruction);
            }
        }

        address[] memory tokens = supportedTokens();
        for (uint256 i = 0; i < tokens.length; i++) {
            _holdToken(vault, positionId, tokens[i], 0);
        }
        emit RemoteExit(vault, positionId);
    }

    function reinvest(IDefii.Instruction[] calldata instructions) external {
        // instructions
        // [SWAP, SWAP, ..., SWAP, MIN_LIQUIDITY_DELTA]

        uint256 nInstructions = instructions.length;
        for (uint256 i = 0; i < nInstructions - 1; i++) {
            IDefii.SwapInstruction memory instruction = _decodeSwap(
                instructions[i]
            );
            IERC20(instruction.tokenIn).safeTransferFrom(
                msg.sender,
                address(this),
                instruction.amountIn
            );
            _checkToken(instruction.tokenOut);
            _doSwap(instruction);
        }

        uint256 shares = _enter(
            _decodeMinLiquidityDelta(instructions[nInstructions - 1])
        );
        uint256 feeAmount = _calculatePerformanceFeeAmount(shares);

        userShares[TREASURY][0] += feeAmount;
        _totalShares += feeAmount;

        address[] memory tokens = supportedTokens();
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 tokenBalance = IERC20(tokens[i]).balanceOf(address(this));
            if (tokenBalance > 0) {
                IERC20(tokens[i]).transfer(msg.sender, tokenBalance);
            }
        }
    }

    function increaseUserShares(
        address vault,
        uint256 positionId,
        uint256 shares
    ) external remoteFn {
        userShares[vault][positionId] += shares;
    }

    function withdrawLiquidity(address to, uint256 shares) external remoteFn {
        uint256 liquidity = _toLiquidity(shares);
        _totalShares -= shares;

        _withdrawLiquidityLogic(to, liquidity);
    }

    function withdrawFundsAfterEmergencyExit(
        address vault,
        uint256 positionId
    ) external {
        uint256 shares = userShares[vault][positionId];
        uint256 totalShares_ = totalShares();
        userShares[vault][positionId] -= shares;

        _withdrawAfterEmergencyExit(
            fundsOwner[vault][positionId],
            shares,
            totalShares_,
            supportedTokens()
        );
    }

    // solhint-disable-next-line named-return-values
    function totalShares() public view override returns (uint256) {
        return _totalShares;
    }
}
