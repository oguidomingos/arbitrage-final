import { jest } from '@jest/globals';

// Mock functions
const mockEncode = jest.fn().mockReturnValue('0x1234');
const mockDecode = jest.fn().mockReturnValue(['0x', '0x']);

// Mock provider
const mockProvider = {
  getNetwork: jest.fn(() => Promise.resolve({ 
    chainId: BigInt(137),
    name: 'polygon'
  }))
};

// Mock wallet
const mockWallet = {
  connect: jest.fn()
};

// Mock AbiCoder class
class MockAbiCoder {
  encode = mockEncode;
  decode = mockDecode;
}

// Mock ethers object
const mockEthers = {
  JsonRpcProvider: jest.fn(() => mockProvider),
  Wallet: jest.fn(() => mockWallet),
  Contract: jest.fn(),
  AbiCoder: jest.fn(() => new MockAbiCoder()),
  isAddress: jest.fn(() => true),
  getAddress: jest.fn(address => address),
  parseUnits: jest.fn(value => value),
  utils: {
    defaultAbiCoder: new MockAbiCoder()
  },
  getBigInt: jest.fn(value => typeof value === 'string' ? BigInt(value) : value)
};

// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockEncode.mockReturnValue('0x1234');
  mockDecode.mockReturnValue(['0x', '0x']);

  // Ensure AbiCoder instance is reset
  mockEthers.AbiCoder.mockClear();
  mockEthers.AbiCoder.mockImplementation(() => new MockAbiCoder());
});

// Mock the ethers module
jest.mock('ethers', () => mockEthers);

// Export mocks for use in tests
export {
  mockEncode,
  mockDecode,
  mockProvider,
  mockWallet,
  mockEthers
};