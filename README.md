# Run

[![Last Commit](https://github.com/runonbitcoin/run/workflows/Last%20Commit/badge.svg)](https://github.com/runonbitcoin/run/actions?query=workflow%3A%22Last+Commit%22) [![Nightly Suite](https://github.com/runonbitcoin/run/workflows/Nightly%20Suite/badge.svg)](https://github.com/runonbitcoin/run/actions?query=workflow%3A%22Nightly+Suite%22) [![codecov](https://codecov.io/gh/runonbitcoin/run/branch/master/graph/badge.svg?token=VPXTBV9CQP)](https://codecov.io/gh/runonbitcoin/sandbox)

## Commands

- `npm run lint` - Lint and automatically fix errors
- `npm run build` - Build outputs
- `npm run test` - Test library quickly
- `npm run test:node` - Test the minified node build
- `npm run test:browser` - Test the minified browser build (Chrome default)
- `npm run test:cover` - Collect code coverage
- `npm run deploy` - Redeploy extras to the blockchain
- `npm run bump` - Create a new patch release
- `npm run test test/module/local-purse.js` - Run just the purse tests

## Configuring the tests

Various environment variables may be used to configure the tests:

| Name              | Description                                     | Possible Values                                | Default     |
|-------------------|-------------------------------------------------|------------------------------------------------|-------------|
| `NETWORK`         | Network to test on                              | `mock`, `main`, `test`, `stn`                  | `mock`      |
| `BROWSER`         | Browser used for testing                        | `chrome`, `firefox`, `safari`, `MicrosoftEdge` | `chrome`    |
| `PERF`            | Whether to run the performance tests            | `true`, `false`                                | `false`     |
| `PURSE_[network]` | Purse key used on a specific network            | your string privkey                            | `undefined` |
| `API`             | Blockchain API when not using the mock network  | `run`, `mattercloud`, `whatsonchain`           | `undefined` |
| `APIKEY_[api]`    | API key used with a specific blockchain API     | your string api key                            | `undefined` |
| `LOGGER`          | Whether to log internal messages to the console | `true`, `false`                                | `false`     |

### Examples

- `env BROWSER=safari npm run test:browser` - Test the browser build on Safari
- `env PERF=1 npm run test` - Test library with performance tests
- `env NETWORK=test env PURSE=<funded_private_key> npm run test` - Run all tests on testnet

### .env file

For ease of use, you may also store these variables in a `.env` file where the tests are run. Here's a sample:

```
BROWSER=safari
PURSE_MAIN=<your priate key>
PURSE_TEST=<your private key>
APIKEY_MATTERCLOUD=<your api key>
```