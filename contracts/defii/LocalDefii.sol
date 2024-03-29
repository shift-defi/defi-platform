// SPDX-License-Identifier: SHIFT-1.0
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IDefii} from "../interfaces/IDefii.sol";
import {IVault} from "../interfaces/IVault.sol";
import {ExecutionSimulation} from "./execution/ExecutionSimulation.sol";
import {Execution} from "./execution/Execution.sol";
import {LocalInstructions} from "./instructions/LocalInstructions.sol";
import {Notion} from "./supported-tokens/Notion.sol";
import {SupportedTokens} from "./supported-tokens/SupportedTokens.sol";

abstract contract LocalDefii is
    Notion,
    SupportedTokens,
    IDefii,
    ExecutionSimulation,
    LocalInstructions,
    ERC20
{
    using SafeERC20 for IERC20;

    constructor(
        address swapRouter_,
        address notion_,
        string memory name,
        ExecutionConstructorParams memory executionParams
    )
        LocalInstructions(swapRouter_)
        Notion(notion_)
        ERC20(name, "DLP")
        Execution(executionParams)
    {}

    /// @inheritdoc IDefii
    /// @dev Instructions must be array [SWAP, SWAP, ..., SWAP, MIN_LIQUIDITY_DELTA]
    function enter(
        uint256 amount,
        uint256 positionId,
        Instruction[] calldata instructions
    ) external payable {
        IERC20(NOTION).safeTransferFrom(msg.sender, address(this), amount);

        uint256 n = instructions.length;
        for (uint256 i = 0; i < n - 1; i++) {
            SwapInstruction memory instruction = _decodeSwap(instructions[i]);
            _checkNotion(instruction.tokenIn);
            _checkToken(instruction.tokenOut);
            _doSwap(instruction);
        }
        uint256 shares = _enter(_decodeMinLiquidityDelta(instructions[n - 1]));
        uint256 fee = _calculateFixedFeeAmount(shares);
        uint256 userShares = shares - fee;

        _mint(TREASURY, fee);
        _mint(msg.sender, userShares);

        address[] memory tokens = supportedTokens();
        for (uint256 i = 0; i < tokens.length; i++) {
            _returnAllFunds(msg.sender, positionId, tokens[i]);
        }
        _returnAllFunds(msg.sender, positionId, NOTION);
        IVault(msg.sender).enterCallback(positionId, userShares);
    }

    /// @inheritdoc IDefii
    /// @dev Instructions must be array [MIN_TOKENS_DELTA, SWAP, SWAP, ..., SWAP]
    function exit(
        uint256 shares,
        uint256 positionId,
        Instruction[] calldata instructions
    ) external payable {
        IDefii.MinTokensDeltaInstruction
            memory minTokensDelta = _decodeMinTokensDelta(instructions[0]);
        _exit(shares, minTokensDelta.tokens, minTokensDelta.deltas);
        _burn(msg.sender, shares);

        for (uint256 i = 1; i < instructions.length; i++) {
            SwapInstruction memory instruction = _decodeSwap(instructions[i]);
            _checkToken(instruction.tokenIn);
            _checkNotion(instruction.tokenOut);
            _doSwap(instruction);
        }

        address[] memory tokens = supportedTokens();
        for (uint256 i = 0; i < tokens.length; i++) {
            _returnAllFunds(msg.sender, positionId, tokens[i]);
        }
        _returnAllFunds(msg.sender, positionId, NOTION);

        IVault(msg.sender).exitCallback(positionId);
    }

    /// @dev Instructions must be array [SWAP, SWAP, ..., SWAP, MIN_LIQUIDITY_DELTA]
    function reinvest(Instruction[] calldata instructions) external {
        uint256 n = instructions.length;
        for (uint256 i = 0; i < n - 1; i++) {
            SwapInstruction memory instruction = _decodeSwap(instructions[i]);
            IERC20(instruction.tokenIn).safeTransferFrom(
                msg.sender,
                address(this),
                instruction.amountIn
            );
            _checkNotion(instruction.tokenIn);
            _checkToken(instruction.tokenOut);
            _doSwap(instruction);
        }
        uint256 shares = _enter(_decodeMinLiquidityDelta(instructions[n - 1]));

        uint256 feeAmount = _calculatePerformanceFeeAmount(shares);
        _mint(TREASURY, feeAmount);

        address[] memory tokens = supportedTokens();
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 tokenBalance = IERC20(tokens[i]).balanceOf(address(this));
            if (tokenBalance > 0) {
                IERC20(tokens[i]).safeTransfer(msg.sender, tokenBalance);
            }
        }
    }

    /// @inheritdoc IDefii
    /// @dev Instructions must be empty array
    function withdrawLiquidity(
        address recipient,
        uint256 shares,
        Instruction[] calldata
    ) external payable {
        uint256 liquidity = _toLiquidity(shares);
        _burn(msg.sender, shares);
        _withdrawLiquidity(recipient, liquidity);
    }

    function withdrawFundsAfterEmergencyExit(address recipient) external {
        uint256 shares = balanceOf(msg.sender);
        uint256 totalShares_ = totalShares();
        _burn(msg.sender, shares);

        _withdrawAfterEmergencyExit(
            recipient,
            shares,
            totalShares_,
            supportedTokens()
        );
    }

    /// @inheritdoc IDefii
    // solhint-disable-next-line named-return-values
    function notion() external view returns (address) {
        return NOTION;
    }

    /// @inheritdoc IDefii
    // solhint-disable-next-line named-return-values
    function defiiType() external pure returns (Type) {
        return Type.LOCAL;
    }

    // solhint-disable-next-line named-return-values
    function totalShares() public view override returns (uint256) {
        return totalSupply();
    }
}
