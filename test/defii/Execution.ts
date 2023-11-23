import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {address} from "hardhat/internal/core/config/config-validation";

describe('defii.Execution', function () {
    async function executionFixture() {
        const [incentiveVault, treasury] = await ethers.getSigners()
        const performanceFee = 200;

        const MockERC20 = await ethers.getContractFactory("MockERC20")

        const enterToken = await MockERC20.deploy()
        const rewardToken = await MockERC20.deploy()

        const MockExecution = await ethers.getContractFactory("MockExecution")
        const mockExecution = await MockExecution.deploy(
            enterToken,
            rewardToken,
            incentiveVault,
            treasury,
            performanceFee,
        );
        return {mockExecution, enterToken, rewardToken, incentiveVault, treasury, performanceFee}
    }

    describe("defii.Execution", function() {
        it("Should claim correctly", async function(){
            const { mockExecution, rewardToken, incentiveVault } = await loadFixture(executionFixture);
            await mockExecution.claimRewards();
            await expect(await rewardToken.balanceOf(await incentiveVault.getAddress())).to.be.gt(0); // reward claimed success
        })
    })
});