module.exports = {
  cacheDirectory: '.jest/cache',
  coverageDirectory: '.jest/coverage',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  collectCoverageFrom: ['src/**/*.ts'],
  rootDir: ".",
  moduleNameMapper: {
    '^jobs/(.*)$': '<rootDir>/src/jobs/$1',
    '^app/(.*)$': '<rootDir>/src/app/$1',
    '^common/(.*)$': '<rootDir>/src/common/$1',
    '^http/(.*)$': '<rootDir>/src/http/$1',
  },
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  setupFiles: ['dotenv/config'],
};
