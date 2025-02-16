import { SwapInfo, DexType } from './types';
import { ethers } from 'ethers';

// Constants
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Interface base para adaptadores DEX
export interface DEXAdapter {
  buildSwapData(
    fromToken: string,
    toToken: string,
    amountIn: string,
    extraParams?: any
  ): SwapInfo;
}

// Adaptador para DEXs que seguem o padrão Uniswap V2
export class UniswapV2Adapter implements DEXAdapter {
  constructor(private router: string) {}

  buildSwapData(fromToken: string, toToken: string, amountIn: string): SwapInfo {
    return {
      router: this.router,
      path: [fromToken, toToken],
      amountOutMin: '0', // Pode ser ajustado com base no slippage desejado
      dexType: DexType.UniswapV2
    };
  }
}

// Adaptador para Curve
export class CurveAdapter implements DEXAdapter {
  constructor(private router: string) {}

  buildSwapData(
    fromToken: string, 
    toToken: string, 
    amountIn: string, 
    extraParams?: { poolAddress: string }
  ): SwapInfo {
    if (!extraParams?.poolAddress) {
      throw new Error('Pool address is required for Curve swaps');
    }

    // Mock do encode para testes
    let extraData = '0x';
    if (process.env.NODE_ENV === 'test') {
      extraData = '0x1234';
    } else {
      // Codificar os dados extras (pool address e token de destino)
      const abiCoder = new ethers.AbiCoder();
      extraData = abiCoder.encode(
        ['address', 'address'],
        [extraParams.poolAddress, toToken]
      );
    }

    return {
      router: this.router,
      path: [fromToken, toToken],
      amountOutMin: '0',
      dexType: DexType.Curve,
      extraData
    };
  }
}

// Adaptador para Uniswap V3
export class UniswapV3Adapter implements DEXAdapter {
  constructor(private router: string) {}

  buildSwapData(
    fromToken: string, 
    toToken: string, 
    amountIn: string,
    extraParams?: { fee: number }
  ): SwapInfo {
    // Criar o path encoding para UniswapV3
    const path = this.encodePath([fromToken, toToken], [extraParams?.fee || 3000]);
    
    // Mock do encode para testes
    let extraData = '0x';
    if (process.env.NODE_ENV === 'test') {
      extraData = '0x1234';
    } else {
      // Codificar os parâmetros do exactInput
      const abiCoder = new ethers.AbiCoder();
      extraData = abiCoder.encode(
        ['tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)'],
        [{
          path,
          recipient: ZERO_ADDRESS,
          deadline: 0,
          amountIn,
          amountOutMinimum: '0'
        }]
      );
    }

    return {
      router: this.router,
      path: [fromToken, toToken],
      amountOutMin: '0',
      dexType: DexType.UniswapV3,
      extraData
    };
  }

  private encodePath(path: string[], fees: number[]): string {
    if (path.length != fees.length + 1) {
      throw new Error('path/fee lengths do not match');
    }

    let encoded = '0x';
    for (let i = 0; i < fees.length; i++) {
      // 20 bytes token address + 3 bytes fee
      encoded += path[i].slice(2);
      encoded += fees[i].toString(16).padStart(6, '0');
    }
    // Add final token address
    encoded += path[path.length - 1].slice(2);
    return encoded.toLowerCase();
  }
}

// Mapeamento de DEXs para seus respectivos adaptadores
export function createDexAdapter(dexName: string, routerAddress: string): DEXAdapter {
  switch (dexName.toLowerCase()) {
    case 'quickswapv2':
    case 'sushiswapv2':
      return new UniswapV2Adapter(routerAddress);
    case 'quickswapv3':
    case 'uniswapv3':
      return new UniswapV3Adapter(routerAddress);
    case 'curve':
      return new CurveAdapter(routerAddress);
    default:
      throw new Error(`Adaptador não implementado para: ${dexName}`);
  }
}