/**
 * run-connect.js
 *
 * RUN Connect API that can be used as both a Blockchain and Cache implementation
 */

// ------------------------------------------------------------------------------------------------
// RunConnect
// ------------------------------------------------------------------------------------------------

class RunConnect {
  /**
   * @param {?object} options Optional configurations options
   * @param {?string} options.network Network string. Defaults to main.
   */
  constructor (options = {}) {
    this.network = parseNetwork(options.network)
  }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseNetwork (network) {
  if (typeof network === 'undefined') return 'main'
  if (network !== 'main' && network !== 'test') throw new Error(`Unsupported network: ${network}`)
  return network
}

// ------------------------------------------------------------------------------------------------

module.exports = RunConnect
