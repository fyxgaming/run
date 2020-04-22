/**
 * index.js
 *
 * Primary library export and Run class
 */

// Bsv
const { PrivateKey, PublicKey, Address } = require('bsv')

// Kernel
const Kernel = require('./kernel/kernel')
const { Blockchain, Logger, Purse, State, Lock, Owner } = require('./kernel/api')
const { Jig } = require('./kernel/jig')
const { Berry } = require('./kernel/berry')

// Module
const BlockchainApi = require('./module/blockchain-api')
const LocalOwner = require('./module/local-owner')
const LocalPurse = require('./module/local-purse')
const LockOwner = require('./module/lock-owner')
const Mockchain = require('./module/mockchain')
const PayServer = require('./module/pay-server')
const StateCache = require('./module/state-cache')

// Extra
const asm = require('./extra/asm')
const expect = require('./extra/expect')
const GroupLock = require('./extra/group-lock')
const hex = require('./extra/hex')
const Token = require('./extra/token')

// Util
const StandardLock = require('./util/standard-lock')
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
    this._kernel._purse = parsePurse(options.purse, this.blockchain)
    this._kernel._app = parseApp(options.app)
    this._kernel._state = parseState(options.state)
    this._kernel._owner = parseOwner(options.owner, this.blockchain)
    this._kernel._code = options.code
    this._kernel._setup()

    // If using the mockchain and local purse, automatically fund the purse with some money
    if (this.blockchain instanceof Mockchain && this.purse instanceof LocalPurse) {
      this.blockchain.fund(this.purse.bsvAddress, 100000000)
    }

    this.activate()
  }

  get app () { return this._kernel._app }
  get blockchain () { return this._kernel._blockchain }
  get code () { return this._kernel._code }
  get inventory () { return this._kernel._inventory }
  get logger () { return Log._logger }
  get owner () { return this._kernel._owner }
  get purse () { return this._kernel._purse }
  get sandbox () { return this._kernel._sandbox }
  get state () { return this._kernel._state }
  get transaction () { return this._kernel._transaction }

  // TODO: Can we set these mid-way? Cache during enqueue
  set app (app) { this._kernel._app = parseApp(app) }
  set logger (logger) { this._logger = Log._logger = parseLogger(logger) }
  set purse (purse) { this._kernel._purse = parsePurse(purse, this.blockchain) }

  // TODO: Set owner, and change inventory with it

  async load (location, _BerryClass) {
    this._checkActive()
    return this._kernel._load(location, { _BerryClass })
  }

  async deploy (T) {
    this._checkActive()
    this._kernel._deploy(T)
    await this._kernel._sync()
    return T.location
  }

  sync () { return this._kernel._sync() }

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
  const { api, apiKey, blockchain, network, timeout } = options

  if (blockchain instanceof Blockchain) return blockchain

  const lastBlockchain = Kernel._instance && Kernel._instance._blockchain

  // If no blockchain is passed in, create one
  if (typeof blockchain === 'undefined') {
    switch (network) {
      case 'mock':
        return lastBlockchain instanceof Mockchain ? lastBlockchain : new Mockchain()

      case 'main':
      case 'test':
      case 'stn':
        if (lastBlockchain instanceof BlockchainApi &&
          lastBlockchain.api === api &&
          lastBlockchain.apiKey === apiKey &&
          lastBlockchain.timeout === timeout &&
          lastBlockchain.network === network) {
          return lastBlockchain
        }
        return new BlockchainApi({ api, apiKey, network, timeout, lastBlockchain })

      default:
        throw new Error(`Unsupported network: ${network}`)
    }
  }

  throw new Error(`Invalid blockchain: ${_display(blockchain)}`)
}

// ------------------------------------------------------------------------------------------------

function parseLogger (logger) {
  if (logger instanceof Logger) return logger

  if (typeof logger === 'undefined') return Log._defaultLogger

  if (logger === null) return {}

  throw new Error(`Invalid logger: ${_display(logger)}`)
}

// ------------------------------------------------------------------------------------------------

function parsePurse (purse, blockchain) {
  if (purse instanceof Purse) return purse

  switch (typeof purse) {
    case 'string': return new LocalPurse({ privkey: purse, blockchain })
    case 'undefined': return new LocalPurse({ blockchain })
    case 'object':
      if (purse instanceof PrivateKey) {
        return new LocalPurse({ privkey: purse, blockchain })
      }
  }

  throw new Error(`Invalid purse: ${_display(purse)}`)
}

// ------------------------------------------------------------------------------------------------

function parseApp (app) {
  switch (typeof app) {
    case 'string': return app
    case 'undefined': return ''
    default: throw new Error(`Invalid app: ${_display(app)}`)
  }
}

// ------------------------------------------------------------------------------------------------

function parseState (state) {
  if (state instanceof State) return state

  if (typeof state === 'undefined') {
    return Run.instance && Run.instance.state ? Run.instance.state : new StateCache()
  }

  throw new Error(`Invalid state: ${_display(state)}`)
}

// ------------------------------------------------------------------------------------------------

function parseOwner (owner, blockchain) {
  if (owner instanceof Owner) return owner

  // Try creating LocalOwner
  if (typeof owner === 'undefined' || typeof owner === 'string' || owner instanceof PrivateKey) {
    try {
      return new LocalOwner({ privkey: owner, blockchain })
    } catch (e) { /* no-op */ }
  }

  // Try creating LockOwner from private and public keys
  if (typeof owner === 'string' || owner instanceof PublicKey || owner instanceof Address) {
    try {
      return new LockOwner({ owner: owner.toString(), blockchain })
    } catch (e) { /* no-op */ }
  }

  // Try creating LockOwner from a custom lock
  if (typeof owner === 'object') {
    try {
      return new LockOwner({ owner, blockchain })
    } catch (e) { /* no-op */ }
  }

  throw new Error(`Invalid owner: ${_display(owner)}`)
}

// ------------------------------------------------------------------------------------------------
// Defaults
// ------------------------------------------------------------------------------------------------

// Default settings that Run uses when an option is not provided or undefined
Run.defaults = {}
Run.defaults.app = ''
Run.defaults.network = 'main'
Run.defaults.logger = undefined
Run.defaults.api = undefined
Run.defaults.apiKey = undefined
Run.defaults.purse = undefined
Run.defaults.owner = undefined

// ------------------------------------------------------------------------------------------------
// configure
// ------------------------------------------------------------------------------------------------

/**
 * Configures the Run defaults
 */
Run.configure = (env, network) => {
  // App
  if (typeof env.APP !== 'undefined') Run.defaults.app = env.APP

  // Network
  network = network || env.NETWORK || Run.defaults.network
  Run.defaults.network = network

  // Logger
  if (typeof env.LOGGER !== 'undefined') {
    Run.defaults.logger = JSON.parse(env.LOGGER) ? console : {}
    Run._util.Log._logger = Run.defaults.logger
  }

  // Purse
  const purse = env.PURSE || env[`PURSE_${network.toUpperCase()}`]
  if (typeof purse !== 'undefined') Run.defaults.purse = purse

  // Owner
  const owner = env.OWNER || env[`OWNER_${network.toUpperCase()}`]
  if (typeof owner !== 'undefined') Run.defaults.owner = owner

  // Api
  if (typeof env.API !== 'undefined') Run.defaults.api = env.API

  // Api key
  const apiKey = env.APIKEY || env[`APIKEY_${(Run.defaults.api || '').toUpperCase()}`]
  if (typeof apiKey !== 'undefined') Run.defaults.apiKey = apiKey
}

// ------------------------------------------------------------------------------------------------
// Additional exports
// ------------------------------------------------------------------------------------------------

// Kernel
Run.Berry = Berry
Run.Jig = Jig
Run.StandardLock = StandardLock

// Module
Run.BlockchainApi = BlockchainApi
Run.LocalOwner = LocalOwner
Run.LocalPurse = LocalPurse
Run.LockOwner = LockOwner
Run.Mockchain = Mockchain
Run.PayServer = PayServer
Run.StateCache = StateCache

// Extra
Run.asm = asm
Run.expect = expect
Run.GroupLock = GroupLock
Run.hex = hex
Run.Token = Token

// Hidden
Run._util = {}
Run._util.Checkpoint = require('./util/checkpoint')
Run._util.Location = Location
Run._util.Log = require('./util/log')
Run._util.TokenJSON = require('./util/json')
Run._util.TokenSet = TokenSet
Run._util.TokenMap = TokenMap
Object.assign(Run._util, require('./util/misc'))
Object.assign(Run._util, require('./util/opreturn'))

// Api
Run.api = {}
Run.api.Blockchain = Blockchain
Run.api.Logger = Logger
Run.api.Purse = Purse
Run.api.State = State
Run.api.Lock = Lock
Run.api.Owner = Owner

// Errors
Run.errors = require('./util/errors')

// Sandbox
Run.sandbox = Sandbox

// Active instance
Run.instance = null

/* global VERSION */
Run.version = (typeof VERSION !== 'undefined' && VERSION) || require('../package').version
Run.protocol = PROTOCOL_VERSION

// ------------------------------------------------------------------------------------------------

module.exports = Run
