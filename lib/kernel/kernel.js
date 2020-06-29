/**
 * kernel.js
 *
 * Run central kernel, that loads resources and creates transactions
 */

const bsv = require('bsv')
const Code = require('./code')
const Code2 = require('./v2/code')
const Record = require('./v2/record')
const Publisher = require('./publisher')
const Syncer = require('./syncer')
const Inventory = require('./inventory')
const Transaction = require('./transaction')
const { _bsvNetwork, _SerialTaskQueue, _assert } = require('../util/misc')
const { _location } = require('../util/bindings')

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
    this._code = null
    this._publisher = null
    this._syncer = null
    this._protocol = null
    this._transaction = null
    this._inventory = null
    this._loadQueue = new _SerialTaskQueue()
  }

  _setup () {
    // Check if we can reuse the code
    if (!this._code && Kernel._instance) {
      const sameSandbox = Kernel._instance._sandbox.toString() === this._sandbox.toString()
      const sameNetwork = Kernel._instance._blockchain.network === this._blockchain.network
      const useSameCode = sameSandbox && sameNetwork
      if (useSameCode) { this._code = Kernel._instance._code }
    }

    // Create a new Code instance if necessary
    if (!this._code) this._code = new Code(this._blockchain.network)

    this._publisher = new Publisher(this)
    this._syncer = new Syncer(this)
    this._transaction = new Transaction(this)
    this._inventory = new Inventory(this)
  }

  _load (location, options) {
    return this._loadQueue.enqueue(() => {
      return this._transaction.load(location, options)
    })
  }

  async _load2 (location) {
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

  _deploy (T) { this._code.deploy(T) }

  _deploy2 (T) { new Code2(T).deploy() }

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
}

// ------------------------------------------------------------------------------------------------

// No kernel instance is active by default
Kernel._instance = null

// ------------------------------------------------------------------------------------------------

module.exports = Kernel
