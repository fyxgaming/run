# Run

![Last Commit](https://github.com/runonbitcoin/run/workflows/Last%20Commit/badge.svg) ![Nightly Suite](https://github.com/runonbitcoin/run/workflows/Nightly%20Suite/badge.svg) [![codecov](https://codecov.io/gh/runonbitcoin/run/branch/master/graph/badge.svg?token=IoAqrMTgqc)](https://codecov.io/gh/runonbitcoin/run)

## Commands

- `npm run lint` - Lint and automatically fix errors
- `npm run build` - Build outputs
- `npm run test` - Test library quickly
- `npm run test:node` - Test the minified node build
- `npm run test:browser` - Test the minified browser build (Firefox default)
- `env BROWSER=safari npm run test:browser` - Test the minified browser build on Safari
- `npm run test:cover` - Collect code coverage
- `npm run test test/adder.js` - Run just the adder tests
- `env PERF=1 npm run test` - Test library with performance tests
- `npm run bump` - Create a new patch release
