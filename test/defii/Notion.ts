import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("defii.Notion", function () {
    async function notionFixture() {
        const NOTION_ADDRESS = "0x0000000000000000000000000000000000000777"

        const Notion = await ethers.getContractFactory("MockNotion")
        const notion = await Notion.deploy(NOTION_ADDRESS)

        return { notion, NOTION_ADDRESS }
    }

    describe("Deployment", function () {
        it("Should set valid notion", async function () {
            const { notion, NOTION_ADDRESS } = await loadFixture(notionFixture);

            expect(await notion.notion()).to.equal(NOTION_ADDRESS);
        });
    });

    describe("Check notion", function () {
        it("Should pass check notion with notion address", async function () {
            const { notion, NOTION_ADDRESS } = await loadFixture(notionFixture);

            await expect(notion.checkNotion(NOTION_ADDRESS)).to.not.reverted;
        })

        it("Should revert check notion with other address", async function () {
            const { notion } = await loadFixture(notionFixture);

            await expect(notion.checkNotion(ethers.ZeroAddress)).to.revertedWithCustomError(notion, "NotANotion");
        })
    });
});
