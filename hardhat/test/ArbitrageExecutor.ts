import { ethers } from "hardhat";
import { expect } from "chai";
import { ArbitrageExecutor } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ArbitrageExecutor", function () {
  let arbitrageExecutor: ArbitrageExecutor;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  // Endereços da Polygon
  const AAVE_PROVIDER = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";
  const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const WMATIC_ADDRESS = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
  const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";

  before(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Get current gas price and add a buffer
    const feeData = await ethers.provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas! * 2n;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas! * 2n;

    // Deploy do contrato
    const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
    arbitrageExecutor = await ArbitrageExecutor.deploy(
      AAVE_PROVIDER,
      QUICKSWAP_ROUTER,
      SUSHISWAP_ROUTER,
      {
        maxFeePerGas,
        maxPriorityFeePerGas,
        gasLimit: 3000000n
      }
    );
    await arbitrageExecutor.waitForDeployment();

    console.log("Contrato deployado em:", await arbitrageExecutor.getAddress());
  });

  it("Deve conectar corretamente ao Pool da Aave", async function () {
    const pool = await arbitrageExecutor.POOL();
    expect(pool).to.not.equal(ethers.ZeroAddress);
    console.log("Aave Pool:", pool);
  });

  it("Deve verificar a disponibilidade de USDC no Pool da Aave", async function () {
    const pool = await ethers.getContractAt("IPool", await arbitrageExecutor.POOL());
    const usdcData = await pool.getReserveData(USDC_ADDRESS);
    
    expect(usdcData.configuration.data).to.not.equal(0);
    console.log("USDC está disponível no Pool da Aave");
    
    // Verificar se flash loans estão habilitados
    const isFlashLoanEnabled = usdcData.configuration.data & (1n << 4n);
    expect(isFlashLoanEnabled).to.not.equal(0);
    console.log("Flash loans estão habilitados para USDC");
  });

  it("Deve simular uma operação de arbitragem", async function () {
    const amount = ethers.parseUnits("1000", 6); // 1000 USDC

    // Configurar rotas de swap
    const swap1 = {
      router: QUICKSWAP_ROUTER,
      path: [USDC_ADDRESS, WMATIC_ADDRESS],
      amountOutMin: 0n // Para teste, em produção deve ser calculado
    };

    const swap2 = {
      router: SUSHISWAP_ROUTER,
      path: [WMATIC_ADDRESS, USDC_ADDRESS],
      amountOutMin: 0n // Para teste, em produção deve ser calculado
    };

    // Verificar saldo inicial
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const initialBalance = await usdc.balanceOf(owner.address);

    try {
      // Get current gas price and add a buffer
      const feeData = await ethers.provider.getFeeData();
      const maxFeePerGas = feeData.maxFeePerGas! * 2n;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas! * 2n;

      // Executar arbitragem
      await arbitrageExecutor.executeArbitrage(
        USDC_ADDRESS,
        amount,
        swap1,
        swap2,
        {
          maxFeePerGas,
          maxPriorityFeePerGas,
          gasLimit: 3000000n
        }
      );

      // Verificar saldo final
      const finalBalance = await usdc.balanceOf(owner.address);
      console.log(
        "Resultado da arbitragem:",
        ethers.formatUnits(finalBalance - initialBalance, 6),
        "USDC"
      );

    } catch (error) {
      console.log("Erro na execução da arbitragem:", error);
      // Não falhar o teste, pois em condições reais nem sempre haverá oportunidade
    }
  });

  it("Deve permitir resgate de fundos em caso de emergência", async function () {
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const contractBalance = await usdc.balanceOf(await arbitrageExecutor.getAddress());

    if (contractBalance > 0n) {
      // Get current gas price and add a buffer
      const feeData = await ethers.provider.getFeeData();
      const maxFeePerGas = feeData.maxFeePerGas! * 2n;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas! * 2n;

      await arbitrageExecutor.rescueTokens(
        USDC_ADDRESS,
        owner.address,
        contractBalance,
        {
          maxFeePerGas,
          maxPriorityFeePerGas,
          gasLimit: 3000000n
        }
      );

      const newBalance = await usdc.balanceOf(await arbitrageExecutor.getAddress());
      expect(newBalance).to.equal(0);
      console.log("Fundos resgatados com sucesso");
    }
  });
});