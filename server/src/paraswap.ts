import axios from 'axios';
import { ethers } from 'ethers';
import { TokenInfo, PriceResult, ArbitrageOpportunity, LogCallback } from './types';

const PARA_SWAP_API = "https://api.paraswap.io/prices";

// Token symbols type
type TokenSymbol = 'MATIC' | 'WMATIC' | 'USDC' | 'DAI' | 'WETH' | 'QUICK' | 'SUSHI' | 'AAVE' | 'LINK' | 'WBTC' | 'CRV' | 'BAL' | 'GHST' | 'DPI';

// Cache configuration
interface PriceCache {
  result: PriceResult;
  timestamp: number;
  expiryTime: number;
}

const priceCache: Map<string, PriceCache> = new Map();
const CACHE_DURATION = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 500; // ms

// Função para verificar se uma string é um TokenSymbol válido
function isTokenSymbol(symbol: string): symbol is TokenSymbol {
  return Object.keys(TOKENS).includes(symbol);
}

// Endereços dos contratos na Polygon
const TOKENS: Record<TokenSymbol, TokenInfo> = {
  MATIC: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18 },
  WMATIC: { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18 },
  USDC: { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
  DAI: { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
  WETH: { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
  QUICK: { address: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13", decimals: 18 },
  SUSHI: { address: "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a", decimals: 18 },
  AAVE: { address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", decimals: 18 },
  LINK: { address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", decimals: 18 },
  WBTC: { address: "0x1BFD67037B42Cf73acf2047067bd4F2C47D9BfD6", decimals: 8 },
  CRV: { address: "0x172370d5Cd63279eFa6d502DAB29171933a610AF", decimals: 18 },
  BAL: { address: "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3", decimals: 18 },
  GHST: { address: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7", decimals: 18 },
  DPI: { address: "0x85955046DF4668e1DD369D2DE9f3AEB98DD2A369", decimals: 18 }
};

const INITIAL_AMOUNT = 1000; // $1000 USDC para teste

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCacheKey(srcToken: TokenSymbol, destToken: TokenSymbol, amount: number): string {
  return `${srcToken}-${destToken}-${amount}`;
}

async function getBestPriceWithRetryAndCache(
  srcToken: TokenSymbol,
  destToken: TokenSymbol,
  amount: number,
  retries = MAX_RETRIES
): Promise<PriceResult | null> {
  const cacheKey = getCacheKey(srcToken, destToken, amount);
  const now = Date.now();
  
  // Check cache
  const cachedData = priceCache.get(cacheKey);
  if (cachedData && now < cachedData.expiryTime) {
    return cachedData.result;
  }

  let currentRetry = 0;
  let backoffTime = INITIAL_BACKOFF;

  while (currentRetry < retries) {
    try {
      const decimalsSrc = TOKENS[srcToken].decimals;
      const weiAmount = ethers.parseUnits(amount.toString(), decimalsSrc).toString();

      const response = await axios.get(PARA_SWAP_API, {
        params: {
          srcToken: TOKENS[srcToken].address,
          destToken: TOKENS[destToken].address,
          amount: weiAmount,
          side: "SELL",
          network: 137,
          partner: "coolcline",
          includeDEXS: true,
          excludeDEXS: [],
          excludeContractMethods: [],
        }
      });

      if (!response.data?.priceRoute || response.data.priceRoute.maxImpactReached) {
        return null;
      }

      const priceRoute = response.data.priceRoute;
      const decimalsDest = TOKENS[destToken].decimals;
      const normalizedAmount = Number(ethers.formatUnits(priceRoute.destAmount, decimalsDest));

      const result: PriceResult = {
        amount: normalizedAmount,
        dex: priceRoute.bestRoute[0]?.swaps[0]?.swapExchanges[0]?.exchange || "Unknown"
      };

      // Cache the result
      priceCache.set(cacheKey, {
        result,
        timestamp: now,
        expiryTime: now + CACHE_DURATION
      });

      return result;

    } catch (error: any) {
      if (error.response?.status === 429 && currentRetry < retries - 1) {
        console.log(`Rate limit hit, retrying in ${backoffTime}ms... (Attempt ${currentRetry + 1}/${retries})`);
        await sleep(backoffTime);
        backoffTime *= 2; // Exponential backoff
        currentRetry++;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Erro ao obter preço ${srcToken} → ${destToken}:`, errorMessage);
        return null;
      }
    }
  }

  return null;
}

export async function checkArbitrage(logCallback: LogCallback): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = [];
  const tokensIntermediarios = Object.keys(TOKENS).filter(symbol => symbol !== 'USDC');

  logCallback({
    timestamp: Date.now(),
    type: 'info',
    message: 'Iniciando verificação de oportunidades de arbitragem'
  });

  for (const tokenIntermediario of tokensIntermediarios) {
    if (!isTokenSymbol(tokenIntermediario)) continue;

    logCallback({
      timestamp: Date.now(),
      type: 'info',
      message: `Verificando rota: USDC -> ${tokenIntermediario} -> USDC`
    });

    const step1 = await getBestPriceWithRetryAndCache("USDC", tokenIntermediario, INITIAL_AMOUNT);
    if (!step1) {
      logCallback({
        timestamp: Date.now(),
        type: 'error',
        message: `Falha ao obter preço USDC -> ${tokenIntermediario}`
      });
      continue;
    }

    // Pequeno delay entre as chamadas para evitar rate limiting
    await sleep(500);

    const step2 = await getBestPriceWithRetryAndCache(tokenIntermediario, "USDC", step1.amount);
    if (!step2) {
      logCallback({
        timestamp: Date.now(),
        type: 'error',
        message: `Falha ao obter preço ${tokenIntermediario} -> USDC`
      });
      continue;
    }

    const profit = step2.amount - INITIAL_AMOUNT;
    const profitPercentage = (profit / INITIAL_AMOUNT) * 100;

    logCallback({
      timestamp: Date.now(),
      type: profit > 0 ? 'success' : 'info',
      message: `Lucro potencial: ${profit.toFixed(6)} USDC (${profitPercentage.toFixed(2)}%)`,
      details: {
        route: `USDC -> ${tokenIntermediario} -> USDC`,
        profit,
        dex1: step1.dex,
        dex2: step2.dex
      }
    });

    if (profit > 0) {
      opportunities.push({
        route: `USDC -> ${tokenIntermediario} -> USDC`,
        profit,
        steps: [
          { from: 'USDC', to: tokenIntermediario, amount: INITIAL_AMOUNT, dex: step1.dex },
          { from: tokenIntermediario, to: 'USDC', amount: step1.amount, dex: step2.dex }
        ],
        gasFee: 0, // Será calculado posteriormente
        flashLoanAmount: INITIAL_AMOUNT,
        totalMovimentado: INITIAL_AMOUNT + step1.amount,
        profitPercentage,
        timestamp: Date.now()
      });
    }

    // Delay entre verificações de diferentes tokens
    await sleep(500);
  }

  return opportunities;
}
