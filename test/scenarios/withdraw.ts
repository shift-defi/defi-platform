import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { setupPlatform } from "./utils"
import { depositToVault } from "./deposit";


describe("Withdraw", function () {
    it("Should withdraw token to position owner", async function () {
        const { user, notion, vault, notionBalance } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance)
        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)

        await expect(vault.connect(user).withdraw(notion, notionBalance, positionId)).to.be.changeTokenBalance(notion, user.address, notionBalance)
    })

    it("Should reverts if called not by position owner or operator", async function () {
        const { user, notion, vault, notionBalance, operatorRegistry, operator, justAccount } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance)
        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)

        await operatorRegistry.connect(user).approveOperator(
            operator.address,
            await operatorRegistry.ALL()
        )

        await expect(vault.connect(user).withdraw(notion, 1, positionId)).not.to.be.reverted
        await expect(vault.connect(operator).withdraw(notion, 1, positionId)).not.to.be.reverted
        await expect(vault.connect(justAccount).withdraw(notion, 1, positionId)).to.be.reverted
    })

    it("Should reverts if withdraw more than there is", async function () {
        const { user, notion, vault, notionBalance } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance)
        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)

        await expect(vault.withdraw(notion, notionBalance + BigInt(1), positionId)).to.be.reverted
    })
})