/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    '<rootDir>/src/test/setup.ts'
  ],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
  ],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
};

module.exports = config; 