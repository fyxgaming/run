/**
 * index.js
 *
 * Primary library export and Run class
 */

const Kernel = require('./kernel')
const code = require('./kernel/code')
const BlockchainApi = require('./module/blockchain-api')
const LocalPurse = require('./module/local-purse')
const Mockchain = require('./module/mockchain')
const { StateCache } = require('./kernel/state')
const util = require('./util')
const { AddressScript, PubKeyScript, Owner, BasicOwner } = require('./kernel/owner')
const { FriendlySet, FriendlyMap } = require('./util/friendly')
const Location = require('./kernel/location')

// ------------------------------------------------------------------------------------------------
// Run
// ------------------------------------------------------------------------------------------------

/**
 * The Run class that the user creates.
 *
 * It is essentially a wrapper around the kernel.
 * It sets up the kernel with users provided options or defaults and exposes an API to the user.
 */
class Run {
  constructor (options = {}) {
    options = Object.assign({}, Run.defaults, options)

    this._kernel = new Kernel()
    this._kernel._logger = parseLogger(options.logger)
    this._kernel._blockchain = parseBlockchain(options, this.logger)
    this._kernel._purse = parsePurse(options.purse, this)
    this._kernel._app = parseApp(options.app)
    this._kernel._state = parseState(options.state)
    this._kernel._owner = parseOwner(options.owner, this.blockchain.network, this.logger, this)

    // If using the mockchain and local purse, automatically fund the purse with some money
    if (this.blockchain instanceof Mockchain && this.purse instanceof LocalPurse) {
      this.blockchain.fund(this.purse.bsvAddress, 100000000)
    }

    this.transaction.begin = () => this._kernel._transaction._begin()
    this.transaction.end = () => { this._kernel._transaction._begin(); return this.sync() }

    this.activate()
  }

  get logger () { return this._kernel._logger }
  get blockchain () { return this._kernel._blockchain }
  get purse () { return this._kernel._purse }
  get code () { return this._kernel._code }
  get app () { return this._kernel._app }
  get state () { return this._kernel._state }

  // TODO: Can we set these mid-way? Cache during enqueue
  set logger (logger) { this._kernel._logger = parseLogger(logger) }
  set purse (purse) { this._kernel._purse = parsePurse(purse, this) }
  set app (app) { this._kernel._app = parseApp(this.purse, this) }

  sync () { return this._kernel._sync() }

  async deploy (T) {
    // TODO: Check active?
    this._kernel._deploy(T)
    await this._kernel._sync()
    return T.location
  }

  transaction (callback) {
    this._kernel._transaction._begin()
    try {
      callback()
    } finally {
      this._kernel._transaction._end()
    }
  }

  activate () { this._kernel._activate(); Run.instance = this; return this }
  deactivate () { this._kernel._deactivate(); Run.instance = null; return this }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseBlockchain (options, logger) {
  const blockchain = options.blockchain

  const lastBlockchain = Kernel._instance && Kernel._instance.blockchain

  // If no blockchain is passed, create one
  if (typeof blockchain === 'undefined') {
    switch (options.network) {
      case 'mock':
        return lastBlockchain instanceof Mockchain ? lastBlockchain : new Mockchain()

      case 'main':
      case 'test':
        return new BlockchainApi({
          api: options.api,
          apiKey: options.apiKey,
          network: options.network,
          timeout: options.timeout,
          logger,
          lastBlockchain
        })

      default: throw new Error(`Unsupported network: ${options.network}`)
    }
  }

  // If we received an object, see if it's a blockchain
  if (typeof blockchain === 'object' && blockchain && blockchain.network) {
    return blockchain
  }

  throw new Error(`Invalid blockchain: ${blockchain}`)
}

function parseLogger (logger) {
  // When no logger is provided, we log warnings and errors by default
  switch (typeof logger) {
    case 'object': logger = Object.assign({}, logger || {}); break
    case 'undefined': logger = { warn: console.warn, error: console.error }; break
    default: throw new Error(`Option 'logger' must be an object. Received: ${logger}`)
  }

  // Fill this.logger with all supported methods
  const methods = ['info', 'debug', 'warn', 'error']
  methods.forEach(method => { logger[method] = logger[method] || (() => {}) })
  return logger
}

function parsePurse (purse, run) {
  if (typeof purse === 'object' && typeof purse.pay === 'function') {
    return purse
  } else {
    return new LocalPurse({ privkey: purse, blockchain: run.blockchain })
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
    case 'undefined':
    case 'string':
    case 'object':
      if (owner && owner instanceof Owner) return owner
      return new BasicOwner(owner, network)
    default: throw new Error(`Option 'owner' must be a valid key, address, or Owner instance. Received: ${owner}`)
  }
}

// ------------------------------------------------------------------------------------------------
// Defaults
// ------------------------------------------------------------------------------------------------

Run.defaults = {}
Run.defaults.logger = undefined
Run.defaults.network = 'mock'
Run.defaults.api = 'run'
Run.defaults.purse = undefined

// ------------------------------------------------------------------------------------------------
// Additional Exports
// ------------------------------------------------------------------------------------------------

Run.module = {}
Run.module.BlockchainApi = BlockchainApi
Run.module.LocalPurse = LocalPurse
Run.module.Mockchain = Mockchain

Run.AddressScript = AddressScript
Run.PubKeyScript = PubKeyScript

Run._util = util
Run._code = code

Run.FriendlySet = FriendlySet
Run.FriendlyMap = FriendlyMap
Run.Location = Location

Run.instance = null

/* global VERSION */
Run.version = (typeof VERSION !== 'undefined' && VERSION) || require('../package').version

Run.protocol = util.PROTOCOL_VERSION

// ------------------------------------------------------------------------------------------------

module.exports = Run
