/**
 * index.js
 *
 * The primary Run class we export that manager for all other components
 */

const bsv = require('bsv')
const Code = require('./code')
const Syncer = require('./syncer')
const { Transaction } = require('./transaction')
const util = require('./util')
const { Purse } = require('./purse')
const Owner = require('./owner')
const { BlockchainServer } = require('./blockchain')
const Mockchain = require('./mockchain')
const { StateCache } = require('./state')
const { PrivateKey } = bsv

/**
 * The main Run class that users create.
 */
class Run {
  /**
   * Creates Run and sets up all properties
   * @param {object=} options Configuration settings
   * @param {boolean=} options.sandbox Whether to put code in a secure sandbox. Default is true.
   * @param {object=} options.logger Console-like logger object. Default will log warnings and errors.
   * @param {string=} options.app App string to differentiate transaction. Defaults to empty.
   */
  constructor (options = {}) {
    // ------------------------------------------------------------------------
    // this.sandbox
    // ------------------------------------------------------------------------

    switch (typeof options.sandbox) {
      case 'boolean': this.sandbox = options.sandbox; break
      case 'object':
        if (options.sandbox && options.sandbox instanceof RegExp) {
          this.sandbox = options.sandbox
          break
        }
        throw new Error(`Invalid option 'sandbox'. Received: ${options.sandbox}`)
      case 'undefined': this.sandbox = true; break
      default: throw new Error(`Option 'sandbox' must be a boolean. Received: ${options.sandbox}`)
    }

    // ------------------------------------------------------------------------
    // this.logger
    // ------------------------------------------------------------------------

    // When no logger is provided, we log warnings and errors by default
    const defaultLogger = { warn: console.warn, error: console.error }

    switch (typeof options.logger) {
      case 'object': this.logger = options.logger === null ? {} : options.logger; break
      case 'undefined': this.logger = defaultLogger; break
      default: throw new Error(`Option 'logger' must be an object. Received: ${options.logger}`)
    }

    // Fill this.logger with all supported methods
    const methods = ['info', 'debug', 'warn', 'error']
    this.logger = { ...this.logger }
    methods.forEach(method => { this.logger[method] = this.logger[method] || (() => {}) })

    // ------------------------------------------------------------------------
    // this.app
    // ------------------------------------------------------------------------

    switch (typeof options.app) {
      case 'string': this.app = options.app; break
      case 'undefined': this.app = ''; break
      default: throw new Error(`Option 'app' must be a string. Received: ${options.app}`)
    }

    // ------------------------------------------------------------------------
    // this.blockchain
    // ------------------------------------------------------------------------

    switch (typeof options.blockchain) {
      case 'object':
        if (!options.blockchain) throw new Error('Option \'blockchain\' must not be null')
        this.blockchain = options.blockchain
        break

      case 'string':
      case 'undefined': {
        const network = options.network || 'main'
        const cache = Run.instance ? Run.instance.blockchain.cache : null
        const api = options.blockchain || 'star'

        if (network === 'mock') {
          this.blockchain = new Mockchain({ cache })
        } else {
          this.blockchain = new BlockchainServer({ network, cache, api, logger: this.logger })
        }
        break
      }

      default: throw new Error(`Option 'blockchain' must be an object or string. Received: ${options.blockchain}`)
    }

    // ------------------------------------------------------------------------
    // this.state
    // ------------------------------------------------------------------------

    if (typeof options.state === 'object') {
      this.state = options.state
    } else if (Run.instance && Run.instance.blockchain.network === this.blockchain.network) {
      this.state = Run.instance.state
    } else {
      if (Run.instance) {
        const reason = `The previous run instance is configured for a different network (${Run.instance.blockchain.network}).`
        this.logger.warn(`Performance may be slow because run cannot reuse the previous state cache.\n\n${reason}`)
      }
      this.state = new StateCache()
    }

    // ------------------------------------------------------------------------
    // this.owner
    // ------------------------------------------------------------------------

    // ------------------------------------------------------------------------
    // this.purse
    // ------------------------------------------------------------------------

    // ------------------------------------------------------------------------
    // this.syncer
    // ------------------------------------------------------------------------

    // ------------------------------------------------------------------------
    // this.transaction
    // ------------------------------------------------------------------------

    this._setupBsv()
    this.activate()

    const bsvNetwork = util.bsvNetwork(this.blockchain.network)
    const ownerParam = options.owner || new PrivateKey(bsvNetwork)
    this.owner = new Owner(ownerParam, bsvNetwork, this.logger)

    // setup the purse
    if (typeof options.purse === 'string' || typeof options.purse === 'undefined' ||
        options.purse instanceof PrivateKey || options.purse === null) {
      this.purse = new Purse({ privkey: options.purse, blockchain: this.blockchain, logger: this.logger })
    } else { this.purse = options.purse }

    this.syncer = new Syncer(this)
    this.transaction = new Transaction(this)

    // if using the mockchain, automatically fund the purse with some money
    if (this.blockchain.network === 'mock') this.blockchain.fund(this.purse.address, 100000000)

    // kick off sync. this won't finish here, but for tutorials they will be loaded shortly after
    // this.sync()

    // Simultaneous loads do not work right now. We always enqueue them.
    this.loadQueue = new util.SerialTaskQueue()
  }

  async sync () { return this.owner.sync() }

  async deploy (type) { this.checkActive(); Run.code.deploy(type); await this.sync(); return type.location }

  async load (location, options = {}) {
    this.checkActive()

    // Loads that are from other loads just get passed through
    if (options.childLoad) {
      return this.transaction.load(location, options)
    }

    // Everything else gets serialized
    return this.loadQueue.enqueue(() => this.transaction.load(location, options))
  }

  checkActive () { if (Run.instance !== this) throw new Error('run instance is not active. call run.activate() first.') }

  activate () {
    Run.instance = this
    bsv.Networks.defaultNetwork = util.bsvNetwork(this.blockchain.network)
    Run.code.activate(this.blockchain.network)
    return this
  }

  async _sign (tx) {
    if (this.owner.bsvPrivateKey) { tx.sign(this.owner.bsvPrivateKey) }
    return tx
  }

  _setupBsv () {
    bsv.Networks.defaultNetwork = util.bsvNetwork(this.blockchain.network)
    const oldSign = bsv.Transaction.prototype.sign
    bsv.Transaction.prototype.sign = function (...args) {
      const oldIsValidSignature = bsv.Transaction.Input.prototype.isValidSignature
      bsv.Transaction.Input.prototype.isValidSignature = () => true
      const ret = oldSign.call(this, ...args)
      bsv.Transaction.Input.prototype.isValidSignature = oldIsValidSignature
      return ret
    }
  }
}

Run.version = typeof RUN_VERSION === 'undefined' ? require('../package.json').version : RUN_VERSION
Run.protocol = util.PROTOCOL_VERSION
Run._util = util
Run.BlockchainServer = BlockchainServer
Run.Mockchain = Mockchain
Run.StateCache = StateCache

// lazily install the code, Jig and Token
// besides performance gain, this allows Run to be loaded in <HEAD> tags
let code = null
Object.defineProperty(Run, 'code', {
  get () {
    if (!code) code = new Code()
    return code
  }
})

const options = { configurable: true, enumerable: true }
Object.defineProperty(Run, 'Jig', { ...options, get () { return Run.code.Jig } })
Object.defineProperty(Run, 'Token', { ...options, get () { return require('./token') } })
Object.defineProperty(Run, 'expect', { ...options, get () { return require('./expect') } })
Object.defineProperty(global, 'Jig', { ...options, get () { return Run.Jig } })
Object.defineProperty(global, 'Token', { ...options, get () { return Run.Token } })

module.exports = Run
