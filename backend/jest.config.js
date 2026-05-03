module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/database*.js',
    '!src/config/migrations.js'
  ],
  setupFilesAfterEnv: [],
  verbose: true
};
