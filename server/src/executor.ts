import { ethers } from 'ethers';
import { ArbitrageSignal, ArbitrageResult } from './types';
import { ARBITRAGE_EXECUTOR_ABI } from './abi/ArbitrageExecutor';

// Função auxiliar para validar endereço
function isValidAddress(address: string): boolean {
  try {
    if (!address) return false;
    ethers.getAddress(address);
    return true;
  } catch (error) {
    console.error('Erro ao validar endereço:', error);
    return false;
  }
}

// Função auxiliar para validar formato do amount
function isValidAmount(amount: string): boolean {
  try {
    BigInt(amount);
    return true;
  } catch {
    return false;
  }
}

// Função auxiliar para validar swap info
function validateSwap(swap: any, index: number): string | null {
  if (!swap) {
    return `Swap ${index} não definido`;
  }

  if (!isValidAddress(swap.router)) {
    return `Router inválido para swap ${index}`;
  }

  if (!Array.isArray(swap.path) || swap.path.length < 2) {
    return `Path inválido para swap ${index}`;
  }

  if (!isValidAmount(swap.amountOutMin)) {
    return `AmountOutMin inválido para swap ${index}`;
  }

  return null;
}

/**
 * Executa uma operação de arbitragem
 * @param signal Sinal de arbitragem contendo os detalhes da operação
 * @returns Resultado da execução
 */
export async function executeArbitrage(signal: ArbitrageSignal): Promise<ArbitrageResult> {
  try {
    console.log('Simulando execução de arbitragem com os seguintes parâmetros:');
    console.log('Asset:', signal.asset);
    console.log('Amount:', signal.amount);
    console.log('Swap 1:', signal.swaps[0]);
    if (signal.swaps[1]) {
      console.log('Swap 2:', signal.swaps[1]);
    }

    // Validar endereço do asset
    if (!isValidAddress(signal.asset)) {
      throw new Error('Invalid asset address');
    }

    // Validar formato do amount
    if (!isValidAmount(signal.amount)) {
      throw new Error('Invalid amount format');
    }

    // Validar swaps
    for (let i = 0; i < signal.swaps.length; i++) {
      const error = validateSwap(signal.swaps[i], i + 1);
      if (error) {
        throw new Error(error);
      }
    }

    // Configurar provedor e carteira
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);

    // Conectar ao contrato
    const executor = new ethers.Contract(
      process.env.ARBITRAGE_EXECUTOR || '',
      ARBITRAGE_EXECUTOR_ABI,
      wallet
    );

    // Preparar os parâmetros para a execução
    const params = {
      asset: signal.asset,
      amount: signal.amount,
      routers: signal.swaps.map(s => s.router),
      paths: signal.swaps.map(s => s.path),
      amountsOutMin: signal.swaps.map(s => s.amountOutMin),
      extras: signal.swaps.map(s => s.extraData || '0x')
    };

    // Estimar gas antes da execução
    const gasEstimate = await executor.executeArbitrage.estimateGas(
      params.asset,
      params.amount,
      params.routers,
      params.paths,
      params.amountsOutMin,
      params.extras
    );

    // Adicionar 10% de margem ao gas
    const gasLimit = gasEstimate + (gasEstimate * BigInt(10) / BigInt(100));

    // Executar a arbitragem
    const tx = await executor.executeArbitrage(
      params.asset,
      params.amount,
      params.routers,
      params.paths,
      params.amountsOutMin,
      params.extras,
      {
        gasLimit
      }
    );

    // Aguardar a confirmação
    const receipt = await tx.wait();

    // Verificar se a transação foi bem-sucedida
    if (!receipt || !receipt.status) {
      throw new Error('Transaction failed');
    }

    return {
      success: true,
      transactionHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString(),
      // Aqui poderíamos adicionar mais informações do resultado
      // como o lucro obtido a partir dos eventos emitidos
    };

  } catch (error) {
    console.error('Erro na execução da arbitragem:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
