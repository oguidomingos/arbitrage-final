import axios from 'axios';
import { ethers } from 'ethers';
import { TokenInfo, PriceResult, ArbitrageOpportunity, LogCallback } from './types';

// Configurações da ParaSwap API
const PARASWAP_API = 'https://apiv5.paraswap.io';

// Interfaces específicas para ParaSwap
interface ParaSwapTokens {
  tokens: {
    [key: string]: {
      address: string;
      decimals: number;
      symbol: string;
      name: string;
    };
  };
}

interface ParaswapPriceRoute {
  bestRoute: Array<{
    exchange: string;
    srcToken: string;
    destToken: string;
    amount: string;
    outputAmount: string;
  }>;
  gasCost: string;
  gasCostUSD: string;
  gasEstimate: number;
  outputAmount: string;
}

// Tokens monitorados
const TOKENS: TokenInfo[] = [
  { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, symbol: 'WMATIC', name: 'Wrapped Matic' },
  { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8, symbol: 'WBTC', name: 'Wrapped BTC' },
  { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, symbol: 'WETH', name: 'Wrapped ETH' }
];

// Helper para buscar token por endereço
function findToken(address: string): TokenInfo | undefined {
  return TOKENS.find(token => token.address.toLowerCase() === address.toLowerCase());
}

// Helper para formatar valor com decimais
function formatTokenAmount(amount: string, decimals: number): string {
  return ethers.formatUnits(amount, decimals);
}

// Helper para calcular lucro potencial
function calculateProfit(amountIn: string, amountOut: string, decimals: number): number {
  const input = Number(formatTokenAmount(amountIn, decimals));
  const output = Number(formatTokenAmount(amountOut, decimals));
  return ((output - input) / input) * 100;
}

/**
 * Busca preços e verifica oportunidades de arbitragem
 */
export async function checkArbitrageOpportunities(
  minProfitPercent: number,
  log: LogCallback
): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = [];

  try {
    // Verificar cada par de tokens
    for (let i = 0; i < TOKENS.length; i++) {
      const token1 = TOKENS[i];
      
      for (let j = i + 1; j < TOKENS.length; j++) {
        const token2 = TOKENS[j];

        try {
          // Buscar preço token1 -> token2
          const route1 = await getPriceQuote(
            token1.address,
            token2.address,
            ethers.parseUnits('1', token1.decimals).toString()
          );

          if (!route1) {
            log({
              timestamp: Date.now(),
              type: 'info',
              message: `Nenhuma rota encontrada para ${token1.symbol} -> ${token2.symbol}`
            });
            continue;
          }

          // Buscar preço token2 -> token1
          const route2 = await getPriceQuote(
            token2.address,
            token1.address,
            route1.outputAmount
          );

          if (!route2) {
            log({
              timestamp: Date.now(),
              type: 'info',
              message: `Nenhuma rota encontrada para ${token2.symbol} -> ${token1.symbol}`
            });
            continue;
          }

          // Calcular lucro potencial
          const finalAmount = route2.outputAmount;
          const profit = calculateProfit(
            ethers.parseUnits('1', token1.decimals).toString(),
            finalAmount,
            token1.decimals
          );

          if (profit > minProfitPercent) {
            log({
              timestamp: Date.now(),
              type: 'opportunity',
              message: `Oportunidade encontrada com lucro de ${profit.toFixed(2)}%`,
              details: {
                route: `${token1.symbol} -> ${token2.symbol} -> ${token1.symbol}`,
                profit,
                dex1: route1.bestRoute[0],
                dex2: route2.bestRoute[0]
              }
            });

            opportunities.push({
              asset: token1.address,
              amount: ethers.parseUnits('1', token1.decimals).toString(),
              expectedProfit: profit.toFixed(2),
              dex1: {
                name: route1.bestRoute[0].exchange,
                path: [route1.bestRoute[0].srcToken, route1.bestRoute[0].destToken],
                amountIn: ethers.parseUnits('1', token1.decimals).toString(),
                amountOutMin: route1.outputAmount
              },
              dex2: {
                name: route2.bestRoute[0].exchange,
                path: [route2.bestRoute[0].srcToken, route2.bestRoute[0].destToken],
                amountIn: route1.outputAmount,
                amountOutMin: route2.outputAmount
              }
            });
          }
        } catch (error) {
          log({
            timestamp: Date.now(),
            type: 'error',
            message: `Erro ao verificar par ${token1.symbol}/${token2.symbol}: ${
              error instanceof Error ? error.message : 'Erro desconhecido'
            }`
          });
        }
      }
    }

  } catch (error) {
    log({
      timestamp: Date.now(),
      type: 'error',
      message: `Erro geral na verificação de oportunidades: ${
        error instanceof Error ? error.message : 'Erro desconhecido'
      }`
    });
  }

  return opportunities;
}

/**
 * Busca cotação de preço na ParaSwap
 */
async function getPriceQuote(
  srcToken: string,
  destToken: string,
  amount: string
): Promise<ParaswapPriceRoute | null> {
  try {
    const response = await axios.get(`${PARASWAP_API}/prices`, {
      params: {
        srcToken,
        destToken,
        amount,
        network: 137, // Polygon
        excludeDEXS: 'ParaSwapPool,ParaSwapLimitOrders'
      }
    });

    return response.data.priceRoute;
  } catch (error) {
    console.error('Erro ao buscar preço:', error);
    return null;
  }
}
