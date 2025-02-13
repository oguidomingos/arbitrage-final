// Configuração do ambiente de teste
process.env.RPC_URL = 'http://mock.rpc.url';
process.env.PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
process.env.ARBITRAGE_EXECUTOR_ADDRESS = '0x1234567890123456789012345678901234567890';

// Mock global das promises para testes
global.Promise = jest.requireActual('promise');

// Desativar logs durante os testes
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};