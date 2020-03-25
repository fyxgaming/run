# Run

![Last Commit](https://github.com/runonbitcoin/run/workflows/Last%20Commit/badge.svg) ![Nightly Suite](https://github.com/runonbitcoin/run/workflows/Nightly%20Suite/badge.svg) [![codecov](https://codecov.io/gh/runonbitcoin/run/branch/master/graph/badge.svg?token=VPXTBV9CQP)](https://codecov.io/gh/runonbitcoin/run)

## Commands

- `npm run lint` - Lint and automatically fix errors
- `npm run build` - Build outputs
- `npm run test` - Test library quickly
- `npm run test:node` - Test the minified node build
- `npm run test:browser` - Test the minified browser build (Chrome default)
- `npm run test:cover` - Collect code coverage
- `npm run bump` - Create a new patch release
- `npm run test test/module/local-purse.js` - Run just the purse tests

## Configuring the Tests

Various environment variables may be used to configure the tests:

| Name        | Description                                     | Possible Values                                | Default     |
|-------------|-------------------------------------------------|------------------------------------------------|-------------|
| **NETWORK** | Network to run the tests on                     | `mock`, `main`, `test`                         | `mock`      |
| **PURSE**   | Purse key used on mainnet or testnet            | your string privkey                            | `undefined` |
| **BROWSER** | Browser used for testing                        | `chrome`, `firefox`, `safari`, `MicrosoftEdge` | `chrome`    |
| **LOGGER**  | Whether to log internal messages to the console | `true`, `false`                                | `false`     |
| **PERF**    | Whether to run performance tests                | `true`, `false`                                | `false`     |
| **API**     | Blockchain API when using mainnet or testnet    | `run`, `mattercloud`, `whatsonchain`           | `run`       |
| **APIKEY**  | API key for the blockchain API                  | your string api key                            | `undefined` |

### Examples

- `env BROWSER=safari npm run test:browser` - Test the browser build on Safari
- `env PERF=1 npm run test` - Test library with performance tests
- `env NETWORK=test env PURSE=<funded_private_key> npm run test` - Run all tests on testnet

### Storing Keys

For ease of use, Run lets you store `testnet` and `mainnet` keys to avoid having to pass them as environment variables. Run will read your keys from `~/.keys.json`. The format is:

```
{
    "tests": {
        "test": "<your testnet key here>",
        "main": "<your mainnet key here>",
        "matterCloudApiKey": "<your mattercloud api key here>"
    },
}
```