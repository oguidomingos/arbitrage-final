Para desenvolver um aplicativo de arbitragem que utilize a API aberta da ParaSwap para pesquisa de preços de tokens em diferentes DEXs e o protocolo Aave para executar flash loans e potencializar os lucros da arbitragem, é fundamental garantir que o recurso de empréstimo (borrowing) esteja habilitado no Aave para os tokens desejados. Isso pode ser verificado consultando o parâmetro borrowingEnabled para cada ativo.

Passos para verificar se o borrowing está habilitado:
	1.	Obter a Lista de Tokens Suportados:
	•	Antes de realizar swaps, é essencial conhecer os tokens suportados pela ParaSwap. A ParaSwap fornece um endpoint para recuperar essa lista:
	•	Requisição: GET https://api.paraswap.io/v2/tokens/137 (para a rede Polygon)
	2.	Consultar o Estado de Empréstimo dos Tokens no Aave:
	•	Utilize a API do Aave para verificar se o borrowing está habilitado para os tokens de interesse. A Aave oferece endpoints que fornecem dados sobre os ativos disponíveis e suas configurações.
	•	Requisição: GET /data/markets na API do Aave
	•	Resposta Esperada: A resposta incluirá informações detalhadas sobre cada ativo, incluindo o campo borrowingEnabled que indica se o empréstimo está habilitado para aquele token.
	3.	Implementação no Aplicativo:
	•	Busca de Preços e Melhores Rotas:
	•	Implemente um servidor que consulta a API da ParaSwap a cada 3 segundos para obter as melhores rotas de compra e venda de um token. A lógica seria: USDC -> Token Intermediário -> USDC.
	•	Utilize o endpoint /prices da ParaSwap para obter informações como:
	•	exchange: Nome da DEX (e.g., “UniswapV3”)
	•	gasCostUSD: Custo estimado de gás em USD
	•	fee: Taxa aplicada
    *   price: Preço praticado em cada dex
	•	Exemplo de Requisição:

GET https://api.paraswap.io/prices?srcToken=<endereço_srcToken>&srcDecimals=<decimais_srcToken>&destToken=<endereço_destToken>&destDecimals=<decimais_destToken>&amount=<quantidade>&side=SELL


	•	Identificação de Oportunidades de Arbitragem:
	•	Ao identificar oportunidades de swap lucrativas (considerando estimativas de taxas de gás e custos de flash loan), o servidor deve interagir com contratos inteligentes para executar as operações necessárias.
	•	Considerações Importantes:
	•	Certifique-se de que o token desejado tenha o borrowing habilitado no Aave (borrowingEnabled: true).
	•	Calcule o lucro potencial levando em conta todas as taxas envolvidas.
	•	Utilize flash loans do Aave para alavancar as operações de arbitragem sem a necessidade de capital inicial.

Referências:
	•	Documentação da API da ParaSwap
	•	Documentação do Aave V3
	•	Flash Loans no Aave

Ao seguir esses passos, você poderá desenvolver um aplicativo de arbitragem eficiente que integra as APIs da ParaSwap e do Aave, garantindo que as operações sejam realizadas apenas com tokens que possuem o recurso de borrowing habilitado.