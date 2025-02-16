import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { executeArbitrage } from './executor';
import { ArbitrageSignal, DexType } from './types';
import { createDexAdapter } from './adapters';

dotenv.config();

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: Number(PORT) });

// Mapping de nomes de DEX para seus respectivos endereços
const DEX_ROUTER_ADDRESSES: { [key: string]: string } = {
  quickswapv2: process.env.QUICKSWAP_V2_ROUTER || '',
  quickswapv3: process.env.QUICKSWAP_V3_ROUTER || '',
  sushiswapv2: process.env.SUSHISWAP_V2_ROUTER || '',
  uniswapv3: process.env.UNISWAP_V3_ROUTER || '',
  curve: process.env.CURVE_ROUTER || ''
};

// Helper para validar e normalizar o nome do DEX
function normalizeDexName(dexName: string): string {
  const normalized = dexName.toLowerCase();
  if (!DEX_ROUTER_ADDRESSES[normalized]) {
    throw new Error(`DEX não suportado: ${dexName}`);
  }
  return normalized;
}

// Helper para obter o endereço do router do DEX
function getDexRouter(dexName: string): string {
  const normalized = normalizeDexName(dexName);
  const address = DEX_ROUTER_ADDRESSES[normalized];
  if (!address) {
    throw new Error(`Endereço do router não configurado para: ${dexName}`);
  }
  return address;
}

wss.on('connection', (ws) => {
  console.log('Nova conexão WebSocket estabelecida');

  ws.on('message', async (data) => {
    try {
      // Parse e valida os dados recebidos
      const opportunity = JSON.parse(data.toString());
      const signal: ArbitrageSignal = {
        asset: opportunity.asset,
        amount: opportunity.amount,
        swaps: opportunity.swaps.map((swap: any) => ({
          router: getDexRouter(swap.dex),
          path: swap.path,
          amountOutMin: swap.amountOutMin,
          dexType: swap.dex as DexType,
          extraData: createExtraData(swap)
        }))
      };

      // Executa a arbitragem
      console.log('Executando arbitragem com sinal:', signal);
      const result = await executeArbitrage(signal);

      // Envia o resultado de volta ao cliente
      ws.send(JSON.stringify({
        type: 'arbitrageResult',
        data: result
      }));

    } catch (error) {
      console.error('Erro ao processar oportunidade:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  });
});

// Helper para criar extraData baseado no tipo de DEX
function createExtraData(swap: any): string | undefined {
  try {
    const dexName = normalizeDexName(swap.dex);
    const routerAddress = getDexRouter(dexName);
    const adapter = createDexAdapter(dexName, routerAddress);
    
    // Se houver parâmetros extras específicos do DEX, como fee para UniswapV3 ou pool para Curve
    const extraParams = {
      fee: swap.fee,
      poolAddress: swap.poolAddress
    };

    const swapData = adapter.buildSwapData(
      swap.path[0],
      swap.path[1],
      swap.amountIn,
      extraParams
    );

    return swapData.extraData;
  } catch (error) {
    console.error('Erro ao criar extraData:', error);
    return undefined;
  }
}

console.log(`WebSocket server iniciado na porta ${PORT}`);
