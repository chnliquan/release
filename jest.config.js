// https://jestjs.io/docs/en/configuration#defaults
module.exports = {
  // automock: true,
  roots: ['<rootDir>/test'],
  clearMocks: true,
  coverageDirectory: 'coverage',
  testRegex: 'test/(.+)\\.spec\\.(jsx?|tsx?)$',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
}
