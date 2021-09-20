/**
 * local-state.js
 *
 * A local state API that uses the cache to store and retrieve results
 */

const RunSDKState = require('./run-sdk-state')
const LocalCache = require('./local-cache')

// ------------------------------------------------------------------------------------------------
// LocalState
// ------------------------------------------------------------------------------------------------

class LocalState extends RunSDKState {
  constructor (cache) {
    super()

    this.hook(cache || new LocalCache())
  }

  async pull () { /* no-op */ }
}

// ------------------------------------------------------------------------------------------------

module.exports = LocalState
