import * as fs from 'node:fs/promises';


export const generateVerifyCommand = async (
    networkName: string,
    contractAddress: string,
    constructorArgs: any[] = []
) => {
    if (constructorArgs.length > 0) {
        const constructorArgsFilepath = `deployments/constructor-args/${networkName}.${contractAddress}.js`
        await fs.writeFile(
            constructorArgsFilepath,
            `module.exports = ${JSON.stringify(constructorArgs, null, 2)}`
        )
        console.log(`npx hardhat --network ${networkName} verify --constructor-args ${constructorArgsFilepath} ${contractAddress}`)
    } else {
        console.log(`npx hardhat --network ${networkName} verify ${contractAddress}`)
    }
}