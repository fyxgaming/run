/**
 * index.js
 *
 * Primary library export and Run class
 */

// Bsv
const bsv = require('bsv')
const { PrivateKey, PublicKey, Address } = bsv

// Kernel
const Kernel = require('./kernel/kernel')
const { Blockchain, Logger, Purse, Cache, Lock, Owner } = require('./kernel/api')
const Jig = require('./kernel/jig')
const Berry = require('./kernel/berry')
const Code = require('./kernel/code')
const Commit = require('./kernel/commit')
const Loader = require('./kernel/loader')
const Transaction = require('./kernel/transaction')
const StandardLock = require('./util/standard-lock')
const Sandbox = require('./util/sandbox')
const Log = require('./util/log')
const { _text, _defineGetter, _checkArgument, _limit } = require('./util/misc')

// Module
const { BlockchainServer, MatterCloud, WhatsOnChain, RemoteBlockchain } = require('./module/remote-blockchain')
const LocalCache = require('./module/local-cache')
const LocalOwner = require('./module/local-owner')
const LocalPurse = require('./module/local-purse')
const Viewer = require('./module/viewer')
const Mockchain = require('./module/mockchain')
const PayServer = require('./module/pay-server')
const Inventory = require('./module/inventory')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Run'

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
    if (Log._infoOn) Log._info(TAG, 'Create')

    options = Object.assign({}, Run.defaults, options)

    this.logger = options.logger

    this._kernel = new Kernel()
    this._kernel._cache = parseCache(options.cache)
    this._kernel._blockchain = parseBlockchain(options, this._kernel._cache)
    this._kernel._purse = parsePurse(options.purse, this.blockchain, options.wallet)
    this._kernel._app = parseApp(options.app)
    this._kernel._owner = parseOwner(options.owner, this.blockchain, options.wallet)
    this._kernel._timeout = parseTimeout(options.timeout)
    this._kernel._trusts = parseTrusts(options.trust)

    // Create an inventory specifically for this owner
    this._inventory = new Inventory()

    // If using the mockchain and local purse, automatically fund the purse with some money
    if (this.blockchain instanceof Mockchain && this.purse instanceof LocalPurse && options.autofund) {
      this.blockchain.fund(this.purse.bsvAddress, 100000000)
    }

    this.activate()
  }

  get app () { return this._kernel._app }
  get blockchain () { return this._kernel._blockchain }
  get cache () { return this._kernel._cache }
  get inventory () { return this._inventory }
  get logger () { return Log._logger }
  get owner () { return _backwardsCompatOwner(this._kernel._owner, this.inventory) }
  get purse () { return this._kernel._purse }
  get timeout () { return this._kernel._timeout }
  get wallet () { return this._kernel._purse === this._kernel._owner ? this._kernel._purse : undefined }

  set app (app) { this._kernel._app = parseApp(app) }
  set cache (cache) { this._kernel._cache = null; this._kernel._cache = parseCache(cache) }
  set logger (logger) { this._logger = Log._logger = parseLogger(logger) }
  set owner (owner) {
    this._kernel._owner = parseOwner(owner)
    this._inventory.deactivate()
    this._inventory = new Inventory()
    this._inventory.activate(this)
  }

  set purse (purse) { this._kernel._purse = parsePurse(purse, this.blockchain) }
  set timeout (timeout) { this._kernel._timeout = parseTimeout(timeout) }
  set wallet (wallet) { this.purse = wallet; this.owner = wallet }

  // TODO: Can we set these mid-way? Cache during enqueue
  // TODO: Set owner, and change inventory with it

  async load (location, options = {}) {
    this._checkActive()
    if (options.trust) this.trust(location.slice(0, 64))
    const loader = new Loader(this._kernel)
    return loader._load(location, options.berry)
  }

  async sync () {
    return Commit._syncAll()
  }

  deploy (T) {
    this._checkActive()
    const C = this.install(T)
    Code._editor(C)._deploy()
    return C
  }

  install (T) {
    this._checkActive()
    const C = Code._lookupByType(T) || new Code()
    const editor = Code._editor(C)
    if (!editor._installed) editor._install(T)
    return C
  }

  transaction (callback) {
    this._checkActive()
    const transaction = new Transaction()
    const ret = transaction.update(callback)
    transaction.publish()
    return ret
  }

  import (rawtx, options = {}) {
    if (options.trust) this.trust(new bsv.Transaction(rawtx).hash)
    return Transaction.import(rawtx)
  }

  trust (x) {
    if (Log._infoOn) Log._info(TAG, 'Trust', x)
    _checkArgument(trustable(x), `Not trustable: ${_text(x)}`)
    this._kernel._trusts.add(x)
  }

  on (_event, _listener) {
    _checkArgument(Kernel._EVENTS.includes(_event), `Invalid event: ${_event}`)
    _checkArgument(typeof _listener === 'function', `Invalid listener: ${_text(_limit)}`)
    if (this._kernel._listeners.some(x => x._event === _event && x._listener === _listener)) return
    this._kernel._listeners.push({ _event, _listener })
  }

  off (event, listener) {
    _checkArgument(Kernel._EVENTS.includes(event), `Invalid event: ${event}`)
    _checkArgument(typeof listener === 'function', `Invalid listener: ${_text(listener)}`)
    const matches = x => x._event === event && x._listener === listener
    this._kernel._listeners = this._kernel._listeners.filter(x => !matches(x))
  }

  activate () {
    if (Log._infoOn) Log._info(TAG, 'Activate')
    Run.instance = this
    this._inventory.activate(this)
    this._kernel._activate()
    return this
  }

  deactivate () {
    if (Log._infoOn) Log._info(TAG, 'Deactivate')
    Run.instance = null
    this._inventory.deactivate()
    this._kernel._deactivate()
    return this
  }

  payload (tx) {
    const { _payload } = require('./kernel/loader')
    return _payload(new bsv.Transaction(tx))
  }

  _checkActive () {
    if (Kernel._instance !== this._kernel) {
      const hint = 'Hint: Call run.activate() on this instance first'
      throw new Error(`This Run instance is not active\n\n${hint}`)
    }
  }
}

Run.instance = null

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseBlockchain (options, state) {
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
        if (lastBlockchain instanceof RemoteBlockchain &&
          lastBlockchain.api === api &&
          lastBlockchain.apiKey === apiKey &&
          lastBlockchain.timeout === timeout &&
          lastBlockchain.network === network) {
          return lastBlockchain
        }

        return RemoteBlockchain.create({
          api,
          apiKey,
          network,
          timeout,
          cache: state,
          lastBlockchain
        })

      default:
        throw new Error(`Unsupported network: ${network}`)
    }
  }

  throw new Error(`Invalid blockchain: ${_text(blockchain)}`)
}

// ------------------------------------------------------------------------------------------------

function parseLogger (logger) {
  if (logger instanceof Logger) return logger

  if (typeof logger === 'undefined') return Log._defaultLogger

  if (logger === null) return {}

  throw new Error(`Invalid logger: ${_text(logger)}`)
}

// ------------------------------------------------------------------------------------------------

function parsePurse (purse, blockchain, wallet) {
  if (wallet) {
    if (!(wallet instanceof Purse)) throw new Error('wallet does not implement the Purse API')
    return wallet
  }

  if (purse instanceof Purse) return purse

  switch (typeof purse) {
    case 'string': return new LocalPurse({ privkey: purse, blockchain })
    case 'undefined': return new LocalPurse({ blockchain })
    case 'object':
      if (purse instanceof PrivateKey) {
        return new LocalPurse({ privkey: purse, blockchain })
      }
  }

  throw new Error(`Invalid purse: ${_text(purse)}`)
}

// ------------------------------------------------------------------------------------------------

function parseApp (app) {
  switch (typeof app) {
    case 'string': return app
    case 'undefined': return ''
    default: throw new Error(`Invalid app: ${_text(app)}`)
  }
}

// ------------------------------------------------------------------------------------------------

function parseCache (cache) {
  if (cache instanceof Cache) return cache

  if (typeof cache === 'undefined') {
    return Run.instance && Run.instance.cache ? Run.instance.cache : new LocalCache()
  }

  throw new Error(`Invalid cache: ${_text(cache)}`)
}

// ------------------------------------------------------------------------------------------------

function parseTimeout (timeout) {
  switch (typeof timeout) {
    case 'number':
      if (Number.isNaN(timeout) || timeout < 0) throw new Error(`Invalid timeout: ${timeout}`)
      return timeout
    case 'undefined': return 10000
    default: throw new Error(`Invalid timeout: ${timeout}`)
  }
}

// ------------------------------------------------------------------------------------------------

function parseOwner (owner, blockchain, wallet) {
  if (wallet) {
    if (!(wallet instanceof Owner)) throw new Error('wallet does not implement the Owner API')
    return wallet
  }

  if (owner instanceof Owner) return owner

  // Try creating LocalOwner
  if (typeof owner === 'undefined' || typeof owner === 'string' || owner instanceof PrivateKey) {
    try {
      return new LocalOwner({ privkey: owner, blockchain })
    } catch (e) { /* no-op */ }
  }

  // Try creating Viewer from private and public keys
  if (typeof owner === 'string' || owner instanceof PublicKey || owner instanceof Address) {
    try {
      return new Viewer(owner.toString())
    } catch (e) { /* no-op */ }
  }

  // Try creating Viewer from a custom lock
  if (typeof owner === 'object') {
    try {
      return new Viewer(owner)
    } catch (e) { /* no-op */ }
  }

  throw new Error(`Invalid owner: ${_text(owner)}`)
}

// ------------------------------------------------------------------------------------------------

function parseTrusts (trust) {
  // If not defined and there is a previous instance, use its set. Trusting code is intentional.
  const lastTrusts = Kernel._instance && Kernel._instance._trusts
  if (typeof trust === 'undefined') return lastTrusts || []

  // We allow a simple array to be used to specify '*' easily
  if (typeof trust === 'string') trust = [trust]

  // Make sure the trust parameter and its array entries are valid
  if (!Array.isArray(trust) || trust.some(x => !trustable(x))) {
    throw new Error(`Not trustable: ${_text(trust)}`)
  }

  return new Set(trust)
}

// ------------------------------------------------------------------------------------------------

function trustable (x) {
  if (x === '*') return true
  if (typeof x !== 'string') return false
  if (x.length !== 64) return false
  return /[a-fA-F0-9]+/.test(x)
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
Run.defaults.autofund = true
Run.defaults.timeout = 2000
Run.defaults.trust = []

// ------------------------------------------------------------------------------------------------
// configure
// ------------------------------------------------------------------------------------------------

/**
 * Configures the Run defaults
 */
Run.configure = (env, network) => {
  // App
  if (env.APP) Run.defaults.app = env.APP

  // Network
  network = network || env.NETWORK || Run.defaults.network
  Run.defaults.network = network

  // Logger
  if (env.LOGGER === 'debug') {
    Run.defaults.logger = console
  } else if (env.LOGGER && JSON.parse(env.LOGGER)) {
    const infoLogger = { info: console.info, warn: console.warn, error: console.error }
    Run.defaults.logger = infoLogger
  } else {
    Run.defaults.logger = {}
  }
  Log._logger = Run.defaults.logger

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
// preinstall
// ------------------------------------------------------------------------------------------------

Run.preinstall = T => Code._preinstall(T)

// ------------------------------------------------------------------------------------------------
// _backwardsCompatOwner
// ------------------------------------------------------------------------------------------------

function _backwardsCompatOwner (owner, inventory) {
  const warn = method => {
    const part1 = `run.owner.${method} is now deprecated.`
    const part2 = `Please switch to run.inventory.${method}`
    if (Log._warnOn) Log._warn('Owner', `${part1} ${part2}`)
  }

  if (!('jigs' in owner)) {
    Object.defineProperty(owner, 'jigs', {
      configurable: true,
      enumerable: true,
      get: () => { warn('jigs'); try { return inventory.jigs } catch (e) { return [] } }
    })
  }

  if (!('code' in owner)) {
    Object.defineProperty(owner, 'code', {
      configurable: true,
      enumerable: true,
      get: () => { warn('code'); try { return inventory.code } catch (e) { return [] } }
    })
  }

  return owner
}

// ------------------------------------------------------------------------------------------------
// Additional exports
// ------------------------------------------------------------------------------------------------

// Kernel
Run.Berry = Berry
Run.Code = Code
Run.Jig = Jig
Run.StandardLock = StandardLock
Run.Transaction = Transaction

// Module
Run.BlockchainServer = BlockchainServer
Run.LocalOwner = LocalOwner
Run.LocalPurse = LocalPurse
Run.MatterCloud = MatterCloud
Run.Mockchain = Mockchain
Run.PayServer = PayServer
Run.RemoteBlockchain = RemoteBlockchain
Run.LocalCache = LocalCache
Run.Viewer = Viewer
Run.WhatsOnChain = WhatsOnChain

// Extra
Run.asm = require('./extra/asm')
Run.expect = require('./extra/expect')
Run.GroupLock = require('./extra/group-lock')
Run.hex = require('./extra/hex')
// Preinstalled extras are defined with getters to facilitate code coverage
_defineGetter(Run, 'Token', () => require('./extra/token'))

// Hidden
Run._admin = require('./util/admin')._admin
Run._bindings = require('./util/bindings')
Run._bsv = require('./util/bsv')
Run._Codec = require('./util/codec')
Run._deep = require('./util/deep')
Run._Dynamic = require('./util/dynamic')
Run._Log = require('./util/log')
Run._payload = require('./kernel/loader')._payload
Run._Membrane = require('./kernel/membrane')
Run._misc = require('./util/misc')
Run._Record = require('./kernel/record')
Run._RESERVED_PROPS = require('./util/misc')._RESERVED_PROPS
Run._RESERVED_METHODS = require('./util/misc')._RESERVED_METHODS
Run._REST = require('./util/rest')
Run._Rules = require('./kernel/rules')
Run._SerialTaskQueue = require('./util/queue')
Run._Snapshot = require('./util/snapshot')
Run._sudo = require('./util/admin')._sudo
Run._Proxy2 = require('./util/proxy2')
Run._Unbound = require('./util/unbound')
Run._Universal = require('./kernel/universal')

// Api
Run.api = {}
Run.api.Blockchain = Blockchain
Run.api.Logger = Logger
Run.api.Purse = Purse
Run.api.Cache = Cache
Run.api.Lock = Lock
Run.api.Owner = Owner

// Errors
Run.errors = require('./util/errors')

// Sandbox
Run.sandbox = Sandbox

/* global VERSION */
Run.version = (typeof VERSION !== 'undefined' && VERSION) || require('../package').version
Run.protocol = require('./kernel/publish')._PROTOCOL_VERSION

// ------------------------------------------------------------------------------------------------

module.exports = Run
