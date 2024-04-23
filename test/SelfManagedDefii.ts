import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupPlatform } from "./scenarios/utils";


describe("SelfManagedDefii", function () {
    async function setupDefii() {
        const {
            operator,
            defii1,
            user,
            justAccount,
            incentiveVault,
            notion,
            notionBalance,
            deployer
        } = await setupPlatform()
        const factory = await ethers.deployContract(
            "SelfManagedFactory",
            [],
            deployer
        )
        await factory.connect(deployer).setOperator(operator.address)

        const logic = await defii1.LOGIC()

        await factory.createDefiiFor(user, logic, incentiveVault)
        const defii = await ethers.getContractAt(
            "SelfManagedDefii",
            await factory.getDefiiFor(user, logic)
        )

        await notion.connect(user).transfer(await defii.getAddress(), notionBalance);

        const tokens = await defii1.supportedTokens()
        const depositToken = await ethers.getContractAt("Token", tokens[0]);
        await depositToken.mint(await defii.getAddress(), 1000000);

        const minAmountsOut = 0

        return {
            defii,
            operator,
            justAccount,
            user,
            incentiveVault,
            minAmountsOut,
            notion,
            notionBalance
        }
    }

    context("Scenarios", function () {
        specify("Enter", async function () {
            const { user, operator, justAccount, defii, minAmountsOut } = await loadFixture(setupDefii)
            await expect(defii.connect(justAccount).enter(minAmountsOut)).to.be.reverted
            await expect(defii.connect(operator).enter(minAmountsOut)).to.be.reverted
            await expect(defii.connect(user).enter(minAmountsOut)).to.be.not.reverted
            expect(await defii.totalLiquidity()).to.be.gt(0n)
        })
        specify("Exit", async function () {
            const { user, operator, justAccount, defii, minAmountsOut } = await loadFixture(setupDefii)

            const minTokenDeltas = {
                tokens: [],
                deltas: []
            }

            await defii.connect(user).enter(minAmountsOut)

            await expect(defii.connect(justAccount).exit(0, minTokenDeltas)).to.be.reverted
            await expect(defii.connect(operator).exit(0, minTokenDeltas)).to.be.reverted
            await expect(defii.connect(user).exit(0, minTokenDeltas)).to.be.not.reverted
        })
        specify("Withdraw erc20", async function () {
            const { user, defii, notion, notionBalance } = await loadFixture(setupDefii)

            await expect(defii.connect(user).withdrawERC20(await notion.getAddress())).to.be.changeTokenBalance(
                notion,
                user.address,
                notionBalance
            )
        })

        specify("Withdraw eth", async function () {
            const { user, defii } = await loadFixture(setupDefii)

            const ethAmount = ethers.parseEther("0.1")
            await user.sendTransaction({ value: ethAmount, to: await defii.getAddress() })

            await expect(defii.connect(user).withdrawETH()).to.be.changeEtherBalance(
                user.address,
                ethAmount
            )
        })

        specify("Exit Building Block", async function() {
            const { user, operator, justAccount, defii, minAmountsOut } = await loadFixture(setupDefii)

            await defii.connect(user).enter(minAmountsOut)

            await expect(defii.connect(justAccount).exitBuildingBlock(0)).to.be.reverted
            await expect(defii.connect(operator).exitBuildingBlock(0)).to.be.not.reverted
            await expect(defii.connect(user).exitBuildingBlock(0)).to.be.not.reverted
        })

        specify("Run tx", async function () {
            const { user, justAccount, defii, notion } = await loadFixture(setupDefii)

            const allowance = 123
            const target = await notion.getAddress()
            const value = 0
            const data = notion.interface.encodeFunctionData("approve", [justAccount.address, allowance])

            await expect(defii.connect(justAccount).runTx(target, value, data)).to.be.reverted
            await expect(defii.connect(justAccount).runMultipleTx([target], [value], [data])).to.be.reverted

            await defii.connect(user).runMultipleTx([target], [value], [data])
            expect(await notion.allowance(await defii.getAddress(), justAccount.address)).to.be.eq(allowance)
        })
    })
})