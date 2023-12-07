import { ethers } from "hardhat"
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Signer } from "ethers";

import { Token, Vault } from "../../typechain-types";
import { setupPlatform } from "./utils"


export const depositToVault = async (
    user: Signer,
    notion: Token,
    vault: Vault,
    depositAmount: bigint,
    operatorFee: bigint = BigInt(0)) => {
    await notion.connect(user).approve(await vault.getAddress(), depositAmount)
    return await vault.connect(user).deposit(await notion.getAddress(), depositAmount, operatorFee)
}



describe("Deposit", function () {
    it("Should deposit notion", async function () {
        const { user, notion, vault, notionBalance } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance)
        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)

        // checks
        expect(await vault.balanceOf(user.address)).to.be.eq(1, "Should have NFT after deposit")
        expect(await vault.positionBalance(positionId, await notion.getAddress())).to.be.eq(notionBalance)
    });

    it("Should deposit notion with minted position", async function () {
        const { user, notion, vault, notionBalance } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance / BigInt(2))
        await depositToVault(user, notion, vault, notionBalance / BigInt(2))

        // checks
        expect(await vault.balanceOf(user.address)).to.be.eq(1, "Shouldn't mint new position if already exists")
    });

    it("Should deposit notion with operator fee", async function () {
        const OPERATOR_FEE = BigInt(1111)
        const OPERATOR_POSITION_ID = 0

        const { user, notion, vault, notionBalance } = await loadFixture(setupPlatform);
        await depositToVault(user, notion, vault, notionBalance, OPERATOR_FEE)
        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)

        // checks
        expect(await vault.positionBalance(OPERATOR_POSITION_ID, await notion.getAddress())).to.be.eq(OPERATOR_FEE)
        expect(await vault.positionBalance(positionId, await notion.getAddress())).to.be.eq(notionBalance - OPERATOR_FEE)
    });

    it("Should deposit with permit", async function () {
        //preparation
        const { user, notion, vault, notionBalance } = await loadFixture(setupPlatform);
        const DEADLINE = Math.ceil(+new Date() / 1000) + 1 * 60 * 60

        // actions
        const domainData = await notion.eip712Domain()
        const permitSignature = ethers.Signature.from(await user.signTypedData(
            {
                name: domainData.name,
                version: domainData.version,
                chainId: domainData.chainId,
                verifyingContract: await notion.getAddress()
            },
            {
                Permit: [
                    {
                        name: 'owner',
                        type: 'address'
                    },
                    {
                        name: 'spender',
                        type: 'address'
                    },
                    {
                        name: 'value',
                        type: 'uint256'
                    },
                    {
                        name: 'nonce',
                        type: 'uint256'
                    },
                    {
                        name: 'deadline',
                        type: 'uint256'
                    }
                ]
            },
            {
                owner: user.address,
                spender: await vault.getAddress(),
                value: notionBalance,
                nonce: await notion.nonces(user),
                deadline: DEADLINE
            }
        ))
        await vault.connect(user).depositWithPermit(
            await notion.getAddress(),
            notionBalance,
            0,
            DEADLINE,
            permitSignature.v,
            permitSignature.r,
            permitSignature.s
        )

        // checks
        expect(await vault.balanceOf(user.address)).to.be.eq(1, "Should have NFT after deposit")

        const positionId = await vault.tokenOfOwnerByIndex(user.address, 0)
        expect(await vault.positionBalance(positionId, await notion.getAddress())).to.be.eq(notionBalance)

    });
});