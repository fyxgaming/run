/**
 * kernel.js
 *
 * Run central kernel, that loads resources and creates transactions
 */

const bsv = require('bsv')
const Record = require('./record')
const { _bsvNetwork, _assert } = require('./misc')
const { _location } = require('./bindings')
const Repository = require('./repository')

// ------------------------------------------------------------------------------------------------
// Kernel
// ------------------------------------------------------------------------------------------------

class Kernel {
  constructor () {
    this._blockchain = null
    this._purse = null
    this._cache = null
    this._app = null
    this._owner = null
    this._sandbox = true
    this._listeners = []
    this._importLimit = Infinity
  }

  async _load (location, options = {}) {
    // Make sure the location is valid
    const loc = _location(location)
    _assert(!loc.error && loc.txid && !loc.record && !loc.vjig, `Bad location: ${location}`)

    // Return native code directly
    // if (loc._native) {
    // const NativeCode = Code._get(loc._native)
    // _assert(NativeCode, `Native code not found: ${location}`)
    // return NativeCode
    // }

    // Get the on-chain tx
    const tx = await this._blockchain.fetch(loc.txid)

    // TODO: Early out when out of range

    const state = await this._cache.get(`jig://${location}`)
    console.log('STATE', state)

    // Get the state cache

    // Load the record
    const record = await Record._import(tx, true /* published */, null /* jigToSync */, options._importLimit)

    // Get the jig out of the record
    const { vout, vdel } = loc
    if ('vout' in loc && vout >= 1 && vout <= record._outputs.length) return record._outputs[loc.vout - 1]
    if ('vdel' in loc && vdel >= 0 && vdel <= record._deletes.length - 1) return record._deletes[loc.vdel]
    _assert(false, `Jig not found: ${location}`)
  }

  /**
   * Activates this kernel instance so its owner, blockchain, transaction queue and more are used.
   *
   * TODO: Activating also changes code presets
   */
  _activate () {
    // if (Kernel._instance === this) return
    // if (Kernel._instance) Kernel._instance._deactivate()
    Kernel._instance = this
    bsv.Networks.defaultNetwork = bsv.Networks[_bsvNetwork(this._blockchain.network)]
    // Code._activate(this._blockchain.network)
  }

  /**
   * Deactivates the current run instance, cleaning up anything in the process
   */
  _deactivate () {
    if (!Kernel._instance) return
    Kernel._instance = null
  }

  _on (event, listener) {
    this._listeners.push({ event, listener })
  }

  _emit (event, data) {
    if (event === 'jig') Repository._notify(data)

    this._listeners
      .filter(x => x.event === event)
      .forEach(x => x.listener(event, data))
  }
}

// ------------------------------------------------------------------------------------------------

// No kernel instance is active by default
Kernel._instance = null

// ------------------------------------------------------------------------------------------------

module.exports = Kernel
