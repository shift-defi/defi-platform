import { task, types } from "hardhat/config";
import { OperatorRegistry } from "../typechain-types";

const CMD = "deploy:OperatorRegistry"

task(CMD, "Deploy OperatorRegistry to chain")
    .addOptionalParam("nonce", "Deployer nonce", 0, types.int)
    .addFlag("verify", "Verify already deployed contract (nonce used for address calculation")
    .setAction(async (taskArgs, hre) => {

        const chainId = hre.network.config.chainId;
        if (chainId === undefined) {
            console.log(`Use --network with chainId`)
            return
        }

        const [deployer] = await hre.ethers.getSigners();

        let contract: OperatorRegistry
        if (!taskArgs.verify) {
            const [deployer] = await hre.ethers.getSigners();
            const nonce = await hre.ethers.provider.getTransactionCount(deployer.address);
            if (nonce !== taskArgs.nonce) {
                console.log(`Use deployer with nonce ${taskArgs.nonce}. Current nonce: ${nonce}`)
                return
            }
            contract = await hre.ethers.deployContract("OperatorRegistry")
            await contract.waitForDeployment()
        } else {
            contract = await hre.ethers.getContractAt(
                "OperatorRegistry",
                hre.ethers.getCreateAddress({ from: deployer.address, nonce: taskArgs.nonce })
            )
        }

        const address = await contract.getAddress()
        console.log(`OperatorRegistry: ${address}`)
        await hre.run("verify:verify", { address });
    })                                                                                                                                                                                                    