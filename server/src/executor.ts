import { ethers } from 'ethers';
import { ExecutionSignal } from './types';
import { ArbitrageExecutor__factory } from '../../hardhat/typechain-types';

// Função principal para executar arbitragem
export async function executeArbitrage(signal: ExecutionSignal): Promise<void> {
  try {
    // Validar variáveis de ambiente necessárias
    if (!process.env.RPC_URL) {
      throw new Error('RPC URL is required');
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error('Private key is required');
    }
    if (!process.env.ARBITRAGE_EXECUTOR_ADDRESS) {
      throw new Error('Arbitrage executor address is required');
    }

    // Conectar ao provedor usando a URL definida na variável de ambiente
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Criar um signer com a chave privada
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // Endereço do contrato ArbitrageExecutor
    const contractAddress = process.env.ARBITRAGE_EXECUTOR_ADDRESS;

    // Instanciar o contrato usando a factory gerada pelo typechain
    const arbitrageExecutor = ArbitrageExecutor__factory.connect(contractAddress, signer);

    // Validar parâmetros do sinal
    if (!signal.asset || !signal.amount) {
      throw new Error('Invalid signal parameters');
    }

    // Validar parâmetros do sinal
    if (!signal.asset || !signal.amount || !signal.swap1 || !signal.swap2) {
      throw new Error('Invalid signal parameters');
    }

    // Montar e enviar a transação
    const tx = await arbitrageExecutor.executeArbitrage(
      signal.asset,
      signal.amount,
      signal.swap1,
      signal.swap2
    );

    console.log(`Enviando transação de arbitragem: ${tx.hash}`);
    console.log('Parâmetros da transação:', {
      asset: signal.asset,
      amount: signal.amount,
      swap1: signal.swap1,
      swap2: signal.swap2,
    });

    // Aguardar a confirmação da transação
    const receipt = await tx.wait();
    console.log(`Transação confirmada no bloco ${receipt?.blockNumber}`);

  } catch (error) {
    console.error('Erro na execução da arbitragem:', error);
    // Implementar mecanismo de retry aqui
    throw error; // Propagar o erro para tratamento adequado no nível superior
  }
}

// Função auxiliar para simular uma execução (útil para testes)
export function simulateArbitrageExecution(signal: ExecutionSignal): void {
  console.log('Simulando execução de arbitragem com os seguintes parâmetros:');
  
  // Log dos parâmetros básicos sempre presentes
  if (signal.asset) {
    console.log('Asset:', signal.asset);
  }
  if (signal.amount) {
    console.log('Amount:', signal.amount);
  }

  // Log dos parâmetros de swap apenas se estiverem presentes
  if (signal.swap1) {
    console.log('Swap 1:', {
      router: signal.swap1.router,
      path: signal.swap1.path,
      amountOutMin: signal.swap1.amountOutMin
    });
  }

  if (signal.swap2) {
    console.log('Swap 2:', {
      router: signal.swap2.router,
      path: signal.swap2.path,
      amountOutMin: signal.swap2.amountOutMin
    });
  }
}
