import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DefiiStatusLogic", function () {
    async function libFixture() {
        const DefiiStatusLogic = await ethers.getContractFactory("MockDefiiStatusLogic")
        const defiiStatusLogic = await DefiiStatusLogic.deploy()

        return { defiiStatusLogic }
    }

    function getStatusMask(statuses: Array<number>) {
        const binStatuses = statuses.map(status => status.toString(2).padStart(2, '0'))
        const binStatusMask = binStatuses.join("")
        const statusMask = parseInt(binStatusMask, 2)

        return BigInt(statusMask)
    }

    describe("Update and validate status mask", function () {
        it("todo", async function () {
            expect(false).to.be.true;
        })
    })

    describe("Logic", function () {
        it("should set status to mask", async function () {
            const { defiiStatusLogic } = await loadFixture(libFixture);

            const defiiIndex = 1
            const currentStatus = 1
            const newStatus = 2

            const statusMask = getStatusMask([currentStatus, 0]);
            const expectedStatusMask = getStatusMask([newStatus, 0])

            expect(
                await defiiStatusLogic.setStatus(statusMask, defiiIndex, newStatus)
            ).to.be.eq(expectedStatusMask)
        })

        it("should correct calculate is position processing", async function () {
            const { defiiStatusLogic } = await loadFixture(libFixture);

            const allDefiisEnteredMask = getStatusMask([2, 2, 2, 2])

            expect(await defiiStatusLogic.isPositionProcessing(
                getStatusMask([0, 1, 2, 1]), allDefiisEnteredMask
            )).to.be.true

            expect(await defiiStatusLogic.isPositionProcessing(
                getStatusMask([2, 3, 2, 2]), allDefiisEnteredMask
            )).to.be.true

            expect(await defiiStatusLogic.isPositionProcessing(
                getStatusMask([0, 0, 0, 0]), allDefiisEnteredMask
            )).to.be.false

            expect(await defiiStatusLogic.isPositionProcessing(
                getStatusMask([2, 2, 2, 2]), allDefiisEnteredMask
            )).to.be.false
        })

        it("should calculate all defiis entered mask", async function () {
            const { defiiStatusLogic } = await loadFixture(libFixture);
            expect(
                await defiiStatusLogic.calculateAllDefiisEnteredMask(4)
            ).to.be.eq(
                getStatusMask([2, 2, 2, 2])
            )
        })

        it("should get defii status from mask", async function name() {
            const { defiiStatusLogic } = await loadFixture(libFixture);

            const mask = getStatusMask([0, 1, 2, 3])

            expect(await defiiStatusLogic.defiiStatus(mask, 0)).to.be.eq(3)
            expect(await defiiStatusLogic.defiiStatus(mask, 1)).to.be.eq(2)
            expect(await defiiStatusLogic.defiiStatus(mask, 2)).to.be.eq(1)
            expect(await defiiStatusLogic.defiiStatus(mask, 3)).to.be.eq(0)
        })
    });
});
