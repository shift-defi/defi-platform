import { ethers } from "hardhat"
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { setupPlatform, getSwapInstruction, getBridgeInstruction, getRemoteCallInstruction, getSwapBridgeInstruction } from "./utils"
import { depositToVault } from "./deposit";
import { enterDefii1, enterDefii2 } from "./enter";


describe("Exit", function () {
    it("Should exit from local defii", async function () {
        const { user, notion, vault, notionBalance, defii1, defii2, bridgeAdapter } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance)
        await enterDefii1(user, vault, defii1)
        await enterDefii2(user, vault, defii2, await bridgeAdapter.getAddress())
        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)

        // actions
        const tokens = await defii1.supportedTokens()
        const amountsOut = await defii1.simulateExit.staticCall(
            await vault.positionBalance(positionId, await defii1.getAddress()),
            [...tokens]
        )

        const notionVaultBalance = await vault.positionBalance(positionId, notion)

        await vault.connect(user).startExit(1e4)
        await vault.connect(user).exitDefii(
            await defii1.getAddress(),
            positionId,
            [
                {
                    type_: 5,
                    data: ethers.AbiCoder.defaultAbiCoder().encode(["(address[],uint256[])"], [[tokens, amountsOut]])
                },
                await getSwapInstruction(
                    tokens[0],
                    await notion.getAddress(),
                    amountsOut[0]
                )
            ])

        expect(await vault.positionBalance(positionId, notion)).to.be.gt(notionVaultBalance)
    })

    it("Should exit from remote defii", async function () {
        const { user, notion, vault, notionBalance, defii1, defii2, bridgeAdapter } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance)
        await enterDefii1(user, vault, defii1)
        await enterDefii2(user, vault, defii2, await bridgeAdapter.getAddress())
        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)

        const notionVaultBalance = await vault.positionBalance(positionId, notion)
        const sharesBalance = await vault.positionBalance(positionId, await defii2.getAddress())

        await vault.connect(user).startExit(1e4)
        await vault.connect(user).exitDefii(
            await defii2.getAddress(),
            positionId,
            [await getRemoteCallInstruction()])

        const defii2Agent = await ethers.getContractAt("Defii2Agent", await defii2.getAddress())
        const tokens = await defii2Agent.supportedTokens()
        const amountsOut = await defii2.simulateExit.staticCall(sharesBalance, [...await defii2Agent.supportedTokens()])

        const instructionsAgent = await Promise.all(
            tokens.map(async (token, idx) => await getBridgeInstruction(
                token,
                amountsOut[idx],
                await bridgeAdapter.getAddress()
            )))
        await defii2Agent.connect(user).startRemoteExit(
            await vault.getAddress(),
            positionId,
            user.address,
            [
                {
                    type_: 5,
                    data: ethers.AbiCoder.defaultAbiCoder().encode(["(address[],uint256[])"], [[tokens, amountsOut]])
                },
                ...instructionsAgent
            ]
        )

        const instructionsPrincipal = await Promise.all(
            tokens.map(async (token, idx) => await getSwapInstruction(
                token,
                await notion.getAddress(),
                amountsOut[idx],
            )))

        const defii2Principal = await ethers.getContractAt("Defii2Principal", await defii2.getAddress())

        await defii2Principal.connect(user).finishRemoteExit(
            await vault.getAddress(),
            positionId,
            user.address,
            instructionsPrincipal
        )

        expect(await vault.positionBalance(positionId, notion)).to.be.gt(notionVaultBalance)
    })

})