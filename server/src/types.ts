// Tipos de DEX suportados
export enum DexType {
  UniswapV2 = 'UNISWAP_V2',
  UniswapV3 = 'UNISWAP_V3',
  Curve = 'CURVE'
}

// Informações de swap para um DEX específico
export interface SwapInfo {
  router: string;
  path: string[];
  amountOutMin: string;
  dexType: DexType;
  extraData?: string;
}

// Sinal de execução de arbitragem
export interface ArbitrageSignal {
  asset: string;
  amount: string;
  swaps: SwapInfo[];
}

// Alias para compatibilidade com código existente
export type ExecutionSignal = ArbitrageSignal;

// Resultado da execução da arbitragem
export interface ArbitrageResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  profit?: string;
}

// Informações de rota para logs
interface RouteDetails {
  route: string;
  profit: number;
  dex1: any;
  dex2: any;
}

// Estrutura de log
export interface LogMessage {
  timestamp: number;
  type: 'info' | 'error' | 'opportunity' | 'warning';
  message: string;
  details?: RouteDetails;
}

// Função de callback para logs
export type LogCallback = (message: LogMessage) => void;

// Oportunidade de arbitragem detectada
export interface ArbitrageOpportunity {
  asset: string;
  amount: string;
  expectedProfit: string;
  route?: {
    path: string[];
    exchanges: string[];
  };
  dex1: {
    name: string;
    path: string[];
    fee?: number;
    poolAddress?: string;
    amountIn: string;
    amountOutMin: string;
  };
  dex2: {
    name: string;
    path: string[];
    fee?: number;
    poolAddress?: string;
    amountIn: string;
    amountOutMin: string;
  };
}

// Informações sobre token
export interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

// Resultado de cotação de preço
export interface PriceResult {
  bestRoute: Array<{
    exchange: string;
    srcToken: string;
    destToken: string;
    outputAmount: string;
  }>;
  gasEstimate: string;
  outputAmount: string;
}

// Configuração de monitoramento
export interface MonitoringConfig {
  assets: string[];
  dexs: {
    name: string;
    router: string;
    type: DexType;
  }[];
  minProfitThreshold: string;
  maxGasPrice: string;
  updateInterval: number;
}

// Status da execução do contrato
export interface ContractExecutionStatus {
  status: 'pending' | 'success' | 'failed';
  transactionHash?: string;
  error?: string;
  blockNumber?: number;
  gasUsed?: string;
  actualProfit?: string;
}

// Status da conexão com o provedor
export interface ConnectionStatus {
  connected: boolean;
  chainId?: number;
  blockNumber?: number;
  gasPrice?: string;
  lastUpdate?: Date;
}

// Configuração do adaptador DEX
export interface DexAdapterConfig {
  router: string;
  type: DexType;
  poolAddress?: string;
  fee?: number;
}
