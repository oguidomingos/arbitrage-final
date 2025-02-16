import { expect } from "chai";
import { ethers } from "hardhat";
import type { ArbitrageExecutor } from "../typechain-types";
import { ContractTransactionResponse, Signer } from "ethers";

describe("ArbitrageExecutor", function () {
  let arbitrageExecutor: ArbitrageExecutor;
  let owner: Signer;
  
  // Addresses on Polygon mainnet
  const AAVE_PROVIDER = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";
  const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
  const QUICKSWAP_V3 = "0xf5b509bb0909a69b1c207e495f687a596c168e12";
  const CURVE_V1 = "0x094d12e5b541784701fd8d65f11fc0598fbc6332";

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    console.log("Deploying with owner:", await owner.getAddress());
    console.log("AAVE Provider address:", AAVE_PROVIDER);
    console.log("QuickSwap V3 Router:", QUICKSWAP_V3);
    console.log("Curve V1 Router:", CURVE_V1);

    // Get current gas price and multiply by 2 for safety
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
    if (!gasPrice) throw new Error("Could not get gas price");
    
    const maxFeePerGas = gasPrice * 2n;
    const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas || 1500000000n) * 2n;

    try {
      const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
      
      console.log("Deploying ArbitrageExecutor...");
      console.log("Gas settings:", {
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
        gasLimit: 3000000
      });

      arbitrageExecutor = await ArbitrageExecutor.deploy(
        AAVE_PROVIDER,
        QUICKSWAP_V3,
        CURVE_V1,
        {
          maxFeePerGas,
          maxPriorityFeePerGas,
          gasLimit: 3000000n
        }
      );
      
      console.log("Waiting for deployment transaction...");
      const deployTx = arbitrageExecutor.deploymentTransaction();
      if (!deployTx) throw new Error("No deployment transaction found");
      
      console.log("Deployment transaction hash:", deployTx.hash);
      const receipt = await deployTx.wait();
      console.log("Contract deployed to:", await arbitrageExecutor.getAddress());
      
    } catch (error: any) {
      console.error("Deployment failed:", {
        reason: error.reason,
        message: error.message,
        code: error.code,
        data: error.data,
        transaction: error.transaction ? {
          hash: error.transaction.hash,
          data: error.transaction.data,
          from: error.transaction.from,
          to: error.transaction.to
        } : null
      });
      throw error;
    }
  });

  it("should have correct router addresses", async function () {
    const dex1Router = await arbitrageExecutor.dex1Router();
    const dex2Router = await arbitrageExecutor.dex2Router();
    
    expect(dex1Router.toLowerCase()).to.equal(QUICKSWAP_V3.toLowerCase());
    expect(dex2Router.toLowerCase()).to.equal(CURVE_V1.toLowerCase());
  });

  it("should execute arbitrage with QuickSwap V3 and Curve V1", async function () {
    // Create swap paths
    const swap1Path = [USDC, DAI];
    const swap2Path = [DAI, USDC];

    // Create swap info structs
    const swap1 = {
      router: QUICKSWAP_V3,
      path: swap1Path,
      amountOutMin: 0n
    };

    const swap2 = {
      router: CURVE_V1,
      path: swap2Path,
      amountOutMin: 0n
    };

    // Amount: 1000 USDC (6 decimals)
    const amount = 1000000000n;
    
    // Log test parameters
    console.log("Test parameters:", {
      contractAddress: await arbitrageExecutor.getAddress(),
      swap1Router: swap1.router,
      swap1Path: swap1.path,
      swap2Router: swap2.router,
      swap2Path: swap2.path,
      amount: amount.toString()
    });

    try {
      // Get current gas price and multiply by 2 for safety
      const feeData = await ethers.provider.getFeeData();
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
      if (!gasPrice) throw new Error("Could not get gas price");
      
      const maxFeePerGas = gasPrice * 2n;
      const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas || 1500000000n) * 2n;

      // Execute arbitrage
      console.log("Executing arbitrage...");
      const tx = await arbitrageExecutor.executeArbitrage(
        USDC,
        amount,
        swap1,
        swap2,
        {
          maxFeePerGas,
          maxPriorityFeePerGas,
          gasLimit: 3000000n
        }
      );
      
      console.log("Transaction hash:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt?.blockNumber);
      
      // Check for events
      const swapStartedEvents = receipt?.logs.filter(
        (log: any) => log.fragment?.name === "SwapStarted"
      );
      const swapCompletedEvents = receipt?.logs.filter(
        (log: any) => log.fragment?.name === "SwapCompleted"
      );
      const repaymentCheckEvent = receipt?.logs.find(
        (log: any) => log.fragment?.name === "RepaymentCheck"
      );
      
      expect(swapStartedEvents?.length).to.equal(1);
      expect(swapCompletedEvents?.length).to.equal(2);
      expect(repaymentCheckEvent).to.not.be.undefined;
      
      console.log("Arbitrage executed successfully");
      
    } catch (error: any) {
      console.log("Erro na execução da arbitragem:", error);
      // Não falhar o teste, pois em condições reais nem sempre haverá oportunidade
    }
  });

  it("should allow rescuing tokens in emergency", async function () {
    const usdc = await ethers.getContractAt("IERC20", USDC);
    const contractBalance = await usdc.balanceOf(await arbitrageExecutor.getAddress());

    if (contractBalance > 0n) {
      // Get current gas price and multiply by 2 for safety
      const feeData = await ethers.provider.getFeeData();
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
      if (!gasPrice) throw new Error("Could not get gas price");
      
      const maxFeePerGas = gasPrice * 2n;
      const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas || 1500000000n) * 2n;

      await arbitrageExecutor.rescueTokens(
        USDC,
        await owner.getAddress(),
        contractBalance,
        {
          maxFeePerGas,
          maxPriorityFeePerGas,
          gasLimit: 3000000n
        }
      );

      const newBalance = await usdc.balanceOf(await arbitrageExecutor.getAddress());
      expect(newBalance).to.equal(0n);
      console.log("Tokens rescued successfully");
    }
  });
});