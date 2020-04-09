/**
 * index.js
 *
 * Primary library export and Run class
 */

const { PrivateKey } = require('bsv')

const Kernel = require('./kernel')
const { Blockchain } = require('./kernel/api')
const { AddressLock, PubKeyLock, Owner, BasicOwner } = require('./kernel/tray')

const BlockchainApi = require('./module/blockchain-api')
const LocalPurse = require('./module/local-purse')
const Mockchain = require('./module/mockchain')
const StateCache = require('./module/state-cache')

const { Jig } = require('./kernel/jig')
const { Berry } = require('./kernel/berry')

const Token = require('./extra/token')
const expect = require('./extra/expect')

const { PROTOCOL_VERSION } = require('./util/opreturn')
const { TokenSet, TokenMap } = require('./util/datatypes')
const { _display } = require('./util/misc')
const Sandbox = require('./util/sandbox')
const Location = require('./util/location')
const Log = require('./util/log')

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

    this.logger = options.logger

    this._kernel = new Kernel()
    this._kernel._blockchain = parseBlockchain(options, this.logger)
    this._kernel._purse = parsePurse(options.purse, this)
    this._kernel._app = parseApp(options.app)
    this._kernel._state = parseState(options.state)
    this._kernel._owner = parseOwner(options.owner, this.blockchain.network, this.logger, this)
    this._kernel._code = options.code
    this._kernel._setup()

    // If using the mockchain and local purse, automatically fund the purse with some money
    if (this.blockchain instanceof Mockchain && this.purse instanceof LocalPurse) {
      this.blockchain.fund(this.purse.bsvAddress, 100000000)
    }

    this.activate()
  }

  get logger () { return Log._logger }
  get blockchain () { return this._kernel._blockchain }
  get purse () { return this._kernel._purse }
  get owner () { return this._kernel._owner }
  get code () { return this._kernel._code }
  get app () { return this._kernel._app }
  get state () { return this._kernel._state }
  get sandbox () { return this._kernel._sandbox }
  get transaction () { return this._kernel._transaction }

  // TODO: Can we set these mid-way? Cache during enqueue
  set logger (logger) { this._logger = Log._logger = parseLogger(logger) }
  set purse (purse) { this._kernel._purse = parsePurse(purse, this) }
  set app (app) { this._kernel._app = parseApp(app) }

  async load (location, options = {}) {
    this._checkActive()
    return this._kernel._load(location, options)
  }

  async deploy (T) {
    this._checkActive()
    this._kernel._deploy(T)
    await this._kernel._sync()
    return T.location
  }

  sync () { return this._kernel._sync() }

  installProtocol (protocol) { this._kernel.installProtocol(protocol) }

  activate () {
    this._kernel._activate()
    Run.instance = this
    Log._logger = this._logger
    return this
  }

  deactivate () {
    this._kernel._deactivate()
    Log._logger = Log._defaultLogger
    Run.instance = null
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
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseBlockchain (options) {
  const { blockchain } = options
  const lastBlockchain = Kernel._instance && Kernel._instance._blockchain

  // If no blockchain is passed, create one
  if (typeof blockchain === 'undefined') {
    switch (options.network) {
      case 'mock':
        return lastBlockchain instanceof Mockchain ? lastBlockchain : new Mockchain()

      case 'main':
      case 'test':
        if (lastBlockchain instanceof BlockchainApi &&
          lastBlockchain.api === options.api &&
          lastBlockchain.apiKey === options.apiKey &&
          lastBlockchain.timeout === options.timeout &&
          lastBlockchain.network === options.network) {
          return lastBlockchain
        }

        return new BlockchainApi({
          api: options.api,
          apiKey: options.apiKey,
          network: options.network,
          timeout: options.timeout,
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
    case 'object': return logger
    case 'undefined': return Log._defaultLogger
    default: throw new Error(`Invalid logger: ${_display(logger)}`)
  }
}

function parsePurse (purse, run) {
  switch (typeof purse) {
    case 'string': return new LocalPurse({ privkey: purse, blockchain: run.blockchain })
    case 'undefined': return new LocalPurse({ blockchain: run.blockchain })
    case 'object':
      if (!purse || purse instanceof PrivateKey) {
        return new LocalPurse({ privkey: purse, blockchain: run.blockchain })
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

// ------------------------------------------------------------------------------------------------
// Defaults
// ------------------------------------------------------------------------------------------------

Run.defaults = {}
Run.defaults.logger = undefined
Run.defaults.network = 'mock'
Run.defaults.api = 'run'
Run.defaults.purse = undefined

// ------------------------------------------------------------------------------------------------
// Additional exports
// ------------------------------------------------------------------------------------------------

Run.Jig = Jig
Run.Berry = Berry

Run.BlockchainApi = BlockchainApi
Run.LocalPurse = LocalPurse
Run.Mockchain = Mockchain
Run.StateCache = StateCache

Run.Token = Token
Run.expect = expect

Run.AddressLock = AddressLock
Run.PubKeyLock = PubKeyLock

Run._util = {}
Run._util.Checkpoint = require('./util/checkpoint')
Run._util.Location = Location
Run._util.Log = require('./util/log')
Run._util.TokenJSON = require('./util/json')
Run._util.TokenSet = TokenSet
Run._util.TokenMap = TokenMap
Object.assign(Run._util, require('./util/misc'))
Object.assign(Run._util, require('./util/opreturn'))

Run.sandbox = Sandbox

Run.instance = null

/* global VERSION */
Run.version = (typeof VERSION !== 'undefined' && VERSION) || require('../package').version
Run.protocol = PROTOCOL_VERSION

// ------------------------------------------------------------------------------------------------

module.exports = Run
