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
const { _sha256Internal } = require('./util/bsv')
const CommonLock = require('./util/common-lock')
const Transaction = require('./kernel/transaction')
const { _unifyForMethod } = require('./kernel/unify')
const Sandbox = require('./sandbox/sandbox')
const Log = require('./util/log')
const { _text, _defineGetter, _limit, _browser } = require('./util/misc')
const request = require('./util/request')
const { ArgumentError } = require('./util/errors')
const { _extractMetadata } = require('./util/metadata')

// Plugins
const BrowserCache = require('./plugins/browser-cache')
const IndexedDbCache = require('./plugins/indexeddb-cache')
const Inventory = require('./plugins/inventory')
const LocalCache = require('./plugins/local-cache')
const LocalOwner = require('./plugins/local-owner')
const LocalPurse = require('./plugins/local-purse')
const MatterCloud = require('./plugins/mattercloud')
const Mockchain = require('./plugins/mockchain')
const PayServer = require('./plugins/pay-server')
const RunConnect = require('./plugins/run-connect')
const RunDB = require('./plugins/run-db')
const Viewer = require('./plugins/viewer')
const WhatsOnChain = require('./plugins/whatsonchain')

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

    checkIfOptionsCompatible(options)

    const keys = Object.keys(options)
    options = Object.assign({}, Run.defaults, options)

    // Setup logger before anything else
    this._debug = parseDebug(options.debug)
    const parsedLogger = parseLogger(options.logger, this._debug)
    this._logger = options.logger
    Log._logger = parsedLogger

    this.networkRetries = options.networkRetries
    this.networkTimeout = options.networkTimeout

    this._kernel = new Kernel()
    this._kernel._client = parseClient(options.client)
    this._kernel._cache = parseCache(options.cache, options.network, keys.includes('cache'))
    this._kernel._blockchain = parseBlockchain(options.blockchain, keys.includes('blockchain'), options.api, options.apiKey, options.network, this._kernel._cacheAPI())
    this._kernel._purse = parsePurse(options.purse, this._kernel._blockchainAPI(), options.wallet)
    this._kernel._app = parseApp(options.app)
    this._kernel._owner = parseOwner(options.owner, this._kernel._blockchainAPI(), options.wallet)
    this._kernel._timeout = parseTimeout(options.timeout)
    this._kernel._trustlist = parseTrust(options.trust)
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
  //
  // These should return the same objects assigned, even if internally we wrap.
  // --------------------------------------------------------------------------

  get api () { return this.blockchain.api }
  get apiKey () { return this.blockchain.apiKey }
  get app () { return this._kernel._app }
  get autofund () { return this._autofund }
  get blockchain () { return this._kernel._blockchain }
  get cache () { return this._kernel._cache }
  get client () { return this._kernel._client }
  get debug () { return this._debug }
  get inventory () { return this._inventory }
  get logger () { return this._logger }
  get network () { return this.blockchain.network }
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

  set api (api) {
    this._kernel._blockchain = parseBlockchain(undefined, false, api,
      this.blockchain.apiKey, this.blockchain.network, this._kernel._cacheAPI())
  }

  set apiKey (apiKey) {
    this._kernel._blockchain = parseBlockchain(undefined, false, this.blockchain.api,
      apiKey, this.blockchain.network, this._kernel._cacheAPI())
  }

  set app (app) {
    this._kernel._app = parseApp(app)
  }

  set autofund (autofund) {
    this._autofund = parseAutofund(autofund)
    autofundPurse(this)
  }

  set blockchain (blockchain) {
    this._kernel._blockchain = parseBlockchain(blockchain, true)
    if (this._kernel._purse instanceof LocalPurse) {
      this._kernel._purse.blockchain = this._kernel._blockchain
    }
    autofundPurse(this)
  }

  set cache (cache) {
    this._kernel._cache = parseCache(cache, this.network, true)
  }

  set client (client) {
    this._kernel._client = parseClient(client)
  }

  set debug (debug) {
    this._debug = parseDebug(debug)
    if (isActive(this)) Log._logger = parseLogger(this._logger, debug)
  }

  set inventory (inventory) {
    if (this._inventory) this._inventory.deactivate()
    this._inventory = parseInventory(inventory)
    if (this._inventory) this._inventory.activate(this)
  }

  set logger (logger) {
    const parsedLogger = parseLogger(logger, this._debug)
    this._logger = logger
    if (isActive(this)) Log._logger = parsedLogger
  }

  set network (network) {
    this._kernel._blockchain = parseBlockchain(undefined, false, this.blockchain.api,
      this.blockchain.apiKey, network, this._kernel._cacheAPI())
  }

  set networkRetries (networkRetries) {
    this._networkRetries = request.defaults.retries = parseNetworkRetries(networkRetries)
    if (isActive(this)) request.defaults.retries = parseNetworkRetries(networkRetries)
  }

  set networkTimeout (networkTimeout) {
    this._networkTimeout = parseNetworkTimeout(networkTimeout)
    if (isActive(this)) request.defaults.timeout = parseNetworkTimeout(networkTimeout)
  }

  set owner (owner) {
    this._kernel._owner = parseOwner(owner, this._kernel._blockchainAPI())
    if (this._inventory) this._inventory.deactivate()
    this._inventory = new Inventory()
    this._inventory.activate(this)
  }

  set rollbacks (rollbacks) {
    this._kernel._rollbacks = parseRollbacks(rollbacks)
  }

  set preverify (preverify) {
    this._kernel._preverify = parsePreverify(preverify)
  }

  set purse (purse) {
    this._kernel._purse = parsePurse(purse, this.blockchain)
  }

  set timeout (timeout) {
    this._kernel._timeout = parseTimeout(timeout)
  }

  set wallet (wallet) {
    this.purse = wallet
    this.owner = wallet
  }

  // --------------------------------------------------------------------------
  // Methods
  // --------------------------------------------------------------------------

  load (location, options = {}) {
    checkActive(this)
    if (Transaction._ATOMICALLY_UPDATING) throw new Error('load disabled during atomic update')
    if (options.trust) this.trust(location.slice(0, 64))
    const loader = new Loader(this._kernel)
    return loader._load(location)
  }

  sync () {
    if (Transaction._ATOMICALLY_UPDATING) throw new Error('sync all disabled during atomic update')
    return Commit._syncAll()
  }

  deploy (T) {
    checkActive(this)
    const C = install(T)
    Editor._get(C)._deploy()
    return C
  }

  transaction (f) {
    checkActive(this)
    const transaction = new Transaction()
    const ret = transaction.update(f)
    transaction.publish()
    return ret
  }

  import (rawtx, options = {}) {
    if (Transaction._ATOMICALLY_UPDATING) throw new Error('import disabled during atomic update')
    const tx = new bsv.Transaction(rawtx)
    const txid = options.txid || tx.hash
    if (options.trust) this.trust(txid)
    return Transaction._import(tx, txid)
  }

  trust (x) {
    if (x instanceof Array) { x.forEach(y => this.trust(y)); return }
    if (Log._infoOn) Log._info(TAG, 'Trust', x)
    if (!trustable(x)) throw new ArgumentError(`Not trustable: ${_text(x)}`)
    this._kernel._trustlist.add(x)
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

    if (Transaction._ATOMICALLY_UPDATING) throw new Error('activate disabled during atomic update')
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
    if (Transaction._ATOMICALLY_UPDATING) throw new Error('deactivate disabled during atomic update')
    Run.instance = null
    if (this._inventory) this._inventory.deactivate()
    this._kernel._deactivate()
    return this
  }
}

Run.instance = null

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function isActive (run) {
  return Kernel._instance === run._kernel
}

// ------------------------------------------------------------------------------------------------

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

function checkIfOptionsCompatible (options) {
  const apiMismatch = options.blockchain && typeof options.api !== 'undefined' && options.blockchain.api !== options.api
  if (apiMismatch) throw new Error(`Blockchain mismatch with "${options.api}" api`)

  const networkMismatch = options.blockchain && typeof options.network !== 'undefined' && options.blockchain.network !== options.network
  if (networkMismatch) throw new Error(`Blockchain mismatch with "${options.network}" network`)
}

// ------------------------------------------------------------------------------------------------

function parseBlockchain (blockchain, specified, api, apiKey, network, cache) {
  if (blockchain instanceof Blockchain) {
    return blockchain
  }

  const lastBlockchain = Kernel._instance && Kernel._instance._blockchain

  // Check the API
  if (!(typeof api === 'undefined' || api === 'run' || api === 'mattercloud' || api === 'whatsonchain')) {
    throw new Error(`Invalid API: ${api}`)
  }

  // If no blockchain is passed in, create one
  if (typeof blockchain === 'undefined' && !specified) {
    switch (network) {
      case 'mock':
        if (typeof api !== 'undefined') throw new Error(`"mock" network is not compatible with the "${api}" api`)
        return lastBlockchain instanceof Mockchain ? lastBlockchain : new Mockchain()

      case 'main':
      case 'test':
      case 'stn': {
        const isRemoteBlockchain =
          lastBlockchain instanceof RunConnect ||
          lastBlockchain instanceof MatterCloud ||
          lastBlockchain instanceof WhatsOnChain

        if (isRemoteBlockchain &&
          lastBlockchain.api === api &&
          lastBlockchain.apiKey === apiKey &&
          lastBlockchain.network === network) {
          return lastBlockchain
        }

        const options = { apiKey, network, cache }

        switch (typeof api) {
          case 'string':
            switch (api) {
              case 'run': return new RunConnect(options)
              case 'mattercloud': return new MatterCloud(options)
              case 'whatsonchain': return new WhatsOnChain(options)
            }
            break

          case 'undefined':
            // Only whatsonchain supports STN right now
            return network === 'stn' ? new WhatsOnChain(options) : new RunConnect(options)

          default:
            throw new Error(`Invalid API: ${api}`)
        }
      } break

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

function parseLogger (logger, debug) {
  if (logger instanceof Logger) {
    const wrap = {}
    if (logger.info) wrap.info = (...args) => logger.info(...args)
    if (logger.warn) wrap.warn = (...args) => logger.warn(...args)
    if (logger.error) wrap.error = (...args) => logger.error(...args)
    if (logger.debug && debug) wrap.debug = (...args) => logger.debug(...args)
    return wrap
  }
  if (logger === null) return null
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
  if (typeof app !== 'string') throw new Error(`Invalid app: ${_text(app)}`)
  return app
}

// ------------------------------------------------------------------------------------------------

function parseCache (cache, network, specified) {
  if (cache instanceof Cache) return cache

  if (typeof cache === 'undefined' && !specified) {
    // If we already have a cache, then re-use it
    if (Run.instance && Run.instance.cache && Run.instance.network === network) {
      return Run.instance.cache
    }

    // If we are on mainnet, prefer RunConnect
    if (network === 'main') {
      return new RunConnect()
    }

    // If we are running in the browser, use a multi-level cache with ram + indexeddb
    if (_browser()) return new BrowserCache()

    // If we are running outside the browser, use a simple local cache
    return new LocalCache()
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
  const lastTrusts = Kernel._instance && Kernel._instance._trustlist
  if (typeof trust === 'undefined') return lastTrusts || []

  // We allow a simple array to be used to specify '*' easily
  if (typeof trust === 'string') trust = [trust]

  // Make sure the trust parameter and its array entries are valid
  if (!Array.isArray(trust) || trust.some(x => !trustable(x))) {
    throw new Error(`Not trustable: ${_text(trust)}`)
  }

  // Merge with our trustlist
  const defaultTrustlist = [
    /**
     * RUN ▸ Extras
     */
    '61e1265acb3d93f1bf24a593d70b2a6b1c650ec1df90ddece8d6954ae3cdd915', // asm
    '49145693676af7567ebe20671c5cb01369ac788c20f3b1c804f624a1eda18f3f', // asm
    '284ce17fd34c0f41835435b03eed149c4e0479361f40132312b4001093bb158f', // asm
    '6fe169894d313b44bd54154f88e1f78634c7f5a23863d1713342526b86a39b8b', // B
    '5332c013476cd2a2c18710a01188695bc27a5ef1748a51d4a5910feb1111dab4', // B (v2)
    '81bcef29b0e4ed745f3422c0b764a33c76d0368af2d2e7dd139db8e00ee3d8a6', // Base58
    '71fba386341b932380ec5bfedc3a40bce43d4974decdc94c419a94a8ce5dfc23', // expect
    '780ab8919cb89323707338070323c24ce42cdec2f57d749bd7aceef6635e7a4d', // Group
    '90a3ece416f696731430efac9657d28071cc437ebfff5fb1eaf710fe4b3c8d4e', // Group
    '727e7b423b7ee40c0b5be87fba7fa5673ea2d20a74259040a7295d9c32a90011', // Hex
    '3b7ef411185bbe3d01caeadbe6f115b0103a546c4ef0ac7474aa6fbb71aff208', // sha256
    'b17a9af70ab0f46809f908b2e900e395ba40996000bf4f00e3b27a1e93280cf1', // Token (v1)
    '72a61eb990ffdb6b38e5f955e194fed5ff6b014f75ac6823539ce5613aea0be8', // Token (v2)
    '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490', // Tx
    '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490', // txo
    '05f67252e696160a7c0099ae8d1ec23c39592378773b3a5a55f16bd1286e7dcb', // txo, Tx, B(v2)

    /**
     * RelayX
     */
    'd792d10294a0d9b05a30049f187a1704ced14840ecf41d00663d79c695f86633', // USDC
    '318d2a009e29cb3a202b2a167773341dcd39809b967889a7e306d504cc266faf', // OKBSV
    '5a8d4b4da7c5f27a39adac3a9256a7e15e03a7266c81ac8369a3b634560e7814', // OKBSV
    'd7273b6790a4dec4aa116661aff0ec35381794e552807014ca6a536f4454976d', // OKBSV

    /**
     * Tokens
     */
    'ce8629aa37a1777d6aa64d0d33cd739fd4e231dc85cfe2f9368473ab09078b78', // SHUA
    'ca1818540d2865c5b6a53e06650eafadc10b478703aa7cf324145f848fec629b', // SHUA
    '1de3951603784df7c872519c096445a415d9b0d3dce7bbe3b7a36ca82cf1a91c', // SHUA
    '367b4980287f8abae5ee4b0c538232164d5b2463068067ec1e510c91114bced2', // SHUA

    /**
     * RUN ▸ Extras (testnet)
     */
    '1f0abf8d94477b1cb57629d861376616f6e1d7b78aba23a19da3e6169caf489e', // asm
    '8b9380d445b6fe01ec7230d8363febddc99feee6064d969ae8f98fdb25e1393f', // asm
    '03e21aa8fcf08fa6985029ad2e697a2309962527700246d47d891add3cfce3ac', // asm
    '5435ae2760dc35f4329501c61c42e24f6a744861c22f8e0f04735637c20ce987', // B
    'b44a203acd6215d2d24b33a41f730e9acf2591c4ae27ecafc8d88ef83da9ddea', // B (v2)
    '424abf066be56b9dd5203ed81cf1f536375351d29726d664507fdc30eb589988', // Base58
    'f97d4ac2a3d6f5ed09fad4a4f341619dc5a3773d9844ff95c99c5d4f8388de2f', // expect
    '63e0e1268d8ab021d1c578afb8eaa0828ccbba431ffffd9309d04b78ebeb6e56', // Group
    '03320f1244e509bb421e6f1ff724bf1156182890c3768cfa4ea127a78f9913d2', // Group
    '1f0abf8d94477b1cb57629d861376616f6e1d7b78aba23a19da3e6169caf489e', // Hex
    '4a1929527605577a6b30710e6001b9379400421d8089d34bb0404dd558529417', // sha256
    '72a61eb990ffdb6b38e5f955e194fed5ff6b014f75ac6823539ce5613aea0be8', // Token (v1)
    '7d14c868fe39439edffe6982b669e7b4d3eb2729eee7c262ec2494ee3e310e99', // Token (v2)
    '33e78fa7c43b6d7a60c271d783295fa180b7e9fce07d41ff1b52686936b3e6ae', // Tx
    '33e78fa7c43b6d7a60c271d783295fa180b7e9fce07d41ff1b52686936b3e6ae', // txo
    'd476fd7309a0eeb8b92d715e35c6e273ad63c0025ff6cca927bd0f0b64ed88ff', // txo, Tx, B (v2)

    /**
     * Other
     */
    '24cde3638a444c8ad397536127833878ffdfe1b04d5595489bd294e50d77105a', // B (old)
    'bfa5180e601e92af23d80782bf625b102ac110105a392e376fe7607e4e87dc8d', // Class with logo
    '3f9de452f0c3c96be737d42aa0941b27412211976688967adb3174ee18b04c64' // Tutorial jigs
  ]

  return new Set(trust.concat(defaultTrustlist))
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
  if (typeof autofund !== 'boolean') throw new Error(`Invalid autofund: ${autofund}`)
  return autofund
}

// ------------------------------------------------------------------------------------------------

function parseClient (client) {
  if (typeof client !== 'boolean') throw new Error(`Invalid client: ${client}`)
  return client
}

// ------------------------------------------------------------------------------------------------

function parseDebug (debug) {
  if (typeof debug !== 'boolean') throw new Error(`Invalid debug: ${debug}`)
  return debug
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
  if (x === 'cache') return true
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
Run.defaults.debug = false
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
// install
// ------------------------------------------------------------------------------------------------

function install (T) {
  const C = Editor._lookupCodeByType(T) || Editor._createCode()
  const editor = Editor._get(C)
  if (!Run.instance) {
    editor._preinstall(T)
  } else if (!editor._installed) {
    editor._install(T)
  }
  return C
}

// ------------------------------------------------------------------------------------------------
// uninstall
// ------------------------------------------------------------------------------------------------

function uninstall (T) {
  const C = Editor._lookupCodeByType(T)
  if (!C) return
  const editor = Editor._get(C)
  editor._uninstall()
}

// ------------------------------------------------------------------------------------------------
// unify
// ------------------------------------------------------------------------------------------------

function unify (...creations) {
  if (!creations.length) throw new ArgumentError('No creations to unify')
  if (creations.some(creation => !(creation instanceof Creation))) throw new ArgumentError('Must only unify creations')
  _unifyForMethod(creations, creations)
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

const warnExtra = (name, path = 'Run.') => console.warn(`${path}${name} deprecated. Use Run.extra.${name}.`)
const warnPlugins = (name, path = 'Run.') => console.warn(`${path}${name} deprecated. Use Run.plugins.${name}.`)
const warnUtil = (name, path = 'Run.') => console.warn(`${path}${name} deprecated. Use Run.util.${name}.`)

// Kernel
Run.Berry = Berry
Run.Code = Code
Run.Jig = Jig
Run.Creation = Creation
Run.Transaction = Transaction

// Plugins
Run.plugins = {}
Run.plugins.BrowserCache = BrowserCache
Run.plugins.IndexedDbCache = IndexedDbCache
Run.plugins.Inventory = Inventory
Run.plugins.LocalCache = LocalCache
Run.plugins.LocalOwner = LocalOwner
Run.plugins.LocalPurse = LocalPurse
Run.plugins.MatterCloud = MatterCloud
Run.plugins.Mockchain = Mockchain
Run.plugins.PayServer = PayServer
Run.plugins.RunConnect = RunConnect
Run.plugins.RunDB = RunDB
Run.plugins.Viewer = Viewer
Run.plugins.WhatsOnChain = WhatsOnChain

// Add plugins to the root for backwards compatibility
_defineGetter(Run, 'BrowserCache', () => { warnPlugins('BrowserCache'); return BrowserCache })
_defineGetter(Run, 'IndexedDbCache', () => { warnPlugins('IndexedDbCache'); return IndexedDbCache })
_defineGetter(Run, 'Inventory', () => { warnPlugins('Inventory'); return Inventory })
_defineGetter(Run, 'LocalCache', () => { warnPlugins('LocalCache'); return LocalCache })
_defineGetter(Run, 'LocalOwner', () => { warnPlugins('LocalOwner'); return LocalOwner })
_defineGetter(Run, 'LocalPurse', () => { warnPlugins('LocalPurse'); return LocalPurse })
_defineGetter(Run, 'MatterCloud', () => { warnPlugins('MatterCloud'); return MatterCloud })
_defineGetter(Run, 'Mockchain', () => { warnPlugins('Mockchain'); return Mockchain })
_defineGetter(Run, 'PayServer', () => { warnPlugins('PayServer'); return PayServer })
_defineGetter(Run, 'RunConnect', () => { warnPlugins('RunConnect'); return RunConnect })
_defineGetter(Run, 'RunDB', () => { warnPlugins('RunDB'); return RunDB })
_defineGetter(Run, 'Viewer', () => { warnPlugins('Viewer'); return Viewer })
_defineGetter(Run, 'WhatsOnChain', () => { warnPlugins('WhatsOnChain'); return WhatsOnChain })

// Add plugins to the module object for backwards compatibility
Run.module = {}
const rm = 'Run.module'
_defineGetter(Run.module, 'BrowserCache', () => { warnPlugins('BrowserCache', rm); return BrowserCache })
_defineGetter(Run.module, 'IndexedDbCache', () => { warnPlugins('IndexedDbCache', rm); return IndexedDbCache })
_defineGetter(Run.module, 'Inventory', () => { warnPlugins('Inventory', rm); return Inventory })
_defineGetter(Run.module, 'LocalCache', () => { warnPlugins('LocalCache', rm); return LocalCache })
_defineGetter(Run.module, 'LocalOwner', () => { warnPlugins('LocalOwner', rm); return LocalOwner })
_defineGetter(Run.module, 'LocalPurse', () => { warnPlugins('LocalPurse', rm); return LocalPurse })
_defineGetter(Run.module, 'MatterCloud', () => { warnPlugins('MatterCloud', rm); return MatterCloud })
_defineGetter(Run.module, 'Mockchain', () => { warnPlugins('Mockchain', rm); return Mockchain })
_defineGetter(Run.module, 'PayServer', () => { warnPlugins('PayServer', rm); return PayServer })
_defineGetter(Run.module, 'RunConnect', () => { warnPlugins('RunConnect', rm); return RunConnect })
_defineGetter(Run.module, 'RunDB', () => { warnPlugins('RunDB', rm); return RunDB })
_defineGetter(Run.module, 'Viewer', () => { warnPlugins('Viewer', rm); return Viewer })
_defineGetter(Run.module, 'WhatsOnChain', () => { warnPlugins('WhatsOnChain', rm); return WhatsOnChain })

// Extra
// Preinstalled extras are lazy loaded to facilitate code coverage
Run.extra = { }
_defineGetter(Run.extra, 'asm', () => require('./extra/asm'))
_defineGetter(Run.extra, 'B', () => require('./extra/b'))
_defineGetter(Run.extra, 'Base58', () => require('./extra/base58'))
_defineGetter(Run.extra, 'expect', () => require('./extra/expect'))
_defineGetter(Run.extra, 'Group', () => require('./extra/group'))
_defineGetter(Run.extra, 'Hex', () => require('./extra/hex'))
_defineGetter(Run.extra, 'sha256', () => require('./extra/sha256'))
_defineGetter(Run.extra, 'Token', () => require('./extra/token20'))
_defineGetter(Run.extra, 'Token10', () => require('./extra/token10'))
_defineGetter(Run.extra, 'Token20', () => require('./extra/token20'))
_defineGetter(Run.extra, 'Tx', () => require('./extra/tx'))
_defineGetter(Run.extra, 'txo', () => require('./extra/txo'))

// Add extras to the root for backwards compatibility
_defineGetter(Run, 'asm', () => { warnExtra('asm'); return require('./extra/asm') })
_defineGetter(Run, 'B', () => { warnExtra('B'); return require('./extra/b') })
_defineGetter(Run, 'Base58', () => { warnExtra('Base58'); return require('./extra/base58') })
_defineGetter(Run, 'expect', () => { warnExtra('expect'); return require('./extra/expect') })
_defineGetter(Run, 'Group', () => { warnExtra('Group'); return require('./extra/group') })
_defineGetter(Run, 'Hex', () => { warnExtra('Hex'); return require('./extra/hex') })
_defineGetter(Run, 'sha256', () => { warnExtra('sha256'); return require('./extra/sha256') })
_defineGetter(Run, 'Token', () => { warnExtra('Token'); return require('./extra/token20') })
_defineGetter(Run, 'Token10', () => { warnExtra('Token10'); return require('./extra/token10') })
_defineGetter(Run, 'Token20', () => { warnExtra('Token10'); return require('./extra/token20') })
_defineGetter(Run, 'Tx', () => { warnExtra('Tx'); return require('./extra/tx') })
_defineGetter(Run, 'txo', () => { warnExtra('txo'); return require('./extra/txo') })

// Hidden
Run._admin = require('./util/admin')._admin
Run._Bindings = require('./util/bindings')
Run._bsv = require('./util/bsv')
Run._Codec = require('./util/codec')
Run._CreationSet = require('./util/creation-set')
Run._deep = require('./util/deep')
Run._DeterministicRealm = require('./sandbox/realm')
Run._Dynamic = require('./util/dynamic')
Run._EDITORS = require('./kernel/editor')._EDITORS
Run._environment = require('./util/environment')
Run._Log = require('./util/log')
Run._Membrane = require('./kernel/membrane')
Run._misc = require('./util/misc')
Run._Proxy2 = require('./util/proxy2')
Run._RecentBroadcasts = require('./util/recent-broadcasts')
Run._Record = require('./kernel/record')
Run._request = require('./util/request')
Run._RESERVED_PROPS = require('./util/misc')._RESERVED_PROPS
Run._RESERVED_CODE_PROPS = require('./util/misc')._RESERVED_CODE_PROPS
Run._RESERVED_JIG_PROPS = require('./util/misc')._RESERVED_JIG_PROPS
Run._Rules = require('./kernel/rules')
Run._Sandbox = Sandbox
Run._SerialTaskQueue = require('./util/queue')
Run._sighash = require('./util/bsv')._sighash
Run._Snapshot = require('./util/snapshot')
Run._source = require('./util/source')
Run._StateFilter = require('./util/state-filter')
Run._sudo = require('./util/admin')._sudo
Run._version = require('./util/version')

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

// Util
Run.util = {}
Run.util.CommonLock = CommonLock
Run.util.metadata = rawtx => {
  if (typeof rawtx !== 'string' || !rawtx.length) throw new Error(`Invalid transaction: ${rawtx}`)
  return _extractMetadata(new bsv.Transaction(rawtx))
}
Run.util.install = install
Run.util.sha256 = _sha256Internal
Run.util.unify = unify
Run.util.uninstall = uninstall

// Install utils for backwards compatibility
_defineGetter(Run, 'CommonLock', () => { warnUtil('CommonLock'); return CommonLock })
_defineGetter(Run, 'install', () => { warnUtil('install'); return install })
_defineGetter(Run, 'uninstall', () => { warnUtil('uninstall'); return uninstall })
_defineGetter(Run.prototype, 'payload', () => {
  console.warn('Run.prototype.payload deprecated. Use Run.util.metadata.')
  return Run.util.metadata
})
_defineGetter(Run.prototype, 'unify', () => {
  console.warn('Run.prototype.unify deprecated. Use Run.util.unify.')
  return Run.util.unify
})

/* global VERSION */
Run.version = (typeof VERSION !== 'undefined' && VERSION) || require('../package').version
Run.protocol = require('./util/version')._PROTOCOL_VERSION

// ------------------------------------------------------------------------------------------------

module.exports = Run
