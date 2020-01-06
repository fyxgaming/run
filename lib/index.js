/**
 * index.js
 *
 * The exports for the Run library, including the main Run class
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

// ------------------------------------------------------------------------------------------------
// Primary Run class
// ------------------------------------------------------------------------------------------------

/**
 * The main Run class that users create.
 */
class Run {
  /**
   * Creates Run and sets up all properties. Whenever possible, settings from the prior Run
   * instance will be reused, including the blockchain, code, and state cache.
   * @param {object=} options Configuration settings
   * @param {boolean|RegExp=} options.sandbox Whether to put code in a secure sandbox. Default is true.
   * @param {object=} options.logger Console-like logger object. Default will log warnings and errors.
   * @param {string=} options.app App string to differentiate transaction. Defaults to empty.
   * @param {Blockchain|string=} options.blockchain Blockchain API or one of 'star', 'bitindex', or 'whatsonchain'
   * @param {string=} options.network One of 'main', 'test', 'stn', or 'mock'
   * @param {State=} options.state State provider, which may be null
   * @param {string=} options.owner Private key or address string
   * @param {string|PrivateKey|Pay=} options.purse Private key or Pay API
   */
  constructor (options = {}) {
    this.logger = parseLogger(options.logger)
    this.blockchain = parseBlockchain(options.blockchain, options.network, this.logger)
    setupBsvLibrary(this.blockchain.network)
    this.sandbox = parseSandbox(options.sandbox)
    this.app = parseApp(options.app)
    this.state = parseState(options.state)
    this.owner = parseOwner(options.owner, this.blockchain.network, this.logger, this)
    this.purse = parsePurse(options.purse, this.blockchain, this.logger)
    this.syncer = new Syncer(this)
    this.transaction = new Transaction(this)
    this.loadQueue = new util.SerialTaskQueue()

    this.activate()

    // If using the mockchain, automatically fund the purse with some money
    if (this.blockchain instanceof Mockchain) this.blockchain.fund(this.purse.address, 100000000)
  }

  /**
   * Loads jigs or code from the blockchain
   * @param {string} location Location string
   * @returns {Promise<Object|Function|Class>} Class or function in a promise
   */
  async load (location, options = {}) {
    this._checkActive()

    // Loads that are from other loads just get passed through
    if (options.childLoad) {
      return this.transaction.load(location, options)
    }

    // Everything else gets serialized
    return this.loadQueue.enqueue(() => this.transaction.load(location, options))
  }

  /**
   * Deploys code to the blockchain
   * @param {Function|Class} type Class or function to deploy
   * @returns {Promise<string>} Location string in a promise
   */
  async deploy (type) {
    this._checkActive()
    Run.code.deploy(type)
    await this.sync()
    return type.location
  }

  /**
   * Syncs pending transactions and requeries the owner's tokens
   */
  async sync () {
    return this.owner.sync()
  }

  /**
   * Activates this Run instance so its owner, blockchain, transaction queue and more are used.
   */
  activate () {
    Run.instance = this
    bsv.Networks.defaultNetwork = util.bsvNetwork(this.blockchain.network)
    Run.code.activate(this.blockchain.network)
    return this
  }

  _checkActive () {
    if (Run.instance !== this) {
      const hint = 'Hint: Call run.activate() on this instance first'
      throw new Error(`This Run instance is not active\n\n${hint}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Parameter validations
// ------------------------------------------------------------------------------------------------

function parseLogger (logger) {
  // When no logger is provided, we log warnings and errors by default
  switch (typeof logger) {
    case 'object': logger = (logger || {}); break
    case 'undefined': logger = { warn: console.warn, error: console.error }; break
    default: throw new Error(`Option 'logger' must be an object. Received: ${logger}`)
  }

  // Fill this.logger with all supported methods
  const methods = ['info', 'debug', 'warn', 'error']
  logger = { ...logger }
  methods.forEach(method => { logger[method] = logger[method] || (() => {}) })
  return logger
}

function parseBlockchain (blockchain, network, logger) {
  switch (typeof blockchain) {
    case 'object':
      if (!blockchain) throw new Error('Option \'blockchain\' must not be null')
      if (typeof blockchain.broadcast !== 'function') throw new Error('Blockchain requires a broadcast method')
      if (typeof blockchain.fetch !== 'function') throw new Error('Blockchain requires a fetch method')
      if (typeof blockchain.utxos !== 'function') throw new Error('Blockchain requires a utxos method')
      if (typeof blockchain.network !== 'string') throw new Error('Blockchain requires a network string')
      return blockchain
    case 'string':
    case 'undefined': {
      const cache = Run.instance ? Run.instance.blockchain.cache : null
      if (network === 'mock') {
        return new Mockchain({ cache })
      } else {
        return new BlockchainServer({ network, cache, api: blockchain, logger })
      }
    }
    default: throw new Error(`Option 'blockchain' must be an object or string. Received: ${blockchain}`)
  }
}

function parseSandbox (sandbox) {
  switch (typeof sandbox) {
    case 'boolean': return sandbox
    case 'object':
      if (sandbox && sandbox instanceof RegExp) return sandbox
      throw new Error(`Invalid option 'sandbox'. Received: ${sandbox}`)
    case 'undefined': return true
    default: throw new Error(`Option 'sandbox' must be a boolean or RegExp. Received: ${sandbox}`)
  }
}

function parseApp (app) {
  switch (typeof app) {
    case 'string': return app
    case 'undefined': return ''
    default: throw new Error(`Option 'app' must be a string. Received: ${app}`)
  }
}

function parseState (state) {
  switch (typeof state) {
    case 'object':
      if (!state) throw new Error('Option \'state\' must not be null')
      if (typeof state.get !== 'function') throw new Error('State requires a get method')
      if (typeof state.set !== 'function') throw new Error('State requires a set method')
      return state
    case 'undefined':
      return Run.instance && Run.instance.state ? Run.instance.state : new StateCache()
    default: throw new Error(`Option 'state' must be an object. Received: ${state}`)
  }
}

function parseOwner (owner, network, logger, run) {
  switch (typeof owner) {
    case 'string':
    case 'object':
    case 'undefined':
      return new Owner(owner, { network, logger, run })
    default: throw new Error(`Option 'owner' must be a valid key or address. Received: ${owner}`)
  }
}

function parsePurse (purse, blockchain, logger) {
  switch (typeof purse) {
    case 'string': return new Purse({ privkey: purse, blockchain, logger })
    case 'undefined': return new Purse({ blockchain, logger })
    case 'object':
      if (!purse || purse instanceof PrivateKey) {
        return new Purse({ privkey: purse, blockchain, logger })
      } else return purse
    default: throw new Error(`Option 'purse' must be a valid private key or Pay API. Received: ${purse}`)
  }
}

// ------------------------------------------------------------------------------------------------
// Helper methods
// ------------------------------------------------------------------------------------------------

function setupBsvLibrary (network) {
  // Set the default bsv network
  bsv.Networks.defaultNetwork = util.bsvNetwork(network)

  // Hook sign to not run isValidSignature, which is slow and unnecessary
  const oldSign = bsv.Transaction.prototype.sign
  bsv.Transaction.prototype.sign = function (...args) {
    const oldIsValidSignature = bsv.Transaction.Input.prototype.isValidSignature
    bsv.Transaction.Input.prototype.isValidSignature = () => true
    const ret = oldSign.call(this, ...args)
    bsv.Transaction.Input.prototype.isValidSignature = oldIsValidSignature
    return ret
  }
}

// ------------------------------------------------------------------------------------------------
// Run static properties
// ------------------------------------------------------------------------------------------------

Run.version = typeof RUN_VERSION === 'undefined' ? require('../package.json').version : RUN_VERSION
Run.protocol = util.PROTOCOL_VERSION
Run._util = util
Run.BlockchainServer = BlockchainServer
Run.Mockchain = Mockchain
Run.StateCache = StateCache

// Lazily install the code, Jig and Token
// Besides performance gain, this allows Run to be loaded in <HEAD> tags
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

// ------------------------------------------------------------------------------------------------

module.exports = Run
