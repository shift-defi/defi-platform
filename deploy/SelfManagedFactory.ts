import { task } from "hardhat/config";

task("deploy:self-managed-factory", "Deploy self managed factory")
    .setAction(async (taskArgs, hre) => {
        await hre.run("compile");
        const [deployer] = await hre.ethers.getSigners();
        const nonce = await hre.ethers.provider.getTransactionCount(await deployer.getAddress());
        console.log(`Deploing from: ${deployer.address}; nonce: ${nonce}`);

        const factory = await hre.ethers.deployContract(
            "SelfManagedFactory", [], {signer: deployer, nonce}
        )
        await factory.waitForDeployment()
        console.log(await factory.getAddress())
        console.log(`npx hardhat --network ${hre.network.name} verify ${await factory.getAddress()}`);
        console.log(`npx hardhat --network ${hre.network.name} verify ${await factory.DEFII_TEMPLATE()} ${await factory.getAddress()}`);
    });