import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupPlatform } from "./scenarios/utils";


describe("SelfManagedFactory", function () {
    context("DEFII creation", function () {
        it("Should correct create defii", async function () {
            const { user, swapRouter, defii1, incentiveVault } = await loadFixture(setupPlatform)
            const factory = await ethers.deployContract(
                "SelfManagedFactory",
            )
            const logic = await defii1.LOGIC()

            expect(await factory.getDefiiFor(user, logic)).to.be.eq(ethers.ZeroAddress)

            await factory.createDefiiFor(user, logic, incentiveVault)
            const defii = await ethers.getContractAt(
                "SelfManagedDefii",
                await factory.getDefiiFor(user, logic)
            )

            expect(await defii.FACTORY()).to.be.eq(await factory.getAddress(), 'factory')
            expect(await defii.LOGIC()).to.be.eq(logic, 'logic')
            expect(await defii.owner()).to.be.eq(user.address, 'owner')
            expect(await defii.incentiveVault()).to.be.eq(incentiveVault, 'incentive vault')
        })

        it("Should revert, if defii already exists", async function () {
            const { user, defii1, incentiveVault } = await loadFixture(setupPlatform)
            const factory = await ethers.deployContract(
                "SelfManagedFactory",
            )
            const logic = await defii1.LOGIC()

            await factory.createDefiiFor(user, logic, incentiveVault);
            await expect(factory.createDefiiFor(user, logic, incentiveVault)).to.be.reverted;
        })
    })

    context("Config", function () {
        it("Should change operator", async function () {
            const [user, deployer, operator] = await ethers.getSigners()
            const factory = await ethers.deployContract(
                "SelfManagedFactory",
                deployer
            )

            expect(await factory.operator()).to.be.eq(ethers.ZeroAddress)

            await expect(factory.connect(user).setOperator(operator.address)).to.be.reverted
            await expect(factory.connect(deployer).setOperator(operator.address)).to.be.not.reverted
            expect(await factory.operator()).to.be.eq(operator.address)
        })

    })
})