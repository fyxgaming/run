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
const Universal = require('./kernel/universal')
const Transaction = require('./kernel/transaction')
const { _unifyForMethod } = require('./kernel/unify')
const StandardLock = require('./util/standard-lock')
const Sandbox = require('./sandbox/sandbox')
const Log = require('./util/log')
const { _text, _checkState, _defineGetter, _checkArgument, _limit } = require('./util/misc')
const REST = require('./util/rest')

// Module
const Inventory = require('./module/inventory')
const LocalCache = require('./module/local-cache')
const LocalOwner = require('./module/local-owner')
const LocalPurse = require('./module/local-purse')
const MatterCloud = require('./module/mattercloud')
const Mockchain = require('./module/mockchain')
const PayServer = require('./module/pay-server')
const RemoteBlockchain = require('./module/remote-blockchain')
const RunConnect = require('./module/run-connect')
const Viewer = require('./module/viewer')
const WhatsOnChain = require('./module/whatsonchain')

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
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  constructor (options = {}) {
    if (Log._infoOn) Log._info(TAG, 'Create')

    options = Object.assign({}, Run.defaults, options)

    this.logger = options.logger
    this.networkRetries = options.networkRetries
    this.networkTimeout = options.networkTimeout

    this._kernel = new Kernel()
    this._kernel._cache = parseCache(options.cache)
    this._kernel._client = parseClient(options.client)
    this._kernel._blockchain = parseBlockchain(options, this._kernel._cacheAPI())
    this._kernel._purse = parsePurse(options.purse, this._kernel._blockchainAPI(), options.wallet)
    this._kernel._app = parseApp(options.app)
    this._kernel._owner = parseOwner(options.owner, this._kernel._blockchainAPI(), options.wallet)
    this._kernel._timeout = parseTimeout(options.timeout)
    this._kernel._trusts = parseTrusts(options.trust)
    this._kernel._preverify = parsePreverify(options.preverify)
    this._autofund = parseAutofund(options.autofund)
    this._inventory = parseInventory(options.inventory)

    // If using the mockchain and local purse, automatically fund the purse with some money
    autofundPurse(this)

    this.activate()
  }

  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------

  get app () { return this._kernel._app }
  get autofund () { return this._autofund }
  get blockchain () { return this._kernel._blockchain }
  get cache () { return this._kernel._cache }
  get client () { return this._kernel._client }
  get inventory () { return this._inventory }
  get logger () { return this._logger }
  get networkRetries () { return this._networkRetries }
  get networkTimeout () { return this._networkTimeout }
  get owner () { return this._kernel._owner }
  get purse () { return this._kernel._purse }
  get timeout () { return this._kernel._timeout }
  get wallet () { return this._kernel._purse === this._kernel._owner ? this._kernel._purse : undefined }

  // --------------------------------------------------------------------------
  // Setters
  // --------------------------------------------------------------------------

  set app (app) { this._kernel._app = parseApp(app) }
  set autofund (autofund) { this._autofund = parseAutofund(autofund) }
  set blockchain (blockchain) {
    this._kernel._blockchain = parseBlockchain({ blockchain })
    if (this._kernel._purse instanceof LocalPurse) {
      this._kernel._purse.blockchain = this._kernel._blockchain
    }
    autofundPurse(this)
  }

  set cache (cache) { this._kernel._cache = null; this._kernel._cache = parseCache(cache) }
  set client (client) { this._kernel._client = parseClient(client) }
  set inventory (inventory) {
    if (this._inventory) this._inventory.deactivate()
    this._inventory = parseInventory(inventory)
    if (this._inventory) this._inventory.activate(this)
  }

  set logger (logger) {
    this._logger = parseLogger(logger)
    if (isActive(this)) Log._logger = this._logger
  }

  set networkRetries (networkRetries) {
    this._networkRetries = REST._retries = parseNetworkRetries(networkRetries)
    if (isActive(this)) REST._retries = parseNetworkRetries(networkRetries)
  }

  set networkTimeout (networkTimeout) {
    this._networkTimeout = parseNetworkTimeout(networkTimeout)
    if (isActive(this)) REST._timeout = parseNetworkTimeout(networkTimeout)
  }

  set owner (owner) {
    this._kernel._owner = parseOwner(owner, this._kernel._blockchainAPI())
    if (this._inventory) this._inventory.deactivate()
    this._inventory = new Inventory()
    this._inventory.activate(this)
  }

  set preverify (preverify) { this._kernel._preverify = parsePreverify(preverify) }
  set purse (purse) { this._kernel._purse = parsePurse(purse, this.blockchain) }
  set timeout (timeout) { this._kernel._timeout = parseTimeout(timeout) }
  set wallet (wallet) { this.purse = wallet; this.owner = wallet }

  // --------------------------------------------------------------------------
  // Methods
  // --------------------------------------------------------------------------

  load (location, options = {}) {
    checkActive(this)
    _checkState(!Transaction._ATOMICALLY_UPDATING, 'load disabled during atomic transaction')
    if (options.trust) this.trust(location.slice(0, 64))
    const loader = new Loader(this._kernel)
    return loader._load(location, options.berry)
  }

  sync () {
    _checkState(!Transaction._ATOMICALLY_UPDATING, 'sync all disabled during atomic transaction')
    return Commit._syncAll()
  }

  deploy (T) {
    checkActive(this)
    const C = this.install(T)
    Code._editor(C)._deploy()
    return C
  }

  install (T) {
    checkActive(this)
    const C = Code._lookupByType(T) || new Code()
    const editor = Code._editor(C)
    if (!editor._installed) editor._install(T)
    return C
  }

  uninstall (T) {
    const C = Code._lookupByType(T)
    if (!C) return
    const editor = Code._editor(C)
    editor._uninstall()
  }

  transaction (callback) {
    checkActive(this)
    const transaction = new Transaction()
    const ret = transaction.update(callback)
    transaction.publish()
    return ret
  }

  import (rawtx, options = {}) {
    _checkState(!Transaction._ATOMICALLY_UPDATING, 'import disabled during atomic transaction')
    const tx = new bsv.Transaction(rawtx)
    const txid = tx.hash
    if (options.trust) this.trust(txid)
    return Transaction._import(tx, txid)
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

    _checkState(!Transaction._ATOMICALLY_UPDATING, 'activate disabled during atomic transaction')
    Run.instance = this

    if (this._inventory) this._inventory.activate(this)

    this._kernel._activate()

    // Configure globals defined by this instance by setting their properties here again.
    this.logger = this._logger
    this.networkRetries = this._networkRetries
    this.networkTimeout = this._networkTimeout

    return this
  }

  deactivate () {
    if (Log._infoOn) Log._info(TAG, 'Deactivate')
    _checkState(!Transaction._ATOMICALLY_UPDATING, 'deactivate disabled during atomic transaction')
    Run.instance = null
    if (this._inventory) this._inventory.deactivate()
    this._kernel._deactivate()
    return this
  }

  payload (tx) {
    const { _payload } = require('./kernel/loader')
    return _payload(new bsv.Transaction(tx))
  }

  unify (...jigs) {
    _checkArgument(jigs.length, 'No jigs to unify')
    _checkArgument(!jigs.some(jig => !(jig instanceof Universal)), 'Must only unify jigs')
    _unifyForMethod(jigs, jigs)
  }
}

Run.instance = null

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function isActive (run) {
  return Kernel._instance === run._kernel
}

function checkActive (run) {
  if (Kernel._instance !== run._kernel) {
    const hint = 'Hint: Call run.activate() on this instance first'
    throw new Error(`This Run instance is not active\n\n${hint}`)
  }
}

// ------------------------------------------------------------------------------------------------

function autofundPurse (run) {
  if (run.blockchain instanceof Mockchain && run.purse instanceof LocalPurse && run.autofund) {
    run.blockchain.fund(run.purse.bsvAddress, 100000000)
  }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseBlockchain (options, cache) {
  const { api, apiKey, blockchain, network } = options

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
          lastBlockchain.network === network) {
          return lastBlockchain
        }

        return RemoteBlockchain.create({
          api,
          apiKey,
          network,
          cache,
          lastBlockchain
        })

      default:
        if (Run.defaults.blockchain instanceof Blockchain) {
          return Run.defaults.blockchain
        }

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
    case 'undefined': return Run.defaults.app
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

function parseNetworkRetries (networkRetries) {
  switch (typeof networkRetries) {
    case 'number':
      if (Number.isNaN(networkRetries) || networkRetries < 0) throw new Error(`Invalid network retries: ${networkRetries}`)
      return networkRetries
    case 'undefined': return 2
    default: throw new Error(`Invalid timeout: ${networkRetries}`)
  }
}

// ------------------------------------------------------------------------------------------------

function parseNetworkTimeout (networkTimeout) {
  switch (typeof networkTimeout) {
    case 'number':
      if (Number.isNaN(networkTimeout) || networkTimeout < 0) throw new Error(`Invalid network timeout: ${networkTimeout}`)
      return networkTimeout
    case 'undefined': return 10000
    default: throw new Error(`Invalid network timeout: ${networkTimeout}`)
  }
}

// ------------------------------------------------------------------------------------------------

function parseTimeout (timeout) {
  switch (typeof timeout) {
    case 'number':
      if (Number.isNaN(timeout) || timeout < 0) throw new Error(`Invalid timeout: ${timeout}`)
      return timeout
    case 'undefined': return 30000
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
      return new LocalOwner(owner, blockchain.network)
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

function parsePreverify (preverify) {
  switch (typeof preverify) {
    case 'boolean': return preverify
    case 'undefined': return Run.defaults.preverify
    default: throw new Error(`Invalid preverify: ${preverify}`)
  }
}

// ------------------------------------------------------------------------------------------------

function parseAutofund (autofund) {
  switch (typeof autofund) {
    case 'boolean': return autofund
    case 'undefined': return Run.defaults.autofund
    default: throw new Error(`Invalid autofund: ${autofund}`)
  }
}

// ------------------------------------------------------------------------------------------------

function parseClient (client) {
  switch (typeof client) {
    case 'boolean': return client
    case 'undefined': return Run.defaults.client
    default: throw new Error(`Invalid client: ${client}`)
  }
}

// ------------------------------------------------------------------------------------------------

function parseInventory (inventory) {
  switch (typeof inventory) {
    case 'boolean': return null
    case 'object': return inventory
    case 'undefined': return new Inventory()
    default: throw new Error(`Invalid inventory: ${inventory}`)
  }
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
Run.defaults.api = undefined
Run.defaults.apiKey = undefined
Run.defaults.app = ''
Run.defaults.autofund = true
Run.defaults.blockchain = undefined
Run.defaults.client = false
Run.defaults.inventory = undefined
Run.defaults.logger = undefined
Run.defaults.network = 'main'
Run.defaults.networkRetries = 2
Run.defaults.networkTimeout = 10000
Run.defaults.owner = undefined
Run.defaults.preverify = true
Run.defaults.purse = undefined
Run.defaults.timeout = 30000
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
  } else if (env.LOGGER && !JSON.parse(env.LOGGER)) {
    Run.defaults.logger = { }
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
// cover
// ------------------------------------------------------------------------------------------------

// Enables collecting code coverage for a class or function
// load() and import() are not supported in cover tests, and there may be random bugs
Run.cover = name => { if (!Sandbox._cover.includes(name)) Sandbox._cover.push(name) }

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
Run.Inventory = Inventory
Run.LocalOwner = LocalOwner
Run.LocalPurse = LocalPurse
Run.MatterCloud = MatterCloud
Run.Mockchain = Mockchain
Run.PayServer = PayServer
Run.RemoteBlockchain = RemoteBlockchain
Run.RunConnect = RunConnect
Run.LocalCache = LocalCache
Run.Viewer = Viewer
Run.WhatsOnChain = WhatsOnChain

// Extra
// Preinstalled extras are lazy loaded to facilitate code coverage
_defineGetter(Run, 'asm', () => require('./extra/asm'))
_defineGetter(Run, 'expect', () => require('./extra/expect'))
_defineGetter(Run, 'Group', () => require('./extra/group'))
_defineGetter(Run, 'hex', () => require('./extra/hex'))
_defineGetter(Run, 'Token', () => require('./extra/token'))

// Hidden
Run._admin = require('./util/admin')._admin
Run._bindings = require('./util/bindings')
Run._bsv = require('./util/bsv')
Run._Codec = require('./util/codec')
Run._deep = require('./util/deep')
Run._DeterministicRealm = require('./sandbox/realm')
Run._Dynamic = require('./util/dynamic')
Run._Log = require('./util/log')
Run._payload = require('./kernel/loader')._payload
Run._Membrane = require('./kernel/membrane')
Run._misc = require('./util/misc')
Run._Record = require('./kernel/record')
Run._RESERVED_PROPS = require('./util/misc')._RESERVED_PROPS
Run._RESERVED_CODE_METHODS = require('./util/misc')._RESERVED_CODE_METHODS
Run._RESERVED_JIG_METHODS = require('./util/misc')._RESERVED_JIG_METHODS
Run._REST = require('./util/rest')
Run._Rules = require('./kernel/rules')
Run._Sandbox = Sandbox
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

/* global VERSION */
Run.version = (typeof VERSION !== 'undefined' && VERSION) || require('../package').version
Run.protocol = require('./kernel/publish')._PROTOCOL_VERSION

// ------------------------------------------------------------------------------------------------

module.exports = Run
