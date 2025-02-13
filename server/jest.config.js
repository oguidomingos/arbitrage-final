/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: [2345, 2739, 2322]
      }
    }]
  },
  moduleNameMapper: {
    '^../../hardhat/typechain-types$': '<rootDir>/../hardhat/typechain-types'
  },
  setupFiles: ['<rootDir>/src/__tests__/setup.ts']
};