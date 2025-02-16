import { describe, expect, it, beforeEach } from '@jest/globals';
import { UniswapV2Adapter, UniswapV3Adapter, CurveAdapter } from '../adapters';
import { DexType } from '../types';
import { mockEncode, mockDecode } from './setup';

// Constants
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('DEX Adapters', () => {
  const mockRouterAddress = '0x1234567890123456789012345678901234567890';
  const mockTokenA = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const mockTokenB = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const mockAmount = '1000000000000000000'; // 1 ETH em wei

  beforeEach(() => {
    mockEncode.mockClear();
    mockDecode.mockClear();
    mockEncode.mockReturnValue('0x1234');
    mockDecode.mockReturnValue(['0x', '0x']);
  });

  describe('UniswapV2Adapter', () => {
    const adapter = new UniswapV2Adapter(mockRouterAddress);

    it('deve construir SwapData corretamente', () => {
      const swapData = adapter.buildSwapData(mockTokenA, mockTokenB, mockAmount);

      expect(swapData).toEqual({
        router: mockRouterAddress,
        path: [mockTokenA, mockTokenB],
        amountOutMin: '0',
        dexType: DexType.UniswapV2
      });
      
      expect(mockEncode).not.toHaveBeenCalled();
    });
  });

  describe('UniswapV3Adapter', () => {
    const adapter = new UniswapV3Adapter(mockRouterAddress);

    it('deve construir SwapData com parâmetros padrão', () => {
      const swapData = adapter.buildSwapData(mockTokenA, mockTokenB, mockAmount);

      expect(swapData).toEqual({
        router: mockRouterAddress,
        path: [mockTokenA, mockTokenB],
        amountOutMin: '0',
        dexType: DexType.UniswapV3,
        extraData: '0x1234'
      });

      const expectedPath = `0x${mockTokenA.slice(2)}${(3000).toString(16).padStart(6, '0')}${mockTokenB.slice(2)}`;

      expect(mockEncode).toHaveBeenCalledWith(
        ['tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)'],
        [{
          path: expectedPath.toLowerCase(),
          recipient: ZERO_ADDRESS,
          deadline: 0,
          amountIn: mockAmount,
          amountOutMinimum: '0'
        }]
      );
    });

    it('deve construir SwapData com fee personalizada', () => {
      const customFee = 500;
      const swapData = adapter.buildSwapData(mockTokenA, mockTokenB, mockAmount, { fee: customFee });

      expect(swapData.dexType).toBe(DexType.UniswapV3);
      expect(swapData.extraData).toBe('0x1234');

      const expectedPath = `0x${mockTokenA.slice(2)}${customFee.toString(16).padStart(6, '0')}${mockTokenB.slice(2)}`;

      expect(mockEncode).toHaveBeenCalledWith(
        ['tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)'],
        [{
          path: expectedPath.toLowerCase(),
          recipient: ZERO_ADDRESS,
          deadline: 0,
          amountIn: mockAmount,
          amountOutMinimum: '0'
        }]
      );
    });
  });

  describe('CurveAdapter', () => {
    const adapter = new CurveAdapter(mockRouterAddress);
    const mockPoolAddress = '0xcccccccccccccccccccccccccccccccccccccccc';

    it('deve lançar erro se poolAddress não for fornecido', () => {
      expect(() => {
        adapter.buildSwapData(mockTokenA, mockTokenB, mockAmount);
      }).toThrow('Pool address is required for Curve swaps');
    });

    it('deve construir SwapData corretamente com pool address', () => {
      const swapData = adapter.buildSwapData(
        mockTokenA,
        mockTokenB,
        mockAmount,
        { poolAddress: mockPoolAddress }
      );

      expect(swapData).toEqual({
        router: mockRouterAddress,
        path: [mockTokenA, mockTokenB],
        amountOutMin: '0',
        dexType: DexType.Curve,
        extraData: '0x1234'
      });

      expect(mockEncode).toHaveBeenCalledWith(
        ['address', 'address'],
        [mockPoolAddress, mockTokenB]
      );
    });
  });
});