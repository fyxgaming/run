/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

const { Script } = require('bsv')
const { JigControl } = require('./jig')
const { TokenSet, _tokenSetHasLocation, _allowInconsistentWorldview } =
  require('../util/datatypes')
const { _tokenType, _lockify } = require('../util/misc')
const Location = require('../util/location')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

const TAG = 'Inventory'

/**
 * Tracks the collection of tokens for the current owner.
 *
 * When the user changes the owner, a new inventory is created. Users may save and reload the
 * inventories to keep track of the current set of jigs and code.
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
  get jigs () { return this.tokens.filter(token => _tokenType(token) === 'jig') }

  /**
   * @returns {Array<function>} Code owned by the current owner. Call sync() to update.
   */
  get code () { return this.tokens.filter(token => _tokenType(token) === 'code') }

  /**
   * @returns {Array<*>} All tokens owned by the current owner. Call sync() to update.
   */
  get tokens () {
    // Gets all tokens we own in an array, also removing those that failed to deploy
    const tokens = []
    const remove = []

    for (const token of this._tokens) {
      if (errored(token)) {
        remove.push(token)
        continue
      }

      tokens.push(token)
    }

    remove.forEach(token => this._tokens.delete(token))

    return tokens
  }

  /**
   * Updates the known set of jigs and code
   */
  async sync () {
    // One sync at a time
    if (this._existingSync) return this._existingSync

    const done = () => { this._existingSync = null }

    this._existingSync = this._syncLatest()
      .then(done)
      .catch(e => { done(); throw e })

    return this._existingSync
  }

  /**
   * Internal method that loads all owned tokens not currently in our set, usually via the UTXOs
   */
  async _syncLatest () {
    const locations = await ownerLocations(this._owner)

    for (const location of locations) {
      // If we aleady have this location, no need to load it again
      if (_tokenSetHasLocation(this._tokens, location)) continue

      // Try loading the token, but if it fails to load, just move on to the next.
      // Otherwise, bad actors could crash apps by sending users jigs that don't load.
      let token = null
      try {
        token = await this._kernel._load(location)
      } catch (e) {
        Log._error(TAG, `Failed to load owner location ${location}\n\n${e.toString()}`)
        continue
      }

      // Prefer the loaded token, because we already checked that we don't have the latest
      _allowInconsistentWorldview(() => {
        this._tokens.delete(token)
        this._tokens.add(token)
      })
    }
  }

  /**
   * Called by Run when a token is spent or outputted, so that we can add or remove it
   */
  _notify (token) {
    _allowInconsistentWorldview(() => {
      // Delete and re-add tokens if they are still ours
      this._tokens.delete(token)

      if (ours(this._owner, token)) {
        this._tokens.add(token)
      }
    })
  }
}

// ------------------------------------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------------------------------------

function errored (token) {
  return JigControl.disableSafeguards(() => !!Location.parse(token.location).error)
}

async function ownerLocations (owner) {
  if (typeof owner.locations === 'function') {
    return owner.locations()
  }
  const lock = _lockify(owner.next())
  const script = Script.fromBuffer(Buffer.from(lock.script))
  const utxos = await this._kernel._blockchain.utxos(script)
  return utxos.map(utxo => `${utxo.txid}_o${utxo.vout}`)
}

function ours (owner, token) {
  if (typeof owner.ours === 'function') {
    return owner.ours(_lockify(token.owner))
  }
  const ownerLock = _lockify(owner.next())
  const tokenLock = _lockify(token.owner)
  return equalUint8Arrays(ownerLock.script, tokenLock.script)
}

function equalUint8Arrays (a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
