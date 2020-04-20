# Run

![Last Commit](https://github.com/runonbitcoin/run/workflows/Last%20Commit/badge.svg) ![Nightly Suite](https://github.com/runonbitcoin/run/workflows/Nightly%20Suite/badge.svg) [![codecov](https://codecov.io/gh/runonbitcoin/run/branch/master/graph/badge.svg?token=VPXTBV9CQP)](https://codecov.io/gh/runonbitcoin/run)

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

Various environment variables may be used to configure Run for testing:

### Run

| Name                | Description                                     | Possible Values                      | Default     |
|---------------------|-------------------------------------------------|--------------------------------------|-------------|
| **NETWORK**         | Network string                                  | `mock`, `main`, `test`, `stn`        | `mock`      |
| **PURSE**           | Purse key used                                  | your string privkey                  | `undefined` |
| **PURSE_[network]** | Purse key used on a specific network            | your string privkey                  | `undefined` |
| **LOGGER**          | Whether to log internal messages to the console | `true`, `false`                      | `false`     |
| **API**             | Blockchain API when using mainnet or testnet    | `run`, `mattercloud`, `whatsonchain` | `run`       |
| **APIKEY**          | API key for the blockchain API                  | your string api key                  | `undefined` |
| **APIKEY_[api]**    | API key used with a specific API                | your string api key                  | `undefined` |
| **APP**             | App string provided to Run                      | your app string                      | `''`        |
| **OWNER**           | Owner key used                                  | your string privkey                  | `undefined` |
| **OWNER_[network]** | Owner key used on a specific network            | your string privkey                  | `undefined` |

### Tests

| Name        | Description                                     | Possible Values                                | Default     |
|-------------|-------------------------------------------------|------------------------------------------------|-------------|
| **BROWSER** | Browser used for testing                        | `chrome`, `firefox`, `safari`, `MicrosoftEdge` | `chrome`    |
| **PERF**    | Whether to include performance tests            | `true`, `false`                                | `false`     |

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

## Environment variables

The following environment variables may be set to override global and local settings:

| **Variable** | **Description**               | **Values**                     |
|--------------|-------------------------------|--------------------------------|
| `NETWORK`    | Network string                | main, test, stn, mock          |
| `PURSE`      | Purse private key             | string                         |
| `PURSE_<NETWORK>`      | Purse private key             | string                         |
| `OWNER`      | Owner private key             | string                         |
| `API`        | Blockchain API                | run, whatsonchain, mattercloud |
| `APIKEY`     | Blockchain API key            | string                         |
| `APP`        | App name                      | string                         |
| `LOGGER`     | Whether to log to the console | true or false                  |
