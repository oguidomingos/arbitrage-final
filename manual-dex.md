A seguir, um manual detalhado para lidar com interfaces e mecanismos de swap diferentes em seu sistema de arbitragem, permitindo que cada swap seja configurado de acordo com o DEX correspondente.

1. Compreendendo as Diferenças entre as Interfaces de Swap

Cada DEX pode ter:
	•	Assinaturas de funções distintas:
Por exemplo, a QuickSwap (baseada no padrão Uniswap V2) geralmente utiliza funções como swapExactTokensForTokens(), enquanto o Curve usa funções específicas para stablecoins, e outros protocolos podem ter assinaturas próprias.
	•	Parâmetros diferentes:
Alguns DEXs exigem parâmetros como amountIn, amountOutMin, path, deadline, enquanto outros podem ter parâmetros extras ou utilizar uma lógica interna diferente.
	•	Mecanismos de execução distintos:
Por exemplo, alguns DEXs podem utilizar uma taxa fixa, outros uma taxa dinâmica ou apresentar funcionalidades de front-running protection.

2. Abordagem com Adaptadores (Adapters)

Para lidar com essa variabilidade, a estratégia recomendada é criar adaptadores para cada DEX. Cada adaptador é um módulo (ou contrato) que traduz a chamada genérica de swap para a chamada específica do DEX.

Benefícios dos Adaptadores
	•	Abstração: O contrato ou o módulo principal de arbitragem não precisa conhecer os detalhes internos de cada DEX.
	•	Modularidade: Se um DEX atualizar sua interface, você só precisa atualizar o adaptador correspondente.
	•	Facilidade de Testes: Cada adaptador pode ser testado de forma isolada, garantindo que a tradução dos parâmetros seja correta.

3. Estrutura Genérica para Passar Interfaces e Parâmetros

3.1. Estrutura de Dados Genérica (ExecutionSignal)

Crie uma estrutura que contenha os dados mínimos necessários para um swap. Exemplo em TypeScript:

export interface SwapData {
  router: string;         // Endereço do router a ser utilizado
  path: string[];         // Array com os endereços dos tokens no caminho do swap
  amountOutMin: string;   // Quantidade mínima esperada na saída (pode ser zero para testes)
  extraData?: string;     // Parâmetros adicionais, se necessário para DEXs com requisitos extras
}

export interface ExecutionSignal {
  asset: string;          // Token que será utilizado no flash loan ou como ativo principal
  amount: string;         // Quantidade a ser utilizada
  swap1: SwapData;        // Dados para o primeiro swap
  swap2: SwapData;        // Dados para o segundo swap
  // Você pode adicionar mais swaps se a lógica for mais complexa
}

3.2. Construção do Sinal para Cada Swap

Ao construir o sinal de execução, use os adaptadores para converter os parâmetros específicos de cada DEX. Por exemplo:
	•	Para DEXs padrão (QuickSwap V3, SushiSwap, etc.):
Use um adaptador que mapeie os parâmetros da interface padrão (ex.: swapExactTokensForTokens).
	•	Para DEXs com interface específica (Curve, Balancer, etc.):
Use um adaptador que construa os parâmetros conforme a função exigida.

Exemplo de Pseudocódigo para um Adaptador Genérico

interface DEXAdapter {
  // Converte dados genéricos de swap para os parâmetros específicos do DEX
  buildSwapData(
    fromToken: string,
    toToken: string,
    amountIn: string,
    extraParams?: any // Parâmetros adicionais, se necessário
  ): SwapData;
}

// Adaptador para DEXs que seguem o padrão Uniswap V2
class UniswapV2Adapter implements DEXAdapter {
  private router: string;
  constructor(router: string) {
    this.router = router;
  }

  buildSwapData(fromToken: string, toToken: string, amountIn: string): SwapData {
    return {
      router: this.router,
      path: [fromToken, toToken],
      amountOutMin: '0', // Pode ser calculado com base em slippage desejado
    };
  }
}

// Adaptador para Curve, que pode precisar de parâmetros extras
class CurveAdapter implements DEXAdapter {
  private router: string;
  constructor(router: string) {
    this.router = router;
  }

  buildSwapData(fromToken: string, toToken: string, amountIn: string, extraParams: any): SwapData {
    // extraParams pode incluir o índice dos tokens, poolId, etc.
    // Exemplo: { i: 0, j: 1, minAmountOut: '0' }
    return {
      router: this.router,
      path: [fromToken, toToken],
      amountOutMin: extraParams.minAmountOut || '0',
      extraData: JSON.stringify(extraParams)
    };
  }
}

3.3. Uso dos Adaptadores na Construção do Sinal

No seu código de monitor ou construção de sinal (por exemplo, no index.ts), você pode fazer algo como:

// Supondo que você tenha um mapeamento de DEX para adaptador:
const DEX_ADAPTERS: { [dex: string]: DEXAdapter } = {
  'quickswapv3': new UniswapV2Adapter(DEX_ROUTER_MAP['quickswapv3']),
  'curvev1': new CurveAdapter(DEX_ROUTER_MAP['curve']), // Ajuste os parâmetros conforme necessário
  // Adicione os demais adaptadores
};

// Função para construir um sinal de execução para uma oportunidade:
function buildExecutionSignal(opportunity: ArbitrageOpportunity): ExecutionSignal {
  const asset = TOKEN_ADDRESS_MAP[opportunity.steps[0].from.toUpperCase()];
  const amount = opportunity.flashLoanAmount.toString();

  // Obter adaptadores para cada DEX
  const adapterSwap1 = DEX_ADAPTERS[normalizeDexName(opportunity.steps[0].dex)];
  const adapterSwap2 = DEX_ADAPTERS[normalizeDexName(opportunity.steps[1].dex)];

  if (!adapterSwap1 || !adapterSwap2) {
    throw new Error('Adaptador não encontrado para um dos DEXs envolvidos');
  }

  // Construir os dados do swap
  const swap1 = adapterSwap1.buildSwapData(
    asset,
    TOKEN_ADDRESS_MAP[opportunity.steps[0].to.toUpperCase()],
    amount
    // Aqui, se necessário, passe extraParams para o adaptador (por exemplo, índices para Curve)
  );

  const swap2 = adapterSwap2.buildSwapData(
    TOKEN_ADDRESS_MAP[opportunity.steps[1].from.toUpperCase()],
    asset,
    amount
  );

  return {
    asset,
    amount,
    swap1,
    swap2,
  };
}

4. Recomendações de Testes e Integração
	1.	Testes Unitários dos Adaptadores:
Crie testes para garantir que cada adaptador retorne um objeto SwapData correto dado um conjunto de parâmetros.
	•	Verifique que para o adaptador do Uniswap V2 o array path contenha exatamente os endereços dos tokens.
	•	Para o adaptador do Curve, verifique se os parâmetros extras (se fornecidos) são incorporados corretamente.
	2.	Testes de Integração:
Integre os adaptadores com o módulo de execução e simule oportunidades de arbitragem para verificar se o sinal de execução construído possui todos os dados no formato esperado.
	3.	Tratamento de Erros:
Implemente verificações para assegurar que, se um adaptador não estiver disponível ou se os dados forem inválidos, o sistema lance um erro com mensagem clara, permitindo o diagnóstico rápido do problema.

5. Resumo
	•	Cada DEX pode ter uma interface e mecanismo de swap diferente.
	•	A abordagem recomendada é utilizar adaptadores:
Cada adaptador recebe parâmetros genéricos e retorna um objeto SwapData formatado conforme a interface específica do DEX.
	•	Crie uma interface padrão (como DEXAdapter) e implemente adaptadores para cada DEX utilizado.
	•	Construa o objeto ExecutionSignal utilizando os adaptadores para cada swap, garantindo que todos os parâmetros (como endereços, caminho de tokens, e valores mínimos) estejam corretos.
	•	Teste exaustivamente cada adaptador e a integração completa para assegurar que o sistema possa operar com diversos DEXs sem necessidade de alterar a lógica central.

Esse manual deve servir como guia para implementar e integrar as diferentes interfaces de swap no seu sistema de arbitragem, proporcionando flexibilidade e facilidade para futuras expansões ou adaptações a novos protocolos.