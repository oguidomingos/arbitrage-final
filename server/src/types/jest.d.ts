import '@jest/types';

declare global {
  namespace jest {
    interface Matchers<R> {
      // Adicione aqui quaisquer matchers personalizados que você precise
    }
  }
}