/**
 * bindings.js
 *
 * Helpers to read the properties that bind Jigs, Code, and Berries to the blockchain.
 */

const { Address, PublicKey } = require('bsv')
const { _text, _setOwnProperty } = require('./misc')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

/**
 * The maximum amount of satoshis able to be set on a blockchain object. Currently 1 BSV. We
 * restrict this today for security. There will be an option to disable this in the future.
 */
const MAX_SATOSHIS = 100000000

// Location regexes
const ERROR_LOCATION = /^(?<protocol>error):\/\/(?<error>.*)/s
const NATIVE_LOCATION = /^(?<protocol>native):\/\/(?<native>[a-zA-Z0-9_$]+)/s
const COMMIT_LOCATION = /^(?<protocol>commit):\/\/(?<commitId>[a-f0-9]+)_(?:o(?<vout>[0-9]+)|(?:d(?<vdel>[0-9]+)))$/
const JIG_LOCATION = /^(?<txid>[a-f0-9]+)?_(?:(?:o(?<vout>[0-9]+))|(?:d(?<vdel>[0-9]+)))(?:_(?<berry>[a-z0-9_]*))?$/

// List of properties that are reserved for bindings
const _BINDINGS = ['location', 'origin', 'nonce', 'owner', 'satoshis']

// Location when not deployed
const _UNDEPLOYED = 'error://Undeployed'

// ------------------------------------------------------------------------------------------------
// _location
// ------------------------------------------------------------------------------------------------

/**
 * Parses a location string
 *
 * Locations are URLs for the blockchain. Run uses them to uniquely and deterministically identify
 * blockchain objects. They are also designed to be double-clickable in browsers and consistently
 * lower-case. The allowed characters in user-facing locations are a-z, 0-9 and _.
 *
 * The most basic location is a jig location. It is a transaction id and an output index:
 *
 *    0000000000000000000000000000000000000000000000000000000000000000_o1
 *
 * Jigs may be deleted in a transaction
 *
 *    0000000000000000000000000000000000000000000000000000000000000000_d0
 *
 * Instance and code jigs both use this format. Berries are similar but have a path attached at
 * the end. This path is berry-dependent, but it may be a txid, another location, or hex data.
 *
 *    0000000000000000000000000000000000000000000000000000000000000000_o1_ \
 *        1111111111111111111111111111111111111111111111111111111111111111
 *
 * native:// is for locations that are built-in types. They ship with Run and are not on the
 * blockchain. They include Jig and Berry.
 *
 *    native://Jig
 *
 * These are the only valid user-facing locations. However, Run internally has other kinds of
 * locations. Sometimes locations will not have a txid to refer to the current transaction.
 *
 *    _o1 or _d1
 *
 * Run also has other "special" locations that are prefixed with a protocol. These look like
 * URLs, and the supported prefixes are commit:// and error://.
 *
 * commit:// is used for local locations in commits before they are published
 *
 *    commit://0000000000000000000000000000000000000000000000000000000000000000_o1
 *    commit://0000000000000000000000000000000000000000000000000000000000000000_d2
 *
 * error:// is for locations that are no longer valid. It may contain an error string afterwards
 * that does not have to follow the normal character rules.
 *
 *    error://Something bad happened
 *
 * @param {string} s Location string
 * @param {number} flags Requirement flags
 * @returns {txid, vout, vdel, path, error, undeployed, commitId, native} Parsed locations. Fields are optional.
 */
function _location (s, flags) {
  if (typeof s !== 'string') throw new Error(`Location is not a string: ${_text(s)}`)

  const match = s.match(JIG_LOCATION) || s.match(COMMIT_LOCATION) ||
    s.match(ERROR_LOCATION) || s.match(NATIVE_LOCATION)

  if (match) {
    const ret = {}
    const groups = match.groups

    if (groups.protocol === 'commit') { ret.commitId = 'commit://' + groups.commitId }
    if (groups.protocol === 'error') { ret.error = groups.error }
    if (groups.protocol === 'native') { ret.native = groups.native }
    if (typeof groups.txid !== 'undefined') { ret.txid = groups.txid }
    if (typeof groups.vout !== 'undefined') { ret.vout = parseInt(groups.vout) }
    if (typeof groups.vdel !== 'undefined') { ret.vdel = parseInt(groups.vdel) }
    if (typeof groups.berry !== 'undefined') { ret.berry = groups.berry }
    if (s === _UNDEPLOYED) ret.undeployed = true

    return ret
  }

  throw new Error(`Bad location: ${_text(s)}`)
}

// ------------------------------------------------------------------------------------------------
// _nonce
// ------------------------------------------------------------------------------------------------

function _nonce (nonce) {
  if (Number.isInteger(nonce) && nonce > 0) return nonce
  throw new Error(`Invalid nonce: ${_text(nonce)}`)
}

// ------------------------------------------------------------------------------------------------
// _owner
// ------------------------------------------------------------------------------------------------

/**
 * Returns the Lock this jig owner, or throws an error
 */
function _owner (owner, bsvNetwork) {
  const StandardLock = require('./standard-lock')

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
    return owner
  }

  throw new Error(`Invalid owner: ${_text(owner)}`)
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
  if (satoshis < 0) throw new Error('satoshis must be non-negative')
  if (satoshis > MAX_SATOSHIS) throw new Error(`satoshis must be <= ${MAX_SATOSHIS}`)
  return satoshis
}

// ------------------------------------------------------------------------------------------------
// _init
// ------------------------------------------------------------------------------------------------

function _init (jig) {
  const Membrane = require('../kernel/membrane')
  const Unbound = require('./unbound')

  Membrane._sudo(() => {
    _setOwnProperty(jig, 'origin', _UNDEPLOYED)
    _setOwnProperty(jig, 'location', _UNDEPLOYED)
    _setOwnProperty(jig, 'nonce', -1)
    _setOwnProperty(jig, 'owner', new Unbound(undefined))
    _setOwnProperty(jig, 'satoshis', new Unbound(undefined))
  })
}

// ------------------------------------------------------------------------------------------------

module.exports = { _location, _nonce, _owner, _satoshis, _init, _BINDINGS, _UNDEPLOYED }
