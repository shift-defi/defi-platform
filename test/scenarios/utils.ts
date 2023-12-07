import { AddressLike } from "ethers";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

export async function setupPlatform() {
    const [user, operator, deployer, justAccount] = await ethers.getSigners()

    const notion = await ethers.deployContract("Token", ["NOTION", "NOTION"], deployer)
    const usdc = await ethers.deployContract("Token", ["USDC", "USDC"], deployer)
    const usdt = await ethers.deployContract("Token", ["USDT", "USDT"], deployer)
    const dai = await ethers.deployContract("Token", ["DAI", "DAI"], deployer)

    const swapRouter = await ethers.deployContract("StubSwapRouter", deployer)
    const operatorRegistry = await ethers.deployContract("OperatorRegistry", deployer)
    const bridgeAdapter = await ethers.deployContract("StubBridgeAdapter", deployer)

    await Promise.all([
        notion.waitForDeployment(),
        usdc.waitForDeployment(),
        usdt.waitForDeployment(),
        dai.waitForDeployment(),
        swapRouter.waitForDeployment(),
        operatorRegistry.waitForDeployment()
    ])

    // DEFII 1
    const lending = await ethers.deployContract("Lending", [await usdt.getAddress()], deployer)
    await lending.waitForDeployment()

    const defii1 = await ethers.deployContract("Defii1", [
        await swapRouter.getAddress(),
        await lending.getAddress(),
        await notion.getAddress(),
    ], deployer)
    const lpToken1 = await ethers.getContractAt("ERC20", await lending.lpToken())


    // DEFII 2
    const amm = await ethers.deployContract("AMM", [
        await usdc.getAddress(),
        await dai.getAddress()
    ], deployer)
    await amm.waitForDeployment()
    const defii2Principal = await ethers.deployContract("Defii2Principal", [
        await swapRouter.getAddress(),
        await operatorRegistry.getAddress(),
        await notion.getAddress(),
        await amm.getAddress()
    ], deployer)
    const defii2Agent = await ethers.deployContract("Defii2Agent", [
        await swapRouter.getAddress(),
        await operatorRegistry.getAddress(),
        await amm.getAddress()
    ], deployer)
    const defii2 = await ethers.deployContract("Defii2", [
        await defii2Principal.getAddress(),
        await defii2Agent.getAddress(),
    ], deployer)
    const lpToken2 = await ethers.getContractAt("ERC20", await amm.lpToken())

    const vault = await ethers.deployContract("Vault", [
        await operatorRegistry.getAddress(),
        [{ defii: await defii1.getAddress(), weight: 5e2 }, { defii: await defii2.getAddress(), weight: 5e2 },],
        "VAULT",
        "VAULT"
    ], deployer)


    const notionBalance = ethers.parseEther("1")
    await notion.mint(user.address, notionBalance)

    const incentiveVault = "0x0000000000000000000000000000000000000777"
    const treasury = "0x0000000000000000000000000000000000001337"

    return {
        notion,
        notionBalance,
        usdc,
        usdt,
        dai,
        vault,
        defii1,
        defii2,
        incentiveVault,
        treasury,
        user,
        operator,
        justAccount,
        bridgeAdapter,
        lpToken1,
        lpToken2,
        swapRouter,
        operatorRegistry
    }
}

export async function getSwapInstruction(tokenIn: AddressLike, tokenOut: AddressLike, amountIn: bigint) {
    const swap = await ethers.getContractAt("StubSwapRouter", ethers.ZeroAddress)

    return {
        type_: 0,
        data: ethers.AbiCoder.defaultAbiCoder().encode(
            ["(address,address,uint256,uint256,bytes)"],
            [
                [tokenIn,
                    tokenOut,
                    amountIn,
                    0,
                    swap.interface.encodeFunctionData("swap", [tokenIn, tokenOut, amountIn])
                ]
            ]
        )
    }
}

export async function getBridgeInstruction(
    token: AddressLike,
    amount: bigint,
    bridgeAdapter: AddressLike
) {
    return {
        type_: 1,
        data: ethers.AbiCoder.defaultAbiCoder().encode(
            ["(address,uint256,uint256,address,uint256,bytes)"],
            [
                [
                    token,
                    amount,
                    0,
                    bridgeAdapter,
                    0,
                    "0x"
                ]
            ]
        )
    }
}


export async function getSwapBridgeInstruction(
    tokenIn: AddressLike,
    tokenOut: AddressLike,
    amountIn: bigint,
    bridgeAdapter: AddressLike
) {
    const swap = await ethers.getContractAt("StubSwapRouter", ethers.ZeroAddress)

    return {
        type_: 2,
        data: ethers.AbiCoder.defaultAbiCoder().encode(
            ["(address,address,uint256,uint256,bytes,address,uint256,bytes,uint256)"],
            [
                [
                    tokenIn,
                    tokenOut,
                    amountIn,
                    0,
                    swap.interface.encodeFunctionData("swap", [tokenIn, tokenOut, amountIn]),
                    bridgeAdapter,
                    0,
                    "0x",
                    0
                ]
            ]
        )
    }
}

export async function getRemoteCallInstruction() {
    return {
        type_: 3,
        data: "0x"
    }
}



describe("SETUP", function () {
    it("_", async function () {
        const {
            notion,
            usdc,
            usdt,
            dai,
            vault,
            defii1,
            defii2,
            user,
            operator,
            swapRouter,
            bridgeAdapter
        } = await loadFixture(setupPlatform);

        console.log("====== Tokens ======")
        console.log("Notion: %s", await notion.getAddress())
        console.log("USDC: %s", await usdc.getAddress())
        console.log("USDT: %s", await usdt.getAddress())
        console.log("DAI: %s", await dai.getAddress())

        console.log("====== Platform ======")
        console.log("Vault: %s", await vault.getAddress())
        console.log("DEFII 1: %s", await defii1.getAddress())
        console.log("DEFII 2: %s", await defii2.getAddress())

        console.log("====== Defii 2 ======")
        const defii2Agent = await ethers.getContractAt("Defii2Agent", await defii2.agent())
        const defii2Principal = await ethers.getContractAt("Defii2Principal", await defii2.principal())

        console.log("Agent funds holder: %s", await defii2Agent.FUNDS_HOLDER())
        console.log("Principal funds holder: %s", await defii2Principal.FUNDS_HOLDER())

        console.log("====== Roles ======")
        console.log("User: %s", await user.getAddress())
        console.log("Operator: %s", await operator.getAddress())
        console.log("Swap router: %s", await swapRouter.getAddress())
        console.log("Bridge adapter: %s", await bridgeAdapter.getAddress())
    })
})