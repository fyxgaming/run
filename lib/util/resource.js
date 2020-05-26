/**
 * resource.js
 *
 * Identifies resources and makes sense of their properties
 */

const { Address, PublicKey } = require('bsv')
const { _text } = require('./misc')
const StandardLock = require('../extra/standard-lock')

// ------------------------------------------------------------------------------------------------
// _location
// ------------------------------------------------------------------------------------------------

// _location(npresets.location).onchain

function _location (s) {

}

// ------------------------------------------------------------------------------------------------
// _checkSatoshis
// ------------------------------------------------------------------------------------------------

/**
 * The maximum amount of satoshis able to be set on a Jig. Currently 1 BSV. We restrict this
 * for security reasons. TODO: There should be an option to disable this in the future.
 */
const MAX_SATOSHIS = 100000000

/**
 * Checks that the satoshis property of a Jig is a non-negative number within a certain range
 */
function _checkSatoshis (satoshis) {
  if (typeof satoshis !== 'number') throw new Error('satoshis must be a number')
  if (!Number.isInteger(satoshis)) throw new Error('satoshis must be an integer')
  if (isNaN(satoshis) || !isFinite(satoshis)) throw new Error('satoshis must be finite')
  if (satoshis < 0) throw new Error('satoshis must be non-negative')
  if (satoshis > MAX_SATOSHIS) throw new Error(`satoshis must be <= ${MAX_SATOSHIS}`)
}

// ------------------------------------------------------------------------------------------------
// _lockify
// ------------------------------------------------------------------------------------------------

/**
 * Returns the Script object version of this owner, or throws an error
 */
function _lockify (owner, bsvNetwork) {
  if (typeof owner === 'string') {
    // Try parsing it as a public key
    try {
      // Public key owners are converted into address scripts because
      // the public APIs more frequently support P2PKH UTXO queries and
      // we want as much compatibility as posible for the common use case.
      // Public key owners enable encryption that isn't possible with
      // address owners, no matter how the UTXO is represented.
      const pubkey = new PublicKey(owner, { network: bsvNetwork })
      return new StandardLock(pubkey.toAddress().toString())
    } catch (e) { }

    // Try parsing it as an address
    try {
      new Address(owner, bsvNetwork) // eslint-disable-line
      return new StandardLock(owner)
    } catch (e) { }
  }

  // Check if it is a custom owner
  const { Lock } = require('../kernel/api')
  if (owner instanceof Lock) {
    const script = owner.script()
    const Sandbox = require('./sandbox')
    const _hostIntrinsics = Sandbox._instance._hostIntrinsics
    const _sandboxIntrinsics = Sandbox._instance._intrinsics
    if (script instanceof _hostIntrinsics.Uint8Array || script instanceof _sandboxIntrinsics.Uint8Array) {
      return owner
    }
  }

  throw new Error(`Invalid owner: ${_text(owner)}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = { _location, _checkSatoshis, _lockify }
