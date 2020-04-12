/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

const { Script } = require('bsv')
const { JigControl } = require('./jig')
const { TokenSet, _tokenSetHasLocation, _disableConsistentWorldviewChecks } =
  require('../util/datatypes')
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
    // One sync at a time
    if (this._existingSync) return this._existingSync

    const done = () => { this._existingSync = null }

    this._existingSync = this._syncLatest()
      .then(done)
      .catch(e => { done(); throw e })

    return this._existingSync
  }

  /**
   * Called by Run when a token is spent or outputted, so that we can add or remove it
   */
  _notify (token) {
    _disableConsistentWorldviewChecks(() => {
      // Delete and re-add tokens if they are still ours
      this._tokens.delete(token)

      if (ours(this._owner, token)) {
        this._tokens.add(token)
      }
    })
  }

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
      _disableConsistentWorldviewChecks(() => {
        this._tokens.delete(token)
        this._tokens.add(token)
      })
    }
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
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

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

async function ownerLocations (owner) {
  if (typeof owner.locations === 'function') {
    return owner.locations()
  }
  const lock = _lockify(owner.next())
  const script = Script.fromBuffer(Buffer.from(lock.script))
  const utxos = await this._kernel._blockchain.utxos(script)
  return utxos.map(utxo => `${utxo.txid}_o${utxo.vout}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
