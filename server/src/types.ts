export interface TokenInfo {
  address: string;
  decimals: number;
}

export interface PriceResult {
  amount: number;
  dex: string;
}

export interface ArbitrageOpportunity {
  route: string;
  profit: number;
  steps: {
    from: string;
    to: string;
    amount: number;
    dex: string;
  }[];
  gasFee: number;
  flashLoanAmount: number;
  totalMovimentado: number;
  profitPercentage: number;
  timestamp: number;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error';
  details?: {
    route?: string;
    profit?: number;
    dex1?: string;
    dex2?: string;
  };
}

export type LogCallback = (log: LogEntry) => void;
