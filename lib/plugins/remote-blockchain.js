/**
 * remote-blockchain.js
 *
 * Blockchain implementation that connects to a remote server
 */

// ------------------------------------------------------------------------------------------------
// RemoteBlockchain
// ------------------------------------------------------------------------------------------------

/**
 * A Blockchain implementation that connects to a network API.
 *
 * It provides various local checks, caching, and deduping of network requests. It is used
 * primarily to connect to REST servers like RunConnect and MatterCloud.
 */
class RemoteBlockchain { }

// ------------------------------------------------------------------------------------------------
// Factory
// ------------------------------------------------------------------------------------------------

RemoteBlockchain.create = (options = {}) => {
  const RunConnect = require('./run-connect')
  const MatterCloud = require('./mattercloud')
  const WhatsOnChain = require('./whatsonchain')

  switch (typeof options.api) {
    case 'string':
      switch (options.api) {
        case 'run': return new RunConnect(options)
        case 'bitindex': return new MatterCloud(options)
        case 'mattercloud': return new MatterCloud(options)
        case 'whatsonchain': return new WhatsOnChain(options)
      }
      break
    case 'undefined':
      // Only whatsonchain supports STN right now
      return options.network === 'stn' ? new WhatsOnChain(options) : new RunConnect(options)
  }

  throw new Error(`Invalid blockchain API: ${options.api}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = RemoteBlockchain
