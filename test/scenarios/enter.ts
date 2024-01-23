import { ethers } from "hardhat"
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Signer } from "ethers";

import { Vault, Defii1, Defii2 } from "../../typechain-types";
import { setupPlatform, getRemoteCallInstruction, getSwapBridgeInstruction, getSwapInstruction } from "./utils"
import { depositToVault } from "./deposit";
import { PayableOverrides } from "../../typechain-types/common";


export const enterDefii1 = async (
    user: Signer,
    vault: Vault,
    defii1: Defii1,
    params: PayableOverrides = {}
) => {
    const notion = await ethers.getContractAt("Token", await vault.NOTION())
    const positionId = await vault.tokenOfOwnerByIndex(await user.getAddress(), 0)

    const tokens1 = await defii1.supportedTokens()
    const instructions1 = await Promise.all(tokens1.map(async token => await getSwapInstruction(
        await notion.getAddress(),
        token,
        await vault.calculateEnterDefiiAmount(positionId, await defii1.getAddress())
    )))

    return await vault.connect(user).enterDefii(
        await defii1.getAddress(),
        positionId,
        [
            ...instructions1,
            {
                type_: 4,
                data: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [0])
            }
        ],
        params)
}

export const enterDefii2 = async (
    user: Signer,
    vault: Vault,
    defii2: Defii2,
    bridgeAdapterAddress: string,
    params: PayableOverrides = {}
) => {
    const notion = await ethers.getContractAt("Token", await vault.NOTION())
    const positionId = await vault.tokenOfOwnerByIndex(await user.getAddress(), 0)

    const tokens2 = await (await ethers.getContractAt("SupportedTokens", await defii2.getAddress())).supportedTokens()
    const instructions2 = await Promise.all(tokens2.map(async token => await getSwapBridgeInstruction(
        await notion.getAddress(),
        token,
        await vault.calculateEnterDefiiAmount(positionId, await defii2.getAddress()) / BigInt(tokens2.length),
        bridgeAdapterAddress
    )))

    await vault.connect(user).enterDefii(
        await defii2.getAddress(),
        positionId,
        instructions2,
        params
    )

    const defii2Agent = await ethers.getContractAt("Defii2Agent", await defii2.getAddress())
    await defii2Agent.remoteEnter(
        await vault.getAddress(),
        positionId,
        await user.getAddress(),
        [
            {
                type_: 4,
                data: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [0])
            },
            await getRemoteCallInstruction()
        ]
    )
}


describe("Enter", function () {
    it("Should enter local defii", async function () {
        const { user, notion, vault, notionBalance, defii1 } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance)
        await enterDefii1(user, vault, defii1)
        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)

        expect(await defii1.totalLiquidity()).to.be.gt(0)
        expect((await vault.getPositionStatus(positionId)).defiiStatuses).to.be.deep.eq([3n, 0n])
        expect(await vault.positionBalance(positionId, await defii1.getAddress())).to.be.gt(0)
    })

    it("Should enter remote defii", async function () {
        const { user, notion, vault, notionBalance, defii2, bridgeAdapter } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance)
        await enterDefii2(user, vault, defii2, await bridgeAdapter.getAddress())
        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)
        const defii2Agent = await ethers.getContractAt("Defii2Agent", await defii2.getAddress())

        expect(await defii2Agent.totalLiquidity()).to.be.gt(0)
        expect((await vault.getPositionStatus(positionId)).defiiStatuses).to.be.deep.eq([0n, 3n])
        expect(await vault.positionBalance(positionId, await defii2.getAddress())).to.be.gt(0)
    })

    it("Should correct enter with msg.value > 0", async function () {
        const { user, notion, vault, notionBalance, defii1 } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance)
        await enterDefii1(user, vault, defii1, { value: 1 })
        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)

        expect(await defii1.totalLiquidity()).to.be.gt(0)
        expect((await vault.getPositionStatus(positionId)).defiiStatuses).to.be.deep.eq([3n, 0n])
        expect(await vault.positionBalance(positionId, await defii1.getAddress())).to.be.gt(0)
    })
})