// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";

// Interface padrão Uniswap V2 (também usada por QuickSwap V2, SushiSwap V2)
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

// Interface para Curve
interface ICurveRouter {
    function exchange(
        address pool,
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256);
}

// Interface para UniswapV3
interface IUniswapV3Router {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external returns (uint256 amountOut);
}

contract ArbitrageExecutor is FlashLoanSimpleReceiverBase {
    using SafeERC20 for IERC20;

    event Initialized(address indexed provider, address indexed pool);
    event SwapStarted(address indexed token, uint256 amount, string dexType);
    event SwapCompleted(address indexed token, uint256 amountReceived);
    event RepaymentCheck(uint256 amounts2Last, uint256 amountToRepay);
    event TokensRescued(address indexed token, address indexed to, uint256 amount);

    enum DexType {
        UniswapV2,
        UniswapV3,
        Curve
    }

    struct SwapInfo {
        address router;
        address[] path;
        uint256 amountOutMin;
        DexType dexType;
        bytes extraData; // Dados extras específicos de cada DEX
    }

    address public immutable dex1Router;
    address public immutable dex2Router;

    constructor(
        address providerAddress,
        address _dex1Router,
        address _dex2Router
    ) 
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(providerAddress))
    {
        require(providerAddress != address(0), "Invalid provider address");
        dex1Router = _dex1Router;
        dex2Router = _dex2Router;
    }

    function performSwap(
        address token,
        uint256 amount,
        SwapInfo memory swap,
        uint256 deadline
    ) internal returns (uint256) {
        // Aprovar o router para gastar os tokens
        IERC20(token).approve(swap.router, amount);

        uint256 amountReceived;

        if (swap.dexType == DexType.UniswapV2) {
            uint256[] memory amounts = IUniswapV2Router(swap.router).swapExactTokensForTokens(
                amount,
                swap.amountOutMin,
                swap.path,
                address(this),
                deadline
            );
            amountReceived = amounts[amounts.length - 1];
        }
        else if (swap.dexType == DexType.UniswapV3) {
            IUniswapV3Router.ExactInputParams memory params = abi.decode(
                swap.extraData,
                (IUniswapV3Router.ExactInputParams)
            );
            params.amountIn = amount;
            params.deadline = deadline;
            params.recipient = address(this);
            amountReceived = IUniswapV3Router(swap.router).exactInput(params);
        }
        else if (swap.dexType == DexType.Curve) {
            (address pool, address toToken) = abi.decode(swap.extraData, (address, address));
            amountReceived = ICurveRouter(swap.router).exchange(
                pool,
                token,
                toToken,
                amount,
                swap.amountOutMin,
                address(this)
            );
        }

        require(amountReceived >= swap.amountOutMin, "Insufficient output amount");
        return amountReceived;
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Caller must be POOL");
        require(asset != address(0), "Invalid asset address");
        require(amount > 0, "Amount must be greater than 0");

        // Decodificar parâmetros
        (SwapInfo memory swap1, SwapInfo memory swap2) = abi.decode(params, (SwapInfo, SwapInfo));

        require(swap1.router != address(0), "Invalid router 1");
        require(swap2.router != address(0), "Invalid router 2");
        require(swap1.path.length >= 2, "Invalid path 1");
        require(swap2.path.length >= 2, "Invalid path 2");

        uint256 deadline = block.timestamp + 300; // 5 minute deadline

        // Primeiro swap
        emit SwapStarted(asset, amount, getDexTypeString(swap1.dexType));
        uint256 amountReceived1 = performSwap(asset, amount, swap1, deadline);
        emit SwapCompleted(swap1.path[swap1.path.length - 1], amountReceived1);

        // Segundo swap
        emit SwapStarted(swap1.path[swap1.path.length - 1], amountReceived1, getDexTypeString(swap2.dexType));
        uint256 amountReceived2 = performSwap(
            swap1.path[swap1.path.length - 1],
            amountReceived1,
            swap2,
            deadline
        );
        emit SwapCompleted(swap2.path[swap2.path.length - 1], amountReceived2);

        // Calcular valor total necessário para repagar o flash loan
        uint256 amountToRepay = amount + premium;
        emit RepaymentCheck(amountReceived2, amountToRepay);

        require(
            amountReceived2 >= amountToRepay,
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
        require(asset != address(0), "Invalid asset address");
        require(amount > 0, "Amount must be greater than 0");
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

        uint256 profit = IERC20(asset).balanceOf(address(this));
        if (profit > 0) {
            IERC20(asset).transfer(msg.sender, profit);
        }
    }

    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external {
        require(msg.sender == tx.origin, "Only EOA can rescue tokens");
        require(token != address(0), "Invalid token address");
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(token).transfer(to, amount);
        emit TokensRescued(token, to, amount);
    }

    function getDexTypeString(DexType dexType) internal pure returns (string memory) {
        if (dexType == DexType.UniswapV2) return "UniswapV2";
        if (dexType == DexType.UniswapV3) return "UniswapV3";
        if (dexType == DexType.Curve) return "Curve";
        return "Unknown";
    }
}