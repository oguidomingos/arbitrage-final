export interface ArbitrageStep {
  from: string;
  to: string;
  dex: string;
  amount?: string;
  expectedOut?: string;
  tokenIn?: string;
  tokenOut?: string;
}

export interface ArbitrageOpportunity {
  steps: ArbitrageStep[];
  timestamp: number;
  profitPercentage: number;
  initialAmount: string;
  expectedReturn: string;
  gasCost?: string;
  path?: string[];
  route?: string;
  profit: number;
  totalMovimentado: number;
  // Execution metadata
  executionStatus?: 'pending' | 'completed' | 'failed';
  executionHash?: string;
  estimatedGasLimit?: string;
  // Additional metadata
  dexPath?: string[];
  tokenPath?: string[];
  priceImpact?: number;
  minimumReceived?: string;
  // New fields for better tracking
  executionTimestamp?: number;
  gasPrice?: string;
  networkFee?: string;
  slippageTolerance?: number;
}

export interface LogEntry {
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  effectiveProfit?: string;
  blockNumber?: number;
  timestamp?: number;
  actualReturnAmount?: string;
  networkFee?: string;
}

// Table types
export interface ArbitrageTableRow {
  timestamp: number;
  route: string;
  profit: number;
  totalMovimentado: number;
  status: string;
  actions: string;
  executionHash?: string;
}

export interface TableColumn {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}
