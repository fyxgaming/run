/**
 * index.js
 *
 * Primary library export and Run class
 */

const { PrivateKey } = require('bsv')
const Kernel = require('./kernel')
const code = require('./kernel/code')
const BlockchainApi = require('./module/blockchain-api')
const LocalPurse = require('./module/local-purse')
const Mockchain = require('./module/mockchain')
const { Jig } = require('./kernel/jig')
const { Berry } = require('./kernel/berry')
const Token = require('./extra/token')
const expect = require('./extra/expect')
const { StateCache } = require('./kernel/state')
const { Blockchain } = require('./kernel/api')
const { PROTOCOL_VERSION, _display } = require('./util')
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
    this._kernel._sandbox = parseSandbox(options.sandbox)
    this._kernel._setup()

    // If using the mockchain and local purse, automatically fund the purse with some money
    if (this.blockchain instanceof Mockchain && this.purse instanceof LocalPurse) {
      this.blockchain.fund(this.purse.bsvAddress, 100000000)
    }

    this.activate()
  }

  get logger () { return this._kernel._logger }
  get blockchain () { return this._kernel._blockchain }
  get purse () { return this._kernel._purse }
  get owner () { return this._kernel._owner }
  get code () { return this._kernel._code }
  get app () { return this._kernel._app }
  get state () { return this._kernel._state }
  get sandbox () { return this._kernel._sandbox }
  get transaction () { return this._kernel._transaction }

  // TODO: Can we set these mid-way? Cache during enqueue
  set logger (logger) { this._kernel._logger = parseLogger(logger) }
  set purse (purse) { this._kernel._purse = parsePurse(purse, this) }
  set app (app) { this._kernel._app = parseApp(app) }

  async deploy (T) {
    // TODO: Check active?
    this._kernel._deploy(T)
    await this._kernel._sync()
    return T.location
  }

  sync () { return this._kernel._sync() }

  activate () { this._kernel._activate(); Run.instance = this; return this }
  deactivate () { this._kernel._deactivate(); Run.instance = null; return this }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseBlockchain (options, logger) {
  const { blockchain } = options
  const lastBlockchain = Kernel._instance && Kernel._instance._blockchain

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
  if (typeof blockchain === 'object' && blockchain && blockchain.network && Blockchain.isBlockchain(blockchain)) {
    return blockchain
  }

  throw new Error(`Invalid blockchain: ${_display(blockchain)}`)
}

function parseLogger (logger) {
  // When no logger is provided, we log warnings and errors by default
  switch (typeof logger) {
    case 'object': logger = Object.assign({}, logger || {}); break
    case 'undefined': logger = { warn: console.warn, error: console.error }; break
    default: throw new Error(`Invalid logger: ${_display(logger)}`)
  }

  // Fill this.logger with all supported methods
  const methods = ['info', 'debug', 'warn', 'error']
  methods.forEach(method => { logger[method] = logger[method] || (() => {}) })
  return logger
}

function parsePurse (purse, run) {
  const { blockchain, logger } = run
  switch (typeof purse) {
    case 'string': return new LocalPurse({ privkey: purse, blockchain, logger })
    case 'undefined': return new LocalPurse({ blockchain, logger })
    case 'object':
      if (!purse || purse instanceof PrivateKey) {
        return new LocalPurse({ privkey: purse, blockchain, logger })
      } else {
        if (typeof purse.pay !== 'function') throw new Error('Purse requires a pay method')
        return purse
      }
    default: throw new Error(`Invalid purse: ${_display(purse)}`)
  }
}

function parseApp (app) {
  switch (typeof app) {
    case 'string': return app
    case 'undefined': return ''
    default: throw new Error(`Invalid app: ${_display(app)}`)
  }
}

function parseState (state) {
  switch (typeof state) {
    case 'object':
      if (state && state.get && state.set) return state
      break
    case 'undefined':
      return Run.instance && Run.instance.state ? Run.instance.state : new StateCache()
  }
  throw new Error(`Invalid state: ${_display(state)}`)
}

function parseOwner (owner, network, logger, run) {
  switch (typeof owner) {
    case 'undefined':
    case 'string':
    case 'object':
      if (owner && owner instanceof Owner) return owner
      return new BasicOwner(owner, network)
    default: throw new Error(`Invalid owner: ${_display(owner)}`)
  }
}

function parseSandbox (sandbox) {
  switch (typeof sandbox) {
    case 'boolean': return sandbox
    case 'object':
      if (sandbox && sandbox instanceof RegExp) return sandbox
      break
    case 'undefined': return true
  }
  throw new Error(`Invalid sandbox: ${_display(sandbox)}`)
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

Run.BlockchainApi = BlockchainApi
Run.LocalPurse = LocalPurse
Run.Mockchain = Mockchain

Run.AddressScript = AddressScript
Run.PubKeyScript = PubKeyScript

Run._util = require('./util')
Run._code = code

Run.FriendlySet = FriendlySet
Run.FriendlyMap = FriendlyMap
Run.Location = Location
Run.StateCache = StateCache

Run.Jig = Jig
Run.Berry = Berry
Run.Token = Token
Run.expect = expect

Run.instance = null

/* global VERSION */
Run.version = (typeof VERSION !== 'undefined' && VERSION) || require('../package').version

Run.protocol = PROTOCOL_VERSION

// ------------------------------------------------------------------------------------------------

module.exports = Run
