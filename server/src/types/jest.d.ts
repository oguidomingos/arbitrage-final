import { jest } from '@jest/globals';

declare global {
  const jest: typeof jest;
  namespace jest {
    interface Global {
      console: Console;
    }
  }
}