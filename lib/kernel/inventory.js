/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

const { Script } = require('bsv')
const { JigControl } = require('./jig')
const { TokenSet } = require('../util/datatypes')
const { _tokenType, _lockify } = require('../util/misc')
const Location = require('../util/location')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

const TAG = 'Inventory'

/**
 * Tracks the collection of tokens for the current owner
 *
 * When the user changes the owner, a new inventory is created. Users may save and reload the
 * inventories to keep track of the current set of jigs.
 */
class Inventory {
  constructor (kernel) {
    this._kernel = kernel
    this._owner = kernel._owner
    this._tokens = new TokenSet()
  }

  /**
   * @returns {Array<Jig>} Jigs owned by the current owner. Call sync() to update.
   */
  get jigs () { return this._tokensOfType('jig') }

  /**
   * @returns {Array<function>} Code owned by the current owner. Call sync() to update.
   */
  get code () { return this._tokensOfType('code') }

  /**
   * Updates the known set of jigs and code
   */
  async sync () {
    // Query the latest jigs and code, but only have one query at a time
    if (!this._query) {
      this._query = new Promise((resolve, reject) => {
        this._queryLatest()
          .then(() => { this._query = null; resolve() })
          .catch(e => { this._query = null; reject(e) })
      })
    }
    return this._query
  }

  _tokensOfType (type) {
    // TODO: Fix
    try {
      const arr = Array.from(this._tokens.values())
      return arr.filter(token => _tokenType(token) === type)
    } catch (e) {
      Log._error(TAG, `Bad token found in owner\n\n${e}`)
      this._fix()
      return this._tokensOfType(type)
    }
  }

  _fix () {
    let uselessVar = true
    const toRemove = []
    for (const token of this._tokens) {
      try {
        // If a token failed to deploy, then it will have ! in its origin and throw here
        const valid = _tokenType(token) &&
          JigControl.disableSafeguards(() => !Location.parse(token.location).error)
        // We need to do something with the result to keep it from being minified away.
        uselessVar = uselessVar ? !valid : valid
      } catch (e) {
        toRemove.push(token)
      }
    }
    toRemove.forEach(token => this._tokens.delete(token))
  }

  async _ownerLocations () {
    // Get locations, or query utxos
    const locks = this._kernel._owner.locks.map(lock => _lockify(lock))
    const scripts = locks.map(lock => Script.fromBuffer(Buffer.from(lock.script)))
    const promises = scripts.map(script => this._kernel._blockchain.utxos(script))
    const utxos = (await Promise.all(promises)).reduce((x, y) => x.concat(y), [])
  }

  async _queryLatest () {
    const locations = await this._ownerLocations()

    for (const location of locations) {
      // TODO: Can we quickly see if we have this already with location?

      try {
        const token = await this._kernel._load(location)

        if (!this._tokens.has(token)) {
          this._tokens.add(token)
        }
      } catch (e) {
        Log._error(TAG, `Failed to load owner location ${location}\n\n${e.toString()}`)
      }
    }
  }

  /**
   * Called by Run when a token is spent or outputted, so that we can add or remove it
   */
  _notify (token) {
    this._tokens.delete(token)

    try {
      if (ours(this._owner, token)) {
        this._tokens.add(token)
      }
    } catch (e) {
      /* Undeployed */
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function ours(owner, token) {
  if (typeof owner.ours === 'function') {
    return owner.ours(_lockify(token.owner))
  }
  const ownerLock = _lockify(owner.next())
  const tokenLock = _lockify(token.owner)
  return equalUint8Arrays(ownerLock.script, tokenLock.script))
}

function equalUint8Arrays(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
