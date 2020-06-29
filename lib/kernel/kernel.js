/**
 * kernel.js
 *
 * Run central kernel, that loads resources and creates transactions
 */

const bsv = require('bsv')
const Code = require('./code')
const Record = require('./record')
const { _bsvNetwork, _assert } = require('./misc')
const { _location } = require('./bindings')

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
  }

  async _load (location) {
    // Check if in the cache

    // If there's a custom protocol, use it
    /*
    if (options._BerryClass) {
      return _pluckBerry(location, this._kernel._blockchain, this._kernel._code, options._BerryClass)
    }

    // Either load a run resource, or a berry, depending on if there's a protocol in location
    const loc = Location.parse(location)

    if (!loc.innerLocation) {
      return this._loadResource(location, options)
    } else {
      const BerryClass = await this.load(loc.location, options)
      return _pluckBerry(loc.innerLocation, this._kernel._blockchain, this._kernel._code, BerryClass)
    }
    */

    /*
    // load all the jigs for this transaction, and return the selected
    const tx = options._knownTx && options._knownTx.hash === txid ? options._knownTx
      : await this._kernel._blockchain.fetch(txid)

    // Check that we are loading a resource
    // TODO: Rename this error in 0.6
    const outputType = _outputType(tx, vout)
    if (outputType !== 'jig' && outputType !== 'code') {
      throw new Error(`Not a token: ${location}`)
    }

    // Import the transaction
    const record = new Record()
    await record._import(tx, this._kernel, null, true, vout, options._partiallyInstalledCode)

    // if a definition, install
    if (vout > 0 && vout < record._code.length + 1) {
      return this._kernel._code._getSandboxed(location) || options._partiallyInstalledCode.get(location)
    }

    // otherwise, a jig. get the jig.
    const proxies = record._outputs.map(o => record._proxies.get(o))
    const jigProxies = new Array(1 + record._code.length).concat(proxies)

    // TODO: Notify shruggr if these error message change
    if (typeof jigProxies[vout] === 'undefined') throw new Error('not a jig output')

    return jigProxies[vout]
    */

    const loc = _location(location)

    _assert(!loc.error && loc.txid && !loc.record && !loc.vjig, `Bad location: ${location}`)

    if (loc._native) {
      // Todo
    }

    const tx = await this._blockchain.fetch(loc.txid)

    const record = await Record._import(tx, true /* published */)

    if ('vout' in loc) return record._outputs[loc.vout - 1]
    if ('vdel' in loc) return record._deletes[loc.vdel]

    _assert(false, `Bad location: ${location}`)
  }

  _deploy (T) { new Code(T).deploy() }

  /**
   * Activates this kernel instance so its owner, blockchain, transaction queue and more are used.
   *
   * TODO: Activating also changes code presets
   */
  _activate () {
    if (Kernel._instance === this) return
    if (Kernel._instance) Kernel._instance._deactivate()
    Kernel._instance = this
    bsv.Networks.defaultNetwork = bsv.Networks[_bsvNetwork(this._blockchain.network)]
    this._code.activate(this._blockchain.network)
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
