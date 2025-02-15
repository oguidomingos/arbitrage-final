A integração entre a lógica de execução e o servidor de monitoramento deve ser realizada de maneira a garantir que, quando o monitor detectar uma oportunidade de arbitragem, ele envie um sinal (payload) para o módulo executor, que por sua vez processará esse sinal e iniciará a transação. A seguir, veja um conjunto de instruções passo a passo para realizar essa integração:

1. Preparação do Ambiente
	•	Confirme as Dependências Comuns:
	•	Certifique-se de que tanto o servidor de monitoramento quanto o módulo executor estão usando a mesma configuração de variáveis de ambiente (por exemplo, RPC URL, chaves privadas e endereços dos contratos).
	•	Garanta que os pacotes necessários (como dotenv, ethers, EventEmitter ou BullMQ, se for o caso) estejam instalados e configurados corretamente.
	•	Revisão dos Módulos:
	•	Executor: O módulo executor (por exemplo, executor.ts) deve exportar uma função como executeArbitrage(signal: ExecutionSignal): Promise<void> que trate a montagem e o envio da transação.
	•	Monitor: O módulo de monitoramento deve ser capaz de detectar oportunidades (por exemplo, por meio de análise de preços, variações de liquidez ou eventos on-chain) e emitir um sinal contendo os dados necessários (do tipo ExecutionSignal).

2. Escolha do Mecanismo de Comunicação

Você pode optar por uma das abordagens abaixo para conectar o monitor ao executor:
	•	EventEmitter (Integração Simples):
	•	Implemente um EventEmitter no servidor para disparar um evento (por exemplo, "opportunityDetected") sempre que uma oportunidade for identificada.
	•	Registre um ouvinte (listener) que receba esse evento e invoque executeArbitrage() com o payload recebido.
	•	Sistema de Filas (ex.: BullMQ):
	•	Configure uma fila para processar os sinais de arbitragem.
	•	O monitor insere o sinal na fila e o executor (ou um worker dedicado) consome a fila e executa a transação.
	•	Essa abordagem traz maior resiliência, pois permite retry e gerenciamento de backoff em caso de falhas.

3. Implementação com EventEmitter

Se optar por EventEmitter, a integração pode ser feita da seguinte forma:
	1.	Crie um Módulo de Eventos:

// events.ts
import { EventEmitter } from 'events';

export const arbitrageEvents = new EventEmitter();


	2.	No Monitor, Emitir o Evento ao Detectar Oportunidade:

// monitor.ts (ou parte do seu servidor de monitoramento)
import { arbitrageEvents } from './events';
import { ExecutionSignal } from './types';

function detectOpportunity(): void {
  // Lógica para identificar a oportunidade de arbitragem
  const signal: ExecutionSignal = {
    receiverAddress: '0xReceiverAddress',
    assets: ['0xToken1', '0xToken2'],
    amounts: ['1000000000000000000', '2000000000000000000'],
    interestRateModes: [0, 0],
    onBehalfOf: '0xOnBehalfAddress',
    params: '0x',
  };

  // Quando a oportunidade for detectada, emite o sinal
  arbitrageEvents.emit('opportunityDetected', signal);
}

// Exemplo de invocação periódica ou com base em algum gatilho:
setInterval(detectOpportunity, 10000); // A cada 10 segundos


	3.	No Executor, Registre o Ouvinte para Processar o Sinal:

// integration.ts (ou no entry point do servidor)
import { arbitrageEvents } from './events';
import { executeArbitrage } from './executor';
import { ExecutionSignal } from './types';

// Função para lidar com o evento e chamar a lógica de execução
arbitrageEvents.on('opportunityDetected', async (signal: ExecutionSignal) => {
  console.log('Oportunidade detectada, iniciando arbitragem...');
  try {
    await executeArbitrage(signal);
    console.log('Arbitragem executada com sucesso.');
  } catch (error) {
    console.error('Falha na execução da arbitragem:', error);
    // Aqui, você pode implementar retry ou registrar a falha para análise futura
  }
});

4. Implementação com Sistema de Filas (BullMQ)

Caso opte por um sistema de filas para maior resiliência:
	1.	Instale o BullMQ:

npm install bullmq


	2.	Configure a Fila e o Worker:

// queue.ts
import { Queue, Worker } from 'bullmq';
import { executeArbitrage } from './executor';
import { ExecutionSignal } from './types';

// Configure a fila com as opções necessárias (ex.: conexão Redis)
const arbitrageQueue = new Queue('arbitrageQueue', {
  connection: { host: '127.0.0.1', port: 6379 },
});

// Crie o worker que processará os sinais
const worker = new Worker('arbitrageQueue', async (job) => {
  const signal = job.data as ExecutionSignal;
  console.log('Processando arbitragem via fila...');
  await executeArbitrage(signal);
}, {
  connection: { host: '127.0.0.1', port: 6379 },
  // Configurações de retry, backoff, etc.
});

export { arbitrageQueue };


	3.	No Monitor, Adicione o Sinal à Fila:

// monitor.ts
import { arbitrageQueue } from './queue';
import { ExecutionSignal } from './types';

function detectOpportunity(): void {
  // Lógica para identificar a oportunidade de arbitragem
  const signal: ExecutionSignal = {
    receiverAddress: '0xReceiverAddress',
    assets: ['0xToken1', '0xToken2'],
    amounts: ['1000000000000000000', '2000000000000000000'],
    interestRateModes: [0, 0],
    onBehalfOf: '0xOnBehalfAddress',
    params: '0x',
  };

  // Adicione o sinal à fila
  arbitrageQueue.add('executeArbitrageJob', signal);
}

setInterval(detectOpportunity, 10000); // Exemplo: verificação a cada 10 segundos

5. Critérios de Integração e Testes de Fluxo
	•	Testes de Integração:
	•	Verifique se o monitor dispara corretamente o evento (ou adiciona o job na fila) ao identificar uma oportunidade.
	•	Confirme que o executor recebe o sinal e que a função executeArbitrage() é chamada com os parâmetros corretos.
	•	Simule cenários de sucesso e falha (ex.: falha na conexão com o provedor ou erro na transação) e valide que os mecanismos de retry e logging funcionam conforme o esperado.
	•	Logs e Monitoramento:
	•	Garanta que os logs informem o início do processamento, sucesso na execução e eventuais erros.
	•	Configure alertas ou notificações (se necessário) para monitorar a saúde do sistema durante a execução.

Conclusão

Você pode escolher entre uma abordagem simples com EventEmitter ou uma mais robusta utilizando um sistema de filas como o BullMQ. Ambas as abordagens garantem que o monitor de oportunidades se integre de forma transparente com a lógica de execução do módulo executor. Após configurar e testar essa integração em ambiente controlado (preferencialmente com Hardhat fork), o sistema estará pronto para ser movido para etapas de testes de integração completos e, posteriormente, para produção.

Essas instruções fornecem um roteiro claro para integrar a detecção de oportunidades com a execução da arbitragem, permitindo que cada componente se comunique de maneira robusta e resiliente.