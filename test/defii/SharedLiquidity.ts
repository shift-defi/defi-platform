import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("defii.SharedLiquidity", function () {
    async function sharedLiquidityFixutre() {
        const MockSharedLiquidity = await ethers.getContractFactory("MockSharedLiquidity")
        const mockSharedLiquidity = await MockSharedLiquidity.deploy()
        return { mockSharedLiquidity }
    }

    describe("Shares -> Liquidity", function () {
        it("Should corecct calculate liquidity amount from given shares amount", async function () {
            const { mockSharedLiquidity } = await loadFixture(sharedLiquidityFixutre);

            // user have 10/100 shares (100%)
            // total liquidity - 120
            // should return 12
            await mockSharedLiquidity.setTotalShares(100)
            await mockSharedLiquidity.setTotalLiquidity(120)
            expect(await mockSharedLiquidity.toLiquidity(10)).to.be.eq(12)

            // user have 50/100 shares (50%)
            // total liquidity - 51
            // should return 25 (should throw fractional)
            await mockSharedLiquidity.setTotalShares(100)
            await mockSharedLiquidity.setTotalLiquidity(51)
            expect(await mockSharedLiquidity.toLiquidity(50)).to.be.eq(25)

            // user have 100/100 shares (100%)
            // total liquidity - 51
            // should return 51
            await mockSharedLiquidity.setTotalShares(100)
            await mockSharedLiquidity.setTotalLiquidity(51)
            expect(await mockSharedLiquidity.toLiquidity(100)).to.be.eq(51)
        })
    });

    describe("Liquidity -> Shares", function () {
        it("Should correct calculate shares from liquidity delta", async function () {
            const { mockSharedLiquidity } = await loadFixture(sharedLiquidityFixutre);

            // liquidity before - 100
            // liquidity after - 200
            // 100% gain
            await mockSharedLiquidity.setTotalShares(100)
            expect(await mockSharedLiquidity.sharesFromLiquidityDelta(100, 200)).to.be.eq(100)
        })

        it("Should correct calculate shares from liquidity delta, when shares is 0", async function () {
            const { mockSharedLiquidity } = await loadFixture(sharedLiquidityFixutre);

            // liquidity before - 100
            // liquidity after - 200
            // gain - liquidity delta
            await mockSharedLiquidity.setTotalShares(0)
            expect(await mockSharedLiquidity.sharesFromLiquidityDelta(100, 200)).to.be.eq(100)
        })
    });
});
