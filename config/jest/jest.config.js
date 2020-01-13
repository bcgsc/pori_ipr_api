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
    'app/**/**/*.js'
  ],
  coverageReporters: [
    'clover',
    'text',
    'json',
    'json-summary',
    'lcov'
  ],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        output: '<rootDir>/coverage/xunit.xml'
      }
    ]
  ],
  testRegex: 'test/.*\\.js',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    'test/repo/query/util.js',
    'test/util.js'
  ],
  moduleFileExtensions: [
    'js',
    'json'
  ]
};
