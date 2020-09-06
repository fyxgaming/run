/**
 * index.js
 *
 * Primary library export and Run class
 */

// Bsv
const { PrivateKey, PublicKey, Address } = require('bsv')

// Kernel
const Kernel = require('./kernel/kernel')
const { Blockchain, Logger, Purse, Cache, Lock, Owner } = require('./kernel/api')
const Jig = require('./kernel/jig')
const Berry = require('./kernel/berry')
const Code = require('./kernel/code')
const Commit = require('./kernel/commit')
const Loader = require('./kernel/loader')
const StandardLock = require('./util/standard-lock')
const Sandbox = require('./util/sandbox')
const Log = require('./util/log')
const { _text } = require('./util/misc')

// Module
const { BlockchainServer, MatterCloud, WhatsOnChain, RemoteBlockchain } = require('./module/remote-blockchain')
const LocalCache = require('./module/local-cache')
const LocalOwner = require('./module/local-owner')
const LocalPurse = require('./module/local-purse')
const Viewer = require('./module/viewer')
const Mockchain = require('./module/mockchain')
const PayServer = require('./module/pay-server')

// Extra
const asm = require('./extra/asm')
const expect = require('./extra/expect')
const GroupLock = require('./extra/group-lock')
const hex = require('./extra/hex')

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
    Log._info(TAG, 'Create')

    options = Object.assign({}, Run.defaults, options)

    this.logger = options.logger

    this._kernel = new Kernel()
    this._kernel._cache = parseCache(options.cache)
    this._kernel._blockchain = parseBlockchain(options, this._kernel._cache)
    this._kernel._purse = parsePurse(options.purse, this.blockchain, options.wallet)
    this._kernel._app = parseApp(options.app)
    this._kernel._owner = parseOwner(options.owner, this.blockchain, options.wallet)
    this._kernel._importLimit = typeof options.importLimit === 'undefined' ? 10 : options.importLimit

    // If using the mockchain and local purse, automatically fund the purse with some money
    if (this.blockchain instanceof Mockchain && this.purse instanceof LocalPurse && options.autofund) {
      this.blockchain.fund(this.purse.bsvAddress, 100000000)
    }

    this.activate()
  }

  get app () { return this._kernel._app }
  get blockchain () { return this._kernel._blockchain }
  get logger () { return Log._logger }
  get owner () { return _backwardsCompatOwner(this._kernel._owner, this.inventory) }
  get purse () { return this._kernel._purse }
  get wallet () { return this._kernel._purse === this._kernel._owner ? this._kernel._purse : undefined }
  get cache () { return this._kernel._cache }

  // TODO: Can we set these mid-way? Cache during enqueue
  set app (app) { this._kernel._app = parseApp(app) }
  set logger (logger) { this._logger = Log._logger = parseLogger(logger) }
  set purse (purse) { this._kernel._purse = parsePurse(purse, this.blockchain) }
  set cache (cache) { this._kernel._cache = null; this._kernel._cache = parseCache(cache) }

  // TODO: Set owner, and change inventory with it

  async load (location, BerryClass) {
    this._checkActive()
    const loader = new Loader(this._kernel)
    return loader._load(location, BerryClass)
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
    const C = Code._lookupByType(T) || new Code()
    const editor = Code._editor(C)
    if (!editor._installed) editor._install(T)
    return C
  }

  activate () {
    Run.instance = this
    this._kernel._activate()
    return this
  }

  deactivate () {
    Run.instance = null
    this._kernel._deactivate()
    return this
  }

  _checkActive () {
    if (Kernel._instance !== this._kernel) {
      const hint = 'Hint: Call run.activate() on this instance first'
      throw new Error(`This Run instance is not active\n\n${hint}`)
    }
  }

  _on (event, listener) {
    this._kernel._listeners.push({ event, listener })
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
// _backwardsCompatOwner
// ------------------------------------------------------------------------------------------------

function _backwardsCompatOwner (owner, inventory) {
  const warn = method => {
    const part1 = `run.owner.${method} is now deprecated.`
    const part2 = `Please switch to run.inventory.${method}`
    Log._warn('Owner', `${part1} ${part2}`)
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
Run.asm = asm
Run.expect = expect
Run.GroupLock = GroupLock
Run.hex = hex

// Hidden
Run._admin = require('./util/admin')._admin
Run._bindings = require('./util/bindings')
Run._bsv = require('./util/bsv')
Run._Codec = require('./util/codec')
Run._Codec2 = require('./util/codec2')
Run._deep = require('./util/deep')
Run._Dynamic = require('./util/dynamic')
Run._Log = require('./util/log')
Run._payload = require('./kernel/loader')._payload
Run._Membrane = require('./kernel/membrane')
Run._misc = require('./util/misc')
Run._Record = require('./kernel/record')
Run._RESERVED_PROPS = require('./util/misc')._RESERVED_PROPS
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
