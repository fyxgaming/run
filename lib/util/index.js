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
function _bsvNetwork (network) {
  return network.startsWith('main') ? 'mainnet' : 'testnet'
}

/**
 * Converts any value into a short string form usable in error messages and logs.
 * @param {*} x Value to stringify
 */
function _name (x) {
  switch (typeof x) {
    case 'string': return `"${x.length > 10 ? x.slice(0, 10) + '…' : x}"`
    case 'object': return x ? `[object ${x.constructor.name}]` : 'null'
    case 'function': return x.name ? x.name : `[anonymous ${x.toString().startsWith('class') ? 'class' : 'function'}]`
    case 'undefined': return 'undefined'
    default: return x.toString()
  }
}

// -----------------------------------------------------------------------------------------------

module.exports = { _bsvNetwork, _name }
