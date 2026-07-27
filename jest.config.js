module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['./tests/setupTests.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  modulePathIgnorePatterns: ['<rootDir>/assets'],
  fakeTimers: {
    enableGlobally: true
  }
};