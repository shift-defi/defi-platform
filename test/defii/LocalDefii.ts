import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const MIN_LIQUIDITY_DELTA_INSTRUCTION = {
    type_: 4,
    data: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [0])
}

describe("defii.LocalDefii", function () {
    async function localDefiiFixture() {
        const [incentiveVault, treasury, user] = await ethers.getSigners();
        const performanceFee = 200;
        const fixedFee = 100;
        const amount = 1000e6;

        const OneInch = await ethers.getContractFactory("Mock1inch");
        const oneInch = await OneInch.deploy();

        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const erc20_1 = await MockERC20.deploy();
        const erc20_2 = await MockERC20.deploy();
        const notion = await MockERC20.deploy();

        const LocalDefii = await ethers.getContractFactory("MockDefii1Token");
        const localDefii = await LocalDefii.deploy(
            await oneInch.getAddress(),
            await notion.getAddress(),
            await incentiveVault.getAddress(),
            await treasury.getAddress(),
            fixedFee,
            performanceFee,
            await erc20_2.getAddress(),
        );

        await erc20_1.mint(await user.getAddress(), amount);
        return { erc20_1, erc20_2, oneInch, localDefii, user, treasury };
    }
    describe("defii.LocalDefii", function () {
        it("Should correct reinvest", async function () {
            const { erc20_1, erc20_2, oneInch, localDefii, user, treasury } = await loadFixture(localDefiiFixture);

            const erc20_1_address = await erc20_1.getAddress();
            const erc20_2_address = await erc20_2.getAddress();
            const local_defii_address = await localDefii.getAddress();

            const amountIn = 1e6;
            const amountOut = 1e5;

            const payload = await oneInch.generatePayload(local_defii_address, erc20_1_address, erc20_2_address, amountIn, amountOut);
            const encodedInstruction = ethers.AbiCoder.defaultAbiCoder().encode(
                ["tuple(address,address,uint256,uint256,bytes)"],
                [[erc20_1_address, erc20_2_address, amountIn, amountOut, payload]]
            )
            const reinvestParams = {
                type_: 0,
                data: encodedInstruction
            }

            await erc20_1.connect(user).approve(await localDefii.getAddress(), amountIn);
            const totalLiquidityBefore = await localDefii.totalLiquidity();
            const totalSharesBefore = await localDefii.totalShares();
            await localDefii.connect(user).reinvest([reinvestParams, MIN_LIQUIDITY_DELTA_INSTRUCTION]);
            const totalLiquidityAfter = await localDefii.totalLiquidity();
            const totalSharesAfter = await localDefii.totalShares();
            expect(totalLiquidityAfter - totalLiquidityBefore).to.be.gt(0);
            expect(await localDefii.balanceOf(await treasury.getAddress())).to.be.gt(0);
        })
    })
})