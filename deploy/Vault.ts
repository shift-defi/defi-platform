import * as fs from 'node:fs/promises';
import { task } from "hardhat/config";
import { generateVerifyCommand } from "./utils";

type VaultParams = {
    vaultName: string;
    vaultSymbol: string;
    defiiConfig: { defii: string, weight: number }[];
}

task("Vault:deploy", "Deploy Vault to chain")
    .addParam("paramsPath", "Vault deployment params (path to json)")
    .setAction(async (taskArgs, hre) => {
        const chainId = hre.network.config.chainId;
        if (chainId === undefined) {
            console.log(`Use --network with chainId`)
            return
        }

        const params = JSON.parse(await fs.readFile(taskArgs.paramsPath) as any) as VaultParams;

        console.log(`${params.vaultName} (${params.vaultSymbol})`)
        console.log("=======")

        console.log("Defiis:")
        await Promise.all(params.defiiConfig.map(async (defiiInfo) => {
            const defii = await hre.ethers.getContractAt("IERC20Metadata", defiiInfo.defii);
            console.log(`- ${await defii.name()}: ${defiiInfo.weight / 1e2}%`)
        }))
        console.log("=======")

        const defiiConfigHasDuplicates = params.defiiConfig.some((element, index) => {
            return params.defiiConfig.map(
                (defiiInfo) => defiiInfo.defii
            ).indexOf(element.defii) !== index
        });
        if (defiiConfigHasDuplicates) {
            console.warn("Defii list contains duplicates")
            return
        }

        const totalWeight = params.defiiConfig.reduce(
            (partialSum, defiiInfo) => partialSum + defiiInfo.weight,
            0
        );
        if (totalWeight != 1e4) {
            console.warn("Total defii weight should be 100%")
            return
        }

        const ContractFactory = await hre.ethers.getContractFactory("Vault");
        const contract = await ContractFactory.deploy(
            params.defiiConfig,
            params.vaultName,
            params.vaultSymbol,
            { gasPrice: (await hre.ethers.provider.getFeeData()).gasPrice }
        )
        const contractAddress = await contract.getAddress()
        console.log(`Vault deployed, address: ${contractAddress}`)

        await generateVerifyCommand(
            hre.network.name,
            contractAddress,
            [
                params.defiiConfig,
                params.vaultName,
                params.vaultSymbol
            ],
        )
    })