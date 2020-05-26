/**
 * resource.js
 *
 * Identifies resources and makes sense of their properties
 */

const { Address, PublicKey } = require('bsv')
const { _text } = require('./misc')
const StandardLock = require('../extra/standard-lock')

/**
 * The maximum amount of satoshis able to be set on a resource. Currently 1 BSV. We restrict this
 * for security during development. There will be an option to disable this in the future.
 */
const MAX_SATOSHIS = 100000000

// Location regexes
const ERROR_LOCATION = /^(?<protocol>error):\/\/(?<error>.+)$/
const TEMP_LOCATION = /^(?<protocol>temp):\/\/(?<txid>[a-f0-9]+)_(?:(?:o(?<vout>[0-9]+))|(?:i(?<vin>[0-9]+)))$/
const RESOURCE_LOCATION = /^(?:(?<desc>[A-Za-z0-9_]+?)__)?(?:(?<berrytxid>[a-f0-9]+)_(?:(?:o(?<berryvout>[0-9]+))|(?:i(?<berryvin>[0-9]+)))_)?(?<txid>[a-f0-9]+)_(?:(?:o(?<vout>[0-9]+))|(?:i(?<vin>[0-9]+)))$/

// ------------------------------------------------------------------------------------------------
// _location
// ------------------------------------------------------------------------------------------------

/*
 * Parses a location string
 *
 * Locations are basically URLs for the blockchain. Run uses them to uniquely identify a resource.
 * All onchain locations are designed to be double-clickable and also lower-case. The allowed
 * characters are a-z, 0-9, and underscore.
 *
 * The most basic location is a jig location. It is a transaction id and an output index:
 *
 *    0000000000000000000000000000000000000000000000000000000000000000_o1
 *
 * Code locations also have the same format. Both jig and code locations may refer an output or an
 * input. Inputs just end with _iN instead of _oN and are the outputs being spent.
 *
 *    0000000000000000000000000000000000000000000000000000000000000000_i1
 *
 * Any location may have extra information in front as a description. This description is separated
 * with a double-undlescore from the rest of the location. It may also have upper-case letters.
 *
 *    bitpets_dragon_0000000000000000000000000000000000000000000000000000000000000000_o1
 *
 *    Dragon_Code_0000000000000000000000000000000000000000000000000000000000000000_o1
 *
 * Finally, berries are identified with two txids and vouts attached together.
 *
 *    twetchpost__0000000000000000000000000000000000000000000000000000000000000000_o1_ \
 *        0000000000000000000000000000000000000000000000000000000000000000_o1
 *
 * These are all the rules for user locations. Internally Run also has a "protocol" prefix
 * to distinguish between special locations. This looks like a URL. The special protocol
 * prefixes allowed are temp:// and error://.
 *
 * temp:// is used for temporary locations before they are published. What follows temp://
 * is a standard location string except that the txid is a special temporary identifier.
 *
 *    temp://0000000000000000000000000000000000000000000000000000000000000000_i1
 *
 * error:// is for locations that are no longer valid. It may contain an error string afterwards
 * that does not have to follow the normal character rules.
 *
 *    error://Something bad happened
 */
function _location (s) {
  if (typeof s !== 'string') throw new Error(`Location is not a string: ${_text(s)}`)

  const errorMatch = s.match(ERROR_LOCATION)
  if (errorMatch) return errorMatch.groups

  const tempMatch = s.match(TEMP_LOCATION)
  if (tempMatch) return tempMatch.groups

  const resourceMatch = s.match(RESOURCE_LOCATION)
  if (resourceMatch) return resourceMatch.groups

  throw new Error(`Bad location: ${_text(s)}`)
}

// ------------------------------------------------------------------------------------------------
// _satoshis
// ------------------------------------------------------------------------------------------------

/**
 * Checks that the satoshis property of a Jig is a non-negative number within a certain range
 */
function _satoshis (satoshis) {
  if (typeof satoshis !== 'number') throw new Error('satoshis must be a number')
  if (!Number.isInteger(satoshis)) throw new Error('satoshis must be an integer')
  if (isNaN(satoshis) || !isFinite(satoshis)) throw new Error('satoshis must be finite')
  if (satoshis < 0) throw new Error('satoshis must be non-negative')
  if (satoshis > MAX_SATOSHIS) throw new Error(`satoshis must be <= ${MAX_SATOSHIS}`)
  return satoshis
}

// ------------------------------------------------------------------------------------------------
// _owner
// ------------------------------------------------------------------------------------------------

/**
 * Returns the Script object version of this owner, or throws an error
 */
function _owner (owner, bsvNetwork) {
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

module.exports = { _location, _satoshis, _owner }
