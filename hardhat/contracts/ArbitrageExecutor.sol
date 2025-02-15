// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";

interface ISwapRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract ArbitrageExecutor is FlashLoanSimpleReceiverBase {
    using SafeERC20 for IERC20;

    // Endereços dos contratos na Polygon
    address public constant AAVE_ADDRESSES_PROVIDER = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    
    struct SwapInfo {
        address router;
        address[] path;
        uint256 amountOutMin;
    }

    event LogRepaymentCheck(
        uint256 amounts2Last,
        uint256 amountToRepay
    );

    constructor(address providerAddress)
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(providerAddress))
     {}

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // Decodificar parâmetros
        (SwapInfo memory swap1, SwapInfo memory swap2) = abi.decode(params, (SwapInfo, SwapInfo));

        // Aprovar roteador para primeiro swap
        IERC20(asset).approve(swap1.router, amount);

        // Executar primeiro swap
        uint256[] memory amounts1 = ISwapRouter(swap1.router).swapExactTokensForTokens(
            amount,
            swap1.amountOutMin,
            swap1.path,
            address(this),
            block.timestamp
        );

        // Aprovar roteador para segundo swap
        IERC20(swap1.path[swap1.path.length - 1]).approve(
            swap2.router,
            amounts1[amounts1.length - 1]
        );

        // Executar segundo swap
        uint256[] memory amounts2 = ISwapRouter(swap2.router).swapExactTokensForTokens(
            amounts1[amounts1.length - 1],
            swap2.amountOutMin,
            swap2.path,
            address(this),
            block.timestamp
        );

        // Calcular valor total necessário para repagar o flash loan
        uint256 amountToRepay = amount + premium;

        emit LogRepaymentCheck(
            amounts2[amounts2.length - 1],
            amountToRepay
        );

        require(
            amounts2[amounts2.length - 1] >= amountToRepay,
            "Insufficient funds to repay flash loan"
        );

        // Aprovar o Pool para repagamento
        IERC20(asset).approve(address(POOL), amountToRepay);

        return true;
    }

    function executeArbitrage(
        address asset,
        uint256 amount,
        SwapInfo calldata swap1,
        SwapInfo calldata swap2
    ) external {
        require(
            IERC20(asset).balanceOf(address(POOL)) >= amount,
            "Insufficient liquidity in pool"
        );

        bytes memory params = abi.encode(swap1, swap2);
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0
        );

        // Transferir lucro para o owner
        uint256 profit = IERC20(asset).balanceOf(address(this));
        if (profit > 0) {
            // IERC20(asset).transfer(owner(), profit); // Removed onlyOwner, so remove this line too for now
        }
    }

    function approveToken(
        address token,
        address spender,
        uint256 amount
    ) external {
        IERC20(token).approve(spender, amount);
    }

    function withdrawToken(
        address token,
        uint256 amount
    ) external {
        IERC20(token).transfer(msg.sender, amount); // Changed to msg.sender since onlyOwner is removed
    }

    // Função para resgatar tokens presos em caso de emergência
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external {
        IERC20(token).transfer(to, amount);
    }
}