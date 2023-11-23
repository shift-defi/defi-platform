import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("defii.ExecutionSimulation", function () {
    async function exitSimulationFixutre() {
        const TOTAL_SHARES = 10000;

        const MockERC20 = await ethers.getContractFactory("MockERC20")

        const erc20_1 = await MockERC20.deploy()
        const erc20_2 = await MockERC20.deploy()

        const MockExecutionSimulation = await ethers.getContractFactory("MockExecutionSimulation")
        const mockExecutionSimulation = await MockExecutionSimulation.deploy(erc20_1)

        await mockExecutionSimulation.enter(TOTAL_SHARES);

        return { mockExecutionSimulation, erc20_1, erc20_2, TOTAL_SHARES }
    }

    describe("Exit simulation", function () {
        it("Should correct work without tokens", async function () {
            const { mockExecutionSimulation, TOTAL_SHARES } = await loadFixture(exitSimulationFixutre);

            expect(await mockExecutionSimulation.simulateExit.staticCall(TOTAL_SHARES, [])).to.be.deep.eq([])
        })

        it("Should correct work with defii tokens", async function () {
            const { mockExecutionSimulation, erc20_1, TOTAL_SHARES } = await loadFixture(exitSimulationFixutre);

            expect(
                await mockExecutionSimulation.simulateExit.staticCall(
                    TOTAL_SHARES,
                    [await erc20_1.getAddress()]
                )
            ).to.be.deep.eq([TOTAL_SHARES])
        })

        it("Should correct work with other tokens", async function () {
            const { mockExecutionSimulation, erc20_1, erc20_2, TOTAL_SHARES } = await loadFixture(exitSimulationFixutre);

            expect(
                await mockExecutionSimulation.simulateExit.staticCall(
                    TOTAL_SHARES,
                    [await erc20_1.getAddress(), await erc20_2.getAddress()]
                )
            ).to.be.deep.eq([TOTAL_SHARES, 0])
        })

        it("Shouldn't actually exit", async function () {
            const { mockExecutionSimulation, erc20_1, TOTAL_SHARES } = await loadFixture(exitSimulationFixutre);

            await expect(
                await mockExecutionSimulation.simulateExit(TOTAL_SHARES, [await erc20_1.getAddress()])
            ).to.changeTokenBalance(erc20_1, await mockExecutionSimulation.getAddress(), 0)
        })
    });
});
