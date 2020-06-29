/**
 * misc.js
 *
 * Various helper methods
 */

const { InternalError } = require('./errors')

// ------------------------------------------------------------------------------------------------
// _kernel
// ------------------------------------------------------------------------------------------------

/**
 * Returns the active kernel
 */
function _kernel () {
  const Kernel = require('./kernel')
  if (!Kernel._instance) throw new Error('Run instance not active')
  return Kernel._instance
}

// ------------------------------------------------------------------------------------------------
// _assert
// ------------------------------------------------------------------------------------------------

function _assert (condition, reason) {
  if (!condition) throw new InternalError(reason || 'assert failed')
}

// ------------------------------------------------------------------------------------------------
// _bsvNetwork
// ------------------------------------------------------------------------------------------------

/**
 * Gets a bsv library network string from a Run network string
 *
 * All networks that start with 'main' are considered mainnet. Everything else is testnet. This
 * lets us have potentially many "testnet" networks - ie. stn, mock, dev - that are clearly
 * distinct from mainnets. There might be multiple "mainnet" networks too if we have a hybrid
 * on-chain and off-chain system such as Overpool, which could be, for example, 'main-overpool'.
 * @param {string} network Run network string
 */
function _bsvNetwork (network) {
  return network.startsWith('main') ? 'mainnet' : 'testnet'
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _kernel,
  _assert,
  _bsvNetwork
}
