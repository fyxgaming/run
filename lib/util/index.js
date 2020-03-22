/**
 * util.js
 *
 * Shared utility functions and classes
 */

// -----------------------------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------------------------

/**
 * Gets a bsv library network string from a Run network string
 * 
 * All networks that start with 'main' are considered mainnet. Everything else is testnet. This
 * lets us have potentially many "testnet" networks - ie. stn, mock, dev - that are clearly
 * distinct from mainnets. There might be multiple "mainnet" networks too if we have a hybrid
 * on-chain and off-chain system such as Overpool, which could be, for example, 'main-overpool'.
 * @param {string} network Run network string
 */
function bsvNetwork (network) {
  return network.startsWith('main') ? 'mainnet' : 'testnet'
}

// -----------------------------------------------------------------------------------------------

module.exports = { bsvNetwork }