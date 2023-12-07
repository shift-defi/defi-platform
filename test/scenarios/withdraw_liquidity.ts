import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { setupPlatform, getRemoteCallInstruction } from "./utils"
import { depositToVault } from "./deposit";
import { enterDefii1, enterDefii2 } from "./enter";


describe("Withdraw liquidity", function () {
    it("Should withdraw liquidity to owner", async function () {
        const {
            user,
            notion,
            vault,
            notionBalance,
            defii1,
            defii2,
            bridgeAdapter,
            lpToken1,
            lpToken2
        } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance)
        await enterDefii1(user, vault, defii1)
        await enterDefii2(user, vault, defii2, await bridgeAdapter.getAddress())

        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)

        await vault.connect(user).withdrawLiquidityFromDefii(positionId, await defii1.getAddress(), [])
        await vault.connect(user).withdrawLiquidityFromDefii(positionId, await defii2.getAddress(), [await getRemoteCallInstruction()])

        expect(await lpToken1.balanceOf(user.address)).to.be.gt(0)
        expect(await lpToken2.balanceOf(user.address)).to.be.gt(0)
    })
})
