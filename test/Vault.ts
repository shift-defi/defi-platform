import { loadFixture, reset } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { EventLog } from "ethers";
import { ethers } from "hardhat";

const MIN_LIQUIDITY_DELTA_INSTRUCTION = {
    type_: 4,
    data: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [0])
}


describe("Vault", function () {
    async function getNamedAccounts() {
        const [deployer, user, operator, otherUser] = await ethers.getSigners();
        return { deployer, user, operator, otherUser }
    }

    async function erc20Fixture() {
        const erc20Balance = ethers.parseEther("10000")
        const { user } = await getNamedAccounts();
        const ERC20 = await ethers.getContractFactory("MockERC20")
        const erc20 = await ERC20.deploy()
        await erc20.mint(user.address, erc20Balance);

        return { erc20, user, erc20Balance }
    }

    async function defiiFixture() {
        const { erc20, user, erc20Balance } = await erc20Fixture();

        const MockDefii = await ethers.getContractFactory("MockDefii")
        const mockDefii = await MockDefii.deploy(erc20)

        return { erc20, user, erc20Balance, mockDefii }
    }

    async function vaultFixture() {
        const { erc20, user, erc20Balance, mockDefii } = await defiiFixture();

        const Vault = await ethers.getContractFactory("Vault");
        const vault = await Vault.deploy([{ defii: mockDefii, weight: 1e4 }], "Vault", "V")
        const { operator } = await getNamedAccounts();

        const operatorSignature = ethers.Signature.from(await user.signTypedData(
            {},
            {
                OperatorSetApproval: [
                    {
                        name: 'user',
                        type: 'address'
                    },
                    {
                        name: 'operator',
                        type: 'address'
                    },
                    {
                        name: 'approval',
                        type: 'bool'
                    },
                    {
                        name: 'nonce',
                        type: 'uint256'
                    }
                ]
            },
            {
                user: user.address,
                operator: operator.address,
                approval: true,
                nonce: await vault.operatorNonces(user.address)
            }
        )
        )
        await vault.operatorSetApprovalWithPermit(
            user.address,
            operator.address,
            true,
            operatorSignature.v,
            operatorSignature.r,
            operatorSignature.s
        )

        return { erc20, user, erc20Balance, mockDefii, vault, operator }
    }

    async function vaultWithDepositFixture() {
        const { erc20, user, erc20Balance, mockDefii, vault, operator } = await vaultFixture();

        await erc20.connect(user).approve(await vault.getAddress(), erc20Balance)
        const depositTx = await vault.connect(user).deposit(
            await erc20.getAddress(),
            erc20Balance,
            0
        )

        return { erc20, user, erc20Balance, mockDefii, vault, operator, depositTx }
    }

    describe("Deployment", function () {
        it("Should return correct defii list", async function () {
            const { vault, mockDefii } = await loadFixture(vaultWithDepositFixture)
            expect(await vault.getDefiis()).to.be.deep.eq([await mockDefii.getAddress()])
        })

        it("Should return correct defii weight", async function () {
            const { vault, mockDefii } = await loadFixture(vaultWithDepositFixture)
            expect(await vault.defiiWeight(await mockDefii.getAddress())).to.be.eq(1e4)
        })

    })

    describe("Deposit", function () {
        it("Should mint user position for first deposit", async function () {
            const { vault, user } = await loadFixture(vaultWithDepositFixture)
            expect(await vault.balanceOf(user.address)).to.be.eq(1)
        })

        it("Shouldn't mint user position for second deposit", async function () {
            const { vault } = await loadFixture(vaultFixture);
            const { erc20, user, erc20Balance } = await loadFixture(erc20Fixture);

            await erc20.connect(user).approve(await vault.getAddress(), erc20Balance)
            await vault.connect(user).deposit(
                await erc20.getAddress(),
                erc20Balance / BigInt(2),
                0
            )
            await vault.connect(user).deposit(
                await erc20.getAddress(),
                erc20Balance / BigInt(2),
                0
            )

            expect(await vault.balanceOf(user.address)).to.be.eq(1)
        })

        it("Should take user funds", async function () {
            const { vault, erc20, user, erc20Balance } = await loadFixture(vaultWithDepositFixture)
            const positionId = await vault.tokenOfOwnerByIndex(user.address, 0);
            expect(await vault.funds(positionId, erc20)).to.be.eq(erc20Balance)
        });

        it("Should emit event FundsDeposited", async function () {
            const { vault, erc20, user, erc20Balance, depositTx } = await loadFixture(vaultWithDepositFixture)
            const positionId = await vault.tokenOfOwnerByIndex(user.address, 0);

            const depositReceipt = await depositTx.wait()
            const vaultAddress = await vault.getAddress()

            const depositEvents = depositReceipt?.logs
                .filter((log) =>
                    log.address === vaultAddress
                    && log.topics[0] === vault.interface.getEvent("BalanceChanged").topicHash
                )

            expect(depositEvents?.length).to.be.eq(1)
            const depositEvent = depositEvents![0] as EventLog

            expect(depositEvent.args[0]).to.be.eq(positionId)
            expect(depositEvent.args[1]).to.be.eq(await erc20.getAddress())
            expect(depositEvent.args[2]).to.be.eq(erc20Balance)
            expect(depositEvent.args[3]).to.be.true
        });

        it("Should deposit with permit", async function () {
            const { vault } = await loadFixture(vaultFixture);
            const { erc20, user, erc20Balance } = await loadFixture(erc20Fixture);

            const DEADLINE = Math.ceil(+new Date() / 1000) + 1 * 60 * 60

            const domainData = await erc20.eip712Domain()
            const permitSignature = ethers.Signature.from(await user.signTypedData(
                {
                    name: domainData.name,
                    version: domainData.version,
                    chainId: domainData.chainId,
                    verifyingContract: await erc20.getAddress()
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
                    value: erc20Balance,
                    nonce: await erc20.nonces(user),
                    deadline: DEADLINE
                }
            ))
            expect(
                await vault
                    .connect(user)
                    .depositWithPermit(
                        await erc20.getAddress(),
                        erc20Balance,
                        0,
                        DEADLINE,
                        permitSignature.v,
                        permitSignature.r,
                        permitSignature.s
                    )
            ).to.be.not.reverted
        })

        describe("Validation", function () {
            it("Should revert if couldn't take funds from user", async function () {
                const { vault } = await loadFixture(vaultFixture);
                const { erc20, user, erc20Balance } = await loadFixture(erc20Fixture);

                // deposit without approve
                await expect(
                    vault.connect(user).deposit(await erc20.getAddress(), erc20Balance, 0)
                ).to.be.reverted;
            })
        })
    });

    describe("Withdraw", function () {
        it("Should withdraw funds to user", async function () {
            const { vault, erc20, user, erc20Balance, } = await loadFixture(vaultWithDepositFixture)
            const positionId = await vault.tokenOfOwnerByIndex(user.address, 0);

            await expect(
                vault.connect(user).withdraw(await erc20.getAddress(), erc20Balance, positionId)
            ).to.changeTokenBalances(
                erc20,
                [vault, user],
                [-erc20Balance, erc20Balance]
            )
        })

        describe("Validation", function () {
            it("Should check user balance before withdraw", async function () {
                const { vault, erc20, user, erc20Balance } = await loadFixture(vaultWithDepositFixture)
                const positionId = await vault.tokenOfOwnerByIndex(user.address, 0);

                await expect(
                    vault.connect(user).withdraw(await erc20.getAddress(), erc20Balance * BigInt(2), positionId)
                ).to.be.reverted
            })
            it("Could be done only user or operator", async function () {
                const { otherUser } = await getNamedAccounts()
                const { vault, erc20, user, operator } = await loadFixture(vaultWithDepositFixture)
                const positionId = await vault.tokenOfOwnerByIndex(user.address, 0);

                await expect(
                    vault.connect(operator).withdraw(await erc20.getAddress(), 1, positionId)
                ).to.be.not.reverted
                await expect(
                    vault.connect(otherUser).withdraw(await erc20.getAddress(), 1, positionId)
                ).to.be.revertedWithCustomError(vault, "OperatorNotAuthorized")
            })
        })
    })
    describe("Enter DEFII", function () {
        it("Should enter to defii", async function () {
            const { vault, user, mockDefii } = await loadFixture(vaultWithDepositFixture)
            const positionId = await vault.tokenOfOwnerByIndex(user.address, 0);

            await vault.connect(user).enterDefii(await mockDefii.getAddress(), positionId, [MIN_LIQUIDITY_DELTA_INSTRUCTION])

            expect(await vault.funds(positionId, await mockDefii.notion())).to.be.eq(0);
            expect(await vault.funds(positionId, await mockDefii.getAddress())).to.be.gt(0);
        })

        describe("Validation", function () {
            it("Could be done only user or operator", async function () {
                const { otherUser } = await getNamedAccounts()
                const { vault, user, operator, mockDefii } = await loadFixture(vaultWithDepositFixture)
                const positionId = await vault.tokenOfOwnerByIndex(user.address, 0);

                await expect(
                    vault.connect(operator).enterDefii(await mockDefii.getAddress(), positionId, [MIN_LIQUIDITY_DELTA_INSTRUCTION])
                ).to.be.not.reverted
                await expect(
                    vault.connect(otherUser).enterDefii(await mockDefii.getAddress(), positionId, [MIN_LIQUIDITY_DELTA_INSTRUCTION])
                ).to.be.revertedWithCustomError(vault, "OperatorNotAuthorized")
            })

            it("Should check defii address before enter", async function () {
                const { vault, user, erc20 } = await loadFixture(vaultWithDepositFixture)
                const positionId = await vault.tokenOfOwnerByIndex(user.address, 0);

                const WrongDefii = await ethers.getContractFactory("MockDefii")
                const wrongDefii = await WrongDefii.deploy(erc20)

                await expect(
                    vault
                        .connect(user)
                        .enterDefii(await wrongDefii.getAddress(), positionId, [MIN_LIQUIDITY_DELTA_INSTRUCTION])
                ).to.be.revertedWithCustomError(vault, "UnsupportedDefii")
            })
        })
    })
    describe("Exit DEFII", function () {
        it("Should exit from defii", async function () {
            const { vault, user, mockDefii } = await loadFixture(vaultWithDepositFixture)
            const positionId = await vault.tokenOfOwnerByIndex(user.address, 0);
            await vault.connect(user).enterDefii(await mockDefii.getAddress(), positionId, [MIN_LIQUIDITY_DELTA_INSTRUCTION])

            await vault
                .connect(user)
                .exitDefii(
                    await mockDefii.getAddress(),
                    positionId,
                    100,
                    []
                )
        })

        describe("Validation", function () {
            it("Could be done only user or operator", async function () {
                const { otherUser } = await getNamedAccounts()
                const { vault, user, operator, mockDefii } = await loadFixture(vaultWithDepositFixture)
                const positionId = await vault.tokenOfOwnerByIndex(user.address, 0);
                await vault.connect(user).enterDefii(await mockDefii.getAddress(), positionId, [MIN_LIQUIDITY_DELTA_INSTRUCTION])

                await expect(vault
                    .connect(operator)
                    .exitDefii(
                        await mockDefii.getAddress(),
                        positionId,
                        1,
                        []
                    )
                ).to.be.not.reverted

                await expect(vault
                    .connect(otherUser)
                    .exitDefii(
                        await mockDefii.getAddress(),
                        positionId,
                        1,
                        []
                    )
                ).to.be.revertedWithCustomError(vault, "OperatorNotAuthorized")
            })

        })
    })
})
