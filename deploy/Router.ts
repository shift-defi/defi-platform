import { task } from "hardhat/config";

task("deployRouter", "Deploy router")
    .setAction(async (taskArgs, hre) => {
        await hre.run("compile");

        const Router = await hre.ethers.getContractFactory("Router");
        const router = await Router.deploy();
        console.log(`Router deployed`)
        console.log(`Address ${await router.getAddress()}`)
        console.log("");

        console.log("Commands for verifications:");
        console.log(`npx hardhat --network ${hre.network.name} verify ${await router.getAddress()}`);
    });