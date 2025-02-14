import { jest } from '@jest/globals';

// Configurar timeout global para os testes
jest.setTimeout(10000);

// Helper para avançar timers e resolver promessas pendentes
declare global {
  // eslint-disable-next-line no-var
  var advanceTimersAndPromises: (ms: number) => Promise<void>;
}

global.advanceTimersAndPromises = async (ms: number) => {
  jest.advanceTimersByTime(ms);
  // Esperar promessas pendentes serem resolvidas
  await Promise.resolve();
  await new Promise(resolve => setImmediate(resolve));
};

export {};