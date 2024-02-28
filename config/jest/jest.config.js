// main jest configuration file
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../..');

module.exports = {
  rootDir: BASE_DIR,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'app/**.js',
    'app/**/*.js',
    'app/**/**/*.js',
  ],
  coverageReporters: [
    'clover',
    'text',
    'json',
    'json-summary',
    'lcov',
  ],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
      },
    ],
  ],
  testRegex: 'test/.*\\.test\\.js',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    'test/repo/query/util.js',
    'test/util.js',
    'test/testData/',
    '.*.mock.js',
    'test/keys',
  ],
  moduleFileExtensions: [
    'js',
    'json',
  ],
  setupFiles: [
    '<rootDir>/test/keycloak.mock.js',
    '<rootDir>/test/graphkb.mock.js',
    '<rootDir>/config/jest/jestSetup.js',
  ],
  testTimeout: 10000,
};
