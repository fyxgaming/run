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
const Editor = require('./kernel/editor')
const Commit = require('./kernel/commit')
const Loader = require('./kernel/loader')
const Creation = require('./kernel/creation')
const CommonLock = require('./util/common-lock')
const Transaction = require('./kernel/transaction')
const { _unifyForMethod } = require('./kernel/unify')
const Sandbox = require('./sandbox/sandbox')
const Log = require('./util/log')
const { _text, _defineGetter, _limit } = require('./util/misc')
const REST = require('./util/rest')
const { ArgumentError, StateError } = require('./util/errors')

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
    this._kernel._trusts = parseTrust(options.trust)
    this._kernel._preverify = parsePreverify(options.preverify)
    this._kernel._rollbacks = parseRollbacks(options.rollbacks)
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
  get preverify () { return this._kernel._preverify }
  get purse () { return this._kernel._purse }
  get rollbacks () { return this._kernel._rollbacks }
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

  set rollbacks (rollbacks) { this._kernel._rollbacks = parseRollbacks(rollbacks) }
  set preverify (preverify) { this._kernel._preverify = parsePreverify(preverify) }
  set purse (purse) { this._kernel._purse = parsePurse(purse, this.blockchain) }
  set timeout (timeout) { this._kernel._timeout = parseTimeout(timeout) }
  set wallet (wallet) { this.purse = wallet; this.owner = wallet }

  // --------------------------------------------------------------------------
  // Methods
  // --------------------------------------------------------------------------

  load (location, options = {}) {
    checkActive(this)
    if (Transaction._ATOMICALLY_UPDATING) throw new StateError('load disabled during atomic update')
    if (options.trust) this.trust(location.slice(0, 64))
    const loader = new Loader(this._kernel)
    return loader._load(location, options.berry)
  }

  sync () {
    if (Transaction._ATOMICALLY_UPDATING) throw new StateError('sync all disabled during atomic update')
    return Commit._syncAll()
  }

  deploy (T) {
    checkActive(this)
    const C = Run.install(T)
    Editor._get(C)._deploy()
    return C
  }

  transaction (callback) {
    checkActive(this)
    const transaction = new Transaction()
    const ret = transaction.update(callback)
    transaction.publish()
    return ret
  }

  import (rawtx, options = {}) {
    if (Transaction._ATOMICALLY_UPDATING) throw new StateError('import disabled during atomic update')
    const tx = new bsv.Transaction(rawtx)
    const txid = tx.hash
    if (options.trust) this.trust(txid)
    return Transaction._import(tx, txid)
  }

  trust (x) {
    if (Log._infoOn) Log._info(TAG, 'Trust', x)
    if (!trustable(x)) throw new ArgumentError(`Not trustable: ${_text(x)}`)
    this._kernel._trusts.add(x)
  }

  on (_event, _listener) {
    if (!Kernel._EVENTS.includes(_event)) throw new ArgumentError(`Invalid event: ${_event}`)
    if (typeof _listener !== 'function') throw new ArgumentError(`Invalid listener: ${_text(_limit)}`)
    if (this._kernel._listeners.some(x => x._event === _event && x._listener === _listener)) return
    this._kernel._listeners.push({ _event, _listener })
  }

  off (event, listener) {
    if (!Kernel._EVENTS.includes(event)) throw new ArgumentError(`Invalid event: ${event}`)
    if (typeof listener !== 'function') throw new ArgumentError(`Invalid listener: ${_text(listener)}`)
    const matches = x => x._event === event && x._listener === listener
    this._kernel._listeners = this._kernel._listeners.filter(x => !matches(x))
  }

  activate () {
    if (Log._infoOn) Log._info(TAG, 'Activate')

    if (Transaction._ATOMICALLY_UPDATING) throw new StateError('activate disabled during atomic update')
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
    if (Transaction._ATOMICALLY_UPDATING) throw new StateError('deactivate disabled during atomic update')
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
    if (!jigs.length) throw new ArgumentError('No jigs to unify')
    if (jigs.some(jig => !(jig instanceof Creation))) throw new ArgumentError('Must only unify jigs')
    _unifyForMethod(jigs, jigs)
  }

  // --------------------------------------------------------------------------
  // Static methods
  // --------------------------------------------------------------------------

  static install (T) {
    const C = Editor._lookupByType(T) || Editor._newCode()
    const editor = Editor._get(C)
    if (!Run.instance) {
      editor._preinstall(T)
    } else if (!editor._installed) {
      editor._install(T)
    }
    return C
  }

  static uninstall (T) {
    const C = Editor._lookupByType(T)
    if (!C) return
    const editor = Editor._get(C)
    editor._uninstall()
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

function parseTrust (trust) {
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

function parseRollbacks (rollbacks) {
  switch (typeof rollbacks) {
    case 'boolean': return rollbacks
    case 'undefined': return Run.defaults.rollbacks
    default: throw new Error(`Invalid rollbacks: ${rollbacks}`)
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
Run.defaults.rollbacks = true
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
Run.CommonLock = CommonLock
Run.Jig = Jig
Run.Transaction = Transaction

// Module
Run.module = {}
Run.module.Inventory = Inventory
Run.module.LocalOwner = LocalOwner
Run.module.LocalPurse = LocalPurse
Run.module.MatterCloud = MatterCloud
Run.module.Mockchain = Mockchain
Run.module.PayServer = PayServer
Run.module.RemoteBlockchain = RemoteBlockchain
Run.module.RunConnect = RunConnect
Run.module.LocalCache = LocalCache
Run.module.Viewer = Viewer
Run.module.WhatsOnChain = WhatsOnChain

// Add modules to the root for backwards compatibility
const warnModule = name => console.warn(`Run.${name} deprecated. Use Run.module.${name}.`)
_defineGetter(Run, 'Inventory', () => { warnModule('Inventory'); return Inventory })
_defineGetter(Run, 'LocalOwner', () => { warnModule('LocalOwner'); return LocalOwner })
_defineGetter(Run, 'LocalPurse', () => { warnModule('LocalPurse'); return LocalPurse })
_defineGetter(Run, 'MatterCloud', () => { warnModule('MatterCloud'); return MatterCloud })
_defineGetter(Run, 'Mockchain', () => { warnModule('Mockchain'); return Mockchain })
_defineGetter(Run, 'PayServer', () => { warnModule('PayServer'); return PayServer })
_defineGetter(Run, 'RemoteBlockchain', () => { warnModule('RemoteBlockchain'); return RemoteBlockchain })
_defineGetter(Run, 'RunConnect', () => { warnModule('RunConnect'); return RunConnect })
_defineGetter(Run, 'LocalCache', () => { warnModule('LocalCache'); return LocalCache })
_defineGetter(Run, 'Viewer', () => { warnModule('Viewer'); return Viewer })
_defineGetter(Run, 'WhatsOnChain', () => { warnModule('WhatsOnChain'); return WhatsOnChain })

// Extra
// Preinstalled extras are lazy loaded to facilitate code coverage
Run.extra = { }
_defineGetter(Run.extra, 'asm', () => require('./extra/asm'))
_defineGetter(Run.extra, 'expect', () => require('./extra/expect'))
_defineGetter(Run.extra, 'Group', () => require('./extra/group'))
_defineGetter(Run.extra, 'Hex', () => require('./extra/hex'))
_defineGetter(Run.extra, 'Token', () => require('./extra/token'))
_defineGetter(Run.extra, 'Tx', () => require('./extra/tx'))

// Add extras to the root for backwards compatibility
const warnExtra = name => console.warn(`Run.${name} deprecated. Use Run.extra.${name}.`)
_defineGetter(Run, 'asm', () => { warnExtra('asm'); return require('./extra/asm') })
_defineGetter(Run, 'expect', () => { warnExtra('expect'); return require('./extra/expect') })
_defineGetter(Run, 'Group', () => { warnExtra('Group'); return require('./extra/group') })
_defineGetter(Run, 'Token', () => { warnExtra('Token'); return require('./extra/token') })

// Hidden
Run._admin = require('./util/admin')._admin
Run._Bindings = require('./util/bindings')
Run._bsv = require('./util/bsv')
Run._Codec = require('./util/codec')
Run._Creation = require('./kernel/creation')
Run._deep = require('./util/deep')
Run._DeterministicRealm = require('./sandbox/realm')
Run._Dynamic = require('./util/dynamic')
Run._Log = require('./util/log')
Run._Membrane = require('./kernel/membrane')
Run._misc = require('./util/misc')
Run._payload = require('./kernel/loader')._payload
Run._Proxy2 = require('./util/proxy2')
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
Run._Unbound = require('./util/unbound')

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
