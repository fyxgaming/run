/**
 * keys.js
 *
 * Loads the user stored keys from ~/.keys.json
 */

const path = require('path')
const fs = require('fs')
const os = require('os')

// ------------------------------------------------------------------------------------------------
// addUserKeysToEnvironment
// ------------------------------------------------------------------------------------------------

function addUserKeystoEnvironment () {
  // Use the user's ~/.keys.json if some settings are left unspecified
  const keysPath = path.join(os.homedir(), '.keys.json')
  if (fs.existsSync && fs.existsSync(keysPath)) {
    const keys = JSON.parse(fs.readFileSync(keysPath).toString('utf8'))
    if (keys && keys.tests) {
      if (process.env.API === 'mattercloud' && !process.env.APIKEY) {
        process.env.APIKEY = keys.tests.matterCloudApiKey
      }
      if (process.env.NETWORK && !process.env.PURSE && keys.tests[process.env.NETWORK]) {
        process.env.PURSE = keys.tests[process.env.NETWORK]
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = addUserKeystoEnvironment
