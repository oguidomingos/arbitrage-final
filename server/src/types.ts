// Interface para informações dos tokens
export interface TokenInfo {
  address: string;
  decimals: number;
}

// Interface para informações de swap
export interface SwapInfo {
  router: string;
  path: string[];
  amountOutMin: string;
}

// Interface para os sinais de execução de arbitragem
export interface ExecutionSignal {
  asset: string;          // Endereço do token para o flash loan
  amount: string;         // Quantidade do flash loan em wei
  swap1: SwapInfo;       // Informações do primeiro swap
  swap2: SwapInfo;       // Informações do segundo swap
}

// Interface para resultados de preços
export interface PriceResult {
  amount: number;
  dex: string;
}

// Interface para logs
export interface LogEntry {
  timestamp: number;
  type: 'info' | 'error' | 'success';
  message: string;
  details?: Record<string, any>;
}

// Tipo para callback de logs
export type LogCallback = (log: LogEntry) => void;

// Interface para oportunidades de arbitragem
export interface ArbitrageOpportunity {
  route: string;
  profit: number;
  steps: Array<{
    from: string;
    to: string;
    amount: number;
    dex: string;
  }>;
  gasFee: number;
  flashLoanAmount: number;
  totalMovimentado: number;
  profitPercentage: number;
  timestamp: number;
}
