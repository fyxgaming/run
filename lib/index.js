/**
 * index.js
 *
 * The exports for the Run library, including the main Run class
 */

const bsv = require('bsv')
const Code = require('./code')
const Evaluator = require('./evaluator')
const Syncer = require('./syncer')
const { Transaction } = require('./transaction')
const util = require('./util')
const { Pay, Purse } = require('./purse')
const { AddressScript, PubKeyScript, Sign, Owner, BasicOwner } = require('./owner')
const { Blockchain, BlockchainServer } = require('./blockchain')
const Mockchain = require('./mockchain')
const { State, StateCache } = require('./state')
const { PrivateKey } = bsv
const { Jig } = require('./jig')
const { Berry } = require('./berry')
const Protocol = require('./protocol')
const Token = require('./token')
const expect = require('./expect')
const Location = require('./location')
const { UniqueSet, UniqueMap } = require('./unique')
const { Intrinsics } = require('./intrinsics')
const Xray = require('./xray')

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
    this.app = parseApp(options.app)
    this.state = parseState(options.state)
    this.owner = parseOwner(options.owner, this.blockchain.network, this.logger, this)
    this._purse = parsePurse(options.purse, this.blockchain, this.logger)
    this.code = parseCode(options.code, parseSandbox(options.sandbox), this.logger)
    this.syncer = new Syncer(this)
    this.protocol = Run.instance ? Run.instance.protocol : new Protocol()
    this.transaction = new Transaction(this)
    this.loadQueue = new util.SerialTaskQueue()

    this.activate()

    // If using the mockchain, automatically fund the purse with some money
    if (this.blockchain instanceof Mockchain) this.blockchain.fund(this.purse.address, 100000000)
  }

  get purse () { return this._purse }
  set purse (value) { this._purse = parsePurse(value, this.blockchain, this.logger) }

  /**
   * Loads jigs or code from the blockchain
   * @param {string} location Location string
   * @param {object=} options Optional settings to use in load
   * @param {function=} protocol Custom protocol to use to load the berry
   * @returns {Promise<Object|Function|Class>} Class or function in a promise
   */
  async load (location, options = {}) {
    this._checkActive()

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
    this.code.deploy(type)
    await this.sync()
    return type.location
  }

  /**
   * Syncs pending transactions and requeries the owner's tokens
   */
  async sync () {
    return this.owner.sync()
  }

  installProtocol (protocol) {
    this.protocol.installBerryProtocol(protocol)
  }

  /**
   * Activates this Run instance so its owner, blockchain, transaction queue and more are used.
   */
  activate () {
    if (Run.instance) Run.instance.deactivate()
    Run.instance = this
    bsv.Networks.defaultNetwork = util.bsvNetwork(this.blockchain.network)
    this.code.activate(this.blockchain.network)
    return this
  }

  /**
   * Deactivates the current run instance, cleaning up anything in the process
   */
  deactivate () {
    if (!Run.instance) return
    Run.instance.code.deactivate()
    Run.instance = null
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

function parseLogger (logger) {
  // When no logger is provided, we log warnings and errors by default
  switch (typeof logger) {
    case 'object': logger = (logger || {}); break
    case 'undefined': logger = { warn: console.warn, error: console.error }; break
    default: throw new Error(`Option 'logger' must be an object. Received: ${logger}`)
  }

  // Fill this.logger with all supported methods
  const methods = ['info', 'debug', 'warn', 'error']
  logger = Object.assign({}, logger)
  methods.forEach(method => { logger[method] = logger[method] || (() => {}) })
  return logger
}

function parseBlockchain (blockchain, network, logger) {
  switch (typeof blockchain) {
    case 'object':
      if (!Blockchain.isBlockchain(blockchain)) throw new Error('Invalid \'blockchain\'')
      return blockchain
    case 'string':
    case 'undefined': {
      const lastBlockchain = Run.instance ? Run.instance.blockchain : null
      if (network === 'mock') {
        return new Mockchain({ lastBlockchain })
      } else {
        return new BlockchainServer({ network, api: blockchain, logger, lastBlockchain })
      }
    }
    default: throw new Error(`Option 'blockchain' must be an object or string. Received: ${blockchain}`)
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

function parsePurse (purse, blockchain, logger) {
  switch (typeof purse) {
    case 'string': return new Purse({ privkey: purse, blockchain, logger })
    case 'undefined': return new Purse({ blockchain, logger })
    case 'object':
      if (!purse || purse instanceof PrivateKey) {
        return new Purse({ privkey: purse, blockchain, logger })
      } else {
        if (typeof purse.pay !== 'function') throw new Error('Purse requires a pay method')
        return purse
      }
    default: throw new Error(`Option 'purse' must be a valid private key or Pay API. Received: ${purse}`)
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

function parseCode (code, sandbox, logger) {
  switch (typeof code) {
    case 'object':
      if (code && code instanceof Code) return code
      break
    case 'undefined':
      if (Run.instance) {
        const sameSandbox = Run.instance.code.evaluator.sandbox.toString() === sandbox.toString()

        if (sameSandbox) return Run.instance.code

        // If we are creating new Code, then undo any global overrides from the last one,
        // so that we start from a clean slate. This makes our unit tests more reliable.
        Run.instance.code.deactivate()
      }
      return new Code({ sandbox, logger })
  }
  throw new Error('Option \'code\' must be an instance of Code')
}

// ------------------------------------------------------------------------------------------------
// Helper methods
// ------------------------------------------------------------------------------------------------

function setupBsvLibrary (network) {
  // Set the default bsv network
  bsv.Networks.defaultNetwork = util.bsvNetwork(network)

  // On Bitcoin SV, 0.5 sats/byte are normal now, but 1sat/byte is still safer
  bsv.Transaction.FEE_PER_KB = 1000

  // Disable signature errors, because we support custom scripts, and check custom scripts
  // using the bsv library's interpreter.
  bsv.Transaction.Input.prototype.clearSignatures = () => {}
  bsv.Transaction.Input.prototype.getSignatures = () => []
  bsv.Transaction.Input.prototype.isFullySigned = function() {
    const interpreter = new bsv.Script.Interpreter()
    return interpreter.verify(this.script, this.output.script)
  }
  bsv.Transaction.Input.prototype.isValidSignature = function() {
    const interpreter = new bsv.Script.Interpreter()
    return interpreter.verify(this.script, this.output.script)
  }
  bsv.Transaction.prototype.isFullySigned = function () {
    const _ = bsv.deps._
    return _.every(_.map(this.inputs, function (input) {
      return input.isFullySigned()
    }))
  }
  bsv.Transaction.prototype.isValidSignature = function (signature) {
    var self = this
    return this.inputs[signature.inputIndex].isValidSignature(self, signature)
  }

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
Run.instance = null
Run.installProtocol = Protocol.installBerryProtocol

Run.UniqueSet = UniqueSet
Run.UniqueMap = UniqueMap
Run.Blockchain = Blockchain
Run.BlockchainServer = BlockchainServer
Run.Code = Code
Run.Evaluator = Evaluator
Run.Intrinsics = Intrinsics
Run.Location = Location
Run.Mockchain = Mockchain
Run.Pay = Pay
Run.Plucker = Protocol.BerryProtocol
Run.Purse = Purse
Run.State = State
Run.StateCache = StateCache
Run.Xray = Xray

Run.AddressScript = AddressScript
Run.PubKeyScript = PubKeyScript
Run.Sign = Sign
Run.Owner = Owner
Run.BasicOwner = BasicOwner

Run.Jig = Jig
Run.Berry = Berry
Run.Token = Token
Run.expect = expect
global.Jig = Jig
global.Berry = Berry
global.Token = Token

// ------------------------------------------------------------------------------------------------

module.exports = Run
