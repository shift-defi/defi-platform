import { ethers, network } from "hardhat"
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";


const approveOperatorTypes = {
    ApproveOperator: [
        {
            name: 'user',
            type: 'address'
        },
        {
            name: 'operator',
            type: 'address'
        },
        {
            name: 'forAddress',
            type: 'address'
        },
        {
            name: 'nonce',
            type: 'uint256'
        }
    ]
}


describe("OperatorRegistry", function () {
    async function deployOperatorRegistry() {
        const operatorRegistry = await ethers.deployContract("OperatorRegistry")
        const [user, operator, forAddress] = await ethers.getSigners()

        return { operatorRegistry, user, operator, forAddress }
    }

    describe("approveOperator", function () {
        it("Should correct add operator", async function () {
            const { operatorRegistry, user, operator, forAddress } = await loadFixture(deployOperatorRegistry);

            const tx = await operatorRegistry.connect(user).approveOperator(operator.address, forAddress.address)
            const receipt = await tx.wait()

            expect(receipt?.logs![0].topics[0] === operatorRegistry.getEvent("OperatorApprovalChanged").fragment.topicHash)
            expect(await operatorRegistry.isOperatorApprovedForAddress(
                user.address,
                operator.address,
                forAddress.address
            )).to.be.true
        })

        it("Should revert if operator already added", async function () {
            const { operatorRegistry, user, operator, forAddress } = await loadFixture(deployOperatorRegistry);

            await operatorRegistry.connect(user).approveOperator(operator.address, forAddress.address)
            await expect(operatorRegistry.connect(user).approveOperator(operator.address, forAddress.address)).to.be.reverted
        })

        it("Correct works with ALL magic constant", async function () {
            const { operatorRegistry, user, operator, forAddress } = await loadFixture(deployOperatorRegistry);

            await operatorRegistry.connect(user).approveOperator(operator, await operatorRegistry.ALL())

            const results = await Promise.all([
                operatorRegistry.connect(user).isOperatorApprovedForAddress(user, operator, ethers.ZeroAddress),
                operatorRegistry.connect(user).isOperatorApprovedForAddress(user, operator, forAddress),
                operatorRegistry.connect(user).isOperatorApprovedForAddress(user, operator, await operatorRegistry.ALL()),
            ])
            expect(results.every(x => x)).to.be.true
        })
    })

    describe("approveOperatorWithPermit", function () {
        it("Should correct check sign for all chains", async function () {
            const { operatorRegistry, user, operator, forAddress } = await loadFixture(deployOperatorRegistry);

            const sig = ethers.Signature.from(await user.signTypedData(
                {
                    verifyingContract: await operatorRegistry.getAddress()
                },
                approveOperatorTypes,
                {
                    user: user.address,
                    operator: operator.address,
                    forAddress: forAddress.address,
                    nonce: await operatorRegistry.nonce(user.address)
                }
            ))

            await operatorRegistry.approveOperatorWithPermit(
                user.address,
                operator,
                forAddress,
                0,
                sig.v,
                sig.r,
                sig.s
            )

            expect(await operatorRegistry.isOperatorApprovedForAddress(user.address, operator, forAddress)).to.be.true;
            expect(await operatorRegistry.nonce(user.address)).to.be.eq(1);
        });

        it("Should correct check sign for specific", async function () {
            const { operatorRegistry, user, operator, forAddress } = await loadFixture(deployOperatorRegistry);

            const sig = ethers.Signature.from(await user.signTypedData(
                {
                    verifyingContract: await operatorRegistry.getAddress(),
                    chainId: network.config.chainId
                },
                approveOperatorTypes,
                {
                    user: user.address,
                    operator: operator.address,
                    forAddress: forAddress.address,
                    nonce: await operatorRegistry.nonce(user.address)
                }
            ))

            await operatorRegistry.approveOperatorWithPermit(
                user.address,
                operator,
                forAddress,
                network.config.chainId!,
                sig.v,
                sig.r,
                sig.s
            )

            expect(await operatorRegistry.isOperatorApprovedForAddress(user.address, operator, forAddress)).to.be.true;
            expect(await operatorRegistry.nonce(user.address)).to.be.eq(1);
        });
    });

    describe("removeOperator", function () {
        it("Should correct remove operator", async function () {
            const { operatorRegistry, user, operator, forAddress } = await loadFixture(deployOperatorRegistry);

            await operatorRegistry.connect(user).approveOperator(operator.address, forAddress.address)
            const tx = await operatorRegistry.connect(user).removeOperator(operator.address, forAddress.address)
            const receipt = await tx.wait()

            expect(await operatorRegistry.isOperatorApprovedForAddress(
                user.address,
                operator.address,
                forAddress.address
            )).to.be.false
            expect(receipt?.logs![0].topics[0] === operatorRegistry.getEvent("OperatorApprovalChanged").fragment.topicHash)
        })

        it("Should revert if operator not added", async function () {
            const { operatorRegistry, user, operator, forAddress } = await loadFixture(deployOperatorRegistry);

            await expect(operatorRegistry.connect(user).removeOperator(operator.address, forAddress.address)).to.be.reverted
        })
    })
})
