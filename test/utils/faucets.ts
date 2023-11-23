import { ethers } from "hardhat"
import { setBalance } from "@nomicfoundation/hardhat-network-helpers";

export const getUsdt = async (chainId: Number, to: string, amount: bigint) => {
    if (chainId == 43114) return await getAvalancheUsdt(to, amount);
    throw Error("Unsupported network");
}

export const getUsdc = async (chainId: number, to: string, amount: bigint = BigInt(100e6)) => {
    if (chainId === 1) return await getEthereumUsdc(to, amount);
    if (chainId === 42161) return await getArbitrumOneUsdc(to, amount);
    if (chainId === 43114) return await getAvalancheUsdc(to, amount);
    throw Error("Unsupported network");
}

const getAvalancheUsdt = async (to: string, amount: bigint = BigInt(100e6)) => {
    const [signer] = await ethers.getSigners();
    const avaxForOwner = "1000";
    const usdtOwner = await ethers.getImpersonatedSigner("0xd83d5c96bfb9e5f890e8be48165b13ddb0ecd2aa");
    await signer.sendTransaction({ to: await usdtOwner.getAddress(), value: ethers.parseEther(avaxForOwner) })
    const usdt = new ethers.Contract(
        "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",
        ["function mint(address _destination, uint256 _amount)"],
        usdtOwner
    )
    await usdt.mint(to, amount);
    return { token: await usdt.getAddress(), amount };

}


const getEthereumUsdc = async (to: string, amount: bigint) => {
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    if (to == ethers.ZeroAddress) {
        return { token: USDC, amount: BigInt(0) }
    }

    const [minter] = await ethers.getSigners()
    let mintableUsdc = new ethers.Contract(
        USDC,
        [
            "function configureMinter(address, uint)",
            "function mint(address, uint)",
            "function masterMinter() view returns (address)"
        ],
        ethers.provider
    )
    const masterMinter = await ethers.getImpersonatedSigner(await mintableUsdc.masterMinter());
    await setBalance(masterMinter.address, ethers.parseEther("1000"))

    await mintableUsdc.connect(masterMinter).configureMinter(minter.address, amount);
    await mintableUsdc.connect(minter).mint(to, amount);
    return { token: USDC, amount }
}


const getArbitrumOneUsdc = async (to: string, amount: bigint) => {
    const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    if (to == ethers.ZeroAddress) {
        return { token: USDC, amount: BigInt(0) }
    }

    const [minter] = await ethers.getSigners()
    let mintableUsdc = new ethers.Contract(
        USDC,
        [
            "function configureMinter(address, uint)",
            "function mint(address, uint)",
            "function masterMinter() view returns (address)"
        ],
        ethers.provider
    )
    const masterMinter = await ethers.getImpersonatedSigner(await mintableUsdc.masterMinter());
    await setBalance(masterMinter.address, ethers.parseEther("1000"))

    await mintableUsdc.connect(masterMinter).configureMinter(minter.address, amount);
    await mintableUsdc.connect(minter).mint(to, amount);
    return { token: USDC, amount }
}


const getAvalancheUsdc = async (to: string, amount: bigint) => {
    const USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"
    if (to == ethers.ZeroAddress) {
        return { token: USDC, amount: BigInt(0) }
    }

    const [minter] = await ethers.getSigners()
    let mintableUsdc = new ethers.Contract(
        USDC,
        [
            "function configureMinter(address, uint)",
            "function mint(address, uint)",
            "function masterMinter() view returns (address)"
        ],
        ethers.provider
    )
    const masterMinter = await ethers.getImpersonatedSigner(await mintableUsdc.masterMinter());
    await setBalance(masterMinter.address, ethers.parseEther("1000"))

    await mintableUsdc.connect(masterMinter).configureMinter(minter.address, amount);
    await mintableUsdc.connect(minter).mint(to, amount);
    return { token: USDC, amount }
}
