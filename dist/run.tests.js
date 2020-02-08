/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 32);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = bsv;

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = chai;

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = Mocha;

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * helpers.js
 *
 * Helper functions used across test modules
 */

const bsv = __webpack_require__(0)
const process = __webpack_require__(18)
const { expect } = __webpack_require__(1)

const testPurses = {
  main: [
    'L3qpvEdCa4h7qxuJ1xqQwNQV2dfDR8YB57awpcbnBpoyGMAZEGLq', // 1DnxveABdMVKASzbCCUsibc29CwE7Kx9zZ
    'KxCNcuTavkKd943xAypLjRKufmdXUaooZzWoB4piRRvJK74LYwCR' // 1DurgtJhiT5oTYy6kL6QTSNiQB4DWuo3j8
  ],
  test: [
    'cT7uSf2Q4nFDWoqQtSBaKHnQsuWVdcvxZMiuCs3nkwYh94xctaFg', // mpBU73vq9ajhkXknP1sNGe6wjXH7QtwmWm
    'cTyDeBV8w9XQvaVvPY448rJVAScbu56X64tyEq6f6gdChgGw6aVq', // mhjSrMHzs97CCvhPtBn1qbfuJqqfmMzWQ4
    'cQP1h2zumWrCr2zxciuNeho61QUGtQ4zBKWFauk7WEhFb8kvjRTh' // n34P4t4K6bJtc6qfGU2pqcRix8mUACdNyJ
  ],
  stn: [
    'cT7uSf2Q4nFDWoqQtSBaKHnQsuWVdcvxZMiuCs3nkwYh94xctaFg', // mpBU73vq9ajhkXknP1sNGe6wjXH7QtwmWm
    'cTyDeBV8w9XQvaVvPY448rJVAScbu56X64tyEq6f6gdChgGw6aVq' // mhjSrMHzs97CCvhPtBn1qbfuJqqfmMzWQ4
  ]
}

// The test mode determines the Run build. It is either an environment variable or a webpack define.
// We override global.TEST_MODE so that we can just use TEST_MODE.
global.TEST_MODE = process.env.TEST_MODE

// Provides the Run build for tests
// The same tests run in different environments (node, browser) and with different Run builds
// (lib, dist). This module outputs the appropriate instance for the test environment.
let Run = null

if (false) {}
if (false) {}
if (false) {}
if (true) Run = __webpack_require__(35)

// We check if _util is defined on Run to see if Run was obfuscated. If it was, we return a proxy
// that allows tests to access the original properties as if they were unobfuscated.
const needsUnobfuscation = typeof Run._util === 'undefined'

// Wraps an object to unobfuscate its properties for testing in obfuscated builds
function unobfuscate (obj) {
  if (!needsUnobfuscation) return obj

  const obfuscationMap = __webpack_require__(36)

  const handler = {
    get: (target, prop) => {
      // If we're getting a constructor, we can simply reproxy and return it here
      if (prop === 'constructor') return new Proxy(target.constructor, handler)

      // If the obfuscation map has the key, use its transalted version
      const key = typeof obfuscationMap[prop] === 'string' ? obfuscationMap[prop] : prop
      const val = target[key]

      // If val is null, we can return it directly
      if (!val) return val

      // Regular functions get bound to the target not the proxy for better reliability
      if (typeof val === 'function' && !val.prototype) return val.bind(target)

      // Jigs don't need to be proxied and cause problems when they are
      // "val instanceof Jig" causes problems. Checking class names is good enough for tests.
      let type = val.constructor
      while (type) {
        if (type.name === 'Jig') return val
        type = Object.getPrototypeOf(type)
      }

      // Read-only non-confurable properties cannot be proxied
      const descriptor = Object.getOwnPropertyDescriptor(target, key)
      if (descriptor && descriptor.writable === false && descriptor.configurable === false) return val

      // Objects get re-proxied so that their sub-properties are unobfuscated
      if (typeof val === 'object' && prop !== 'prototype') return new Proxy(val, handler)

      // All other objects we return directly
      return val
    },

    set: (target, prop, value) => {
      // Sets are applied to the obfuscated properties if they exist
      const key = prop in obfuscationMap ? obfuscationMap[prop] : prop
      target[key] = value
      return true
    },

    construct: (T, args) => {
      // If we construct from a type, the new instance gets proxied to be unobfuscated too
      return new Proxy(new T(...args), handler)
    }
  }

  return new Proxy(obj, handler)
}

Run = unobfuscate(Run)

function createRun (options = { }) {
  const network = options.network || 'mock'
  const blockchain = network !== 'mock' ? 'star' : undefined
  const purse = network === 'mock' ? undefined : testPurses[network][0]
  const sandbox = 'sandbox' in options ? options.sandbox :  false ? undefined : true
  const run = new Run(Object.assign({ network, purse, sandbox, logger: null, blockchain }, options))
  return run
}

async function hookPay (run, ...enables) {
  enables = new Array(run.syncer.queued.length).fill(true).concat(enables)
  const orig = run.purse.pay.bind(run.purse)
  run.purse.pay = async (tx) => {
    if (!enables.length) { return orig(tx) }
    if (enables.shift()) { return orig(tx) } else { return tx }
  }
}

let action = null

function hookStoreAction (run) {
  const origAction = run.transaction.storeAction.bind(run.transaction)
  run.transaction.storeAction = (target, method, args, inputs, outputs, reads, before, after, proxies) => {
    origAction(target, method, args, inputs, outputs, reads, before, after, proxies)
    target = proxies.get(target)
    inputs = new Set(Array.from(inputs.keys()).map(i => proxies.get(i)))
    outputs = new Set(Array.from(outputs.keys()).map(o => proxies.get(o)))
    reads = new Set(Array.from(reads.keys()).map(o => proxies.get(o)))
    action = { target, method, args, inputs, outputs, reads }
  }
  return run
}

function expectAction (target, method, args, inputs, outputs, reads) {
  expect(action.target).to.equal(target)
  expect(action.method).to.equal(method)
  expect(action.args).to.deep.equal(args)
  expect(action.inputs.size).to.equal(inputs.length)
  Array.from(action.inputs.values()).forEach((i, n) => expect(i).to.equal(inputs[n]))
  expect(action.outputs.size).to.equal(outputs.length)
  Array.from(action.outputs.values()).forEach((o, n) => expect(o).to.equal(outputs[n]))
  expect(action.reads.size).to.equal(reads.length)
  Array.from(action.reads.values()).forEach((x, n) => expect(x).to.equal(reads[n]))
  action = null
}

function expectNoAction () {
  if (action) throw new Error('Unexpected transaction')
}

async function deploy (Class) {
  const app = 'Star ▸ Library'
  const networks = [['test', 'Testnet'], ['main', 'Mainnet']]

  let properties = ''

  for (const [network, suffix] of networks) {
    const run = createRun({ network, app })
    const origin = `origin${suffix}`
    const location = `location${suffix}`
    const owner = `owner${suffix}`

    delete Class[origin]
    delete Class[location]
    delete Class[owner]

    run.deploy(Class)

    await run.sync()

    properties += `${Class.name}.${origin} = '${Class[origin]}'\n`
    properties += `${Class.name}.${location} = '${Class[location]}'\n`
    properties += `${Class.name}.${owner} = '${Class[owner]}'\n`

    run.deactivate()
  }

  console.log(properties)
}

async function payFor (tx, privateKey, blockchain) {
  const numSplits = 10

  const address = new bsv.PrivateKey(privateKey).toAddress()
  let utxos = await blockchain.utxos(address)

  function shuffle (a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  utxos = shuffle(utxos)

  const satoshisRequired = () => Math.max(1000, tx._estimateFee() + tx._getOutputAmount())

  let total = 0
  utxos.forEach(utxo => { total += utxo.satoshis })
  const averageSatoshisPerSplit = Math.floor(total / numSplits)

  // Walk through each UTXO, adding it to the transaction, and checking if we can stop
  let addedChange = false
  for (const utxo of utxos) {
    tx.from(utxo)

    if (!addedChange) {
      addedChange = true
      tx.change(address)
    } else {
      tx.to(address, averageSatoshisPerSplit)
    }

    if (tx._getInputAmount() >= satoshisRequired()) break
  }

  // make sure we actually have enough inputs
  if (tx._getInputAmount() < satoshisRequired()) throw new Error('not enough funds')

  tx.sign(privateKey)

  return tx
}

module.exports = {
  Run,
  Jig: Run.Jig,
  unobfuscate,
  createRun,
  hookPay,
  hookStoreAction,
  expectAction,
  expectNoAction,
  deploy,
  payFor
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(7)))

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * util.js
 *
 * Helpers used throughout the library
 */

const bsv = __webpack_require__(0)
const { Intrinsics } = __webpack_require__(10)

// ------------------------------------------------------------------------------------------------
// JIG CHECKS
// ------------------------------------------------------------------------------------------------

/**
 * The maximum amount of satoshis able to be set on a Jig. Currently 1 BSV. We restrict this
 * for security reasons. TODO: There should be an option to disable this in the future.
 */
const MAX_SATOSHIS = 100000000

/**
 * Checks that the satoshis property of a Jig is a non-negative number within a certain range
 */
function checkSatoshis (satoshis) {
  if (typeof satoshis !== 'number') throw new Error('satoshis must be a number')
  if (!Number.isInteger(satoshis)) throw new Error('satoshis must be an integer')
  if (isNaN(satoshis) || !isFinite(satoshis)) throw new Error('satoshis must be finite')
  if (satoshis < 0) throw new Error('satoshis must be non-negative')
  if (satoshis > MAX_SATOSHIS) throw new Error(`satoshis must be less than ${MAX_SATOSHIS}`)
}

/**
 * Checks that the owner of a Jig is a valid public key. Public keys are not network-specific.
 */
function checkOwner (owner) {
  if (typeof owner !== 'string') throw new Error('owner must be a pubkey string')
  try { new bsv.PublicKey(owner) } // eslint-disable-line
  catch (e) { throw new Error(`owner is not a valid public key\n\n${e}`) }
}

// ------------------------------------------------------------------------------------------------
// OP_RETURN PARSING
// ------------------------------------------------------------------------------------------------

/**
 * The version of the run protocol. This will be increased with every breaking change.
 */
const PROTOCOL_VERSION = 0x02 // TODO: Reset to 0 for public launch

/**
 * Returns whether a given transaction is tagged as a run transaction
 */
function checkRunTransaction (tx) {
  const isRunTransaction = tx.outputs.length &&
    tx.outputs[0].script.isSafeDataOut() &&
    tx.outputs[0].script.chunks.length === 7 &&
    tx.outputs[0].script.chunks[2].buf.toString('utf8') === 'run'

  // TODO: Notify shruggr if these error message change
  if (!isRunTransaction) throw new Error(`not a run tx: ${tx.hash}`)

  const isAllowedProtocol = tx.outputs[0].script.chunks[3].buf.length === 1 &&
      tx.outputs[0].script.chunks[3].buf[0] === PROTOCOL_VERSION

  if (!isAllowedProtocol) {
    const suggestion = 'Hint: Are you trying to load jigs created by a different version of run? This is not possible in the private alpha, sorry.'
    throw new Error(`Unsupported run protocol in tx: ${tx.hash}\n\n${suggestion}`)
  }
}

/**
 * Extracts the custom run json data out of the op_return
 */
function extractRunData (tx) {
  checkRunTransaction(tx)
  const encrypted = tx.outputs[0].script.chunks[5].buf.toString('utf8')
  return decryptRunData(encrypted)

  // TODO: do basic checks, that code, actions and jigs are arrays (and nothing else),
  // and that jigs are hashes
}

/**
 * Gets what kind of output this is. Possibilities are 'rundata', code', 'jig', and 'other'.
 */
function outputType (tx, vout) {
  try { checkRunTransaction(tx) } catch (e) { return 'other' }
  if (vout === 0) return 'rundata'
  const encrypted = tx.outputs[0].script.chunks[5].buf.toString('utf8')
  try {
    const data = decryptRunData(encrypted)
    if (vout >= 1 && vout < 1 + data.code.length) return 'code'
    if (vout >= 1 + data.code.length && vout < 1 + data.code.length + data.jigs) return 'jig'
  } catch (e) { }
  return 'other'
}

// ------------------------------------------------------------------------------------------------
// CODE PARSING
// ------------------------------------------------------------------------------------------------

/**
 * Returns the source code for a class or function. This is generally type.toString(), however if
 * the type is a class and it extends another class, we make sure the parent class name in the
 * extends expression is the actual name of the parent class name because a lot of times the code
 * will be "class X extends SomeLibrary.Y" and what is deployed should be "class X extends Y"
 *
 * This may still return slightly different results. For example, node 8 and node 12 sometimes
 * have slightly different spacing. Howeve, functionally the code should be the same.
 */
function getNormalizedSourceCode (type) {
  const code = type.toString()
  const parent = Object.getPrototypeOf(type)

  if (parent.prototype) {
    const classDef = /^class \S+ extends \S+ {/
    return code.replace(classDef, `class ${type.name} extends ${parent.name} {`)
  }

  return code
}

/**
 * Returns whether a given function or class can be deployed on-chain. Basically we are checking
 * that the function or class has a name, which run currently requires to connect dependencies,
 * and also that it is not a native function built into JavaScript runtime.
 */
function deployable (type) {
  return typeof type === 'function' && type.toString().indexOf('[native code]') === -1
}

// ------------------------------------------------------------------------------------------------
// OP_RETURN ENCRYPTION
// ------------------------------------------------------------------------------------------------

// We encrypt all OP_RETURN data using a simple ASCII character map. This is not intended for
// security but just to remain in stealth mode for a bit longer.

const alphabet = ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`1234567890-=~!@#$%^&*()_+,./;\'[]\\<>?:"{}|'
const shuffled = 't08sY]m\'#$Dy1`}pCKrHG)f9[uq%3\\ha=!ZVMkJ-*L"xz67R? W~@wdO:Ecg|ITe52.+{ovBj>(&,/Q4lA;^<NPnXSFi_Ub'
const encArr = alphabet.split('')
const decArr = shuffled.split('')

function encryptRunData (data) {
  const s = JSON.stringify(data)
  return s.split('').map(c => {
    return encArr.indexOf(c) !== -1 ? decArr[encArr.indexOf(c)] : c
  }).join('')
}

function decryptRunData (encrypted) {
  const decrypted = encrypted.split('').map(c => {
    return decArr.indexOf(c) !== -1 ? encArr[decArr.indexOf(c)] : c
  }).join('')
  try {
    return JSON.parse(decrypted)
  } catch (e) {
    throw new Error(`unable to parse decrypted run data\n\n${e.toString()}\n\n${decrypted}`)
  }
}

// ------------------------------------------------------------------------------------------------
// MISC
// ------------------------------------------------------------------------------------------------

/**
 * Returns the current run instance that is active
 */
function activeRunInstance () {
  const Run = __webpack_require__(15)
  if (!Run.instance) throw new Error('Run not instantiated')
  return Run.instance
}

/**
 * Returns whether two jigs have or will have the same blockchain origin
 */
function sameJig (a, b) {
  if (a === b) return true
  return a.origin && a.origin[0] !== '_' && a.origin === b.origin
}

/**
 * Returns the network suffix used for network-specific class properties, like originMainnet,
 * ownerTestnet, etc. The argument is the network set when creating Run.
 */
function networkSuffix (network) {
  switch (network) {
    case 'main': return 'Mainnet'
    case 'test': return 'Testnet'
    case 'stn': return 'Stn'
    case 'mock': return 'Mocknet'
    default: throw new Error(`Unknown network: ${network}`)
  }
}

/**
 * Gets the bsv library network string from the run network string
 * @param {string} network run network string
 */
function bsvNetwork (network) {
  return network === 'main' ? 'mainnet' : 'testnet'
}

/**
 * Converts a value into a format suitable for display
 */
function display (x) {
  try {
    if (typeof x === 'undefined') return '[undefined]'
    if (typeof x === 'symbol') return x.toString()
    if (x === null) return '[null]'
    return `${x}`
  } catch (e) { return 'Value' }
}

// ------------------------------------------------------------------------------------------------

class SerialTaskQueue {
  constructor () {
    this.tasks = []
  }

  async enqueue (func) {
    return new Promise((resolve, reject) => {
      this.tasks.push({ func, reject, resolve })
      if (this.tasks.length === 1) this.execNext()
    })
  }

  async execNext () {
    const next = this.tasks[0]
    try {
      const result = next.func()
      next.resolve(result instanceof Promise ? await result : result)
    } catch (e) {
      next.reject(e)
    } finally {
      this.tasks.shift()
      if (this.tasks.length) this.execNext()
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  PROTOCOL_VERSION,

  checkOwner,
  checkSatoshis,

  checkRunTransaction,
  extractRunData,
  outputType,

  getNormalizedSourceCode,
  deployable,

  encryptRunData,
  decryptRunData,

  activeRunInstance,
  sameJig,
  networkSuffix,
  bsvNetwork,
  display,

  SerialTaskQueue,

  Intrinsics
}


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var bind = __webpack_require__(23);
var isBuffer = __webpack_require__(62);

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Function equal to merge with the difference being that no reference
 * to original objects is kept.
 *
 * @see merge
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function deepMerge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = deepMerge(result[key], val);
    } else if (typeof val === 'object') {
      result[key] = deepMerge({}, val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  deepMerge: deepMerge,
  extend: extend,
  trim: trim
};


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/* eslint-disable no-invalid-this */
let checkError = __webpack_require__(34);

module.exports = (chai, utils) => {
    const Assertion = chai.Assertion;
    const assert = chai.assert;
    const proxify = utils.proxify;

    // If we are using a version of Chai that has checkError on it,
    // we want to use that version to be consistent. Otherwise, we use
    // what was passed to the factory.
    if (utils.checkError) {
        checkError = utils.checkError;
    }

    function isLegacyJQueryPromise(thenable) {
        // jQuery promises are Promises/A+-compatible since 3.0.0. jQuery 3.0.0 is also the first version
        // to define the catch method.
        return typeof thenable.catch !== "function" &&
               typeof thenable.always === "function" &&
               typeof thenable.done === "function" &&
               typeof thenable.fail === "function" &&
               typeof thenable.pipe === "function" &&
               typeof thenable.progress === "function" &&
               typeof thenable.state === "function";
    }

    function assertIsAboutPromise(assertion) {
        if (typeof assertion._obj.then !== "function") {
            throw new TypeError(utils.inspect(assertion._obj) + " is not a thenable.");
        }
        if (isLegacyJQueryPromise(assertion._obj)) {
            throw new TypeError("Chai as Promised is incompatible with thenables of jQuery<3.0.0, sorry! Please " +
                                "upgrade jQuery or use another Promises/A+ compatible library (see " +
                                "http://promisesaplus.com/).");
        }
    }

    function proxifyIfSupported(assertion) {
        return proxify === undefined ? assertion : proxify(assertion);
    }

    function method(name, asserter) {
        utils.addMethod(Assertion.prototype, name, function () {
            assertIsAboutPromise(this);
            return asserter.apply(this, arguments);
        });
    }

    function property(name, asserter) {
        utils.addProperty(Assertion.prototype, name, function () {
            assertIsAboutPromise(this);
            return proxifyIfSupported(asserter.apply(this, arguments));
        });
    }

    function doNotify(promise, done) {
        promise.then(() => done(), done);
    }

    // These are for clarity and to bypass Chai refusing to allow `undefined` as actual when used with `assert`.
    function assertIfNegated(assertion, message, extra) {
        assertion.assert(true, null, message, extra.expected, extra.actual);
    }

    function assertIfNotNegated(assertion, message, extra) {
        assertion.assert(false, message, null, extra.expected, extra.actual);
    }

    function getBasePromise(assertion) {
        // We need to chain subsequent asserters on top of ones in the chain already (consider
        // `eventually.have.property("foo").that.equals("bar")`), only running them after the existing ones pass.
        // So the first base-promise is `assertion._obj`, but after that we use the assertions themselves, i.e.
        // previously derived promises, to chain off of.
        return typeof assertion.then === "function" ? assertion : assertion._obj;
    }

    function getReasonName(reason) {
        return reason instanceof Error ? reason.toString() : checkError.getConstructorName(reason);
    }

    // Grab these first, before we modify `Assertion.prototype`.

    const propertyNames = Object.getOwnPropertyNames(Assertion.prototype);

    const propertyDescs = {};
    for (const name of propertyNames) {
        propertyDescs[name] = Object.getOwnPropertyDescriptor(Assertion.prototype, name);
    }

    property("fulfilled", function () {
        const derivedPromise = getBasePromise(this).then(
            value => {
                assertIfNegated(this,
                                "expected promise not to be fulfilled but it was fulfilled with #{act}",
                                { actual: value });
                return value;
            },
            reason => {
                assertIfNotNegated(this,
                                   "expected promise to be fulfilled but it was rejected with #{act}",
                                   { actual: getReasonName(reason) });
                return reason;
            }
        );

        module.exports.transferPromiseness(this, derivedPromise);
        return this;
    });

    property("rejected", function () {
        const derivedPromise = getBasePromise(this).then(
            value => {
                assertIfNotNegated(this,
                                   "expected promise to be rejected but it was fulfilled with #{act}",
                                   { actual: value });
                return value;
            },
            reason => {
                assertIfNegated(this,
                                "expected promise not to be rejected but it was rejected with #{act}",
                                { actual: getReasonName(reason) });

                // Return the reason, transforming this into a fulfillment, to allow further assertions, e.g.
                // `promise.should.be.rejected.and.eventually.equal("reason")`.
                return reason;
            }
        );

        module.exports.transferPromiseness(this, derivedPromise);
        return this;
    });

    method("rejectedWith", function (errorLike, errMsgMatcher, message) {
        let errorLikeName = null;
        const negate = utils.flag(this, "negate") || false;

        // rejectedWith with that is called without arguments is
        // the same as a plain ".rejected" use.
        if (errorLike === undefined && errMsgMatcher === undefined &&
            message === undefined) {
            /* eslint-disable no-unused-expressions */
            return this.rejected;
            /* eslint-enable no-unused-expressions */
        }

        if (message !== undefined) {
            utils.flag(this, "message", message);
        }

        if (errorLike instanceof RegExp || typeof errorLike === "string") {
            errMsgMatcher = errorLike;
            errorLike = null;
        } else if (errorLike && errorLike instanceof Error) {
            errorLikeName = errorLike.toString();
        } else if (typeof errorLike === "function") {
            errorLikeName = checkError.getConstructorName(errorLike);
        } else {
            errorLike = null;
        }
        const everyArgIsDefined = Boolean(errorLike && errMsgMatcher);

        let matcherRelation = "including";
        if (errMsgMatcher instanceof RegExp) {
            matcherRelation = "matching";
        }

        const derivedPromise = getBasePromise(this).then(
            value => {
                let assertionMessage = null;
                let expected = null;

                if (errorLike) {
                    assertionMessage = "expected promise to be rejected with #{exp} but it was fulfilled with #{act}";
                    expected = errorLikeName;
                } else if (errMsgMatcher) {
                    assertionMessage = `expected promise to be rejected with an error ${matcherRelation} #{exp} but ` +
                                       `it was fulfilled with #{act}`;
                    expected = errMsgMatcher;
                }

                assertIfNotNegated(this, assertionMessage, { expected, actual: value });
                return value;
            },
            reason => {
                const errorLikeCompatible = errorLike && (errorLike instanceof Error ?
                                                        checkError.compatibleInstance(reason, errorLike) :
                                                        checkError.compatibleConstructor(reason, errorLike));

                const errMsgMatcherCompatible = errMsgMatcher && checkError.compatibleMessage(reason, errMsgMatcher);

                const reasonName = getReasonName(reason);

                if (negate && everyArgIsDefined) {
                    if (errorLikeCompatible && errMsgMatcherCompatible) {
                        this.assert(true,
                                    null,
                                    "expected promise not to be rejected with #{exp} but it was rejected " +
                                    "with #{act}",
                                    errorLikeName,
                                    reasonName);
                    }
                } else {
                    if (errorLike) {
                        this.assert(errorLikeCompatible,
                                    "expected promise to be rejected with #{exp} but it was rejected with #{act}",
                                    "expected promise not to be rejected with #{exp} but it was rejected " +
                                    "with #{act}",
                                    errorLikeName,
                                    reasonName);
                    }

                    if (errMsgMatcher) {
                        this.assert(errMsgMatcherCompatible,
                                    `expected promise to be rejected with an error ${matcherRelation} #{exp} but got ` +
                                    `#{act}`,
                                    `expected promise not to be rejected with an error ${matcherRelation} #{exp}`,
                                    errMsgMatcher,
                                    checkError.getMessage(reason));
                    }
                }

                return reason;
            }
        );

        module.exports.transferPromiseness(this, derivedPromise);
        return this;
    });

    property("eventually", function () {
        utils.flag(this, "eventually", true);
        return this;
    });

    method("notify", function (done) {
        doNotify(getBasePromise(this), done);
        return this;
    });

    method("become", function (value, message) {
        return this.eventually.deep.equal(value, message);
    });

    // ### `eventually`

    // We need to be careful not to trigger any getters, thus `Object.getOwnPropertyDescriptor` usage.
    const methodNames = propertyNames.filter(name => {
        return name !== "assert" && typeof propertyDescs[name].value === "function";
    });

    methodNames.forEach(methodName => {
        Assertion.overwriteMethod(methodName, originalMethod => function () {
            return doAsserterAsyncAndAddThen(originalMethod, this, arguments);
        });
    });

    const getterNames = propertyNames.filter(name => {
        return name !== "_obj" && typeof propertyDescs[name].get === "function";
    });

    getterNames.forEach(getterName => {
        // Chainable methods are things like `an`, which can work both for `.should.be.an.instanceOf` and as
        // `should.be.an("object")`. We need to handle those specially.
        const isChainableMethod = Assertion.prototype.__methods.hasOwnProperty(getterName);

        if (isChainableMethod) {
            Assertion.overwriteChainableMethod(
                getterName,
                originalMethod => function () {
                    return doAsserterAsyncAndAddThen(originalMethod, this, arguments);
                },
                originalGetter => function () {
                    return doAsserterAsyncAndAddThen(originalGetter, this);
                }
            );
        } else {
            Assertion.overwriteProperty(getterName, originalGetter => function () {
                return proxifyIfSupported(doAsserterAsyncAndAddThen(originalGetter, this));
            });
        }
    });

    function doAsserterAsyncAndAddThen(asserter, assertion, args) {
        // Since we're intercepting all methods/properties, we need to just pass through if they don't want
        // `eventually`, or if we've already fulfilled the promise (see below).
        if (!utils.flag(assertion, "eventually")) {
            asserter.apply(assertion, args);
            return assertion;
        }

        const derivedPromise = getBasePromise(assertion).then(value => {
            // Set up the environment for the asserter to actually run: `_obj` should be the fulfillment value, and
            // now that we have the value, we're no longer in "eventually" mode, so we won't run any of this code,
            // just the base Chai code that we get to via the short-circuit above.
            assertion._obj = value;
            utils.flag(assertion, "eventually", false);

            return args ? module.exports.transformAsserterArgs(args) : args;
        }).then(newArgs => {
            asserter.apply(assertion, newArgs);

            // Because asserters, for example `property`, can change the value of `_obj` (i.e. change the "object"
            // flag), we need to communicate this value change to subsequent chained asserters. Since we build a
            // promise chain paralleling the asserter chain, we can use it to communicate such changes.
            return assertion._obj;
        });

        module.exports.transferPromiseness(assertion, derivedPromise);
        return assertion;
    }

    // ### Now use the `Assertion` framework to build an `assert` interface.
    const originalAssertMethods = Object.getOwnPropertyNames(assert).filter(propName => {
        return typeof assert[propName] === "function";
    });

    assert.isFulfilled = (promise, message) => (new Assertion(promise, message)).to.be.fulfilled;

    assert.isRejected = (promise, errorLike, errMsgMatcher, message) => {
        const assertion = new Assertion(promise, message);
        return assertion.to.be.rejectedWith(errorLike, errMsgMatcher, message);
    };

    assert.becomes = (promise, value, message) => assert.eventually.deepEqual(promise, value, message);

    assert.doesNotBecome = (promise, value, message) => assert.eventually.notDeepEqual(promise, value, message);

    assert.eventually = {};
    originalAssertMethods.forEach(assertMethodName => {
        assert.eventually[assertMethodName] = function (promise) {
            const otherArgs = Array.prototype.slice.call(arguments, 1);

            let customRejectionHandler;
            const message = arguments[assert[assertMethodName].length - 1];
            if (typeof message === "string") {
                customRejectionHandler = reason => {
                    throw new chai.AssertionError(`${message}\n\nOriginal reason: ${utils.inspect(reason)}`);
                };
            }

            const returnedPromise = promise.then(
                fulfillmentValue => assert[assertMethodName].apply(assert, [fulfillmentValue].concat(otherArgs)),
                customRejectionHandler
            );

            returnedPromise.notify = done => {
                doNotify(returnedPromise, done);
            };

            return returnedPromise;
        };
    });
};

module.exports.transferPromiseness = (assertion, promise) => {
    assertion.then = promise.then.bind(promise);
};

module.exports.transformAsserterArgs = values => values;


/***/ }),
/* 7 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 8 */
/***/ (function(module, exports) {

/**
 * location.js
 *
 * Parses and builds location strings that point to tokens on the blockchain
 */

/**
 * Helper class to create and parse location strings
 *
 * Every token in Run is stored at a location on the blockchain. Both the "origin"
 * property and "location" property on jigs and code are location strings. Berries
 * have a location but not an origin, and these are prefixed with a protocol.
 *
 * This class helps store and read all of this, but within Run's code, it is important
 * to consider all of the above cases when looking at a location.
 *
 * ------------------
 * JIG/CODE LOCATIONS
 * ------------------
 *
 * To the user, most Jig locations come in the form:
 *
 *  "<txid>_o<vout>"
 *
 * The txid is a transaction id in hex, and vout is the output index as an integer.
 * Locations are usually outputs. But they need not always be outputs. There are other
 * kinds of locations. If the location ends with _i<vin>, then the location refers
 * to an input of a transaction. If the location ends in _r<vref>, then the location
 * refers to another asset reference within the OP_RETURN JSON. Sometimes within an
 * OP_RETURN JSON you will see locations without txids, and these refer to locations
 * in the CURRENT transaction. They look like _o1, _i0, etc.
 *
 * -------------------
 * TEMPORARY LOCATIONS
 * -------------------
 *
 * While a transaction is being built, a jig may have a temporary location:
 *
 *  "????????????????????????????????????????????????ca2f5ee8de79daf0_o1"
 *
 * This is identified by a random temporary txid that starts with '?'. It will get
 * turned into a real location when the token's transaction is known and published.
 * The convention is for temporary txids to have 48 ?'s followed by 16 random hex
 * chars to uniquely identify the temporary txid, but this is not strictly required.
 *
 * ---------------
 * BERRY LOCATIONS
 * ---------------
 *
 * Berry locations are a combination of a protocol + inner location, and usually
 * look like:
 *
 *  "<protocol_txid>_o<protocol_vout>://<inner_location>"
 *
 * The protocol uniquely identifies how the inner location is to be loaded.
 * The inner location does not have to be a valid location in the normal sense.
 * It will be parsed by the protocol, and may be a simple txid or friendly string.
 *
 * ---------------
 * ERROR LOCATIONS
 * ---------------
 *
 * Finally, a location may be invalid, in which case it starts with ! followed by
 * an optional error string
 *
 *  "!This location is not valid"
 */
class Location {
  /**
     * Parses a location string
     * @param {string} location Location to parse
     * @return {object} out
     * @return {string=} out.txid Transaction ID
     * @return {number=} out.vout Output index
     * @return {number=} out.vin Input index
     * @return {number=} out.vref Reference index
     * @return {string=} out.tempTxid Temporary transaction ID
     * @return {string=} out.error Error string if this location is invalid
     * @return {string=} out.innerLocation Inner location string if this location was a protocol
     * @return {string=} out.location Location string passed in with protocol removed
     */
  static parse (location) {
    const error = s => { throw new Error(`${s}: ${location}`) }

    if (typeof location !== 'string') error('Location must be a string')
    if (!location.length) error('Location must not be empty')

    // Check if we are dealing with an error
    if (location[0] === '!') {
      return { error: location.slice(1), location }
    }

    // Check if we are dealing with a protocol
    const protocolParts = location.split('://')
    if (protocolParts.length > 2) error('Location must only have one protocol')
    if (protocolParts.length === 2) {
      return Object.assign({}, Location.parse(protocolParts[0]), { innerLocation: protocolParts[1] })
    }

    // Split the txid and index parts
    const parts = location.split('_')
    if (parts.length > 2) error('Location has an unexpected _ separator')
    if (parts.length < 2) error('Location requires a _ separator')

    const output = { location }

    // Validate the txid
    if (parts[0].length !== 0 && parts[0].length !== 64) error('Location has an invalid txid length')
    if (parts[0][0] === '?') {
      output.tempTxid = parts[0]
    } else if (parts[0].length) {
      if (!/^[a-fA-F0-9]*$/.test(parts[0])) error('Location has invalid hex in its txid')
      output.txid = parts[0]
    }

    // Validate the index number
    const indexString = parts[1].slice(1)
    const index = parseInt(indexString, 10)
    if (isNaN(index) || !/^[0-9]*$/.test(indexString)) error('Location has an invalid index number')

    // Validate the index category
    switch (parts[1][0]) {
      case 'o': { output.vout = index; break }
      case 'i': { output.vin = index; break }
      case 'r': { output.vref = index; break }
      default: error('Location has an invalid index category')
    }

    return output
  }

  /**
     * Creates a location string from options
     * @param {object} options
     * @param {string=} options.txid Transaction ID
     * @param {number=} options.vout Output index
     * @param {number=} options.outputIndex Output index
     * @param {number=} options.vin Input index
     * @param {number=} options.vref Reference index
     * @param {string=} options.tempTxid Temporary transaction ID
     * @param {string=} out.error Error string if this location is invalid
     * @param {string=} options.location Location when not specifying parts as above
     * @param {string=} options.innerLocation Protocol inner location
     * @return {string} The built location string
     */
  static build (options) {
    const error = s => { throw new Error(`${s}: ${JSON.stringify(options)}`) }

    if (typeof options !== 'object' || !options) error('Location object is invalid')
    if (typeof options.innerLocation !== 'undefined' && typeof options.innerLocation !== 'string') error('Inner location must be a string')
    if (typeof options.error !== 'undefined' && typeof options.error !== 'string') error('Error must be a string')

    // If this is an error, return directly
    if (typeof options.error !== 'undefined') return `!${options.error}`

    let location = options.location
    if (!location) {
      // Get the txid
      const txid = `${options.txid || options.tempTxid || ''}`

      // Get the index
      let category = null; let index = null
      if (typeof options.vout === 'number') {
        category = 'o'
        index = options.vout
      } else if (typeof options.vin === 'number') {
        category = 'i'
        index = options.vin
      } else if (typeof options.vref === 'number') {
        category = 'r'
        index = options.vref
      } else error('Location index unspecified')

      const badIndex = isNaN(index) || !isFinite(index) || !Number.isInteger(index) || index < 0
      if (badIndex) error('Location index must be a non-negative integer')

      // Create the location
      location = `${txid}_${category}${index}`
    }

    // Append the sub-location if this is a protocol
    return options.innerLocation ? `${location}://${options.innerLocation}` : location
  }
}

module.exports = Location


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * jig.js
 *
 * Jig class users extend from to create digital property
 */

// TODO
// Sets and maps respect tokens in jigs ... these are overrides for Jigs
//    How? UniqueSet, UniqueMap

const Context = __webpack_require__(16)

const JigControl = { // control state shared across all jigs, similar to a PCB
  stack: [], // jig call stack for the current method (Array<Target>)
  creates: new Set(), // jigs created in the current method (Set<Target>)
  reads: new Set(), // jigs read during the current method (Set<Target>)
  before: new Map(), // saved original state of jigs before method (Target->Checkpoint)
  callers: new Map(), // Callers on each jig method (Target->Set<Object>)
  error: null, // if any errors occurred to prevent swallows
  enforce: true, // enable safeguards for the user
  proxies: new Map(), // map connecting targets to proxies (Target->Proxy)
  blankSlate: false // Whether to create the jig as an empty object
}

JigControl.disableProxy = f => {
  const prevEnforce = JigControl.enforce
  try {
    JigControl.enforce = false
    return f()
  } finally {
    JigControl.enforce = prevEnforce
  }
}

class Jig {
  constructor (...args) {
    const run = Context.activeRunInstance()

    if (!run.code.isSandbox(this.constructor)) {
      run.transaction.begin()
      try {
        const T = run.code.deploy(this.constructor)
        return new T(...args)
      } finally { run.transaction.end() }
    }

    const childClasses = []
    let type = this.constructor
    while (type !== Jig) {
      childClasses.push(type)
      type = Object.getPrototypeOf(type)
    }

    if (childClasses.length === 0) { throw new Error('Jig must be extended') }

    const constructorRegex = /\s+constructor\s*\(/
    if (childClasses.some(type => constructorRegex.test(type.toString()))) {
      throw new Error('Jig must use init() instead of constructor()')
    }

    const unoverridable = ['origin', 'location', 'owner', 'satoshis', 'sync']
    childClasses.forEach(type => {
      unoverridable.forEach(prop => {
        if (Object.prototype.hasOwnProperty.call(childClasses[0].prototype, prop)) {
          throw new Error(`must not override ${prop}`)
        }
      })
    })

    const methods = []
    const classChain = [...childClasses, Jig]
    classChain.forEach(type => {
      Object.getOwnPropertyNames(type.prototype).forEach(prop => methods.push(prop))
    })
    const permanents = [...methods, 'owner', 'satoshis', 'origin', 'location']

    function resetJigControl () {
      JigControl.stack = []
      JigControl.creates = new Set()
      JigControl.reads = new Set()
      JigControl.before = new Map()
      JigControl.callers = new Map()
      JigControl.proxies = new Map()
      JigControl.enforce = true
      JigControl.error = null
    }

    const checkValid = () => {
      if (JigControl.enforce && this.origin && this.origin[0] === '!') {
        throw new Error(`${this.origin.slice(1)}`)
      }
    }

    const original = this
    const handler = { parent: null, name: null }
    const proxy = new Proxy(this, handler)

    // Helper methods to determine where the proxy is being called from
    const topOfStack = () => JigControl.stack[JigControl.stack.length - 1]
    const fromWithin = () => JigControl.stack.length && topOfStack() === original
    const fromInstanceOfSameJigClass = () => JigControl.stack.length && topOfStack().constructor === proxy.constructor
    const fromInstanceOfDifferentJigClass = () => JigControl.stack.length && topOfStack().constructor !== proxy.constructor

    // internal variable that tracks whether init is called. if we are injecting a state, then init was called.
    let calledInit = !!JigControl.blankSlate

    handler.getPrototypeOf = function (target) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      return Object.getPrototypeOf(target)
    }

    handler.setPrototypeOf = function (target, prototype) {
      throw new Error('setPrototypeOf disallowed')
    }

    handler.isExtensible = function (target) {
      return true
    }

    handler.preventExtensions = function (target) {
      throw new Error('preventExtensions disallowed')
    }

    handler.getOwnPropertyDescriptor = function (target, prop) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (!this.has(target, prop)) return undefined

      const descriptor = Object.getOwnPropertyDescriptor(target, prop)
      if (!descriptor) return undefined
      return Object.assign({}, descriptor, { value: this.get(target, prop) })
    }

    handler.defineProperty = function (target, prop, descriptor) {
      throw new Error('defineProperty disallowed')
    }

    handler.has = function (target, prop) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (JigControl.enforce && prop[0] === '_' && fromInstanceOfDifferentJigClass()) {
        throw new Error(`cannot check ${prop} because it is private`)
      }

      const didRead = JigControl.stack.length && (!(target instanceof Jig) || !permanents.includes(prop))

      if (didRead) JigControl.reads.add(original)

      return prop in target
    }

    handler.get = function (target, prop, receiver) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (prop === '$owner') return proxy

      const targetIsAJig = target instanceof Jig

      const syncRequired = ['origin', 'location']

      if (JigControl.enforce && targetIsAJig && syncRequired.includes(prop) && target[prop][0] === '_') {
        throw new Error(`sync required before reading ${prop}`)
      }

      // These don't change, so they don't require a read
      const noRead = ['origin', 'constructor']
      if (targetIsAJig && noRead.includes(prop)) return target[prop]
      const isJigMethod = targetIsAJig && typeof target[prop] === 'function'
      if (JigControl.stack.length && !isJigMethod) JigControl.reads.add(original)

      if (prop[0] === '_' && fromInstanceOfDifferentJigClass()) {
        throw new Error(`cannot get ${prop} because it is private`)
      }

      // return basic types directly
      const basicTypes = ['undefined', 'boolean', 'number', 'string', 'symbol']
      if (basicTypes.includes(typeof target[prop])) return target[prop]

      // If getting an iterator, return the iterator function bound to the original target
      // instead of the proxy, because `new Uint8Array(new Proxy(new Uint8Array([1, 2]), {}))`
      // would otherwise throw an error that "this is not a typed array". For a reference, see:
      // https://stackoverflow.com/questions/45700439/new-proxynew-map-values
      if (prop === Symbol.iterator) return target[prop].bind(target)

      // return object types wrapped
      if (typeof target[prop] === 'object') {
        if (target[prop] === null) return null
        if (target[prop] instanceof Jig) return target[prop]
        if (!JigControl.enforce) return target[prop]

        // wrap existing objects for protection
        const handler = Object.assign({}, this, { parent: target, name: prop })
        return new Proxy(target[prop], handler)
      }

      // If we are returning any constructor, then we don't need to wrap it. Only
      // Jig methods need to be wrapped. Constructors will get wrapped automatically
      // in the Jig constructor.
      if (prop === 'constructor') {
        return target[prop]
      }

      if (typeof target[prop] === 'function') {
        const handler = Object.assign({}, this, { parent: target, name: prop })
        return new Proxy(target[prop], handler)
      }
    }

    handler.set = function (target, prop, value, receiver) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (JigControl.enforce) {
        if (!fromWithin()) {
          throw new Error(`must not set ${prop} outside of a method`)
        }

        if (target instanceof Jig) {
          const notSettable = ['origin', 'location', ...methods]

          if (notSettable.includes(prop)) {
            throw new Error(`must not set ${prop}`)
          }
        } else {
          // Must not overwrite methods on internal objects
          if (typeof target[prop] === 'function') {
            throw new Error(`must not overwrite internal method ${prop}`)
          }

          // Must not set properties on internal property functions
          if (typeof target === 'function') {
            throw new Error(`must not set ${prop} on method ${target.name}`)
          }
        }
      }

      // Whether value is serializable is checked after the method is complete
      target[prop] = value

      return true
    }

    handler.deleteProperty = function (target, prop) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (JigControl.enforce) {
        if (!fromWithin()) {
          throw new Error(`must not delete ${prop} outside of a method`)
        }

        if (target instanceof Jig) {
          const notDeletable = ['origin', 'location', ...methods]

          if (notDeletable.includes(prop)) {
            throw new Error(`must not delete ${prop}`)
          }
        } else {
          if (typeof target[prop] === 'function') {
            throw new Error(`must not delete internal method ${prop}`)
          }
        }
      }

      delete target[prop]

      return true
    }

    handler.ownKeys = function (target) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (JigControl.stack.length) JigControl.reads.add(original)

      if (fromInstanceOfDifferentJigClass()) {
        return Reflect.ownKeys(target).filter(key => key[0] !== '_')
      } else {
        return Reflect.ownKeys(target)
      }
    }

    handler.apply = function (target, thisArg, args) {
      const parentIsAJig = this.parent instanceof Jig

      if (parentIsAJig && this.name[0] === '_' && !fromInstanceOfSameJigClass()) {
        throw new Error(`cannot call ${this.name} because it is private`)
      }

      if (parentIsAJig && this.name === 'sync') {
        if (JigControl.stack.length) throw new Error('sync may only be called externally')
        return target.call(proxy, ...args)
      }

      const run = Context.activeRunInstance()
      run.transaction.begin()

      // If we are calling an internal method on the jig from outside of the jig, then
      // this method is not allowed to change any state. However, we may be deep in a
      // call stack from other jigs, so we cannot use the JigControl.before to determine if
      // a change has occurred. We need a new call stack. Therefore, we'll save the current
      // stack and JigControl state before calling and reinstate it after.
      let outerJigControl = null
      if (!parentIsAJig && !fromWithin()) {
        outerJigControl = Object.assign({}, JigControl)
        resetJigControl()
      }

      // record all jigs that called this jig in order to be able to spend
      // them if this method changes state. all jigs involved in the production
      // of a change of state must be spent.
      const callers = JigControl.callers.get(original) || new Set()
      JigControl.stack.forEach(target => callers.add(target))
      JigControl.callers.set(original, callers)

      // add ourselves to the stack because we're about to invoke a method
      JigControl.stack.push(original)

      JigControl.proxies.set(original, proxy)

      try {
        if (parentIsAJig && this.name === 'init') {
          if (calledInit) throw new Error('init cannot be called twice')
          calledInit = true
          JigControl.creates.add(original)
        }

        const reads = new Set(JigControl.reads)

        // Internal methods do not need a checkpoint
        const argsCheckpoint = parentIsAJig ? new Context.Checkpoint(args, run.code, proxy) : null

        JigControl.disableProxy(() => {
          if (!JigControl.before.has(original)) {
            const checkpoint = new Context.Checkpoint(original, run.code, proxy)
            JigControl.before.set(original, checkpoint)
          }
        })

        JigControl.reads = reads

        // make a copy of the args, which ensures that if the args are changed in the method,
        // we still record to the blockchain what was passed in at the time it was called.
        const callArgs = argsCheckpoint ? argsCheckpoint.restore() : args

        // TODO: Create a clone instead

        // Call the method
        //
        // The call target is the object we call the method on. When our target is a jig,
        // we use the proxy because the method might try to change properties like origin
        // which we want to prevent. If we passed target, we could not intercept these.
        //
        // When our target is an internal non-Jig object, we use the object itself without a
        // proxy because these are native JavaScript objects and require that to work. This
        // is safe because any attempts to change a Jig property like the origin or location
        // must go through a Jig itself, which would be wrapped with a proxy.
        const ret = target.call(parentIsAJig ? proxy : this.parent, ...callArgs)

        if (parentIsAJig && this.name === 'init' && typeof ret !== 'undefined') {
          throw new Error('init must not return')
        }

        if (parentIsAJig) {
          Context.checkOwner(original.owner)
          Context.checkSatoshis(original.satoshis)
        }

        // if there was an error in the call or a child call, and the exception
        // was swallowed, rethrow the error anyway.
        if (JigControl.error) throw new Error(`internal errors must not be swallowed\n\n${JigControl.error}`)

        JigControl.stack.pop()

        // if we are at the bottom of the stack, we have to decide whether to create an
        // action. To do this, we will compare jig states before and after and see if
        // any jigs changed, and if so, figure out the inputs and outputs.
        if (!JigControl.stack.length) {
          // disable enforcement as we are about to read locations on possible inner proxies
          const reads = new Set(JigControl.reads)
          JigControl.enforce = false

          // Calculate after checkpoints. We already have before in JigControl.before
          const after = new Map()
          const objectsToSave = new Set(JigControl.reads)
          Array.from(JigControl.before.keys()).forEach(x => objectsToSave.add(x))
          objectsToSave.forEach(target => {
            after.set(target, new Context.Checkpoint(target, run.code, proxy))
          })

          // Calculate the changed array
          const didChange = ([x, checkpoint]) => !checkpoint.equals(after.get(x))
          const changed = Array.from(JigControl.before).filter(didChange).map(([target]) => target)

          // re-enable enforcement and set back the old reads
          JigControl.enforce = true
          JigControl.reads = reads

          // if anything was created or changed, then we have an action
          if (JigControl.creates.size || changed.length) {
            if (!parentIsAJig) {
              throw new Error(`internal method ${this.name} may not be called to change state`)
            }

            const inputs = new Set()
            const outputs = new Set()
            const reads = new Set(JigControl.reads)

            // helper function to add a jig to the inputs and outputs
            const spend = target => {
              outputs.add(target)
              if (!JigControl.creates.has(target)) inputs.add(target)
            }

            // for every jig changed, add all jigs involved in the production of
            // its changes (its callers set) as outputs, and add them as inputs
            // if they were not newly created.
            changed.forEach(target => {
              JigControl.callers.get(target).forEach(caller => spend(caller))
              spend(target)
            })

            // every jig created gets a new output, and the same applies to its callers
            JigControl.creates.forEach(target => {
              JigControl.callers.get(target).forEach(caller => spend(caller))
              spend(target)
            })

            // record the action in the proto-transaction
            run.transaction.storeAction(original, this.name, args, inputs, outputs,
              reads, JigControl.before, after, JigControl.proxies)
          }

          // If we are within an internal method, then add any changes of state back
          // to the main JigControl. Otherwise reset JigControl.
          if (outerJigControl) {
            JigControl.creates.forEach(target => outerJigControl.creates.add(target))
            JigControl.reads.forEach(target => outerJigControl.reads.add(target))
            JigControl.before.forEach((checkpoint, target) => {
              if (!JigControl.before.has(target)) outerJigControl.before.set(target, checkpoint)
            })
            JigControl.proxies.forEach((proxy, target) => {
              if (!JigControl.proxies.has(target)) outerJigControl.proxies.set(target, proxy)
            })
            JigControl.callers.forEach((callers, target) => {
              if (!JigControl.callers.has(target)) {
                outerJigControl.callers.set(target, callers)
              } else {
                callers.forEach(caller => outerJigControl.get(target).add(caller))
              }
            })
            Object.assign(JigControl, outerJigControl)
          } else {
            resetJigControl()
          }
        }

        run.transaction.end()

        // return the return value of the method to the user
        return ret
      } catch (e) {
        // mark that there was an error so that if a parent jig attempts to
        // wrap it, we will still be able to throw an exception at the end.
        // only record the first...
        if (!JigControl.error) JigControl.error = e

        if (outerJigControl) Object.assign(JigControl, outerJigControl)

        JigControl.stack.pop()

        // If we are at the bottom of the stack, and there was an error, then
        // reset all jigs involved back to their original state before throwing
        // the error to the user.
        if (!JigControl.stack.length) {
          JigControl.before.forEach(checkpoint => checkpoint.restoreInPlace())
          resetJigControl()
        }

        run.transaction.end()

        const message = e.toString()
        if (message === 'TypeError: Date is not a constructor') {
          const hint = 'Hint: Date is disabled inside jigs because it is non-deterministic.'
          const hint2 = 'Consider passing in the Date as a number instead.'
          throw new Error(`${message}\n\n${hint}\n${hint2}`)
        } else throw e
      }
    }

    // if we are injecting a state directly from a cache, just return
    if (JigControl.blankSlate) return proxy

    this.owner = JigControl.stack.length ? JigControl.stack[JigControl.stack.length - 1].owner : run.transaction.owner
    this.satoshis = 0
    // origin and location will be set inside of storeAction
    this.origin = '_'
    this.location = '_'

    proxy.init(...args)

    return proxy
  }

  init () { }

  toString () { return `[jig ${this.constructor.name}]` }

  sync (options) { return Context.activeRunInstance().syncer.sync(Object.assign({}, options, { target: this })) }

  static get caller () {
    // we must be inside a jig method called by another jig method to be non-null
    if (JigControl.stack.length < 2) return null

    // return the proxy for the jig that called this jig
    return JigControl.proxies.get(JigControl.stack[JigControl.stack.length - 2])
  }

  static set caller (value) { throw new Error('Must not set caller on Jig') }

  static [Symbol.hasInstance] (target) {
    const run = Context.activeRunInstance()

    // check if the target has a location. this will be false for this.constructor.prototype.
    if (typeof target !== 'object' || !('location' in target)) return false

    // find the sandboxed version of this class because thats what instances will be
    let T = run.code.getInstalled(this)
    if (!T) {
      const net = Context.networkSuffix(run.blockchain.network)
      T = run.code.getInstalled(this[`origin${net}`])
      if (!T) return false
    }

    // check if this class's prototype is in the prototype chain of the target
    let type = Object.getPrototypeOf(target)
    while (type) {
      if (type === T.prototype) return true
      type = Object.getPrototypeOf(type)
    }

    return false
  }
}

module.exports = { Jig, JigControl }


/***/ }),
/* 10 */
/***/ (function(module, exports) {

/**
 * intrinsics.js
 *
 * Helpers for the known built-in objects in JavaScript
 */

// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const intrinsicNames = [
  // Global functions
  'console',
  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',

  // Fundamental objects
  'Object',
  'Function',
  'Boolean',
  'Symbol',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',

  // Numbers and dates
  'Number',
  'BigInt',
  'Math',
  'Date',

  // Text processing
  'String',
  'RegExp',

  // Indexed collections
  'Array',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',

  // Keyed collections
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',

  // Structured data
  'ArrayBuffer',
  'DataView',
  'JSON',

  // Control abstraction objects
  'Promise',
  'Generator',
  'GeneratorFunction',
  'AsyncFunction',

  // Reflection
  'Reflect',
  'Proxy',

  // Internationalization
  'Intl',

  // WebAssembly
  'WebAssembly'
]

// Returns an object with the built-in intrinsics in this environment
const getIntrinsics = () => {
  let code = 'const x = {};'
  intrinsicNames.forEach(name => { code += `x.${name}=typeof ${name}!=='undefined'?${name}:undefined;` })
  code += 'return x'
  return new Function(code)() // eslint-disable-line
}

const globalIntrinsics = getIntrinsics()

// ------------------------------------------------------------------------------------------------
// Intrinsics
// ------------------------------------------------------------------------------------------------

/**
 * Manages known intrinsics
 */
class Intrinsics {
  constructor () {
    this.default = null
    this.allowed = []
    this.types = new Set()
    this.use(globalIntrinsics)
  }

  set (intrinsics) {
    this.default = null
    this.allowed = []
    this.types = new Set()
    this.use(intrinsics)
    return this
  }

  allow (intrinsics) {
    this.allowed.push(intrinsics)
    Object.keys(intrinsics).forEach(name => this.types.add(intrinsics[name]))
    return this
  }

  use (intrinsics) {
    this.allow(intrinsics)
    this.default = intrinsics
    return this
  }
}

Intrinsics.defaultIntrinsics = new Intrinsics()

// ------------------------------------------------------------------------------------------------

module.exports = { getIntrinsics, intrinsicNames, globalIntrinsics, Intrinsics }


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */



var base64 = __webpack_require__(49)
var ieee754 = __webpack_require__(50)
var isArray = __webpack_require__(51)

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(7)))

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(Buffer) {/**
 * xray.js
 *
 * Powerful object scanner to deeply inspect, serialize, deserialize, and clone objects.
 */

// TODO
// Document serialization protocol
//  -Tests
//  -Tokens and deployables don't need sets. Need loaders.
//  -Documentation (remove Builder references)
//  -Does UniqueSet need special handling for Set?
//  -Hook up to existing code (And UniqueSet as default)
//  -How to load other protocols?
// - intrinsics are designed to be as flexible as safe.
// So Objects and arrays are acceptible from without.
// Document scanner API

const Protocol = __webpack_require__(14)
const { display } = __webpack_require__(4)
const { Jig, JigControl } = __webpack_require__(9)
const { Berry } = __webpack_require__(13)
const { Intrinsics } = __webpack_require__(10)

// ------------------------------------------------------------------------------------------------
// Xray
// -----------------------------------------------------------------------------------------------

/**
 * The Xray is a scanner that an clone, serialize, and deserialize complex JavaScript objects with
 * tokens into formats that be stored on a blockchain and cached. To use the Xray, create one using
 * the Builder below, specifying and properties needed. Then, you may begin scanning objects. The
 * Xray has internal caches and assumes that while using the scanner objects will not change. The
 * Xray uses Scanners to process objects. Scanners have a consistent API documented below.
 *
 * Format:
 *  $class
 *
 * Caches, intrinsics - membrane, not passing objects or arrays, primitives OK.
 *
 * Serialization is JSON
 */
class Xray {
  /**
   * Creates an Xray that uses the default intrinsics and a set of basic scanners. Tokens and
   * deployables are not supported by default in scanned objects and must be enabled.
   */
  constructor () {
    this.intrinsics = Intrinsics.defaultIntrinsics
    this.tokenizer = null
    this.deployables = null
    this.tokens = null
    this.refs = null
    this.caches = {
      scanned: new Set(),
      cloneable: new Map(),
      serializable: new Map(),
      deserializable: new Map(),
      clone: new Map(),
      serialize: new Map(),
      deserialize: new Map(),
      predeserialize: new Map()
    }
    this.scanners = [
      new DedupScanner(),
      new UndefinedScanner(),
      new PrimitiveScanner(),
      new BasicObjectScanner(),
      new BasicArrayScanner(),
      new Uint8ArrayScanner(),
      new SetScanner(),
      new MapScanner()
    ]
  }

  allowTokens () {
    if (!this.tokens) {
      this.tokens = new Set()
      this.refs = new Set()
      this.scanners.unshift(new TokenScanner())
    }
    return this
  }

  allowDeployables () {
    if (!this.deployables) {
      this.deployables = new Set()
      this.scanners.unshift(new DeployableScanner())
      this.scanners.push(new ArbitraryObjectScanner())
    }
    return this
  }

  useTokenSaver (saveToken) { this.saveToken = saveToken; return this }
  useTokenLoader (loadToken) { this.loadToken = loadToken; return this }
  useCodeCloner (cloneCode) { this.cloneCode = cloneCode; return this }
  useIntrinsics (intrinsics) { this.intrinsics = intrinsics; return this }
  restrictOwner (owner) { this.restrictedOwner = owner; return this }
  deeplyScanTokens () { this.deeplyScanTokens = true; return this }
  useTokenReplacer (replaceToken) { this.replaceToken = replaceToken; return this }

  scan (x) {
    if (this.caches.scanned.has(x)) return this
    for (const scanner of this.scanners) {
      const value = scanner.scan(x, this)
      if (typeof value === 'undefined') continue
      this.caches.scanned.add(x)
      if (value === false) break
      return true
    }
    throw new Error(`${display(x)} cannot be scanned`)
  }

  /**
   * Returns whether an object can be cloned by this Xray
   */
  cloneable (x) {
    if (this.caches.cloneable.has(x)) return this.caches.cloneable.get(x)
    for (const scanner of this.scanners) {
      const value = scanner.cloneable(x, this)
      if (typeof value === 'undefined') continue
      this.caches.cloneable.set(x, value)
      if (!value && typeof this.errorObject === 'undefined') this.errorObject = x
      return value
    }
    this.caches.cloneable.set(x, false)
    if (typeof this.errorObject === 'undefined') this.errorObject = x
    return false
  }

  /**
   * Returns whether an object can be serialized by this Xray
   */
  serializable (x) {
    if (this.caches.serializable.has(x)) return this.caches.serializable.get(x)
    for (const scanner of this.scanners) {
      const value = scanner.serializable(x, this)
      if (typeof value === 'undefined') continue
      this.caches.serializable.set(x, value)
      if (!value && typeof this.errorObject === 'undefined') this.errorObject = x
      return value
    }
    this.caches.serializable.set(x, false)
    if (typeof this.errorObject === 'undefined') this.errorObject = x
    return false
  }

  /**
   * Returns whether an object can be deserialized by this Xray
   */
  deserializable (x) {
    if (this.caches.deserializable.has(x)) return this.caches.deserializable.get(x)
    for (const scanner of this.scanners) {
      const value = scanner.deserializable(x, this)
      if (typeof value === 'undefined') continue
      this.caches.deserializable.set(x, value)
      if (!value && typeof this.errorObject === 'undefined') this.errorObject = x
      return value
    }
    this.caches.deserializable.set(x, false)
    if (typeof this.errorObject === 'undefined') this.errorObject = x
    return false
  }

  clone (x) {
    this.errorObject = undefined
    if (this.caches.clone.has(x)) return this.caches.clone.get(x)
    for (const scanner of this.scanners) {
      const cloneable = scanner.cloneable(x, this)
      if (typeof cloneable === 'undefined') continue
      if (cloneable === false) break
      const y = scanner.clone(x, this)
      this.caches.clone.set(x, y)
      return y
    }
    const errorObject = typeof this.errorObject !== 'undefined' ? this.errorObject : x
    throw new Error(`${display(errorObject)} cannot be cloned`)
  }

  serialize (x) {
    this.errorObject = undefined
    if (this.caches.serialize.has(x)) return this.caches.serialize.get(x)
    for (const scanner of this.scanners) {
      const serializable = scanner.serializable(x, this)
      if (typeof serializable === 'undefined') continue
      if (serializable === false) break
      const y = scanner.serialize(x, this)
      this.caches.serialize.set(x, y)
      return y
    }
    const errorObject = typeof this.errorObject !== 'undefined' ? this.errorObject : x
    throw new Error(`${display(errorObject)} cannot be serialized`)
  }

  deserialize (x) {
    this.errorObject = undefined
    if (this.caches.deserialize.has(x)) return this.caches.deserialize.get(x)
    for (const scanner of this.scanners) {
      const deserializable = scanner.deserializable(x, this)
      if (typeof deserializable === 'undefined') continue
      if (deserializable === false) break
      const y = scanner.deserialize(x, this)
      this.caches.deserialize.set(x, y)
      return y
    }
    const errorObject = typeof this.errorObject !== 'undefined' ? this.errorObject : x
    throw new Error(`${display(errorObject)} cannot be deserialized`)
  }

  predeserialize (x) {
    if (this.caches.predeserialize.has(x)) return
    for (const scanner of this.scanners) {
      const deserializable = scanner.deserializable(x, this)
      if (typeof deserializable === 'undefined') continue
      if (deserializable === false) break
      const y = scanner.predeserialize(x, this)
      this.caches.predeserialize.set(x, y)
      return y
    }
    throw new Error(`${display(x)} cannot be predeserialized`)
  }

  scanAndReplace (x) {
    this.scan(x)
    if (this.replaceToken && Protocol.isToken(x)) {
      const replacement = this.replaceToken(x)
      if (replacement) return replacement
    }
    return x
  }

  checkOwner (x) {
    if (typeof x.$owner !== 'undefined' && x.$owner !== this.restrictedOwner) {
      const suggestion = `Hint: Consider saving a clone of ${x} value instead.`
      throw new Error(`Property ${display(x)} is owned by a different token\n\n${suggestion}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Scanner API
// -----------------------------------------------------------------------------------------------

class Scanner {
  // Return true to skip, false to stop, undefined to continue
  scan (x, xray) { throw new Error('Not implemented') }
  cloneable (x, xray) { throw new Error('Not implemented') }
  serializable (x, xray) { throw new Error('Not implemented') }
  deserializable (x, xray) { throw new Error('Not implemented') }
  clone (x, xray) { throw new Error('Not implemented') }
  serialize (x, xray) { throw new Error('Not implemented') }
  deserialize (x, xray) { throw new Error('Not implemented') }
  predeserialize (x, xray) { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------
// Undefined value scanner
// -----------------------------------------------------------------------------------------------

/**
 * Scanner to handle undefined, which cannot be passed through during serializion
 */
class UndefinedScanner {
  scan (x, xray) { if (typeof x === 'undefined') return true }
  cloneable (x, xray) { if (typeof x === 'undefined') return true }
  serializable (x, xray) { if (typeof x === 'undefined') return true }
  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$undef === 'undefined') return
    return x.$undef === 1
  }

  clone (x, xray) { return x }
  serialize (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$undef = 1
    return y
  }

  deserialize (x, xray) { return undefined }
  predeserialize (x, xray) { }
}

// ------------------------------------------------------------------------------------------------
// Primitive value scanner
// -----------------------------------------------------------------------------------------------

/**
 * Scanner to handle booleans, numbers, strings, and null
 */
class PrimitiveScanner {
  scan (x, xray) {
    switch (typeof x) {
      case 'boolean': return true
      case 'number': return true
      case 'string': return true
      case 'object': return x === null ? true : undefined
      case 'symbol': return true
    }
  }

  cloneable (x, xray) {
    switch (typeof x) {
      case 'boolean': return true
      case 'number': return true
      case 'string': return true
      case 'object': return x === null ? true : undefined
    }
  }

  serializable (x, xray) {
    switch (typeof x) {
      case 'boolean': return true
      case 'number': return !isNaN(x) && isFinite(x)
      case 'string': return true
      case 'object': return x === null ? true : undefined
    }
  }

  deserializable (x, xray) {
    switch (typeof x) {
      case 'boolean': return true
      case 'number': return !isNaN(x) && isFinite(x)
      case 'string': return true
      case 'object': return x === null ? true : undefined
    }
  }

  clone (x, xray) { return x }
  serialize (x, xray) { return x }
  deserialize (x, xray) { return x }
  predeserialize (x, xray) { }
}

// ------------------------------------------------------------------------------------------------
// Normal object scanner
// -----------------------------------------------------------------------------------------------

class BasicObjectScanner {
  scan (x, xray) {
    if (this.isBasicObject(x, xray)) {
      xray.checkOwner(x)
      xray.caches.scanned.add(x)
      Object.keys(x).forEach(key => {
        xray.scan(key)
        if (xray.replaceToken) {
          x[key] = xray.scanAndReplace(x[key])
        } else xray.scan(x[key])
      })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isBasicObject(x, xray)) return
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isBasicObject(x, xray)) return
    if (Object.keys(x).find(key => key.startsWith('$'))) return false
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (!this.isBasicObject(x, xray)) return
    if (Object.keys(x).find(key => key.startsWith('$'))) return
    xray.caches.deserializable.set(x, true) // Preassume deserializable for circular refs
    return !Object.keys(x).some(key => !xray.deserializable(key) || !xray.deserializable(x[key]))
  }

  clone (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    xray.caches.clone.set(x, y)
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    xray.caches.serialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.serialize(key)] = xray.serialize(x[key]) })
    return y
  }

  deserialize (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = xray.caches.predeserialize.get(x) || Object.create(Object.prototype)
    xray.caches.deserialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
    return y
  }

  predeserialize (x, xray) {
    const { Object } = xray.intrinsics.default
    return Object.create(Object.prototype)
  }

  isBasicObject (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (xray.intrinsics.types.has(x)) return false
    return getPrototypeCount(x) === 1 // Object
  }
}

// ------------------------------------------------------------------------------------------------
// Normal array scanner
// -----------------------------------------------------------------------------------------------

class BasicArrayScanner {
  scan (x, xray) {
    if (this.isBasicArray(x, xray)) {
      xray.checkOwner(x)
      xray.caches.scanned.add(x)
      Object.keys(x).forEach(key => {
        xray.scan(key)
        if (xray.replaceToken) {
          x[key] = xray.scanAndReplace(x[key])
        } else xray.scan(x[key])
      })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isBasicArray(x, xray)) return
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isBasicArray(x, xray)) return
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (!this.isBasicArray(x, xray)) return
    xray.caches.deserializable.set(x, true) // Preassume deserializable for circular refs
    return !Object.keys(x).some(key => !xray.deserializable(key) || !xray.deserializable(x[key]))
  }

  clone (x, xray) {
    const { Array } = xray.intrinsics.default
    const y = Array.from([])
    xray.caches.clone.set(x, y)
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const { Array } = xray.intrinsics.default
    const y = Array.from([])
    xray.caches.serialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.serialize(key)] = xray.serialize(x[key]) })
    return y
  }

  deserialize (x, xray) {
    const { Array } = xray.intrinsics.default
    const y = xray.caches.predeserialize.get(x) || Array.from([])
    xray.caches.deserialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
    return y
  }

  predeserialize (x, xray) {
    const { Array } = xray.intrinsics.default
    return Array.from([])
  }

  isBasicArray (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 2) return false // Array, Object
    return xray.intrinsics.allowed.some(intrinsics => intrinsics.Array.isArray(x))
  }
}

// ------------------------------------------------------------------------------------------------
// Uint8Array scanner
// -----------------------------------------------------------------------------------------------

const base64Chars = new Set()
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  .split('').forEach(x => base64Chars.add(x))

class Uint8ArrayScanner {
  scan (x, xray) {
    if (this.isUint8Array(x, xray)) {
      xray.checkOwner(x)
      return true
    }
  }

  cloneable (x, xray) { if (this.isUint8Array(x, xray)) return true }
  serializable (x, xray) { if (this.isUint8Array(x, xray)) return true }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$ui8a === 'undefined') return
    if (typeof x.$ui8a !== 'string') return false
    return !x.$ui8a.split('').some(x => !base64Chars.has(x))
  }

  clone (x, xray) {
    const { Uint8Array } = xray.intrinsics.default
    return Uint8Array.from(x)
  }

  serialize (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$ui8a = Buffer.from(x).toString('base64')
    return y
  }

  deserialize (x, xray) {
    const { Uint8Array } = xray.intrinsics.default
    return xray.caches.predeserialize.get(x) ||
      Uint8Array.from(Buffer.from(x.$ui8a, 'base64'))
  }

  predeserialize (x, xray) {
    const { Uint8Array } = xray.intrinsics.default
    return Uint8Array.from(Buffer.from(x.$ui8a, 'base64'))
  }

  isUint8Array (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 3) return false // Uint8Array, TypedArray, Object
    if (Object.keys(x).some(key => isNaN(key) || x[key] > 255 || x[key] < 0)) return false
    return xray.intrinsics.allowed.some(intrinsics => x instanceof intrinsics.Uint8Array)
  }
}

// ------------------------------------------------------------------------------------------------
// Set scanner
// -----------------------------------------------------------------------------------------------

class SetScanner {
  scan (x, xray) {
    if (this.isSet(x, xray)) {
      xray.checkOwner(x)
      xray.caches.scanned.add(x)
      if (xray.replaceToken) {
        const newSet = new Set()
        for (const y of x) { newSet.add(xray.scanAndReplace(y)) }
        x.clear()
        newSet.forEach(y => x.add(y))
      } else for (const y of x) { xray.scan(y) }
      Object.keys(x).forEach(key => {
        xray.scan(key)
        if (xray.replaceToken) {
          x[key] = xray.scanAndReplace(x[key])
        } else xray.scan(x[key])
      })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isSet(x, xray)) return
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    for (const y of x) { if (!xray.cloneable(y)) return false }
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isSet(x, xray)) return
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    for (const y of x) { if (!xray.serializable(y)) return false }
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$set === 'undefined') return
    if (!Array.isArray(x.$set)) return false
    if (typeof x.props !== 'undefined' && (typeof x.props !== 'object' || !x.props)) return false
    xray.caches.deserializable.set(x, true) // Preassume deserializable for circular refs
    if (x.$set && x.$set.some(y => !xray.deserializable(y))) return false
    if (x.props) return !Object.keys(x.props).some(key => !xray.deserializable(key) || !xray.deserializable(x.props[key]))
    return true
  }

  clone (x, xray) {
    const { Set } = xray.intrinsics.default
    const y = new Set()
    xray.caches.clone.set(x, y)
    for (const entry of x) { y.add(xray.clone(entry)) }
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const { Object, Array } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    xray.caches.serialize.set(x, y)
    y.$set = Array.from([])
    for (const entry of x) { y.$set.push(xray.serialize(entry)) }
    if (Object.keys(x).length) {
      y.props = Object.create(Object.prototype)
      Object.keys(x).forEach(key => { y.props[xray.serialize(key)] = xray.serialize(x[key]) })
    }
    return y
  }

  deserialize (x, xray) {
    const { Set } = xray.intrinsics.default
    const y = xray.caches.predeserialize.get(x) || new Set()
    xray.caches.deserialize.set(x, y)
    for (const entry of x.$set) { y.add(xray.deserialize(entry)) }
    if (x.props) Object.keys(x.props).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x.props[key]) })
    return y
  }

  predeserialize (x, xray) {
    const { Set } = xray.intrinsics.default
    return new Set()
  }

  isSet (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 2) return false // Set, Object
    return xray.intrinsics.allowed.some(intrinsics => x instanceof intrinsics.Set)
  }
}

// ------------------------------------------------------------------------------------------------
// Map scanner
// -----------------------------------------------------------------------------------------------

class MapScanner {
  scan (x, xray) {
    if (this.isMap(x, xray)) {
      xray.checkOwner(x)
      xray.caches.scanned.add(x)
      for (const entry of x) xray.scan(entry)
      if (xray.replaceToken) {
        const newMap = new Map()
        for (const [key, val] of x) newMap.set(xray.scanAndReplace(key), xray.scanAndReplace(val))
        x.clear()
        newMap.forEach(([key, val]) => x.set(key, val))
      } else for (const entry of x) { xray.scan(entry) }
      Object.keys(x).forEach(key => {
        xray.scan(key)
        if (xray.replaceToken) {
          x[key] = xray.scanAndReplace(x[key])
        } else xray.scan(x[key])
      })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isMap(x, xray)) return
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    for (const [key, val] of x) {
      if (!xray.cloneable(key)) return false
      if (!xray.cloneable(val)) return false
    }
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isMap(x, xray)) return
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    for (const [key, val] of x) {
      if (!xray.serializable(key)) return false
      if (!xray.serializable(val)) return false
    }
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$map === 'undefined') return
    if (!Array.isArray(x.$map)) return false
    if (typeof x.props !== 'undefined' && (typeof x.props !== 'object' || !x.props)) return false
    xray.caches.deserializable.set(x, true) // Preassume deserializable for circular refs
    for (const entry of x.$map) {
      if (!Array.isArray(entry) || entry.length !== 2) return false
      if (!xray.deserializable(entry[0])) return false
      if (!xray.deserializable(entry[1])) return false
    }
    if (x.props) {
      return !Object.keys(x.props).some(key =>
        !xray.deserializable(key) || !xray.deserializable(x.props[key]))
    }
    return true
  }

  clone (x, xray) {
    const { Map } = xray.intrinsics.default
    const y = new Map()
    xray.caches.clone.set(x, y)
    for (const [key, val] of x) { y.set(xray.clone(key), xray.clone(val)) }
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const { Object, Array } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$map = Array.from([])
    xray.caches.serialize.set(x, y)
    for (const entry of x) y.$map.push(xray.serialize(entry))
    if (Object.keys(x).length) {
      y.props = Object.create(Object.prototype)
      Object.keys(x).forEach(key => { y.props[xray.serialize(key)] = xray.serialize(x[key]) })
    }
    return y
  }

  deserialize (x, xray) {
    const { Map } = xray.intrinsics.default
    const y = xray.caches.predeserialize.get(x) || new Map()
    xray.caches.deserialize.set(x, y)
    for (const [key, val] of x.$map) { y.set(xray.deserialize(key), xray.deserialize(val)) }
    if (x.props) Object.keys(x.props).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x.props[key]) })
    return y
  }

  predeserialize (x, xray) {
    const { Map } = xray.intrinsics.default
    return new Map()
  }

  isMap (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 2) return false // Map, Object
    return xray.intrinsics.allowed.some(intrinsics => x instanceof intrinsics.Map)
  }
}

// ------------------------------------------------------------------------------------------------
// Arbitrary classes
// ------------------------------------------------------------------------------------------------

class ArbitraryObjectScanner {
  constructor () {
    this.basicObjectScanner = new BasicObjectScanner()
  }

  scan (x, xray) {
    if (this.isArbitraryObject(x, xray)) {
      xray.checkOwner(x)
      xray.caches.scanned.add(x)
      Object.keys(x).forEach(key => {
        xray.scan(key)
        if (xray.replaceToken) {
          x[key] = xray.scanAndReplace(x[key])
        } else xray.scan(x[key])
      })
      const newConstructor = xray.scanAndReplace(x.constructor)
      if (newConstructor !== x.constructor) Object.setPrototypeOf(x, newConstructor)
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isArbitraryObject(x, xray)) return
    return this.basicObjectScanner.cloneable(Object.assign({}, x), xray)
  }

  serializable (x, xray) {
    if (!this.isArbitraryObject(x, xray)) return
    return this.basicObjectScanner.serializable(Object.assign({}, x), xray)
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$arbob === 'undefined') return
    if (typeof x.$arbob !== 'object' || !x.$arbob) return false
    if (typeof x.type !== 'string') return false
    return true
  }

  clone (x, xray) {
    if (!xray.cloneCode) throw new Error(`No code cloner available to clone ${display(x)}`)
    const clone = this.basicObjectScanner.clone(Object.assign({}, x), xray)
    const sandbox = xray.cloneCode(x.constructor)
    Object.setPrototypeOf(clone, sandbox.prototype)
    return clone
  }

  serialize (x, xray) {
    if (!xray.saveToken) throw new Error(`No token saver available to serialize ${display(x)}`)
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$arbob = this.basicObjectScanner.serialize(Object.assign({}, x), xray)
    y.type = xray.saveToken(x.constructor)
    if (typeof y.type !== 'string') throw new Error(`Saved type location must be a string: ${y.type}`)
    return y
  }

  deserialize (x, xray) {
    if (!xray.loadToken) throw new Error(`No token restorer available to deserialize ${display(x)}`)
    const { Object } = xray.intrinsics.default
    const obj = xray.caches.predeserialize.get(x) || Object.create(Object.prototype)
    Object.assign(obj, this.basicObjectScanner.deserialize(x.$arbob, xray))
    const type = xray.loadToken(x.type)
    Object.setPrototypeOf(obj, type.prototype)
    return obj
  }

  predeserialize (x, xray) {
    const { Object } = xray.intrinsics.default
    return Object.create(Object.prototype)
  }

  isArbitraryObject (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (!deployable(x.constructor, xray)) return false
    if (Protocol.isToken(x.constructor)) xray.tokens.add(x.constructor)
    xray.deployables.add(x.constructor)
    return true
  }
}

// ------------------------------------------------------------------------------------------------
// Duplicate object scanner
// ------------------------------------------------------------------------------------------------

class DedupScanner {
  constructor () {
    this.topLevel = true
    this.dups = null
    this.checkingDeserializability = false
    this.deserializingDups = false
    this.deserializingMaster = false
  }

  scan (x, xray) { }
  cloneable (x, xray) { }

  serializable (x, xray) {
    const topLevel = this.topLevel
    this.topLevel = false
    try {
      if (topLevel) return xray.serializable(x, xray)
    } finally {
      this.topLevel = topLevel
    }
  }

  deserializable (x, xray) {
    const topLevel = this.topLevel
    this.topLevel = false
    try {
      if (topLevel) {
        if (typeof x !== 'object' || !x || typeof x.$dedup === 'undefined') return
        if (!Array.isArray(x.dups)) return false
        this.dups = x.dups
        try {
          this.checkingDeserializability = true
          return xray.deserializable(x.$dedup) && xray.deserializable(x.dups)
        } finally {
          this.checkingDeserializability = false
          this.dups = null
        }
      } else {
        if (this.checkingDeserializability || this.deserializingDups || this.deserializingMaster) {
          if (typeof x !== 'object' || !x || typeof x.$dup === 'undefined') return
          if (typeof x.$dup !== 'number') return false
          if (!Number.isInteger(x.$dup) || x.$dup < 0 || x.$dup >= this.dups.length) return false
          return true
        }
      }
    } finally {
      this.topLevel = topLevel
    }
  }

  clone (x, xray) { }

  serialize (x, xray) {
    const topLevel = this.topLevel
    this.topLevel = false
    try {
      if (topLevel) return this.dedup(x, xray)
    } finally {
      this.topLevel = topLevel
    }
  }

  deserialize (x, xray) {
    const topLevel = this.topLevel
    this.topLevel = false
    try {
      if (topLevel) {
        if (typeof x !== 'object' || !x || typeof x.$dedup === 'undefined') return

        this.dups = x.dups

        // Predeserialize each dup to put objects in the cache
        this.dups = this.dups.map(dup => xray.predeserialize(dup))

        // Deserialize each dup
        try {
          this.deserializingDups = true
          this.dups = x.dups.map(dup => xray.deserialize(dup))
        } finally {
          this.deserializingDups = false
        }

        // Deserialize the master object
        try {
          this.deserializingMaster = true
          return xray.deserialize(x.$dedup)
        } finally {
          this.deserializingMaster = false
        }
      } else {
        // If we are deserializing any dups, replace them with our known set
        if (this.deserializingDups || this.deserializingMaster) {
          return this.dups[x.$dup]
        }
      }
    } finally {
      this.topLevel = topLevel
    }
  }

  predeserialize (x, xray) { }

  dedup (x, xray) {
    const serialized = xray.serialize(x)

    const { Object, Array } = xray.intrinsics.default

    const seen = new Set()
    const indexes = new Map()
    function detectDups (x) {
      if (typeof x !== 'object' || !x) return
      if (seen.has(x)) {
        if (!indexes.has(x)) indexes.set(x, indexes.size)
      } else {
        seen.add(x)
        Object.keys(x).forEach(key => detectDups(x[key]))
      }
    }

    detectDups(serialized)

    if (!indexes.size) return serialized

    function replaceDups (x) {
      if (typeof x !== 'object' || !x) return x
      if (indexes.has(x)) {
        const y = Object.create(Object.prototype)
        y.$dup = indexes.get(x)
        return y
      } else {
        Object.keys(x).forEach(key => { x[key] = replaceDups(x[key]) })
        return x
      }
    }

    const value = replaceDups(serialized)
    const dups = Array.from(indexes.keys())

    dups.forEach(dup => {
      Object.keys(dup).forEach(key => { dup[key] = replaceDups(dup[key]) })
    })

    const y = Object.create(Object.prototype)
    y.$dedup = value
    y.dups = dups
    return y
  }
}

// ------------------------------------------------------------------------------------------------
// Code detector
// -----------------------------------------------------------------------------------------------

class DeployableScanner {
  scan (x, xray) {
    if (deployable(x, xray)) {
      xray.checkOwner(x)
      xray.deployables.add(x)
      if (xray.deeplyScanTokens) {
        xray.caches.scanned.add(x)
        Object.keys(x).forEach(key => {
          xray.scan(key)
          if (xray.replaceToken) {
            x[key] = xray.scanAndReplace(x[key])
          } else xray.scan(x[key])
        })
      }
      return true
    }
  }

  cloneable (x, xray) {
    if (deployable(x, xray)) {
      xray.deployables.add(x)
      return true
    }
  }

  serializable (x, xray) {
    // We never serialize deployables. They must be tokens when serialized.
  }

  deserializable (x, xray) {
    // We never deserialize deployables. They become tokens when serialized.
  }

  clone (x, xray) {
    if (!xray.cloneCode) throw new Error(`No code cloner available to clone ${display(x)}`)
    return xray.cloneCode(x)
  }

  serialize (x, xray) {
    // We never serialize deployables. They become tokens when serialized.
  }

  deserialize (x, xray) {
    // We never deserialize deployables. They become tokens when serialized.
  }

  predeserialize (x, xray) {
    // We never deserialize deployables. They become tokens when serialized.
  }
}

// ------------------------------------------------------------------------------------------------
// Token detector
// -----------------------------------------------------------------------------------------------

class TokenScanner {
  scan (x, xray) {
    if (Protocol.isToken(x)) {
      xray.tokens.add(x)
      if (xray.deeplyScanTokens) {
        xray.caches.scanned.add(x)

        JigControl.disableProxy(() => {
          Object.keys(x).forEach(key => {
            xray.scan(key)
            // Berries are frozen and their inner assets cannot be replaced
            if (xray.replaceToken && !(x instanceof Berry)) {
              x[key] = xray.scanAndReplace(x[key])
            } else {
              xray.scan(x[key])
            }
          })
        })
      }
      return true
    }

    if (typeof x === 'object' && x && typeof x.$ref !== 'undefined') {
      if (typeof x.$ref !== 'string') return false
      xray.refs.add(x.$ref)
      return true
    }
  }

  cloneable (x, xray) {
    if (Protocol.isToken(x)) {
      xray.tokens.add(x)
      return true
    }

    if (typeof x === 'object' && x && typeof x.$ref !== 'undefined') {
      if (typeof x.$ref !== 'string') return false
      xray.refs.add(x.$ref)
      return true
    }
  }

  serializable (x, xray) {
    if (Protocol.isToken(x)) {
      xray.tokens.add(x)
      return true
    }
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$ref === 'undefined') return
    if (typeof x.$ref !== 'string') return false
    xray.refs.add(x.$ref)
    return true
  }

  clone (x, xray) {
    // Clone is often used to provide safe sandboxing, but all tokens are safely sandboxed
    return x
  }

  serialize (x, xray) {
    if (!xray.saveToken) throw new Error(`No token saver available to serialize ${display(x)}`)
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$ref = xray.saveToken(x)
    if (typeof y.$ref !== 'string') throw new Error(`Saved token location must be a string: ${y.$ref}`)
    return y
  }

  deserialize (x, xray) {
    if (!xray.loadToken) throw new Error(`No token restorer available to deserialize ${display(x)}`)
    return xray.loadToken(x.$ref)
  }

  predeserialize (x, xray) { }
}

// ------------------------------------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------------------------------------

function getPrototypeCount (x) {
  let count = 0
  x = Object.getPrototypeOf(x)
  while (x) { x = Object.getPrototypeOf(x); count++ }
  return count
}

function deployable (x, xray) {
  if (typeof x !== 'function') return false
  if (display(x).indexOf('[native code]') !== -1) return false
  if (xray.intrinsics.types.has(x)) return false
  return true
}

// ------------------------------------------------------------------------------------------------
// Jig Checkpoint
// ------------------------------------------------------------------------------------------------

class Checkpoint {
  constructor (x, code, owner) {
    this.x = x
    this.refs = []

    this.xray = new Xray()
      .allowDeployables()
      .allowTokens()
      .restrictOwner(owner)
      .useIntrinsics(code.intrinsics)
      .useTokenSaver(token => { this.refs.push(token); return (this.refs.length - 1).toString() })
      .useTokenLoader(ref => this.refs[parseInt(ref, 10)])

    // Note: We should scan and deploy in one pass
    const obj = x instanceof Jig ? Object.assign({}, x) : x
    this.xray.scan(obj)
    this.xray.deployables.forEach(deployable => code.deploy(deployable))
    this.serialized = this.xray.serialize(obj)
  }

  restore () {
    if (!('restored' in this)) {
      this.restored = this.xray.deserialize(this.serialized)
    }
    return this.restored
  }

  restoreInPlace () {
    JigControl.disableProxy(() => {
      Object.keys(this.x).forEach(key => delete this.x[key])
      Object.assign(this.x, this.restore())
    })
  }

  equals (other) {
    const deepEqual = (a, b) => {
      if (typeof a !== typeof b) return false
      if (typeof a === 'object' && typeof b === 'object') {
        if (Object.keys(a).length !== Object.keys(b).length) return false
        return Object.keys(a).every(key => deepEqual(a[key], b[key]))
      }
      return a === b
    }

    if (!deepEqual(this.serialized, other.serialized)) return false
    if (this.refs.length !== other.refs.length) return false
    return this.refs.every((ref, n) => this.refs[n] === other.refs[n])
  }
}

// ------------------------------------------------------------------------------------------------

Xray.Scanner = Scanner
Xray.Checkpoint = Checkpoint

module.exports = Xray

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(11).Buffer))

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

const Context = __webpack_require__(16)

const BerryControl = {
  protocol: undefined,
  location: undefined
}

// Note: This is a good way to learn the Jig class
class Berry {
  constructor (...args) {
    const run = Context.activeRunInstance()

    // Sandbox the berry
    if (!run.code.isSandbox(this.constructor)) {
      run.transaction.begin()
      try {
        const T = run.code.deploy(this.constructor)
        return new T(...args)
      } finally { run.transaction.end() }
    }

    // Check the berry is property derived (no constructors)
    const childClasses = []
    let type = this.constructor
    while (type !== Berry) {
      childClasses.push(type)
      type = Object.getPrototypeOf(type)
    }

    if (childClasses.length === 0) { throw new Error('Berry must be extended') }

    const constructorRegex = /\s+constructor\s*\(/
    if (childClasses.some(type => constructorRegex.test(type.toString()))) {
      throw new Error('Berry must use init() instead of constructor()')
    }

    // Check that the protocol matches
    if (!BerryControl.protocol || BerryControl.protocol !== this.constructor.protocol) {
      throw new Error('Must only create Berry from its protocol')
    }

    // Run the init
    this.init(...args)

    // Validate the location
    if (typeof this.location !== 'undefined') {
      throw new Error('Berry init() must not set a location')
    }

    if (!BerryControl.location) throw new Error('Must only pluck one berry at a time')
    this.location = BerryControl.location
    BerryControl.location = undefined

    // Free the object so there are no more changes
    Context.deepFreeze(this)
  }

  init () { }

  static [Symbol.hasInstance] (target) {
    const run = Context.activeRunInstance()

    // check if the target has a location. this will be false for this.constructor.prototype.
    if (typeof target !== 'object' || !('location' in target)) return false

    // find the sandboxed version of this class because thats what instances will be
    let T = run.code.getInstalled(this)
    if (!T) {
      const net = Context.networkSuffix(run.blockchain.network)
      T = run.code.getInstalled(this[`origin${net}`])
      if (!T) return false
    }

    // check if this class's prototype is in the prototype chain of the target
    let type = Object.getPrototypeOf(target)
    while (type) {
      if (type === T.prototype) return true
      type = Object.getPrototypeOf(type)
    }

    return false
  }
}

// This should be overridden in each child class
Berry.protocol = undefined

module.exports = { Berry, BerryControl }


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * protocol.js
 *
 * Manager for token protocols are supported by Run
 */

const bsv = __webpack_require__(0)
const { Jig, JigControl } = __webpack_require__(9)
const { Berry, BerryControl } = __webpack_require__(13)
const Location = __webpack_require__(8)
const util = __webpack_require__(4)

// ------------------------------------------------------------------------------------------------
// Protocol manager
// ------------------------------------------------------------------------------------------------

// A modified version of the txo format form unwriter
// Source: https://github.com/interplanaria/txo/blob/master/index.js
var txToTxo = function (tx, options) {
  const gene = new bsv.Transaction(tx)
  const t = gene.toObject()
  const inputs = []
  const outputs = []
  if (gene.inputs) {
    gene.inputs.forEach(function (input, inputIndex) {
      if (input.script) {
        const xput = { i: inputIndex, seq: input.sequenceNumber }
        input.script.chunks.forEach(function (c, chunkIndex) {
          if (c.buf) {
            if (c.buf.byteLength >= 1000000) {
              xput['xlb' + chunkIndex] = c.buf.toString('base64')
            } else if (c.buf.byteLength >= 512 && c.buf.byteLength < 1000000) {
              xput['lb' + chunkIndex] = c.buf.toString('base64')
            } else {
              xput['b' + chunkIndex] = c.buf.toString('base64')
            }
            if (options && options.h && options.h > 0) {
              xput['h' + chunkIndex] = c.buf.toString('hex')
            }
          } else {
            if (typeof c.opcodenum !== 'undefined') {
              xput['b' + chunkIndex] = {
                op: c.opcodenum
              }
            } else {
              xput['b' + chunkIndex] = c
            }
          }
        })
        const sender = {
          h: input.prevTxId.toString('hex'),
          i: input.outputIndex
        }
        const address = input.script.toAddress(bsv.Networks.livenet).toString()
        if (address && address.length > 0) {
          sender.a = address
        }
        xput.e = sender
        inputs.push(xput)
      }
    })
  }
  if (gene.outputs) {
    gene.outputs.forEach(function (output, outputIndex) {
      if (output.script) {
        const xput = { i: outputIndex }
        output.script.chunks.forEach(function (c, chunkIndex) {
          if (c.buf) {
            if (c.buf.byteLength >= 1000000) {
              xput['xlb' + chunkIndex] = c.buf.toString('base64')
              xput['xls' + chunkIndex] = c.buf.toString('utf8')
            } else if (c.buf.byteLength >= 512 && c.buf.byteLength < 1000000) {
              xput['lb' + chunkIndex] = c.buf.toString('base64')
              xput['ls' + chunkIndex] = c.buf.toString('utf8')
            } else {
              xput['b' + chunkIndex] = c.buf.toString('base64')
              xput['s' + chunkIndex] = c.buf.toString('utf8')
            }
            if (options && options.h && options.h > 0) {
              xput['h' + chunkIndex] = c.buf.toString('hex')
            }
          } else {
            if (typeof c.opcodenum !== 'undefined') {
              xput['b' + chunkIndex] = {
                op: c.opcodenum
              }
            } else {
              xput['b' + chunkIndex] = c
            }
          }
        })
        const receiver = {
          v: output.satoshis,
          i: outputIndex
        }
        const address = output.script.toAddress(bsv.Networks.livenet).toString()
        if (address && address.length > 0) {
          receiver.a = address
        }
        xput.e = receiver
        outputs.push(xput)
      }
    })
  }
  const r = {
    tx: { h: t.hash },
    in: inputs,
    out: outputs,
    lock: t.nLockTime
  }
  // confirmations
  if (options && options.confirmations) {
    r.confirmations = options.confirmations
  }
  return r
}

class Protocol {
  static async pluckBerry (location, blockchain, code, protocol) {
    // TODO: Make fetch and pluck secure, as well as txo above
    const fetch = async x => txToTxo(await blockchain.fetch(x))
    const pluck = x => this.pluckBerry(x, blockchain, code)

    try {
      // TODO: Allow undeployed, with bad locations
      const sandboxedProtocol = code.installBerryProtocol(protocol)

      BerryControl.protocol = sandboxedProtocol
      if (Location.parse(sandboxedProtocol.location).error) {
        BerryControl.location = Location.build({ error: `${protocol.name} protocol not deployed` })
      } else {
        BerryControl.location = Location.build({ location: sandboxedProtocol.location, innerLocation: location })
      }

      const berry = await sandboxedProtocol.pluck(location, fetch, pluck)

      if (!berry) throw new Error(`Failed to load berry using ${protocol.name}: ${location}`)

      return berry
    } finally {
      BerryControl.protocol = undefined
      BerryControl.location = undefined
    }
  }

  static isToken (x) {
    switch (typeof x) {
      case 'object': return x && (x instanceof Jig || x instanceof Berry)
      case 'function': {
        if (!!x.origin && !!x.location && !!x.owner) return true
        const net = util.networkSuffix(util.activeRunInstance().blockchain.network)
        return !!x[`origin${net}`] && !!x[`location${net}`] && !!x[`owner${net}`]
      }
      default: return false
    }
  }

  static isDeployable (x) {
    if (typeof x !== 'function') return false
    return x.toString().indexOf('[native code]') === -1
  }

  static getLocation (x) {
    const location = JigControl.disableProxy(() => x.location)
    Location.parse(location)
    return location
  }

  static getOrigin (x) {
    if (x && x instanceof Berry) return Protocol.getLocation(x)
    const origin = JigControl.disableProxy(() => x.origin)
    Location.parse(origin)
    return origin
  }
}

// ------------------------------------------------------------------------------------------------
// Berry protocol plucker
// ------------------------------------------------------------------------------------------------

class BerryProtocol {
  // Static to keep stateless
  // Location is defined by the protocol
  static async pluck (location, fetch, pluck) {
    // Fetch tx
    // Parse
    // Return Berry
  }
}

// ------------------------------------------------------------------------------------------------

Protocol.BerryProtocol = BerryProtocol

module.exports = Protocol


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * index.js
 *
 * The exports for the Run library, including the main Run class
 */

const bsv = __webpack_require__(0)
const Code = __webpack_require__(55)
const Evaluator = __webpack_require__(17)
const Syncer = __webpack_require__(58)
const { Transaction } = __webpack_require__(21)
const util = __webpack_require__(4)
const { Pay, Purse } = __webpack_require__(59)
const Owner = __webpack_require__(77)
const { Blockchain, BlockchainServer } = __webpack_require__(22)
const Mockchain = __webpack_require__(78)
const { State, StateCache } = __webpack_require__(79)
const { PrivateKey } = bsv
const { Jig } = __webpack_require__(9)
const { Berry } = __webpack_require__(13)
const Protocol = __webpack_require__(14)
const Token = __webpack_require__(80)
const expect = __webpack_require__(31)
const Location = __webpack_require__(8)
const { UniqueSet, UniqueMap } = __webpack_require__(81)

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
    case 'string':
    case 'object':
    case 'undefined':
      return new Owner(owner, { network, logger, run })
    default: throw new Error(`Option 'owner' must be a valid key or address. Received: ${owner}`)
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

Run.version = typeof RUN_VERSION === 'undefined' ? __webpack_require__(20).version : RUN_VERSION
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
Run.Location = Location
Run.Mockchain = Mockchain
Run.Pay = Pay
Run.Purse = Purse
Run.State = State
Run.StateCache = StateCache

Run.Jig = Jig
Run.Berry = Berry
Run.Token = Token
Run.expect = expect
global.Jig = Jig
global.Berry = Berry
global.Token = Token

// ------------------------------------------------------------------------------------------------

module.exports = Run

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(7)))

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * The objects that are exposed from Run to our built-in sandboxes, Jig and Berry
 */
class Context {
  static get Checkpoint () { return __webpack_require__(12).Checkpoint }
  static activeRunInstance () { return __webpack_require__(4).activeRunInstance() }
  static deployable (x) { return __webpack_require__(4).deployable(x) }
  static checkOwner (x) { return __webpack_require__(4).checkOwner(x) }
  static checkSatoshis (x) { return __webpack_require__(4).checkSatoshis(x) }
  static networkSuffix (x) { return __webpack_require__(4).networkSuffix(x) }

  static deepFreeze (x) {
    // TODO: deeply freeze
    Object.freeze(x)
  }
}

module.exports = Context


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * evaluator.js
 *
 * The evaluator runs arbitrary code in a secure sandbox
 */

const ses = __webpack_require__(56)
const { getIntrinsics, intrinsicNames } = __webpack_require__(10)

// ------------------------------------------------------------------------------------------------
// Evaluator
// ------------------------------------------------------------------------------------------------

class Evaluator {
  constructor (options = {}) {
    this.sandbox = typeof options.sandbox !== 'undefined' ? options.sandbox : true
    this.logger = typeof options.logger !== 'undefined' ? options.logger : null

    // The realms-shim requires a body for sandboxing. If it doesn't exist, create one.
    if (typeof window !== 'undefined' && !window.document.body) {
      window.document.body = document.createElement('body')
    }

    this.sandboxEvaluator = new SESEvaluator()
    this.globalEvaluator = new GlobalEvaluator({ logger: this.logger })
    this.intrinsics = this.sandboxEvaluator.intrinsics
  }

  evaluate (code, env) {
    if (this.logger) this.logger.info(`Evaluating code starting with: "${code.slice(0, 20)}"`)
    const evaluator = this.willSandbox(code) ? this.sandboxEvaluator : this.globalEvaluator
    return evaluator.evaluate(code, env)
  }

  willSandbox (code) {
    if (typeof this.sandbox === 'boolean') return this.sandbox
    const nameRegex = /^(function|class)\s+([a-zA-Z0-9_$]+)/
    const match = code.match(nameRegex)
    return match ? this.sandbox.test(match[2]) : false
  }

  activate () { this.globalEvaluator.activate() }
  deactivate () { this.globalEvaluator.deactivate() }
}

// ------------------------------------------------------------------------------------------------
// SESEvaluator
// ------------------------------------------------------------------------------------------------

// Non-deterministic globals will be banned
const nonDeterministicGlobals = [
  'Date',
  'Math',
  'eval',
  'XMLHttpRequest',
  'FileReader',
  'WebSocket',
  'setTimeout',
  'setInterval'
]

/**
 * Secure sandboxer for arbitrary code
 */
class SESEvaluator {
  constructor () {
    this.realm = ses.makeSESRootRealm()

    // Keep track of common intrinsics shared between realms. The SES realm creates
    // these, and we just evaluate a list of them and store them here.
    this.intrinsics = this.realm.evaluate(`(${getIntrinsics.toString()})()`, { intrinsicNames })

    // We also overwrite console so that console.log in sandboxed code is relogged outside
    const consoleCode = 'Object.assign(...Object.entries(c).map(([k, f]) => ({ [k]: (...a) => f(...a) })))'
    this.intrinsics.console = this.realm.evaluate(consoleCode, { c: console })
  }

  evaluate (code, env = {}) {
    if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
    if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)
    if ('$globals' in env) throw new Error('Environment must not contain $globals')

    // Create the globals object in the SES realm so it doesn't expose ours
    const $globals = this.realm.evaluate('({})')

    // Disable each non-deterministic global
    env = Object.assign({}, env)
    nonDeterministicGlobals.forEach(key => {
      if (!(key in env)) env[key] = undefined
    })

    // Create the real env we'll use
    env = Object.assign({}, this.intrinsics, env, { $globals })

    // When a function is anonymous, it will be named the variable it is assigned. We give it
    // a friendly anonymous name to distinguish it from named classes and functions.
    const anon = code.startsWith('class') ? 'AnonymousClass' : 'anonymousFunction'

    // Execute the code in strict mode.
    const script = `with($globals){'use strict';const ${anon}=${code};${anon}}`
    const result = this.realm.evaluate(script, env)

    return [result, $globals]
  }
}

// ------------------------------------------------------------------------------------------------
// GlobalEvaluator
// ------------------------------------------------------------------------------------------------

/**
 * Evaluates code using dependences that are set as globals. This is quite dangerous, but we
 * only use it when sandbox=false, which is intended for testing code coverage and debugging.
 */
class GlobalEvaluator {
  constructor (options = {}) {
    this.logger = options.logger
    this.activated = true
    // We will save the prior globals before overriding them so they can be reverted.
    // This will also store our globals when we deactivate so we can re-activate them.
    this.savedGlobalDescriptors = {}
  }

  evaluate (code, env = {}) {
    if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
    if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)
    if ('$globals' in env) throw new Error('Environment must not contain $globals')

    // When a function is anonymous, it will be named the variable it is assigned. We give it
    // a friendly anonymous name to distinguish it from named classes and functions.
    const anon = code.startsWith('class') ? 'AnonymousClass' : 'anonymousFunction'

    // Set each env as a global
    const options = { configurable: true, enumerable: true, writable: true }
    Object.keys(env).forEach(key => this.setGlobalDescriptor(key, Object.assign({}, options, { value: env[key] })))

    // Turn the code into an object
    const result = eval(`const ${anon} = ${code}; ${anon}`) // eslint-disable-line

    // Wrap global sets so that we update savedGlobalDescriptors
    const wrappedGlobal = new Proxy(global, {
      set: (target, prop, value) => {
        this.setGlobalDescriptor(prop, Object.assign({}, options, { value }))
        return true
      },
      defineProperty: (target, prop, descriptor) => {
        this.setGlobalDescriptor(prop, descriptor)
        return true
      }
    })

    return [result, wrappedGlobal]
  }

  setGlobalDescriptor (key, descriptor) {
    // Save the previous global the first time we override it. Future overrides
    // will throw a warning because now there are two values at the global scope.
    const priorDescriptor = Object.getOwnPropertyDescriptor(global, key)

    if (!(key in this.savedGlobalDescriptors)) {
      this.savedGlobalDescriptors[key] = priorDescriptor
    } else if (!sameDescriptors(descriptor, priorDescriptor)) {
      if (this.logger) {
        const warning = 'There might be bugs with sandboxing disabled'
        const reason = `Two different values were set at the global scope for ${key}`
        this.logger.warn(`${warning}\n\n${reason}`)
      }
    }

    Object.defineProperty(global, key, descriptor)
  }

  activate () {
    if (this.activated) return
    this.swapSavedGlobals()
    this.activated = true
  }

  deactivate () {
    if (!this.activated) return
    this.swapSavedGlobals()
    this.activated = false
  }

  swapSavedGlobals () {
    const swappedGlobalDescriptors = {}

    Object.keys(this.savedGlobalDescriptors).forEach(key => {
      swappedGlobalDescriptors[key] = Object.getOwnPropertyDescriptor(global, key)

      if (typeof this.savedGlobalDescriptors[key] === 'undefined') {
        delete global[key]
      } else {
        Object.defineProperty(global, key, this.savedGlobalDescriptors[key])
      }
    })

    this.savedGlobalDescriptors = swappedGlobalDescriptors
  }
}

// ------------------------------------------------------------------------------------------------
// Helper methods
// ------------------------------------------------------------------------------------------------

function sameDescriptors (a, b) {
  if (typeof a !== typeof b) return false
  const aKeys = Array.from(Object.keys(a))
  const bKeys = Array.from(Object.keys(b))
  if (aKeys.length !== bKeys.length) return false
  return !aKeys.some(key => a[key] !== b[key])
}

// ------------------------------------------------------------------------------------------------

Evaluator.SESEvaluator = SESEvaluator
Evaluator.GlobalEvaluator = GlobalEvaluator
Evaluator.nonDeterministicGlobals = nonDeterministicGlobals

module.exports = Evaluator

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(7)))

/***/ }),
/* 18 */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * blockchain.js
 *
 * Tests for ../lib/blockchain.js
 */

const bsv = __webpack_require__(0)
const { describe, it, beforeEach } = __webpack_require__(2)
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, createRun, payFor, unobfuscate } = __webpack_require__(3)
const { BlockchainServer } = Run
const Blockchain = unobfuscate(Run.Blockchain)

// ------------------------------------------------------------------------------------------------
// Blockchain API tests
// ------------------------------------------------------------------------------------------------

describe('Blockchain', () => {
  it('should throw not implemented', async () => {
    const blockchain = new Blockchain()
    expect(() => blockchain.network).to.throw('Not implemented')
    await expect(blockchain.broadcast()).to.be.rejectedWith('Not implemented')
    await expect(blockchain.fetch()).to.be.rejectedWith('Not implemented')
    await expect(blockchain.utxos()).to.be.rejectedWith('Not implemented')
  })

  describe('isBlockchain', () => {
    it('should return true for valid blockchain', () => {
      const mockchain = new Run.Mockchain()
      expect(Blockchain.isBlockchain(mockchain)).to.equal(true)
      const blockchainServer = new Run.BlockchainServer()
      expect(Blockchain.isBlockchain(blockchainServer)).to.equal(true)
    })

    it('should return false for invalid blockchain', () => {
      expect(Blockchain.isBlockchain()).to.equal(false)
      expect(Blockchain.isBlockchain({})).to.equal(false)
      expect(Blockchain.isBlockchain(false)).to.equal(false)
      expect(Blockchain.isBlockchain(null)).to.equal(false)
      expect(Blockchain.isBlockchain(() => {})).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Universal blockchain API test suite
// ------------------------------------------------------------------------------------------------

function runBlockchainTestSuite (blockchain, privateKey, sampleTx,
  supportsSpentTxIdInBlocks, supportsSpentTxIdInMempool, indexingLatency, errors) {
  const address = privateKey.toAddress().toString()

  describe('broadcast', () => {
    it('should support sending to self', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
    })

    it('should throw if missing input', async () => {
      const utxos = await blockchain.utxos(address)
      const utxo = Object.assign({}, utxos[0], { vout: 999 })
      const tx = new bsv.Transaction().from(utxo).change(address).fee(250).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.missingInput)
    })

    it('should throw if no inputs', async () => {
      const tx = new bsv.Transaction().to(address, 100)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noInputs)
    })

    it('should throw if no outputs', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noOutputs)
    })

    it('should throw if fee too low', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).change(address).fee(0).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.feeTooLow)
    })

    it('should throw if not signed', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).change(address)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.notFullySigned)
    })

    it('should throw if duplicate input', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).from(utxos).change(address).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.duplicateInput)
    })
  })

  describe('fetch', () => {
    it('should get pre-existing transaction', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      expect(tx.hash).to.equal(sampleTx.txid)
    })

    it('should set time', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      expect(tx.time).not.to.equal(undefined)
      expect(tx.time > new Date('January 3, 2009')).to.equal(true)
      expect(tx.time <= Date.now()).to.equal(true)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.fetch(sampleTx.txid))
      await Promise.all(requests)
    })

    it('should throw if nonexistant', async () => {
      const bad = '0000000000000000000000000000000000000000000000000000000000000000'
      const requests = [bad, bad, bad].map(txid => blockchain.fetch(txid))
      await expect(Promise.all(requests)).to.be.rejectedWith()
    })

    it('should set spent information for transaction in mempool and unspent', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
      const tx2 = await blockchain.fetch(tx.hash)
      // check the cached copy
      expect(tx2.outputs[0].spentTxId).to.equal(null)
      expect(tx2.outputs[0].spentIndex).to.equal(null)
      expect(tx2.outputs[0].spentHeight).to.equal(null)
      // check the uncached copy
      if (blockchain instanceof BlockchainServer) {
        await sleep(indexingLatency)
        blockchain.cache.transactions.clear()
      }
      const tx3 = await blockchain.fetch(tx.hash)
      if (supportsSpentTxIdInMempool) {
        expect(tx3.outputs[0].spentTxId).to.equal(null)
        expect(tx3.outputs[0].spentIndex).to.equal(null)
        expect(tx3.outputs[0].spentHeight).to.equal(null)
      } else {
        expect(tx3.outputs[0].spentTxId).to.equal(undefined)
        expect(tx3.outputs[0].spentIndex).to.equal(undefined)
        expect(tx3.outputs[0].spentHeight).to.equal(undefined)
      }
      expect(tx3.confirmations).to.equal(0)
    })

    it('should set spent information for transaction in mempool and spent', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
      if (blockchain instanceof BlockchainServer) {
        await sleep(indexingLatency)
        blockchain.cache.transactions.clear()
      }
      const firstInput = tx.inputs[0]
      const prev = await blockchain.fetch(firstInput.prevTxId.toString('hex'))
      if (supportsSpentTxIdInMempool) {
        expect(prev.outputs[firstInput.outputIndex].spentTxId).to.equal(tx.hash)
        expect(prev.outputs[firstInput.outputIndex].spentIndex).to.equal(0)
        expect(prev.outputs[firstInput.outputIndex].spentHeight).to.equal(-1)
      } else {
        expect(prev.outputs[firstInput.outputIndex].spentTxId).to.equal(undefined)
        expect(prev.outputs[firstInput.outputIndex].spentIndex).to.equal(undefined)
        expect(prev.outputs[firstInput.outputIndex].spentHeight).to.equal(undefined)
      }
    })

    it('should set spent information for transaction in block and spent', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      for (let i = 0; i < sampleTx.vout.length; i++) {
        if (supportsSpentTxIdInBlocks) {
          expect(tx.outputs[i].spentTxId).to.equal(sampleTx.vout[i].spentTxId)
          expect(tx.outputs[i].spentIndex).to.equal(sampleTx.vout[i].spentIndex)
          expect(tx.outputs[i].spentHeight).to.equal(sampleTx.vout[i].spentHeight)
        } else {
          expect(tx.outputs[0].spentTxId).to.equal(undefined)
          expect(tx.outputs[0].spentIndex).to.equal(undefined)
          expect(tx.outputs[0].spentHeight).to.equal(undefined)
        }
      }
      expect(tx.time).to.equal(sampleTx.time)
      if (sampleTx.blockhash) {
        expect(tx.blockhash).to.equal(sampleTx.blockhash)
        expect(tx.blocktime).to.equal(sampleTx.blocktime)
        expect(tx.confirmations > sampleTx.minConfirmations).to.equal(true)
      }
    })

    it('should keep spent info when force fetch', async () => {
      const privateKey2 = new bsv.PrivateKey(privateKey.network)
      const address2 = privateKey2.toAddress()
      const tx1 = await payFor(new bsv.Transaction().to(address2, 1000).sign(privateKey), privateKey, blockchain)
      await blockchain.broadcast(tx1)
      const utxo = { txid: tx1.hash, vout: 0, script: tx1.outputs[0].script, satoshis: 1000 }
      const tx2 = (await payFor(new bsv.Transaction().from(utxo), privateKey, blockchain)).sign(privateKey2)
      await blockchain.broadcast(tx2)
      const tx1b = await blockchain.fetch(tx1.hash, true)
      expect(tx1b.outputs[0].spentTxId).to.equal(tx1.outputs[0].spentTxId)
      expect(tx1b.outputs[0].spentIndex).to.equal(tx1.outputs[0].spentIndex)
      expect(tx1b.outputs[0].spentHeight).to.equal(tx1.outputs[0].spentHeight)
    })
  })

  describe('utxos', () => {
    it('should return utxos', async () => {
      const utxos = await blockchain.utxos(address)
      expect(utxos.length > 0).to.equal(true)
      expect(utxos[0].txid).not.to.equal(undefined)
      expect(utxos[0].vout).not.to.equal(undefined)
      expect(utxos[0].script).not.to.equal(undefined)
      expect(utxos[0].satoshis).not.to.equal(undefined)
    })

    it('should return empty list if no utxos', async () => {
      const address = new bsv.PrivateKey(privateKey.network).toAddress()
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(0)
    })

    it('should not return spent outputs', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      const utxos = await blockchain.utxos(address)
      expect(utxos.some(utxo => utxo.txid === tx.inputs[0].prevTxId.toString() &&
        utxo.vout === tx.inputs[0].outputIndex)).to.equal(false)
      expect(utxos.some(utxo => utxo.txid === tx.hash && utxo.vout === 0)).to.equal(true)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.utxos(address))
      await Promise.all(requests)
    })

    it('should throw for invalid address', async () => {
      const requests = ['123', '123', '123'].map(addr => blockchain.utxos(addr))
      await expect(Promise.all(requests)).to.be.rejectedWith()
    })
  })
}

// ------------------------------------------------------------------------------------------------
// Blockchain tests
// ------------------------------------------------------------------------------------------------

describe('Blockchain', () => {
  describe('constructor', () => {
    it('should return mainnet blockchain for main network', () => {
      expect(createRun({ network: 'main' }).blockchain).not.to.equal(undefined)
    })

    it('should return testnet blockchain for test network', () => {
      expect(createRun({ network: 'test' }).blockchain).not.to.equal(undefined)
    })

    it('should return scaling blockchain for stn network', () => {
      expect(createRun({ network: 'stn' }).blockchain).not.to.equal(undefined)
    })

    it('should return mock blockchain for mock network', () => {
      expect(createRun({ network: 'mock' }).blockchain).not.to.equal(undefined)
    })

    it('should throw for bad network', () => {
      expect(() => createRun({ network: 'bitcoin' })).to.throw()
    })
  })
})

// ------------------------------------------------------------------------------------------------
// BlockchainServer tests
// ------------------------------------------------------------------------------------------------

describe('BlockchainServer', () => {
  describe('constructor', () => {
    describe('network', () => {
      it('should default network to main', () => {
        expect(new BlockchainServer().network).to.equal('main')
      })

      it('should throw for bad network', () => {
        expect(() => new BlockchainServer({ network: 'bad' })).to.throw('Unknown network: bad')
        expect(() => new BlockchainServer({ network: 0 })).to.throw('Invalid network: 0')
        expect(() => new BlockchainServer({ network: {} })).to.throw('Invalid network: [object Object]')
        expect(() => new BlockchainServer({ network: null })).to.throw('Invalid network: null')
      })
    })

    describe('logger', () => {
      it('should support null loggers', () => {
        expect(new BlockchainServer({ logger: null }).logger).to.equal(null)
      })

      it('should throw for bad logger', () => {
        expect(() => new BlockchainServer({ logger: 'bad' })).to.throw('Invalid logger: bad')
        expect(() => new BlockchainServer({ logger: false })).to.throw('Invalid logger: false')
      })
    })

    describe('api', () => {
      it('should default to star api', () => {
        expect(unobfuscate(new BlockchainServer()).api.name).to.equal('star')
      })

      it('should throw for bad api', () => {
        expect(() => new BlockchainServer({ api: 'bad' })).to.throw('Unknown blockchain API: bad')
        expect(() => new BlockchainServer({ api: null })).to.throw('Invalid blockchain API: null')
        expect(() => new BlockchainServer({ api: 123 })).to.throw('Invalid blockchain API: 123')
      })
    })

    describe('lastBlockchain', () => {
      it('should support passing different last blockchain', () => {
        const lastBlockchain = { cache: {} }
        expect(new BlockchainServer({ lastBlockchain }).cache).not.to.equal(lastBlockchain.cache)
      })

      it('should only copy cache if same network', async () => {
        const testnet1 = new BlockchainServer({ network: 'test' })
        // Fill the cache with one transaction
        await testnet1.fetch('d89f6bfb9f4373212ed18b9da5f45426d50a4676a4a684c002a4e838618cf3ee')
        const testnet2 = new BlockchainServer({ network: 'test', lastBlockchain: testnet1 })
        const mainnet = new BlockchainServer({ network: 'main', lastBlockchain: testnet2 })
        expect(testnet2.cache).to.deep.equal(testnet1.cache)
        expect(mainnet.cache).not.to.equal(testnet2.cache)
      })
    })

    describe('timeout', () => {
      it('should support custom timeouts', () => {
        expect(new BlockchainServer({ timeout: 3333 }).axios.defaults.timeout).to.equal(3333)
      })

      it('should default timeout to 10000', () => {
        expect(new BlockchainServer().axios.defaults.timeout).to.equal(10000)
      })

      it('should throw for bad timeout', () => {
        expect(() => new BlockchainServer({ timeout: 'bad' })).to.throw('Invalid timeout: bad')
        expect(() => new BlockchainServer({ timeout: null })).to.throw('Invalid timeout: null')
        expect(() => new BlockchainServer({ timeout: -1 })).to.throw('Invalid timeout: -1')
        expect(() => new BlockchainServer({ timeout: NaN })).to.throw('Invalid timeout: NaN')
      })
    })
  })

  describe('utxos', () => {
    it('should correct for server returning duplicates', async () => {
      const address = bsv.PrivateKey('mainnet').toAddress().toString()
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      const api = unobfuscate({ })
      api.utxosUrl = (network, address) => 'https://api.run.network/v1/main/status'
      api.utxosResp = (data, address) => {
        const utxo = { txid, vout: 0, satoshis: 0, script: new bsv.Script() }
        return [utxo, utxo]
      }
      function warn (warning) { this.lastWarning = warning }
      const logger = { warn, info: () => {} }
      const blockchain = new BlockchainServer({ network: 'main', api, logger })
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(1)
      expect(logger.lastWarning).to.equal(`Duplicate utxo returned from server: ${txid}_o0`)
    }).timeout(30000)

    it('should throw if API is down', async () => {
      const api = unobfuscate({ })
      api.utxosUrl = (network, address) => 'bad-url'
      const blockchain = new BlockchainServer({ network: 'main', api })
      const address = bsv.PrivateKey('mainnet').toAddress().toString()
      const requests = [blockchain.utxos(address), blockchain.utxos(address)]
      await expect(Promise.all(requests)).to.be.rejected
    })
  })
})

// ------------------------------------------------------------------------------------------------
// BlockchainServerCache tests
// ------------------------------------------------------------------------------------------------

describe('BlockchainServerCache', () => {
  describe('get', () => {
    it('should not return expired transactions', async () => {
      const cache = unobfuscate(new BlockchainServer.Cache())
      cache.expiration = 1
      const tx = new bsv.Transaction()
      cache.fetched(tx)
      const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }
      await sleep(10)
      expect(cache.get(tx.hash)).not.to.equal(tx)
    })
  })

  describe('fetched', () => {
    it('should flush oldest transcation when full', () => {
      const cache = unobfuscate(new BlockchainServer.Cache({ size: 1 }))
      cache.size = 1
      const tx1 = new bsv.Transaction().addData('1')
      const tx2 = new bsv.Transaction().addData('2')
      cache.fetched(tx1)
      cache.fetched(tx2)
      expect(cache.transactions.size).to.equal(1)
      expect(cache.transactions.get(tx2.hash)).to.equal(tx2)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// API tests
// ------------------------------------------------------------------------------------------------

// sample transactions with spent outputs in mined blocks on each network
const sampleTransactions = {
  main: {
    txid: 'afc557ef2970af0b5fb8bc1a70a320af425c7a45ca5d40eac78475109563c5f8',
    blockhash: '000000000000000005609907e3092b92882c522fffb0705c73e91ddc3a6941ed',
    blocktime: 1556620117,
    time: 1556620117000,
    minConfirmations: 15000,
    vout: [{
      spentTxId: '26fb663eeb8d3cd407276b045a8d71da9f625ef3dca66f51cb047d97a8cad3a6',
      spentIndex: 0,
      spentHeight: 580333
    }]
  },
  test: {
    txid: 'acf2d978febb09e3a0d5817f180b19df675a0e95f75a2a1efeec739ebff865a7',
    blockhash: '00000000000001ffaf368388b7ac954a562bd76fe39f6e114b171655273a38a7',
    blocktime: 1556695666,
    time: 1556695666000,
    minConfirmations: 18000,
    vout: [{
      spentTxId: '806444d15f416477b00b6bbd937c02ff3c8f8c5e09dae28425c87a8a0ef58af0',
      spentIndex: 0,
      spentHeight: 1298618
    }]
  },
  stn: {
    txid: 'a40ee613c5982d6b39d2425368eb2375f49b38a45b457bd72db4ec666d96d4c6'
  }
}

const errors = {
  noInputs: 'tx has no inputs',
  noOutputs: 'tx has no outputs',
  feeTooLow: 'tx fee too low',
  notFullySigned: 'tx not fully signed',
  duplicateInput: /transaction input [0-9]* duplicate input/,
  missingInput: 'Missing inputs'
}

const apis = { Star: 'star', BitIndex: 'bitindex', WhatsOnChain: 'whatsonchain' }
const networks = ['main', 'test']
const supportsSpentTxIdInBlocks = { Star: true, BitIndex: true, WhatsOnChain: false }
const supportsSpentTxIdInMempool = { Star: true, BitIndex: true, WhatsOnChain: false }

// Iterate networks first, then APIs, so that we can reuse the caches when possible
networks.forEach(network => {
  Object.keys(apis).forEach(api => {
    describe(`${api} (${network})`, function () {
      const run = createRun({ network, blockchain: apis[api] })
      beforeEach(() => run.activate())
      this.timeout(30000)
      runBlockchainTestSuite(run.blockchain, run.purse.bsvPrivateKey,
        sampleTransactions[network], supportsSpentTxIdInBlocks[api],
        supportsSpentTxIdInMempool[api], 1000 /* indexingLatency */, errors)
    })
  })
})

// ------------------------------------------------------------------------------------------------

module.exports = runBlockchainTestSuite


/***/ }),
/* 20 */
/***/ (function(module) {

module.exports = JSON.parse("{\"name\":\"run\",\"repository\":\"git://github.com/runonbitcoin/run.git\",\"version\":\"0.4.2\",\"description\":\"Run JavaScript library\",\"main\":\"lib/index.js\",\"scripts\":{\"lint\":\"standard --fix\",\"build\":\"webpack\",\"test\":\"npm run build && TEST_MODE=dist mocha\",\"test:dev\":\"npm run lint && TEST_MODE=lib mocha\",\"test:cover\":\"TEST_MODE=cover nyc mocha\",\"test:browser\":\"npm run build && mocha-headless-chrome -f ./test/browser.html -t 600000\"},\"standard\":{\"globals\":[\"RUN_VERSION\",\"TEST_MODE\"],\"ignore\":[\"dist/**\",\"examples/**\"]},\"nyc\":{\"exclude\":[\"**/intrinsics.js\",\"**/test/**/*.js\"]},\"dependencies\":{\"axios\":\"0.19.0\",\"bsv\":\"1.2.0\",\"ses\":\"github:runonbitcoin/ses\",\"terser-webpack-plugin\":\"2.3.1\",\"webpack\":\"4.41.5\",\"webpack-cli\":\"3.3.10\"},\"devDependencies\":{\"chai\":\"^4.2.0\",\"chai-as-promised\":\"^7.1.1\",\"mocha\":\"^6.2.2\",\"mocha-headless-chrome\":\"^2.0.3\",\"nyc\":\"^15.0.0\",\"standard\":\"^14.3.1\"}}");

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(Buffer) {/**
 * transaction.js
 *
 * Transaction API for inspecting and building bitcoin transactions
 */

const bsv = __webpack_require__(0)
const util = __webpack_require__(4)
const { JigControl } = __webpack_require__(9)
const { Berry } = __webpack_require__(13)
const Location = __webpack_require__(8)
const Protocol = __webpack_require__(14)
const Xray = __webpack_require__(12)

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

/**
 * The main transaction API used by run
 */
class Transaction {
  constructor (run) {
    this.run = run
    this.syncer = run.syncer
    this.blockchain = run.blockchain
    this.state = run.state
    this.owner = run.owner.pubkey ? run.owner.pubkey : null
    this.code = run.code
    this.protoTx = new ProtoTransaction(this.onReadyForPublish.bind(this)) // current proto-transaction
  }

  begin () { this.protoTx.begin(); return this.run }

  end () { this.protoTx.end(); return this.run }

  onReadyForPublish () {
    this.syncer.publish(this.protoTx)
    this.protoTx = new ProtoTransaction(this.onReadyForPublish.bind(this))
  }

  export () {
    if (this.syncer.queued.length > 0) {
      // TODO: Only have to check if referenced jigs are in the queue
      throw new Error('must not have any queued transactions before exporting')
    }

    if (this.protoTx.beginCount === 0) {
      const suggestion = 'Hint: A transaction must first be created using begin() or loaded using import().'
      throw new Error(`No transaction in progress\n\n${suggestion}`)
    }

    return this.protoTx.buildBsvTransaction(this.run).tx
  }

  import (tx) { return this.protoTx.import(tx, this.run, false) }

  rollback () { this.protoTx.rollback(this.syncer.lastPosted, this.run, false, 'intentional rollback') }

  async sign () { await this.protoTx.sign(this.run) }

  async pay () { await this.protoTx.pay(this.run) }

  // get inputs () {
  // TODO: filtering by inputs is broken
  // return this.protoTx.inputs
  // .filter(input => input.origin !== '_')
  // .map(input => this.protoTx.proxies.get(input))
  // }

  // get outputs () {
  // return this.protoTx.outputs.map(output => this.protoTx.proxies.get(output))
  // }

  get actions () {
    return this.protoTx.actions.map(action => {
      return {
        target: this.protoTx.proxies.get(action.target),
        method: action.method,
        args: action.args
      }
    })
  }

  storeCode (type, sandbox, deps, props, success, error) {
    return this.protoTx.storeCode(type, sandbox, deps, props, success, error,
      this.owner, this.code, this.run)
  }

  storeAction (target, method, args, inputs, outputs, reads, before, after, proxies, run) {
    this.protoTx.storeAction(target, method, args, inputs, outputs, reads, before, after, proxies, this.run)
  }

  /**
   * Loads a jig or class at a particular location
   *
   * location is a string
   *
   * cachedRefs stores a map from locations to jigs/classes loaded by load()
   * from the state cache. load() will trigger additional loads recursively.
   * both jigs and classes may have references to other jigs and other classes,
   * and we don't want to load these multiple times. especially when they refer
   * to each other cyclically as that could cause infinite loops.
   */
  async load (location, options = {}) {
    if (this.run.logger) this.run.logger.info('Loading', location)

    // If there's a custom protocol, use it
    if (options.protocol) {
      return Protocol.pluckBerry(location, this.blockchain, this.code, options.protocol)
    }

    // Either load a run token, or a berry, depending on if there's a protocol in location
    const loc = Location.parse(location)

    if (!loc.innerLocation) {
      return this.loadRunToken(location, options)
    } else {
      const protocol = await this.load(loc.location, options)
      return Protocol.pluckBerry(loc.innerLocation, this.blockchain, this.code, protocol)
    }
  }

  async loadRunToken (location, options = {}) {
    const cachedRefs = options.cachedRefs || new Map()

    // --------------------------------------------------------------------------------------------
    // CHECK THE CACHE
    // --------------------------------------------------------------------------------------------

    // check the code cache so we only have to download code once
    const cachedCode = this.code.getInstalled(location)
    if (cachedCode) return cachedCode

    if (options.partiallyInstalledCode && options.partiallyInstalledCode.has(location)) {
      return options.partiallyInstalledCode.get(location)
    }

    const loc = Location.parse(location)
    if (loc.error || loc.innerLocation || loc.vref || loc.tempTxid) throw new Error(`Bad location: ${location}`)
    const { txid, vout, vin } = loc

    // TODO: do we want to support loading locations with inputs?
    // The transaction test "update class property jig in initializer" uses this
    if (typeof vin !== 'undefined') {
      const tx = await this.blockchain.fetch(txid)
      const prevTxId = tx.inputs[vin].prevTxId.toString('hex')
      return this.load(`${prevTxId}_o${tx.inputs[vin].outputIndex}`, { cachedRefs })
    }

    // check the state cache so we only have to load each jig once
    const cachedState = await this.state.get(location)
    if (cachedState) {
      // Make sure the cached state is valid
      if (typeof cachedState.type !== 'string' || typeof cachedState.state !== 'object') {
        const hint = 'Hint: Could the state cache be corrupted?'
        throw new Error(`Cached state is missing a valid type and/or state property\n\n${JSON.stringify(cachedState)}\n\n${hint}`)
      }

      // Deserialize from a cached state, first by finding all inner tokens and loading them,
      // and then deserializing
      const fullLocation = loc => (loc.startsWith('_') ? `${location.slice(0, 64)}${loc}` : loc)
      const tokenLoader = ref => cachedRefs.get(fullLocation(ref))

      const xray = new Xray()
        .allowTokens()
        .useIntrinsics(this.run.code.intrinsics)
        .useTokenLoader(tokenLoader)

      try {
        JigControl.blankSlate = true

        // Create the new instance as a blank slate
        const typeLocation = cachedState.type.startsWith('_') ? location.slice(0, 64) + cachedState.type : cachedState.type
        const T = await this.load(typeLocation)
        const instance = new T()
        cachedRefs.set(location, instance)

        // Load all dependencies
        xray.scan(cachedState.state)
        for (const ref of xray.refs) {
          const fullLoc = fullLocation(ref)
          if (cachedRefs.has(fullLoc)) continue
          const token = await this.load(fullLoc, { cachedRefs })
          if (!cachedRefs.has(fullLoc)) cachedRefs.set(fullLoc, token)
        }

        // Deserialize and inject our state
        JigControl.disableProxy(() => {
          Object.assign(instance, xray.deserialize(cachedState.state))
          instance.origin = instance.origin || location
          instance.location = instance.location || location
        })

        return instance
      } finally { JigControl.blankSlate = false }
    }

    // --------------------------------------------------------------------------------------------
    // LOAD THE TRANSACTION, AND THEN THE JIGS OR CODE
    // --------------------------------------------------------------------------------------------

    // load all the jigs for this transaction, and return the selected
    const protoTx = new ProtoTransaction()
    const tx = await this.blockchain.fetch(txid)
    await protoTx.import(tx, this.run, null, true, vout, options.partiallyInstalledCode)

    // if a definition, install
    if (vout > 0 && vout < protoTx.code.length + 1) {
      return this.code.getInstalled(location) || options.partiallyInstalledCode.get(location)
    }

    // otherwise, a jig. get the jig.
    const proxies = protoTx.outputs.map(o => protoTx.proxies.get(o))
    const jigProxies = new Array(1 + protoTx.code.length).concat(proxies)
    // TODO: Notify shruggr if these error message change
    if (typeof jigProxies[vout] === 'undefined') throw new Error('not a jig output')
    return jigProxies[vout]
  }

  setProtoTxAndCreator (protoTx, creator) {
    const old = { protoTx: this.protoTx, creator: this.owner }
    this.protoTx = protoTx
    this.owner = creator
    return old
  }
}

// ------------------------------------------------------------------------------------------------
// ProtoTransaction
// ------------------------------------------------------------------------------------------------

/**
 * Proto-transaction: A temporary structure Run uses to build transactions. This structure
 * has every action and definition that will go into the real transaction, but stored using
 * references to the actual objects instead of location strings. Run turns the proto-transaction
 * into a real transaction by converting all references into location strings. This is necessary
 * when there are queued proto-transactions and the locations may not be known yet.
 */
class ProtoTransaction {
  constructor (onReadyForPublish) {
    this.onReadyForPublish = onReadyForPublish
    this.reset()
  }

  reset () {
    this.code = [] // Code definitions as types
    this.actions = [] // Jig updates

    this.before = new Map() // state of all updated jigs before (Target->{json,refs})
    this.after = new Map() // state of all updated jigs after (Target->{json,refs})

    this.inputs = [] // Targets spent (which may not be tx inputs if created within a batch)
    this.outputs = [] // Targets outputted
    this.reads = new Set() // All targets read
    this.proxies = new Map() // Target->Proxy
    this.locations = new Map() // Prior location for jigs (Origin->Location)

    this.beginCount = 0 // begin() depth, that is decremented for each end()
    this.imported = false
  }

  async import (tx, run, preexistingJig, immutable, vout, cache) {
    if (this.code.length || this.code.actions || this.beginCount) {
      throw new Error('transaction already in progress. cannot import.')
    }

    for (let i = 0; i < tx.inputs.length; i++) {
      const input = tx.inputs[i]
      if (!input.output) {
        const prevTx = await run.blockchain.fetch(input.prevTxId.toString('hex'))
        const output = prevTx.outputs[input.outputIndex]
        if (output.script.isPublicKeyHashOut()) {
          input.output = prevTx.outputs[input.outputIndex]
          Reflect.setPrototypeOf(input, bsv.Transaction.Input.PublicKeyHash.prototype)
        } else throw new Error(`Unsupported script type at input ${i}`)
      }
    }

    this.beginCount = 1
    this.imported = true

    const data = util.extractRunData(tx)
    const bsvNetwork = util.bsvNetwork(run.blockchain.network)

    // install all code definitions first
    // TODO: should we be installing this now, or after import is done? need actions list...
    // TODO: Load should not be triggering other loads like this does. This makes it
    // harder parallelize safely. We need some atomicity, which could be a protoTx loading
    // for a tx.
    let index = 1
    for (const def of data.code) {
      const location = `${tx.hash}_o${index++}`
      await run.code.installFromTx(def, location, tx, run, bsvNetwork, cache)
    }

    if (vout && vout > 0 && vout < 1 + data.code.length) {
      // TODO: Fix this hack ... to just make the early out code work
      this.code = new Array(data.code.length)
      return
    }

    // load jig and class references used in args and reads
    const refs = new Map()
    if (data.refs) data.refs.forEach(ref => refs.set(ref, ref))

    const xray = new Xray()
      .allowTokens()
      .useIntrinsics(run.code.intrinsics)

    for (const action of data.actions) {
      const addRef = id => {
        if (id[0] !== '_') { refs.set(id, id) }
        if (id[1] === 'i') {
          const txin = tx.inputs[parseInt(id.slice(2))]
          refs.set(id, `${txin.prevTxId.toString('hex')}_o${txin.outputIndex}`)
        }
      }

      if (action.target && action.method !== 'init') addRef(action.target)

      xray.scan(action.args)
      xray.refs.forEach(ref => addRef(ref))
    }

    // make sure all of the refs we read are recent
    for (const [, value] of refs) {
      const refTx = await run.blockchain.fetch(value.slice(0, 64))
      const vout = parseInt(value.slice(66))
      if (typeof refTx.outputs[vout].spentTxId === 'undefined') {
        throw new Error('Cannot check if read is stale. Blockchain API does not support spentTxId.')
      }
      if (refTx.outputs[vout].spentTxId === null) continue
      const spentTx = await run.blockchain.fetch(refTx.outputs[vout].spentTxId)
      if (spentTx.time <= tx.time && spentTx.time >= refTx.time &&
        (tx.time - refTx.time) > 2 * 60 * 60 * 1000 && tx.hash !== spentTx.hash) {
        throw new Error(`${value} is stale. Aborting.`)
      }
    }

    // load the refs
    // TODO: make sure the target is recent when saved
    // TODO: would be better to do in parallel if possible...but Code is duplicated sometimes (why?)
    for (const [refId, refLocation] of refs) {
      if (preexistingJig && refLocation === preexistingJig.location) {
        refs.set(refId, preexistingJig)
      } else {
        try {
          refs.set(refId, await run.transaction.load(refLocation))
        } catch (e) {
          run.logger.error(e)
          throw new Error(`Error loading ref ${refId} at ${refLocation}\n\n${e}`)
        }
      }
    }

    if (preexistingJig) {
      refs.set(preexistingJig.location, preexistingJig)
    }

    /*
    // Also load all inputs to spend (do we need to do this? These dedups?
    for (let vin = 0; vin < tx.inputs.length; vin++) {
      const input = tx.inputs[vin]
      try {
        const location = `${input.prevTxId.toString('hex')}_o${input.outputIndex}`
        if (preexistingJig && location === preexistingJig.location) {
          refs.set()
        }
        const refId = `_i${vin}`
        const jig = await run.transaction.load(location)
        refs.set(refId, jig)
      } catch (e) { }
    }
    */

    // dedupInnerRefs puts any internal objects in their referenced states using known references
    // ensuring that double-references refer to the same objects
    const dedupInnerRefs = jig => {
      const { Jig } = __webpack_require__(15)

      const tokenReplacer = token => {
        if (token instanceof Jig && token !== jig) {
          return Array.from(refs.values()).find(ref => ref.origin === token.origin)
        }
      }

      const xray = new Xray()
        .allowTokens()
        .deeplyScanTokens()
        .useTokenReplacer(tokenReplacer)
        .useIntrinsics(run.code.intrinsics)

      JigControl.disableProxy(() => xray.scan(jig))
    }

    // update the refs themselves with themselves
    for (const ref of refs.values()) dedupInnerRefs(ref)

    for (const action of data.actions) {
      // Deserialize the arguments
      const args = JigControl.disableProxy(() => {
        const tokenLoader = ref => {
          if (ref[0] !== '_' || ref[1] === 'i') {
            const token = refs.get(ref)
            if (!token) throw new Error(`Unexpected ref ${ref}`)
            return token
          }
          if (ref[1] === 'r') {
            const token = refs.get(data.refs[parseInt(ref.slice(2))])
            if (!token) throw new Error(`Unexpected ref ${ref}`)
            return token
          }
          if (ref[1] !== 'o') throw new Error(`Unexpected ref ${ref}`)
          const n = parseInt(ref.slice(2)) - 1 - data.code.length
          return this.proxies.get(this.outputs[n])
        }

        const xray = new Xray()
          .allowTokens()
          .useTokenLoader(tokenLoader)
          .useIntrinsics(run.code.intrinsics)

        return xray.deserialize(action.args)
      })

      if (action.method === 'init') {
        if (action.target[0] === '_') {
          const vout = parseInt(action.target.slice(2))
          if (vout <= 0 || vout >= data.code.length + 1) throw new Error(`missing target ${action.target}`)
        }

        const loc = action.target[0] === '_' ? tx.hash + action.target : action.target
        const T = await run.transaction.load(loc)

        const oldSettings = run.transaction.setProtoTxAndCreator(this, action.creator)

        try {
          new T(...args)  // eslint-disable-line
        } finally {
          run.transaction.setProtoTxAndCreator(oldSettings.protoTx, oldSettings.creator)
        }
      } else {
        const subject = refs.get(action.target) ||
          this.proxies.get(this.outputs[parseInt(action.target.slice(2)) - 1 - data.code.length])
        dedupInnerRefs(subject)
        if (typeof subject === 'undefined') throw new Error(`target ${action.target} missing`)

        const oldSettings = run.transaction.setProtoTxAndCreator(this, null)

        try {
          subject[action.method](...args)
        } catch (e) {
          throw new Error(`unexpected exception in ${action.method}\n\n${e}`)
        } finally {
          run.transaction.setProtoTxAndCreator(oldSettings.protoTx, oldSettings.creator)
        }
      }
    }

    // TODO: use buildBsvTransaction here to compare?

    const spentJigs = this.inputs.filter(i => i.origin[0] !== '_')
    if (data.jigs !== this.outputs.length) throw new Error('bad number of jigs')
    if (tx.inputs.length < spentJigs.length) throw new Error('not enough inputs')
    if (tx.outputs.length < data.code.length + data.jigs + 1) throw new Error('not enough outputs')
    spentJigs.forEach((i, n) => {
      const location = `${tx.inputs[n].prevTxId.toString('hex')}_o${tx.inputs[n].outputIndex}`
      const location2 = this.locations.get(i.origin) || i.location
      if (location !== location2) throw new Error(`bad input ${n}`)
    })
    this.outputs.forEach((o, n) => {
      const index = 1 + data.code.length + n
      const addr = new bsv.PublicKey(o.owner, { network: bsvNetwork }).toAddress().toString()
      const addr2 = tx.outputs[index].script.toAddress(bsvNetwork).toString()
      if (addr !== addr2) throw new Error(`bad owner on output ${index}`)
      if (tx.outputs[index].satoshis < Math.max(o.satoshis, bsv.Transaction.DUST_AMOUNT)) {
        throw new Error(`bad satoshis on output ${index}`)
      }
    })

    if (immutable) {
      this.outputs.forEach(o => {
        const oid = `${tx.hash}_o${1 + data.code.length + parseInt(o.location.slice(2))}`
        if (o.origin[0] === '_') o.origin = oid
        if (o.location[0] === '_') o.location = oid
      })
    }

    // cache all of the loaded jigs
    const proxies = this.outputs.map(o => this.proxies.get(o))
    const jigProxies = new Array(1 + data.code.length).concat(proxies)
    const net = util.networkSuffix(run.blockchain.network)
    for (let vout = 0; vout < jigProxies.length; vout++) {
      if (!jigProxies[vout]) continue
      const jigLocation = `${tx.hash.slice(0, 64)}_o${vout}`

      // Serialize the state of the jig into a local reference form
      const serialized = JigControl.disableProxy(() => {
        const tokenSaver = token =>
          token.location.startsWith(tx.hash) ? token.location.slice(64) : token.location

        const xray = new Xray()
          .allowTokens()
          .useIntrinsics(run.code.intrinsics)
          .useTokenSaver(tokenSaver)

        const obj = Object.assign({}, jigProxies[vout])

        if (obj.origin.startsWith(tx.hash) || obj.origin.startsWith('_')) delete obj.origin
        if (obj.location.startsWith(tx.hash) || obj.location.startsWith('_')) delete obj.location

        return xray.serialize(obj)
      })

      let type = jigProxies[vout].constructor[`origin${net}`]
      if (type.startsWith(tx.hash)) type = type.slice(64)

      const cachedState = { type, state: serialized }
      await run.state.set(jigLocation, cachedState)
    }

    // clear the code, and load it directly from the transaction
    this.code = []
    data.code.forEach((code, index) => {
      const location = `${tx.hash}_o${index + 1}`
      const type = run.code.getInstalled(location)
      this.storeCode(type, type, {}, run.code.extractProps(type).props, () => {}, () => {}, code.owner, run.code, run)
    })

    const spentLocations = spentJigs.map(jig => this.locations.get(jig.origin) || jig.location)
    this.cachedTx = { tx, refs: data.refs || [], spentJigs, spentLocations }
  }

  begin () { this.beginCount++ }

  end () {
    if (this.beginCount === 0) throw new Error('end transaction without begin')
    if (--this.beginCount === 0 && this.onReadyForPublish && (this.code.length || this.actions.length)) {
      this.onReadyForPublish()
    }
  }

  rollback (lastPosted, run, error, unhandled) {
    delete this.cachedTx

    // notify the definition. this will undo the location/origin to allow a retry.
    this.code.forEach(def => def.error())

    // notify the owner. this may remove it from its list.
    this.code.forEach(def => run.owner._update(def.sandbox))

    // revert the state of each jig
    this.outputs.forEach(jig => {
      // if the jig was never deployed, or if there was an unhandled error leading to this
      // rollback, then make this jig permanently unusable by setting a bad origin.
      if (jig.origin[0] === '_' || unhandled) {
        const err = `!${jig.origin[0] === '_' ? 'Deploy failed'
          : 'A previous update failed'}\n\n${error.stack}`
        // TODO: log the error here
        Object.keys(jig).forEach(key => delete jig[key])
        jig.origin = jig.location = err
        return
      }

      // if this jig was already reverted, continue
      if (jig.location[0] !== '_') return

      // revert the state of the jig to its state before this transaction
      const origin = jig.origin
      this.before.get(jig).restoreInPlace()
      jig.origin = origin
      jig.location = lastPosted.get(origin)

      // TODO: Deserialize saved state
    })

    // notify the owner of jig rollbacks
    this.outputs.forEach(jig => run.owner._update(this.proxies.get(jig)))

    this.reset()
  }

  storeCode (type, sandbox, deps, props, success, error, owner, code, run) {
    delete this.cachedTx

    this.begin()
    try {
      this.code.push({ type, sandbox, deps, props, success, error, owner })
      const tempLocation = `_d${this.code.length - 1}`
      type.owner = sandbox.owner = owner
      run.owner._update(code.getInstalled(type))
      return tempLocation
    } finally { this.end() }
  }

  storeAction (target, method, args, inputs, outputs, reads, before, after, proxies, run) {
    delete this.cachedTx

    this.begin()

    try {
      // ------------------------------------------------------------------------------------------
      // CHECK FOR MULTIPLE DIFFERENT JIG REFERENCES
      // ------------------------------------------------------------------------------------------

      // This doesn't cover the case of undeployed locations. We must run this again in publish.
      // Also, inner references that aren't read aren't checked, but this isn't a problem because
      // the user can 'sync' these up to their latest state before they read them in the future.

      const jigLocations = new Map()

      const checkJigInstance = jig => {
        const deployed = jig => typeof jig.origin !== 'undefined' && jig.origin[0] !== '_'
        const prevLocation = jigLocations.get(deployed(jig) ? jig.origin : jig)
        if (!prevLocation) return jigLocations.set(deployed(jig) ? jig.origin : jig, jig.location)
        if (prevLocation !== jig.location) throw new Error(`referenced different locations of same jig: ${jig}`)
      }

      checkJigInstance(target)
      inputs.forEach(jig => checkJigInstance(jig))
      outputs.forEach(jig => checkJigInstance(jig))
      reads.forEach(jig => checkJigInstance(jig))

      // ------------------------------------------------------------------------------------------
      // STORE NEW BEFORE STATES AND ALL AFTER STATES FOR JIGS IN THE PROTO TRANSACTION
      // ------------------------------------------------------------------------------------------

      before.forEach((checkpoint, target) => {
        this.before.set(target, this.before.get(target) || checkpoint)
      })

      after.forEach((checkpoint, target) => { this.after.set(target, checkpoint) })

      // ------------------------------------------------------------------------------------------
      // ADD INPUTS TO THE PROTO TRANSACTION
      // ------------------------------------------------------------------------------------------

      inputs.forEach(newTarget => {
        const isDifferentInstance = currTarget => util.sameJig(newTarget, currTarget) &&
          currTarget.location !== newTarget.location
        if (this.inputs.some(isDifferentInstance)) {
          throw new Error('different instances of the same jig')
        }

        if (!this.inputs.some(currTarget => util.sameJig(newTarget, currTarget))) {
          this.inputs.push(newTarget)
        }
      })

      // ------------------------------------------------------------------------------------------
      // ADD OUTPUTS TO THE PROTO TRANSACTION AND SET TEMP LOCATIONS
      // ------------------------------------------------------------------------------------------

      outputs.forEach(jig => {
        const index = this.outputs.findIndex(previousJig => util.sameJig(jig, previousJig))

        if (index !== -1) {
          jig.location = `_o${index}`
          jig.origin = jig.origin || jig.location
          return
        }

        this.outputs.push(jig)

        const updating = jig => (jig.origin && jig.origin[0] !== '_' && jig.location &&
          jig.location[0] !== '_' && !this.locations.has(jig.origin))

        if (updating(jig)) this.locations.set(jig.origin, jig.location)

        jig.location = `_o${this.outputs.length - 1}`
        jig.origin = jig.origin || jig.location
      })

      // ------------------------------------------------------------------------------------------
      // REMEMBER READS AND PROXIES FOR LATER
      // ------------------------------------------------------------------------------------------

      reads.forEach(proxy => this.reads.add(proxy))

      proxies.forEach((v, k) => this.proxies.set(k, v))

      // ------------------------------------------------------------------------------------------
      // STORE THE ACTION IN THE PROTO TRANSACTION
      // ------------------------------------------------------------------------------------------

      const creator = before.get(target).restore().owner

      this.actions.push({ target, method, creator, args, inputs, outputs, reads })
    } finally { this.end() }

    // Notify the owner of each output they may care about
    outputs.forEach(target => run.owner._update(proxies.get(target)))
  }

  async pay (run) {
    if (!this.cachedTx) this.buildBsvTransaction(run)
    return run.purse.pay(this.cachedTx.tx)
  }

  async sign (run) {
    if (!this.cachedTx) this.buildBsvTransaction(run)
    return run.owner.sign(this.cachedTx.tx)
  }

  buildBsvTransaction (run) {
    if (this.cachedTx) return this.cachedTx

    const { blockchain, syncer } = run

    const net = util.networkSuffix(blockchain.network)
    const bsvNetwork = util.bsvNetwork(blockchain.network)

    // build the read references array, checking for different locations of the same jig
    const spentJigs = this.inputs.filter(jig => jig.origin[0] !== '_')
    const readRefs = new Map()
    this.reads.forEach(jig => {
      if (spentJigs.includes(jig) || this.outputs.includes(jig)) return
      const location = syncer.lastPosted.get(jig.origin) ||
        this.locations.get(jig.origin) || jig.location
      const prevLocation = readRefs.get(jig.origin)
      if (prevLocation && prevLocation !== location) {
        throw new Error(`read different locations of same jig ${jig.origin}`)
      }
      readRefs.set(jig.origin, location)
    })
    const refs = Array.from(readRefs.values())

    // Jig arguments, class props, and code need to be turned into token references
    const { Jig } = __webpack_require__(15)
    const tokenSaver = token => {
      if (token instanceof Jig) {
        // find the jig if it is a proxy. it may not be a proxy if it wasn't used, but then
        // we won't have trouble reading origin/location. (TODO: is this true? might be queued)
        let target = token
        const targets = Array.from(this.proxies.entries())
          .filter(([pk, pv]) => pv === target).map(([pk, pv]) => pk)
        if (targets.length) { target = targets[0] }

        // if the jig is an input, use it
        const inputIndex = spentJigs.findIndex(i => util.sameJig(i, target))
        if (inputIndex !== -1) return `_i${inputIndex}`

        // if the jig is an output, use it
        const outputIndex = this.outputs.findIndex(o => util.sameJig(o, target))
        if (outputIndex !== -1) return `_o${1 + this.code.length + outputIndex}`

        // if the jig is a read reference, use it
        const refIndex = refs.indexOf(readRefs.get(target.origin))
        if (refIndex !== -1) return `_r${refIndex}`

        // otherwise, use the actual location
        return syncer.lastPosted.get(target.origin) || target.location
      }

      if (util.deployable(token)) {
        return token[`location${net}`][0] === '_'
          ? `_o${parseInt(token[`location${net}`].slice(2)) + 1}`
          : token[`location${net}`]
      }

      if (token instanceof Berry) {
        const error = Location.parse(token.location).error
        if (error) throw new Error(`Cannot serialize berry: ${error}`)
        return token.location
      }
    }

    const xray = new Xray()
      .allowTokens()
      .useIntrinsics(run.code.intrinsics)
      .useTokenSaver(tokenSaver)

    // build each action
    const actions = this.actions.map(action => {
      const { method } = action

      const args = xray.serialize(action.args)

      // if init, this is a special case. find the definition and owner.
      if (method === 'init') {
        const targetLocation = action.target.constructor[`origin${net}`] ||
            action.target.constructor[`location${net}`]
        const target = targetLocation[0] === '_' ? `_o${1 + parseInt(targetLocation.slice(2))}` : targetLocation
        return { target, method, args, creator: action.creator }
      }

      // if the jig has an input, use it
      const inputIndex = spentJigs.findIndex(i => util.sameJig(i, action.target))
      if (inputIndex !== -1) return { target: `_i${inputIndex}`, method, args }

      // if the jig has an output, use it (example: created within the transaction)
      const outputIndex = this.outputs.findIndex(o => util.sameJig(o, action.target))
      if (outputIndex !== -1) return { target: `_o${1 + this.code.length + outputIndex}`, method, args }

      // the target was not updated in the transaction
      const target = action.target.location[0] !== '_' ? action.target.location
        : syncer.lastPosted.get(action.target.origin)
      return { target, method, args }
    })

    // Build each definition
    const code = this.code.map(def => {
      // Turn dependencies into references
      const fixloc = id => id[0] === '_' ? `_o${1 + parseInt(id.slice(2))}` : id
      const depsArr = Object.entries(def.deps).map(([k, v]) => ({ [k]: fixloc(v[`location${net}`]) }))
      const deps = depsArr.length ? Object.assign(...depsArr) : undefined

      // Serialize class props
      const props = Object.keys(def.props).length ? xray.serialize(def.props) : undefined

      return { text: util.getNormalizedSourceCode(def.type), deps, props, owner: def.owner }
    })

    // Calculate hashes for each output
    // this.outputs.forEach(output => {
    // console.log(output)
    // })
    // Maybe origin and location are removed, to make it deterministic
    // Origin is kept. If __, then removed. But what if 3 are pending? Maybe always remove origin.
    // But then how does state get reconstructed? Location is assigned. Sure. But what origin?
    // How do you know it was the original to put it on? What about refs that haven't been posted yet?
    // This is a bit of a problem. No it isn't. We know origin when we post. Not before. You don't
    // have pending stuff at this time. Include origin, if it's there. References will always be past
    // refs.

    // build our json payload
    const data = { code, actions, jigs: this.outputs.length, refs: refs.length ? refs : undefined }

    const encrypted = util.encryptRunData(data)
    const prefix = Buffer.from('run', 'utf8')
    const protocolVersion = Buffer.from([util.PROTOCOL_VERSION], 'hex')
    const appId = Buffer.from(run.app, 'utf8')
    const payload = Buffer.from(encrypted, 'utf8')
    const debugInfo = Buffer.from('r11r', 'utf8')
    const script = bsv.Script.buildSafeDataOut([prefix, protocolVersion, appId, payload, debugInfo])
    const tx = new bsv.Transaction().addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))

    // build inputs
    const spentLocations = spentJigs.map(jig => syncer.lastPosted.get(jig.origin) ||
      this.locations.get(jig.origin) || jig.location)
    spentJigs.forEach((jig, index) => {
      const txid = spentLocations[index].slice(0, 64)
      const vout = parseInt(spentLocations[index].slice(66))
      const before = this.before.get(jig)
      const satoshis = Math.max(bsv.Transaction.DUST_AMOUNT, before.restore().satoshis)
      const pubkey = new bsv.PublicKey(before.restore().owner, { network: bsvNetwork })
      const script = bsv.Script.buildPublicKeyHashOut(pubkey)
      const utxo = { txid, vout, script, satoshis }
      tx.from(utxo)
    })

    // build run outputs first by adding code then by adding jigs
    const defAdress = def => new bsv.PublicKey(def.owner, { network: bsvNetwork })
    this.code.forEach(def => tx.to(defAdress(def), bsv.Transaction.DUST_AMOUNT))
    this.outputs.forEach(jig => {
      const ownerPubkey = this.after.get(jig).restore().owner
      const ownerAddress = new bsv.PublicKey(ownerPubkey, { network: bsvNetwork }).toAddress()
      const satoshis = this.after.get(jig).restore().satoshis
      tx.to(ownerAddress, Math.max(bsv.Transaction.DUST_AMOUNT, satoshis))
    })

    this.cachedTx = { tx, refs, spentJigs, spentLocations }
    return this.cachedTx
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { ProtoTransaction, Transaction }

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(11).Buffer))

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * blockchain.js
 *
 * Blockchain API and its default REST implementation
 */

const { Address, Script, Transaction } = __webpack_require__(0)
const axios = __webpack_require__(60)
const util = __webpack_require__(4)

// ------------------------------------------------------------------------------------------------
// Blockchain API
// ------------------------------------------------------------------------------------------------

/**
 * Generic Blockchain API that Run uses to interface with the blockchain
 */
class Blockchain {
  /**
   * @returns {string} Network string, one of 'main', 'test', 'stn', or 'mock'
   */
  get network () { throw new Error('Not implemented') }

  /**
   * Submits a transaction to the network
   * @param {bsv.Transaction} tx Transaction to broadcast
   */
  async broadcast (tx) { throw new Error('Not implemented') }

  /**
   * Queries the network for a transaction
   * @param {string} txid Transaction id hex string
   * @param {boolean} force Whether to force-refresh the transaction, and never use the cache
   * @returns {bsv.Transaction} Transaction with additional metadata including:
   * - `time` {number} Time in milliseconds for acceptance into a block or mempool
   * - `confirmations` {number} Number of confirmations, 0 for mempool
   * - `blockhash` {string} Hash of block this tx was included in
   * - `blockheight` {string} Height of block this tx was included in
   * - `blocktime` {number} Time in milliseconds the block was published
   * - `vout` {Array<{spentTxId, spentIndex, spentHeight}>} Output spend information`
   */
  async fetch (txid, force) { throw new Error('Not implemented') }

  /**
   * Queries the utxos for an address
   * @param {string} address Address string
   * @returns {Array<{txid, vout, script, satoshis}>}
   */
  async utxos (address) { throw new Error('Not implemented') }
}

Blockchain.isBlockchain = blockchain => {
  if (typeof blockchain !== 'object' || !blockchain) return false
  if (typeof blockchain.broadcast !== 'function') return false
  if (typeof blockchain.fetch !== 'function') return false
  if (typeof blockchain.utxos !== 'function') return false
  if (typeof blockchain.network !== 'string') return false
  return true
}

// ------------------------------------------------------------------------------------------------
// BlockchainServer
// ------------------------------------------------------------------------------------------------

/**
 * Implements the Blockchain API using a network service
 */
class BlockchainServer {
  constructor (options = {}) {
    this.network = parseNetwork(options.network)
    this.logger = parseLogger(options.logger)
    this.api = parseApi(options.api)
    this.cache = parseCache(options.lastBlockchain, this.network)
    this.axios = axios.create({ timeout: parseTimeout(options.timeout) })
    this.bsvNetwork = util.bsvNetwork(this.network)
    this.requests = new Map() // txid|address -> Array<Function>
  }

  async broadcast (tx) {
    // Verify the tx locally. It is faster to find problems here than to wait for a server response.
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.getFee() < tx.toBuffer().length) throw new Error('tx fee too low')
    if (tx.verify() !== true) throw new Error(tx.verify())
    if (tx.isFullySigned() !== true) throw new Error('tx not fully signed')

    // Set properties on the tx that run expects
    tx.time = Date.now()
    tx.confirmations = 0
    tx.outputs.forEach(o => { o.spentTxId = null; o.spentIndex = null; o.spentHeight = null })

    // Broadcast the transaction
    await this._post(this.api.broadcastUrl(this.network), this.api.broadcastData(tx))

    // Cache the transaction for later fetches and also put in our sent list so that
    // we can correct UTXOs returned for the server.
    this.cache.broadcasted(tx)
  }

  async fetch (txid, force = false) {
    // Check the cache for this transaction if we are not force-refreshing the transaction
    const cached = this.cache.get(txid)
    if (!force && cached) return cached

    // If we already are fetching this transaction, then piggy-back on the response
    const prior = this.requests.get(txid)
    if (prior) return new Promise((resolve, reject) => prior.push({ resolve, reject }))

    // Otherwise, create a new promise list for this request
    this.requests.set(txid, [])

    try {
      // Fetch the transaction by its txid
      const data = (await this._get(this.api.fetchUrl(this.network, txid))).data
      const tx = this.api.fetchResp(data)

      // If we have a local cached copy, make sure the spent data is up-to-date
      if (cached) {
        for (let vout = 0; vout < tx.outputs.length; vout++) {
          tx.outputs[vout].spentTxId = tx.outputs[vout].spentTxId || cached.outputs[vout].spentTxId
          tx.outputs[vout].spentIndex = tx.outputs[vout].spentIndex || cached.outputs[vout].spentIndex
          tx.outputs[vout].spentHeight = tx.outputs[vout].spentHeight || cached.outputs[vout].spentHeight
        }
      }

      // Cache it
      this.cache.fetched(tx)

      // If there is other code waiting for this result, resolve their promises now
      this.requests.get(txid).forEach(promise => promise.resolve(tx))

      return tx
    } catch (e) {
      // If the request fails, notify all other code that is waiting for this request
      this.requests.get(txid).forEach(promise => promise.reject(e))

      throw e
    } finally {
      // Whether fetch succeeds or fails, remove all callbacks for this request
      this.requests.delete(txid)
    }
  }

  async utxos (address) {
    // Whether we are passed a bsv.Address or a string, convert it to a string
    address = new Address(address, this.bsvNetwork).toString()

    // If we are already querying the utxos for this address, piggy-back on that request
    const prior = this.requests.get(address)
    if (prior) return new Promise((resolve, reject) => prior.push({ resolve, reject }))

    // Create a new promise list for other code to piggy-back on
    this.requests.set(address, [])

    try {
      // Query the utxos
      const data = (await this._get(this.api.utxosUrl(this.network, address))).data
      const utxos = this.api.utxosResp(data, address)
      if (!Array.isArray(utxos)) {
        throw new Error(`Received invalid utxos for ${address}\n\n: Type: ${typeof utxos}\n\nNetwork: ${this.network}`)
      }

      // In case the utxos from the server have any duplicates, dedup them
      const dedupedUtxos = this._dedupUtxos(utxos)

      // The server may not index utxos right away. update the utxos with our own broadcasted txns
      const correctedUtxos = this.cache.correctForServerUtxoIndexingDelay(dedupedUtxos, address)

      // Notify all other code that was also waiting for this request
      this.requests.get(address).forEach(o => o.resolve(correctedUtxos))

      return correctedUtxos
    } catch (e) {
      // Notify all other code that this request failed
      this.requests.get(address).forEach(o => o.reject(e))

      throw e
    } finally {
      // Whether we succeeded or failed, remove the promises for this request
      this.requests.delete(address)
    }
  }

  _dedupUtxos (utxos) {
    // In case the server has a bug, run must be able to handle duplicate utxos returned. If we
    // don't dedup, then later we will create a transaction with more than one of the same input.
    const locations = new Set()
    return utxos.filter(utxo => {
      const location = `${utxo.txid}_o${utxo.vout}`
      if (!locations.has(location)) {
        locations.add(location)
        return true
      } else {
        if (this.logger) this.logger.warn(`Duplicate utxo returned from server: ${location}`)
        return false
      }
    })
  }

  async _post (url, data) {
    if (this.logger) this.logger.info(`POST ${url}`)
    return call(this.axios.post(url, data))
  }

  async _get (url) {
    if (this.logger) this.logger.info(`GET ${url}`)
    return call(this.axios.get(url))
  }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseNetwork (network) {
  if (network === 'main' || network === 'test' || network === 'stn') return network
  switch (typeof network) {
    case 'string': throw new Error(`Unknown network: ${network}`)
    case 'undefined': return 'main'
    default: throw new Error(`Invalid network: ${network}`)
  }
}

function parseLogger (logger) {
  switch (typeof logger) {
    case 'object': return logger
    case 'undefined': return null
    default: throw new Error(`Invalid logger: ${logger}`)
  }
}

function parseTimeout (timeout) {
  switch (typeof timeout) {
    case 'number':
      if (Number.isNaN(timeout) || timeout < 0) throw new Error(`Invalid timeout: ${timeout}`)
      return timeout
    case 'undefined': return 10000
    default: throw new Error(`Invalid timeout: ${timeout}`)
  }
}

function parseApi (api) {
  switch (typeof api) {
    case 'string': {
      const apiData = apis.find(apiData => apiData.name === api)
      if (!apiData) throw new Error(`Unknown blockchain API: ${api}`)
      return apiData
    }
    case 'object':
      if (!api) throw new Error(`Invalid blockchain API: ${api}`)
      return api
    case 'undefined': return apis[0]
    default: throw new Error(`Invalid blockchain API: ${api}`)
  }
}

function parseCache (lastBlockchain, network) {
  // Copy the cache from the last blockchain if possible to save round trips
  if (lastBlockchain && lastBlockchain instanceof BlockchainServer &&
    lastBlockchain.network === network) {
    return lastBlockchain.cache
  }
  return new BlockchainServerCache()
}

// ------------------------------------------------------------------------------------------------
// BlockchainServerCache
// ------------------------------------------------------------------------------------------------

class BlockchainServerCache {
  constructor () {
    this.transactions = new Map() // txid -> tx
    this.broadcasts = [] // Array<Transaction>
    this.size = 10000
    this.expiration = 10 * 60 * 1000
    this.indexingDelay = 10 * 1000
  }

  get (txid) {
    const tx = this.transactions.get(txid)
    if (!tx) return

    // If the transaction is expired, remove it
    const expired = Date.now() - tx.fetchedTime > this.expiration
    if (expired) {
      this.transactions.delete(txid)
      return
    }

    // Bump the transaction to the top and return it
    this.transactions.delete(txid)
    this.transactions.set(txid, tx)
    return tx
  }

  fetched (tx) {
    tx.fetchedTime = Date.now()

    this.transactions.set(tx.hash, tx)

    // If the cache is full, remove the oldest transaction
    if (this.transactions.size > this.size) {
      const oldest = this.transactions.keys().next().value
      this.transactions.delete(oldest)
    }
  }

  broadcasted (tx) {
    this.fetched(tx)

    // Remove all transactions from our broadcast past the indexing delay
    const now = Date.now()
    this.broadcasts = this.broadcasts.filter(tx => now - tx.time < this.indexingDelay)

    this.broadcasts.push(tx)

    // Update our known transactions with spent info
    tx.inputs.forEach((input, vin) => {
      const spent = this.transactions.get(input.prevTxId.toString('hex'))
      if (spent) {
        spent.outputs[input.outputIndex].spentTxId = tx.hash
        spent.outputs[input.outputIndex].spentIndex = vin
        spent.outputs[input.outputIndex].spentHeight = -1
      }
    })
  }

  correctForServerUtxoIndexingDelay (utxos, address) {
    // First remove all expired txns from our broadcast cache
    const now = Date.now()
    this.broadcasts = this.broadcasts.filter(tx => now - tx.time < this.indexingDelay)

    // Add all utxos from our broadcast cache for this address that aren't already there
    this.broadcasts.forEach(tx => {
      tx.outputs.forEach((output, vout) => {
        if (output.script.toAddress(this.bsvNetwork).toString() === address &&
              !utxos.some(utxo => utxo.txid === tx.hash && utxo.vout === vout)) {
          utxos.push({ txid: tx.hash, vout, script: output.script, satoshis: output.satoshis })
        }
      })
    })

    // Remove all utxos that we know are spent because they are in our broadcast cache
    this.broadcasts.forEach(tx => {
      const inputSpendsUtxo = (input, utxo) =>
        input.prevTxId.toString('hex') === utxo.txid &&
        input.outputIndex === utxo.vout

      utxos = utxos.filter(utxo => !tx.inputs.some(input => inputSpendsUtxo(input, utxo)))
    })

    return utxos
  }
}

// ------------------------------------------------------------------------------------------------
// Helper methods
// ------------------------------------------------------------------------------------------------

async function call (promise) {
  try { return await promise } catch (e) {
    const { config: c, response: r } = e
    if (c && c.url && r && r.data) {
      const message = r.data.message ? (r.data.message.message || r.data.message) : r.data
      const reason = r.data.name && message ? `${r.data.name}: ${message}` : r.data.name || message
      throw new Error(`${reason}\n\n${c.method.toUpperCase()} ${c.url}`)
    } else { throw e }
  }
}

function jsonToTx (json) {
  const tx = new Transaction(json.hex || json.rawtx)
  tx.time = json.time * 1000 || Date.now()
  if (json.blockhash && json.blockhash.length) tx.blockhash = json.blockhash
  if (json.blocktime) tx.blocktime = json.blocktime
  if (json.blockheight) tx.blockheight = json.blockheight
  if (typeof json.confirmations !== 'undefined') tx.confirmations = json.confirmations
  if (json.vout) {
    json.vout.forEach((output, n) => {
      if (typeof output.spentTxId !== 'undefined') tx.outputs[n].spentTxId = output.spentTxId
      if (typeof output.spentIndex !== 'undefined') tx.outputs[n].spentIndex = output.spentIndex
      if (typeof output.spentHeight !== 'undefined') tx.outputs[n].spentHeight = output.spentHeight
    })
  }
  return tx
}

// ------------------------------------------------------------------------------------------------
// REST APIs
// ------------------------------------------------------------------------------------------------

const starApiHost = 'https://api.star.store'

const apis = [
  {
    name: 'star',
    broadcastUrl: network => `${starApiHost}/v1/${network}/tx`,
    broadcastData: tx => { return { rawtx: tx.toBuffer().toString('hex') } },
    fetchUrl: (network, txid) => `${starApiHost}/v1/${network}/tx/${txid}`,
    fetchResp: data => jsonToTx(data),
    utxosUrl: (network, address) => `${starApiHost}/v1/${network}/utxos/${address.toString()}`,
    utxosResp: (data, address) => typeof data === 'string' ? JSON.parse(data) : data
  },
  {
    name: 'bitindex',
    broadcastUrl: network => `https://api.bitindex.network/api/v3/${network}/tx/send`,
    broadcastData: tx => { return { rawtx: tx.toBuffer().toString('hex') } },
    fetchUrl: (network, txid) => `https://api.bitindex.network/api/v3/${network}/tx/${txid}`,
    fetchResp: data => { const ret = jsonToTx(data); ret.confirmations = ret.confirmations || 0; return ret },
    utxosUrl: (network, address) => `https://api.bitindex.network/api/v3/${network}/addr/${address.toString()}/utxo`,
    utxosResp: (data, address) => data.map(o => { return Object.assign({}, o, { script: new Script(o.scriptPubKey) }) })
  },
  {
    name: 'whatsonchain',
    broadcastUrl: network => `https://api.whatsonchain.com/v1/bsv/${network}/tx/raw`,
    broadcastData: tx => { return { txhex: tx.toBuffer().toString('hex') } },
    fetchUrl: (network, txid) => `https://api.whatsonchain.com/v1/bsv/${network}/tx/hash/${txid}`,
    fetchResp: data => { const ret = jsonToTx(data); ret.confirmations = ret.confirmations || 0; return ret },
    utxosUrl: (network, address) => `https://api.whatsonchain.com/v1/bsv/${network}/address/${address.toString()}/unspent`,
    utxosResp: (data, address) => data.map(o => {
      return { txid: o.tx_hash, vout: o.tx_pos, satoshis: o.value, script: Script.fromAddress(address) }
    })
  }
]

// ------------------------------------------------------------------------------------------------

BlockchainServer.Cache = BlockchainServerCache

module.exports = { Blockchain, BlockchainServer }


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {

var utils = __webpack_require__(5);
var normalizeHeaderName = __webpack_require__(67);

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  // Only Node.JS has a process variable that is of [[Class]] process
  if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = __webpack_require__(27);
  } else if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = __webpack_require__(27);
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(18)))

/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);
var settle = __webpack_require__(68);
var buildURL = __webpack_require__(24);
var parseHeaders = __webpack_require__(70);
var isURLSameOrigin = __webpack_require__(71);
var createError = __webpack_require__(28);

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for ready state
    request.onreadystatechange = function handleLoad() {
      if (!request || request.readyState !== 4) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(createError('Request aborted', config, 'ECONNABORTED', request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      var cookies = __webpack_require__(72);

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
        if (config.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var enhanceError = __webpack_require__(69);

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
module.exports = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  utils.forEach(['url', 'method', 'params', 'data'], function valueFromConfig2(prop) {
    if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    }
  });

  utils.forEach(['headers', 'auth', 'proxy'], function mergeDeepProperties(prop) {
    if (utils.isObject(config2[prop])) {
      config[prop] = utils.deepMerge(config1[prop], config2[prop]);
    } else if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    } else if (utils.isObject(config1[prop])) {
      config[prop] = utils.deepMerge(config1[prop]);
    } else if (typeof config1[prop] !== 'undefined') {
      config[prop] = config1[prop];
    }
  });

  utils.forEach([
    'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
    'timeout', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
    'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'maxContentLength',
    'validateStatus', 'maxRedirects', 'httpAgent', 'httpsAgent', 'cancelToken',
    'socketPath'
  ], function defaultToConfig2(prop) {
    if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    } else if (typeof config1[prop] !== 'undefined') {
      config[prop] = config1[prop];
    }
  });

  return config;
};


/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;


/***/ }),
/* 31 */
/***/ (function(module, exports) {

/**
 * expect.js
 *
 * Expect API for parameter checking in jigs
 */

function expect (subject) {
  let negated = false

  const stringify = x => {
    if (typeof x !== 'object' || !x) return x
    try { return JSON.stringify(x) } catch (e) { return x.toString() }
  }

  function check (condition, conditionString, message) {
    if (negated ? condition : !condition) {
      throw new Error(message || `expected value${negated ? ' not' : ''} to be ${conditionString} but was ${stringify(subject)}`)
    }
  }

  function deepEqual (a, b) {
    if (typeof a !== typeof b) return false
    if (typeof a === 'object' && typeof b === 'object') {
      if (Object.keys(a).length !== Object.keys(b).length) return false
      return Object.keys(a).every(key => deepEqual(a[key], b[key]))
    }
    return a === b
  }

  return {
    get not () { negated = !negated; return this },

    toBe: (value, message) => check(subject === value, `${stringify(value)}`, message),
    toEqual: (value, message) => check(deepEqual(subject, value), `equal to ${stringify(value)}`, message),
    toBeInstanceOf: (Class, message) => check(subject && subject instanceof Class, `an instance of ${Class.name}`, message),

    toBeDefined: message => check(typeof subject !== 'undefined', 'defined', message),
    toBeNull: message => check(subject === null, 'null', message),

    toBeNumber: message => check(typeof subject === 'number', 'a number', message),
    toBeInteger: message => check(Number.isInteger(subject), 'an integer', message),
    toBeLessThan: (value, message) => check(subject < value && typeof subject === 'number' && typeof value === 'number', `less than ${value}`, message),
    toBeLessThanOrEqualTo: (value, message) => check(subject <= value && typeof subject === 'number' && typeof value === 'number', `less than or equal to ${value}`, message),
    toBeGreaterThan: (value, message) => check(subject > value && typeof subject === 'number' && typeof value === 'number', `greater than ${value}`, message),
    toBeGreaterThanOrEqualTo: (value, message) => check(subject >= value && typeof subject === 'number' && typeof value === 'number', `greater than or equal to ${value}`, message),

    toBeBoolean: message => check(typeof subject === 'boolean', 'a boolean', message),
    toBeString: message => check(typeof subject === 'string', 'a string', message),
    toBeObject: message => check(subject && typeof subject === 'object', 'an object', message),
    toBeArray: message => check(Array.isArray(subject), 'an array', message),

    toBeClass: message => check(typeof subject === 'function' && subject.toString().startsWith('class'), 'a class', message),
    toBeFunction: message => check(typeof subject === 'function' && !subject.toString().startsWith('class'), 'a function', message)
  }
}

expect.originTestnet = '96519db31615b35dad14f9a27eba565610938c5856f8771f79aaecfa1693d51a_o1'
expect.locationTestnet = '96519db31615b35dad14f9a27eba565610938c5856f8771f79aaecfa1693d51a_o1'
expect.ownerTestnet = '024b749c0a85bfaf8b4fc372c8ef20bb6786b6c4336ecfa9a3f5b8694ce0b22353'
expect.originMainnet = '3c9903f4507fcdd3bfbce6b89913167dc67878341ba7f064f0d5afca42dc2dc0_o1'
expect.locationMainnet = '3c9903f4507fcdd3bfbce6b89913167dc67878341ba7f064f0d5afca42dc2dc0_o1'
expect.ownerMainnet = '0282f956ccba29f5d10b1beefe97287c0d8841ca04277404d4e3d426c6770f41fd'

module.exports = expect


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * index.js
 *
 * Includes all the tests that run using mocha
 */

__webpack_require__(33)
__webpack_require__(19)
__webpack_require__(37)
__webpack_require__(38)
__webpack_require__(39)
__webpack_require__(40)
__webpack_require__(41)
__webpack_require__(42)
__webpack_require__(43)
__webpack_require__(44)
__webpack_require__(45)
__webpack_require__(46)
__webpack_require__(47)
__webpack_require__(48)
__webpack_require__(52)
__webpack_require__(53)
__webpack_require__(54)


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

const { describe, it, beforeEach } = __webpack_require__(2)
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
chai.use(chaiAsPromised)
const { expect } = chai
const { createRun, Run } = __webpack_require__(3)
const { Jig, Berry } = Run

class Post extends Berry {
  init (text) {
    this.text = text
  }
}

class Twetch {
  static async pluck (location, fetch, pluck) {
    const txo = await fetch(location)
    if (txo.out[0].s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut') { // B protocol
      return new Post(txo.out[0].s3)
    }
  }
}

Twetch.deps = { Post }

Post.protocol = Twetch

class Favorite extends Jig {
  init (post) {
    this.post = post
  }
}

describe.skip('Berry', () => {
  const run = createRun({ network: 'main' })
  beforeEach(() => run.activate())

  it('should fail to deploy if protocol is undeployed', async () => {
    const txid = 'd5e8313dc183d5a600a37933a55d1679436fc0d3f4d3c672b85872f84dbc41e1_o2'
    const post = await run.load(txid, { protocol: Twetch })
    const favorite = new Favorite(post)
    await favorite.sync()
  }).timeout(10000)

  it('should deploy and load a twetch post', async () => {
    await run.deploy(Twetch)
    const txid = 'b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
    const post = await run.load(txid, { protocol: Twetch })
    const favorite = new Favorite(post)
    await favorite.sync()
    await run.load(favorite.location)
    run.state.cache.clear()
    await run.load(favorite.location)
  }).timeout(10000)

  it('should load favorite without protocol from blockchain', async () => {
    const location = 'd5e8313dc183d5a600a37933a55d1679436fc0d3f4d3c672b85872f84dbc41e1_o2'
    const favorite = await run.load(location)
    console.log(favorite)
  }).timeout(10000)

  it('should load post with protocol from blockchain', async () => {
    const location = 'f5aba0377ccb7be4ee0f6ab0f9a6cef64bbd3d2bbc0ff0bd2e050e7733a3e0e1_o1://b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
    const post = await run.load(location)
    console.log(post)
  }).timeout(10000)

  it('should throw if load invalid post with protocol', async () => {
    const location = 'f5aba0377ccb7be4ee0f6ab0f9a6cef64bbd3d2bbc0ff0bd2e050e7733a3e0e1_o1://6d8f2138df60fe2dc0b35d78fcb987086258ef5ab73bdff8b08bb8c01001840e'
    await expect(run.load(location)).to.be.rejectedWith('Failed to load berry using Twetch')
  })

  it('should support loading berries from berries', () => {
    // TODO
  })

  it('should support multiple fetches per berry', () => {
    // TODO
  })

  it('should throw if pluck more than one berry', () => {
    // TODO
  })

  it('should support deploying protocol after already using it locally', () => {
    // TODO
  })
})


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/* !
 * Chai - checkError utility
 * Copyright(c) 2012-2016 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .checkError
 *
 * Checks that an error conforms to a given set of criteria and/or retrieves information about it.
 *
 * @api public
 */

/**
 * ### .compatibleInstance(thrown, errorLike)
 *
 * Checks if two instances are compatible (strict equal).
 * Returns false if errorLike is not an instance of Error, because instances
 * can only be compatible if they're both error instances.
 *
 * @name compatibleInstance
 * @param {Error} thrown error
 * @param {Error|ErrorConstructor} errorLike object to compare against
 * @namespace Utils
 * @api public
 */

function compatibleInstance(thrown, errorLike) {
  return errorLike instanceof Error && thrown === errorLike;
}

/**
 * ### .compatibleConstructor(thrown, errorLike)
 *
 * Checks if two constructors are compatible.
 * This function can receive either an error constructor or
 * an error instance as the `errorLike` argument.
 * Constructors are compatible if they're the same or if one is
 * an instance of another.
 *
 * @name compatibleConstructor
 * @param {Error} thrown error
 * @param {Error|ErrorConstructor} errorLike object to compare against
 * @namespace Utils
 * @api public
 */

function compatibleConstructor(thrown, errorLike) {
  if (errorLike instanceof Error) {
    // If `errorLike` is an instance of any error we compare their constructors
    return thrown.constructor === errorLike.constructor || thrown instanceof errorLike.constructor;
  } else if (errorLike.prototype instanceof Error || errorLike === Error) {
    // If `errorLike` is a constructor that inherits from Error, we compare `thrown` to `errorLike` directly
    return thrown.constructor === errorLike || thrown instanceof errorLike;
  }

  return false;
}

/**
 * ### .compatibleMessage(thrown, errMatcher)
 *
 * Checks if an error's message is compatible with a matcher (String or RegExp).
 * If the message contains the String or passes the RegExp test,
 * it is considered compatible.
 *
 * @name compatibleMessage
 * @param {Error} thrown error
 * @param {String|RegExp} errMatcher to look for into the message
 * @namespace Utils
 * @api public
 */

function compatibleMessage(thrown, errMatcher) {
  var comparisonString = typeof thrown === 'string' ? thrown : thrown.message;
  if (errMatcher instanceof RegExp) {
    return errMatcher.test(comparisonString);
  } else if (typeof errMatcher === 'string') {
    return comparisonString.indexOf(errMatcher) !== -1; // eslint-disable-line no-magic-numbers
  }

  return false;
}

/**
 * ### .getFunctionName(constructorFn)
 *
 * Returns the name of a function.
 * This also includes a polyfill function if `constructorFn.name` is not defined.
 *
 * @name getFunctionName
 * @param {Function} constructorFn
 * @namespace Utils
 * @api private
 */

var functionNameMatch = /\s*function(?:\s|\s*\/\*[^(?:*\/)]+\*\/\s*)*([^\(\/]+)/;
function getFunctionName(constructorFn) {
  var name = '';
  if (typeof constructorFn.name === 'undefined') {
    // Here we run a polyfill if constructorFn.name is not defined
    var match = String(constructorFn).match(functionNameMatch);
    if (match) {
      name = match[1];
    }
  } else {
    name = constructorFn.name;
  }

  return name;
}

/**
 * ### .getConstructorName(errorLike)
 *
 * Gets the constructor name for an Error instance or constructor itself.
 *
 * @name getConstructorName
 * @param {Error|ErrorConstructor} errorLike
 * @namespace Utils
 * @api public
 */

function getConstructorName(errorLike) {
  var constructorName = errorLike;
  if (errorLike instanceof Error) {
    constructorName = getFunctionName(errorLike.constructor);
  } else if (typeof errorLike === 'function') {
    // If `err` is not an instance of Error it is an error constructor itself or another function.
    // If we've got a common function we get its name, otherwise we may need to create a new instance
    // of the error just in case it's a poorly-constructed error. Please see chaijs/chai/issues/45 to know more.
    constructorName = getFunctionName(errorLike).trim() ||
        getFunctionName(new errorLike()); // eslint-disable-line new-cap
  }

  return constructorName;
}

/**
 * ### .getMessage(errorLike)
 *
 * Gets the error message from an error.
 * If `err` is a String itself, we return it.
 * If the error has no message, we return an empty string.
 *
 * @name getMessage
 * @param {Error|String} errorLike
 * @namespace Utils
 * @api public
 */

function getMessage(errorLike) {
  var msg = '';
  if (errorLike && errorLike.message) {
    msg = errorLike.message;
  } else if (typeof errorLike === 'string') {
    msg = errorLike;
  }

  return msg;
}

module.exports = {
  compatibleInstance: compatibleInstance,
  compatibleConstructor: compatibleConstructor,
  compatibleMessage: compatibleMessage,
  getMessage: getMessage,
  getConstructorName: getConstructorName,
};


/***/ }),
/* 35 */
/***/ (function(module, exports) {

module.exports = Run;

/***/ }),
/* 36 */
/***/ (function(module) {

module.exports = JSON.parse("{\"_checkActive\":\"aab\",\"checkOwner\":\"aac\",\"checkSatoshis\":\"aad\",\"checkRunTransaction\":\"aae\",\"extractRunData\":\"aaf\",\"outputType\":\"aag\",\"getNormalizedSourceCode\":\"aah\",\"deployable\":\"aai\",\"encryptRunData\":\"aaj\",\"decryptRunData\":\"aak\",\"activeRunInstance\":\"aal\",\"sameJig\":\"aam\",\"networkSuffix\":\"aan\",\"isBlockchain\":\"aacc\",\"broadcastUrl\":\"aap\",\"broadcastData\":\"aaq\",\"fetchUrl\":\"aar\",\"fetchResp\":\"aas\",\"utxosUrl\":\"aat\",\"utxosResp\":\"aau\",\"_dedupUtxos\":\"aav\",\"correctForServerUtxoIndexingDelay\":\"aaw\",\"fetched\":\"aax\",\"broadcasted\":\"aay\",\"isSandbox\":\"aaz\",\"getInstalled\":\"aaab\",\"installFromTx\":\"aabb\",\"installJig\":\"aacb\",\"fastForward\":\"aadb\",\"finish\":\"aaeb\",\"publishNext\":\"aafb\",\"publish\":\"aagb\",\"storeCode\":\"aahb\",\"storeAction\":\"aaib\",\"setProtoTxAndCreator\":\"aajb\",\"buildBsvTransaction\":\"aakb\",\"_fromPrivateKey\":\"aalb\",\"_fromPublicKey\":\"aamb\",\"_fromAddress\":\"aanb\",\"_queryLatest\":\"aaob\",\"_removeErrorRefs\":\"aapb\",\"_update\":\"aaqb\",\"_estimateSize\":\"aarb\",\"_util\":\"aasb\",\"intrinsics\":\"aatb\",\"proxies\":\"aaub\",\"enforce\":\"aavb\",\"stack\":\"aawb\",\"reads\":\"aaxb\",\"creates\":\"aayb\",\"before\":\"aazb\",\"callers\":\"aaac\",\"blankSlate\":\"aabc\",\"requests\":\"aadc\",\"broadcasts\":\"aaec\",\"expiration\":\"aafc\",\"indexingDelay\":\"aagc\",\"fetchedTime\":\"aahc\",\"transactions\":\"aaic\",\"utxosByLocation\":\"aajc\",\"utxosByAddress\":\"aakc\",\"blockHeight\":\"aalc\",\"installs\":\"aamc\",\"syncer\":\"aanc\",\"protoTx\":\"aaoc\",\"beginCount\":\"aapc\",\"cachedTx\":\"aaqc\",\"syncListeners\":\"aarc\",\"onBroadcastListeners\":\"aasc\",\"lastPosted\":\"aatc\",\"queued\":\"aauc\",\"sizeBytes\":\"aavc\",\"maxSizeBytes\":\"aawc\",\"JigControl\":\"aaxc\",\"ProtoTransaction\":\"aayc\",\"PROTOCOL_VERSION\":\"aazc\",\"SerialTaskQueue\":\"aaad\",\"extractProps\":\"aabd\",\"onReadyForPublish\":\"aacd\",\"spentJigs\":\"aadd\",\"spentLocations\":\"aaed\"}");

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * code.js
 *
 * Tests for ../lib/code.js
 */

// TODO: Do we need to pass run.blockchain into tests?

const { describe, it, beforeEach } = __webpack_require__(2)
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, Jig, createRun, hookPay } = __webpack_require__(3)

// ------------------------------------------------------------------------------------------------
// Code tests
// ------------------------------------------------------------------------------------------------

// These are set in 'should deploy to testnet' and used in 'should load from testnet'.
let deployedCodeLocation = null
let deployedCodeOwner = null

describe('Code', () => {
  const run = createRun()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())

  describe('deploy', () => {
    it('should deploy a basic class', async () => {
      class A { }
      await run.deploy(A)
      expect(A.location).not.to.equal(undefined)
      expect(A.location).to.equal(A.origin)
      expect(A.originMocknet).to.equal(A.origin)
      expect(A.locationMocknet).to.equal(A.origin)
      expect(A.owner).to.equal(run.owner.pubkey)
      expect(A.ownerMocknet).to.equal(run.owner.pubkey)
    })

    it('should not deploy previous install', async () => {
      class A { }
      const loc = await run.deploy(A)
      expect(loc).to.equal(await run.deploy(A))
    })

    it('should deploy functions', async () => {
      function f (a, b) { return a + b }
      const loc = await run.deploy(f)
      expect(f.origin).to.equal(loc)
      expect(f.location).to.equal(loc)
    })

    it('should throw for non-deployables', async () => {
      await expect(run.deploy(2)).to.be.rejected
      await expect(run.deploy('abc')).to.be.rejected
      await expect(run.deploy({ n: 1 })).to.be.rejected
      await expect(run.deploy(Math.random)).to.be.rejected
    })

    it('should throw if parent dep mismatch', async () => {
      class C { }
      class B { }
      class A extends B { }
      A.deps = { B: C }
      await expect(run.deploy(A)).to.be.rejectedWith('unexpected parent dependency B')
    })

    it('should support parent dep set to its sandbox', async () => {
      class B { }
      const B2 = await run.load(await run.deploy(B))
      class A extends B { }
      A.deps = { B: B2 }
      await run.deploy(A)
    })

    it('should deploy parents', async () => {
      class Grandparent { }
      class Parent extends Grandparent { f () { this.n = 1 } }
      class Child extends Parent { f () { super.f(); this.n += 1 } }
      const Child2 = await run.load(await run.deploy(Child))
      const child = new Child2()
      child.f()
      expect(child.n).to.equal(2)
      expect(run.code.installs.has(Parent)).to.equal(true)
      expect(run.code.installs.has(Grandparent)).to.equal(true)
    })

    it('should deploy dependencies', async () => {
      class A { createB () { return new B() } }
      class B { constructor () { this.n = 1 } }
      A.deps = { B }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().createB().n).to.equal(1)
    })

    it('should always deploy parents', async () => {
      function f () { }
      class A { callF () { f() } }
      A.deps = { f }
      class B extends A { callF2 () { f() } }
      const B2 = await run.load(await run.deploy(B))
      const b = new B2()
      expect(() => b.callF()).not.to.throw()
      expect(() => b.callF2()).to.throw()
    })

    it('should return deployed dependencies in jigs', async () => {
      class B { }
      class A {
        bInstanceofB () { return new B() instanceof B }
        bPrototype () { return Object.getPrototypeOf(new B()) }
        nameOfB () { return B.name }
      }
      A.deps = { B }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().nameOfB()).to.equal('B')
      const B2 = await run.load(await run.deploy(B))
      expect(new A2().bPrototype()).to.equal(B2.prototype)
    })

    it('should support renaming dependencies', async () => {
      class A { createB() { return new B() } } // eslint-disable-line
      class C { constructor () { this.n = 1 } }
      A.deps = { B: C }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().createB().n).to.equal(1)
    })

    it('should throw for undefined dependencies', async () => {
      class B { }
      class A { createB () { return new B() } }
      const A2 = await run.load(await run.deploy(A))
      expect(() => new A2().createB()).to.throw('B is not defined')
    })

    it('should support circular dependencies', async () => {
      class A { createB () { return new B() } }
      class B { createA () { return new A() } }
      A.deps = { B }
      B.deps = { A }
      const A2 = await run.load(await run.deploy(A))
      const B2 = await run.load(await run.deploy(B))
      expect(new A2().createB()).to.be.instanceOf(B2)
      expect(new B2().createA()).to.be.instanceOf(A2)
    })

    it('should set temporary origins and locations before sync', async () => {
      class B { }
      class A { }
      A.deps = { B }
      const locationPromise = run.deploy(A)
      expect(B.origin).to.equal(undefined)
      expect(A.origin).to.equal(undefined)
      expect(B.location).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(B.originMocknet).to.equal('_d1')
      expect(A.originMocknet).to.equal('_d0')
      expect(B.locationMocknet).to.equal('_d1')
      expect(A.locationMocknet).to.equal('_d0')
      const location = await locationPromise
      expect(location.startsWith('_')).to.equal(false)
      expect(B.origin.startsWith('_')).to.equal(false)
      expect(A.origin.startsWith('_')).to.equal(false)
      expect(B.location.startsWith('_')).to.equal(false)
      expect(A.location.startsWith('_')).to.equal(false)
      expect(B.originMocknet.startsWith('_')).to.equal(false)
      expect(A.originMocknet.startsWith('_')).to.equal(false)
      expect(B.locationMocknet.startsWith('_')).to.equal(false)
      expect(A.locationMocknet.startsWith('_')).to.equal(false)
    })

    it('should support batch deploys', async () => {
      class A { }
      class B { }
      class C { }
      run.transaction.begin()
      run.deploy(A)
      run.deploy(B)
      run.deploy(C)
      run.transaction.end()
      expect(A.origin).to.equal(undefined)
      expect(B.origin).to.equal(undefined)
      expect(C.origin).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(B.location).to.equal(undefined)
      expect(C.location).to.equal(undefined)
      expect(A.originMocknet).to.equal('_d0')
      expect(B.originMocknet).to.equal('_d1')
      expect(C.originMocknet).to.equal('_d2')
      expect(A.locationMocknet).to.equal('_d0')
      expect(B.locationMocknet).to.equal('_d1')
      expect(C.locationMocknet).to.equal('_d2')
      await run.sync()
      const txid = A.origin.split('_')[0]
      expect(A.origin.startsWith(txid)).to.equal(true)
      expect(B.origin.startsWith(txid)).to.equal(true)
      expect(C.origin.startsWith(txid)).to.equal(true)
      expect(A.location.startsWith(txid)).to.equal(true)
      expect(B.location.startsWith(txid)).to.equal(true)
      expect(C.location.startsWith(txid)).to.equal(true)
      expect(A.originMocknet.startsWith(txid)).to.equal(true)
      expect(B.originMocknet.startsWith(txid)).to.equal(true)
      expect(C.originMocknet.startsWith(txid)).to.equal(true)
      expect(A.locationMocknet.startsWith(txid)).to.equal(true)
      expect(B.locationMocknet.startsWith(txid)).to.equal(true)
      expect(C.locationMocknet.startsWith(txid)).to.equal(true)
    })

    it('should deploy all queued', async () => {
      class A { }
      class B { }
      run.deploy(A)
      run.deploy(B)
      await run.sync()
      expect(A.origin.split('_')[0]).not.to.equal(B.origin.split('_')[0])
      expect(A.location.split('_')[0]).not.to.equal(B.location.split('_')[0])
    })

    it('should revert metadata for deploy failures', async () => {
      hookPay(run, false)
      class A { }
      await expect(run.deploy(A)).to.be.rejected
      expect(A.origin).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(A.originMocknet).to.equal(undefined)
      expect(A.locationMocknet).to.equal(undefined)
    })

    it('should revert metadata for queued deploy failures', async () => {
      hookPay(run, true, false)
      class A { }
      class B { }
      run.deploy(A).catch(e => {})
      run.deploy(B).catch(e => {})
      expect(A.origin).to.equal(undefined)
      expect(B.origin).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(B.location).to.equal(undefined)
      expect(A.originMocknet.startsWith('_')).to.equal(true)
      expect(B.originMocknet.startsWith('_')).to.equal(true)
      expect(A.locationMocknet.startsWith('_')).to.equal(true)
      expect(B.locationMocknet.startsWith('_')).to.equal(true)
      await expect(run.sync()).to.be.rejectedWith('tx has no inputs')
      expect(A.origin.endsWith('_o1')).to.equal(true)
      expect(A.originMocknet.endsWith('_o1')).to.equal(true)
      expect(B.origin).to.equal(undefined)
      expect(B.originMocknet).to.equal(undefined)
      expect(A.location.endsWith('_o1')).to.equal(true)
      expect(A.locationMocknet.endsWith('_o1')).to.equal(true)
      expect(B.location).to.equal(undefined)
      expect(B.locationMocknet).to.equal(undefined)
    })

    it('should deploy to testnet', async () => {
      const run = createRun({ network: 'test' })
      class C { g () { return 1 } }
      class B { }
      class A extends B {
        f () { return 1 }

        createC () { return new C() }
      }
      A.deps = { B, C }
      await run.deploy(A)
      expect(A.origin.split('_')[0].length).to.equal(64)
      expect(B.origin.split('_')[0].length).to.equal(64)
      expect(C.origin.split('_')[0].length).to.equal(64)
      expect(A.originTestnet.split('_')[0].length).to.equal(64)
      expect(B.originTestnet.split('_')[0].length).to.equal(64)
      expect(C.originTestnet.split('_')[0].length).to.equal(64)
      expect(A.origin.endsWith('_o2')).to.equal(true)
      expect(B.origin.endsWith('_o1')).to.equal(true)
      expect(C.origin.endsWith('_o3')).to.equal(true)
      expect(A.originTestnet.endsWith('_o2')).to.equal(true)
      expect(B.originTestnet.endsWith('_o1')).to.equal(true)
      expect(C.originTestnet.endsWith('_o3')).to.equal(true)
      expect(A.location.split('_')[0].length).to.equal(64)
      expect(B.location.split('_')[0].length).to.equal(64)
      expect(C.location.split('_')[0].length).to.equal(64)
      expect(A.locationTestnet.split('_')[0].length).to.equal(64)
      expect(B.locationTestnet.split('_')[0].length).to.equal(64)
      expect(C.locationTestnet.split('_')[0].length).to.equal(64)
      expect(A.location.endsWith('_o2')).to.equal(true)
      expect(B.location.endsWith('_o1')).to.equal(true)
      expect(C.location.endsWith('_o3')).to.equal(true)
      expect(A.locationTestnet.endsWith('_o2')).to.equal(true)
      expect(B.locationTestnet.endsWith('_o1')).to.equal(true)
      expect(C.locationTestnet.endsWith('_o3')).to.equal(true)
      deployedCodeLocation = A.originTestnet
      deployedCodeOwner = A.ownerTestnet
    }).timeout(30000)

    it('should support presets', async () => {
      const run = createRun({ network: 'test' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      const run2 = createRun({ network: 'test' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).to.equal(A.originTestnet)
      expect(A.location).to.equal(A.locationTestnet)
      expect(location).to.equal(A.locationTestnet)
    }).timeout(30000)

    it('should support origin-only presets', async () => {
      const run = createRun({ network: 'main' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      const run2 = createRun({ network: 'main' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).to.equal(A.originMainnet)
      expect(A.location).to.equal(A.originMainnet)
      expect(location).to.equal(A.locationMainnet)
    }).timeout(30000)

    it('should support location-only presets', async () => {
      const run = createRun({ network: 'test' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      delete A.originTestnet
      const run2 = createRun({ network: 'test' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).to.equal(undefined)
      expect(A.location).to.equal(A.locationTestnet)
      expect(location).to.equal(A.locationTestnet)
    }).timeout(30000)
  })

  describe('load', () => {
    it('should load from cache', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      expect(await run.load(A.origin)).to.equal(A2)
    })

    it('should load from mockchain when cached', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      const run2 = createRun({ blockchain: run.blockchain })
      const A3 = await run2.load(A.origin)
      expect(A2).to.equal(A3)
    })

    it('should load from mockchain when uncached', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const A3 = await run2.load(A.origin)
      expect(A2.owner).to.equal(run.owner.pubkey)
      expect(A2.owner).to.equal(A2.ownerMocknet)
      expect(A3.owner).to.equal(A2.owner)
    })

    it('should load from testnet', async () => {
      const run = createRun({ network: 'test' })
      const A = await run.load(deployedCodeLocation)
      expect(A.origin).to.equal(deployedCodeLocation)
      expect(A.location).to.equal(deployedCodeLocation)
      expect(A.originTestnet).to.equal(deployedCodeLocation)
      expect(A.locationTestnet).to.equal(deployedCodeLocation)
      expect(A.owner).to.equal(deployedCodeOwner)
      expect(A.ownerTestnet).to.equal(deployedCodeOwner)
      expect(new A().f()).to.equal(1)
      expect(new A().createC().g()).to.equal(1)
    }).timeout(30000)

    it('should throw if load temporary location', async () => {
      class A { f () { return 1 } }
      run.deploy(A).catch(e => {})
      await expect(run.load(A.locationMocknet)).to.be.rejected
    })

    it('should load functions', async () => {
      function f (a, b) { return a + b }
      const f2 = await run.load(await run.deploy(f))
      expect(f(1, 2)).to.equal(f2(1, 2))
    })

    it('should load after deploy with preset', async () => {
      // get a location
      class A { }
      await run.deploy(A)
      // deactivating, which will leave A.location set
      run.deactivate()
      expect(typeof A.location).to.equal('string')
      // deploy the same code again
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.deploy(A)
      // find the sandbox directly, without using load, because we want to make sure deploy works correctly.
      // and using load, make sure the sandboxes are the same
      expect(run2.code.installs.get(A)).to.equal(await run2.load(A.location))
    })

    it('should support dependencies in different transactions', async () => {
      class A {}
      class B extends A {}
      class C {}
      C.B1 = B
      C.B2 = B
      run.deploy(A)
      run.deploy(B)
      run.deploy(C)
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.load(C.location)
    })
  })

  describe('static props', () => {
    it('should support circular props', async () => {
      class A extends Jig { }
      class B extends Jig { }
      A.B = B
      B.A = A
      await run.deploy(A)
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const A2 = await run2.load(A.location)
      const B2 = await run2.load(B.location)
      expect(A2.B).to.equal(B2)
      expect(B2.A).to.equal(A2)
    })

    it('should correctly deploy then load static properties', async () => {
      // TODO: Arbitrary code, support, maps, sets, circular, anonymous class
      class B { }
      class A extends B { }
      class J extends Jig {}
      class K extends Jig {}
      class C { }
      A.deps = { C }
      A.n = 1
      A.s = 'a'
      A.a = [1, 2, 3]
      A.b = true
      A.x = null
      A.o = { m: 1, n: '2' }
      A.j = new J()
      A.k = [new K()]
      class D { }
      A.D = D
      A.E = class E { }
      A.F = { R: class R { } }
      A.Self = A
      A.G = function g () { return 1 }
      // A.anonymousClass = class {}
      // A.anonymousFunction = function () {}
      // A.anonymousLambda = () => {}
      await run.deploy(A)
      expect(D.origin.length > 66 && D.location.length > 66).to.equal(true)
      expect(A.E.origin.length > 66 && A.E.location.length > 66).to.equal(true)
      expect(A.F.R.origin.length > 66 && A.F.R.location.length > 66).to.equal(true)
      const run2 = createRun({ blockchain: run.blockchain })
      const checkAllProperties = async T => {
        expect(T.n).to.equal(A.n)
        expect(T.s).to.equal(A.s)
        expect(T.a).to.deep.equal(A.a)
        expect(T.b).to.equal(A.b)
        expect(T.x).to.equal(A.x)
        expect(T.o).to.deep.equal(A.o)
        expect(T.j.origin).to.equal(A.j.origin)
        expect(T.j.location).to.equal(A.j.location)
        expect(T.k[0].origin).to.equal(A.k[0].origin)
        expect(T.k[0].location).to.equal(A.k[0].location)
        const D2 = await run2.load(A.D.origin)
        expect(T.D).to.equal(D2)
        const E2 = await run2.load(A.E.origin)
        expect(T.E).to.equal(E2)
        const R2 = await run2.load(A.F.R.origin)
        expect(T.F.R).to.equal(R2)
        const C2 = await run2.load(C.origin)
        expect(T.deps).to.deep.equal({ C: C2 })
        expect(T.Self).to.equal(T)
        const G2 = await run2.load(A.G.origin)
        expect(T.G).to.equal(G2)
        // expect(T.anonymousClass).to.equal(await run2.load(A.anonymousClass.origin))
        // expect(T.anonymousFunction).to.equal(await run2.load(A.anonymousFunction.origin))
        // expect(T.anonymousLambda).to.equal(await run2.load(A.anonymousLambda.origin))
      }
      await checkAllProperties(await run2.load(A.origin))
    })

    it('should throw for bad deps', async () => {
      class B { }
      class A extends Jig { }
      A.deps = [B]
      await expect(run.deploy(A)).to.be.rejectedWith('deps must be an object')
      A.deps = B
      await expect(run.deploy(A)).to.be.rejectedWith('deps must be an object')
    })

    it('should throw for bad strings', async () => {
      class A extends Jig { }
      const stringProps = ['origin', 'location', 'originMainnet', 'locationMainnet', 'originTestnet',
        'locationTestnet', 'originStn', 'locationStn', 'originMocknet', 'locationMocknet']
      for (const s of stringProps) {
        A[s] = {}
        await expect(run.deploy(A)).to.be.rejectedWith(`${s} must be a string`)
        A[s] = 123
        await expect(run.deploy(A)).to.be.rejectedWith(`${s} must be a string`)
        delete A[s]
      }
    })

    it('should throw if unpackable', async () => {
      class A { }
      A.date = new Date()
      await expect(run.deploy(A)).to.be.rejectedWith('A static property of A is not supported')
      class B { }
      B.Math = Math
      await expect(run.deploy(B)).to.be.rejectedWith('A static property of B is not supported')
      class C { }
      C.weakSet = new WeakSet()
      await expect(run.deploy(C)).to.be.rejectedWith('A static property of C is not supported')
    })
  })

  describe('sandbox', () => {
    it('should sandbox methods from locals', async () => {
      const s = 'abc'
      class A {
        add (n) { return n + 1 }

        break () { return s }
      }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().add(1)).to.equal(2)
      expect(new A().break()).to.equal('abc')
      expect(() => new A2().break()).to.throw()
    })

    it('should sandbox methods from globals', async () => {
      class A {
        isUndefined (x) {
          if (typeof window !== 'undefined') return typeof window[x] === 'undefined'
          if (typeof global !== 'undefined') return typeof global[x] === 'undefined'
          return true
        }
      }
      const A1 = await run.load(await run.deploy(A))
      const a1 = new A1()
      const bad = ['Date', 'Math', 'eval', 'XMLHttpRequest', 'FileReader', 'WebSocket', 'setTimeout', 'setInterval']
      bad.forEach(x => expect(a1.isUndefined(x)).to.equal(true))
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const A2 = await run2.load(A.origin)
      const a2 = new A2()
      bad.forEach(x => expect(a2.isUndefined(x)).to.equal(true))
    })
  })

  describe('misc', () => {
    it('should pass instanceof checks', async () => {
      class A { }
      const A2 = await run.load(await run.deploy(A))
      expect(new A()).to.be.instanceOf(A)
      expect(new A()).not.to.be.instanceOf(A2)
      expect(new A2()).not.to.be.instanceOf(A)
      expect(new A2()).to.be.instanceOf(A2)
    })
  })

  describe('activate', () => {
    it('should support activating different network', async () => {
      if (Run.instance) Run.instance.deactivate()
      const run = createRun() // Create a new run to have a new code cache
      class A { }
      await run.deploy(A)
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationMocknet)
      expect(A.owner).to.equal(run.owner.pubkey)
      expect(A.ownerMocknet).to.equal(run.owner.pubkey)
      const run2 = createRun({ network: 'test' })
      expect(A.location).to.equal(undefined)
      expect(A.locationMocknet.length).to.equal(67)
      expect(A.owner).to.equal(undefined)
      expect(A.ownerMocknet).to.equal(run.owner.pubkey)
      await run2.deploy(A)
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationTestnet)
      expect(A.owner).to.equal(A.ownerTestnet)
      run.activate()
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationMocknet)
      expect(A.owner).to.equal(A.ownerMocknet)
      expect(run.code.installs.size).to.equal( false ? undefined : 6)
    }).timeout(30000)

    it('should set correct owner for different networks', async () => {
      class A { }
      class B extends Jig { init () { if (this.owner !== A.owner) throw new Error() } }
      B.deps = { A }
      for (const network of ['test', 'mock']) {
        const run = createRun({ network })
        run.transaction.begin()
        run.deploy(A)
        run.deploy(B)
        run.transaction.end()
        await run.sync()
        const b = new B()
        await b.sync()
        run.deactivate()
        const run2 = createRun({ network, owner: run.owner.privkey })
        await run2.sync()
      }
    }).timeout(30000)
  })
})

// ------------------------------------------------------------------------------------------------

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(7)))

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * evaluator.js
 *
 * Tests for ../lib/evaluator.js
 */

const { describe, it } = __webpack_require__(2)
const { expect } = __webpack_require__(1)
const { Run } = __webpack_require__(3)
const { intrinsicNames } = __webpack_require__(10)

// ------------------------------------------------------------------------------------------------
// Evaluator test suite
// ------------------------------------------------------------------------------------------------

function runEvaluatorTestSuite (createEvaluator, destroyEvaluator) {
  describe('evaluate parameters', () => {
    it('should evaluate named function', () => {
      const evaluator = createEvaluator()
      const [f] = evaluator.evaluate('function f() { return 1 }')
      expect(typeof f).to.equal('function')
      expect(f.name).to.equal('f')
      expect(f()).to.equal(1)
      destroyEvaluator(evaluator)
    })

    it('should evaluate anonymous function', () => {
      const evaluator = createEvaluator()

      const [f] = evaluator.evaluate('function () { return "123" }')
      expect(typeof f).to.equal('function')
      expect(f.name).to.equal('anonymousFunction')
      expect(f()).to.equal('123')

      const [g] = evaluator.evaluate('() => { return [] }')
      expect(typeof g).to.equal('function')
      expect(g.name).to.equal('anonymousFunction')
      expect(g()).to.deep.equal([])

      destroyEvaluator(evaluator)
    })

    it('should evaluate named class', () => {
      const evaluator = createEvaluator()
      const [T] = evaluator.evaluate('class A { }')
      expect(typeof T).to.equal('function')
      expect(T.name).to.equal('A')
      destroyEvaluator(evaluator)
    })

    it('should evaluate anonymous class', () => {
      const evaluator = createEvaluator()
      const [T] = evaluator.evaluate('class { }')
      expect(typeof T).to.equal('function')
      expect(T.name).to.equal('AnonymousClass')
      destroyEvaluator(evaluator)
    })

    it('should throw if code is not a string', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate()).to.throw('Code must be a string. Received: undefined')
      expect(() => evaluator.evaluate(123)).to.throw('Code must be a string. Received: 123')
      expect(() => evaluator.evaluate(function f () {})).to.throw('Code must be a string. Received: ')
      destroyEvaluator(evaluator)
    })

    it('should throw if env is not an object', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('()=>{}', false)).to.throw('Environment must be an object. Received: false')
      expect(() => evaluator.evaluate('()=>{}', 123)).to.throw('Environment must be an object. Received: 123')
      expect(() => evaluator.evaluate('()=>{}', class A {})).to.throw('Environment must be an object. Received: ')
      destroyEvaluator(evaluator)
    })

    it('should throw if env contains $globals', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('()=>{}', { $globals: {} })).to.throw('Environment must not contain $globals')
      destroyEvaluator(evaluator)
    })

    it('should throw if evaluated code throws', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('throw new Error()')).to.throw()
      expect(() => evaluator.evaluate('x.y = z')).to.throw()
      destroyEvaluator(evaluator)
    })
  })

  describe('environment', () => {
    it('should place environment parent class in scope', () => {
      const evaluator = createEvaluator()
      const [A] = evaluator.evaluate('class A {}')
      evaluator.evaluate('class B extends A {}', { A })
      destroyEvaluator(evaluator)
    })

    it('should place environment constant in scope', () => {
      const evaluator = createEvaluator()
      const [f] = evaluator.evaluate('function f() { return CONSTANT }', { CONSTANT: 5 })
      expect(f()).to.equal(5)
      destroyEvaluator(evaluator)
    })

    it('should place environment function in scope', () => {
      const evaluator = createEvaluator()
      const [f] = evaluator.evaluate('function f() { return 1 }')
      const [g] = evaluator.evaluate('function g() { return f() + 1 }', { f })
      expect(g()).to.equal(2)
      destroyEvaluator(evaluator)
    })

    it('should place environment related class in scope', () => {
      const evaluator = createEvaluator()
      const [Z] = evaluator.evaluate('class Z {}')
      evaluator.evaluate('class Y { constructor() { this.a = new Z() } }', { Z })
      destroyEvaluator(evaluator)
    })

    it('should throw if parent class is not in environment', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('class B extends MissingClass {}')).to.throw('MissingClass is not defined')
      destroyEvaluator(evaluator)
    })

    it('should throw if called function is not in environment', () => {
      const evaluator = createEvaluator()
      const [f] = evaluator.evaluate('function f() { return missingFunction() }')
      expect(() => f()).to.throw('missingFunction is not defined')
      destroyEvaluator(evaluator)
    })

    it('should share intrinsics between evaluations', () => {
      const evaluator = createEvaluator()
      intrinsicNames.forEach(name => {
        if (typeof global[name] === 'undefined') return
        const intrinsic1 = evaluator.evaluate(`function f() { return ${name} }`)[0]()
        const intrinsic2 = evaluator.evaluate(`function f() { return ${name} }`)[0]()
        expect(intrinsic1).to.equal(intrinsic2)
      })
      destroyEvaluator(evaluator)
    })
  })

  describe('globals', () => {
    it('should support setting related classes', () => {
      const evaluator = createEvaluator()
      const [A, globals] = evaluator.evaluate('class A { createB() { return new B() } }')
      globals.B = class B { }
      expect(() => new A().createB()).not.to.throw()
      destroyEvaluator(evaluator)
    })

    it('should support setting related functions', () => {
      const evaluator = createEvaluator()
      const [f, globals] = evaluator.evaluate('function f () { return g() }')
      globals.g = function g () { return 3 }
      expect(f()).to.equal(3)
      destroyEvaluator(evaluator)
    })

    it('should support setting related constants', () => {
      const evaluator = createEvaluator()
      const [f, globals] = evaluator.evaluate('function f () { return NUM }')
      globals.NUM = 42
      expect(f()).to.equal(42)
      destroyEvaluator(evaluator)
    })

    it('should support setting getters ', () => {
      const evaluator = createEvaluator()
      const [f, globals] = evaluator.evaluate('function f () { return someValue }')
      Object.defineProperty(globals, 'someValue', { configurable: true, get: () => 4 })
      expect(f()).to.equal(4)
      destroyEvaluator(evaluator)
    })
  })
}

// ------------------------------------------------------------------------------------------------
// Evaluator tests
// ------------------------------------------------------------------------------------------------

describe('Evaluator', () => {
  const createEvaluator = () => new Run.Evaluator()
  const destroyEvaluator = evaluator => evaluator.deactivate()
  runEvaluatorTestSuite(createEvaluator, destroyEvaluator)

  describe('willSandbox', () => {
    it('should return whether name matches when regex', () => {
      const fCode = function f () { }.toString()
      const ACode = (class A {}).toString()
      const BCode = (class B {}).toString()
      const AnonClassCode = (class {}).toString()
      const AnonFunctionCode = (() => {}).toString()
      const evaluator = new Run.Evaluator({ sandbox: /(f|B)/ })
      expect(evaluator.willSandbox(fCode)).to.equal(true)
      expect(evaluator.willSandbox(ACode)).to.equal(false)
      expect(evaluator.willSandbox(BCode)).to.equal(true)
      expect(evaluator.willSandbox(AnonClassCode)).to.equal(false)
      expect(evaluator.willSandbox(AnonFunctionCode)).to.equal(false)
    })

    it('should return sandbox option when boolean', () => {
      const code = function f () { }.toString()
      expect(new Run.Evaluator({ sandbox: true }).willSandbox(code)).to.equal(true)
      expect(new Run.Evaluator({ sandbox: false }).willSandbox(code)).to.equal(false)
    })
  })

  it('should support deactivate and activate', () => {
    function f () { return g } // eslint-disable-line
    const evaluator = new Run.Evaluator({ sandbox: false })
    const f2 = evaluator.evaluate(f.toString(), { g: 2 })[0]
    expect(f2()).to.equal(2)
    evaluator.deactivate()
    expect(() => f2()).to.throw()
    evaluator.activate()
    expect(f2()).to.equal(2)
  })
})

describe('SESEvaluator', () => {
  const createEvaluator = () => new Run.Evaluator.SESEvaluator()
  const destroyEvaluator = () => {}
  runEvaluatorTestSuite(createEvaluator, destroyEvaluator)

  it('should ban non-deterministic globals', () => {
    const evaluator = createEvaluator()
    Run.Evaluator.nonDeterministicGlobals.forEach(key => {
      expect(!!evaluator.evaluate(key)[0]).to.equal(false)
    })
  })

  it('should prevent access to the global scope', () => {
    const evaluator = createEvaluator()
    expect(evaluator.evaluate('typeof window === "undefined" && typeof global === "undefined"')[0]).to.equal(true)
  })
})

describe('GlobalEvaluator', () => {
  const createEvaluator = options => new Run.Evaluator.GlobalEvaluator(options)
  const destroyEvaluator = evaluator => evaluator.deactivate()
  runEvaluatorTestSuite(createEvaluator, destroyEvaluator)

  it('should detect setting the same global twice in environment', () => {
    let warned = false
    const logger = { warn: () => { warned = true } }
    const evaluator = createEvaluator({ logger })
    evaluator.evaluate('globalToSetTwice', { globalToSetTwice: 1 })
    evaluator.evaluate('globalToSetTwice', { globalToSetTwice: 2 })
    expect(warned).to.equal(true)
    destroyEvaluator(evaluator)
  })

  it('should detect setting the same global twice in globals', () => {
    let warned = false
    const logger = { warn: () => { warned = true } }
    const evaluator = createEvaluator({ logger })
    const globals1 = evaluator.evaluate('function f() { }')[1]
    const globals2 = evaluator.evaluate('function f() { }')[1]
    Object.defineProperty(globals1, 'globalToSetTwice', { configurable: true, value: 1 })
    Object.defineProperty(globals2, 'globalToSetTwice', { configurable: true, value: 2 })
    expect(warned).to.equal(true)
    destroyEvaluator(evaluator)
  })

  it('should correctly deactivate globals', () => {
    const evaluator = createEvaluator()
    const globals = evaluator.evaluate('1', { x: 1 })[1]
    globals.y = 2
    expect(x).to.equal(1) // eslint-disable-line
    expect(y).to.equal(2) // eslint-disable-line
    destroyEvaluator(evaluator)
    expect(typeof x).to.equal('undefined')
    expect(typeof y).to.equal('undefined')
  })

  it('should correctly reactivate globals', () => {
    const evaluator = createEvaluator()
    evaluator.evaluate('1', { x: 1 })
    expect(x).to.equal(1) // eslint-disable-line
    evaluator.deactivate()
    expect(typeof x).to.equal('undefined')
    evaluator.activate()
    expect(x).to.equal(1) // eslint-disable-line
    destroyEvaluator(evaluator)
  })
})

// ------------------------------------------------------------------------------------------------

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(7)))

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * expect.js
 *
 * Tests for ../lib/expect.js
 */

const { describe, it, beforeEach } = __webpack_require__(2)
const { expect } = __webpack_require__(1)
const { Run, Jig, createRun, deploy } = __webpack_require__(3)

describe('expect', () => {
  const run = createRun()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())

  it('should support toBe', () => {
    expect(() => Run.expect(1).toBe(1)).not.to.throw()
    expect(() => Run.expect('hello').toBe('hello')).not.to.throw()
    expect(() => Run.expect(null).toBe(null)).not.to.throw()
    expect(() => Run.expect({}).toBe({})).to.throw('expected value to be {} but was {}')
    expect(() => Run.expect(1).not.toBe(2)).not.to.throw()
    expect(() => Run.expect({}).not.toBe({})).not.to.throw()
    expect(() => Run.expect(null).not.toBe(null)).to.throw('expected value not to be null but was null')
    class A extends Jig { }
    const a = new A() // an un-synced jig
    expect(() => Run.expect(a).toBe(a)).not.to.throw()
    expect(() => Run.expect(a).toBe(null)).to.throw()
  })

  it('should support toEqual', () => {
    expect(() => Run.expect(1).toEqual(1)).not.to.throw()
    expect(() => Run.expect(true).toEqual(true)).not.to.throw()
    expect(() => Run.expect({}).toEqual({})).not.to.throw()
    expect(() => Run.expect({ a: [1] }).toEqual({ a: [1] })).not.to.throw()
    expect(() => Run.expect([1, '2', { n: 3 }]).toEqual([1, '2', { n: 3 }])).not.to.throw()
    expect(() => Run.expect([1]).toEqual([2])).to.throw('expected value to be equal to [2] but was [1]')
    expect(() => Run.expect(new class A {}()).toEqual(new class B {}())).not.to.throw()
    expect(() => Run.expect({ a: 1 }).not.toEqual({ a: 2 })).not.to.throw()
    expect(() => Run.expect(new class A {}()).not.toEqual({ })).to.throw('expected value not to be equal to {} but was {}')
  })

  it('should support toBeInstanceOf', () => {
    class A {}
    class B extends A {}
    expect(() => Run.expect(new A()).toBeInstanceOf(A)).not.to.throw()
    expect(() => Run.expect(new B()).toBeInstanceOf(B)).not.to.throw()
    expect(() => Run.expect(new B()).toBeInstanceOf(A)).not.to.throw()
    expect(() => Run.expect([]).toBeInstanceOf(Array)).not.to.throw()
    expect(() => Run.expect(1).toBeInstanceOf(A)).to.throw('expected value to be an instance of A but was 1')
    expect(() => Run.expect(new A()).not.toBeInstanceOf(B)).not.to.throw()
    expect(() => Run.expect(new A()).not.toBeInstanceOf(A)).to.throw('expected value not to be an instance of A but was {}')
  })

  it('should support toBeDefined', () => {
    expect(() => Run.expect(1).toBeDefined()).not.to.throw()
    expect(() => Run.expect(undefined).toBeDefined()).to.throw('expected value to be defined but was undefined')
    expect(() => Run.expect().not.toBeDefined()).not.to.throw()
    expect(() => Run.expect(undefined).not.toBeDefined()).not.to.throw()
    expect(() => Run.expect(0).not.toBeDefined()).to.throw('expected value not to be defined but was 0')
  })

  it('should support toBeNull', () => {
    expect(() => Run.expect(null).toBeNull()).not.to.throw()
    expect(() => Run.expect(0).toBeNull()).to.throw('expected value to be null but was 0')
    expect(() => Run.expect(false).not.toBeNull()).not.to.throw()
    expect(() => Run.expect(null).not.toBeNull()).to.throw('expected value not to be null but was null')
  })

  it('should support toBeNumber', () => {
    expect(() => Run.expect(0).toBeNumber()).not.to.throw()
    expect(() => Run.expect(5).toBeNumber()).not.to.throw()
    expect(() => Run.expect(1.1).toBeNumber()).not.to.throw()
    expect(() => Run.expect(NaN).toBeNumber()).not.to.throw()
    expect(() => Run.expect(Infinity).toBeNumber()).not.to.throw()
    expect(() => Run.expect(false).toBeNumber()).to.throw('expected value to be a number but was false')
    expect(() => Run.expect('0').toBeNumber('bad argument')).to.throw('bad argument')
    expect(() => Run.expect('hello').not.toBeNumber()).not.to.throw()
    expect(() => Run.expect(5).not.toBeNumber()).to.throw('expected value not to be a number but was 5')
  })

  it('should support toBeInteger', () => {
    expect(() => Run.expect(0).toBeInteger()).not.to.throw()
    expect(() => Run.expect(1).toBeInteger()).not.to.throw()
    expect(() => Run.expect(1.1).toBeInteger()).to.throw('expected value to be an integer but was 1.1')
    expect(() => Run.expect(NaN).toBeInteger()).to.throw('expected value to be an integer but was NaN')
    expect(() => Run.expect(false).toBeInteger()).to.throw('expected value to be an integer but was false')
    expect(() => Run.expect('hello').not.toBeInteger()).not.to.throw()
    expect(() => Run.expect(5).not.toBeInteger()).to.throw('expected value not to be an integer but was 5')
  })

  it('should support toBeLessThan', () => {
    expect(() => Run.expect(0).toBeLessThan(1)).not.to.throw()
    expect(() => Run.expect(-1.2).toBeLessThan(-1.1)).not.to.throw()
    expect(() => Run.expect(false).toBeLessThan(0)).to.throw('expected value to be less than 0 but was false')
    expect(() => Run.expect(0).not.toBeLessThan(0)).not.to.throw()
    expect(() => Run.expect(-1).not.toBeLessThan(0)).to.throw('expected value not to be less than 0 but was -1')
  })

  it('should support toBeLessThanOrEqualTo', () => {
    expect(() => Run.expect(1).toBeLessThanOrEqualTo(1)).not.to.throw()
    expect(() => Run.expect(-1.2).toBeLessThanOrEqualTo(-1.1)).not.to.throw()
    expect(() => Run.expect(false).toBeLessThanOrEqualTo(0)).to.throw('expected value to be less than or equal to 0 but was false')
    expect(() => Run.expect(1).not.toBeLessThanOrEqualTo(0)).not.to.throw()
    expect(() => Run.expect(0).not.toBeLessThanOrEqualTo(0)).to.throw('expected value not to be less than or equal to 0 but was 0')
  })

  it('should support toBeGreaterThan', () => {
    expect(() => Run.expect(1).toBeGreaterThan(0)).not.to.throw()
    expect(() => Run.expect(-1.1).toBeGreaterThan(-1.2)).not.to.throw()
    expect(() => Run.expect(false).toBeGreaterThan(0)).to.throw('expected value to be greater than 0 but was false')
    expect(() => Run.expect(0).not.toBeGreaterThan(0)).not.to.throw()
    expect(() => Run.expect(0).not.toBeGreaterThan(-1)).to.throw('expected value not to be greater than -1 but was 0')
  })

  it('should support toBeGreaterThanOrEqualTo', () => {
    expect(() => Run.expect(1).toBeGreaterThanOrEqualTo(1)).not.to.throw()
    expect(() => Run.expect(-1.1).toBeGreaterThanOrEqualTo(-1.2)).not.to.throw()
    expect(() => Run.expect(false).toBeGreaterThanOrEqualTo(0)).to.throw('expected value to be greater than or equal to 0 but was false')
    expect(() => Run.expect(0).not.toBeGreaterThanOrEqualTo(1)).not.to.throw()
    expect(() => Run.expect(0).not.toBeGreaterThanOrEqualTo(0)).to.throw('expected value not to be greater than or equal to 0 but was 0')
  })

  it('should support toBeBoolean', () => {
    expect(() => Run.expect(true).toBeBoolean()).not.to.throw()
    expect(() => Run.expect(1).toBeBoolean()).to.throw('expected value to be a boolean but was 1')
    expect(() => Run.expect('true').not.toBeBoolean()).not.to.throw()
    expect(() => Run.expect(false).not.toBeBoolean()).to.throw('expected value not to be a boolean but was false')
  })

  it('should support toBeString', () => {
    expect(() => Run.expect('hello').toBeString()).not.to.throw()
    expect(() => Run.expect(true).toBeString()).to.throw('expected value to be a string but was true')
    expect(() => Run.expect(1).not.toBeString()).not.to.throw()
    expect(() => Run.expect('hello').not.toBeString()).to.throw('expected value not to be a string but was hello')
  })

  it('should support toBeObject', () => {
    expect(() => Run.expect({}).toBeObject()).not.to.throw()
    expect(() => Run.expect([1, 2, 3]).toBeObject()).not.to.throw()
    expect(() => Run.expect(null).toBeObject()).to.throw('expected value to be an object but was null')
    expect(() => Run.expect(true).toBeObject()).to.throw('expected value to be an object but was true')
    expect(() => Run.expect(1).not.toBeObject()).not.to.throw()
    expect(() => Run.expect(null).not.toBeObject()).not.to.throw()
    expect(() => Run.expect({}).not.toBeObject()).to.throw('expected value not to be an object but was {}')
  })

  it('should support toBeArray', () => {
    expect(() => Run.expect([]).toBeArray()).not.to.throw()
    expect(() => Run.expect(new Array(1)).toBeArray()).not.to.throw()
    expect(() => Run.expect({}).toBeArray()).to.throw('expected value to be an array but was {}')
    expect(() => Run.expect(1).not.toBeArray()).not.to.throw()
    expect(() => Run.expect(null).not.toBeArray()).not.to.throw()
    expect(() => Run.expect([1, 2]).not.toBeArray()).to.throw('expected value not to be an array but was [1,2]')
  })

  it('should support toBeClass', () => {
    expect(() => Run.expect(class A {}).toBeClass()).not.to.throw()
    expect(() => Run.expect(class {}).toBeClass()).not.to.throw()
    expect(() => Run.expect(function f () {}).toBeClass()).to.throw('expected value to be a class but was')
    expect(() => Run.expect(() => {}).toBeClass()).to.throw('expected value to be a class but was')
    expect(() => Run.expect({}).not.toBeClass()).not.to.throw()
    expect(() => Run.expect(class A {}).not.toBeClass()).to.throw('expected value not to be a class but was')
  })

  it('should support toBeFunction', () => {
    expect(() => Run.expect(function f () {}).toBeFunction()).not.to.throw()
    expect(() => Run.expect(() => {}).toBeFunction()).not.to.throw()
    expect(() => Run.expect(class A {}).toBeFunction()).to.throw('expected value to be a function but was class A {}')
    expect(() => Run.expect(class {}).toBeFunction()).to.throw('expected value to be a function but was class {}')
    expect(() => Run.expect([]).not.toBeFunction()).not.to.throw()
    expect(() => Run.expect(() => {}).not.toBeFunction()).to.throw('expected value not to be a function but was () => {}')
  })

  it.skip('should deploy', async () => {
    await deploy(Run.expect)
  }).timeout(30000)
})


/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * jig.js
 *
 * Tests for ../lib/jig.js
 */

const { describe, it, beforeEach } = __webpack_require__(2)
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
chai.use(chaiAsPromised)
const { expect } = chai
const { PrivateKey } = __webpack_require__(0)
const { Run, Jig, createRun, hookPay, hookStoreAction, expectAction, expectNoAction } = __webpack_require__(3)

describe('Jig', () => {
  const run = hookStoreAction(createRun())
  beforeEach(() => run.blockchain.block())
  beforeEach(() => run.activate())

  describe('constructor', () => {
    it('should create basic jig', async () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(run.code.installs.has(A)).to.equal(true)
      await run.sync()
      expect(A.origin.length).to.equal(67)
    })

    it('throws if not extended', () => {
      expect(() => new Jig()).to.throw()
      expectNoAction()
    })

    it('throws if constructor method exists', () => {
      class A extends Jig { constructor () { super(); this.n = 1 } }
      expect(() => new A()).to.throw('Jig must use init() instead of constructor()')
      expectNoAction()
    })

    it('should call init method with constructor args', () => {
      class A extends Jig { init (a, b) { this.a = a; this.b = b } }
      const a = new A(1, 'z')
      expectAction(a, 'init', [1, 'z'], [], [a], [])
      expect(a.a).to.equal(1)
      expect(a.b).to.equal('z')
    })

    it('should all supers', async () => {
      class A extends Jig { f () { this.a = true }}
      class B extends A { f () { super.f(); this.b = true }}
      class C extends B { f () { super.f(); this.c = true }}
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      c.f()
      expectAction(c, 'f', [], [c], [c], [])
      expect(c.a).to.equal(true)
      expect(c.b).to.equal(true)
      expect(c.c).to.equal(true)
    })
  })

  describe('sandbox', () => {
    it('should throw if access external variables', () => {
      let n = 1 // eslint-disable-line
      class A extends Jig { init () { n = 2 } }
      expect(() => new A()).to.throw()
      expectNoAction()
      global.x = 1 // eslint-disable-line
      class B extends Jig { init () { x = 2 } } // eslint-disable-line
      expect(() => new B()).to.throw()
      expectNoAction()
      delete global.x
    })

    it('should throw if access jig control', () => {
      class A extends Jig { init () { JigControl.stack.push(1) } } // eslint-disable-line
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should throw if access globals', () => {
      class A extends Jig {
        isUndefined (x) {
          if (typeof window !== 'undefined') return typeof window[x] === 'undefined'
          if (typeof global !== 'undefined') return typeof global[x] === 'undefined'
          return true
        }
      }
      const a = new A()
      const bad = ['Date', 'Math', 'eval', 'XMLHttpRequest', 'FileReader', 'WebSocket', 'setTimeout', 'setInterval']
      bad.forEach(x => expect(a.isUndefined(x)).to.equal(true))
    })

    it('should throw useful error when creating date', () => {
      class A extends Jig { createDate () { return new Date() } }
      const a = new A()
      expect(() => a.createDate()).to.throw('Hint: Date is disabled inside jigs because it is non-deterministic.')
    })
  })

  describe('instanceof', () => {
    it('should match basic jigs', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a).to.be.instanceOf(A)
      expect(a).to.be.instanceOf(Jig)
    })

    it('should match class extensions', () => {
      class A extends Jig { }
      class B extends A { }
      class C extends Jig { }
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      expect(b).to.be.instanceOf(A)
      expect(b).to.be.instanceOf(B)
      expect(b).to.be.instanceOf(Jig)
      expect(c).not.to.be.instanceOf(B)
      expect(c).to.be.instanceOf(Jig)
    })

    it('should not match non-instances', () => {
      expect(new class { }()).not.to.be.instanceOf(Jig)
      expect(new class { }() instanceof Jig).to.equal(false)
    })

    it('should support searching owner for an uninstalled class', async () => {
      class A extends Jig { }
      class B extends Jig { }
      const a = new A() // eslint-disable-line
      await a.sync()
      run.owner.jigs.find(jig => jig instanceof B)
    })

    it('should match loaded instances', async () => {
      class A extends Jig { }
      const a = new A()
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      expect(a2 instanceof A).to.equal(true)
    })

    it('should not match prototypes', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.constructor.prototype instanceof Jig).to.equal(false)
      expect(Object.getPrototypeOf(a) instanceof Jig).to.equal(false)
    })
  })

  describe('init', () => {
    it('should throw if called externally', () => {
      class A extends Jig { init (n) { this.n = n } }
      const a = new A(5)
      expectAction(a, 'init', [5], [], [a], [])
      expect(() => a.init(6)).to.throw()
      expectNoAction()
    })

    it('should throw if called internally', () => {
      class A extends Jig {
        init (n) { this.n = n }

        f (n) { this.init(n) }
      }
      const a = new A(5)
      expectAction(a, 'init', [5], [], [a], [])
      expect(() => a.f(6)).to.throw()
      expectNoAction()
    })

    it('should throw if init returns a value', async () => {
      class A extends Jig { init () { return {} }}
      expect(() => new A()).to.throw()
    })
  })

  describe('sync', () => {
    it('should set origins and locations on class and instance', async () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = await a.sync()
      expect(a).to.equal(a2)
      expect(A.origin.length).to.equal(67)
      expect(A.origin.endsWith('_o1')).to.equal(true)
      expect(A.location.length).to.equal(67)
      expect(A.location.endsWith('_o1')).to.equal(true)
      expect(a.origin.length).to.equal(67)
      expect(a.origin.endsWith('_o2')).to.equal(true)
      expect(a.location.length).to.equal(67)
      expect(a.location.endsWith('_o2')).to.equal(true)
    })

    it('should throw if called internally', () => {
      class A extends Jig { init () { this.sync() } }
      class B extends Jig { f () { this.sync() } }
      expect(() => new A()).to.throw()
      expectNoAction()
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f()).to.throw()
      expectNoAction()
    })

    it('should throw if override sync', () => {
      class A extends Jig { sync () { } }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should forward sync', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      await run.sync()
      const a2 = await run2.load(a.location)
      a2.set(1)
      a2.set(2)
      await a2.sync()
      run.activate()
      expect(a.x).to.equal(undefined)
      await a.sync()
      expect(a.x).to.equal(2)
    })

    it('should forward sync inner jigs', async () => {
      class Store extends Jig { set (x, y) { this[x] = y } }
      const a = new Store()
      expectAction(a, 'init', [], [], [a], [])
      const b = new Store()
      expectAction(b, 'init', [], [], [b], [])
      a.set('b', b)
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const b2 = await run2.load(b.location)
      b2.set('n', 1)
      await b2.sync()
      run.activate()
      expect(a.b.n).to.equal(undefined)
      await a.sync()
      expect(a.b.n).to.equal(1)
    })

    it('should forward sync circularly referenced jigs', async () => {
      class A extends Jig { setB (b) { this.b = b } }
      class B extends Jig { setA (a) { this.a = a } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      a.setB(b)
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      b2.setA(a2)
      await b2.sync()
      run.activate()
      expect(a.b.a).to.equal(undefined)
      await a.sync()
      expect(a.b.a.location).to.equal(a.location)
    })

    it('should support disabling forward sync', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      a2.set(1)
      await a2.sync()
      run.activate()
      expect(a.x).to.equal(undefined)
      await a.sync({ forward: false })
      expect(a.x).to.equal(undefined)
    })

    it('should throw if forward sync is unsupported', async () => {
      class A extends Jig { }
      const a = new A()
      await a.sync() // pending transactions must publish first
      const oldFetch = run.blockchain.fetch
      run.blockchain.fetch = async (...args) => {
        const tx = await oldFetch.call(run.blockchain, ...args)
        tx.outputs.forEach(output => delete output.spentTxId)
        tx.outputs.forEach(output => delete output.spentIndex)
        tx.outputs.forEach(output => delete output.spentHeight)
        return tx
      }
      await expect(a.sync()).to.be.rejectedWith('Failed to forward sync jig')
      run.blockchain.fetch = oldFetch
    })

    it('should throw if attempt to update an old state', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      a2.set(1)
      await a2.sync()
      run.activate()
      a.set(2)
      await expect(a.sync()).to.be.rejectedWith('tx input 0 missing or spent')
      expect(a.x).to.equal(1)
    })

    it('should throw if spentTxId is missing', async () => {
      class A extends Jig { }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const tx = await run.blockchain.fetch(a.location.slice(0, 64))
      tx.outputs[2].spentTxId = '123'
      tx.outputs[2].spentIndex = 0
      await expect(a.sync()).to.be.rejectedWith('tx not found')
    })

    it('should throw if spentTxId is incorrect', async () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      await run.sync()
      const tx = await run.blockchain.fetch(a.location.slice(0, 64))
      tx.outputs[2].spentTxId = b.location.slice(0, 64)
      tx.outputs[2].spentIndex = 0
      await expect(a.sync()).to.be.rejectedWith('Blockchain API returned an incorrect spentTxId')
    })

    it('should not throw if sync jig updated by another', async () => {
      class A extends Jig {
        set (x) { this.x = x }
      }
      class B extends Jig {
        init (a) { this.a = a }
        setA (x) { this.a.set(x) }
      }
      const a = new A()
      const b = new B(a)
      b.setA(1)
      await run.sync()
      const a2 = await run.load(a.origin)
      await expect(a2.sync()).not.to.be.rejected
    })
  })

  describe('method', () => {
    it('should support passing null in args', async () => {
      class Dragon extends Jig {
        init (lair) {
          this.lair = lair
        }
      }
      const dragon = new Dragon(null)
      await dragon.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const dragon2 = await run2.load(dragon.location)
      expect(dragon).to.deep.equal(dragon2)
    })

    it('should support swapping inner jigs', () => {
      class A extends Jig {
        setX (a) { this.x = a }

        setY (a) { this.y = a }

        swapXY () { const t = this.x; this.x = this.y; this.y = t }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      const c = new A()
      expectAction(c, 'init', [], [], [c], [])
      a.setX(b)
      expectAction(a, 'setX', [b], [a], [a], [])
      a.setY(c)
      expectAction(a, 'setY', [c], [a], [a], [])
      a.swapXY()
      expectAction(a, 'swapXY', [], [a], [a], [a])
    })

    it('should restore old state if method throws', () => {
      class Outer extends Jig { setN () { this.n = 1 } }
      class Inner extends Jig { setZ () { this.z = 1 } }
      class Revertable extends Jig {
        init () {
          this.n = 1
          this.arr = ['a', { b: 1 }]
          this.self = this
          this.inner = new Inner()
        }

        methodThatThrows (outer) {
          outer.setN()
          this.n = 2
          this.arr[2].b = 2
          this.arr.push(3)
          this.inner.setZ()
          throw new Error()
        }
      }
      Revertable.deps = { Inner }
      const main = new Revertable()
      expectAction(main, 'init', [], [], [main, main.inner], [])
      const outer = new Outer()
      expectAction(outer, 'init', [], [], [outer], [])
      expect(() => main.methodThatThrows(outer)).to.throw()
      expectNoAction()
      expect(main.n).to.equal(1)
      expect(main.arr).to.deep.equal(['a', { b: 1 }])
      expect(main.self).to.equal(main)
      expect(main.inner.z).to.equal(undefined)
      expect(outer.n).to.equal(undefined)
    })

    it('should throw if swallow internal errors', () => {
      class B extends Jig { init () { throw new Error('some error message') } }
      class A extends Jig { f () { try { return new B() } catch (e) { } } }
      A.deps = { B }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('internal errors must not be swallowed\n\nError: some error message')
      expectNoAction()
    })

    it('should support calling static helpers', () => {
      class Preconditions { static checkArgument (b) { if (!b) throw new Error() } }
      class A extends Jig { set (n) { $.checkArgument(n > 0); this.n = n } } // eslint-disable-line
      A.deps = { $: Preconditions }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.set(0)).to.throw()
      expectNoAction()
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
    })

    it('should throw if set a property directly on another jig in the call stack', () => {
      class A extends Jig {
        setB (b) { this.b = b }

        g () { this.b.n = 1 }
      }
      class B extends Jig {
        setA (a) { this.a = a }

        f () { this.a.g() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      a.setB(b)
      expectAction(a, 'setB', [b], [a], [a], [])
      b.setA(a)
      expectAction(b, 'setA', [a], [b], [b], [])
      expect(() => b.f()).to.throw()
      expectNoAction()
    })

    it('should throw if update on wrong network', async () => {
      class A extends Jig { f () { this.n = 1; return this } }
      const a = await new A().sync()
      createRun({ network: 'test' })
      await expect(a.f().sync()).to.be.rejectedWith('Signature missing for A')
    }).timeout(30000)
  })

  describe('arguments', () => {
    it('should support serializable arguments', () => {
      class A extends Jig { f (...args) { this.args = args } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      a.f(1, 'a', true)
      expectAction(a, 'f', [1, 'a', true], [a], [a], [])
      a.f({ n: 1 }, [1, 2, 3])
      expectAction(a, 'f', [{ n: 1 }, [1, 2, 3]], [a], [a], [])
      a.f({ a: { b: {} } }, { a: [1, 2, 3] })
      expectAction(a, 'f', [{ a: { b: {} } }, { a: [1, 2, 3] }], [a], [a], [])
      a.f(a, [a], { a })
      expectAction(a, 'f', [a, [a], { a }], [a], [a], [])
      a.f(new Set())
      expectAction(a, 'f', [new Set()], [a], [a], [])
      a.f(new Map())
      expectAction(a, 'f', [new Map()], [a], [a], [])
      const g = () => {}
      a.f(g)
      expectAction(a, 'f', [g], [a], [a], [])
      const blob = new (class Blob {})()
      a.f(blob)
      expectAction(a, 'f', [blob], [a], [a], [])
    })

    it('should throw if not arguments not serializable', () => {
      class A extends Jig { f (...args) { this.args = args } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f(NaN)).to.throw('NaN cannot be serialized')
      expectNoAction()
      expect(() => a.f(Infinity)).to.throw('Infinity cannot be serialized')
      expectNoAction()
      expect(() => a.f(Symbol.hasInstance)).to.throw('Symbol(Symbol.hasInstance) cannot be serialized')
    })

    it('should support changing args in method', () => {
      class A extends Jig { f (arr, obj) { arr.pop(); obj.n = 1; this.n = 0 } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f([1], { n: 0 })
      expectAction(a, 'f', [[1], { n: 0 }], [a], [a], [])
    })

    it('should allow checking jig constructors', async () => {
      class A extends Jig { init (b) { this.test = b.constructor === B } }
      class B extends Jig { init () { this.x = A.owner } }
      A.deps = { B }
      B.deps = { A }
      await run.deploy(A)
      await run.deploy(B)
      const b = new B()
      const a = new A(b)
      expect(b.x).to.equal(run.owner.pubkey)
      expect(a.test).to.equal(true)
      await run.sync()
      run.deactivate()
      const run2 = createRun({ owner: run.owner.privkey, blockchain: run.blockchain })
      await run2.sync()
    })
  })

  describe('get', () => {
    it('should not publish transaction if no changes', () => {
      class B extends Jig {
        set (n) { this.n = n }

        get (n) { return this.n + n }
      }
      class A extends B {
        init () { this.b = new B(); this.b.set(1) }

        get (n) { return this.b.get(4) + super.get(n) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a, a.b], [a])
      a.set(2)
      expectAction(a, 'set', [2], [a], [a], [])
      expect(a.get(3)).to.equal(10)
      expectNoAction()
    })

    it('should not spend reads', () => {
      class B extends Jig { }
      class A extends Jig { init (b) { this.n = b.n } }
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const a = new A(b)
      expectAction(a, 'init', [b], [], [a], [b])
    })

    it('should support gettesr', async () => {
      class A extends Jig {
        init () { this.n = 1 }

        get nplusone () { return this.n + 1 }
      }
      class B extends Jig {
        init (a) { this.n = a.nplusone }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.nplusone).to.equal(2)
      const b = new B(a)
      expectAction(b, 'init', [a], [], [b], [a])
      expect(b.n).to.equal(2)
      await run.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(2)
    })
  })

  describe('spending rules', () => {
    it('should spend all callers when a jig changes', async () => {
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig { set (a, n) { a.set(n); return this } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.set(a, 2)
      expectAction(b, 'set', [a, 2], [b, a], [b, a], [])
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should spend all callers for instantiation', async () => {
      class A extends Jig { create () { return new A() } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = a.create()
      expectAction(a, 'create', [], [a], [a, a2], [])
      await run.sync()
      await run.load(a2.location)
    })

    it('should spend all callers across multiple call stacks', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { f (a, c) { a.set(1); c.g(a) } }
      class C extends Jig { g (a) { a.set(2) } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      b.f(a, c)
      expectAction(b, 'f', [a, c], [b, c, a], [b, c, a], [])
      expect(a.n).to.equal(2)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should support calling self', async () => {
      class A extends Jig {
        g (b, c) { b.h(this, c) }

        set (n) { this.n = n }
      }
      class B extends Jig {
        f (a, c) { a.g(this, c) }

        h (a, c) { c.set(a, 1) }
      }
      class C extends Jig {
        set (a, n) { a.set(n) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      b.f(a, c)
      expectAction(b, 'f', [a, c], [b, a, c], [b, a, c], [])
      expect(a.n).to.equal(1)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)
    })

    // TODO: Long term, this probably should not spend if we can figure out a way to do it.
    it('should spend reads uninvolved in the change', async () => {
      class A extends Jig {
        set (n) { this.n = n }

        get () { return this.n }
      }
      class B extends Jig {
        f (a, c) { a.set(1); a.set(c.get(a) + 1) }
      }
      class C extends Jig {
        get (a) { return a.get() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      b.f(a, c)
      expectAction(b, 'f', [a, c], [b, c, a], [b, c, a], [a])
      expect(a.n).to.equal(2)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })
  })

  describe('non-spending reads', () => {
    it('should reference but not spend reads', async () => {
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig {
        init () { this.a = new A(3) }

        set (a) { this.n = a.n + this.a.n }
      }
      B.deps = { A }
      const b = new B()
      expectAction(b, 'init', [], [], [b, b.a], [])
      const a = new A(2)
      expectAction(a, 'init', [2], [], [a], [])
      b.set(a)
      expect(b.n).to.equal(5)
      expectAction(b, 'set', [a], [b], [b], [a, b, b.a])
      await run.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(5)
    })

    it('should throw if read different instances of same jig', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      class B extends Jig {
        init (a) { this.a = a }

        apply (a2) { this.n = this.a + a2.n }
      }
      const b = new B(a)
      expect(() => b.apply(a2)).to.throw('referenced different locations of same jig: [jig A]')
    })

    it('should throw if read different instance than written', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a, a2) { this.n = a.n; a2.set(3) } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      const b = new B()
      expect(() => b.apply(a, a2)).to.throw('referenced different locations of same jig: [jig A]')
    })

    it('should throw if read different instances of a jig across a batch', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      run.transaction.begin()
      const b = new B()
      const b2 = new B()
      b.apply(a)
      b2.apply(a2)
      run.transaction.end()
      await expect(run.sync()).to.be.rejectedWith(`read different locations of same jig ${a.origin}`)
    })

    it('should throw if attempt to read old version of jig', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      class B extends Jig { apply (a) { this.n = a.n } }
      const b = new B()
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(1)
      b.apply(a)
      await expect(run.sync()).to.be.rejectedWith(`Read ${a.location} is not the latest. Must sync() jigs`)
    })

    it('should throw if unknown whether read is stale', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      const b = new B()
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(1)
      const oldFetch = run.blockchain.fetch
      try {
        run.blockchain.fetch = async txid => {
          const tx = await oldFetch.call(run.blockchain, txid)
          if (txid === a.origin.slice(0, 64)) {
            const vout = parseInt(a.origin.slice(66))
            delete tx.outputs[vout].spentTxId
            delete tx.outputs[vout].spentIndex
            delete tx.outputs[vout].spentHeight
          }
          return tx
        }
        b.apply(a)
        await expect(run.sync()).to.be.rejectedWith(`Read ${a.location} may not be latest. Blockchain did not return spentTxId. Aborting`)
      } finally { run.blockchain.fetch = oldFetch }
    })

    it('should throw if read is stale during load', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      const b = new B()
      a.set(1)
      await run.sync()
      b.apply(a)
      const a2 = await run.load(a.location)
      a2.set(2)
      await run.sync()
      // create a new run to not use the state cache
      const run2 = createRun({ blockchain: run.blockchain, state: new Run.StateCache() })
      const oldFetch = run.blockchain.fetch
      try {
        run2.blockchain.fetch = async txid => {
          const tx = await oldFetch.call(run.blockchain, txid)
          if (txid !== a2.location.slice(0, 64)) tx.time = Date.now() - 6 * 60 * 60 * 1000
          if (txid === b.location.slice(0, 64)) tx.time = Date.now()
          return tx
        }
        await expect(run2.load(b.location)).to.be.rejectedWith(`${a.location} is stale. Aborting.`)
      } finally { run.blockchain.fetch = oldFetch }
    })
  })

  describe('uint8array', () => {
    it('should match instanceof checks', async () => {
      class A extends Jig {
        set () { this.buf = Uint8Array.from([1, 2, 3]) }

        check1 (buf) { return buf instanceof Uint8Array }

        check2 () { return this.buf instanceof Uint8Array }
      }
      class B extends A {
        check3 () { return this.buf instanceof Uint8Array }
      }
      const a = new A()
      a.set()
      expect(a.check1(new Uint8Array([1, 2, 3]))).to.equal(true)
      const b = new B()
      b.set()
      await b.sync()
      const b2 = await run.load(b.location)
      expect(b.buf.length).to.equal(b2.buf.length)
      for (let i = 0; i < b.buf.length; i++) {
        expect(b.buf[i]).to.equal(b2.buf[i])
      }
    })

    it('should support gets and returns', async () => {
      class A extends Jig {
        init () { this.buf = new Uint8Array([1, 2, 3]) }

        get buf2 () { return this.buf }

        getBuf () { return this.buf }
      }
      const a = new A()
      function testBuf (buf) {
        expect(buf.length).to.equal(3)
        expect(buf[0]).to.equal(1)
        expect(buf[1]).to.equal(2)
        expect(buf[2]).to.equal(3)
        expect(buf.constructor === run.code.intrinsics.default.Uint8Array).to.equal(true)
      }
      testBuf(a.buf)
      testBuf(a.buf2)
      testBuf(a.getBuf())
      await run.sync()
      const a2 = await run.load(a.location)
      testBuf(a2.buf)
      testBuf(a2.buf2)
      testBuf(a2.getBuf())
    })
  })

  describe('set', () => {
    it('should throw if unserializable value', () => {
      class A extends Jig {
        f () { this.n = NaN }

        g () { this.n = Symbol.hasInstance }

        h () { this.n = -Infinity }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('NaN cannot be serialized')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
      expect(() => a.g()).to.throw('Symbol(Symbol.hasInstance) cannot be serialized')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
      expect(() => a.h()).to.throw('-Infinity cannot be serialized')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
    })

    it('should throw if set is external', () => {
      class A extends Jig { }
      class B extends Jig { init () { this.a = new A(); this.a.n = 1 }}
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.n = 1 }).to.throw()
      expectNoAction()
      expect(() => new B()).to.throw()
      expectNoAction()
    })

    it('should throw if attempt to override methods', () => {
      class A extends Jig {
        f () { }

        g () { this.f = 1 }

        h () { this.sync = [] }

        i () { this.init = 'hello' }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.g()).to.throw()
      expectNoAction()
      expect(() => a.h()).to.throw()
      expectNoAction()
      expect(() => a.i()).to.throw()
      expectNoAction()
    })

    it('should throw if set properties on methods', () => {
      class A extends Jig {
        init () { this.arr = [] }

        f () { this.sync.n = 1 }

        g () { this.arr.filter.n = 2 }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('must not set n on method sync')
      expectNoAction()
      expect(() => a.g()).to.throw('must not set n on method filter')
      expectNoAction()
    })

    it('should not create transaction if no value change', () => {
      class A extends Jig {
        init () { this.n = 1 }

        set (n) { this.n = n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.set(1)
      expectNoAction()
    })
  })

  describe('delete', () => {
    it('should support deleting internally', () => {
      class A extends Jig {
        init () { this.n = 1 }

        delete () { delete this.n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.delete()
      expectAction(a, 'delete', [], [a], [a], [])
      expect(a.n).to.equal(undefined)
    })

    it('should throw if delete externally', () => {
      class A extends Jig { init () { this.n = 1 }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.n }).to.throw()
      expectNoAction()
    })

    it('should throw if delete method', () => {
      class A extends Jig { f () { } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.sync }).to.throw()
    })

    it('should not create transaction if delete did not change object', () => {
      class A extends Jig { delete () { this.n = 1; delete this.n } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.delete()
      expectNoAction()
    })
  })

  describe('getPrototypeOf', () => {
    it('should not spend or reference jigs', () => {
      class A extends Jig {
        f () { this.a2 = new A() }

        g () {
          this.x = this.a2 instanceof A
          this.y = this.a2.constructor.prototype === 'hello'
          this.z = Object.getPrototypeOf(this.a2) === 'world'
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f()
      expectAction(a, 'f', [], [a], [a, a.a2], [])
      a.g()
      expectAction(a, 'g', [], [a], [a], [a])
    })
  })

  describe('setPrototypeOf', () => {
    it('should throw if change prototype', () => {
      class A extends Jig { f () { Reflect.setPrototypeOf(this, Object) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Reflect.setPrototypeOf(a, Object)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('preventExtensions', () => {
    it('should throw if prevent extensions', () => {
      class A extends Jig { f () { Object.preventExtensions(this) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Object.preventExtensions(a)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('defineProperty', () => {
    it('should throw is define property', () => {
      class A extends Jig { f () { Object.defineProperty(this, 'n', { value: 1 }) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Object.defineProperty(a, 'n', { value: 1 })).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('has', () => {
    it('should add non-permanent properties to reads', () => {
      class A extends Jig { init () { this.arr = [1] }}
      class B extends Jig {
        f (a) { this.x = 'n' in a }

        g (a) { this.y = 'arr' in a }

        h (a) { this.z = '1' in a.arr }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [a])
      b.g(a)
      expectAction(b, 'g', [a], [b], [b], [a])
      b.h(a)
      expectAction(b, 'h', [a], [b], [b], [a])
    })

    it('should not add permanant properties to reads', () => {
      class A extends Jig { f () {} }
      class B extends Jig {
        f (a) {
          this.x1 = 'f' in a
          this.x2 = 'origin' in a
          this.x3 = 'location' in a
          this.x4 = 'owner' in a
          this.x5 = 'satoshis' in a
          this.x6 = 'sync' in a
          this.x7 = 'constructor' in a
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [])
    })

    it('should support has for undefined values', () => {
      class A extends Jig {
        init () { this.x = undefined }
      }
      const a = new A()
      expect('x' in a).to.equal(true)
    })
  })

  describe('ownKeys', () => {
    it('should add to reads if call ownKeys', () => {
      class A extends Jig {}
      class B extends Jig { f (a) { this.x = Reflect.ownKeys(a) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [a])
    })
  })

  describe('getOwnPropertyDescriptor', () => {
    it('should add to reads if call getOwnPropertyDescriptor', () => {
      class A extends Jig { init () { this.n = 1 }}
      class B extends Jig { f (a) { this.x = Object.getOwnPropertyDescriptor(a, 'n') }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [a])
    })
  })

  describe('array', () => {
    it('should support calling push internally', async () => {
      class A extends Jig {
        init () { this.a = [] }

        add (n) { this.a.push(n) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.add(1)
      expect(a.a[0]).to.equal(1)
      expectAction(a, 'add', [1], [a], [a], [a])
    })

    it('should throw if change array externally', () => {
      class A extends Jig {
        init () { this.a = [3, 1, 2, 5, 0] }

        add (n) { this.a.push(n) }
      }
      class B extends Jig { init () { new A().a.push(1) } }
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const err = func => `internal method ${func} may not be called to change state`
      const writeOps = [
        () => expect(() => a.a.copyWithin(1)).to.throw(err('copyWithin')),
        () => expect(() => a.a.pop()).to.throw(err('pop')),
        () => expect(() => a.a.push(1)).to.throw(err('push')),
        () => expect(() => a.a.reverse()).to.throw(err('reverse')),
        () => expect(() => a.a.shift()).to.throw(err('shift')),
        () => expect(() => a.a.sort()).to.throw(err('sort')),
        () => expect(() => a.a.splice(0, 1)).to.throw(err('splice')),
        () => expect(() => a.a.unshift(4)).to.throw(err('unshift')),
        () => expect(() => a.a.fill(0)).to.throw(err('fill')),
        () => expect(() => new B()).to.throw(err('push'))
      ]
      writeOps.forEach(op => { op(); expectNoAction() })
    })

    it('should support read-only methods without spending', () => {
      class A extends Jig { init () { this.a = [] } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const readOps = [
        () => expect(a.a.length).to.equal(0),
        () => expect(() => a.a.concat([1])).not.to.throw(),
        () => expect(() => a.a.entries()).not.to.throw(),
        () => expect(() => a.a.every(() => true)).not.to.throw(),
        () => expect(() => a.a.filter(() => true)).not.to.throw(),
        () => expect(() => a.a.find(() => true)).not.to.throw(),
        () => expect(() => a.a.findIndex(() => true)).not.to.throw(),
        () => expect(() => a.a.forEach(() => {})).not.to.throw(),
        () => expect(() => a.a.includes(1)).not.to.throw(),
        () => expect(() => a.a.indexOf(1)).not.to.throw(),
        () => expect(() => a.a.join()).not.to.throw(),
        () => expect(() => a.a.keys()).not.to.throw(),
        () => expect(() => a.a.lastIndexOf(1)).not.to.throw(),
        () => expect(() => a.a.map(() => true)).not.to.throw(),
        () => expect(() => a.a.reduce(() => true, 0)).not.to.throw(),
        () => expect(() => a.a.reduceRight(() => true, 0)).not.to.throw(),
        () => expect(() => a.a.slice(0)).not.to.throw(),
        () => expect(() => a.a.some(() => true)).not.to.throw(),
        () => expect(() => a.a.toLocaleString()).not.to.throw(),
        () => expect(() => a.a.toString()).not.to.throw()
      ]
      readOps.forEach(op => { op(); expectNoAction() })

      // TODO: test no change
    })

    it('should support iteration', () => {
      class A extends Jig {
        init () { this.a = [] }

        add (x) { this.a.push(x) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.add(1)
      expectAction(a, 'add', [1], [a], [a], [a])
      a.add(2)
      expectAction(a, 'add', [2], [a], [a], [a])
      expect(Array.from(a.a)).to.deep.equal([1, 2])
      expectNoAction()
      const e = [1, 2]
      for (const x of a.a) { expect(x).to.equal(e.shift()) }
      expectNoAction()
    })

    it('should throw if overwrite or delete method on array', () => {
      class A extends Jig {
        init () { this.a = [] }

        f () { this.a.filter = 2 }

        g () { delete this.a.filter }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw()
      expectNoAction()
      expect(() => a.g()).to.throw()
      expectNoAction()
    })
  })

  describe('owner', () => {
    it('should be defined before init is called', () => {
      class A extends Jig { init () { this.ownerAtInit = this.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [a])
      expect(a.ownerAtInit).to.equal(run.owner.pubkey)
    })

    it('should be assigned to creator', async () => {
      class A extends Jig {
        send (to) { this.owner = to }

        createA () { return new A() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const bsvNetwork = Run._util.bsvNetwork(run.blockchain.network)
      const privateKey = new PrivateKey(bsvNetwork)
      const pubkey = privateKey.publicKey.toString()
      a.send(pubkey)
      expectAction(a, 'send', [pubkey], [a], [a], [])
      await a.sync()
      const run2 = hookStoreAction(createRun({ blockchain: run.blockchain, owner: privateKey }))
      const a2 = await run2.load(a.location)
      const a3 = a2.createA()
      expectAction(a2, 'createA', [], [a2], [a2, a3], [])
      await a2.sync()
      expect(a3.owner).to.equal(pubkey)
    })

    it('should throw if not set to a public key', async () => {
      class A extends Jig { send (owner) { this.owner = owner }}
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const publicKey = new PrivateKey().publicKey
      expect(() => a.send(publicKey)).to.throw('is not deployable')
      expect(() => a.send(JSON.parse(JSON.stringify(publicKey)))).to.throw('owner must be a pubkey string')
      expect(() => a.send('123')).to.throw('owner is not a valid public key')
      expectNoAction()
    })

    it('should throw if delete owner', () => {
      class A extends Jig { f () { delete this.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.owner }).to.throw()
      expectNoAction()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })

    it('should throw if set owner externally', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.owner = '123' }).to.throw()
      expectNoAction()
    })

    it('should throw if define owner method', () => {
      class A extends Jig { owner () {} }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should add to reads', () => {
      class A extends Jig { f (a) { this.x = a.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = new A()
      expectAction(a2, 'init', [], [], [a2], [])
      a.f(a2)
      expectAction(a, 'f', [a2], [a], [a], [a2])
    })

    it('should support only class owner creating instances', async () => {
      const privkey = new PrivateKey()
      class A extends Jig {
        init (owner) {
          if (this.owner !== A.owner) throw new Error()
          this.owner = owner
        }
      }
      const run = createRun()
      const a = new A(privkey.publicKey.toString())
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain, owner: privkey })
      await run2.load(a.location)
    })
  })

  describe('satoshis', () => {
    it('should be defined before init', () => {
      class A extends Jig { init () { this.satoshisAtInit = this.satoshis }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [a])
      expect(a.satoshisAtInit).to.equal(0)
    })

    it('should support setting to valid numbers', async () => {
      class A extends Jig { f (s) { this.satoshis = s }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      a.f(100000)
      expectAction(a, 'f', [100000], [a], [a], [])
      a.f(0)
      expectAction(a, 'f', [0], [a], [a], [])
      await run.sync()
    })

    it('should throw if set to invalid number', () => {
      class A extends Jig {
        f (s) { this.satoshis = s }

        g () { this.satoshis = NaN }

        h () { this.satoshis = Infinity }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f(-1)).to.throw()
      expectNoAction()
      expect(() => a.f('1')).to.throw()
      expectNoAction()
      expect(() => a.f(100000001)).to.throw()
      expectNoAction()
      expect(() => a.g()).to.throw()
      expectNoAction()
      expect(() => a.h()).to.throw()
      expectNoAction()
    })

    it('should load satoshis from mocknet', async () => {
      class A extends Jig { f (s) { this.satoshis = s }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(50)
      expectAction(a, 'f', [50], [a], [a], [])
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.satoshis).to.equal(50)
    })

    it('should load satoshis from testnet', async () => {
      const run = createRun({ network: 'test' })
      class A extends Jig { f (s) { this.satoshis = s }}
      const a = new A()
      a.f(50)
      await run.sync()
      await run.load(a.location)
    }).timeout(30000)

    it('should throw if create satoshis method', () => {
      class A extends Jig { owner () {} }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should throw if delete satoshis property', () => {
      class A extends Jig { f () { delete this.satoshis }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.satoshis }).to.throw()
      expectNoAction()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })

    it('should throw if set externally', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.satoshis = 1 }).to.throw()
      expectNoAction()
    })

    it('should add to purse when satoshis decreased', async () => {
      class A extends Jig { f (satoshis) { this.satoshis = satoshis; return this }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await a.f(10000).sync()
      expectAction(a, 'f', [10000], [a], [a], [])
      const before = await run.purse.balance()
      await a.f(0).sync()
      expectAction(a, 'f', [0], [a], [a], [])
      const after = await run.purse.balance()
      expect(after - before > 8000).to.equal(true)
    })
  })

  describe('misc', () => {
    it('should support custom toJSON method', () => {
      class A extends Jig { toJSON () { return [1, 2, 3] } }
      const a = new A()
      expect(JSON.stringify(a)).to.equal('[1,2,3]')
      expectAction(a, 'init', [], [], [a], [])
    })

    it('should throw if $class or $ref property', () => {
      class A extends Jig { init () { this.o = { $class: 'undefined' } } }
      expect(() => new A()).to.throw()
      expectNoAction()
      class B extends Jig { init () { this.o = { $ref: '123' } } }
      expect(() => new B()).to.throw()
      expectNoAction()
    })

    it('should throw if $class or $ref arg', () => {
      class A extends Jig { init (o) { this.o = o } }
      expect(() => new A({ $class: 'undefined' })).to.throw()
      expectNoAction()
      expect(() => new A({ $ref: '123' })).to.throw()
      expectNoAction()
    })

    it('should make unusable when deploy fails', async () => {
      const oldPay = run.purse.pay
      run.purse.pay = async tx => tx
      class A extends Jig {
        init () { this.n = 1 }

        f () {}
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await expect(a.sync()).to.be.rejected
      expect(() => a.origin).to.throw()
      expect(() => a.n).to.throw()
      expect(() => Reflect.ownKeys(a)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
      try { console.log(a.n) } catch (e) {
        expect(e.toString().startsWith('Error: Deploy failed')).to.equal(true)
        expect(e.toString().indexOf('Error: Broadcast failed, tx has no inputs')).not.to.equal(-1)
      }
      run.purse.pay = oldPay
    })

    it('should throw if transaction is unpaid', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = await new A().sync()
      const oldPay = run.purse.pay
      run.purse.pay = async (tx) => { return tx }
      const a2 = new A()
      // test when just init, no inputs
      expectAction(a2, 'init', [], [], [a2], [])
      const suggestion = 'Hint: Is the purse funded to pay for this transaction?'
      await expect(run.sync()).to.be.rejectedWith(`Broadcast failed, tx has no inputs\n\n${suggestion}`)
      // test with a spend, pre-existing inputs
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
      await expect(run.sync()).to.be.rejectedWith(`Broadcast failed, tx fee too low\n\n${suggestion}`)
      run.purse.pay = oldPay
    })

    it('should throw if owner signature is missing', async () => {
      class A extends Jig {
        init () { this.n = 1 }

        f () { this.n = 2 }
      }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const oldSign = run.owner.sign
      run.owner.sign = async (tx) => { return tx }
      a.f()
      await expect(a.sync()).to.be.rejectedWith('Signature missing for A')
      run.owner.sign = oldSign
    })

    it('should pass reads and writes in correct order', async () => {
      class B extends Jig {
        init (n) { this.n = n }

        inc () { this.n += 1 }
      }
      class A extends Jig {
        add (arr) {
          arr[1].inc()
          arr[0].inc()
          this.n = arr.reduce((s, t) => s + t.n, 0)
          return [new B(1), new B(2)]
        }
      }
      A.deps = { B }
      const b = new B(1)
      expectAction(b, 'init', [1], [], [b], [])
      const b2 = new B(2)
      expectAction(b2, 'init', [2], [], [b2], [])
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const [b3, b4] = a.add([b, b2])
      expectAction(a, 'add', [[b, b2]], [a, b2, b], [a, b2, b, b3, b4], [b2, b])
    })

    it('should detect uncaught errors', async () => {
      class A extends Jig { f () { this.n = 1 } }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const oldBroadcast = run.blockchain.broadcast
      run.blockchain.broadcast = async (tx) => { throw new Error() }
      expect(a.n).to.equal(undefined)
      a.f()
      expectAction(a, 'f', [], [a], [a], [])
      expect(a.n).to.equal(1)
      await new Promise(resolve => {
        setTimeout(() => {
          let completed = false
          try { a.origin } catch (e) { completed = true } // eslint-disable-line
          if (completed) {
            run.blockchain.broadcast = oldBroadcast
            expect(() => a.origin).to.throw('A previous update failed')
            expect(() => a.location).to.throw('A previous update failed')
            expect(() => a.owner).to.throw('A previous update failed')
            expect(() => a.n).to.throw('A previous update failed')
            expect(() => a.f()).to.throw('A previous update failed')
            resolve()
          }
        }, 1)
      })
    })
  })

  describe('mempool chain', () => {
    it('should support long mempool chain for purse', async () => {
      class A extends Jig { }
      for (let i = 0; i < 100; i++) { new A() } // eslint-disable-line
      await run.sync()
    }).timeout(10000)

    it.skip('should support long mempool chain for jig', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      for (let i = 0; i < 100; i++) {
        a.set(i)
        await a.sync()
      }
    })

    it.skip('should support multiple jigs with different length chains', async () => {
      // TODO
    })
  })

  describe('toString', () => {
    it('should return a default value', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.toString()).to.equal('[jig A]')
    })

    it('should support overriding toString', () => {
      class A extends Jig { toString () { return 'hello' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.toString()).to.equal('hello')
    })
  })

  describe('origin', () => {
    it('throw if read origin before sync', async () => {
      class A extends Jig { f () { this.origin2 = this.origin }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.origin).to.throw('sync required before reading origin')
      expect(() => a.f()).to.throw('sync required before reading origin')
      await a.sync()
      expect(() => a.origin).not.to.throw()
      expect(() => a.f()).not.to.throw()
    })

    it('should support reading internally after sync', async () => {
      class A extends Jig { f () { this.origin2 = this.origin }}
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      a.f()
      expectAction(a, 'f', [], [a], [a], [])
    })

    it('should throw if delete origin', () => {
      class A extends Jig { f () { delete this.origin }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.origin }).to.throw('must not delete origin')
      expectNoAction()
      expect(() => a.f()).to.throw('must not delete origin')
      expectNoAction()
    })

    it('should throw if set origin', () => {
      class A extends Jig { f () { this.origin = '123' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.origin = '123' }).to.throw('must not set origin')
      expectNoAction()
      expect(() => a.f()).to.throw('must not set origin')
      expectNoAction()
    })

    it('should throw if origin method exists', () => {
      class A extends Jig { origin () {} }
      expect(() => new A()).to.throw('must not override origin')
      expectNoAction()
    })
  })

  describe('location', () => {
    it('should throw if read before sync', async () => {
      class A extends Jig {}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.location).to.throw('sync required before reading location')
      await a.sync()
      expect(() => a.location).not.to.throw()
    })

    it('should support reading internally after sync', async () => {
      class A extends Jig { f () { this.location2 = this.location }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await a.sync()
      a.f()
      expectAction(a, 'f', [], [a], [a], [a])
      expect(a.location2).to.equal(a.origin)
      expect(() => a.f()).to.throw('sync required before reading location')
      expectNoAction()
      await a.sync()
      const secondLocation = a.location
      a.f()
      expectAction(a, 'f', [], [a], [a], [a])
      expect(a.location2).to.equal(secondLocation)
    })

    // TODO: This is probably possible to support in many cases
    it.skip('should support reading location quickly', async () => {
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      expect(a.location).not.to.throw()
      a.f()
      expect(a.location).not.to.throw()
    })

    it('should throw if delete location', () => {
      class A extends Jig { f () { delete this.location }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.location }).to.throw('must not delete location')
      expectNoAction()
      expect(() => a.f()).to.throw('must not delete location')
      expectNoAction()
    })

    it('should throw if set location', () => {
      class A extends Jig { f () { this.location = '123' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.location = '123' }).to.throw('must not set location')
      expectNoAction()
      expect(() => a.f()).to.throw('must not set location')
      expectNoAction()
    })

    it('should throw if location method exists', () => {
      class A extends Jig { location () {} }
      expect(() => new A()).to.throw('must not override location')
      expectNoAction()
    })
  })

  describe('load', () => {
    it('should load single jig', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      a.f([2])
      expectAction(a, 'f', [[2]], [a], [a], [])
      a.f({ n: 3 })
      expectAction(a, 'f', [{ n: 3 }], [a], [a], [])
      await a.sync()
      const a2 = await run.load(a.location)
      expect(a2.n.n).to.equal(3)
    })

    it('should load older state', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      await a.sync()
      const location1 = a.location
      a.f(2)
      expectAction(a, 'f', [2], [a], [a], [])
      await a.sync()
      const a2 = await run.load(location1)
      expect(a2.n).to.equal(1)
    })

    it('should throw if location is bad', async () => {
      class A extends Jig { }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      await expect(run.load(a.location.slice(0, 64) + '_o0')).to.be.rejected
      await expect(run.load(a.location.slice(0, 64) + '_o3')).to.be.rejected
    })

    it('should support loading jig with multiple updates', async () => {
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig {
        init () { this.a = new A() }

        set (n) { this.n = n; this.a.set(n) }
      }
      B.deps = { A }
      const b = new B()
      expectAction(b, 'init', [], [], [b, b.a], [])
      b.set(2)
      expectAction(b, 'set', [2], [b, b.a], [b, b.a], [b])
      await run.sync()
      const b2 = await run.load(b.location)
      const a2 = await run.load(b.a.location)
      expect(b2.n).to.equal(2)
      expect(a2.n).to.equal(2)
    })

    it('should support loading jigs that updated other jigs', async () => {
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig { set (n, a) { a.set(n) } }
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.set(2, a)
      expectAction(b, 'set', [2, a], [b, a], [b, a], [])
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should support arguments with different instances of the same jig location', async () => {
      class A extends Jig { init (n) { this.n = n }}
      const a = await new A(1).sync()
      expectAction(a, 'init', [1], [], [a], [])
      const a2 = await run.load(a.location)
      const a3 = await run.load(a.location)
      class B extends Jig { init (x, y) { this.n = x.n + y.n }}
      const b = new B(a2, a3)
      expectAction(b, 'init', [a2, a3], [], [b], [a2, a3])
      await run.sync()
      expect(b.n).to.equal(2)
    })

    it('should throw if pass different locations of same jig as arguments', async () => {
      class A extends Jig { f (n) { this.n = n; return this }}
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      await a.f(1).sync()
      expectAction(a, 'f', [1], [a], [a], [])
      const a2 = await run.load(a.location)
      await a2.f(2).sync()
      expectAction(a2, 'f', [2], [a2], [a2], [])
      class B extends Jig { init (x, y) { this.n = x.n + y.n }}
      expect(() => new B(a, a2)).to.throw()
    })

    it('should support loading instances of extended classes', async () => {
      class A extends Jig { }
      class B extends A { }
      const b = await new B().sync()
      expectAction(b, 'init', [], [], [b], [])
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.load(b.location)
    })

    it('should support reading jigs as arguments', async () => {
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { init (a) { this.n = a.n } }
      const a = await new A(1).sync()
      expectAction(a, 'init', [1], [], [a], [])
      const b = await new B(a).sync()
      expectAction(b, 'init', [a], [], [b], [a])
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(1)
    })

    it('should add inner jigs to reads', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig {
        init (a) { this.a = a }

        apply () { this.n = this.a.n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
      const b = await new B(a).sync()
      expectAction(b, 'init', [a], [], [b], [])
      a.set(2)
      expectAction(a, 'set', [2], [a], [a], [])
      b.apply()
      expectAction(b, 'apply', [], [b], [b], [b, a])
      expect(b.n).to.equal(2)
      await b.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(2)
    })
  })

  describe('state cache', () => {
    it('should cache local updates', async () => {
      class A extends Jig {
        init () { this.undef = undefined }

        set (n) { this.n = n }
      }
      const a = new A()
      const t0 = Date.now()
      for (let i = 0; i < 10; i++) {
        a.set(i)
      }
      const b = new A()
      run.transaction.begin()
      const b2 = new A()
      a.set({ b, b2, A })
      run.transaction.end()
      b.set(1)
      await a.sync()
      const t1 = Date.now()
      await run.load(a.location)
      const t2 = Date.now()
      expect((t1 - t0) / (t2 - t1) > 10).to.equal(true) // Load without state cache is 10x slower

      const run2 = createRun({ blockchain: run.blockchain, state: new Run.StateCache() })
      const t3 = Date.now()
      await run2.load(a.location)
      const t4 = Date.now()
      await run2.load(a.location)
      const t5 = Date.now()
      expect((t4 - t3) / (t5 - t4) > 10).to.equal(true) // Load without state cache is 10x slower
    })
  })

  describe('class props', () => {
    it('should be able to access class properties from instances', async () => {
      class A extends Jig {}
      A.n = 1
      const a = await new A().sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      expect(a2.constructor.n).to.equal(1)
    })

    it('should support reads of class properties from inside jig methods', () => {
      class A extends Jig { f () { this.n = this.constructor.n }}
      A.n = 1
      const a = new A()
      a.f()
      expect(a.n).to.equal(1)
    })

    it('should support reading properties on preset classes', () => {
      class B extends Jig { }
      B.originMocknet = B.locationMocknet = '123'
      B.ownerMocknet = 'abc'
      B.n = 1
      class A extends Jig { init () { this.n = B.n }}
      A.originMocknet = A.locationMocknet = '456'
      A.ownerMocknet = 'def'
      A.deps = { B }
      const a = new A()
      expect(a.n).to.equal(1)
    })
  })

  describe('batch', () => {
    it('should support load of batch with multiple instantiations', async () => {
      class A extends Jig { }
      run.transaction.begin()
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      run.transaction.end()
      await a.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      expect(a.origin.slice(0, 64)).to.equal(b.origin.slice(0, 64))
      expect(a.origin).to.equal(a2.origin)
      expect(b.origin).to.equal(b2.origin)
    })

    it('should support load of batch with multiple jig updates', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      run.transaction.begin()
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      b.f(2)
      expectAction(b, 'f', [2], [b], [b], [])
      run.transaction.end()
      await a.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      expect(a2.location.slice(0, 64)).to.equal(b2.location.slice(0, 64))
      expect(a2.n).to.equal(1)
      expect(b2.n).to.equal(2)
    })

    it('should support load of batch with self-references', async () => {
      class A extends Jig { f (a) { this.n = a } }
      run.transaction.begin()
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(a)
      expectAction(a, 'f', [a], [a], [a], [])
      run.transaction.end()
      await a.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      expect(a.origin).to.equal(a2.origin)
      expect(a2).to.deep.equal(a2.n)
      expect(a.n).to.deep.equal(a2.n)
      expect(a.owner).to.equal(a2.owner)
    })

    it('should support load of batch with circularly referenced jigs', async () => {
      class A extends Jig { set (x) { this.x = x } }
      run.transaction.begin()
      const a = new A()
      const b = new A()
      a.set(b)
      b.set(a)
      run.transaction.end()
      await run.sync()
      await run.load(a.location)
      await run.load(b.location)
    })

    it('should roll back all jigs from batch failures', async () => {
      hookPay(run, true, true, true, false)
      class A extends Jig { f (n) { this.n = n } }
      class B extends Jig { f (a, n) { a.f(a.n + 1); this.n = n } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      run.transaction.begin()
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      b.f(a, 20)
      expectAction(b, 'f', [a, 20], [b, a], [b, a], [a])
      run.transaction.end()
      run.transaction.begin()
      a.f(10)
      expectAction(a, 'f', [10], [a], [a], [])
      b.f(a, 30)
      expectAction(b, 'f', [a, 30], [b, a], [b, a], [a])
      run.transaction.end()
      expect(a.n).to.equal(11)
      expect(b.n).to.equal(30)
      await expect(a.sync()).to.be.rejected
      expect(a.n).to.equal(2)
      expect(b.n).to.equal(20)
    })
  })

  describe('private', () => {
    it('should handle has of private property', () => {
      class J extends Jig {
        init () { this._x = 1 }

        has (a, x) { return x in a }
      }
      class K extends J { }
      class L extends Jig { has (a, x) { return x in a } }
      expect('_x' in new J()).to.equal(true)
      expect(new K().has(new K(), '_x')).to.equal(true)
      expect(() => new L().has(new J(), '_x')).to.throw('cannot check _x because it is private')
      expect(() => new K().has(new J(), '_x')).to.throw('cannot check _x because it is private')
      expect(() => new J().has(new K(), '_x')).to.throw('cannot check _x because it is private')
    })

    it('should handle get of private property', () => {
      class J extends Jig {
        init () { this._x = 1 }

        get (a, x) { return a[x] }
      }
      class K extends J { }
      class L extends Jig { get (a, x) { return a[x] } }
      expect(new J()._x).to.equal(1)
      expect(new K().get(new K(), '_x')).to.equal(1)
      expect(() => new L().get(new J(), '_x')).to.throw('cannot get _x because it is private')
      expect(() => new K().get(new J(), '_x')).to.throw('cannot get _x because it is private')
      expect(() => new J().get(new K(), '_x')).to.throw('cannot get _x because it is private')
    })

    it('should handle private method', () => {
      class J extends Jig {
        g () { return this._f() }

        _f () { return 1 }

        call (a, x) { return a[x]() }
      }
      class K extends J { }
      class L extends Jig { call (a, x) { return a[x]() } }
      expect(new J().g()).to.equal(1)
      expect(new K().call(new K(), '_f')).to.equal(1)
      expect(new L().call(new J(), 'g')).to.equal(1)
      expect(() => new J()._f()).to.throw('cannot call _f because it is private')
      expect(() => new L().call(new J(), '_f')).to.throw('cannot get _f because it is private')
      expect(() => new K().call(new J(), '_f')).to.throw('cannot get _f because it is private')
      expect(() => new J().call(new K(), '_f')).to.throw('cannot get _f because it is private')
    })

    it('should not return private properties in ownKeys', () => {
      class J extends Jig {
        init () { this._x = 1 }

        ownKeys (a) { return Reflect.ownKeys(a) }
      }
      class K extends J { }
      class L extends Jig { ownKeys (a) { return Reflect.ownKeys(a) } }
      expect(Reflect.ownKeys(new J()).includes('_x')).to.equal(true)
      expect(new K().ownKeys(new K()).includes('_x')).to.equal(true)
      expect(new L().ownKeys(new J()).includes('_x')).to.equal(false)
      expect(new K().ownKeys(new J()).includes('_x')).to.equal(false)
      expect(new J().ownKeys(new K()).includes('_x')).to.equal(false)
    })
  })

  describe('caller', () => {
    it('should be null when called externally', async () => {
      class A extends Jig {
        init () { expect(Jig.caller).toBeNull() }
        f () { expect(Jig.caller).toBeNull() }
      }
      A.deps = { expect: Run.expect }
      const a = new A()
      a.f()
      await run.sync()
      await run.load(a.location)
    })

    it('should be calling jig when called internally', async () => {
      class Parent extends Jig {
        init () { this.child = new Child(this) }
        f () { this.self = this.child.f(this) }
      }
      class Child extends Jig {
        init (parent) { expect(Jig.caller).toBe(parent) }
        f (parent) { expect(Jig.caller).toBe(parent); return parent }
      }
      Parent.deps = { Child }
      Child.deps = { expect: Run.expect }
      const parent = new Parent()
      parent.f()
      expect(parent.self).to.equal(parent)
      await run.sync()
      await run.load(parent.location)
    })

    it('should support caller being this', async () => {
      class A extends Jig {
        init () { this.f() }
        f () { this.caller = Jig.caller }
      }
      const a = await new A().sync()
      expect(a.caller).to.equal(a)
      const a2 = await run.load(a.location)
      expect(a2.caller).to.equal(a2)
    })

    it('should be accessible as static on both extended and base class', async () => {
      class A extends Jig {
        expectCaller (caller) {
          expect(Jig.caller).toBe(caller)
          expect(A.caller).toBe(caller)
        }
      }
      A.deps = { expect: Run.expect }
      class B extends Jig {
        init (a) { a.expectCaller(this) }
      }
      const a = new A()
      a.expectCaller(null)
      const b = new B(a)
      await run.sync()
      await run.load(b.location)
    })

    it('should support calling a method on the caller', async () => {
      class A extends Jig {
        set (n) { this.n = n }
        apply (b) { b.apply() }
      }
      class B extends Jig { apply () { Jig.caller.set(1) } }
      const a = new A()
      const b = new B()
      a.apply(b)
      expect(a.n).to.equal(1)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)
    })

    it('should support static getter called caller', () => {
      class A extends Jig {
        static get caller () { return 1 }
      }
      expect(Jig.caller).to.equal(null)
      expect(A.caller).to.equal(1)
      const a = new A()
      expect(a.constructor.caller).to.equal(1)
    })

    it('should throw if set caller', () => {
      class A extends Jig { init () { A.caller = 1 } }
      expect(() => { A.caller = 1 }).to.throw('Must not set caller on Jig')
      expect(() => new A()).to.throw('Must not set caller on Jig')
    })

    it('should allow local variables named caller', async () => {
      class A extends Jig { init () { const caller = 2; this.n = caller } }
      const a = await new A().sync()
      expect(a.n).to.equal(2)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should allow dependencies named caller', async () => {
      const run = createRun({ sandbox: false })
      function caller () { return 2 }
      class A extends Jig { init () { this.n = caller() } }
      A.deps = { caller }
      const a = await new A().sync()
      expect(a.n).to.equal(2)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
      run.deactivate()
    })
  })

  describe('internal properties and methods', () => {
    it('should support calling a read-only method on an internal property from outside', () => {
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.obj.toString()).not.to.throw()
      expect(() => a.arr.indexOf(3)).not.to.throw()
      expect(() => a.buf.indexOf(2)).not.to.throw()
    })

    it('should support calling a read-only method on an internal property from another jig', () => {
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) {
          this.x = a.obj.toString()
          this.y = a.arr.indexOf(3)
          this.z = a.buf.indexOf(2)
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).not.to.throw()
    })

    it('should support calling a write method on an internal property from outside', () => {
      class A extends Jig {
        init () {
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([3, 2, 1])
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.arr.push(1)).to.throw('internal method push may not be called to change state')
      expectNoAction()
      expect(() => a.buf.sort()).to.throw('internal method sort may not be called to change state')
      expectNoAction()
    })

    it('should support calling a write method on an internal property from another jig', () => {
      class A extends Jig {
        init () {
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([3, 2, 1])
        }
      }
      class B extends Jig {
        f (a) { a.arr.push(1) }

        g (a) { a.buf.sort() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('internal method push may not be called to change state')
      expectNoAction()
      expect(() => b.g(a)).to.throw('internal method sort may not be called to change state')
      expectNoAction()
    })

    it('should support internal methods that do not require args to be serializable', () => {
      class A extends Jig { init () { this.arr = [1, 2, 3] } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.arr.filter(x => x === 1)).not.to.throw()
      expect(() => a.arr.indexOf(Symbol.hasInstance)).not.to.throw()
    })

    it('should throw if save an internal property on another jig', () => {
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) { this.x = a.obj }

        g (a) { this.y = a.arr }

        h (a) { this.z = a.buf }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('Property [object Object] is owned by a different token')
      expect(() => b.g(a)).to.throw('Property 1,2,3 is owned by a different token')
      expect(() => b.h(a)).to.throw('Property 1,2 is owned by a different token')
    })

    it('should not throw if save a copy of an internal property on another jig', () => {
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) { this.x = Object.assign({}, a.obj) }

        g (a) { this.y = [...a.arr] }

        h (a) { this.z = new Uint8Array(a.buf) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).not.to.throw()
      expect(() => b.g(a)).not.to.throw()
      expect(() => b.h(a)).not.to.throw()
    })

    it('should throw if save an internal method on another jig', () => {
      class A extends Jig {
        init () {
          class Blob { f () { return 2 } }
          this.blob = new Blob()
        }
      }
      class B extends Jig { f (a) { this.x = a.blob.f } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('Property f () { return 2 } is owned by a different token')
    })
  })
})

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(7)))

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

const { describe, it } = __webpack_require__(2)
const { expect } = __webpack_require__(1)
const Location = __webpack_require__(8)

const txid = '98244c0b51c1af3c541d901ce4bfcc05041dc8e4e80747ac5f0084e81bda339b'
const badHexTxid = '98244c0b51c1af3c541d901ce4bfcc05???dc8e4e80747ac5f0084e81bda339b'
const tempTxid = '????????????????????????????????????????????????5f0084e81bda339b'

describe('Location', () => {
  describe('parse', () => {
    it('should parse valid locations', () => {
      const expectLocation = (s, obj) => expect(Location.parse(s)).to.deep.equal(Object.assign({ location: s }, obj))
      expectLocation('_o0', { vout: 0 })
      expectLocation('_i1', { vin: 1 })
      expectLocation('_r2', { vref: 2 })
      expectLocation(`${txid}_o0`, { txid, vout: 0 })
      expectLocation(`${txid}_i1`, { txid, vin: 1 })
      expectLocation(`${txid}_r6000000000`, { txid, vref: 6000000000 })
      expectLocation(`${tempTxid}_o1`, { tempTxid, vout: 1 })
      expectLocation(`${txid}_o1://${txid}`, { txid, vout: 1, innerLocation: txid, location: `${txid}_o1` })
      expect(() => Location.parse(`${txid}_o1://hello`)).not.to.throw()
      expectLocation('!Bad', { error: 'Bad' })
      expectLocation('!', { error: '' })
    })

    it('should throw for invalid locations', () => {
      expect(() => Location.parse(null)).to.throw('Location must be a string')
      expect(() => Location.parse({})).to.throw('Location must be a string')
      expect(() => Location.parse('')).to.throw('Location must not be empty')
      expect(() => Location.parse(txid)).to.throw('Location requires a _ separator')
      expect(() => Location.parse(`${txid}_${txid}_o1`)).to.throw('Location has an unexpected _ separator')
      expect(() => Location.parse('abc_o1')).to.throw('Location has an invalid txid length')
      expect(() => Location.parse(`${badHexTxid}_o1`)).to.throw('Location has invalid hex in its txid')
      expect(() => Location.parse(`${txid}_o`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_r0.1`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_rABC`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_i-1`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_00`)).to.throw('Location has an invalid index category')
      expect(() => Location.parse(`${txid}_a1`)).to.throw('Location has an invalid index category')
      expect(() => Location.parse(`${txid}_o1://${txid}_o1://${txid}_o1`)).to.throw('Location must only have one protocol')
      expect(() => Location.parse(`${txid}_n1://${txid}_o1`)).to.throw('Location has an invalid index category')
    })
  })

  describe('build', () => {
    it('should create from valid options', () => {
      expect(Location.build({ vout: 0 })).to.equal('_o0')
      expect(Location.build({ vin: 1 })).to.equal('_i1')
      expect(Location.build({ vref: 2 })).to.equal('_r2')
      expect(Location.build({ txid, vout: 0 })).to.equal(`${txid}_o0`)
      expect(Location.build({ txid, vref: 1, innerLocation: 'hello' })).to.equal(`${txid}_r1://hello`)
      expect(Location.build({ tempTxid, vout: 3 })).to.equal(`${tempTxid}_o3`)
      expect(Location.build({ error: 'Bad' })).to.equal('!Bad')
    })

    it('should throw for invalid options', () => {
      expect(() => Location.build()).to.throw('Location object is invalid')
      expect(() => Location.build(null)).to.throw('Location object is invalid')
      expect(() => Location.build(`${txid}_o1`)).to.throw('Location object is invalid')
      expect(() => Location.build({})).to.throw('Location index unspecified')
      expect(() => Location.build({ vout: '123' })).to.throw('Location index unspecified')
      expect(() => Location.build({ vin: null })).to.throw('Location index unspecified')
      expect(() => Location.build({ vref: {} })).to.throw('Location index unspecified')
      expect(() => Location.build({ vout: 123.4 })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ vin: -1 })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ vref: Infinity })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ vout: NaN })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ txid, vout: 0, innerLocation: {} })).to.throw('Inner location must be a string')
      expect(() => Location.build({ error: null })).to.throw('Error must be a string')
    })
  })
})


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * mockchain.js
 *
 * Tests for ../lib/mockchain.js
 */

const { PrivateKey, Transaction } = __webpack_require__(0)
const { describe, it, before, beforeEach } = __webpack_require__(2)
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, unobfuscate, createRun } = __webpack_require__(3)
const runBlockchainTestSuite = __webpack_require__(19)

describe('Mockchain', () => {
  const run = createRun({ blockchain: new Run.Mockchain() })
  const tx = run.blockchain.transactions.values().next().value
  beforeEach(() => run.blockchain.block())

  const errors = {
    noInputs: 'tx has no inputs',
    noOutputs: 'tx has no outputs',
    feeTooLow: 'tx fee too low',
    notFullySigned: 'tx not fully signed',
    duplicateInput: 'transaction input 1 duplicate input',
    missingInput: 'tx input 0 missing or spent'
  }

  const sampleTx = {
    txid: tx.hash,
    time: tx.time
  }

  // generate a spending transaction so that we have spentTxId
  before(async () => {
    const utxos = await run.blockchain.utxos(run.purse.address)
    const spentTx = new Transaction().from(utxos).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
    await run.blockchain.broadcast(spentTx)
    sampleTx.vout = [
      {
        spentTxId: undefined,
        spentIndex: undefined,
        spentHeight: undefined
      },
      {
        spentTxId: spentTx.hash,
        spentIndex: 0,
        spentHeight: 0
      }
    ]
  })

  runBlockchainTestSuite(run.blockchain, run.purse.bsvPrivateKey, sampleTx,
    true /* supportsSpentTxIdInBlocks */, true /* supportsSpentTxIdInMempool */,
    0 /* indexingLatency */, errors)

  describe('block', () => {
    it('should update block heights', async () => {
      const txns = []
      for (let i = 0; i < 25; i++) {
        const utxo = (await run.blockchain.utxos(run.purse.address))[0]
        const tx = new Transaction().from(utxo).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
        await run.blockchain.broadcast(tx)
        txns.push(unobfuscate(tx))
      }
      for (let i = 0; i < txns.length; i++) {
        expect(txns[i].blockHeight).to.equal(-1)
        expect(txns[i].outputs[0].spentHeight).to.equal(i < txns.length - 1 ? -1 : null)
      }
      run.blockchain.block()
      for (let i = 0; i < txns.length; i++) {
        expect(txns[i].blockHeight).to.equal(run.blockchain.blockHeight)
        expect(txns[i].outputs[0].spentHeight).to.equal(i < txns.length - 1
          ? run.blockchain.blockHeight : null)
      }
    })

    it('should respect 25 chain limit', async () => {
      for (let i = 0; i < 25; i++) {
        const utxo = (await run.blockchain.utxos(run.purse.address))[0]
        const tx = new Transaction().from(utxo).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
        await run.blockchain.broadcast(tx)
      }
      const utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const tx = new Transaction().from(utxo).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith('too-long-mempool-chain')
      run.blockchain.block()
      await run.blockchain.broadcast(tx)
    })
  })

  describe('performance', () => {
    it('should support fast broadcsts', async () => {
      const utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const start = new Date()
      const tx = new Transaction().from(utxo).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
      await run.blockchain.broadcast(tx)
      expect(new Date() - start < 200).to.equal(true)
    })

    it('should support fast fetches', async () => {
      let utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const earlyTxid = utxo.txid
      const measures = []
      for (let i = 0; i < 1000; i++) {
        const tx = new Transaction().from(utxo).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
        utxo = { txid: tx.hash, vout: 0, script: tx.outputs[0].script, satoshis: tx.outputs[0].satoshis }
        await run.blockchain.broadcast(tx)
        const before = new Date()
        await run.blockchain.fetch(tx.hash)
        await run.blockchain.fetch(earlyTxid)
        measures.push(new Date() - before)
        run.blockchain.block()
      }
      const start = measures.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const end = measures.slice(measures.length - 3).reduce((a, b) => a + b, 0) / 3
      expect(start < 10).to.equal(true)
      expect(end < 10).to.equal(true)
    }).timeout(30000)

    it('should support fast utxo queries', async () => {
      // Generate 10 private keys and fund their addresses
      const privateKeys = []; const addresses = []
      for (let i = 0; i < 10; i++) { privateKeys.push(new PrivateKey()) }
      privateKeys.forEach(privateKey => addresses.push(privateKey.toAddress()))
      addresses.forEach(address => run.blockchain.fund(address, 100000))

      // Send from each address to the next, 1000 times
      const measures = []
      for (let i = 0; i < 1000; i++) {
        const before = new Date()
        const utxos = await run.blockchain.utxos(addresses[i % 10])
        measures.push(new Date() - before)
        const tx = new Transaction().from(utxos).to(addresses[(i + 1) % 10], 1000)
          .change(addresses[i % 10]).sign(privateKeys[i % 10])
        await run.blockchain.broadcast(tx)
        run.blockchain.block()
      }

      // Get an average time to query utxos() at the start and end, and check it didn't change much
      const start = measures.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const end = measures.slice(measures.length - 3).reduce((a, b) => a + b, 0) / 3
      expect(start < 10).to.equal(true)
      expect(end < 10).to.equal(true)
    }).timeout(30000)
  })
})


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * owner.js
 *
 * Tests for ../lib/owner.js
 */

const bsv = __webpack_require__(0)
const { describe, it } = __webpack_require__(2)
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
chai.use(chaiAsPromised)
const { expect } = chai
const { Jig, createRun, hookPay } = __webpack_require__(3)

describe('Owner', () => {
  describe('constructor', () => {
    it('should support creating from bsv private key on testnet', () => {
      const privkey = new bsv.PrivateKey('testnet')
      const run = createRun({ owner: privkey })
      expect(run.owner.privkey).to.equal(privkey.toString())
      expect(run.owner.pubkey).to.equal(privkey.publicKey.toString())
      expect(run.owner.address).to.equal(privkey.toAddress().toString())
    })

    it('should support creating from string private key on mainnet', () => {
      const privkey = new bsv.PrivateKey('mainnet')
      const run = createRun({ network: 'main', owner: privkey.toString() })
      expect(run.owner.privkey).to.equal(privkey.toString())
      expect(run.owner.pubkey).to.equal(privkey.publicKey.toString())
      expect(run.owner.address).to.equal(privkey.toAddress().toString())
    })

    it('should support creating from bsv public key on mainnet', () => {
      const pubkey = new bsv.PrivateKey('mainnet').publicKey
      const run = createRun({ network: 'main', owner: pubkey })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(pubkey.toString())
      expect(run.owner.address).to.equal(pubkey.toAddress().toString())
    })

    it('should support creating from string public key on mocknet', () => {
      const pubkey = new bsv.PrivateKey('testnet').publicKey
      const run = createRun({ network: 'mock', owner: pubkey.toString() })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(pubkey.toString())
      expect(run.owner.address).to.equal(pubkey.toAddress().toString())
    })

    it('should support creating from bsv address on stn', () => {
      const address = new bsv.PrivateKey('testnet').toAddress()
      const run = createRun({ network: 'stn', owner: address })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(undefined)
      expect(run.owner.address).to.equal(address.toString())
    })

    it('should support creating from string address on mainnet', () => {
      const address = new bsv.PrivateKey('livenet').toAddress()
      const run = createRun({ network: 'main', owner: address.toString() })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(undefined)
      expect(run.owner.address).to.equal(address.toString())
    })

    it('should throw if bad owner', () => {
      expect(() => createRun({ owner: '123' })).to.throw('bad owner key or address: 123')
    })

    it('throw if owner private key is on wrong network', () => {
      const owner = new bsv.PrivateKey('testnet').toString()
      expect(() => createRun({ owner, network: 'main' })).to.throw('Private key network mismatch')
    })
  })

  describe('code', () => {
    it('should update with code deployed', async () => {
      const run = createRun()
      class A extends Jig { set (x) { this.x = x }}
      run.deploy(A)
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.code[0].name).to.equal('A')
      expect(run.owner.code[0].origin).to.equal(A.origin)
      expect(run.owner.code[0].location).to.equal(A.location)
      await run.sync()
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.code[0].name).to.equal('A')
      expect(run.owner.code[0].origin).to.equal(A.origin)
      expect(run.owner.code[0].location).to.equal(A.location)
      const a = new A()
      a.set(function add (a, b) { return a + b })
      expect(run.owner.code.length).to.equal(2)
      await run.sync()
      expect(run.owner.code.length).to.equal(2)
    })

    it('should remove if code fails to post', async () => {
      const run = createRun()
      hookPay(run, false)
      class A {}
      run.deploy(A).catch(() => {})
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.code[0].name).to.equal('A')
      expect(run.owner.code[0].origin).to.equal(A.origin)
      expect(run.owner.code[0].location).to.equal(A.location)
      await expect(run.sync()).to.be.rejected
      expect(run.owner.code.length).to.equal(0)
    })
  })

  describe('jigs', () => {
    it('should update with jigs created', async () => {
      const run = createRun()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { send (to) { this.owner = to } }
      A.deps = { B }
      const a = new A()
      expect(run.owner.jigs).to.deep.equal([a])
      const b = a.createB()
      expect(run.owner.jigs).to.deep.equal([a, b])
      await run.sync()
      expect(run.owner.jigs).to.deep.equal([a, b])
      b.send(new bsv.PrivateKey().publicKey.toString())
      expect(run.owner.jigs).to.deep.equal([a])
      await run.sync()
      expect(run.owner.jigs).to.deep.equal([a])
    })

    it('should update jigs on sync', async () => {
      const run = createRun()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { }
      A.deps = { B }
      const a = new A()
      const b = a.createB()
      expect(run.owner.jigs).to.deep.equal([a, b])
      await run.sync()
      const run2 = createRun({ owner: run.owner.privkey, blockchain: run.blockchain })
      const c = new A()
      await run2.sync()
      expect(run2.owner.jigs).to.deep.equal([a, b, c])
    })

    it('should remove jigs when fail to post', async () => {
      const run = createRun()
      hookPay(run, false)
      class A extends Jig {}
      const a = new A()
      expect(run.owner.jigs).to.deep.equal([a])
      expect(run.owner.code.length).to.equal(1)
      await expect(run.sync()).to.be.rejectedWith('tx has no inputs')
      expect(run.owner.jigs.length).to.equal(0)
      expect(run.owner.code.length).to.equal(0)
    })

    it('should support filtering jigs by class', async () => {
      const run = createRun()
      class A extends Jig {}
      class B extends Jig {}
      const a = new A()
      new B() // eslint-disable-line
      expect(run.owner.jigs.find(x => x instanceof A)).to.deep.equal(a)
    })

    it('should support getting jigs without private key', async () => {
      const run = createRun()
      class A extends Jig {}
      const a = await new A().sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.pubkey })
      await run2.sync()
      expect(run2.owner.privkey).to.equal(undefined)
      expect(run2.owner.jigs).to.deep.equal([a])
    })
  })
})


/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * purse.js
 *
 * Tests for ../lib/purse.js
 */

const bsv = __webpack_require__(0)
const { describe, it, beforeEach } = __webpack_require__(2)
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, Jig, createRun, payFor } = __webpack_require__(3)
const { Purse } = Run

// ------------------------------------------------------------------------------------------------
// Pay API tests
// ------------------------------------------------------------------------------------------------

describe('Pay', () => {
  it('should throw not implemented for methods', async () => {
    const pay = new Run.Pay()
    await expect(pay.pay(new bsv.Transaction())).to.be.rejectedWith('Not implemented')
  })
})

// ------------------------------------------------------------------------------------------------
// Purse tests
// ------------------------------------------------------------------------------------------------

describe('Purse', () => {
  const run = createRun()
  beforeEach(() => run.activate())

  describe('constructor', () => {
    describe('key', () => {
      it('should generate random purse if unspecified', () => {
        expect(run.purse.bsvPrivateKey.toString()).not.to.equal(createRun().purse.bsvPrivateKey.toString())
        expect(run.purse.privkey).not.to.equal(createRun().purse.privkey)
      })

      it('should calculate address correctly from private key', () => {
        expect(run.purse.bsvPrivateKey.toAddress().toString()).to.equal(run.purse.address)
      })

      it('should support passing in private key', () => {
        const privkey = new bsv.PrivateKey()
        const run = createRun({ purse: privkey })
        expect(run.purse.privkey).to.equal(privkey.toString())
        expect(run.purse.bsvPrivateKey).to.deep.equal(privkey)
      })

      it('should throw if private key is on wrong network', () => {
        const purse = new bsv.PrivateKey('mainnet').toString()
        expect(() => createRun({ purse, network: 'test' })).to.throw('Private key network mismatch')
      })
    })

    describe('logger', () => {
      it('should support passing in valid logger', () => {
        expect(new Purse({ blockchain: run.blockchain, logger: console }).logger).to.equal(console)
      })

      it('should support passing in null logger', () => {
        expect(new Purse({ blockchain: run.blockchain, logger: null }).logger).to.equal(null)
      })

      it('should support not passing in a logger', () => {
        expect(new Purse({ blockchain: run.blockchain }).logger).to.equal(null)
      })

      it('should throw if pass in an invalid logger', () => {
        expect(() => new Purse({ blockchain: run.blockchain, logger: 123 })).to.throw('Invalid logger option: 123')
        expect(() => new Purse({ blockchain: run.blockchain, logger: () => {} })).to.throw('Invalid logger option: ')
        expect(() => new Purse({ blockchain: run.blockchain, logger: false })).to.throw('Invalid logger option: false')
      })
    })

    describe('splits', () => {
      it('should support passing in valid splits', () => {
        expect(new Purse({ blockchain: run.blockchain, splits: 1 }).splits).to.equal(1)
        expect(new Purse({ blockchain: run.blockchain, splits: 5 }).splits).to.equal(5)
        expect(new Purse({ blockchain: run.blockchain, splits: Number.MAX_SAFE_INTEGER }).splits).to.equal(Number.MAX_SAFE_INTEGER)
      })

      it('should default to 10 if not specified', () => {
        expect(new Purse({ blockchain: run.blockchain }).splits).to.equal(10)
      })

      it('should throw if pass in invalid splits', () => {
        expect(() => new Purse({ blockchain: run.blockchain, splits: 0 })).to.throw('Option splits must be at least 1: 0')
        expect(() => new Purse({ blockchain: run.blockchain, splits: -1 })).to.throw('Option splits must be at least 1: -1')
        expect(() => new Purse({ blockchain: run.blockchain, splits: 1.5 })).to.throw('Option splits must be an integer: 1.5')
        expect(() => new Purse({ blockchain: run.blockchain, splits: NaN })).to.throw('Option splits must be an integer: NaN')
        expect(() => new Purse({ blockchain: run.blockchain, splits: Number.POSITIVE_INFINITY })).to.throw('Option splits must be an integer: Infinity')
        expect(() => new Purse({ blockchain: run.blockchain, splits: false })).to.throw('Invalid splits option: false')
        expect(() => new Purse({ blockchain: run.blockchain, splits: null })).to.throw('Invalid splits option: null')
      })
    })

    describe('feePerKb', () => {
      it('should support passing in valid feePerKb', () => {
        expect(new Purse({ blockchain: run.blockchain, feePerKb: 1.5 }).feePerKb).to.equal(1.5)
        expect(new Purse({ blockchain: run.blockchain, feePerKb: 1000 }).feePerKb).to.equal(1000)
        expect(new Purse({ blockchain: run.blockchain, feePerKb: Number.MAX_SAFE_INTEGER }).feePerKb).to.equal(Number.MAX_SAFE_INTEGER)
      })

      it('should throw if pass in invalid feePerKb', () => {
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: 0 }).feePerKb).to.throw('Option feePerKb must be at least 1: 0')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: -1 })).to.throw('Option feePerKb must be at least 1: -1')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: NaN })).to.throw('Option feePerKb must be finite: NaN')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: Number.POSITIVE_INFINITY })).to.throw('Option feePerKb must be finite: Infinity')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: false })).to.throw('Invalid feePerKb option: false')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: null })).to.throw('Invalid feePerKb option: null')
      })

      it('should default to 1000 if not specified', () => {
        expect(new Purse({ blockchain: run.blockchain }).feePerKb).to.equal(1000)
      })
    })

    describe('blockchain', () => {
      it('should support passing in valid blockchain', () => {
        const mockchain = new Run.Mockchain()
        expect(new Purse({ blockchain: mockchain }).blockchain).to.equal(mockchain)
        const blockchainServer = new Run.BlockchainServer()
        expect(new Purse({ blockchain: blockchainServer }).blockchain).to.equal(blockchainServer)
      })

      it('should throw if pass in invalid blockchain', () => {
        expect(() => new Purse({ blockchain: {} })).to.throw('Invalid blockchain option')
        expect(() => new Purse({ blockchain: false })).to.throw('Invalid blockchain option: false')
      })

      it('should require passing in blockchain', () => {
        expect(() => new Purse()).to.throw('Option blockchain is required')
      })
    })
  })

  describe('splits', () => {
    it('should throw if set invalid value', () => {
      expect(() => { run.purse.splits = -1 }).to.throw('Option splits must be at least 1: -1')
    })
  })

  describe('feePerKb', () => {
    it('should throw if set invalid value', () => {
      expect(() => { run.purse.feePerKb = -1 }).to.throw('Option feePerKb must be at least 1: -1')
    })
  })

  describe('pay', () => {
    it('should adds inputs and outputs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, 100)
      const tx2 = await run.purse.pay(tx)
      expect(tx2.inputs.length).to.equal(1)
      expect(tx2.outputs.length).to.equal(11)
    })

    it('should throw if not enough funds', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, Number.MAX_SAFE_INTEGER)
      await expect(run.purse.pay(tx)).to.be.rejectedWith('Not enough funds')
    })

    it('should throw if no utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, 100)
      let didLogWarning = false
      const logger = { warn: () => { didLogWarning = true } }
      const purse = new Purse({ blockchain: run.blockchain, logger })
      await expect(purse.pay(tx)).to.be.rejectedWith('Not enough funds')
      expect(didLogWarning).to.equal(true)
      const purseWithNoLogger = new Purse({ blockchain: run.blockchain, logger: null })
      await expect(purseWithNoLogger.pay(tx)).to.be.rejectedWith('Not enough funds')
    })

    it('should automatically split utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      await run.blockchain.broadcast(tx)
      const utxos = await run.blockchain.utxos(run.purse.address)
      expect(utxos.length).to.equal(10)
    })

    it('should shuffle UTXOs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      await run.blockchain.broadcast(tx)
      const txBase = await run.purse.pay(new bsv.Transaction().to(address, 100))
      for (let i = 0; i < 100; i++) {
        const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
        const sameTxId = tx2.inputs[0].prevTxId.toString() === txBase.inputs[0].prevTxId.toString()
        const sameIndex = tx2.inputs[0].outputIndex === txBase.inputs[0].outputIndex
        if (!sameTxId || !sameIndex) return
      }
      throw new Error('Did not shuffle UTXOs')
    })

    it('should respect custom feePerKb', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const run = createRun()
      run.purse.feePerKb = 1
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      const feePerKb = tx.getFee() / tx.toBuffer().length * 1000
      const diffFees = Math.abs(feePerKb - 1)
      expect(diffFees < 10).to.equal(true)
      run.purse.feePerKb = 2000
      const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
      const feePerKb2 = tx2.getFee() / tx2.toBuffer().length * 1000
      const diffFees2 = Math.abs(feePerKb2 - 2000)
      expect(diffFees2 < 10).to.equal(true)
    })

    it('should respect custom splits', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const run = createRun()
      run.purse.splits = 1
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      expect(tx.outputs.length).to.equal(2)
      run.purse.splits = 20
      const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
      expect(tx2.outputs.length).to.equal(21)
    })
  })

  describe('balance', () => {
    it('should sum non-jig and non-class utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const send = await payFor(new bsv.Transaction().to(address, 9999), run.purse.bsvPrivateKey, run.blockchain)
      await run.blockchain.broadcast(send)
      createRun({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      const utxos = await run.blockchain.utxos(run.purse.address)
      const nonJigUtxos = utxos.filter(utxo => utxo.satoshis > 100000)
      const balance = nonJigUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
      expect(await run.purse.balance()).to.equal(balance)
    })
  })

  describe('utxos', () => {
    it('should return non-jig and non-class utxos', async () => {
      const run2 = createRun({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      expect((await run2.purse.utxos()).length).to.equal(10)
    })
  })
})


/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * run.js
 *
 * Tests for ../lib/index.js
 */

const { describe, it } = __webpack_require__(2)
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
chai.use(chaiAsPromised)
const { expect } = chai
const { Jig, Run, createRun } = __webpack_require__(3)
const bsv = __webpack_require__(0)
const packageInfo = __webpack_require__(20)

describe('Run', () => {
  describe('constructor', () => {
    describe('logger', () => {
      it('should create default logger', () => {
        expect(!!createRun().logger).to.equal(true)
      })

      it('should accept null logger', () => {
        expect(() => createRun({ logger: null })).not.to.throw()
      })

      it('should throw for invalid logger', () => {
        expect(() => createRun({ logger: 1 })).to.throw('Option \'logger\' must be an object. Received: 1')
        expect(() => createRun({ logger: false })).to.throw('Option \'logger\' must be an object. Received: false')
        expect(() => createRun({ logger: () => {} })).to.throw('Option \'logger\' must be an object. Received: ')
      })

      it('should complete methods for custom logger', () => {
        let infoMessage = ''; let errorMessage = ''; let errorData = null
        const run = createRun({
          logger: {
            info: message => { infoMessage = message },
            error: (message, data) => { errorMessage = message; errorData = data }
          }
        })
        run.logger.info('info')
        run.logger.debug('debug')
        run.logger.warn('warn')
        run.logger.error('error', 1)
        expect(infoMessage).to.equal('info')
        expect(errorMessage).to.equal('error')
        expect(errorData).to.equal(1)
      })
    })

    describe('blockchain', () => {
      it('should create default blockchain', () => {
        const run = new Run()
        expect(run.blockchain instanceof Run.BlockchainServer).to.equal(true)
        expect(run.blockchain.network).to.equal('main')
        expect(run.blockchain.api.name).to.equal('star')
      })

      it('should support creating mockchain', () => {
        const run = createRun({ network: 'mock' })
        expect(run.blockchain instanceof Run.Mockchain).to.equal(true)
        expect(run.blockchain.network).to.equal('mock')
      })

      it('should support creating blockchain service', () => {
        const run = createRun({ blockchain: 'whatsonchain', network: 'test' })
        expect(run.blockchain instanceof Run.BlockchainServer).to.equal(true)
        expect(run.blockchain.api.name).to.equal('whatsonchain')
        expect(run.blockchain.network).to.equal('test')
      })

      it('should accept custom blockchain', () => {
        let fetched = false
        const blockchain = { broadcast: async () => {}, fetch: async () => { fetched = true }, utxos: async () => {}, network: 'main' }
        const run = createRun({ blockchain })
        run.blockchain.fetch()
        expect(fetched).to.equal(true)
      })

      it('should throw for invalid custom blockchain', () => {
        const blockchain = { broadcast: async () => {}, fetch: async () => {}, utxos: async () => {}, network: 'main' }
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { broadcast: null }) })).to.throw('Invalid \'blockchain\'')
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { fetch: null }) })).to.throw('Invalid \'blockchain\'')
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { utxos: null }) })).to.throw('Invalid \'blockchain\'')
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { network: null }) })).to.throw('Invalid \'blockchain\'')
      })

      it('should throw for null blockchain', () => {
        expect(() => createRun({ blockchain: null })).to.throw('Invalid \'blockchain\'')
      })

      it('should throw for invalid blockchain', () => {
        expect(() => createRun({ blockchain: 123 })).to.throw('Option \'blockchain\' must be an object or string. Received: 123')
        expect(() => createRun({ blockchain: false })).to.throw('Option \'blockchain\' must be an object or string. Received: false')
        expect(() => createRun({ blockchain: () => {} })).to.throw('Option \'blockchain\' must be an object or string. Received: ')
      })

      it('should support all networks', () => {
        const networks = ['main', 'test', 'stn', 'mock']
        networks.forEach(network => {
          expect(createRun({ network }).blockchain.network).to.equal(network)
        })
      })

      it('should copy mockchain from previous blockchain', () => {
        const run1 = createRun()
        const run2 = createRun()
        expect(run1.blockchain).to.deep.equal(run2.blockchain)
      })

      it('should copy blockchain cache from previous blockchain', async () => {
        const run1 = createRun({ network: 'test' })
        await run1.blockchain.fetch('d89f6bfb9f4373212ed18b9da5f45426d50a4676a4a684c002a4e838618cf3ee')
        const run2 = createRun({ network: 'test' })
        expect(run1.blockchain).not.to.deep.equal(run2.blockchain)
        expect(run1.blockchain.cache).to.deep.equal(run2.blockchain.cache)
      })
    })

    describe('sandbox', () => {
      it('should default to sandbox enabled', () => {
        expect(new Run({ network: 'mock' }).code.evaluator.sandbox).to.equal(true)
        class A extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).to.throw()
      })

      it('should support enabling sandbox', () => {
        expect(createRun({ sandbox: true }).code.evaluator.sandbox).to.equal(true)
      })

      it('should support disabling sandbox', () => {
        const run = createRun({ network: 'mock', sandbox: false })
        expect(run.code.evaluator.sandbox).to.equal(false)
        class A extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).not.to.throw()
        run.deactivate()
      })

      it('should support RegExp sandbox', () => {
        const run = createRun({ network: 'mock', sandbox: /A/ })
        expect(run.code.evaluator.sandbox instanceof RegExp).to.equal(true)
        class A extends Jig { init () { this.version = Run.version } }
        class B extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).to.throw()
        expect(() => new B()).not.to.throw()
        run.deactivate()
      })

      it('should throw for bad sandbox', () => {
        expect(() => createRun({ sandbox: null })).to.throw('Invalid option \'sandbox\'. Received: null')
        expect(() => createRun({ sandbox: 0 })).to.throw('Option \'sandbox\' must be a boolean or RegExp. Received: 0')
        expect(() => createRun({ sandbox: {} })).to.throw('Invalid option \'sandbox\'. Received:')
        expect(() => createRun({ sandbox: () => {} })).to.throw('Option \'sandbox\' must be a boolean or RegExp. Received: ')
      })
    })

    describe('app', () => {
      it('should default to empty app string', () => {
        expect(createRun().app).to.equal('')
      })

      it('should support custom app name', () => {
        expect(createRun({ app: 'biz' }).app).to.equal('biz')
      })

      it('should throw if bad app name', () => {
        expect(() => createRun({ app: 0 })).to.throw('Option \'app\' must be a string. Received: 0')
        expect(() => createRun({ app: true })).to.throw('Option \'app\' must be a string. Received: true')
        expect(() => createRun({ app: { name: 'biz' } })).to.throw('Option \'app\' must be a string. Received: [object Object]')
      })
    })

    describe('state', () => {
      it('should default to state cache', () => {
        expect(createRun().state instanceof Run.StateCache).to.equal(true)
      })

      it('should support custom state', () => {
        const state = new Run.StateCache()
        expect(createRun({ state }).state).to.deep.equal(state)
      })

      it('should throw if invalid state', () => {
        expect(() => createRun({ state: { get: () => {} } })).to.throw('State requires a set method')
        expect(() => createRun({ state: { set: () => {} } })).to.throw('State requires a get method')
        expect(() => createRun({ state: null })).to.throw('Option \'state\' must not be null')
        expect(() => createRun({ state: false })).to.throw('Option \'state\' must be an object. Received: false')
      })

      it('should copy previous state', () => {
        const run1 = createRun()
        const run2 = createRun()
        expect(run2.state).to.deep.equal(run1.state)
      })
    })

    describe('owner', () => {
      it('should default to random owner', () => {
        const run = createRun()
        expect(run.owner).not.to.equal(null)
        expect(typeof run.owner.privkey).to.equal('string')
      })

      it('should support null owner', () => {
        expect(createRun({ owner: null }).owner).not.to.equal(null)
      })

      it('should throw for invalid owner', () => {
        expect(() => createRun({ owner: 123 })).to.throw('Option \'owner\' must be a valid key or address. Received: 123')
        expect(() => createRun({ owner: false })).to.throw('Option \'owner\' must be a valid key or address. Received: false')
      })
    })

    describe('purse', () => {
      it('should default to random purse', () => {
        const run = createRun()
        expect(run.purse).not.to.equal(null)
        expect(typeof run.purse.privkey).to.equal('string')
      })

      it('should support null purse', () => {
        expect(createRun({ purse: null }).purse).not.to.equal(null)
      })

      it('should throw for invalid purse', () => {
        expect(() => createRun({ purse: {} })).to.throw('Purse requires a pay method')
        expect(() => createRun({ purse: 123 })).to.throw('Option \'purse\' must be a valid private key or Pay API. Received: 123')
        expect(() => createRun({ purse: true })).to.throw('Option \'purse\' must be a valid private key or Pay API. Received: true')
      })
    })

    describe('code', () => {
      it('should default to new code', () => {
        expect(createRun().code instanceof Run.Code).to.equal(true)
      })

      it('should support creating with new code', () => {
        expect(() => createRun({ code: new Run.Code() })).not.to.throw()
      })

      it('should reuse code if possible', () => {
        expect(new Map(createRun().code.installs)).to.deep.equal(new Map(createRun().code.installs))
        expect(new Map(createRun({ sandbox: false }).code.installs))
          .not.to.deep.equal(new Map(createRun({ sandbox: true }).code.installs))
      })

      it('should throw for invalid code', () => {
        expect(() => createRun({ code: null })).to.throw('Option \'code\' must be an instance of Code')
        expect(() => createRun({ code: 123 })).to.throw('Option \'code\' must be an instance of Code')
        expect(() => createRun({ code: false })).to.throw('Option \'code\' must be an instance of Code')
      })
    })

    it('should set global bsv network', () => {
      createRun()
      expect(bsv.Networks.defaultNetwork).to.equal('testnet')
      createRun({ network: 'main' })
      expect(bsv.Networks.defaultNetwork).to.equal('mainnet')
    })
  })

  describe('purse', () => {
    it('throw accept setting valid purse', () => {
      const run = createRun()
      run.purse = new bsv.PrivateKey()
      expect(run.purse instanceof Run.Purse).to.equal(true)
    })

    it('throw throw if set invalid purse', () => {
      const run = createRun()
      expect(() => { run.purse = 123 }).to.throw('Option \'purse\' must be a valid private key or Pay API')
    })
  })

  describe('static properties', () => {
    it('version should match package.json', () => {
      expect(Run.version).to.equal(packageInfo.version)
    })
  })

  describe('load', () => {
    it('should throw if inactive', async () => {
      const run = createRun()
      class A { }
      await run.deploy(A)
      createRun()
      await expect(run.load(A.location)).to.be.rejectedWith('This Run instance is not active')
    })

    it('should throw for invalid arg', async () => {
      const run = createRun()
      await expect(run.load()).to.be.rejectedWith('typeof location is undefined - must be string')
      await expect(run.load(123)).to.be.rejectedWith('typeof location is number - must be string')
      await expect(run.load({})).to.be.rejectedWith('typeof location is object - must be string')
    })
  })

  describe('deploy', () => {
    it('should throw if inactive', async () => {
      class A { }
      const run = createRun()
      createRun()
      await expect(run.deploy(A)).to.be.rejectedWith('This Run instance is not active')
    })

    it('should support batch deploy', async () => {
      class A { }
      const run = createRun()
      run.transaction.begin()
      await run.deploy(A)
      run.transaction.end()
    })
  })

  describe('misc', () => {
    it('should support same owner and purse', async () => {
      const key = new bsv.PrivateKey('testnet')
      const run = createRun({ owner: key, purse: key })
      class A extends Jig { set (name) { this.name = name; return this } }
      const a = await new A().sync()
      const purseUtxos = await run.purse.utxos()
      expect(purseUtxos.length).to.equal(10)
      await run.sync()
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.jigs.length).to.equal(1)

      const txid = run.owner.code[0].location.slice(0, 64)
      const codeVout = parseInt(run.owner.code[0].location.slice(66))
      const jigVout = parseInt(run.owner.jigs[0].location.slice(66))
      expect(codeVout).to.equal(1)
      expect(jigVout).to.equal(2)

      purseUtxos.forEach(utxo => {
        expect(utxo.txid !== txid || utxo.vout !== jigVout).to.equal(true)
        expect(utxo.txid !== txid || utxo.vout !== codeVout).to.equal(true)
      })

      await a.set('a').sync()
    })

    it('should support multiple simultaneous loads', async () => {
      // This tests a tricky timing issue where class dependencies need to be fully
      // loaded before load() returns. There used to be a case where that was possible.
      const run = createRun()
      class A extends Jig { }
      class B extends A { }
      await run.deploy(B)
      class C extends Jig { init () { if (!B) throw new Error() } }
      C.deps = { B }
      await run.deploy(C)
      class D extends C { }
      const d = new D()
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const p1 = run2.load(d.location)
      const p2 = run2.load(d.location)
      await Promise.all([p1, p2])
    })

    it('should reuse state cache', async () => {
      async function timeLoad (network, location) {
        const run = createRun({ network })
        const before = new Date()
        await run.load(location)
        return new Date() - before
      }

      const testLocation = '7d96e1638074471796c6981b12239865b0daeff24ea72fee207338cf2d388ffd_o1'
      const mainLocation = 'a0dd3999349d0cdd116a1a607eb07e5e394355484af3ba7a7a5babe0c2efc5ca_o1'

      expect(await timeLoad('test', testLocation) > 1000).to.equal(true)
      expect(await timeLoad('test', testLocation) > 1000).to.equal(false)

      expect(await timeLoad('main', mainLocation) > 1000).to.equal(true)
      expect(await timeLoad('main', mainLocation) > 1000).to.equal(false)
    }).timeout(30000)

    it.skip('should fail if reuse jigs across code instances', () => {
      // TODO: What should this behavior be?
      class A extends Jig { set (x) { this.x = x } }
      createRun({ code: new Run.Code() })
      const a1 = new A()
      createRun({ code: new Run.Code() })
      const a2 = new A()
      expect(a1.constructor).not.to.equal(a2.constructor)
      expect(() => a2.set(a1)).to.throw('Different code instances')
    })
  })
})


/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * state.js
 *
 * Tests for ../lib/state.js
 */

const bsv = __webpack_require__(0)
const { describe, it, after, beforeEach, afterEach } = __webpack_require__(2)
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, Jig, createRun } = __webpack_require__(3)
const { State, StateCache } = Run

const txid = '0000000000000000000000000000000000000000000000000000000000000000'

describe('StateCache', () => {
  const stateGets = []
  const stateSets = []
  const stateGetOverrides = new Map()

  class WrappedState extends StateCache {
    async get (location) {
      stateGets.push(location)
      if (stateGetOverrides.has(location)) return stateGetOverrides.get(location)
      return super.get(location)
    }

    async set (location, state) {
      stateSets.push({ location, state })
      super.set(location, state)
    }
  }

  function expectStateGet (location) {
    expect(stateGets.shift()).to.equal(location)
  }

  function expectStateSet (location, state) {
    expect(stateSets.shift()).to.deep.equal({ location, state })
  }

  afterEach(() => {
    expect(stateGets.length).to.equal(0)
    expect(stateSets.length).to.equal(0)
  })

  const run = createRun({ state: new WrappedState() })
  beforeEach(() => run.activate())

  // Clear the instance after the state tests so that we don't reuse the WrappedState
  after(() => { Run.instance = null })

  describe('set', () => {
    it('should call set for each update after sync', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      await a.set([true, null])
      await a.sync()
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: [true, null] } })
    })

    it('should cache satoshis', async () => {
      class A extends Jig { init () { this.satoshis = 3000 } }
      const a = new A()
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 3000 } })
    })

    it('should cache owner', async () => {
      const owner = new bsv.PrivateKey().publicKey.toString()
      class A extends Jig { init (owner) { this.owner = owner } }
      const a = new A(owner)
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner, satoshis: 0 } })
    })

    it('should cache new jig references', async () => {
      class B extends Jig { }
      class A extends Jig { init () { this.b = new B() } }
      A.deps = { B }
      const a = new A()
      await run.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0, b: { $ref: '_o4' } } })
      expectStateSet(a.b.location, { type: '_o2', state: { owner: run.owner.pubkey, satoshis: 0 } })
    })

    it('should cache pre-existing jig references', async () => {
      class B extends Jig { }
      class A extends Jig { set (b) { this.b = b } }
      const b = new B()
      const a = new A()
      await a.set(b)
      await run.sync()
      expectStateSet(b.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, b: { $ref: b.location } } })
    })

    it('should cache code references', async () => {
      class B extends Jig { }
      run.deploy(B)
      class A extends Jig { init () { this.A = A; this.B = B } }
      A.deps = { B }
      const a = new A()
      await run.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0, A: { $ref: '_o1' }, B: { $ref: B.location } } })
    })

    it('should respect max cache size', async () => {
      const state = new Run.StateCache({ maxSizeMB: 400 / 1000 / 1000 })
      for (let i = 0; i < 100; i++) {
        await state.set(`${txid}_o` + i, i)
      }
      expect(state.cache.size < 100).to.equal(true)
      expect(state.cache.has(`${txid}_o99`)).to.equal(true)
      expect(state.cache.has(`${txid}_o0`)).to.equal(false)
    })

    it('should move existing values to the front of the cache', async () => {
      const state = new Run.StateCache({ maxSizeMB: 30 })
      await state.set(`${txid}_o0`, undefined)
      await state.set(`${txid}_o1`, undefined)
      await state.set(`${txid}_o2`, undefined)
      expect(state.cache.keys().next().value).to.equal(`${txid}_o0`)
      const sizeBytesBefore = state.sizeBytes
      expect(sizeBytesBefore).not.to.equal(0)
      await state.set(`${txid}_o0`, undefined)
      expect(state.sizeBytes).to.equal(sizeBytesBefore)
      expect(state.cache.keys().next().value).to.equal(`${txid}_o1`)
    })

    it('should throw for different values of same key', async () => {
      const state = new Run.StateCache({ maxSizeMB: 30 })
      await state.set(`${txid}_o0`, { n: 1 })
      await expect(state.set(`${txid}_o0`, { n: 2 })).to.be.rejectedWith('Attempt to set different states for the same location')
      await expect(state.set(`${txid}_o0`, { n: 'a' })).to.be.rejectedWith('Attempt to set different states for the same location')
      await expect(state.set(`${txid}_o0`, { n: 'a', m: 'b' })).to.be.rejectedWith('Attempt to set different states for the same location')
    })
  })

  describe('get', () => {
    it('should return latest state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      const a2 = await run.load(a.location)
      expectStateGet(a2.location)
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
    })

    it('should return original state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      stateGetOverrides.set(a.location, undefined)
      const a2 = await run.load(a.location)
      expectStateGet(a2.location)
      expectStateGet(a2.origin)
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
    })

    it('should return middle state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      const middleLocation = a.location
      a.set(a)
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(middleLocation, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: { $ref: '_o1' } } })
      stateGetOverrides.set(a.location, undefined)
      const a2 = await run.load(a.location)
      expectStateGet(a2.location)
      expectStateGet(middleLocation)
      expectStateSet(middleLocation, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: { $ref: '_o1' } } })
    })

    it('should throw if invalid state', async () => {
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      // Load without a type property
      stateGetOverrides.set(a.location, { state: { owner: run.owner.pubkey, satoshis: 0 } })
      await expect(run.load(a.location)).to.be.rejectedWith('Cached state is missing a valid type and/or state property')
      expectStateGet(a.location)
      // Load without a state property
      stateGetOverrides.set(a.location, { type: A.location })
      await expect(run.load(a.location)).to.be.rejectedWith('Cached state is missing a valid type and/or state property')
      expectStateGet(a.location)
      // Load correct state
      stateGetOverrides.clear()
      await run.load(a.location)
      expectStateGet(a.location)
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
    })

    it('should return undefined if missing', async () => {
      const state = new Run.StateCache({ maxSizeMB: 30 })
      expect(await state.get(`${txid}_o0`)).to.equal(undefined)
    })

    it.skip('should throw if hashed state does not match', async () => {
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      stateGetOverrides.set(a.location, { n: 1 })
      await expect(run.load(a.location)).to.be.rejectedWith('hello')
      expectStateGet(a.location)
    })

    // TODO: pending state of jigs changed, make sure does not interfere in publishNext
  })
})

describe('State', () => {
  it('should throw not implemented errors', async () => {
    await expect(new State().get(`${txid}_o0`)).to.be.rejectedWith('Not implemented')
    await expect(new State().set(`${txid}_o0`, 0)).to.be.rejectedWith('Not implemented')
  })
})


/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * token.js
 *
 * Tests for ../lib/token.js
 */

const bsv = __webpack_require__(0)
const { describe, it, beforeEach } = __webpack_require__(2)
const { Run, createRun, deploy } = __webpack_require__(3)
const { Token } = Run
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Token', () => {
  const run = createRun()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())

  class TestToken extends Token { }
  TestToken.decimals = 2

  describe('init', () => {
    it('should mint new tokens', () => {
      const token = new TestToken(100)
      expect(token.amount).to.equal(100)
      expect(token.owner).to.equal(TestToken.owner)
    })

    it('should throw if owner is not minting', async () => {
      await run.deploy(TestToken)
      createRun({ blockchain: run.blockchain })
      expect(() => new TestToken(100)).to.throw('Only TestToken\'s owner may mint')
    })

    it('should throw if class is not extended', () => {
      expect(() => new Token(100)).to.throw('Token must be extended')
    })

    it('should support large amounts', () => {
      expect(new TestToken(2147483647).amount).to.equal(2147483647)
      expect(new TestToken(Number.MAX_SAFE_INTEGER).amount).to.equal(Number.MAX_SAFE_INTEGER)
    })

    it('should throw for bad amounts', () => {
      expect(() => new TestToken()).to.throw('amount is not a number')
      expect(() => new TestToken('1')).to.throw('amount is not a number')
      expect(() => new TestToken(0)).to.throw('amount must be positive')
      expect(() => new TestToken(-1)).to.throw('amount must be positive')
      expect(() => new TestToken(Number.MAX_SAFE_INTEGER + 1)).to.throw('amount too large')
      expect(() => new TestToken(1.5)).to.throw('amount must be an integer')
      expect(() => new TestToken(Infinity)).to.throw('Infinity cannot be serialized')
      expect(() => new TestToken(NaN)).to.throw('NaN cannot be serialized')
    })
  })

  describe('send', () => {
    it('should support sending full amount', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      expect(token.send(pubkey)).to.equal(null)
      expect(token.owner).to.equal(pubkey)
      expect(token.amount).to.equal(100)
    })

    it('should support sending partial amount', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      const change = token.send(pubkey, 30)
      expect(change).to.be.instanceOf(TestToken)
      expect(change.owner).to.equal(run.owner.pubkey)
      expect(change.amount).to.equal(70)
      expect(token.owner).to.equal(pubkey)
      expect(token.amount).to.equal(30)
    })

    it('should throw if send too much', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      expect(() => token.send(pubkey, 101)).to.throw('not enough funds')
    })

    it('should throw if send bad amount', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      expect(() => token.send(pubkey, {})).to.throw('amount is not a number')
      expect(() => token.send(pubkey, '1')).to.throw('amount is not a number')
      expect(() => token.send(pubkey, 0)).to.throw('amount must be positive')
      expect(() => token.send(pubkey, -1)).to.throw('amount must be positive')
      expect(() => token.send(pubkey, Number.MAX_SAFE_INTEGER + 1)).to.throw('amount too large')
      expect(() => token.send(pubkey, 1.5)).to.throw('amount must be an integer')
      expect(() => token.send(pubkey, Infinity)).to.throw('Infinity cannot be serialized')
      expect(() => token.send(pubkey, NaN)).to.throw('NaN cannot be serialized')
    })

    it('should throw if send to bad owner', () => {
      const token = new TestToken(100)
      expect(() => token.send(10)).to.throw('owner must be a pubkey string')
      expect(() => token.send('abc', 10)).to.throw('owner is not a valid public key')
    })
  })

  describe('combine', () => {
    it('should support combining two tokens', () => {
      const a = new TestToken(30)
      const b = new TestToken(70)
      const c = TestToken.combine(a, b)
      expect(c).to.be.instanceOf(TestToken)
      expect(c.amount).to.equal(100)
      expect(c.owner).to.equal(run.owner.pubkey)
      expect(a.amount).to.equal(0)
      expect(a.owner).not.to.equal(run.owner.pubkey)
      expect(b.amount).to.equal(0)
      expect(b.owner).not.to.equal(run.owner.pubkey)
    })

    it('should support combining many tokens', () => {
      const tokens = []
      for (let i = 0; i < 10; ++i) tokens.push(new TestToken(1))
      const combined = TestToken.combine(...tokens)
      expect(combined).to.be.instanceOf(TestToken)
      expect(combined.amount).to.equal(10)
      expect(combined.owner).to.equal(run.owner.pubkey)
      tokens.forEach(token => {
        expect(token.amount).to.equal(0)
        expect(token.owner).not.to.equal(run.owner.pubkey)
      })
    })

    it('should support load after combine', async () => {
      const a = new TestToken(30)
      const b = new TestToken(70)
      const c = TestToken.combine(a, b)
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain, code: run.code })
      const c2 = await run2.load(c.location)
      expect(c2.amount).to.equal(c.amount)
    })

    it('should throw if combine different owners without signatures', async () => {
      const a = new TestToken(1)
      const b = new TestToken(2)
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      b.send(pubkey)
      await expect(TestToken.combine(a, b).sync()).to.be.rejectedWith('Signature missing for TestToken')
    })

    it('should throw if combined amount is too large', () => {
      const a = new TestToken(Number.MAX_SAFE_INTEGER)
      const b = new TestToken(1)
      expect(() => TestToken.combine(a, b)).to.throw('amount too large')
    })

    it('should throw if combine only one token', () => {
      expect(() => TestToken.combine(new TestToken(1))).to.throw('must combine at least two tokens')
    })

    it('should throw if combine no tokens', () => {
      expect(() => TestToken.combine()).to.throw('must combine at least two tokens')
    })

    it('should throw if combine non-tokens', () => {
      const error = 'cannot combine different token classes'
      expect(() => TestToken.combine(new TestToken(1), 1)).to.throw(error)
      expect(() => TestToken.combine(new TestToken(1), {})).to.throw(error)
      expect(() => TestToken.combine(new TestToken(1), new TestToken(1), {})).to.throw(error)
    })

    it('should throw if combine different token classes', () => {
      const error = 'cannot combine different token classes'
      class DifferentToken extends Token { }
      class ExtendedToken extends TestToken { }
      expect(() => TestToken.combine(new TestToken(1), new DifferentToken(1))).to.throw(error)
      expect(() => TestToken.combine(new TestToken(1), new ExtendedToken(1))).to.throw(error)
    })

    it('should throw if combine duplicate tokens', () => {
      const token = new TestToken(1)
      expect(() => TestToken.combine(token, token)).to.throw('cannot combine duplicate tokens')
    })
  })

  describe('value', () => {
    it('should default to 0', () => {
      class Token2 extends Token { }
      expect(Token2.decimals).to.equal(0)
      expect(new Token2(120).value).to.equal(120)
    })

    it('should divide amount by decimals', () => {
      expect(new TestToken(120).value).to.equal(1.2)
    })
  })

  describe('_onMint', () => {
    it.skip('should support limiting supply', async () => {
      // TODO: need a good way to do this, ideally using class properties
    })
  })

  it.skip('should deploy', async () => {
    await deploy(Token)
  }).timeout(30000)
})


/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(Buffer) {/**
 * transaction.js
 *
 * Tests for ../lib/transaction.js
 */

const bsv = __webpack_require__(0)
const { Run, Jig, createRun, payFor } = __webpack_require__(3)
const chai = __webpack_require__(1)
const chaiAsPromised = __webpack_require__(6)
const { expect } = chai
chai.use(chaiAsPromised)
const { describe, it, beforeEach, afterEach } = __webpack_require__(2)
const { extractRunData, encryptRunData, decryptRunData } = Run._util

describe('Transaction', () => {
  const run = createRun()
  const owner = run.owner.pubkey
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())
  afterEach(() => run.transaction.rollback())
  afterEach(() => run.sync())

  describe('inspect', () => {
    it('should support no actions', () => {
      expect(run.transaction.actions.length).to.equal(0)
      class A extends Jig { }
      new A() // eslint-disable-line
      expect(run.transaction.actions.length).to.equal(0)
      // expect(run.transaction.inputs.length).to.equal(0)
      // expect(run.transaction.outputs.length).to.equal(0)
    })

    it('should return new jig action', async () => {
      class A extends Jig { init (x) { this.x = x } }
      run.transaction.begin()
      const a = new A(1)
      expect(run.transaction.actions).to.deep.equal([{ target: a, method: 'init', args: [1] }])
      // expect(run.transaction.inputs.length).to.equal(0)
      // expect(run.transaction.outputs).to.deep.equal([a])
    })

    it('should return jig update action', () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      run.transaction.begin()
      a.set(a)
      expect(run.transaction.actions).to.deep.equal([{ target: a, method: 'set', args: [a] }])
      // expect(run.transaction.inputs).to.deep.equal([a])
      // expect(run.transaction.outputs).to.deep.equal([a])
    })

    it('should return batch of actions', () => {
      class A extends Jig { set (x) { this.x = x } }
      const b = new A()
      run.transaction.begin()
      const a = new A()
      a.set(1)
      a.set([a])
      b.set(2)
      expect(run.transaction.actions).to.deep.equal([
        { target: a, method: 'init', args: [] },
        { target: a, method: 'set', args: [1] },
        { target: a, method: 'set', args: [[a]] },
        { target: b, method: 'set', args: [2] }
      ])
      // expect(run.transaction.inputs).to.deep.equal([b])
      // expect(run.transaction.outputs).to.deep.equal([a, a])
    })
  })

  describe('export', () => {
    it('should create transaction with no operations', () => {
      expect(() => run.transaction.export()).to.throw('No transaction in progress')
      run.transaction.begin()
      const tx = run.transaction.export()
      expect(tx.inputs.length).to.equal(0)
      expect(tx.outputs.length).to.equal(1)
      const runData = extractRunData(tx)
      expect(runData).to.deep.equal({ code: [], actions: [], jigs: 0 })
    })

    it('should create transaction with new jig', () => {
      class A extends Jig { }
      run.transaction.begin()
      const a = new A() // eslint-disable-line
      const tx = run.transaction.export()
      expect(tx.inputs.length).to.equal(0)
      expect(tx.outputs.length).to.equal(3)
      const runData = extractRunData(tx)
      expect(runData).to.deep.equal({
        code: [{ text: A.toString(), owner: run.owner.pubkey }],
        actions: [{ target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }],
        jigs: 1
      })
    })

    it('should throw if there are dependent queued transactions', () => {
      class A extends Jig { set (x) { this.x = x }}
      const a = new A()
      run.transaction.begin()
      a.set(1)
      expect(() => run.transaction.export()).to.throw('must not have any queued transactions before exporting')
    })

    it('should cache repeated calls to export', async () => {
      class A extends Jig { set (x) { this.x = x }}
      run.transaction.begin()
      const a = new A()
      const tx = run.transaction.export()
      expect(run.transaction.export()).to.deep.equal(tx)
      a.set(1)
      const tx2 = run.transaction.export()
      expect(tx2).not.to.deep.equal(tx)
      run.deploy(class B {})
      expect(run.transaction.export()).not.to.deep.equal(tx2)
    })
  })

  describe('import', () => {
    it('should support importing empty actions', async () => {
      run.transaction.begin()
      const tx = run.transaction.export()
      run.transaction.rollback()
      await run.transaction.import(tx)
      expect(run.transaction.actions.length).to.equal(0)
      class A extends Jig {}
      new A() // eslint-disable-line
      const tx2 = run.transaction.export()
      expect(tx2.outputs.length).to.equal(3)
    })

    it('should support importing new jig', async () => {
      run.transaction.begin()
      class B extends Jig { }
      class A extends B { set (x) { this.x = x }}
      A.author = 'abc'
      new A() // eslint-disable-line
      const tx = run.transaction.export()
      expect(tx.outputs.length).to.equal(4)
      run.transaction.rollback()
      await run.transaction.import(tx)
      expect(run.transaction.actions.length).to.equal(1)
      const a = run.transaction.actions[0].target
      expect(() => a.origin).to.throw('sync required before reading origin')
      a.set(1)
      expect(run.transaction.actions.length).to.equal(2)
      const tx2 = run.transaction.export()
      expect(tx2.outputs.length).to.equal(4)
    })

    it('should throw if invalid run transaction', async () => {
      await expect(run.transaction.import(new bsv.Transaction())).to.be.rejectedWith('not a run tx')
    })

    it('should throw if transaction already in progress', async () => {
      run.transaction.begin()
      run.deploy(class A {})
      const tx = run.transaction.export()
      run.transaction.rollback()
      run.transaction.begin()
      run.deploy(class A {})
      await expect(run.transaction.import(tx)).to.be.rejectedWith('transaction already in progress. cannot import.')
    })

    it('should support exporting then importing transaction', async () => {
      const run = createRun({ network: 'mock' })
      class Dragon extends Jig {}
      run.transaction.begin()
      new Dragon() // eslint-disable-line
      new Dragon() // eslint-disable-line
      await run.transaction.pay()
      await run.transaction.sign()
      const tx = run.transaction.export()
      const tx2 = new bsv.Transaction(tx.toBuffer())
      run.transaction.rollback()
      await run.transaction.import(tx2)
      run.transaction.end()
      await run.sync()
    })
  })

  describe('sign', () => {
    it('should fully sign transaction with owner keys', async () => {
      class A extends Jig { set (x) { this.x = x }}
      run.transaction.begin()
      const a = new A()
      // TODO: enable after owner inputs
      // expect(run.transaction.export().isFullySigned()).to.equal(false)
      await run.transaction.sign()
      expect(run.transaction.export().isFullySigned()).to.equal(true)
      run.transaction.end()
      await run.sync()
      run.transaction.begin()
      a.set(1)
      expect(run.transaction.export().isFullySigned()).to.equal(false)
      await run.transaction.sign()
      expect(run.transaction.export().isFullySigned()).to.equal(true)
    })

    it('should support atomic updates', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      await run.sync()

      const run2 = createRun({ blockchain: run.blockchain })
      const b = new A()
      await run2.sync()

      run2.transaction.begin()
      a.set(1)
      b.set(1)
      await run2.transaction.pay()
      await run2.transaction.sign()
      const tx = run2.transaction.export()

      run.activate()
      await run.transaction.import(tx)
      run.transaction.end()
      await run.sync()
    })
  })

  describe('pay', () => {
    it('should fully pay for transaction with purse', async () => {
      class A extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      await run.transaction.pay()
      const tx = run.transaction.export()
      expect(tx.outputs.length).to.equal(4)
      expect(tx.getFee() >= tx.toBuffer().length).to.equal(true)
    })
  })

  describe('publish', () => {
    const run = createRun({ app: 'biz', blockchain: new Run.Mockchain() })
    const owner = run.owner.pubkey
    let tx = null; let data = null
    const origBroadcast = run.blockchain.broadcast.bind(run.blockchain)
    run.blockchain.broadcast = async txn => {
      tx = txn
      if (tx.outputs[0].script.isSafeDataOut()) {
        data = decryptRunData(tx.outputs[0].script.chunks[5].buf.toString('utf8'))
        expect(tx.outputs.length > data.code.length + data.jigs + 1)
      } else { data = null }
      return origBroadcast(tx)
    }
    beforeEach(() => run.activate())
    beforeEach(() => run.blockchain.block())

    it('should publish new basic jig', async () => {
      class A extends Jig {}
      const a = await new A().sync()
      expect(data.code).to.deep.equal([{ text: A.toString(), owner }])
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args: [], creator: owner }])
      expect(data.jigs).to.equal(1)
      expect(A.location).to.equal(`${tx.hash}_o1`)
      expect(a.location).to.equal(`${tx.hash}_o2`)
    })

    it('should corretly set owners on code and jig outputs', async () => {
      const pubkey = new bsv.PrivateKey().toPublicKey()
      class A extends Jig { f (owner) { this.owner = owner; return this } }
      const a = await new A().sync()
      expect(tx.outputs[1].script.toAddress().toString()).to.equal(run.owner.address)
      expect(tx.outputs[2].script.toAddress().toString()).to.equal(run.owner.address)
      await a.f(pubkey.toString()).sync()
      expect(tx.outputs[1].script.toAddress().toString()).to.equal(pubkey.toAddress().toString())
    })

    it('should correctly set satoshis on code and jig outputs', async () => {
      class A extends Jig { f (satoshis) { this.satoshis = satoshis; return this } }
      const a = await new A().sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      expect(tx.outputs[2].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(1).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(0).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(bsv.Transaction.DUST_AMOUNT).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(bsv.Transaction.DUST_AMOUNT + 1).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT + 1)
      run.blockchain.fund(run.purse.address, 300000000)
      run.transaction.begin()
      new A().f(1000)
      a.f(100000000)
      run.transaction.end()
      await run.sync()
      expect(tx.outputs[1].satoshis).to.equal(1000)
      expect(tx.outputs[2].satoshis).to.equal(100000000)
    })

    it('should only deploy code once', async () => {
      class A extends Jig {}
      const a = new A()
      await new A().sync() // eslint-disable-line
      expect(data.code).to.deep.equal([])
      const target = `${a.origin.slice(0, 64)}_o1`
      expect(data.actions).to.deep.equal([{ target, method: 'init', args: [], creator: run.owner.pubkey }])
      expect(data.jigs).to.equal(1)
    })

    it('should only deploy code once in batch', async () => {
      class A extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      new A() // eslint-disable-line
      await run.transaction.end().sync()
      expect(data.code).to.deep.equal([{ text: A.toString(), owner }])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
      ])
      expect(data.jigs).to.equal(2)
    })

    it('should deploy code in batch', async () => {
      class A extends Jig {}
      class B extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      new B() // eslint-disable-line
      await run.transaction.end().sync()
      expect(data.code).to.deep.equal([
        { text: A.toString(), owner },
        { text: B.toString(), owner }
      ])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o2', method: 'init', args: [], creator: run.owner.pubkey }
      ])
      expect(data.jigs).to.equal(2)
    })

    it('should support basic jig args', async () => {
      class A extends Jig { init (a, b) { this.a = a; this.b = b }}
      await new A(1, { a: 'a' }).sync() // eslint-disable-line
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args: [1, { a: 'a' }], creator: run.owner.pubkey }])
    })

    it('should support passing jigs as args', async () => {
      class A extends Jig {
        init (n) { this.n = n }

        f (a) { this.x = a.n; return this }
      }
      const a = await new A(1).sync()
      const b = await new A(2).sync()
      await a.f(b).sync()
      const arg = { $ref: '_r0' }
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'f', args: [arg] }])
      expect(data.refs).to.deep.equal([b.location])
    })

    it('should support passing jigs as args without reading them', async () => {
      class A extends Jig { f (a) { this.a = a; return this } }
      const a = await new A().sync()
      const b = await new A().sync()
      await a.f(b, { a }, [b]).sync()
      const aref = { $ref: '_i0' }
      const bref = { $dup: 0 }
      const dups = [{ $ref: b.location }]
      const args = { $dedup: [bref, { a: aref }, [bref]], dups }
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'f', args: args }])
    })

    it('should support passing classes as args', async () => {
      class A extends Jig {
        init (a) { this.a = a }

        set (x) { this.x = x; return this }
      }
      class B { }
      class C extends A { }
      const a = await new A(A).sync()
      const args = [{ $ref: '_o1' }]
      expect(data.code).to.deep.equal([{ text: A.toString(), owner }])
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args, creator: run.owner.pubkey }])
      expect(data.jigs).to.equal(1)
      await a.set(B).sync()
      expect(data.code).to.deep.equal([{ text: B.toString(), owner }])
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: '_o1' }] }])
      expect(data.jigs).to.equal(1)
      await new C().sync()
      await a.set(C).sync()
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: `${C.location}` }] }])
      await a.set(A).sync()
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: `${A.location}` }] }])
    })

    it('should support passing classes as args in a batch transaction', async () => {
      class A extends Jig { set (x) { this.x = x } }
      class B { }
      run.transaction.begin()
      const a = new A()
      a.set(B)
      run.transaction.end()
      await run.sync()
      expect(data.code).to.deep.equal([
        { text: A.toString(), owner },
        { text: B.toString(), owner }
      ])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o3', method: 'set', args: [{ $ref: '_o2' }] }
      ])
      expect(data.jigs).to.equal(1)
    })

    it('should support batch method calls', async () => {
      class A extends Jig { f (a) { this.a = a }}
      run.transaction.begin()
      const a = new A()
      a.f(1)
      a.f(2)
      a.f(3)
      await run.transaction.end().sync()
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o2', method: 'f', args: [1] },
        { target: '_o2', method: 'f', args: [2] },
        { target: '_o2', method: 'f', args: [3] }
      ])
      expect(data.jigs).to.equal(1)
    })

    it('should support reading class props', async () => {
      class B extends Jig { }
      const b = new B()
      await run.sync()
      class C extends Jig { }
      C.m = 'n'
      class A extends C { }
      A.s = 'a'
      A.n = 1
      A.a = [true, 'true']
      A.b = false
      A.x = null
      A.o = { x: 2 }
      A.j = b
      run.deploy(A)
      await run.sync()
      const defC = { text: C.toString(), props: { m: 'n' }, owner }
      const propsA = { s: 'a', n: 1, a: [true, 'true'], b: false, x: null, o: { x: 2 }, j: { $ref: `${b.location}` } }
      const defA = { text: A.toString(), deps: { C: '_o1' }, props: propsA, owner }
      expect(data.code).to.deep.equal([defC, defA])
      expect(data.actions).to.deep.equal([])
      expect(data.jigs).to.equal(0)
      expect(A.location).to.equal(`${tx.hash}_o2`)
    })

    it('should support non-spending reads', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      const b = new B()
      b.apply(a2)
      await run.sync()
      expect(data).to.deep.equal({
        code: [],
        actions: [{ target: '_i0', method: 'apply', args: [{ $ref: '_r0' }] }],
        jigs: 1,
        refs: [a2.location]
      })
      expect(b.n).to.equal(2)
    })

    it('should store custom app name', async () => {
      class A extends Jig { }
      await run.deploy(A)
      expect(tx.outputs[0].script.chunks[4].buf.toString('utf8')).to.equal('biz')
    })
  })

  describe('load', () => {
    const build = async (code, actions, inputLocations, outputAddr, jigs, refs = [], nout = jigs + code.length, satoshis) => {
      const bsvNetwork = Run._util.bsvNetwork(run.blockchain.network)
      const addr = outputAddr || new bsv.Address(run.owner.address, bsvNetwork).toString()
      const data = { code, actions, jigs, refs }
      const payload = Buffer.from(encryptRunData(data), 'utf8')
      const script = bsv.Script.buildSafeDataOut([
        Buffer.from('run', 'utf8'),
        Buffer.from([Run.protocol], 'hex'),
        Buffer.alloc(0),
        payload,
        Buffer.from('r11r', 'utf8')
      ])
      const tx = new bsv.Transaction().addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))
      for (let i = 0; i < nout; i++) { tx.to(addr, satoshis ? satoshis[i] : bsv.Transaction.DUST_AMOUNT) }
      for (const loc of inputLocations) {
        const txid = loc.slice(0, 64)
        const vout = parseInt(loc.slice(66))
        const output = (await run.blockchain.fetch(txid)).outputs[vout]
        tx.from({ txid, vout, script: output.script, satoshis: output.satoshis })
      }
      await payFor(tx, run.purse.bsvPrivateKey, run.blockchain)
      tx.sign(run.owner.bsvPrivateKey)
      await run.blockchain.broadcast(tx)
      return tx.hash
    }
    beforeEach(() => run.blockchain.fund(run.purse.address, 100000000))

    it('should load new jig', async () => {
      class A extends Jig { init (n) { this.n = n }}
      const code = [{ text: A.toString(), owner }]
      const actions = [{ target: '_o1', method: 'init', args: [3], creator: run.owner.pubkey }]
      const txid = await build(code, actions, [], null, 1)
      const a = await run.load(txid + '_o2')
      expect(a.n).to.equal(3)
    })

    it('should load jig method call', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = await new A().sync()
      const actions = [{ target: '_i0', method: 'f', args: [1] }]
      const txid = await build([], actions, [a.location], null, 1)
      const a2 = await run.load(txid + '_o1')
      expect(a2.n).to.equal(1)
    })

    it('should load batch of jig updates', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = await new A().sync()
      const b = await new A().sync()
      const actions = [
        { target: '_i0', method: 'f', args: [1] },
        { target: '_i1', method: 'f', args: [2] }
      ]
      const txid = await build([], actions, [a.location, b.location], null, 2)
      const a2 = await run.load(txid + '_o1')
      const b2 = await run.load(txid + '_o2')
      expect(a2.n).to.equal(1)
      expect(b2.n).to.equal(2)
    })

    it('should load complex batch of updates', async () => {
      class B extends Jig { init () { this.n = 1 }}
      class A extends Jig { init (b) { this.n = b.n + 1 } }
      const code = [{ text: B.toString(), owner }, { text: A.toString(), owner }]
      const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
      const args = [{ $ref: '_o3' }]
      const actions = [action1, { target: '_o2', method: 'init', args, creator: run.owner.pubkey }]
      const txid = await build(code, actions, [], null, 2)
      const b = await run.load(txid + '_o3')
      const a = await run.load(txid + '_o4')
      expect(b.n).to.equal(1)
      expect(a.n).to.equal(2)
    })

    it('should load complex args with jig references', async () => {
      class B extends Jig { g () { this.n = 1 } }
      class A extends Jig { f (a, b) { this.a = a; b[0].g() }}
      const b = await new B().sync()
      const b2 = await new B().sync()
      const a = await new A().sync()
      const args = [{ $ref: `${b2.location}` }, [{ $ref: '_i1' }]]
      const actions = [{ target: '_i0', method: 'f', args }]
      const txid = await build([], actions, [a.location, b.location], null, 2)
      const a2 = await run.load(txid + '_o1')
      const b3 = await run.load(txid + '_o2')
      expect(b3.n).to.equal(1)
      expect(a2.a.origin).to.equal(b2.origin)
    })

    it('should support sending to new owner after changing networks', async () => {
      bsv.Networks.defaultNetwork = 'mainnet'
      class A extends Jig { send (to) { this.owner = to } }
      const a = await new A().sync()
      const privkey = new bsv.PrivateKey('testnet')
      const actions = [{ target: '_i0', method: 'send', args: [`${privkey.publicKey.toString()}`] }]
      const txid = await build([], actions, [a.location], privkey.toAddress().toString(), 1)
      await run.load(txid + '_o1')
    })

    it('should support non-spending read refs', async () => {
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A(1)
      const b = new B()
      await run.sync()
      const actions = [{ target: '_i0', method: 'apply', args: [{ $ref: '_r0' }] }]
      const txid = await build([], actions, [b.location], null, 1, [a.location])
      const b2 = await run.load(txid + '_o1')
      expect(b2.n).to.equal(1)
    })

    it('should support setting static class property jig', async () => {
      const run = createRun()
      class Store extends Jig {
        set (value) { this.value = value }
      }
      class SetAction extends Jig {
        init (value) { SetAction.store.set(value) }
      }
      SetAction.store = new Store()
      const action = new SetAction(10)
      await run.sync()

      // Clear caches and reload
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.load(action.location)
    })

    describe('errors', () => {
      it('should throw if no data', async () => {
        const tx = await payFor(new bsv.Transaction(), run.purse.bsvPrivateKey, run.blockchain)
        await run.blockchain.broadcast(tx)
        await expect(run.load(tx.hash + '_o0')).to.be.rejectedWith(`not a run tx: ${tx.hash}`)
        await expect(run.load(tx.hash + '_o1')).to.be.rejectedWith(`not a run tx: ${tx.hash}`)
      })

      it('should throw if bad output target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_o1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('target _o1 missing')
      })

      it('should throw if bad input target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_i1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        const tx = await run.blockchain.fetch(txid)
        const purseOutput = tx.inputs[1].prevTxId.toString('hex') + '_o' + tx.inputs[1].outputIndex
        const error = `Error loading ref _i1 at ${purseOutput}`
        await expect(run.load(txid + '_o1')).to.be.rejectedWith(error)
      })

      it('should throw if nonexistant target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: 'abc_o1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad method', async () => {
        class A extends Jig { }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad json args', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: 0 }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad class arg', async () => {
        class A extends Jig { f (n) { this.n = n } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [{ $class: 'Map' }] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('[object Object] cannot be deserialized')
      })

      it('should throw if nonexistant jig arg', async () => {
        class A extends Jig { f (a) { this.a = a } }
        const a = await new A().sync()
        const nonexistant = { $ref: 'abc_o2' }
        const actions = [{ target: '_i0', method: 'f', args: [nonexistant] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('bad number of jigs', async () => {
        class A extends Jig { f () { this.n = 1 } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 0)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('bad number of jigs')
      })

      it('should throw if missing read input', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const b = await new B().sync()
        const code = [{ text: A.toString(), owner }]
        const args = [{ $ref: `${b.location}` }]
        const actions = [{ target: '_o1', method: 'init', args, creator: run.owner.pubkey }]
        const txid = await build(code, actions, [], null, 2)
        await expect(run.load(txid + '_o3')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing write input', async () => {
        class B extends Jig { f () { this.n = 1 } }
        class A extends Jig { f (b) { b.f() } }
        const b = await new B().sync()
        const a = await new A().sync()
        const args = [{ $ref: `${b.location}` }]
        const actions = [{ target: '_i1', method: 'f', args }]
        const txid = await build([], actions, [a.location], null, 2)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing read output', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const b = await new B().sync()
        const code = [{ text: A.toString(), owner }]
        const args = [{ $ref: '_i0' }]
        const actions = [{ target: '_o1', method: 'init', args, creator: run.owner.pubkey }]
        const txid = await build(code, actions, [b.location], null, 2, [], 2)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing write output', async () => {
        class B extends Jig { f () { this.n = 1 } }
        class A extends Jig { f (b) { b.f() } }
        const b = await new B().sync()
        const a = await new A().sync()
        const args = [{ $ref: '_i0' }]
        const actions = [{ target: '_i1', method: 'f', args }]
        const txid = await build([], actions, [b.location, a.location], null, 2, [], 1)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if method throws', async () => {
        class A extends Jig { f () { throw new Error() } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('unexpected exception in f')
      })

      it('should throw if missing input in batch', async () => {
        class A extends Jig { f (b) { this.n = b.n + 1 } }
        const code = [{ text: A.toString(), owner }]
        const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
        const args = [{ $ref: '_i0' }]
        const actions = [action1, { target: '_i1', method: 'f', args }]
        const txid = await build(code, actions, [], null, 2)
        await expect(run.load(txid + '_o3')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing output in batch', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const code = [{ text: B.toString(), owner }, { text: A.toString(), owner }]
        const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
        const args = [{ $ref: '_o3' }]
        const actions = [action1, { target: '_o2', method: 'init', args, creator: run.owner.pubkey }]
        const txid = await build(code, actions, [], null, 1, 2)
        await expect(run.load(txid + '_o4')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if initial jig owner does not match pk script', async () => {
        class A extends Jig { }
        const code = [{ text: A.toString(), owner }]
        const anotherOwner = new bsv.PrivateKey('testnet').publicKey.toString()
        const actions = [{ target: '_o1', method: 'init', args: [], creator: anotherOwner }]
        const txid = await build(code, actions, [], null, 1)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith('bad owner on output 2')
      })

      it('should throw if updated jig owner does not match pk script', async () => {
        class A extends Jig { send (to) { this.owner = to } }
        const a = await new A().sync()
        const privkey1 = new bsv.PrivateKey('testnet')
        const privkey2 = new bsv.PrivateKey('testnet')
        const actions = [{ target: '_i0', method: 'send', args: [`${privkey1.publicKey.toString()}`] }]
        const txid = await build([], actions, [a.location], privkey2.toAddress().toString(), 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('bad owner on output 1')
      })

      it('should throw if missing target', async () => {
        const actions = [{ target: '_o1`', method: 'init', args: '[]', creator: run.owner.pubkey }]
        const txid = await build([], actions, [], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('missing target _o1')
      })

      it('should throw if satoshis amount is incorrect', async () => {
        class A extends Jig { f (satoshis) { this.satoshis = satoshis } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [1000] }]
        const txid = await build([], actions, [a.location], null, 1, [], 1, [bsv.Transaction.DUST_AMOUNT])
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('bad satoshis on output 1')
      })

      it('should throw if bad class props', async () => {
        class A extends Jig { }
        const code = [{ text: A.toString(), props: { n: { $class: 'Set' } }, owner }]
        const txid = await build(code, [], [], null, 0)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('[object Object] cannot be deserialized')
        const code2 = [{ text: A.toString(), props: { n: { $ref: 123 } }, owner }]
        const txid2 = await build(code2, [], [], null, 0)
        await expect(run.load(txid2 + '_o1')).to.be.rejectedWith('[object Object] cannot be scanned')
      })

      it('should throw if non-existant ref', async () => {
        class A extends Jig { init (n) { this.n = n } }
        class B extends Jig { apply (a) { this.n = a.n } }
        const a = new A(1)
        const b = new B()
        await run.sync()
        const actions = [{ target: '_i0', method: 'apply', args: [{ $ref: '_r1' }] }]
        const txid = await build([], actions, [b.location], null, 1, [a.location])
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('Unexpected ref _r1')
      })

      it('should throw if same jig used with different locations', async () => {
        class A extends Jig { set (n) { this.n = n } }
        class B extends Jig { apply (a, a2) { this.n = a.n + a2.n } }
        const a = new A()
        const b = new B()
        a.set(1)
        await run.sync()
        const a2 = await run.load(a.location)
        a2.set(2)
        await run.sync()
        const args = [{ $ref: '_r0' }, { $ref: '_r1' }]
        const actions = [{ target: '_i0', method: 'apply', args }]
        const txid = await build([], actions, [b.location], null, 1, [a.location, a2.location])
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('referenced different locations of same jig: [jig A]')
      })

      it('should throw if same ref has different locations', async () => {
        class A extends Jig { set (n) { this.n = n } }
        class B extends Jig { apply (a, a2) { this.n = a.n + a2.n } }
        const a = new A()
        const b = new B()
        a.set(1)
        await run.sync()
        const a2 = await run.load(a.location)
        a2.set(2)
        await run.sync()
        const args = [{ $ref: `${a.location}` }, { $ref: `${a2.location}` }]
        const actions = [{ target: '_i0', method: 'apply', args }]
        const txid = await build([], actions, [b.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('referenced different locations of same jig: [jig A]')
      })

      it('should throw if bad refs array', async () => {
        class A extends Jig { set (n) { this.n = n } }
        class B extends Jig { apply (a, a2) { this.n = a.n + a2.n } }
        const a = new A()
        const b = new B()
        a.set(1)
        await run.sync()
        const a2 = await run.load(a.location)
        a2.set(2)
        await run.sync()
        const args = [{ $ref: '_r0' }, { $ref: '_r1' }]
        const actions = [{ target: '_i0', method: 'apply', args }]
        const txid = await build([], actions, [b.location], null, 1, args)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad class owner', async () => {
        class A extends Jig { }
        const differentOwner = new bsv.PrivateKey().publicKey.toString()
        const code = [{ text: A.toString(), owner: differentOwner }]
        const txid = await build(code, [], [], null, 0)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith(`bad def owner: ${txid}_o1`)
      })

      it('should not load old protocol', async () => {
        const loc = '04b294f5d30daf37f075869c864a40a03946fc2b764d75c47f276908445b3bf4_o2'
        const run = createRun({ network: 'test' })
        await expect(run.load(loc)).to.be.rejectedWith('Unsupported run protocol in tx')
      })
    })
  })
})

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(11).Buffer))

/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}


/***/ }),
/* 50 */
/***/ (function(module, exports) {

exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}


/***/ }),
/* 51 */
/***/ (function(module, exports) {

var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};


/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

const { describe, it, beforeEach } = __webpack_require__(2)
const { expect } = __webpack_require__(1)
const bsv = __webpack_require__(0)
const { createRun, Run } = __webpack_require__(3)
const { Location, UniqueSet, UniqueMap } = Run

// ------------------------------------------------------------------------------------------------
// A temporary token used for testing
// ------------------------------------------------------------------------------------------------

const randomLocation = () => `${bsv.crypto.Random.getRandomBuffer(32).toString('hex')}_o0`
const randomTempLocation = () => `??${bsv.crypto.Random.getRandomBuffer(31).toString('hex')}_o0`
const testToken = (origin, location) => {
  const token = () => {}
  token.owner = 'someone'
  token.origin = origin
  token.location = location
  token.deploy = () => { token.location = token.origin = randomTempLocation(); return token }
  token.update = () => { token.location = randomTempLocation(); return token }
  token.publish = () => {
    if (!token.origin || !Location.parse(token.origin).txid) token.origin = randomLocation()
    if (!token.location || !Location.parse(token.location).txid) token.location = randomLocation()
    return token
  }
  token.duplicate = () => { return testToken(token.origin, token.location) }
  return token
}

// ------------------------------------------------------------------------------------------------
// UniqueMap
// ------------------------------------------------------------------------------------------------

describe('UniqueMap', () => {
  const run = createRun()
  beforeEach(() => run.activate())

  describe('constructor', () => {
    it('should create empty map', () => {
      expect(new UniqueMap().size).to.equal(0)
    })

    it('should create map from array', () => {
      const arr = [[1, 2], ['a', 'b']]
      const map = new UniqueMap(arr)
      expect(map.size).to.equal(arr.length)
      arr.forEach(x => expect(map.has(x[0])).to.equal(true))
    })

    it('should create map from map', () => {
      const arr = [[1, 2], ['a', 'b']]
      const map = new UniqueMap(arr)
      const map2 = new UniqueMap(map)
      expect(map2.size).to.equal(arr.length)
      arr.forEach(([x]) => expect(map2.has(x)).to.equal(true))
      arr.forEach(([x, y]) => expect(map2.get(x)).to.equal(y))
    })
  })

  describe('clear', () => {
    it('should not throw on empty map', () => {
      expect(() => new UniqueMap().clear()).not.to.throw()
    })

    it('should empty contents', () => {
      const map = new UniqueMap()
      map.set(1, 2)
      map.clear()
      expect(map.size).to.equal(0)
    })

    it('should clear token states', () => {
      const { Run } = __webpack_require__(3)
      const a = testToken()
      const b = testToken().deploy().publish()
      const map = new UniqueMap([[a, 1], [b, 2]])
      map.clear()
      expect(map.size).to.equal(0)
      a.publish()
      const a2 = a.duplicate().update()
      const b2 = b.duplicate().update()
      map.set(a2, 1)
      map.set(b2, 2)
    })
  })

  describe('delete', () => {
    it('should return false if item is not present', () => {
      expect(new UniqueMap().delete(1)).to.equal(false)
      expect(new UniqueMap().delete(testToken())).to.equal(false)
      expect(new UniqueMap().delete(testToken().deploy())).to.equal(false)
      expect(new UniqueMap().delete(testToken().deploy().publish())).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new UniqueMap([[1, 1]]).delete(1)).to.equal(true)
    })

    it('should clear token states', () => {
      const a = testToken()
      const b = testToken().deploy()
      const map = new UniqueMap([[a, 1], [b, 1]])
      map.delete(a)
      map.delete(b)
      expect(map.size).to.equal(0)
      const a2 = a.deploy().publish().duplicate().update()
      const b2 = b.publish().duplicate().update()
      map.set(a2, 1)
      map.set(b2, 1)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken().deploy().publish()
      const map = new UniqueMap([[a, a]])
      const a2 = a.duplicate().update()
      expect(() => map.delete(a2)).to.throw('Inconsistent worldview')
    })
  })

  describe('entries', () => {
    it('should iterate across entries', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      for (const entry of map.entries()) {
        const next = entries.shift()
        expect(entry).to.deep.equal(next)
      }
    })
  })

  describe('forEach', () => {
    it('should execute function for each entry', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      class A {
        constructor () { this.arr = [] }
        push (x, y) { this.arr.push([x, y]) }
      }
      const a = new A()
      map.forEach(a.push, a)
      expect(a.arr).to.deep.equal([[2, 1], ['b', 'a'], [true, false], [[], {}]])
    })
  })

  describe('get', () => {
    it('should return values for basic types and objects in set', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      entries.forEach(entry => expect(map.get(entry[0])).to.equal(entry[1]))
    })

    it('should return undefined for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const map = new UniqueMap()
      entries.forEach(entry => expect(map.get(entry)).to.equal(undefined))
    })

    it('should return undefined after object is deleted', () => {
      const obj = {}
      const map = new UniqueMap([[obj, 1]])
      expect(map.get(obj)).to.equal(1)
      map.delete(obj)
      expect(map.get(obj)).to.equal(undefined)
    })

    it('should return value for tokens in map', () => {
      const a = testToken()
      const b = testToken().deploy()
      const c = testToken().deploy().publish()
      const map = new UniqueMap([[a, 'abc'], [b, 'def'], [c, 'ghi']])
      expect(map.get(a)).to.equal('abc')
      expect(map.get(b)).to.equal('def')
      expect(map.get(c)).to.equal('ghi')
      const a2 = a.deploy().publish().duplicate()
      const b2 = b.publish().duplicate()
      const c2 = c.duplicate()
      expect(map.get(a2)).to.equal('abc')
      expect(map.get(b2)).to.equal('def')
      expect(map.get(c2)).to.equal('ghi')
    })

    it('should return undefined for missing tokens', () => {
      expect(new UniqueMap().get(testToken().deploy())).to.equal(undefined)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken()
      const b = testToken().deploy()
      const c = testToken().deploy().publish()
      const map = new UniqueMap([[a, 1], [b, 2], [c, 3]])
      expect(map.get(a)).to.equal(1)
      expect(map.get(b)).to.equal(2)
      expect(map.get(c)).to.equal(3)
      const a2 = a.deploy().publish().duplicate().update()
      const b2 = b.publish().duplicate().update()
      const c2 = c.duplicate().update().publish()
      expect(() => map.get(a2)).to.throw('Inconsistent worldview')
      expect(() => map.get(b2)).to.throw('Inconsistent worldview')
      expect(() => map.get(c2)).to.throw('Inconsistent worldview')
    })
  })

  describe('has', () => {
    it('should return true for basic types and objects in set', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      entries.forEach(entry => expect(map.has(entry[0])).to.equal(true))
    })

    it('should return false for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const map = new UniqueMap()
      entries.forEach(entry => expect(map.has(entry)).to.equal(false))
    })

    it('should return false after object is deleted', () => {
      const obj = {}
      const map = new UniqueMap([[obj, 1]])
      expect(map.has(obj)).to.equal(true)
      map.delete(obj)
      expect(map.has(obj)).to.equal(false)
    })

    it('should return true for tokens in map', () => {
      const a = testToken()
      const b = testToken().deploy().publish().update()
      const map = new UniqueMap([[a, {}], [b, {}]])
      expect(map.has(a)).to.equal(true)
      expect(map.has(b)).to.equal(true)
      expect(map.has(b.duplicate())).to.equal(true)
    })

    it('should return false for missing tokens', () => {
      expect(new UniqueMap().has(testToken())).to.equal(false)
      expect(new UniqueMap().has(testToken().deploy())).to.equal(false)
      expect(new UniqueMap().has(testToken().deploy().publish())).to.equal(false)
      expect(new UniqueMap().has(testToken().deploy().publish().update())).to.equal(false)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken().deploy().publish().update().publish()
      const map = new UniqueMap([[a, []]])
      expect(map.has(a)).to.equal(true)
      expect(() => map.has(a.duplicate().update())).to.throw('Inconsistent worldview')
    })
  })

  describe('set', () => {
    it('should return map regardless', () => {
      const map = new UniqueMap()
      expect(map.set(1, 1)).to.equal(map)
      expect(map.set(1, 1)).to.equal(map)
    })

    it('should set basic types and objects as keys once', () => {
      const map = new UniqueMap()
      const entries = [[1, 2], ['abc', 'def'], [true, false], [{}, []]]
      entries.forEach(([x, y]) => map.set(x, y))
      entries.forEach(([x, y]) => map.set(x, y))
      expect(map.size).to.equal(entries.length)
    })

    it('should set tokens once', () => {
      const a = testToken().deploy().publish()
      const map = new UniqueMap()
      map.set(a, 0)
      const a2 = a.duplicate()
      map.set(a2, 1)
      expect(map.size).to.equal(1)
      expect(map.get(a2)).to.equal(1)
    })

    it('should throw if add two of the same tokens at different states', () => {
      const a = testToken().deploy().publish()
      const a2 = a.duplicate().update()
      const map = new UniqueMap()
      map.set(a2, a2)
      expect(() => map.set(a, {})).to.throw('Inconsistent worldview')
    })
  })

  describe('values', () => {
    it('should return values iterator', () => {
      const entries = [[1, 2], [3, 4]]
      const map = new UniqueMap(entries)
      const arr = []
      for (const val of map.values()) { arr.push(val) }
      expect(arr).to.deep.equal([2, 4])
    })
  })

  describe('misc', () => {
    it('should return UniqueMap for Symbol.species', () => {
      expect(new UniqueMap()[Symbol.species]).to.equal(UniqueMap)
    })

    it('should return iterator for Symbol.iterator', () => {
      expect(new UniqueMap()[Symbol.species]).to.equal(UniqueMap)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// UniqueSet
// ------------------------------------------------------------------------------------------------

describe('UniqueSet', () => {
  describe('constructor', () => {
    it('should create empty set', () => {
      expect(new UniqueSet().size).to.equal(0)
    })

    it('should create set from array', () => {
      const arr = [1, 2, 3]
      const set = new UniqueSet(arr)
      expect(set.size).to.equal(arr.length)
      arr.forEach(x => expect(set.has(x)).to.equal(true))
    })

    it('should create set from set', () => {
      const arr = [1, 2, 3]
      const set = new UniqueSet(arr)
      const set2 = new UniqueSet(set)
      expect(set2.size).to.equal(arr.length)
      arr.forEach(x => expect(set2.has(x)).to.equal(true))
    })
  })

  describe('add', () => {
    it('should return set regardless', () => {
      const set = new UniqueSet()
      expect(set.add(1)).to.equal(set)
      expect(set.add(1)).to.equal(set)
    })

    it('should add basic types and objects once', () => {
      const set = new UniqueSet()
      const entries = [1, 'abc', true, {}, []]
      entries.forEach(entry => set.add(entry))
      entries.forEach(entry => set.add(entry))
      expect(set.size).to.equal(entries.length)
    })

    it('should add tokens once', async () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const set = new UniqueSet()
      set.add(a)
      set.add(b)
      set.add(b.duplicate())
      expect(set.size).to.equal(2)
    })

    it('should throw if add two of the same tokens at different states', () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const set = new UniqueSet()
      set.add(a)
      set.add(b)
      const a2 = a.deploy().publish().duplicate().update()
      const b2 = a.duplicate().update().publish()
      expect(() => set.add(a2)).to.throw('Inconsistent worldview')
      expect(() => set.add(b2)).to.throw('Inconsistent worldview')
    })
  })

  describe('clear', () => {
    it('should not throw on empty set', () => {
      expect(() => new UniqueSet().clear()).not.to.throw()
    })

    it('should empty contents', () => {
      const set = new UniqueSet()
      set.add(1)
      set.clear()
      expect(set.size).to.equal(0)
    })

    it('should clear token states', () => {
      const set = new UniqueSet()
      const a = testToken().deploy()
      const b = testToken().deploy().publish()
      set.add(a)
      set.add(b)
      set.clear()
      expect(set.size).to.equal(0)
      set.add(a.publish().duplicate())
      set.add(b.duplicate().update())
      expect(set.size).to.equal(2)
    })
  })

  describe('delete', () => {
    it('should return false if item is not present', () => {
      expect(new UniqueSet().delete(1)).to.equal(false)
      expect(new UniqueSet().delete(testToken())).to.equal(false)
      expect(new UniqueSet().delete(testToken().deploy().publish())).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new UniqueSet([1]).delete(1)).to.equal(true)
    })

    it('should clear token states', () => {
      const set = new UniqueSet()
      const token = testToken().deploy().publish()
      set.add(token)
      set.delete(token)
      expect(set.size).to.equal(0)
      set.add(token.update().publish())
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const set = new UniqueSet([a, b])
      expect(() => set.delete(a.deploy().publish().duplicate().update())).to.throw('Inconsistent worldview')
      expect(() => set.delete(b.duplicate().update().publish())).to.throw('Inconsistent worldview')
    })
  })

  describe('entries', () => {
    it('should iterate across entries', () => {
      const arr = [1, 2, 3]
      const set = new UniqueSet(arr)
      for (const entry of set.entries()) {
        const next = arr.shift()
        expect(entry).to.deep.equal([next, next])
      }
    })
  })

  describe('forEach', () => {
    it('should execute function for each entry', () => {
      const set = new UniqueSet([1, 2, 3])
      class A {
        constructor () { this.arr = [] }
        push (x) { this.arr.push(x) }
      }
      const a = new A()
      set.forEach(a.push, a)
      expect(a.arr).to.deep.equal([1, 2, 3])
    })
  })

  describe('has', () => {
    it('should return true for basic types and objects in set', () => {
      const entries = [1, 'a', false, {}, []]
      const set = new UniqueSet(entries)
      entries.forEach(entry => expect(set.has(entry)).to.equal(true))
    })

    it('should return false for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const set = new UniqueSet()
      entries.forEach(entry => expect(set.has(entry)).to.equal(false))
    })

    it('should return false after object is deleted', () => {
      const obj = {}
      const set = new UniqueSet([obj])
      expect(set.has(obj)).to.equal(true)
      set.delete(obj)
      expect(set.has(obj)).to.equal(false)
    })

    it('should return true for tokens in set', () => {
      const a = testToken().deploy().publish()
      const set = new UniqueSet([a])
      expect(set.has(a)).to.equal(true)
      expect(set.has(a.duplicate())).to.equal(true)
    })

    it('should return false for missing tokens', () => {
      expect(new UniqueSet().has(testToken())).to.equal(false)
      expect(new UniqueSet().has(testToken().deploy())).to.equal(false)
      expect(new UniqueSet().has(testToken().deploy().publish())).to.equal(false)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken().deploy()
      const b = testToken().deploy().publish().update()
      const set = new UniqueSet([a, b])
      expect(set.has(a)).to.equal(true)
      expect(set.has(b)).to.equal(true)
      expect(() => set.has(a.publish().duplicate().update())).to.throw('Inconsistent worldview')
      expect(() => set.has(b.duplicate().publish())).to.throw('Inconsistent worldview')
    })
  })

  describe('values', () => {
    it('should return values iterator', () => {
      const arr = []
      const set = new UniqueSet([1, 2, 3])
      for (const val of set.values()) { arr.push(val) }
      expect(arr).to.deep.equal([1, 2, 3])
    })
  })

  describe('misc', () => {
    it('should return UniqueSet for Symbol.species', () => {
      expect(new UniqueSet()[Symbol.species]).to.equal(UniqueSet)
    })

    it('should return iterator for Symbol.iterator', () => {
      expect(new UniqueSet()[Symbol.species]).to.equal(UniqueSet)
    })
  })
})

// ------------------------------------------------------------------------------------------------


/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(Buffer) {/**
 * util.js
 *
 * Tests for ../lib/util.js
 */

const bsv = __webpack_require__(0)
const { describe, it } = __webpack_require__(2)
const { expect } = __webpack_require__(1)
const { Run, Jig, createRun } = __webpack_require__(3)
const {
  checkOwner,
  checkSatoshis,
  getNormalizedSourceCode,
  deployable,
  checkRunTransaction,
  extractRunData,
  outputType,
  encryptRunData,
  decryptRunData,
  richObjectToJson,
  jsonToRichObject,
  extractJigsAndCodeToArray,
  injectJigsAndCodeFromArray,
  SerialTaskQueue
} = Run._util

const run = createRun()

describe('util', () => {
  describe('checkSatoshis', () => {
    it('should support allowed values', () => {
      expect(() => checkSatoshis(0)).not.to.throw()
      expect(() => checkSatoshis(1)).not.to.throw()
      expect(() => checkSatoshis(bsv.Transaction.DUST_AMOUNT)).not.to.throw()
      expect(() => checkSatoshis(100000000)).not.to.throw()
    })

    it('should throw if bad satoshis', () => {
      expect(() => checkSatoshis()).to.throw('satoshis must be a number')
      expect(() => checkSatoshis(-1)).to.throw('satoshis must be non-negative')
      expect(() => checkSatoshis('0')).to.throw('satoshis must be a number')
      expect(() => checkSatoshis([0])).to.throw('satoshis must be a number')
      expect(() => checkSatoshis(1.5)).to.throw('satoshis must be an integer')
      expect(() => checkSatoshis(NaN)).to.throw('satoshis must be an integer')
      expect(() => checkSatoshis(Infinity)).to.throw('satoshis must be an integer')
      expect(() => checkSatoshis(100000001)).to.throw('satoshis must be less than 100000000')
    })
  })

  describe('checkOwner', () => {
    it('should support valid owners on different networks', () => {
      expect(() => checkOwner(new bsv.PrivateKey('mainnet').publicKey.toString())).not.to.throw()
      expect(() => checkOwner(new bsv.PrivateKey('testnet').publicKey.toString())).not.to.throw()
    })

    it('should throw if bad owner', () => {
      expect(() => checkOwner()).to.throw('owner must be a pubkey string')
      expect(() => checkOwner(123)).to.throw('owner must be a pubkey string')
      expect(() => checkOwner('hello')).to.throw('owner is not a valid public key')
      expect(() => checkOwner(new bsv.PrivateKey())).to.throw('owner must be a pubkey string')
      expect(() => checkOwner(new bsv.PrivateKey().publicKey)).to.throw('owner must be a pubkey string')
      expect(() => checkOwner([new bsv.PrivateKey().publicKey.toString()])).to.throw('owner must be a pubkey string')
    })
  })

  function buildRunTransaction (prefixString, protocolVersionArray, runData, scriptBuilder,
    containDebugInfo, numAdditionalOutputs) {
    const prefix = Buffer.from(prefixString, 'utf8')
    const protocolVersion = Buffer.from(protocolVersionArray, 'hex')
    const appId = Buffer.from('my-app', 'utf8')
    const payload = Buffer.from(encryptRunData(runData), 'utf8')
    const debugInfo = Buffer.from('r11r', 'utf8')
    const parts = containDebugInfo
      ? [prefix, protocolVersion, appId, payload, debugInfo]
      : [prefix, protocolVersion, appId, payload]
    const script = bsv.Script[scriptBuilder](parts)
    const tx = new bsv.Transaction().addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))
    for (let i = 0; i < numAdditionalOutputs; i++) { tx.to(new bsv.PrivateKey().toAddress(), 100) }
    return tx
  }

  describe('checkRunTransaction', () => {
    it('should detects valid run transaction', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).not.to.throw()
    })

    it('should throw if a money transaction', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('should throw if bad prefix', () => {
      const tx = buildRunTransaction('run0', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('should throw if bad protocol version', () => {
      const tx1 = buildRunTransaction('run', [0x00, Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx1)).to.throw(`Unsupported run protocol in tx: ${tx1.hash}`)
      const tx2 = buildRunTransaction('run', [0x02], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx2)).to.throw(`Unsupported run protocol in tx: ${tx2.hash}`)
    })

    it('should throw if not op_false op_return', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('should throw if no debug info', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', false, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })
  })

  describe('extractRunData', () => {
    it('should decrypt data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(extractRunData(tx)).to.deep.equal({ code: [1], jigs: 2 })
    })

    it('should throw if not a run tx', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(() => extractRunData(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })
  })

  describe('outputType', () => {
    it('should return rundata', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(outputType(tx, 0)).to.equal('rundata')
    })

    it('should return code', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 1)).to.equal('code')
    })

    it('should return jig', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 2)).to.equal('jig')
      expect(outputType(tx, 3)).to.equal('jig')
    })

    it('should return other for change', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 4)).to.equal('other')
    })

    it('should return other for money', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(outputType(tx, 0)).to.equal('other')
    })

    it('should return other for bad run data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], 'hello, world', 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 4)).to.equal('other')
    })
  })

  describe('getNormalizedSourceCode', () => {
    // Node 8 and Node 12 have slightly different spacing for getNormalizedSourceCode('function () { return 1 }')
    // We don't need the normalized code to always be exactly the same, as long as it functions the same.
    function expectNormalizedSourceCode (type, text) {
      const removeWhitespace = str => str.replace(/\s+/g, '')
      expect(removeWhitespace(getNormalizedSourceCode(type))).to.equal(removeWhitespace(text))
    }

    it('should get code for basic class', () => {
      class A {}
      expectNormalizedSourceCode(A, 'class A {}')
    })

    it('should get code for basic function', () => {
      function f () { return 1 }
      expectNormalizedSourceCode(f, 'function f () { return 1 }')
    })

    it('should get code for class that extends another class', () => {
      const SomeLibrary = { B: class B { } }
      class A extends SomeLibrary.B {}
      expectNormalizedSourceCode(A, 'class A extends B {}')
    })

    it('should get code for single-line class', () => {
      class B { }
      class A extends B { f () {} }
      expectNormalizedSourceCode(A, 'class A extends B { f () {} }')
    })
  })

  describe('deployable', () => {
    it('should return true for allowed', () => {
      class B { }
      expect(deployable(class A { })).to.equal(true)
      expect(deployable(class A extends B { })).to.equal(true)
      expect(deployable(function f () {})).to.equal(true)
    })

    it('should return false for non-functions', () => {
      expect(deployable()).to.equal(false)
      expect(deployable(1)).to.equal(false)
      expect(deployable({})).to.equal(false)
      expect(deployable(true)).to.equal(false)
    })

    it('should return false for standard library objects', () => {
      expect(deployable(Array)).to.equal(false)
      expect(deployable(Uint8Array)).to.equal(false)
      expect(deployable(Math.sin)).to.equal(false)
    })

    it('should return false for anonymous types', () => {
      expect(deployable(() => {})).to.equal(false)
      expect(deployable(function () { })).to.equal(false)
      expect(deployable(class {})).to.equal(false)
    })
  })

  describe('encryptRunData', () => {
    it('should encrypt run data', () => {
      const encrypted = encryptRunData({ a: 1 })
      expect(encrypted).not.to.equal(JSON.stringify({ a: 1 }))
    })
  })

  describe('decryptRunData', () => {
    it('should decrypt run data', () => {
      const encrypted = encryptRunData({ a: 1 })
      expect(decryptRunData(encrypted)).to.deep.equal({ a: 1 })
    })

    it('should throw for bad data', () => {
      expect(() => decryptRunData(JSON.stringify({ a: 1 }))).to.throw('unable to parse decrypted run data')
    })
  })

  describe('richObjectToJson', () => {
    it('should convert number', () => {
      expect(richObjectToJson(1)).to.equal(1)
      expect(richObjectToJson(-1)).to.equal(-1)
      expect(richObjectToJson(0)).to.equal(0)
      expect(richObjectToJson(1.5)).to.equal(1.5)
      expect(richObjectToJson(Number.MAX_SAFE_INTEGER)).to.equal(Number.MAX_SAFE_INTEGER)
      expect(richObjectToJson(Number.MAX_VALUE)).to.equal(Number.MAX_VALUE)
      expect(richObjectToJson(Number.MIN_SAFE_INTEGER)).to.equal(Number.MIN_SAFE_INTEGER)
      expect(richObjectToJson(Number.MIN_VALUE)).to.equal(Number.MIN_VALUE)
      expect(() => richObjectToJson(NaN)).to.throw('NaN cannot be serialized to json')
      expect(() => richObjectToJson(Infinity)).to.throw('Infinity cannot be serialized to json')
    })

    it('should convert boolean', () => {
      expect(richObjectToJson(true)).to.equal(true)
      expect(richObjectToJson(false)).to.equal(false)
    })

    it('should convert string', () => {
      expect(richObjectToJson('')).to.equal('')
      expect(richObjectToJson('123abc')).to.equal('123abc')
      expect(richObjectToJson('🐉')).to.equal('🐉')
    })

    it('should throw for function', () => {
      expect(() => richObjectToJson(() => {})).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(function () {})).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(Math.sin)).to.throw('cannot be serialized to json')
    })

    it('should throw for symbol', () => {
      expect(() => richObjectToJson(Symbol.hasInstance)).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
    })

    it('should convert object', () => {
      expect(richObjectToJson(null)).to.equal(null)
      expect(richObjectToJson({})).to.deep.equal({})
      expect(richObjectToJson({ a: 'a', n: 1, b: false })).to.deep.equal({ a: 'a', n: 1, b: false })
      expect(richObjectToJson({ o: { n: 1 } })).to.deep.equal({ o: { n: 1 } })
      expect(() => richObjectToJson({ s: Symbol.hasInstance })).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expect(() => richObjectToJson({ f: () => {} })).to.throw('() => {} cannot be serialized to json')
    })

    it('should convert array', () => {
      expect(richObjectToJson([])).to.deep.equal([])
      expect(richObjectToJson([1, 2, 3])).to.deep.equal([1, 2, 3])
      expect(richObjectToJson([{ a: '1' }, ['b']])).to.deep.equal([{ a: '1' }, ['b']])
      expect(() => richObjectToJson([Symbol.hasInstance])).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expect(() => richObjectToJson([() => {}])).to.throw('() => {} cannot be serialized to json')
    })

    it('should convert uint8array', () => {
      expect(richObjectToJson(new Uint8Array(0))).to.deep.equal({ $class: 'Uint8Array', base64Data: '' })
      expect(richObjectToJson(new Uint8Array(1))).to.deep.equal({ $class: 'Uint8Array', base64Data: 'AA==' })
      expect(richObjectToJson(new Uint8Array([1, 2, 3]))).to.deep.equal({ $class: 'Uint8Array', base64Data: 'AQID' })
      expect(richObjectToJson(new Uint8Array([255, 255, 255]))).to.deep.equal({ $class: 'Uint8Array', base64Data: '////' })
    })

    it('should allow duplicates', () => {
      const o = {}
      expect(() => richObjectToJson({ a: o, b: o })).not.to.throw()
    })

    it('should throw for circular references', () => {
      const a = {}
      const b = { a }
      a.b = b
      expect(() => richObjectToJson(a)).to.throw('circular reference detected: a')
    })

    it('should throw for unserializable types', () => {
      expect(() => richObjectToJson(new class {}())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(new class extends Array {}())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(new Set())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(new Map())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(Buffer.alloc(0))).to.throw('cannot be serialized to json')
    })

    it('should convert undefined', () => {
      expect(richObjectToJson(undefined)).to.deep.equal({ $class: 'undefined' })
    })

    it('should throw for $ properties', () => {
      expect(() => richObjectToJson({ $class: 'unknown' })).to.throw('$ properties must not be defined')
      expect(() => richObjectToJson({ $ref: 'unknown' })).to.throw('$ properties must not be defined')
      expect(() => richObjectToJson({ $n: 1 })).to.throw('$ properties must not be defined')
    })

    it('should support custom packers', () => {
      const setPacker = x => { if (x && x.constructor === Set) return { $class: 'set' } }
      const mapPacker = x => { if (x && x.constructor === Map) return { $class: 'map' } }
      expect(richObjectToJson({ a: [1], s: new Set(), m: new Map() }, [setPacker, mapPacker]))
        .to.deep.equal({ a: [1], s: { $class: 'set' }, m: { $class: 'map' } })
    })
  })

  describe('jsonToRichObject', () => {
    it('should convert number', () => {
      expect(jsonToRichObject(1)).to.equal(1)
      expect(jsonToRichObject(-1)).to.equal(-1)
      expect(jsonToRichObject(0)).to.equal(0)
      expect(jsonToRichObject(1.5)).to.equal(1.5)
      expect(jsonToRichObject(Number.MAX_SAFE_INTEGER)).to.equal(Number.MAX_SAFE_INTEGER)
      expect(jsonToRichObject(Number.MAX_VALUE)).to.equal(Number.MAX_VALUE)
      expect(jsonToRichObject(Number.MIN_SAFE_INTEGER)).to.equal(Number.MIN_SAFE_INTEGER)
      expect(jsonToRichObject(Number.MIN_VALUE)).to.equal(Number.MIN_VALUE)
      expect(() => jsonToRichObject(NaN)).to.throw('JSON should not contain NaN')
      expect(() => jsonToRichObject(Infinity)).to.throw('JSON should not contain Infinity')
    })

    it('should convert boolean', () => {
      expect(jsonToRichObject(true)).to.equal(true)
      expect(jsonToRichObject(false)).to.equal(false)
    })

    it('should convert string', () => {
      expect(jsonToRichObject('')).to.equal('')
      expect(jsonToRichObject('123abc')).to.equal('123abc')
      expect(jsonToRichObject('🐉')).to.equal('🐉')
    })

    it('should throw for function', () => {
      expect(() => jsonToRichObject(() => {})).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(function () {})).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(Math.sin)).to.throw('JSON should not contain function')
    })

    it('should throw for symbol', () => {
      expect(() => jsonToRichObject(Symbol.hasInstance)).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
    })

    it('should convert object', () => {
      expect(jsonToRichObject(null)).to.equal(null)
      expect(jsonToRichObject({})).to.deep.equal({})
      expect(jsonToRichObject({ a: 'a', n: 1, b: false })).to.deep.equal({ a: 'a', n: 1, b: false })
      expect(jsonToRichObject({ o: { n: 1 } })).to.deep.equal({ o: { n: 1 } })
      expect(() => jsonToRichObject({ s: Symbol.hasInstance })).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
      expect(() => jsonToRichObject({ f: () => {} })).to.throw('JSON should not contain () => {}')
    })

    it('should convert array', () => {
      expect(jsonToRichObject([])).to.deep.equal([])
      expect(jsonToRichObject([1, 2, 3])).to.deep.equal([1, 2, 3])
      expect(jsonToRichObject([{ a: '1' }, ['b']])).to.deep.equal([{ a: '1' }, ['b']])
      expect(() => jsonToRichObject([Symbol.hasInstance])).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
      expect(() => jsonToRichObject([() => {}])).to.throw('JSON should not contain () => {}')
    })

    it('should convert uint8array', () => {
      const Uint8Array = run.code.intrinsics.default.Uint8Array
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: '' })).to.deep.equal(new Uint8Array(0))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: 'AA==' })).to.deep.equal(new Uint8Array(1))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: 'AQID' })).to.deep.equal(new Uint8Array([1, 2, 3]))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: '////' })).to.deep.equal(new Uint8Array([255, 255, 255]))
    })

    it('should throw for unserializable types', () => {
      expect(() => jsonToRichObject(new class {}())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(new class extends Array {}())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(new Set())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(new Map())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(Buffer.alloc(0))).to.throw('JSON should not contain')
    })

    it('should convert undefined', () => {
      expect(jsonToRichObject({ undef: { $class: 'undefined' } })).to.deep.equal({ undef: undefined })
      expect(jsonToRichObject({ $class: 'undefined' })).to.equal(undefined)
    })

    it('should throw for $class', () => {
      expect(() => jsonToRichObject({ $class: 'unknown' })).to.throw('$ properties must not be defined')
    })

    it('should support custom unpackers', () => {
      const setUnpacker = x => { if (x.$class === 'set') return new Set() }
      const mapUnpacker = x => { if (x.$class === 'map') return new Map() }
      expect(jsonToRichObject({ a: [1], s: { $class: 'set' }, m: { $class: 'map' } }, [setUnpacker, mapUnpacker])).to.deep.equal({ a: [1], s: new Set(), m: new Map() })
      const rootUnpacker = (x, p, k) => { if (p === null) return 1 }
      expect(jsonToRichObject({}, [rootUnpacker])).to.equal(1)
      const namedUnpacker = (x, p, k) => { if (k === 'a') return 1 }
      expect(jsonToRichObject({ a: [], b: 2 }, [namedUnpacker])).to.deep.equal({ a: 1, b: 2 })
    })
  })

  describe('extractJigsAndCodeToArray', () => {
    it('should support basic extraction', () => {
      class A extends Jig { }
      const arr = []
      const obj = { a: new A(), b: [new A(), A] }
      const json = richObjectToJson(obj, [extractJigsAndCodeToArray(arr)])
      expect(json).to.deep.equal({ a: { $index: 0 }, b: [{ $index: 1 }, { $index: 2 }] })
      expect(arr.length).to.equal(3)
      expect(arr[0]).to.equal(obj.a)
      expect(arr[1]).to.equal(obj.b[0])
      expect(arr[2]).to.equal(obj.b[1])
    })
  })

  describe('injectJigsAndCodeFromArray', () => {
    it('should support basic injection', () => {
      class A extends Jig { }
      const arr = [new A(), new A(), A]
      const json = { a: { $index: 0 }, b: [{ $index: 1 }, { $index: 2 }] }
      const obj = jsonToRichObject(json, [injectJigsAndCodeFromArray(arr)])
      expect(obj.a).to.equal(arr[0])
      expect(obj.b[0]).to.equal(arr[1])
      expect(obj.b[1]).to.equal(arr[2])
    })
  })

  describe('SerialTaskQueue', () => {
    const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }

    it('should serialize tasks in order', async () => {
      const queue = new SerialTaskQueue()
      const order = []; const promises = []
      promises.push(queue.enqueue(async () => { await sleep(5); order.push(1) }))
      promises.push(queue.enqueue(async () => { await sleep(3); order.push(2) }))
      promises.push(queue.enqueue(async () => { await sleep(1); order.push(3) }))
      await Promise.all(promises)
      expect(order).to.deep.equal([1, 2, 3])
    })

    it('should support stops and starts', async () => {
      const queue = new SerialTaskQueue()
      let done1 = false; let done2 = false
      await queue.enqueue(() => { done1 = true })
      expect(done1).to.equal(true)
      await queue.enqueue(() => { done2 = true })
      expect(done2).to.equal(true)
    })
  })
})

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(11).Buffer))

/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(Buffer) {const bsv = __webpack_require__(0)
const { describe, it } = __webpack_require__(2)
const { expect } = __webpack_require__(1)
const { Intrinsics } = __webpack_require__(10)
const Xray = __webpack_require__(12)
const { display } = __webpack_require__(4)
const Evaluator = __webpack_require__(17)

// ------------------------------------------------------------------------------------------------
// Test vector class
// ------------------------------------------------------------------------------------------------

class TestVector {
  constructor (x) {
    this.x = x
    this.scannable = true
    this.cloneable = true
    this.serializable = true
    this.deserializable = true
    this.serializedX = x
    this.cloneChecks = []
    this.serializedChecks = []
    this.deserializedChecks = []
    this.intrinsics = Intrinsics.defaultIntrinsics
  }

  unscannable () { this.scannable = false; return this }
  uncloneable () { this.cloneable = false; return this }
  unserializable () { this.serializable = false; return this }
  undeserializable () { this.deserializable = false; return this }
  serialized (value) { this.serializedX = value; return this }

  checkClone (f) { this.cloneChecks.push(f); return this }
  checkSerialized (f) { this.serializedChecks.push(f); return this }
  checkDeserialized (f) { this.deserializedChecks.push(f); return this }

  useIntrinsics (intrinsics) { this.intrinsics = intrinsics; return this }

  testScan () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)
      if (this.scannable) {
        expect(() => xray.scan(this.x)).not.to.throw()
      } else {
        expect(() => xray.scan(this.x)).to.throw(`${display(this.x)} cannot be scanned`)
      }
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testCloneable () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)
      expect(xray.cloneable(this.x)).to.equal(this.cloneable)
      expect(xray.caches.cloneable.get(this.x)).to.equal(this.cloneable)
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testSerializable () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)
      expect(xray.serializable(this.x)).to.equal(this.serializable)
      expect(xray.caches.serializable.get(this.x)).to.equal(this.serializable)
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testDeserializable () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)
      expect(xray.deserializable(this.serializedX)).to.equal(this.deserializable)
      expect(xray.caches.deserializable.get(this.serializedX)).to.equal(this.deserializable)
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testClone () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)

      if (!this.cloneable) {
        expect(() => xray.clone(this.x)).to.throw(`${display(this.x)} cannot be cloned`)
        return
      }

      const cloned = xray.clone(this.x)

      if (typeof this.x === 'object' && this.x) {
        expect(cloned).not.to.equal(this.x)
      }
      expect(cloned).to.deep.equal(this.x)
      expect(xray.caches.clone.get(this.x)).to.deep.equal(this.x)

      this.cloneChecks.forEach(f => f(cloned))
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testSerialize () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)

      if (!this.serializable) {
        expect(() => xray.serialize(this.x)).to.throw(`${display(this.x)} cannot be serialized`)
        return
      }

      const serialized = xray.serialize(this.x)

      if (typeof this.x === 'object' && this.x) {
        expect(serialized).not.to.equal(this.serializedX)
      }
      expect(serialized).to.deep.equal(this.serializedX)
      expect(xray.caches.serialize.get(this.x)).to.deep.equal(this.serializedX)

      this.serializedChecks.forEach(f => f(serialized))
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testDeserialize () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)

      if (!this.deserializable) {
        expect(() => xray.deserialize(this.serializedX)).to.throw(`${display(this.serializedX)} cannot be deserialized`)
        return
      }

      const deserialized = xray.deserialize(this.serializedX)

      if (typeof this.x === 'object' && this.x) {
        expect(deserialized).not.to.equal(this.x)
      }
      expect(deserialized).to.deep.equal(this.x)
      expect(xray.caches.deserialize.get(this.serializedX)).to.deep.equal(this.x)

      this.deserializedChecks.forEach(f => f(deserialized))
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }
}

// ------------------------------------------------------------------------------------------------
// Test vectors
// ------------------------------------------------------------------------------------------------

const vectors = []

function addTestVectors (intrinsics, testIntrinsics) {
  const {
    Object, Array, Set, Map, Uint8Array, Proxy, Int8Array,
    Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array,
    Float32Array, Float64Array, console, Function, Error, Math, WebAssembly,
    String, Date, JSON, Promise, WeakSet, WeakMap, RegExp
  } = testIntrinsics

  function addTestVector (x) {
    const vector = new TestVector(x).useIntrinsics(intrinsics)
    vectors.push(vector)
    return vector
  }

  // Booleans
  addTestVector(true)
  addTestVector(false)

  // Numbers
  addTestVector(0)
  addTestVector(-0)
  addTestVector(-1)
  addTestVector(Number.MAX_SAFE_INTEGER)
  addTestVector(Number.MIN_SAFE_INTEGER)
  addTestVector(Number.MAX_VALUE)
  addTestVector(Number.MIN_VALUE)
  addTestVector(0.5)
  addTestVector(-1.5)
  addTestVector(0.1234567890987654321)
  addTestVector(NaN).unserializable().undeserializable()
  addTestVector(Infinity).unserializable().undeserializable()
  addTestVector(-Infinity).unserializable().undeserializable()

  // Strings
  addTestVector('')
  addTestVector('abc')
  addTestVector('🐉')
  let longString = ''
  for (let i = 0; i < 10000; i++) longString += 'abcdefghijklmnopqrstuvwxyz'
  addTestVector(longString)

  // Undefined
  addTestVector(undefined).serialized({ $undef: 1 })

  // Objects
  addTestVector(null)
  addTestVector({})
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
  addTestVector({ n: 1 })
  addTestVector({ o1: { o2: { o3: {} } } })
  addTestVector({ s: 't', a: [1], b: true, n: 0, o: { n2: 2 }, z: null })
  addTestVector(new Proxy({}, {}))
  addTestVector({ $undef: 1 }).serialized(undefined).unserializable().undeserializable()
  addTestVector({ $ref: '123' }).unserializable().undeserializable()
  addTestVector({ $n: '0' }).unserializable().undeserializable()
  addTestVector({ $invalid: 1 }).unserializable().undeserializable()
  addTestVector({ undef: undefined }).serialized({ undef: { $undef: 1 } })

  // Array
  addTestVector([])
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Array))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Array))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Array))
  addTestVector([1, 'a', true])
  addTestVector([[[]]])
  const z = [[1], [2], [3]]
  addTestVector(z)
  const arr = [1]
  arr.x = 2
  addTestVector(arr)
  addTestVector([undefined, null]).serialized([{ $undef: 1 }, null])
  class CustomArray extends Array {}
  addTestVector(CustomArray.from([])).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector([{ $invalid: 1 }]).unserializable().undeserializable()

  // Sets
  addTestVector(new Set()).serialized({ $set: [] })
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Set))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Set))
  addTestVector(new Set([1, 2, 3])).serialized({ $set: [1, 2, 3] })
  addTestVector(new Set([new Set(['a', false, null]), {}, []]))
    .serialized({ $set: [{ $set: ['a', false, null] }, {}, []] })
  const setWithProps = new Set([0])
  Object.assign(setWithProps, { a: 'a', b: [], c: new Set() })
  addTestVector(setWithProps).serialized({ $set: [0], props: { a: 'a', b: [], c: { $set: [] } } })
  addTestVector({ $set: null }).unserializable().undeserializable()
  addTestVector({ $set: {} }).unserializable().undeserializable()
  addTestVector({ $set: [{ $invalid: 1 }] }).unserializable().undeserializable()
  addTestVector({ $set: new Uint8Array() }).unserializable().undeserializable()

  // Maps
  addTestVector(new Map()).serialized({ $map: [] })
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Map))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Map))
  addTestVector(new Map([[1, 2]])).serialized({ $map: [[1, 2]] })
  addTestVector(new Map([['a', true], ['b', false]])).serialized({ $map: [['a', true], ['b', false]] })
  addTestVector(new Map([[0, new Map()]])).serialized({ $map: [[0, { $map: [] }]] })
  const mapWithProps = new Map([[0, 1]])
  Object.assign(mapWithProps, { x: new Set() })
  addTestVector(mapWithProps).serialized({ $map: [[0, 1]], props: { x: { $set: [] } } })
  addTestVector({ $map: null }).unserializable().undeserializable()
  addTestVector({ $map: {} }).unserializable().undeserializable()
  addTestVector({ $map: [{}] }).unserializable().undeserializable()
  addTestVector({ $map: [[1, 2, 3]] }).unserializable().undeserializable()

  // Uint8Array
  addTestVector(new Uint8Array()).serialized({ $ui8a: '' })
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Uint8Array))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Uint8Array))
  addTestVector(new Uint8Array([0x00, 0x01])).serialized({ $ui8a: 'AAE=' })
  const hellobuf = Buffer.from('hello', 'utf8')
  addTestVector(new Uint8Array(hellobuf)).serialized({ $ui8a: hellobuf.toString('base64') })
  const randombuf = bsv.crypto.Random.getRandomBuffer(1024)
  addTestVector(new Uint8Array(randombuf)).serialized({ $ui8a: randombuf.toString('base64') })
  const bufWithProps = new Uint8Array()
  bufWithProps.x = 1
  addTestVector(bufWithProps).serialized({ $ui8a: '' }).unscannable().uncloneable().unserializable()
  addTestVector(Buffer.alloc(0)).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector({ $ui8a: [] }).unserializable().undeserializable()
  addTestVector({ $ui8a: {} }).unserializable().undeserializable()
  addTestVector({ $ui8a: '🐉' }).unserializable().undeserializable()
  addTestVector({ $ui8a: new Uint8Array() }).unserializable().undeserializable()

  // Duplicate references
  const objDup = { n: null }
  const dupObj = { a: objDup, b: objDup }
  addTestVector(dupObj)
    .serialized({ $dedup: { a: { $dup: 0 }, b: { $dup: 0 } }, dups: [{ n: null }] })
    .checkDeserialized(x => expect(x.a).to.equal(x.b))
  const arrDup = [undefined]
  const dupArr = [arrDup, arrDup]
  addTestVector(dupArr)
    .serialized({ $dedup: [{ $dup: 0 }, { $dup: 0 }], dups: [[{ $undef: 1 }]] })
    .checkDeserialized(x => expect(x[0]).to.equal(x[1]))
  const bufDup = new Uint8Array()
  const dupBuf = [bufDup, bufDup]
  addTestVector(dupBuf)
    .serialized({ $dedup: [{ $dup: 0 }, { $dup: 0 }], dups: [{ $ui8a: '' }] })
    .checkDeserialized(x => expect(x[0]).to.equal(x[1]))
  const setDup = new Set()
  const dupSet = new Set([{ a: setDup }, { b: setDup }])
  addTestVector(dupSet)
    .serialized({ $dedup: { $set: [{ a: { $dup: 0 } }, { b: { $dup: 0 } }] }, dups: [{ $set: [] }] })
    .checkDeserialized(x => {
      const keys = Array.from(x.keys())
      expect(keys[0].a).to.equal(keys[1].b)
      expect(keys[0].a).not.to.equal(undefined)
    })
  const mapDup = new Map()
  const dupMap = new Map([[0, mapDup], [1, mapDup]])
  addTestVector(dupMap)
    .serialized({ $dedup: { $map: [[0, { $dup: 0 }], [1, { $dup: 0 }]] }, dups: [{ $map: [] }] })
    .checkDeserialized(x => expect(x.has(0)).to.equal(true))
    .checkDeserialized(x => expect(x.has(1)).to.equal(true))
    .checkDeserialized(x => expect(x.get(0)).to.equal(x.get(1)))

  // Multiple dups in a tree
  const multipleDups = { arr: [] }
  multipleDups.a = []
  multipleDups.arr.push(multipleDups.a)
  multipleDups.b = new Uint8Array()
  multipleDups.arr.push(multipleDups.b)
  multipleDups.c = new Set()
  multipleDups.arr.push(multipleDups.c)
  addTestVector(multipleDups)
    .serialized({
      $dedup: { a: { $dup: 0 }, b: { $dup: 1 }, c: { $dup: 2 }, arr: [{ $dup: 0 }, { $dup: 1 }, { $dup: 2 }] },
      dups: [[], { $ui8a: '' }, { $set: [] }]
    })
    .checkDeserialized(x => expect(x.a).to.equal(x.arr[0]))
    .checkDeserialized(x => expect(x.b).to.equal(x.arr[1]))
    .checkDeserialized(x => expect(x.c).to.equal(x.arr[2]))
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))

  // Circular references
  const circObj = {}
  circObj.c = circObj
  addTestVector(circObj)
    .serialized({
      $dedup: { $dup: 0 },
      dups: [{ c: { $dup: 0 } }]
    })
    .checkDeserialized(x => expect(x.c).to.equal(x))
  const circArr = []
  circArr.push(circArr)
  addTestVector(circArr)
    .serialized({
      $dedup: { $dup: 0 },
      dups: [[{ $dup: 0 }]]
    })
    .checkDeserialized(x => expect(x[0]).to.equal(x))
  const circSet = new Set()
  circSet.add(circSet)
  circSet.c = circSet
  addTestVector(circSet)
    .serialized({
      $dedup: { $dup: 0 },
      dups: [{ $set: [{ $dup: 0 }], props: { c: { $dup: 0 } } }]
    })
    .checkDeserialized(x => expect(x.c).to.equal(x.keys().next().value))
  const circMap = new Map()
  circMap.set(circMap, 1)
  circMap.set(1, circMap)
  circMap.m = circMap
  addTestVector(circMap)
    .serialized({
      $dedup: { $dup: 0 },
      dups: [{
        $map: [[{ $dup: 0 }, 1], [1, { $dup: 0 }]],
        props: { m: { $dup: 0 } }
      }]
    })
    .checkDeserialized(x => expect(x.m).to.equal(x.get(1)))
    .checkDeserialized(x => expect(x.get(x.m)).to.equal(1))
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Map))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Map))

  // Complex circular dups
  const complexMap = new Map()
  const complexObj = {}
  const complexArr = []
  complexArr.push(complexMap)
  complexArr.push(complexObj)
  complexMap.set('a', complexObj)
  complexObj.b = complexArr
  addTestVector(complexArr)
    .serialized({
      $dedup: { $dup: 0 },
      dups: [[{ $map: [['a', { $dup: 1 }]] }, { $dup: 1 }], { b: { $dup: 0 } }]
    })
    .checkDeserialized(x => expect(x).to.equal(x[0].get('a').b))
    .checkDeserialized(x => expect(x[0]).to.equal(x[0].get('a').b[0]))
    .checkDeserialized(x => expect(x[0].get('a')).to.equal(x[0].get('a').b[0].get('a')))
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Array))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Array))

  // Bad dedup serialization
  addTestVector({ $dedup: {} }).unserializable().undeserializable()
  addTestVector({ $dedup: {}, dups: {} }).unserializable().undeserializable()
  addTestVector({ $dedup: { $dup: 0 }, dups: [] }).unserializable().undeserializable()
  addTestVector({ $dedup: { $dup: 0 }, dups: [{ $dup: 1 }] }).unserializable().undeserializable()

  // Unsupported TypedArrays
  addTestVector(new Int8Array()).serialized({ $i8a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Uint8ClampedArray()).serialized({ $ui8ca: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Int16Array()).serialized({ $i16a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Uint16Array()).serialized({ $u16a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Int32Array()).serialized({ $i32a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Uint32Array()).serialized({ $ui32a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Float32Array()).serialized({ $f32a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Float64Array()).serialized({ $f64a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  if (typeof BigInt64Array !== 'undefined') {
    // eslint-disable-next-line
    addTestVector(new BigInt64Array()).serialized({ $bi64a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  }
  if (typeof BigUint64Array !== 'undefined') {
    // eslint-disable-next-line
    addTestVector(new BigUint64Array()).serialized({ $bui64a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  }

  // Symbols
  addTestVector(Symbol.hasInstance).uncloneable().unserializable().undeserializable()
  addTestVector(Symbol.iterator).uncloneable().unserializable().undeserializable()
  addTestVector(Symbol.species).uncloneable().unserializable().undeserializable()
  addTestVector(Symbol.unscopables).uncloneable().unserializable().undeserializable()

  // Intrinsic objects
  addTestVector(console).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Object).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Function).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Error).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Math).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Buffer).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(String).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Date).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(JSON).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Promise).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Proxy).unscannable().uncloneable().unserializable().undeserializable()
  if (typeof WebAssembly !== 'undefined') {
    // eslint-disable-next-line
    addTestVector(WebAssembly).unscannable().uncloneable().unserializable().undeserializable()
  }

  // Unsupported objects
  addTestVector(new Date()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new WeakSet()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new WeakMap()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new RegExp()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(/^abc/).unscannable().uncloneable().unserializable().undeserializable()

  // Unknown intrinsics
  const { intrinsics: unknown } = new Evaluator()
  addTestVector(new unknown.Uint8Array()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new unknown.Set()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new unknown.Map()).unscannable().uncloneable().unserializable().undeserializable()

  // Deployable
  // finish implementing serializable, etc.
  // register test as needing deployable, and which deployables they are
  // check deployables after scan, etc.
  // test xray with and without support

  // allow deployables in other tests, even when don't support it

  // TODO: Wrap errors for tests to print what test it is

  // TODO: Circular arb object

  // Deployable
  /*
  addTestVector(class { }, { deployable: true })
  addTestVector(class A { }, { deployable: true })
  addTestVector(class { method() { return null }}, { deployable: true })
  addTestVector(class B { constructor() {}}, { deployable: true })
  addTestVector(function f() {}, { deployable: true })
  addTestVector(function add(a, b) { return a + b}, { deployable: true })
  addTestVector(function () { return '123' }, { deployable: true })
  addTestVector(() => {}, { deployable: true })
  addTestVector(x => x, { deployable: true })

  // Non-deployable
  addTestVector(Math.random, { deployable: false })
  addTestVector(Array.prototype.indexOf, { deployable: false })
  addTestVector(WeakSet.prototype.has, { deployable: false })
  addTestVector(String.prototype.endsWith, { deployable: false })
  addTestVector(isNaN, { deployable: false })
  addTestVector(isFinite, { deployable: false })
  addTestVector(parseInt, { deployable: false })
  addTestVector(escape, { deployable: false })
  addTestVector(eval, { deployable: false })
  */

  // Tokens

  // TODO: if (key.startsWith('$')) throw new Error('$ properties must not be defined')
  // -On Set properties
  // Port existing classes over
}

const evaluator = new Evaluator()

const globalIntrinsics = new Intrinsics()
addTestVectors(globalIntrinsics, globalIntrinsics.allowed[0])

const sesIntrinsics = new Intrinsics()
sesIntrinsics.set(evaluator.intrinsics)
addTestVectors(sesIntrinsics, sesIntrinsics.allowed[0])

const allIntrinsics = new Intrinsics()
allIntrinsics.use(evaluator.intrinsics)
addTestVectors(allIntrinsics, allIntrinsics.allowed[0])
addTestVectors(allIntrinsics, allIntrinsics.allowed[1])

// ------------------------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------------------------

describe('Xray', () => {
  describe('constructor', () => {
    it('should use default intrinsics', () => {
      expect(new Xray().intrinsics).to.equal(Intrinsics.defaultIntrinsics)
    })
  })

  describe('scan', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testScan())
    })
  })

  describe('cloneable', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testCloneable())
    })
  })

  describe('serializable', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testSerializable())
    })
  })

  describe('deserializable', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testDeserializable())
    })
  })

  describe('clone', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testClone())
    })
  })

  describe('serialize', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testSerialize())
    })
  })

  describe('deserialize', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testDeserialize())
    })
  })
})

// ------------------------------------------------------------------------------------------------

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(11).Buffer))

/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 */

const bsv = __webpack_require__(0)
const util = __webpack_require__(4)
const Evaluator = __webpack_require__(17)
const { Jig, JigControl } = __webpack_require__(9)
const { Berry, BerryControl } = __webpack_require__(13)
const { Intrinsics } = __webpack_require__(10)
const Xray = __webpack_require__(12)
const Context = __webpack_require__(16)

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

const stringProps = ['origin', 'location', 'originMainnet', 'locationMainnet', 'originTestnet',
  'locationTestnet', 'originStn', 'locationStn', 'originMocknet', 'locationMocknet',
  'owner', 'ownerMainnet', 'ownerTestnet', 'ownerStn', 'ownerMocknet']

/**
   * Code repository, sandboxer, installer, and deployer
   */
class Code {
  constructor (options = {}) {
    this.installs = new Map() // Type | Location | Sandbox -> Sandbox
    this.evaluator = new Evaluator({ logger: options.logger, sandbox: options.sandbox })
    this.intrinsics = new Intrinsics().use(this.evaluator.intrinsics)
    this.installJig()
    this.installBerry()
  }

  isSandbox (type) {
    const sandbox = this.installs.get(type)
    return sandbox && type === sandbox
  }

  getInstalled (typeOrLocation) {
    if (this.isSandbox(typeOrLocation)) return typeOrLocation
    return this.installs.get(typeOrLocation)
  }

  // Install loads code into a sandbox and makes it available to use
  // It does not deploy the code. It does however check that the code
  // is deployable. The main purpose is to install berry protocols for
  // use on mainnet and testnet without deploying the protocol to the chain.
  installBerryProtocol (type) {
    // Make sure the presets are there
    return this.deploy(type, { dontDeploy: true })
  }

  extractProps (type) {
    // Determine which properties to extract
    const skipProps = ['deps', ...stringProps]
    const classProps = Object.keys(type)
    const propNames = classProps.filter(key => !skipProps.includes(key))

    // Create an object with just these properties
    const props = {}
    propNames.forEach(name => { props[name] = type[name] })

    // Check that these properties are serializable
    const xray = new Xray()
      .allowTokens()
      .allowDeployables()
      .useIntrinsics(this.intrinsics)

    try {
      xray.scan(props)
    } catch (e) {
      throw new Error(`A static property of ${type.name} is not supported\n\n${e}`)
    }

    // Save the any deployables and tokens
    const refs = []
    xray.deployables.forEach(deployable => refs.push(deployable))
    xray.tokens.forEach(token => refs.push(token))

    return { props, refs }
  }

  deploy (type, options = {}) {
    // short-circut deployment at Jig and Berry because this class already deployed it
    if (type === this.Jig || type === Jig) return this.Jig
    if (type === this.Berry || type === Berry) return this.Berry

    // check that this code can be deployed
    if (!util.deployable(type)) throw new Error(`${type} is not deployable`)

    // if this type was already deployed on this network, don't deploy again
    const pre = this.installs.get(type)
    const run = util.activeRunInstance()
    const net = util.networkSuffix(run.blockchain.network)
    if (pre && Object.keys(pre).includes(`origin${net}`) &&
      Object.keys(pre).includes(`location${net}`)) return pre

    // TODO: Add test, and make sure this works
    const classProps = Object.keys(type)
    if (classProps.includes(`location${net}`)) {
      const preByLoc = this.installs.get(type[`location${net}`])
      if (preByLoc) return preByLoc
    }

    // check the class properties. classProps are props specifically on this code, not a parent
    const isBasicObject = (o) => Object.getPrototypeOf(Object.getPrototypeOf(o)) === null
    if (classProps.includes('deps') && !isBasicObject(type.deps)) throw new Error('deps must be an object')
    const notAString = s => classProps.includes(s) && typeof type[s] !== 'string'
    stringProps.forEach(s => { if (notAString(s)) throw new Error(`${s} must be a string: ${type[s]}`) })

    run.transaction.begin()
    try {
      // create env, the globals in the sandbox. this will just be the parent.
      const env = {}

      // make sure the parent does not conflict with whats set in deps
      // realdeps is type.deps with its parent if not there
      const parentClass = Object.getPrototypeOf(type)
      const realdeps = classProps.includes('deps') ? Object.assign({}, type.deps) : {}
      const SandboxObject = this.evaluator.intrinsics.Object
      if (parentClass !== Object.getPrototypeOf(Object) &&
        parentClass !== SandboxObject.getPrototypeOf(SandboxObject)) {
        env[parentClass.name] = this.deploy(parentClass, options)
        if (realdeps[parentClass.name]) {
          const currentSandbox = this.getInstalled(realdeps[parentClass.name])
          if (currentSandbox !== env[parentClass.name]) {
            throw new Error(`unexpected parent dependency ${parentClass.name}`)
          }
        }
        if (!(parentClass.name in realdeps) &&
          parentClass !== this.installs.get(Jig) &&
          parentClass !== Jig &&
          parentClass !== this.installs.get(Berry) &&
          parentClass !== Berry) {
          realdeps[parentClass.name] = parentClass
        }
      }

      // If the parent the child, return its location and don't install anything
      const pre2 = this.installs.get(type)
      if (pre2 && Object.keys(pre2).includes(`origin${net}`) &&
        Object.keys(pre2).includes(`location${net}`)) return pre2

      const [sandbox, sandboxGlobal] = this.sandboxType(type, env)
      this.installs.set(type, sandbox)
      this.installs.set(sandbox, sandbox)

      // Deploy any code found in the static properties
      const xray = new Xray()
        .allowTokens()
        .allowDeployables()
        .useIntrinsics(this.intrinsics)
        .useCodeCloner(x => this.getInstalled(x))

      const staticProps = Object.assign({}, type)
      stringProps.forEach(name => { delete staticProps[name] })

      try {
        xray.scan(staticProps)
      } catch (e) {
        throw new Error(`A static property of ${type.name} is not supported\n\n${e}`)
      }

      // If location is already set for the network, assume correct and don't reupload
      const hasPresets = classProps.includes(`origin${net}`) || classProps.includes(`location${net}`)
      if (hasPresets) {
        if (classProps.includes(`origin${net}`)) {
          sandbox[`origin${net}`] = sandbox.origin = type.origin = type[`origin${net}`]
        }
        sandbox[`location${net}`] = sandbox.location = type.location = type[`location${net}`] || type.origin
        sandbox[`owner${net}`] = sandbox.owner = type.owner = type[`owner${net}`]

        this.installs.set(sandbox[`location${net}`], sandbox)
      } else if (options.dontDeploy) {
        // Berry protocols
        const location = '!Not deployed'
        sandbox[`origin${net}`] = sandbox.origin = type.origin = type[`origin${net}`] = location
        sandbox[`location${net}`] = sandbox.location = type.location = type[`location${net}`] || type.origin
        sandbox[`owner${net}`] = sandbox.owner = type.owner = type[`owner${net}`] = null
      } else {
        // Location is not set. use a temporary location and deploy

        const currentNetwork = run.blockchain.network
        const success = (location) => {
          // if different network, primary origin and location will be set by that run instance
          if (run.blockchain.network === currentNetwork) {
            type.origin = type.location = sandbox.origin = sandbox.location = location
            type.owner = sandbox.owner = type[`owner${net}`]
          }
          sandbox[`origin${net}`] = sandbox[`location${net}`] = location
          type[`origin${net}`] = type[`location${net}`] = location
          this.installs.set(location, sandbox)
        }
        const error = () => {
          if (run.blockchain.network === currentNetwork) {
            delete type.origin; delete type.location
            delete sandbox.origin; delete sandbox.location
            delete type.owner; delete sandbox.owner
          }
          delete type[`origin${net}`]; delete type[`location${net}`]
          delete sandbox[`origin${net}`]; delete sandbox[`location${net}`]
          delete type[`owner${net}`]; delete sandbox[`owner${net}`]
        }

        const actionProps = Object.assign({}, staticProps)
        delete actionProps.deps
        const tempLocation = run.transaction.storeCode(type, sandbox, realdeps, actionProps, success, error)

        type[`origin${net}`] = type[`location${net}`] = tempLocation
        sandbox[`origin${net}`] = sandbox[`location${net}`] = tempLocation
        type[`owner${net}`] = sandbox[`owner${net}`] = type.owner
      }

      // Deploy each deployable
      xray.deployables.forEach(x => this.deploy(x, options))

      // Create a safe clone of the static properties for the sandbox
      try {
        const safeStaticProps = xray.clone(staticProps)
        Object.assign(sandbox, safeStaticProps)
      } catch (e) {
        throw new Error(`A static property of ${type.name} cannot be sandboxed\n\n${e}`)
      }

      // Set dependencies now as sandbox globals. We've delayed this to enable circular deps.
      if (sandboxGlobal) {
        Object.entries(realdeps).forEach(([name, dep]) => {
          if (dep === parentClass || dep === env[parentClass.name]) return
          sandboxGlobal[name] = this.deploy(dep, options)
        })
      }

      return sandbox
    } finally {
      run.transaction.end()
    }
  }

  async installFromTx (def, location, tx, run, bsvNetwork, partiallyInstalledCode = new Map()) {
    // if we have this location already, return it
    if (this.installs.has(location)) return this.installs.get(location)
    if (partiallyInstalledCode.has(location)) return partiallyInstalledCode.get(location)

    // parse the location
    const txid = location.slice(0, 64)
    const vout = parseInt(location.slice(66))

    // make sure the owner matches the output's address
    const addr1 = tx.outputs[vout].script.toAddress(bsvNetwork).toString()
    const addr2 = new bsv.PublicKey(def.owner, bsvNetwork).toAddress().toString()
    if (addr1 !== addr2) throw new Error(`bad def owner: ${location}`)

    const env = { }

    // Create a promise so that other dependencies can refer to this load
    // instead of loading themselves
    let partialInstallResolve = null; let partialInstallReject = null
    const partialInstall = new Promise((resolve, reject) => {
      partialInstallResolve = resolve
      partialInstallReject = reject
    })
    partiallyInstalledCode.set(location, partialInstall)

    try {
      const parentClassRegex = /^class \w* extends (\w*)[\s]*{/
      let parentName = null
      if (parentClassRegex.test(def.text)) {
        parentName = def.text.match(parentClassRegex)[1]
        let parentLocation = (def.deps || {})[parentName]
        if (parentName === 'Jig' && typeof parentLocation === 'undefined') {
          env.Jig = this.Jig
        } else if (parentName === 'Berry' && typeof parentLocation === 'undefined') {
          env.Berry = this.Berry
        } else {
          if (parentLocation.startsWith('_')) { parentLocation = tx.hash + parentLocation }
          env[parentName] = await run.transaction.load(parentLocation, { partiallyInstalledCode })
        }
      }

      const [sandbox, sandboxGlobal] = this.evaluator.evaluate(def.text, env)
      sandbox.origin = sandbox.location = location
      sandbox.owner = def.owner
      const net = util.networkSuffix(run.blockchain.network)
      sandbox[`origin${net}`] = sandbox[`location${net}`] = location
      sandbox[`owner${net}`] = def.owner
      partialInstallResolve(sandbox)

      if (sandboxGlobal) {
        const promises = Object.entries(def.deps || {}).map(([name, dep]) => {
          if (name === parentName) return
          const location = dep.startsWith('_') ? tx.hash + dep : dep
          return run.transaction.load(location, { partiallyInstalledCode }).then(T => {
            sandboxGlobal[name] = T
          })
        })
        await Promise.all(promises)
      }

      // set all of the dependencies to their sandboxed versions
      if (def.deps) {
        sandbox.deps = {}
        Object.keys(def.deps).forEach(name => {
          sandbox.deps[name] = sandboxGlobal[name] || env[name]
        })
      }

      // Hydrate class prop tokens and apply them to the sandbox
      if (def.props) {
        const tokens = new Map()
        const tokenLoader = ref => tokens.get(ref)

        const xray = new Xray()
          .allowTokens()
          .useIntrinsics(this.intrinsics)
          .useTokenLoader(tokenLoader)

        xray.scan(def.props)

        const fullLocation = loc => ((loc[1] === 'i' || loc[1] === 'o') ? txid + loc : loc)
        const loadRef = ref => run.transaction.load(fullLocation(ref), { partiallyInstalledCode })
          .then(token => tokens.set(ref, token))
        await Promise.all(Array.from(xray.refs).map(ref => loadRef(ref)))

        const classProps = xray.deserialize(def.props)

        Object.assign(sandbox, classProps)
      }

      partiallyInstalledCode.delete(location)

      // Safety check. We should be able to remove over time.
      if (this.installs.has(location)) {
        const hint = 'This is an internal Run bug. Please report it to the library developers.'
        throw new Error(`Code installed twice for ${location}\n\n${hint}.`)
      }

      this.installs.set(location, sandbox)
      this.installs.set(sandbox, sandbox)

      return sandbox
    } catch (e) {
      partialInstallReject(e)
      throw e
    }
  }

  installJig () {
    const env = { JigControl, Context }
    this.Jig = this.sandboxType(Jig, env)[0]
    this.installs.set(Jig, this.Jig)
    this.installs.set(this.Jig, this.Jig)
  }

  installBerry () {
    const env = { BerryControl, Context }
    this.Berry = this.sandboxType(Berry, env)[0]
    this.installs.set(Berry, this.Berry)
    this.installs.set(this.Berry, this.Berry)
  }

  sandboxType (type, env) {
    const prev = this.installs.get(type)
    if (prev) return [prev, null]
    const code = util.getNormalizedSourceCode(type)
    const willSandbox = this.evaluator.willSandbox(code)
    const [result, globals] = this.evaluator.evaluate(code, env)
    return [!willSandbox && type ? type : result, globals]
  }

  activate (network) {
    const net = util.networkSuffix(network)

    this.installs.forEach((v, k) => {
      if (typeof k === 'string') return // location
      if (typeof k[`origin${net}`] !== 'undefined') {
        k.origin = k[`origin${net}`]
        v.origin = k[`origin${net}`]
      } else { delete k.origin; delete v.origin }
      if (typeof k[`location${net}`] !== 'undefined') {
        k.location = k[`location${net}`]
        v.location = k[`location${net}`]
      } else { delete k.location; delete v.location }
      if (typeof k[`owner${net}`] !== 'undefined') {
        k.owner = k[`owner${net}`]
        v.owner = k[`owner${net}`]
      } else { delete k.owner; delete v.owner }
    })

    this.evaluator.activate()
  }

  deactivate () {
    this.evaluator.deactivate()
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Code


/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

(function (global, factory) {
   true ? module.exports = factory() :
  undefined;
}(this, function () { 'use strict';

  // we'd like to abandon, but we can't, so just scream and break a lot of
  // stuff. However, since we aren't really aborting the process, be careful to
  // not throw an Error object which could be captured by child-Realm code and
  // used to access the (too-powerful) primal-realm Error object.

  function throwTantrum(s, err = undefined) {
    const msg = `please report internal shim error: ${s}`;

    // we want to log these 'should never happen' things.
    // eslint-disable-next-line no-console
    console.error(msg);
    if (err) {
      // eslint-disable-next-line no-console
      console.error(`${err}`);
      // eslint-disable-next-line no-console
      console.error(`${err.stack}`);
    }

    // eslint-disable-next-line no-debugger
    debugger;
    throw msg;
  }

  function assert(condition, message) {
    if (!condition) {
      throwTantrum(message);
    }
  }

  /**
   * safeStringifyFunction()
   * Remove code modifications introduced by ems and nyx in
   * test mode which intefere with Function.toString().
   */
  function safeStringifyFunction(fn) {
    let src = `'use strict'; (${fn})`;

    // esm module creates "runtime" as "_" + hex(3) + "\u200D"

    // Restore eval which is modified by esm module.
    // (0, eval) => (0, <runtime>.e)
    src = src.replace(/\(0,\s*_[0-9a-fA-F]{3}\u200D\.e\)/g, '(0, eval)');

    // Restore globals such as Reflect which are modified by esm module.
    // Reflect => <runtime>.e.Reflect
    src = src.replace(/_[0-9a-fA-F]{3}\u200D\.g\./g, '');

    // Remove code coverage which is injected by nyc module.
    src = src.replace(/cov_[^+]+\+\+[;,]/g, '');

    return src;
  }

  // buildChildRealm is immediately turned into a string, and this function is
  // never referenced again, because it closes over the wrong intrinsics

  function buildChildRealm(unsafeRec, BaseRealm) {
    const { callAndWrapError } = unsafeRec;
    const {
      initRootRealm,
      initCompartment,
      getRealmGlobal,
      realmEvaluate
    } = BaseRealm;

    const { create, defineProperties } = Object;

    class Realm {
      constructor() {
        // The Realm constructor is not intended to be used with the new operator
        // or to be subclassed. It may be used as the value of an extends clause
        // of a class definition but a super call to the Realm constructor will
        // cause an exception.

        // When Realm is called as a function, an exception is also raised because
        // a class constructor cannot be invoked without 'new'.
        throw new TypeError('Realm is not a constructor');
      }

      static makeRootRealm(options = {}) {
        // This is the exposed interface.

        // Bypass the constructor.
        const r = create(Realm.prototype);
        callAndWrapError(initRootRealm, [unsafeRec, r, options]);
        return r;
      }

      static makeCompartment(options = {}) {
        // Bypass the constructor.
        const r = create(Realm.prototype);
        callAndWrapError(initCompartment, [unsafeRec, r, options]);
        return r;
      }

      // we omit the constructor because it is empty. All the personalization
      // takes place in one of the two static methods,
      // makeRootRealm/makeCompartment

      get global() {
        // this is safe against being called with strange 'this' because
        // baseGetGlobal immediately does a trademark check (it fails unless
        // this 'this' is present in a weakmap that is only populated with
        // legitimate Realm instances)
        return callAndWrapError(getRealmGlobal, [this]);
      }

      evaluate(x, endowments, options = {}) {
        // safe against strange 'this', as above
        return callAndWrapError(realmEvaluate, [this, x, endowments, options]);
      }
    }

    defineProperties(Realm, {
      toString: {
        value: () => 'function Realm() { [shim code] }',
        writable: false,
        enumerable: false,
        configurable: true
      }
    });

    defineProperties(Realm.prototype, {
      toString: {
        value: () => '[object Realm]',
        writable: false,
        enumerable: false,
        configurable: true
      }
    });

    return Realm;
  }

  // The parentheses means we don't bind the 'buildChildRealm' name inside the
  // child's namespace. this would accept an anonymous function declaration.
  // function expression (not a declaration) so it has a completion value.
  const buildChildRealmString = safeStringifyFunction(buildChildRealm);

  function buildCallAndWrapError() {
    // This Object and Reflect are brand new, from a new unsafeRec, so no user
    // code has been run or had a chance to manipulate them. Don't ever run this
    // function *after* user code has had a chance to pollute its environment,
    // or it could be used to gain access to BaseRealm and primal-realm Error
    // objects.
    const { getPrototypeOf } = Object;
    const { apply } = Reflect;
    const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);
    const mapGet = uncurryThis(Map.prototype.get);
    const setHas = uncurryThis(Set.prototype.has);

    const errorNameToErrorConstructor = new Map([
      ['EvalError', EvalError],
      ['RangeError', RangeError],
      ['ReferenceError', ReferenceError],
      ['SyntaxError', SyntaxError],
      ['TypeError', TypeError],
      ['URIError', URIError]
    ]);
    const errorConstructors = new Set([
      EvalError.prototype,
      RangeError.prototype,
      ReferenceError.prototype,
      SyntaxError.prototype,
      TypeError.prototype,
      URIError.prototype,
      Error.prototype
    ]);

    function callAndWrapError(target, args) {
      try {
        return apply(target, undefined, args);
      } catch (err) {
        // 1. Thrown primitives
        if (Object(err) !== err) {
          // err is a primitive value, which is safe to rethrow
          throw err;
        }

        // 2. Current realm errors
        if (setHas(errorConstructors, getPrototypeOf(err))) {
          // err is a from the current realm, which is safe to rethrow.
          // Object instances (normally) only contain intrinsics from the
          // same realm. An error containing intrinsics from different
          // realms would have to be manually constucted, which imply that
          // such intrinsics were available, and confinement was already lost.
          throw err;
        }

        // 3. Other realm errors
        let eName, eMessage, eStack;
        try {
          // The other environment might seek to use 'err' to reach the
          // parent's intrinsics and corrupt them. In addition, exceptions
          // raised in the primal realm need to be converted to the current
          // realm.

          // `${err.name}` will cause string coercion of 'err.name'.
          // If err.name is an object (probably a String of another Realm),
          // the coercion uses err.name.toString(), which is under the control
          // of the other realm. If err.name were a primitive (e.g. a number),
          // it would use Number.toString(err.name), using the child's version
          // of Number (which the child could modify to capture its argument for
          // later use), however primitives don't have properties like .prototype
          // so they aren't useful for an attack.
          eName = `${err.name}`;
          eMessage = `${err.message}`;
          eStack = `${err.stack || eMessage}`;
          // eName/eMessage/eStack are now realm-independent primitive strings, and
          // safe to expose.
        } catch (ignored) {
          // if err.name.toString() throws, keep the (parent realm) Error away.
          throw new Error('unknown error');
        }
        const ErrorConstructor =
          mapGet(errorNameToErrorConstructor, eName) || Error;
        try {
          throw new ErrorConstructor(eMessage);
        } catch (err2) {
          err2.stack = eStack; // replace with the captured inner stack
          throw err2;
        }
      }
    }

    return callAndWrapError;
  }

  const buildCallAndWrapErrorString = safeStringifyFunction(
    buildCallAndWrapError
  );

  // Declare shorthand functions. Sharing these declarations across modules
  // improves both consistency and minification. Unused declarations are
  // dropped by the tree shaking process.

  // we capture these, not just for brevity, but for security. If any code
  // modifies Object to change what 'assign' points to, the Realm shim would be
  // corrupted.

  const {
    assign,
    create,
    freeze,
    defineProperties, // Object.defineProperty is allowed to fail
    // silentlty, use Object.defineProperties instead.
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getPrototypeOf,
    setPrototypeOf
  } = Object;

  const {
    apply,
    ownKeys // Reflect.ownKeys includes Symbols and unenumerables,
    // unlike Object.keys()
  } = Reflect;

  /**
   * uncurryThis() See
   * http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
   * which only lives at
   * http://web.archive.org/web/20160805225710/http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
   *
   * Performance:
   * 1. The native call is about 10x faster on FF than chrome
   * 2. The version using Function.bind() is about 100x slower on FF,
   *    equal on chrome, 2x slower on Safari
   * 3. The version using a spread and Reflect.apply() is about 10x
   *    slower on FF, equal on chrome, 2x slower on Safari
   *
   * const bind = Function.prototype.bind;
   * const uncurryThis = bind.bind(bind.call);
   */
  const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);

  // We also capture these for security: changes to Array.prototype after the
  // Realm shim runs shouldn't affect subsequent Realm operations.
  const objectHasOwnProperty = uncurryThis(
      Object.prototype.hasOwnProperty
    ),
    arrayFilter = uncurryThis(Array.prototype.filter),
    arrayPop = uncurryThis(Array.prototype.pop),
    arrayJoin = uncurryThis(Array.prototype.join),
    arrayConcat = uncurryThis(Array.prototype.concat),
    regexpTest = uncurryThis(RegExp.prototype.test),
    stringIncludes = uncurryThis(String.prototype.includes);

  // These value properties of the global object are non-writable,
  // non-configurable data properties.
  const frozenGlobalPropertyNames = [
    // *** 18.1 Value Properties of the Global Object

    'Infinity',
    'NaN',
    'undefined'
  ];

  // All the following stdlib items have the same name on both our intrinsics
  // object and on the global object. Unlike Infinity/NaN/undefined, these
  // should all be writable and configurable. This is divided into two
  // sets. The stable ones are those the shim can freeze early because
  // we don't expect anyone will want to mutate them. The unstable ones
  // are the ones that we correctly initialize to writable and
  // configurable so that they can still be replaced or removed.
  const stableGlobalPropertyNames = [
    // *** 18.2 Function Properties of the Global Object

    // 'eval', // comes from safeEval instead
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',

    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',

    // *** 18.3 Constructor Properties of the Global Object

    'Array',
    'ArrayBuffer',
    'Boolean',
    'DataView',
    // 'Date',  // Unstable
    // 'Error',  // Unstable
    'EvalError',
    'Float32Array',
    'Float64Array',
    // 'Function',  // comes from safeFunction instead
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Map',
    'Number',
    'Object',
    // 'Promise',  // Unstable
    // 'Proxy',  // Unstable
    'RangeError',
    'ReferenceError',
    // 'RegExp',  // Unstable
    'Set',
    // 'SharedArrayBuffer'  // removed on Jan 5, 2018
    'String',
    'Symbol',
    'SyntaxError',
    'TypeError',
    'Uint8Array',
    'Uint8ClampedArray',
    'Uint16Array',
    'Uint32Array',
    'URIError',
    'WeakMap',
    'WeakSet',

    // *** 18.4 Other Properties of the Global Object

    // 'Atomics', // removed on Jan 5, 2018
    'JSON',
    'Math',
    'Reflect',

    // *** Annex B

    'escape',
    'unescape'

    // *** ECMA-402

    // 'Intl'  // Unstable

    // *** ESNext

    // 'Realm' // Comes from createRealmGlobalObject()
  ];

  const unstableGlobalPropertyNames = [
    'Date',
    'Error',
    'Promise',
    'Proxy',
    'RegExp',
    'Intl'
  ];

  function getSharedGlobalDescs(unsafeGlobal) {
    const descriptors = {};

    function describe(names, writable, enumerable, configurable) {
      for (const name of names) {
        const desc = getOwnPropertyDescriptor(unsafeGlobal, name);
        if (desc) {
          // Abort if an accessor is found on the unsafe global object
          // instead of a data property. We should never get into this
          // non standard situation.
          assert(
            'value' in desc,
            `unexpected accessor on global property: ${name}`
          );

          descriptors[name] = {
            value: desc.value,
            writable,
            enumerable,
            configurable
          };
        }
      }
    }

    describe(frozenGlobalPropertyNames, false, false, false);
    // The following is correct but expensive.
    // describe(stableGlobalPropertyNames, true, false, true);
    // Instead, for now, we let these get optimized.
    //
    // TODO: We should provide an option to turn this optimization off,
    // by feeding "true, false, true" here instead.
    describe(stableGlobalPropertyNames, false, false, false);
    // These we keep replaceable and removable, because we expect
    // others, e.g., SES, may want to do so.
    describe(unstableGlobalPropertyNames, true, false, true);

    return descriptors;
  }

  // Adapted from SES/Caja - Copyright (C) 2011 Google Inc.
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js

  /**
   * Replace the legacy accessors of Object to comply with strict mode
   * and ES2016 semantics, we do this by redefining them while in 'use strict'.
   *
   * todo: list the issues resolved
   *
   * This function can be used in two ways: (1) invoked directly to fix the primal
   * realm's Object.prototype, and (2) converted to a string to be executed
   * inside each new RootRealm to fix their Object.prototypes. Evaluation requires
   * the function to have no dependencies, so don't import anything from
   * the outside.
   */

  // todo: this file should be moved out to a separate repo and npm module.
  function repairAccessors() {
    const {
      defineProperty,
      defineProperties,
      getOwnPropertyDescriptor,
      getPrototypeOf,
      prototype: objectPrototype
    } = Object;

    // On some platforms, the implementation of these functions act as
    // if they are in sloppy mode: if they're invoked badly, they will
    // expose the global object, so we need to repair these for
    // security. Thus it is our responsibility to fix this, and we need
    // to include repairAccessors. E.g. Chrome in 2016.

    try {
      // Verify that the method is not callable.
      // eslint-disable-next-line no-restricted-properties, no-underscore-dangle
      (0, objectPrototype.__lookupGetter__)('x');
    } catch (ignore) {
      // Throws, no need to patch.
      return;
    }

    function toObject(obj) {
      if (obj === undefined || obj === null) {
        throw new TypeError(`can't convert undefined or null to object`);
      }
      return Object(obj);
    }

    function asPropertyName(obj) {
      if (typeof obj === 'symbol') {
        return obj;
      }
      return `${obj}`;
    }

    function aFunction(obj, accessor) {
      if (typeof obj !== 'function') {
        throw TypeError(`invalid ${accessor} usage`);
      }
      return obj;
    }

    defineProperties(objectPrototype, {
      __defineGetter__: {
        value: function __defineGetter__(prop, func) {
          const O = toObject(this);
          defineProperty(O, prop, {
            get: aFunction(func, 'getter'),
            enumerable: true,
            configurable: true
          });
        }
      },
      __defineSetter__: {
        value: function __defineSetter__(prop, func) {
          const O = toObject(this);
          defineProperty(O, prop, {
            set: aFunction(func, 'setter'),
            enumerable: true,
            configurable: true
          });
        }
      },
      __lookupGetter__: {
        value: function __lookupGetter__(prop) {
          let O = toObject(this);
          prop = asPropertyName(prop);
          let desc;
          while (O && !(desc = getOwnPropertyDescriptor(O, prop))) {
            O = getPrototypeOf(O);
          }
          return desc && desc.get;
        }
      },
      __lookupSetter__: {
        value: function __lookupSetter__(prop) {
          let O = toObject(this);
          prop = asPropertyName(prop);
          let desc;
          while (O && !(desc = getOwnPropertyDescriptor(O, prop))) {
            O = getPrototypeOf(O);
          }
          return desc && desc.set;
        }
      }
    });
  }

  // Adapted from SES/Caja
  // Copyright (C) 2011 Google Inc.
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js

  /**
   * This block replaces the original Function constructor, and the original
   * %GeneratorFunction% %AsyncFunction% and %AsyncGeneratorFunction%, with
   * safe replacements that throw if invoked.
   *
   * These are all reachable via syntax, so it isn't sufficient to just
   * replace global properties with safe versions. Our main goal is to prevent
   * access to the Function constructor through these starting points.

   * After this block is done, the originals must no longer be reachable, unless
   * a copy has been made, and funtions can only be created by syntax (using eval)
   * or by invoking a previously saved reference to the originals.
   */

  // todo: this file should be moved out to a separate repo and npm module.
  function repairFunctions() {
    const { defineProperties, getPrototypeOf, setPrototypeOf } = Object;

    /**
     * The process to repair constructors:
     * 1. Create an instance of the function by evaluating syntax
     * 2. Obtain the prototype from the instance
     * 3. Create a substitute tamed constructor
     * 4. Replace the original constructor with the tamed constructor
     * 5. Replace tamed constructor prototype property with the original one
     * 6. Replace its [[Prototype]] slot with the tamed constructor of Function
     */
    function repairFunction(name, declaration) {
      let FunctionInstance;
      try {
        // eslint-disable-next-line no-new-func
        FunctionInstance = (0, eval)(declaration);
      } catch (e) {
        if (e instanceof SyntaxError) {
          // Prevent failure on platforms where async and/or generators
          // are not supported.
          return;
        }
        // Re-throw
        throw e;
      }
      const FunctionPrototype = getPrototypeOf(FunctionInstance);

      // Prevents the evaluation of source when calling constructor on the
      // prototype of functions.
      const TamedFunction = function() {
        throw new TypeError('Not available');
      };
      defineProperties(TamedFunction, { name: { value: name } });

      // (new Error()).constructors does not inherit from Function, because Error
      // was defined before ES6 classes. So we don't need to repair it too.

      // (Error()).constructor inherit from Function, which gets a tamed
      // constructor here.

      // todo: in an ES6 class that does not inherit from anything, what does its
      // constructor inherit from? We worry that it inherits from Function, in
      // which case instances could give access to unsafeFunction. markm says
      // we're fine: the constructor inherits from Object.prototype

      // This line replaces the original constructor in the prototype chain
      // with the tamed one. No copy of the original is peserved.
      defineProperties(FunctionPrototype, {
        constructor: { value: TamedFunction }
      });

      // This line sets the tamed constructor's prototype data property to
      // the original one.
      defineProperties(TamedFunction, {
        prototype: { value: FunctionPrototype }
      });

      if (TamedFunction !== Function.prototype.constructor) {
        // Ensures that all functions meet "instanceof Function" in a realm.
        setPrototypeOf(TamedFunction, Function.prototype.constructor);
      }
    }

    // Here, the order of operation is important: Function needs to be repaired
    // first since the other repaired constructors need to inherit from the tamed
    // Function function constructor.

    // note: this really wants to be part of the standard, because new
    // constructors may be added in the future, reachable from syntax, and this
    // list must be updated to match.

    // "plain arrow functions" inherit from Function.prototype

    repairFunction('Function', '(function(){})');
    repairFunction('GeneratorFunction', '(function*(){})');
    repairFunction('AsyncFunction', '(async function(){})');
    repairFunction('AsyncGeneratorFunction', '(async function*(){})');
  }

  // this module must never be importable outside the Realm shim itself

  // A "context" is a fresh unsafe Realm as given to us by existing platforms.
  // We need this to implement the shim. However, when Realms land for real,
  // this feature will be provided by the underlying engine instead.

  // note: in a node module, the top-level 'this' is not the global object
  // (it's *something* but we aren't sure what), however an indirect eval of
  // 'this' will be the correct global object.

  const unsafeGlobalSrc = "'use strict'; this";
  const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;

  // This method is only exported for testing purposes.
  function createNewUnsafeGlobalForNode() {
    // Note that webpack and others will shim 'vm' including the method
    // 'runInNewContext', so the presence of vm is not a useful check

    // TODO: Find a better test that works with bundlers
    // eslint-disable-next-line no-new-func
    const isNode = new Function(
      'try {return this===global}catch(e){return false}'
    )();

    if (!isNode) {
      return undefined;
    }

    // eslint-disable-next-line global-require
    const vm = __webpack_require__(57);

    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const unsafeGlobal = vm.runInNewContext(unsafeGlobalEvalSrc);

    return unsafeGlobal;
  }

  // This method is only exported for testing purposes.
  function createNewUnsafeGlobalForBrowser() {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';

    document.body.appendChild(iframe);
    const unsafeGlobal = iframe.contentWindow.eval(unsafeGlobalSrc);

    // We keep the iframe attached to the DOM because removing it
    // causes its global object to lose intrinsics, its eval()
    // function to evaluate code, etc.

    // TODO: can we remove and garbage-collect the iframes?

    return unsafeGlobal;
  }

  const getNewUnsafeGlobal = () => {
    const newUnsafeGlobalForBrowser = createNewUnsafeGlobalForBrowser();
    const newUnsafeGlobalForNode = createNewUnsafeGlobalForNode();
    if (
      (!newUnsafeGlobalForBrowser && !newUnsafeGlobalForNode) ||
      (newUnsafeGlobalForBrowser && newUnsafeGlobalForNode)
    ) {
      throw new Error('unexpected platform, unable to create Realm');
    }
    return newUnsafeGlobalForBrowser || newUnsafeGlobalForNode;
  };

  // The unsafeRec is shim-specific. It acts as the mechanism to obtain a fresh
  // set of intrinsics together with their associated eval and Function
  // evaluators. These must be used as a matched set, since the evaluators are
  // tied to a set of intrinsics, aka the "undeniables". If it were possible to
  // mix-and-match them from different contexts, that would enable some
  // attacks.
  function createUnsafeRec(unsafeGlobal, allShims = []) {
    const sharedGlobalDescs = getSharedGlobalDescs(unsafeGlobal);

    const unsafeEval = unsafeGlobal.eval;
    const unsafeFunction = unsafeGlobal.Function;
    const callAndWrapError = unsafeEval(buildCallAndWrapErrorString)();

    return freeze({
      unsafeGlobal,
      sharedGlobalDescs,
      unsafeEval,
      unsafeFunction,
      callAndWrapError,
      allShims
    });
  }

  const repairAccessorsString = safeStringifyFunction(repairAccessors);
  const repairFunctionsString = safeStringifyFunction(repairFunctions);

  // Create a new unsafeRec from a brand new context, with new intrinsics and a
  // new global object
  function createNewUnsafeRec(allShims) {
    const unsafeGlobal = getNewUnsafeGlobal();
    const unsafeRec = createUnsafeRec(unsafeGlobal, allShims);
    const { unsafeEval } = unsafeRec;
    unsafeEval(repairAccessorsString)();
    unsafeEval(repairFunctionsString)();
    return unsafeRec;
  }

  // Create a new unsafeRec from the current context, where the Realm shim is
  // being parsed and executed, aka the "Primal Realm"
  function createCurrentUnsafeRec() {
    const unsafeEval = eval;
    const unsafeGlobal = unsafeEval(unsafeGlobalSrc);
    repairAccessors();
    repairFunctions();
    return createUnsafeRec(unsafeGlobal);
  }

  // todo: think about how this interacts with endowments, check for conflicts
  // between the names being optimized and the ones added by endowments

  /**
   * Simplified validation of indentifier names: may only contain alphanumeric
   * characters (or "$" or "_"), and may not start with a digit. This is safe
   * and does not reduces the compatibility of the shim. The motivation for
   * this limitation was to decrease the complexity of the implementation,
   * and to maintain a resonable level of performance.
   * Note: \w is equivalent [a-zA-Z_0-9]
   * See 11.6.1 Identifier Names
   */
  const identifierPattern = /^[a-zA-Z_$][\w$]*$/;

  /**
   * In JavaScript you cannot use these reserved words as variables.
   * See 11.6.1 Identifier Names
   */
  const keywords = new Set([
    // 11.6.2.1 Keywords
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',

    // Also reserved when parsing strict mode code
    'let',
    'static',

    // 11.6.2.2 Future Reserved Words
    'enum',

    // Also reserved when parsing strict mode code
    'implements',
    'package',
    'protected',
    'interface',
    'private',
    'public',

    // Reserved but not mentioned in specs
    'await',

    'null',
    'true',
    'false',

    'this',
    'arguments'
  ]);

  /**
   * getOptimizableGlobals()
   * What variable names might it bring into scope? These include all
   * property names which can be variable names, including the names
   * of inherited properties. It excludes symbols and names which are
   * keywords. We drop symbols safely. Currently, this shim refuses
   * service if any of the names are keywords or keyword-like. This is
   * safe and only prevent performance optimization.
   */
  function getOptimizableGlobals(globalObject, localObject = {}) {
    const globalNames = getOwnPropertyNames(globalObject);
    // getOwnPropertyNames does ignore Symbols so we don't need this extra check:
    // typeof name === 'string' &&
    const constants = arrayFilter(globalNames, name => {
      // Exclude globals that will be hidden behind an object positioned
      // closer in the resolution scope chain, typically the endowments.
      if (name in localObject) {
        return false;
      }

      // Ensure we have a valid identifier. We use regexpTest rather than
      // /../.test() to guard against the case where RegExp has been poisoned.
      if (
        name === 'eval' ||
        keywords.has(name) ||
        !regexpTest(identifierPattern, name)
      ) {
        return false;
      }

      const desc = getOwnPropertyDescriptor(globalObject, name);
      return (
        //
        // The getters will not have .writable, don't let the falsyness of
        // 'undefined' trick us: test with === false, not ! . However descriptors
        // inherit from the (potentially poisoned) global object, so we might see
        // extra properties which weren't really there. Accessor properties have
        // 'get/set/enumerable/configurable', while data properties have
        // 'value/writable/enumerable/configurable'.
        desc.configurable === false &&
        desc.writable === false &&
        //
        // Checks for data properties because they're the only ones we can
        // optimize (accessors are most likely non-constant). Descriptors can't
        // can't have accessors and value properties at the same time, therefore
        // this check is sufficient. Using explicit own property deal with the
        // case where Object.prototype has been poisoned.
        objectHasOwnProperty(desc, 'value')
      );
    });

    return constants;
  }

  /**
   * ScopeHandler manages a Proxy which serves as the global scope for the
   * safeEvaluator operation (the Proxy is the argument of a 'with' binding).
   * As described in createSafeEvaluator(), it has several functions:
   * - allow the very first (and only the very first) use of 'eval' to map to
   *   the real (unsafe) eval function, so it acts as a 'direct eval' and can
   *    access its lexical scope (which maps to the 'with' binding, which the
   *   ScopeHandler also controls).
   * - ensure that all subsequent uses of 'eval' map to the safeEvaluator,
   *   which lives as the 'eval' property of the safeGlobal.
   * - route all other property lookups at the safeGlobal.
   * - hide the unsafeGlobal which lives on the scope chain above the 'with'.
   * - ensure the Proxy invariants despite some global properties being frozen.
   *
   * @returns {ProxyHandler<any> & Record<string, any>}
   */
  function buildScopeHandler(
    unsafeRec,
    safeGlobal,
    endowments = {},
    sloppyGlobals = false
  ) {
    const { unsafeGlobal, unsafeEval } = unsafeRec;

    const { freeze, getOwnPropertyDescriptor } = Object;
    const { get: reflectGet, set: reflectSet } = Reflect;

    /**
     * alwaysThrowHandler is a proxy handler which throws on any trap called.
     * It's made from a proxy with a get trap that throws. Its target is
     * an immutable (frozen) object and is safe to share, except accross realms
     */
    const alwaysThrowHandler = new Proxy(freeze({}), {
      get(target, prop) {
        // todo: replace with throwTantrum
        throw new TypeError(
          `unexpected scope handler trap called: ${String(prop)}`
        );
      }
    });

    return {
      // The scope handler throws if any trap other than get/set/has are run
      // (e.g. getOwnPropertyDescriptors, apply, getPrototypeOf).
      // eslint-disable-next-line no-proto
      __proto__: alwaysThrowHandler,

      // This flag allow us to determine if the eval() call is an done by the
      // realm's code or if it is user-land invocation, so we can react differently.
      // We use a property and not an accessor to avoid increasing the stack trace
      // and reduce the possibility of OOM.
      useUnsafeEvaluator: false,

      get(shadow, prop) {
        if (typeof prop === 'symbol') {
          // Safe to return a primal realm Object here because the only code that
          // can do a get() on a non-string is the internals of with() itself,
          // and the only thing it does is to look for properties on it. User
          // code cannot do a lookup on non-strings.
          return undefined;
        }

        // Special treatment for eval. The very first lookup of 'eval' gets the
        // unsafe (real direct) eval, so it will get the lexical scope that uses
        // the 'with' context.
        if (prop === 'eval') {
          // test that it is true rather than merely truthy
          if (this.useUnsafeEvaluator === true) {
            // revoke before use
            this.useUnsafeEvaluator = false;
            return unsafeEval;
          }
          // fall through
        }

        // Properties of the endowments.
        if (prop in endowments) {
          // Ensure that the 'this' value on getters resolves
          // to the safeGlobal, not to the endowments object.
          return reflectGet(endowments, prop, safeGlobal);
        }

        // Properties of the global.
        return reflectGet(safeGlobal, prop);
      },

      // eslint-disable-next-line class-methods-use-this
      set(shadow, prop, value) {
        // Properties of the endowments.
        if (prop in endowments) {
          const desc = getOwnPropertyDescriptor(endowments, prop);
          if ('value' in desc) {
            // Work around a peculiar behavior in the specs, where
            // value properties are defined on the receiver.
            return reflectSet(endowments, prop, value);
          }
          // Ensure that the 'this' value on setters resolves
          // to the safeGlobal, not to the endowments object.
          return reflectSet(endowments, prop, value, safeGlobal);
        }

        // Properties of the global.
        return reflectSet(safeGlobal, prop, value);
      },

      // we need has() to return false for some names to prevent the lookup  from
      // climbing the scope chain and eventually reaching the unsafeGlobal
      // object, which is bad.

      // note: unscopables! every string in Object[Symbol.unscopables]

      // todo: we'd like to just have has() return true for everything, and then
      // use get() to raise a ReferenceError for anything not on the safe global.
      // But we want to be compatible with ReferenceError in the normal case and
      // the lack of ReferenceError in the 'typeof' case. Must either reliably
      // distinguish these two cases (the trap behavior might be different), or
      // we rely on a mandatory source-to-source transform to change 'typeof abc'
      // to XXX. We already need a mandatory parse to prevent the 'import',
      // since it's a special form instead of merely being a global variable/

      // note: if we make has() return true always, then we must implement a
      // set() trap to avoid subverting the protection of strict mode (it would
      // accept assignments to undefined globals, when it ought to throw
      // ReferenceError for such assignments)

      has(shadow, prop) {
        // proxies stringify 'prop', so no TOCTTOU danger here

        if (sloppyGlobals) {
          // Everything is potentially available.
          return true;
        }

        // unsafeGlobal: hide all properties of unsafeGlobal at the
        // expense of 'typeof' being wrong for those properties. For
        // example, in the browser, evaluating 'document = 3', will add
        // a property to safeGlobal instead of throwing a
        // ReferenceError.
        if (
          prop === 'eval' ||
          prop in endowments ||
          prop in safeGlobal ||
          prop in unsafeGlobal
        ) {
          return true;
        }

        return false;
      },

      // note: this is likely a bug of safari
      // https://bugs.webkit.org/show_bug.cgi?id=195534

      getPrototypeOf() {
        return null;
      }
    };
  }

  const buildScopeHandlerString = safeStringifyFunction(buildScopeHandler);

  function buildSafeEval(unsafeRec, safeEvalOperation) {
    const { callAndWrapError } = unsafeRec;

    const { defineProperties } = Object;

    // We use the the concise method syntax to create an eval without a
    // [[Construct]] behavior (such that the invocation "new eval()" throws
    // TypeError: eval is not a constructor"), but which still accepts a
    // 'this' binding.
    const safeEval = {
      eval() {
        return callAndWrapError(safeEvalOperation, arguments);
      }
    }.eval;

    // safeEval's prototype RootRealm's value and instanceof Function
    // is true inside the realm. It doesn't point at the primal realm
    // value, and there is no defense against leaking primal realm
    // intrinsics.

    defineProperties(safeEval, {
      toString: {
        // We break up the following literal string so that an
        // apparent direct eval syntax does not appear in this
        // file. Thus, we avoid rejection by the overly eager
        // rejectDangerousSources.
        value: () => `function ${'eval'}() { [shim code] }`,
        writable: false,
        enumerable: false,
        configurable: true
      }
    });

    return safeEval;
  }
  const buildSafeEvalString = safeStringifyFunction(buildSafeEval);

  function buildSafeFunction(unsafeRec, safeFunctionOperation) {
    const { callAndWrapError, unsafeFunction } = unsafeRec;

    const { defineProperties } = Object;

    const safeFunction = function Function() {
      return callAndWrapError(safeFunctionOperation, arguments);
    };

    // Ensure that Function from any compartment in a root realm can be used
    // with instance checks in any compartment of the same root realm.

    defineProperties(safeFunction, {
      // Ensure that any function created in any compartment in a root realm is an
      // instance of Function in any compartment of the same root ralm.
      prototype: { value: unsafeFunction.prototype },

      // Provide a custom output without overwriting the
      // Function.prototype.toString which is called by some third-party
      // libraries.
      toString: {
        value: () => 'function Function() { [shim code] }',
        writable: false,
        enumerable: false,
        configurable: true
      }
    });

    return safeFunction;
  }
  const buildSafeFunctionString = safeStringifyFunction(buildSafeFunction);

  function applyTransforms(rewriterState, transforms) {
    const { create, getOwnPropertyDescriptors } = Object;
    const { apply } = Reflect;
    const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);
    const arrayReduce = uncurryThis(Array.prototype.reduce);

    // Clone before calling transforms.
    rewriterState = {
      src: `${rewriterState.src}`,
      endowments: create(
        null,
        getOwnPropertyDescriptors(rewriterState.endowments)
      )
    };

    // Rewrite the source, threading through rewriter state as necessary.
    rewriterState = arrayReduce(
      transforms,
      (rs, transform) => (transform.rewrite ? transform.rewrite(rs) : rs),
      rewriterState
    );

    // Clone after transforms
    rewriterState = {
      src: `${rewriterState.src}`,
      endowments: create(
        null,
        getOwnPropertyDescriptors(rewriterState.endowments)
      )
    };

    return rewriterState;
  }

  const applyTransformsString = safeStringifyFunction(applyTransforms);

  // https://www.ecma-international.org/ecma-262/9.0/index.html#sec-html-like-comments
  // explains that JavaScript parsers may or may not recognize html
  // comment tokens "<" immediately followed by "!--" and "--"
  // immediately followed by ">" in non-module source text, and treat
  // them as a kind of line comment. Since otherwise both of these can
  // appear in normal JavaScript source code as a sequence of operators,
  // we have the terrifying possibility of the same source code parsing
  // one way on one correct JavaScript implementation, and another way
  // on another.
  //
  // This shim takes the conservative strategy of just rejecting source
  // text that contains these strings anywhere. Note that this very
  // source file is written strangely to avoid mentioning these
  // character strings explicitly.

  // We do not write the regexp in a straightforward way, so that an
  // apparennt html comment does not appear in this file. Thus, we avoid
  // rejection by the overly eager rejectDangerousSources.
  const htmlCommentPattern = new RegExp(`(?:${'<'}!--|--${'>'})`);

  function rejectHtmlComments(s) {
    const index = s.search(htmlCommentPattern);
    if (index !== -1) {
      const linenum = s.slice(0, index).split('\n').length; // more or less
      throw new SyntaxError(
        `possible html comment syntax rejected around line ${linenum}`
      );
    }
  }

  // The proposed dynamic import expression is the only syntax currently
  // proposed, that can appear in non-module JavaScript code, that
  // enables direct access to the outside world that cannot be
  // surpressed or intercepted without parsing and rewriting. Instead,
  // this shim conservatively rejects any source text that seems to
  // contain such an expression. To do this safely without parsing, we
  // must also reject some valid programs, i.e., those containing
  // apparent import expressions in literal strings or comments.

  // The current conservative rule looks for the identifier "import"
  // followed by either an open paren or something that looks like the
  // beginning of a comment. We assume that we do not need to worry
  // about html comment syntax because that was already rejected by
  // rejectHtmlComments.

  // this \s *must* match all kinds of syntax-defined whitespace. If e.g.
  // U+2028 (LINE SEPARATOR) or U+2029 (PARAGRAPH SEPARATOR) is treated as
  // whitespace by the parser, but not matched by /\s/, then this would admit
  // an attack like: import\u2028('power.js') . We're trying to distinguish
  // something like that from something like importnotreally('power.js') which
  // is perfectly safe.

  const importPattern = /\bimport\s*(?:\(|\/[/*])/;

  function rejectImportExpressions(s) {
    const index = s.search(importPattern);
    if (index !== -1) {
      const linenum = s.slice(0, index).split('\n').length; // more or less
      throw new SyntaxError(
        `possible import expression rejected around line ${linenum}`
      );
    }
  }

  // The shim cannot correctly emulate a direct eval as explained at
  // https://github.com/Agoric/realms-shim/issues/12
  // Without rejecting apparent direct eval syntax, we would
  // accidentally evaluate these with an emulation of indirect eval. Tp
  // prevent future compatibility problems, in shifting from use of the
  // shim to genuine platform support for the proposal, we should
  // instead statically reject code that seems to contain a direct eval
  // expression.
  //
  // As with the dynamic import expression, to avoid a full parse, we do
  // this approximately with a regexp, that will also reject strings
  // that appear safely in comments or strings. Unlike dynamic import,
  // if we miss some, this only creates future compat problems, not
  // security problems. Thus, we are only trying to catch innocent
  // occurrences, not malicious one. In particular, `(eval)(...)` is
  // direct eval syntax that would not be caught by the following regexp.

  const someDirectEvalPattern = /\beval\s*(?:\(|\/[/*])/;

  function rejectSomeDirectEvalExpressions(s) {
    const index = s.search(someDirectEvalPattern);
    if (index !== -1) {
      const linenum = s.slice(0, index).split('\n').length; // more or less
      throw new SyntaxError(
        `possible direct eval expression rejected around line ${linenum}`
      );
    }
  }

  function rejectDangerousSources(s) {
    rejectHtmlComments(s);
    rejectImportExpressions(s);
    rejectSomeDirectEvalExpressions(s);
  }

  // Export a rewriter transform.
  const rejectDangerousSourcesTransform = {
    rewrite(rs) {
      rejectDangerousSources(rs.src);
      return rs;
    }
  };

  // Portions adapted from V8 - Copyright 2016 the V8 project authors.

  function buildOptimizer(constants) {
    // No need to build an oprimizer when there are no constants.
    if (constants.length === 0) return '';
    // Use 'this' to avoid going through the scope proxy, which is unecessary
    // since the optimizer only needs references to the safe global.
    return `const {${arrayJoin(constants, ',')}} = this;`;
  }

  function createScopedEvaluatorFactory(unsafeRec, constants, useStrict = true) {
    const { unsafeFunction } = unsafeRec;

    const optimizer = buildOptimizer(constants);

    // Create a function in sloppy mode, so that we can use 'with'. It returns
    // a function in strict mode that evaluates the provided code using direct
    // eval, and thus in strict mode in the same scope. We must be very careful
    // to not create new names in this scope

    // 1: we use 'with' (around a Proxy) to catch all free variable names. The
    // first 'arguments[0]' holds the Proxy which safely wraps the safeGlobal
    // 2: 'optimizer' catches common variable names for speed
    // 3: The inner strict function is effectively passed two parameters:
    //    a) its arguments[0] is the source to be directly evaluated.
    //    b) its 'this' is the this binding seen by the code being
    //       directly evaluated.

    // everything in the 'optimizer' string is looked up in the proxy
    // (including an 'arguments[0]', which points at the Proxy). 'function' is
    // a keyword, not a variable, so it is not looked up. then 'eval' is looked
    // up in the proxy, that's the first time it is looked up after
    // useUnsafeEvaluator is turned on, so the proxy returns the real the
    // unsafeEval, which satisfies the IsDirectEvalTrap predicate, so it uses
    // the direct eval and gets the lexical scope. The second 'arguments[0]' is
    // looked up in the context of the inner function. The *contents* of
    // arguments[0], because we're using direct eval, are looked up in the
    // Proxy, by which point the useUnsafeEvaluator switch has been flipped
    // back to 'false', so any instances of 'eval' in that string will get the
    // safe evaluator.

    return unsafeFunction(`
    with (arguments[0]) {
      ${optimizer}
      return function() {
        ${useStrict ? "'use strict';" : ''}
        return eval(arguments[0]);
      };
    }
  `);
  }

  function createSafeEvaluatorFactory(
    unsafeRec,
    safeGlobal,
    transforms,
    sloppyGlobals
  ) {
    const { unsafeEval } = unsafeRec;
    const applyTransforms = unsafeEval(applyTransformsString);

    function factory(endowments = {}, options = {}) {
      // todo clone all arguments passed to returned function
      const localTransforms = options.transforms || [];
      const realmTransforms = transforms || [];

      const mandatoryTransforms = [rejectDangerousSourcesTransform];
      const allTransforms = arrayConcat(
        localTransforms,
        realmTransforms,
        mandatoryTransforms
      );

      function safeEvalOperation(src) {
        let rewriterState = { src, endowments };
        rewriterState = applyTransforms(rewriterState, allTransforms);

        // Combine all optimizable globals.
        const globalConstants = getOptimizableGlobals(
          safeGlobal,
          rewriterState.endowments
        );
        const localConstants = getOptimizableGlobals(rewriterState.endowments);
        const constants = arrayConcat(globalConstants, localConstants);

        // Run requires the with-wrapping trick to inject dependencies after code
        // has already been evaluated. Because "with" only works when not in strict
        // mode, and Run re-enables strict mode anyway, we can safely disable it
        // in the realm shim when we encounter Run's very particular script.
        //
        // It would be "better code" to do this as an option that we pass in to
        // evaluate(). However, that would require more changes, and make it harder
        // to back-merge upstream changes. It is very important to make back-merges
        // easy because SES is an important part of Run's security.
        const disableStrictMode = src.startsWith("with($globals){'use strict';");

        const scopedEvaluatorFactory = createScopedEvaluatorFactory(
          unsafeRec,
          constants,
          !disableStrictMode
        );

        const scopeHandler = unsafeEval(buildScopeHandlerString)(
          unsafeRec,
          safeGlobal,
          rewriterState.endowments,
          sloppyGlobals
        );
        const scopeProxyRevocable = Proxy.revocable({}, scopeHandler);
        const scopeProxy = scopeProxyRevocable.proxy;
        const scopedEvaluator = apply(scopedEvaluatorFactory, safeGlobal, [
          scopeProxy
        ]);

        scopeHandler.useUnsafeEvaluator = true;
        let err;
        try {
          // Ensure that "this" resolves to the safe global.
          return apply(scopedEvaluator, safeGlobal, [rewriterState.src]);
        } catch (e) {
          // stash the child-code error in hopes of debugging the internal failure
          err = e;
          throw e;
        } finally {
          if (scopeHandler.useUnsafeEvaluator) {
            // the proxy switches this off immediately after ths
            // first access, but if that's not the case we prevent
            // further variable resolution on the scope and abort.
            scopeProxyRevocable.revoke();
            throwTantrum('handler did not revoke useUnsafeEvaluator', err);
          }
        }
      }

      return safeEvalOperation;
    }

    return factory;
  }

  function createSafeEvaluator(unsafeRec, safeEvalOperation) {
    const { unsafeEval, unsafeFunction } = unsafeRec;

    const safeEval = unsafeEval(buildSafeEvalString)(
      unsafeRec,
      safeEvalOperation
    );

    assert(getPrototypeOf(safeEval).constructor !== Function, 'hide Function');
    assert(
      getPrototypeOf(safeEval).constructor !== unsafeFunction,
      'hide unsafeFunction'
    );

    return safeEval;
  }

  function createSafeEvaluatorWhichTakesEndowments(safeEvaluatorFactory) {
    return (x, endowments, options = {}) =>
      safeEvaluatorFactory(endowments, options)(x);
  }

  /**
   * A safe version of the native Function which relies on
   * the safety of evalEvaluator for confinement.
   */
  function createFunctionEvaluator(unsafeRec, safeEvalOperation) {
    const { unsafeGlobal, unsafeEval, unsafeFunction } = unsafeRec;

    function safeFunctionOperation(...params) {
      const functionBody = `${arrayPop(params) || ''}`;
      let functionParams = `${arrayJoin(params, ',')}`;
      if (!regexpTest(/^[\w\s,]*$/, functionParams)) {
        throw new SyntaxError(
          'shim limitation: Function arg must be simple ASCII identifiers, possibly separated by commas: no default values, pattern matches, or non-ASCII parameter names'
        );
        // this protects against Matt Austin's clever attack:
        // Function("arg=`", "/*body`){});({x: this/**/")
        // which would turn into
        //     (function(arg=`
        //     /*``*/){
        //      /*body`){});({x: this/**/
        //     })
        // which parses as a default argument of `\n/*``*/){\n/*body` , which
        // is a pair of template literals back-to-back (so the first one
        // nominally evaluates to the parser to use on the second one), which
        // can't actually execute (because the first literal evals to a string,
        // which can't be a parser function), but that doesn't matter because
        // the function is bypassed entirely. When that gets evaluated, it
        // defines (but does not invoke) a function, then evaluates a simple
        // {x: this} expression, giving access to the safe global.
      }

      // Is this a real functionBody, or is someone attempting an injection
      // attack? This will throw a SyntaxError if the string is not actually a
      // function body. We coerce the body into a real string above to prevent
      // someone from passing an object with a toString() that returns a safe
      // string the first time, but an evil string the second time.
      // eslint-disable-next-line no-new, new-cap
      new unsafeFunction(functionBody);

      if (stringIncludes(functionParams, ')')) {
        // If the formal parameters string include ) - an illegal
        // character - it may make the combined function expression
        // compile. We avoid this problem by checking for this early on.

        // note: v8 throws just like this does, but chrome accepts
        // e.g. 'a = new Date()'
        throw new unsafeGlobal.SyntaxError(
          'shim limitation: Function arg string contains parenthesis'
        );
        // todo: shim integrity threat if they change SyntaxError
      }

      // todo: check to make sure this .length is safe. markm says safe.
      if (functionParams.length > 0) {
        // If the formal parameters include an unbalanced block comment, the
        // function must be rejected. Since JavaScript does not allow nested
        // comments we can include a trailing block comment to catch this.
        functionParams += '\n/*``*/';
      }

      const src = `(function(${functionParams}){\n${functionBody}\n})`;

      return safeEvalOperation(src);
    }

    const safeFunction = unsafeEval(buildSafeFunctionString)(
      unsafeRec,
      safeFunctionOperation
    );

    assert(
      getPrototypeOf(safeFunction).constructor !== Function,
      'hide Function'
    );
    assert(
      getPrototypeOf(safeFunction).constructor !== unsafeFunction,
      'hide unsafeFunction'
    );

    return safeFunction;
  }

  // Mimic private members on the realm instances.
  // We define it in the same module and do not export it.
  const RealmRecForRealmInstance = new WeakMap();

  function getRealmRecForRealmInstance(realm) {
    // Detect non-objects.
    assert(Object(realm) === realm, 'bad object, not a Realm instance');
    // Realm instance has no realmRec. Should not proceed.
    assert(RealmRecForRealmInstance.has(realm), 'Realm instance has no record');

    return RealmRecForRealmInstance.get(realm);
  }

  function registerRealmRecForRealmInstance(realm, realmRec) {
    // Detect non-objects.
    assert(Object(realm) === realm, 'bad object, not a Realm instance');
    // Attempt to change an existing realmRec on a realm instance. Should not proceed.
    assert(
      !RealmRecForRealmInstance.has(realm),
      'Realm instance already has a record'
    );

    RealmRecForRealmInstance.set(realm, realmRec);
  }

  // Initialize the global variables for the new Realm.
  function setDefaultBindings(safeGlobal, safeEval, safeFunction) {
    defineProperties(safeGlobal, {
      eval: {
        value: safeEval,
        writable: true,
        configurable: true
      },
      Function: {
        value: safeFunction,
        writable: true,
        configurable: true
      }
    });
  }

  function createRealmRec(unsafeRec, transforms, sloppyGlobals) {
    const { sharedGlobalDescs, unsafeGlobal } = unsafeRec;

    const safeGlobal = create(unsafeGlobal.Object.prototype, sharedGlobalDescs);

    const safeEvaluatorFactory = createSafeEvaluatorFactory(
      unsafeRec,
      safeGlobal,
      transforms,
      sloppyGlobals
    );
    const safeEvalOperation = safeEvaluatorFactory();
    const safeEval = createSafeEvaluator(unsafeRec, safeEvalOperation);
    const safeFunction = createFunctionEvaluator(unsafeRec, safeEvalOperation);
    const safeEvalWhichTakesEndowments = createSafeEvaluatorWhichTakesEndowments(
      safeEvaluatorFactory
    );

    setDefaultBindings(safeGlobal, safeEval, safeFunction);

    const realmRec = freeze({
      safeGlobal,
      safeEval,
      safeEvalWhichTakesEndowments,
      safeFunction
    });

    return realmRec;
  }

  /**
   * A root realm uses a fresh set of new intrinics. Here we first create
   * a new unsafe record, which inherits the shims. Then we proceed with
   * the creation of the realm record, and we apply the shims.
   */
  function initRootRealm(parentUnsafeRec, self, options) {
    // note: 'self' is the instance of the Realm.

    // todo: investigate attacks via Array.species
    // todo: this accepts newShims='string', but it should reject that
    const { shims: newShims, transforms, sloppyGlobals } = options;
    const allShims = arrayConcat(parentUnsafeRec.allShims, newShims);

    // The unsafe record is created already repaired.
    const unsafeRec = createNewUnsafeRec(allShims);
    const { unsafeEval } = unsafeRec;

    const Realm = unsafeEval(buildChildRealmString)(
      unsafeRec,
      // eslint-disable-next-line no-use-before-define
      BaseRealm
    );

    // Add a Realm descriptor to sharedGlobalDescs, so it can be defined onto the
    // safeGlobal like the rest of the globals.
    unsafeRec.sharedGlobalDescs.Realm = {
      value: Realm,
      writable: true,
      configurable: true
    };

    // Creating the realmRec provides the global object, eval() and Function()
    // to the realm.
    const realmRec = createRealmRec(unsafeRec, transforms, sloppyGlobals);

    // Apply all shims in the new RootRealm. We don't do this for compartments.
    const { safeEvalWhichTakesEndowments } = realmRec;
    for (const shim of allShims) {
      safeEvalWhichTakesEndowments(shim);
    }

    // The realmRec acts as a private field on the realm instance.
    registerRealmRecForRealmInstance(self, realmRec);
  }

  /**
   * A compartment shares the intrinsics of its root realm. Here, only a
   * realmRec is necessary to hold the global object, eval() and Function().
   */
  function initCompartment(unsafeRec, self, options = {}) {
    // note: 'self' is the instance of the Realm.

    const { transforms, sloppyGlobals } = options;
    const realmRec = createRealmRec(unsafeRec, transforms, sloppyGlobals);

    // The realmRec acts as a private field on the realm instance.
    registerRealmRecForRealmInstance(self, realmRec);
  }

  function getRealmGlobal(self) {
    const { safeGlobal } = getRealmRecForRealmInstance(self);
    return safeGlobal;
  }

  function realmEvaluate(self, x, endowments = {}, options = {}) {
    // todo: don't pass in primal-realm objects like {}, for safety. OTOH its
    // properties are copied onto the new global 'target'.
    // todo: figure out a way to membrane away the contents to safety.
    const { safeEvalWhichTakesEndowments } = getRealmRecForRealmInstance(self);
    return safeEvalWhichTakesEndowments(x, endowments, options);
  }

  const BaseRealm = {
    initRootRealm,
    initCompartment,
    getRealmGlobal,
    realmEvaluate
  };

  // Create the current unsafeRec from the current "primal" environment (the realm
  // where the Realm shim is loaded and executed).
  const currentUnsafeRec = createCurrentUnsafeRec();

  /**
   * The "primal" realm class is defined in the current "primal" environment,
   * and is part of the shim. There is no need to facade this class via evaluation
   * because both share the same intrinsics.
   */
  const Realm = buildChildRealm(currentUnsafeRec, BaseRealm);

  // Adapted from SES/Caja - Copyright (C) 2011 Google Inc.
  // Copyright (C) 2018 Agoric

  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  // http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  // based upon:
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js
  // then copied from proposal-frozen-realms deep-freeze.js
  // then copied from SES/src/bundle/deepFreeze.js

  /**
   * @typedef HardenerOptions
   * @type {object}
   * @property {WeakSet=} fringeSet WeakSet to use for the fringeSet
   * @property {Function=} naivePrepareObject Call with object before hardening
   */

  /**
   * Create a `harden` function.
   *
   * @param {Iterable} initialFringe Objects considered already hardened
   * @param {HardenerOptions=} options Options for creation
   */
  function makeHardener(initialFringe, options = {}) {
    const { freeze, getOwnPropertyDescriptors, getPrototypeOf } = Object;
    const { ownKeys } = Reflect;

    // Objects that we won't freeze, either because we've frozen them already,
    // or they were one of the initial roots (terminals). These objects form
    // the "fringe" of the hardened object graph.
    let { fringeSet } = options;
    if (fringeSet) {
      if (
        typeof fringeSet.add !== 'function' ||
        typeof fringeSet.has !== 'function'
      ) {
        throw new TypeError(
          `options.fringeSet must have add() and has() methods`,
        );
      }

      // Populate the supplied fringeSet with our initialFringe.
      if (initialFringe) {
        for (const fringe of initialFringe) {
          fringeSet.add(fringe);
        }
      }
    } else {
      // Use a new empty fringe.
      fringeSet = new WeakSet(initialFringe);
    }

    const naivePrepareObject = options && options.naivePrepareObject;

    function harden(root) {
      const toFreeze = new Set();
      const prototypes = new Map();
      const paths = new WeakMap();

      // If val is something we should be freezing but aren't yet,
      // add it to toFreeze.
      function enqueue(val, path) {
        if (Object(val) !== val) {
          // ignore primitives
          return;
        }
        const type = typeof val;
        if (type !== 'object' && type !== 'function') {
          // future proof: break until someone figures out what it should do
          throw new TypeError(`Unexpected typeof: ${type}`);
        }
        if (fringeSet.has(val) || toFreeze.has(val)) {
          // Ignore if this is an exit, or we've already visited it
          return;
        }
        // console.log(`adding ${val} to toFreeze`, val);
        toFreeze.add(val);
        paths.set(val, path);
      }

      function freezeAndTraverse(obj) {
        // Apply the naive preparer if they specified one.
        if (naivePrepareObject) {
          naivePrepareObject(obj);
        }

        // Now freeze the object to ensure reactive
        // objects such as proxies won't add properties
        // during traversal, before they get frozen.

        // Object are verified before being enqueued,
        // therefore this is a valid candidate.
        // Throws if this fails (strict mode).
        freeze(obj);

        // we rely upon certain commitments of Object.freeze and proxies here

        // get stable/immutable outbound links before a Proxy has a chance to do
        // something sneaky.
        const proto = getPrototypeOf(obj);
        const descs = getOwnPropertyDescriptors(obj);
        const path = paths.get(obj) || 'unknown';

        // console.log(`adding ${proto} to prototypes under ${path}`);
        if (proto !== null && !prototypes.has(proto)) {
          prototypes.set(proto, path);
          paths.set(proto, `${path}.__proto__`);
        }

        ownKeys(descs).forEach(name => {
          const pathname = `${path}.${String(name)}`;
          // todo uncurried form
          // todo: getOwnPropertyDescriptors is guaranteed to return well-formed
          // descriptors, but they still inherit from Object.prototype. If
          // someone has poisoned Object.prototype to add 'value' or 'get'
          // properties, then a simple 'if ("value" in desc)' or 'desc.value'
          // test could be confused. We use hasOwnProperty to be sure about
          // whether 'value' is present or not, which tells us for sure that this
          // is a data property.
          const desc = descs[name];
          if ('value' in desc) {
            // todo uncurried form
            enqueue(desc.value, `${pathname}`);
          } else {
            enqueue(desc.get, `${pathname}(get)`);
            enqueue(desc.set, `${pathname}(set)`);
          }
        });
      }

      function dequeue() {
        // New values added before forEach() has finished will be visited.
        toFreeze.forEach(freezeAndTraverse); // todo curried forEach
      }

      function checkPrototypes() {
        prototypes.forEach((path, p) => {
          if (!(toFreeze.has(p) || fringeSet.has(p))) {
            // all reachable properties have already been frozen by this point
            let msg;
            try {
              msg = `prototype ${p} of ${path} is not already in the fringeSet`;
            } catch (e) {
              // `${(async _=>_).__proto__}` fails in most engines
              msg =
                'a prototype of something is not already in the fringeset (and .toString failed)';
              try {
                console.log(msg);
                console.log('the prototype:', p);
                console.log('of something:', path);
              } catch (_e) {
                // console.log might be missing in restrictive SES realms
              }
            }
            throw new TypeError(msg);
          }
        });
      }

      function commit() {
        // todo curried forEach
        // we capture the real WeakSet.prototype.add above, in case someone
        // changes it. The two-argument form of forEach passes the second
        // argument as the 'this' binding, so we add to the correct set.
        toFreeze.forEach(fringeSet.add, fringeSet);
      }

      enqueue(root);
      dequeue();
      // console.log("fringeSet", fringeSet);
      // console.log("prototype set:", prototypes);
      // console.log("toFreeze set:", toFreeze);
      checkPrototypes();
      commit();

      return root;
    }

    return harden;
  }

  function tameDate() {
    const unsafeDate = Date;
    // Date(anything) gives a string with the current time
    // new Date(x) coerces x into a number and then returns a Date
    // new Date() returns the current time, as a Date object
    // new Date(undefined) returns a Date object which stringifies to 'Invalid Date'

    const newDateConstructor = function Date(...args) {
      if (new.target === undefined) {
        // we were not called as a constructor
        // this would normally return a string with the current time
        return 'Invalid Date';
      }
      // constructor behavior: if we get arguments, we can safely pass them through
      if (args.length > 0) {
        return Reflect.construct(unsafeDate, args, new.target);
        // todo: test that our constructor can still be subclassed
      }
      // no arguments: return a Date object, but invalid
      return Reflect.construct(unsafeDate, [NaN], new.target);
    };

    Object.defineProperties(
      newDateConstructor,
      Object.getOwnPropertyDescriptors(unsafeDate),
    );
    // that will copy the .prototype too, so this next line is unnecessary
    // newDateConstructor.prototype = unsafeDate.prototype;
    unsafeDate.prototype.constructor = newDateConstructor;
    // disable Date.now
    newDateConstructor.now = () => NaN;

    Date = newDateConstructor; // eslint-disable-line no-global-assign
  }

  function tameMath() {
    // Math.random = () => 4; // https://www.xkcd.com/221
    Math.random = () => {
      throw Error('disabled');
    };
  }

  /* eslint-disable-next-line no-redeclare */
  /* global Intl */

  function tameIntl() {
    // todo: somehow fix these. These almost certainly don't enable the reading
    // of side-channels, but we want things to be deterministic across
    // runtimes. Best bet is to just disallow calling these functions without
    // an explicit locale name.

    // the whitelist may have deleted Intl entirely, so tolerate that
    if (typeof Intl !== 'undefined') {
      Intl.DateTimeFormat = () => {
        throw Error('disabled');
      };
      Intl.NumberFormat = () => {
        throw Error('disabled');
      };
      Intl.getCanonicalLocales = () => {
        throw Error('disabled');
      };
    }
    // eslint-disable-next-line no-extend-native
    Object.prototype.toLocaleString = () => {
      throw new Error('toLocaleString suppressed');
    };
  }

  function tameError() {
    if (!Object.isExtensible(Error)) {
      throw Error('huh Error is not extensible');
    }
    /* this worked back when we were running it on a global, but stopped
    working when we turned it into a shim */
    /*
    Object.defineProperty(Error.prototype, "stack",
                          { get() { return 'stack suppressed'; } });
    */
    delete Error.captureStackTrace;
    if ('captureStackTrace' in Error) {
      throw Error('hey we could not remove Error.captureStackTrace');
    }

    // we might do this in the future
    /*
    const unsafeError = Error;
    const newErrorConstructor = function Error(...args) {
      return Reflect.construct(unsafeError, args, new.target);
    };

    newErrorConstructor.prototype = unsafeError.prototype;
    newErrorConstructor.prototype.construct = newErrorConstructor;

    Error = newErrorConstructor;

    EvalError.__proto__ = newErrorConstructor;
    RangeError.__proto__ = newErrorConstructor;
    ReferenceError.__proto__ = newErrorConstructor;
    SyntaxError.__proto__ = newErrorConstructor;
    TypeError.__proto__ = newErrorConstructor;
    URIError.__proto__ = newErrorConstructor;
    */
  }

  function tameRegExp() {
    delete RegExp.prototype.compile;
    if ('compile' in RegExp.prototype) {
      throw Error('hey we could not remove RegExp.prototype.compile');
    }

    // We want to delete RegExp.$1, as well as any other surprising properties.
    // On some engines we can't just do 'delete RegExp.$1'.
    const unsafeRegExp = RegExp;

    // eslint-disable-next-line no-global-assign
    RegExp = function RegExp(...args) {
      return Reflect.construct(unsafeRegExp, args, new.target);
    };
    RegExp.prototype = unsafeRegExp.prototype;
    unsafeRegExp.prototype.constructor = RegExp;

    if ('$1' in RegExp) {
      throw Error('hey we could not remove RegExp.$1');
    }
  }

  /* global getAnonIntrinsics */

  // Copyright (C) 2011 Google Inc.
  // Copyright (C) 2018 Agoric
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  // http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  /* This is evaluated in an environment in which getAnonIntrinsics() is
     already defined (by prepending the definition of getAnonIntrinsics to the
     stringified removeProperties()), hence we don't use the following
     import */
  // import { getAnonIntrinsics } from './anonIntrinsics.js';

  function removeProperties(global, whitelist) {
    // walk global object, test against whitelist, delete

    const uncurryThis = fn => (thisArg, ...args) =>
      Reflect.apply(fn, thisArg, args);
    const {
      getOwnPropertyDescriptor: gopd,
      getOwnPropertyNames: gopn,
      keys,
    } = Object;
    const cleaning = new WeakMap();
    const getProto = Object.getPrototypeOf;
    const hop = uncurryThis(Object.prototype.hasOwnProperty);

    const whiteTable = new WeakMap();

    function addToWhiteTable(rootValue, rootPermit) {
      /**
       * The whiteTable should map from each path-accessible primordial
       * object to the permit object that describes how it should be
       * cleaned.
       *
       * We initialize the whiteTable only so that {@code getPermit} can
       * process "*" inheritance using the whitelist, by walking actual
       * inheritance chains.
       */
      const whitelistSymbols = [true, false, '*', 'maybeAccessor'];
      function register(value, permit) {
        if (value !== Object(value)) {
          return;
        }
        if (typeof permit !== 'object') {
          if (whitelistSymbols.indexOf(permit) < 0) {
            throw new Error(
              `syntax error in whitelist; unexpected value: ${permit}`,
            );
          }
          return;
        }
        if (whiteTable.has(value)) {
          throw new Error('primordial reachable through multiple paths');
        }
        whiteTable.set(value, permit);
        keys(permit).forEach(name => {
          // Use gopd to avoid invoking an accessor property.
          // Accessor properties for which permit !== 'maybeAccessor'
          // are caught later by clean().
          const desc = gopd(value, name);
          if (desc) {
            register(desc.value, permit[name]);
          }
        });
      }
      register(rootValue, rootPermit);
    }

    /**
     * Should the property named {@code name} be whitelisted on the
     * {@code base} object, and if so, with what Permit?
     *
     * <p>If it should be permitted, return the Permit (where Permit =
     * true | "maybeAccessor" | "*" | Record(Permit)), all of which are
     * truthy. If it should not be permitted, return false.
     */
    function getPermit(base, name) {
      let permit = whiteTable.get(base);
      if (permit) {
        if (hop(permit, name)) {
          return permit[name];
        }
        // Allow escaping of magical names like '__proto__'.
        if (hop(permit, `ESCAPE${name}`)) {
          return permit[`ESCAPE${name}`];
        }
      }
      // eslint-disable-next-line no-constant-condition
      while (true) {
        base = getProto(base); // eslint-disable-line no-param-reassign
        if (base === null) {
          return false;
        }
        permit = whiteTable.get(base);
        if (permit && hop(permit, name)) {
          const result = permit[name];
          if (result === '*') {
            return result;
          }
          return false;
        }
      }
    }

    /**
     * Removes all non-whitelisted properties found by recursively and
     * reflectively walking own property chains.
     *
     * <p>Inherited properties are not checked, because we require that
     * inherited-from objects are otherwise reachable by this traversal.
     */
    function clean(value, prefix, num) {
      if (value !== Object(value)) {
        return;
      }
      if (cleaning.get(value)) {
        return;
      }

      const proto = getProto(value);
      if (proto !== null && !whiteTable.has(proto)) {
        // reportItemProblem(rootReports, ses.severities.NOT_ISOLATED,
        //                  'unexpected intrinsic', prefix + '.__proto__');
        throw new Error(`unexpected intrinsic ${prefix}.__proto__`);
      }

      cleaning.set(value, true);
      gopn(value).forEach(name => {
        const path = prefix + (prefix ? '.' : '') + name;
        const p = getPermit(value, name);
        if (p) {
          const desc = gopd(value, name);
          if (hop(desc, 'value')) {
            // Is a data property
            const subValue = desc.value;
            clean(subValue, path);
          } else if (p !== 'maybeAccessor') {
            // We are not saying that it is safe for the prop to be
            // unexpectedly an accessor; rather, it will be deleted
            // and thus made safe.
            // reportProperty(ses.severities.SAFE_SPEC_VIOLATION,
            //               'Not a data property', path);
            delete value[name]; // eslint-disable-line no-param-reassign
          } else {
            clean(desc.get, `${path}<getter>`);
            clean(desc.set, `${path}<setter>`);
          }
        } else {
          delete value[name]; // eslint-disable-line no-param-reassign
        }
      });
    }

    addToWhiteTable(global, whitelist.namedIntrinsics);
    const intr = getAnonIntrinsics(global);
    addToWhiteTable(intr, whitelist.anonIntrinsics);
    clean(global, '');
  }

  // Copyright (C) 2011 Google Inc.
  // Copyright (C) 2018 Agoric
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  // https://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  // TODO(erights): We should test for
  // We now have a reason to omit Proxy from the whitelist.
  // The makeBrandTester in repairES5 uses Allen's trick at
  // https://esdiscuss.org/topic/tostringtag-spoofing-for-null-and-undefined#content-59
  // , but testing reveals that, on FF 35.0.1, a proxy on an exotic
  // object X will pass this brand test when X will. This is fixed as of
  // FF Nightly 38.0a1.

  /**
   * <p>Qualifying platforms generally include all JavaScript platforms
   * shown on <a href="http://kangax.github.com/es5-compat-table/"
   * >ECMAScript 5 compatibility table</a> that implement {@code
   * Object.getOwnPropertyNames}. At the time of this writing,
   * qualifying browsers already include the latest released versions of
   * Internet Explorer (9), Firefox (4), Chrome (11), and Safari
   * (5.0.5), their corresponding standalone (e.g., server-side) JavaScript
   * engines, Rhino 1.73, and BESEN.
   *
   * <p>On such not-quite-ES5 platforms, some elements of these
   * emulations may lose SES safety, as enumerated in the comment on
   * each problem record in the {@code baseProblems} and {@code
   * supportedProblems} array below. The platform must at least provide
   * {@code Object.getOwnPropertyNames}, because it cannot reasonably be
   * emulated.
   *
   * <p>This file is useful by itself, as it has no dependencies on the
   * rest of SES. It creates no new global bindings, but merely repairs
   * standard globals or standard elements reachable from standard
   * globals. If the future-standard {@code WeakMap} global is present,
   * as it is currently on FF7.0a1, then it will repair it in place. The
   * one non-standard element that this file uses is {@code console} if
   * present, in order to report the repairs it found necessary, in
   * which case we use its {@code log, info, warn}, and {@code error}
   * methods. If {@code console.log} is absent, then this file performs
   * its repairs silently.
   *
   * <p>Generally, this file should be run as the first script in a
   * JavaScript context (i.e. a browser frame), as it relies on other
   * primordial objects and methods not yet being perturbed.
   *
   * <p>TODO(erights): This file tries to protect itself from some
   * post-initialization perturbation by stashing some of the
   * primordials it needs for later use, but this attempt is currently
   * incomplete. We need to revisit this when we support Confined-ES5,
   * as a variant of SES in which the primordials are not frozen. See
   * previous failed attempt at <a
   * href="https://codereview.appspot.com/5278046/" >Speeds up
   * WeakMap. Preparing to support unfrozen primordials.</a>. From
   * analysis of this failed attempt, it seems that the only practical
   * way to support CES is by use of two frames, where most of initSES
   * runs in a SES frame, and so can avoid worrying about most of these
   * perturbations.
   */
  function getAnonIntrinsics$1(global) {

    const gopd = Object.getOwnPropertyDescriptor;
    const getProto = Object.getPrototypeOf;

    // ////////////// Undeniables and Intrinsics //////////////

    /**
     * The undeniables are the primordial objects which are ambiently
     * reachable via compositions of strict syntax, primitive wrapping
     * (new Object(x)), and prototype navigation (the equivalent of
     * Object.getPrototypeOf(x) or x.__proto__). Although we could in
     * theory monkey patch primitive wrapping or prototype navigation,
     * we won't. Hence, without parsing, the following are undeniable no
     * matter what <i>other</i> monkey patching we do to the primordial
     * environment.
     */

    // The first element of each undeniableTuple is a string used to
    // name the undeniable object for reporting purposes. It has no
    // other programmatic use.
    //
    // The second element of each undeniableTuple should be the
    // undeniable itself.
    //
    // The optional third element of the undeniableTuple, if present,
    // should be an example of syntax, rather than use of a monkey
    // patchable API, evaluating to a value from which the undeniable
    // object in the second element can be reached by only the
    // following steps:
    // If the value is primitve, convert to an Object wrapper.
    // Is the resulting object either the undeniable object, or does
    // it inherit directly from the undeniable object?

    function* aStrictGenerator() {} // eslint-disable-line no-empty-function
    const Generator = getProto(aStrictGenerator);
    // async function* aStrictAsyncGenerator() {} // eslint-disable-line no-empty-function
    // const AsyncGenerator = getProto(aStrictAsyncGenerator);
    async function aStrictAsyncFunction() {} // eslint-disable-line no-empty-function
    const AsyncFunctionPrototype = getProto(aStrictAsyncFunction);

    // TODO: this is dead code, but could be useful: make this the
    // 'undeniables' object available via some API.

    const undeniableTuples = [
      ['Object.prototype', Object.prototype, {}],
      ['Function.prototype', Function.prototype, function foo() {}],
      ['Array.prototype', Array.prototype, []],
      ['RegExp.prototype', RegExp.prototype, /x/],
      ['Boolean.prototype', Boolean.prototype, true],
      ['Number.prototype', Number.prototype, 1],
      ['String.prototype', String.prototype, 'x'],
      ['%Generator%', Generator, aStrictGenerator],
      // ['%AsyncGenerator%', AsyncGenerator, aStrictAsyncGenerator],
      ['%AsyncFunction%', AsyncFunctionPrototype, aStrictAsyncFunction],
    ];

    undeniableTuples.forEach(tuple => {
      const name = tuple[0];
      const undeniable = tuple[1];
      let start = tuple[2];
      if (start === undefined) {
        return;
      }
      start = Object(start);
      if (undeniable === start) {
        return;
      }
      if (undeniable === getProto(start)) {
        return;
      }
      throw new Error(`Unexpected undeniable: ${undeniable}`);
    });

    function registerIteratorProtos(registery, base, name) {
      const iteratorSym =
        (global.Symbol && global.Symbol.iterator) || '@@iterator'; // used instead of a symbol on FF35

      if (base[iteratorSym]) {
        const anIter = base[iteratorSym]();
        const anIteratorPrototype = getProto(anIter);
        registery[name] = anIteratorPrototype; // eslint-disable-line no-param-reassign
        const anIterProtoBase = getProto(anIteratorPrototype);
        if (anIterProtoBase !== Object.prototype) {
          if (!registery.IteratorPrototype) {
            if (getProto(anIterProtoBase) !== Object.prototype) {
              throw new Error(
                '%IteratorPrototype%.__proto__ was not Object.prototype',
              );
            }
            registery.IteratorPrototype = anIterProtoBase; // eslint-disable-line no-param-reassign
          } else if (registery.IteratorPrototype !== anIterProtoBase) {
            throw new Error(`unexpected %${name}%.__proto__`);
          }
        }
      }
    }

    /**
     * Get the intrinsics not otherwise reachable by named own property
     * traversal. See
     * https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects
     * and the instrinsics section of whitelist.js
     *
     * <p>Unlike getUndeniables(), the result of sampleAnonIntrinsics()
     * does depend on the current state of the primordials, so we must
     * run this again after all other relevant monkey patching is done,
     * in order to properly initialize cajaVM.intrinsics
     */

    // TODO: we can probably unwrap this into the outer function, and stop
    // using a separately named 'sampleAnonIntrinsics'
    function sampleAnonIntrinsics() {
      const result = {};

      // If there are still other ThrowTypeError objects left after
      // noFuncPoison-ing, this should be caught by
      // test_THROWTYPEERROR_NOT_UNIQUE below, so we assume here that
      // this is the only surviving ThrowTypeError intrinsic.
      // eslint-disable-next-line prefer-rest-params
      result.ThrowTypeError = gopd(arguments, 'callee').get;

      // Get the ES6 %ArrayIteratorPrototype%,
      // %StringIteratorPrototype%, %MapIteratorPrototype%,
      // %SetIteratorPrototype% and %IteratorPrototype% intrinsics, if
      // present.
      registerIteratorProtos(result, [], 'ArrayIteratorPrototype');
      registerIteratorProtos(result, '', 'StringIteratorPrototype');
      if (typeof Map === 'function') {
        registerIteratorProtos(result, new Map(), 'MapIteratorPrototype');
      }
      if (typeof Set === 'function') {
        registerIteratorProtos(result, new Set(), 'SetIteratorPrototype');
      }

      // Get the ES6 %GeneratorFunction% intrinsic, if present.
      if (getProto(Generator) !== Function.prototype) {
        throw new Error('Generator.__proto__ was not Function.prototype');
      }
      const GeneratorFunction = Generator.constructor;
      if (getProto(GeneratorFunction) !== Function.prototype.constructor) {
        throw new Error(
          'GeneratorFunction.__proto__ was not Function.prototype.constructor',
        );
      }
      result.GeneratorFunction = GeneratorFunction;
      const genProtoBase = getProto(Generator.prototype);
      if (genProtoBase !== result.IteratorPrototype) {
        throw new Error('Unexpected Generator.prototype.__proto__');
      }

      // Get the ES6 %AsyncGeneratorFunction% intrinsic, if present.
      /*
      if (getProto(AsyncGenerator) !== Function.prototype) {
        throw new Error('AsyncGenerator.__proto__ was not Function.prototype');
      }
      const AsyncGeneratorFunction = AsyncGenerator.constructor;
      if (getProto(AsyncGeneratorFunction) !== Function.prototype.constructor) {
        throw new Error(
          'AsyncGeneratorFunction.__proto__ was not Function.prototype.constructor',
        );
      }
      result.AsyncGeneratorFunction = AsyncGeneratorFunction;
      const AsyncGeneratorPrototype = AsyncGenerator.prototype;
      result.AsyncIteratorPrototype = getProto(AsyncGeneratorPrototype);
      // it appears that the only way to get an AsyncIteratorPrototype is
      // through this getProto() process, so there's nothing to check it
      // against
      if (getProto(result.AsyncIteratorPrototype) !== Object.prototype) {
        throw new Error(
          'AsyncIteratorPrototype.__proto__ was not Object.prototype',
        );
      }
      */

      // Get the ES6 %AsyncFunction% intrinsic, if present.
      if (getProto(AsyncFunctionPrototype) !== Function.prototype) {
        throw new Error(
          'AsyncFunctionPrototype.__proto__ was not Function.prototype',
        );
      }
      const AsyncFunction = AsyncFunctionPrototype.constructor;
      if (getProto(AsyncFunction) !== Function.prototype.constructor) {
        throw new Error(
          'AsyncFunction.__proto__ was not Function.prototype.constructor',
        );
      }
      result.AsyncFunction = AsyncFunction;

      // Get the ES6 %TypedArray% intrinsic, if present.
      (function getTypedArray() {
        if (!global.Float32Array) {
          return;
        }
        const TypedArray = getProto(global.Float32Array);
        if (TypedArray === Function.prototype) {
          return;
        }
        if (getProto(TypedArray) !== Function.prototype) {
          // http://bespin.cz/~ondras/html/classv8_1_1ArrayBufferView.html
          // has me worried that someone might make such an intermediate
          // object visible.
          throw new Error('TypedArray.__proto__ was not Function.prototype');
        }
        result.TypedArray = TypedArray;
      })();

      Object.keys(result).forEach(name => {
        if (result[name] === undefined) {
          throw new Error(`Malformed intrinsic: ${name}`);
        }
      });

      return result;
    }

    return sampleAnonIntrinsics();
  }

  function getNamedIntrinsics(unsafeGlobal, whitelist) {
    const { defineProperty, getOwnPropertyDescriptor, ownKeys } = Reflect;

    const namedIntrinsics = {};

    const propertyNames = ownKeys(whitelist.namedIntrinsics);

    for (const name of propertyNames) {
      const desc = getOwnPropertyDescriptor(unsafeGlobal, name);
      if (desc) {
        // Abort if an accessor is found on the unsafe global object
        // instead of a data property. We should never get into this
        // non standard situation.
        if ('get' in desc || 'set' in desc) {
          throw new TypeError(`unexpected accessor on global property: ${name}`);
        }

        defineProperty(namedIntrinsics, name, desc);
      }
    }

    return namedIntrinsics;
  }

  function getAllPrimordials(global, anonIntrinsics) {

    const root = {
      global, // global plus all the namedIntrinsics
      anonIntrinsics,
    };
    // todo: re-examine exactly which "global" we're freezing

    return root;
  }

  function getAllPrimordials$1(namedIntrinsics, anonIntrinsics) {

    const root = {
      namedIntrinsics,
      anonIntrinsics,
    };

    return root;
  }

  // Copyright (C) 2011 Google Inc.
  // Copyright (C) 2018 Agoric
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  // http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  /**
   * @fileoverview Exports {@code ses.whitelist}, a recursively defined
   * JSON record enumerating all the naming paths in the ES5.1 spec,
   * those de-facto extensions that we judge to be safe, and SES and
   * Dr. SES extensions provided by the SES runtime.
   *
   * <p>Assumes only ES3. Compatible with ES5, ES5-strict, or
   * anticipated ES6.
   *
   * //provides ses.whitelist
   * @author Mark S. Miller,
   * @overrides ses, whitelistModule
   */

  /**
   * <p>Each JSON record enumerates the disposition of the properties on
   * some corresponding primordial object, with the root record
   * representing the global object. For each such record, the values
   * associated with its property names can be
   * <ul>
   * <li>Another record, in which case this property is simply
   *     whitelisted and that next record represents the disposition of
   *     the object which is its value. For example, {@code "Object"}
   *     leads to another record explaining what properties {@code
   *     "Object"} may have and how each such property, if present,
   *     and its value should be tamed.
   * <li>true, in which case this property is simply whitelisted. The
   *     value associated with that property is still traversed and
   *     tamed, but only according to the taming of the objects that
   *     object inherits from. For example, {@code "Object.freeze"} leads
   *     to true, meaning that the {@code "freeze"} property of {@code
   *     Object} should be whitelisted and the value of the property (a
   *     function) should be further tamed only according to the
   *     markings of the other objects it inherits from, like {@code
   *     "Function.prototype"} and {@code "Object.prototype").
   *     If the property is an accessor property, it is not
   *     whitelisted (as invoking an accessor might not be meaningful,
   *     yet the accessor might return a value needing taming).
   * <li>"maybeAccessor", in which case this accessor property is simply
   *     whitelisted and its getter and/or setter are tamed according to
   *     inheritance. If the property is not an accessor property, its
   *     value is tamed according to inheritance.
   * <li>"*", in which case this property on this object is whitelisted,
   *     as is this property as inherited by all objects that inherit
   *     from this object. The values associated with all such properties
   *     are still traversed and tamed, but only according to the taming
   *     of the objects that object inherits from. For example, {@code
   *     "Object.prototype.constructor"} leads to "*", meaning that we
   *     whitelist the {@code "constructor"} property on {@code
   *     Object.prototype} and on every object that inherits from {@code
   *     Object.prototype} that does not have a conflicting mark. Each
   *     of these is tamed as if with true, so that the value of the
   *     property is further tamed according to what other objects it
   *     inherits from.
   * <li>false, which suppresses permission inherited via "*".
   * </ul>
   *
   * <p>TODO: We want to do for constructor: something weaker than '*',
   * but rather more like what we do for [[Prototype]] links, which is
   * that it is whitelisted only if it points at an object which is
   * otherwise reachable by a whitelisted path.
   *
   * <p>The members of the whitelist are either
   * <ul>
   * <li>(uncommented) defined by the ES5.1 normative standard text,
   * <li>(questionable) provides a source of non-determinism, in
   *     violation of pure object-capability rules, but allowed anyway
   *     since we've given up on restricting JavaScript to a
   *     deterministic subset.
   * <li>(ES5 Appendix B) common elements of de facto JavaScript
   *     described by the non-normative Appendix B.
   * <li>(Harmless whatwg) extensions documented at
   *     <a href="http://wiki.whatwg.org/wiki/Web_ECMAScript"
   *     >http://wiki.whatwg.org/wiki/Web_ECMAScript</a> that seem to be
   *     harmless. Note that the RegExp constructor extensions on that
   *     page are <b>not harmless</b> and so must not be whitelisted.
   * <li>(ES-Harmony proposal) accepted as "proposal" status for
   *     EcmaScript-Harmony.
   * </ul>
   *
   * <p>With the above encoding, there are some sensible whitelists we
   * cannot express, such as marking a property both with "*" and a JSON
   * record. This is an expedient decision based only on not having
   * encountered such a need. Should we need this extra expressiveness,
   * we'll need to refactor to enable a different encoding.
   *
   * <p>We factor out {@code true} into the variable {@code t} just to
   * get a bit better compression from simple minifiers.
   */

  const t = true;
  const j = true; // included in the Jessie runtime

  let TypedArrayWhitelist; // defined and used below

  var whitelist = {
    // The accessible intrinsics which are not reachable by own
    // property name traversal are listed here so that they are
    // processed by the whitelist, although this also makes them
    // accessible by this path.  See
    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects
    // Of these, ThrowTypeError is the only one from ES5. All the
    // rest were introduced in ES6.
    anonIntrinsics: {
      ThrowTypeError: {},
      IteratorPrototype: {
        // 25.1
        // Technically, for SES-on-ES5, we should not need to
        // whitelist 'next'. However, browsers are accidentally
        // relying on it
        // https://bugs.chromium.org/p/v8/issues/detail?id=4769#
        // https://bugs.webkit.org/show_bug.cgi?id=154475
        // and we will be whitelisting it as we transition to ES6
        // anyway, so we unconditionally whitelist it now.
        next: '*',
        constructor: false,
      },
      ArrayIteratorPrototype: {},
      StringIteratorPrototype: {},
      MapIteratorPrototype: {},
      SetIteratorPrototype: {},
      // AsyncIteratorPrototype does not inherit from IteratorPrototype
      AsyncIteratorPrototype: {},

      // The %GeneratorFunction% intrinsic is the constructor of
      // generator functions, so %GeneratorFunction%.prototype is
      // the %Generator% intrinsic, which all generator functions
      // inherit from. A generator function is effectively the
      // constructor of its generator instances, so, for each
      // generator function (e.g., "g1" on the diagram at
      // http://people.mozilla.org/~jorendorff/figure-2.png )
      // its .prototype is a prototype that its instances inherit
      // from. Paralleling this structure, %Generator%.prototype,
      // i.e., %GeneratorFunction%.prototype.prototype, is the
      // object that all these generator function prototypes inherit
      // from. The .next, .return and .throw that generator
      // instances respond to are actually the builtin methods they
      // inherit from this object.
      GeneratorFunction: {
        // 25.2
        length: '*', // Not sure why this is needed
        prototype: {
          // 25.4
          prototype: {
            next: '*',
            return: '*',
            throw: '*',
            constructor: '*', // Not sure why this is needed
          },
        },
      },
      AsyncGeneratorFunction: {
        // 25.3
        length: '*',
        prototype: {
          // 25.5
          prototype: {
            next: '*',
            return: '*',
            throw: '*',
            constructor: '*', // Not sure why this is needed
          },
        },
      },
      AsyncFunction: {
        // 25.7
        length: '*',
        prototype: '*',
      },

      TypedArray: (TypedArrayWhitelist = {
        // 22.2
        length: '*', // does not inherit from Function.prototype on Chrome
        name: '*', // ditto
        from: t,
        of: t,
        BYTES_PER_ELEMENT: '*',
        prototype: {
          buffer: 'maybeAccessor',
          byteLength: 'maybeAccessor',
          byteOffset: 'maybeAccessor',
          copyWithin: '*',
          entries: '*',
          every: '*',
          fill: '*',
          filter: '*',
          find: '*',
          findIndex: '*',
          forEach: '*',
          includes: '*',
          indexOf: '*',
          join: '*',
          keys: '*',
          lastIndexOf: '*',
          length: 'maybeAccessor',
          map: '*',
          reduce: '*',
          reduceRight: '*',
          reverse: '*',
          set: '*',
          slice: '*',
          some: '*',
          sort: '*',
          subarray: '*',
          values: '*',
          BYTES_PER_ELEMENT: '*',
        },
      }),
    },

    namedIntrinsics: {
      // In order according to
      // http://www.ecma-international.org/ecma-262/ with chapter
      // numbers where applicable

      // 18 The Global Object

      // 18.1
      Infinity: j,
      NaN: j,
      undefined: j,

      // 18.2
      eval: j, // realms-shim depends on having indirect eval in the globals
      isFinite: t,
      isNaN: t,
      parseFloat: t,
      parseInt: t,
      decodeURI: t,
      decodeURIComponent: t,
      encodeURI: t,
      encodeURIComponent: t,

      // 19 Fundamental Objects

      Object: {
        // 19.1
        assign: t, // ES-Harmony
        create: t,
        defineProperties: t, // ES-Harmony
        defineProperty: t,
        entries: t, // ES-Harmony
        freeze: j,
        getOwnPropertyDescriptor: t,
        getOwnPropertyDescriptors: t, // proposed ES-Harmony
        getOwnPropertyNames: t,
        getOwnPropertySymbols: t, // ES-Harmony
        getPrototypeOf: t,
        is: j, // ES-Harmony
        isExtensible: t,
        isFrozen: t,
        isSealed: t,
        keys: t,
        preventExtensions: j,
        seal: j,
        setPrototypeOf: t, // ES-Harmony
        values: t, // ES-Harmony

        prototype: {
          // B.2.2
          // We need to prefix __proto__ with ESCAPE so that it doesn't
          // just change the prototype of this object.
          ESCAPE__proto__: 'maybeAccessor',
          __defineGetter__: t,
          __defineSetter__: t,
          __lookupGetter__: t,
          __lookupSetter__: t,

          constructor: '*',
          hasOwnProperty: t,
          isPrototypeOf: t,
          propertyIsEnumerable: t,
          toLocaleString: '*',
          toString: '*',
          valueOf: '*',

          // Generally allowed
          [Symbol.iterator]: '*',
          [Symbol.toPrimitive]: '*',
          [Symbol.toStringTag]: '*',
          [Symbol.unscopables]: '*',
        },
      },

      Function: {
        // 19.2
        length: t,
        prototype: {
          apply: t,
          bind: t,
          call: t,
          [Symbol.hasInstance]: '*',

          // 19.2.4 instances
          length: '*',
          name: '*', // ES-Harmony
          prototype: '*',
          arity: '*', // non-std, deprecated in favor of length

          // Generally allowed
          [Symbol.species]: 'maybeAccessor', // ES-Harmony?
        },
      },

      Boolean: {
        // 19.3
        prototype: t,
      },

      Symbol: {
        // 19.4               all ES-Harmony
        asyncIterator: t, // proposed? ES-Harmony
        for: t,
        hasInstance: t,
        isConcatSpreadable: t,
        iterator: t,
        keyFor: t,
        match: t,
        matchAll: t,
        replace: t,
        search: t,
        species: t,
        split: t,
        toPrimitive: t,
        toStringTag: t,
        unscopables: t,
        prototype: t,
      },

      Error: {
        // 19.5
        prototype: {
          name: '*',
          message: '*',
        },
      },
      // In ES6 the *Error "subclasses" of Error inherit from Error,
      // since constructor inheritance generally mirrors prototype
      // inheritance. As explained at
      // https://code.google.com/p/google-caja/issues/detail?id=1963 ,
      // debug.js hides away the Error constructor itself, and so needs
      // to rewire these "subclass" constructors. Until we have a more
      // general mechanism, please maintain this list of whitelisted
      // subclasses in sync with the list in debug.js of subclasses to
      // be rewired.
      EvalError: {
        prototype: t,
      },
      RangeError: {
        prototype: t,
      },
      ReferenceError: {
        prototype: t,
      },
      SyntaxError: {
        prototype: t,
      },
      TypeError: {
        prototype: t,
      },
      URIError: {
        prototype: t,
      },

      // 20 Numbers and Dates

      Number: {
        // 20.1
        EPSILON: t, // ES-Harmony
        isFinite: j, // ES-Harmony
        isInteger: t, // ES-Harmony
        isNaN: j, // ES-Harmony
        isSafeInteger: j, // ES-Harmony
        MAX_SAFE_INTEGER: j, // ES-Harmony
        MAX_VALUE: t,
        MIN_SAFE_INTEGER: j, // ES-Harmony
        MIN_VALUE: t,
        NaN: t,
        NEGATIVE_INFINITY: t,
        parseFloat: t, // ES-Harmony
        parseInt: t, // ES-Harmony
        POSITIVE_INFINITY: t,
        prototype: {
          toExponential: t,
          toFixed: t,
          toPrecision: t,
        },
      },

      Math: {
        // 20.2
        E: j,
        LN10: j,
        LN2: j,
        LOG10E: t,
        LOG2E: t,
        PI: j,
        SQRT1_2: t,
        SQRT2: t,

        abs: j,
        acos: t,
        acosh: t, // ES-Harmony
        asin: t,
        asinh: t, // ES-Harmony
        atan: t,
        atanh: t, // ES-Harmony
        atan2: t,
        cbrt: t, // ES-Harmony
        ceil: j,
        clz32: t, // ES-Harmony
        cos: t,
        cosh: t, // ES-Harmony
        exp: t,
        expm1: t, // ES-Harmony
        floor: j,
        fround: t, // ES-Harmony
        hypot: t, // ES-Harmony
        imul: t, // ES-Harmony
        log: j,
        log1p: t, // ES-Harmony
        log10: j, // ES-Harmony
        log2: j, // ES-Harmony
        max: j,
        min: j,
        pow: j,
        random: t, // questionable
        round: j,
        sign: t, // ES-Harmony
        sin: t,
        sinh: t, // ES-Harmony
        sqrt: j,
        tan: t,
        tanh: t, // ES-Harmony
        trunc: j, // ES-Harmony
      },

      // no-arg Date constructor is questionable
      Date: {
        // 20.3
        now: t, // questionable
        parse: t,
        UTC: t,
        prototype: {
          // Note: coordinate this list with maintanence of repairES5.js
          getDate: t,
          getDay: t,
          getFullYear: t,
          getHours: t,
          getMilliseconds: t,
          getMinutes: t,
          getMonth: t,
          getSeconds: t,
          getTime: t,
          getTimezoneOffset: t,
          getUTCDate: t,
          getUTCDay: t,
          getUTCFullYear: t,
          getUTCHours: t,
          getUTCMilliseconds: t,
          getUTCMinutes: t,
          getUTCMonth: t,
          getUTCSeconds: t,
          setDate: t,
          setFullYear: t,
          setHours: t,
          setMilliseconds: t,
          setMinutes: t,
          setMonth: t,
          setSeconds: t,
          setTime: t,
          setUTCDate: t,
          setUTCFullYear: t,
          setUTCHours: t,
          setUTCMilliseconds: t,
          setUTCMinutes: t,
          setUTCMonth: t,
          setUTCSeconds: t,
          toDateString: t,
          toISOString: t,
          toJSON: t,
          toLocaleDateString: t,
          toLocaleString: t,
          toLocaleTimeString: t,
          toTimeString: t,
          toUTCString: t,

          // B.2.4
          getYear: t,
          setYear: t,
          toGMTString: t,
        },
      },

      // 21 Text Processing

      String: {
        // 21.2
        fromCharCode: j,
        fromCodePoint: t, // ES-Harmony
        raw: j, // ES-Harmony
        prototype: {
          charAt: t,
          charCodeAt: t,
          codePointAt: t, // ES-Harmony
          concat: t,
          endsWith: j, // ES-Harmony
          includes: t, // ES-Harmony
          indexOf: j,
          lastIndexOf: j,
          localeCompare: t,
          match: t,
          normalize: t, // ES-Harmony
          padEnd: t, // ES-Harmony
          padStart: t, // ES-Harmony
          repeat: t, // ES-Harmony
          replace: t,
          search: t,
          slice: j,
          split: t,
          startsWith: j, // ES-Harmony
          substring: t,
          toLocaleLowerCase: t,
          toLocaleUpperCase: t,
          toLowerCase: t,
          toUpperCase: t,
          trim: t,

          // B.2.3
          substr: t,
          anchor: t,
          big: t,
          blink: t,
          bold: t,
          fixed: t,
          fontcolor: t,
          fontsize: t,
          italics: t,
          link: t,
          small: t,
          strike: t,
          sub: t,
          sup: t,

          trimLeft: t, // non-standard
          trimRight: t, // non-standard

          // 21.1.4 instances
          length: '*',
        },
      },

      RegExp: {
        // 21.2
        prototype: {
          exec: t,
          flags: 'maybeAccessor',
          global: 'maybeAccessor',
          ignoreCase: 'maybeAccessor',
          [Symbol.match]: '*', // ES-Harmony
          multiline: 'maybeAccessor',
          [Symbol.replace]: '*', // ES-Harmony
          [Symbol.search]: '*', // ES-Harmony
          source: 'maybeAccessor',
          [Symbol.split]: '*', // ES-Harmony
          sticky: 'maybeAccessor',
          test: t,
          unicode: 'maybeAccessor', // ES-Harmony
          dotAll: 'maybeAccessor', // proposed ES-Harmony

          // B.2.5
          compile: false, // UNSAFE. Purposely suppressed

          // 21.2.6 instances
          lastIndex: '*',
          options: '*', // non-std
        },
      },

      // 22 Indexed Collections

      Array: {
        // 22.1
        from: j,
        isArray: t,
        of: j, // ES-Harmony?
        prototype: {
          concat: t,
          copyWithin: t, // ES-Harmony
          entries: t, // ES-Harmony
          every: t,
          fill: t, // ES-Harmony
          filter: j,
          find: t, // ES-Harmony
          findIndex: t, // ES-Harmony
          forEach: j,
          includes: t, // ES-Harmony
          indexOf: j,
          join: t,
          keys: t, // ES-Harmony
          lastIndexOf: j,
          map: j,
          pop: j,
          push: j,
          reduce: j,
          reduceRight: j,
          reverse: t,
          shift: j,
          slice: j,
          some: t,
          sort: t,
          splice: t,
          unshift: j,
          values: t, // ES-Harmony

          // 22.1.4 instances
          length: '*',
        },
      },

      // 22.2 Typed Array stuff
      // TODO: Not yet organized according to spec order

      Int8Array: TypedArrayWhitelist,
      Uint8Array: TypedArrayWhitelist,
      Uint8ClampedArray: TypedArrayWhitelist,
      Int16Array: TypedArrayWhitelist,
      Uint16Array: TypedArrayWhitelist,
      Int32Array: TypedArrayWhitelist,
      Uint32Array: TypedArrayWhitelist,
      Float32Array: TypedArrayWhitelist,
      Float64Array: TypedArrayWhitelist,

      // 23 Keyed Collections          all ES-Harmony

      Map: {
        // 23.1
        prototype: {
          clear: j,
          delete: j,
          entries: j,
          forEach: j,
          get: j,
          has: j,
          keys: j,
          set: j,
          size: 'maybeAccessor',
          values: j,
        },
      },

      Set: {
        // 23.2
        prototype: {
          add: j,
          clear: j,
          delete: j,
          entries: j,
          forEach: j,
          has: j,
          keys: j,
          size: 'maybeAccessor',
          values: j,
        },
      },

      WeakMap: {
        // 23.3
        prototype: {
          // Note: coordinate this list with maintenance of repairES5.js
          delete: j,
          get: j,
          has: j,
          set: j,
        },
      },

      WeakSet: {
        // 23.4
        prototype: {
          add: j,
          delete: j,
          has: j,
        },
      },

      // 24 Structured Data

      ArrayBuffer: {
        // 24.1            all ES-Harmony
        isView: t,
        length: t, // does not inherit from Function.prototype on Chrome
        name: t, // ditto
        prototype: {
          byteLength: 'maybeAccessor',
          slice: t,
        },
      },

      // 24.2 TODO: Omitting SharedArrayBuffer for now

      DataView: {
        // 24.3               all ES-Harmony
        length: t, // does not inherit from Function.prototype on Chrome
        name: t, // ditto
        BYTES_PER_ELEMENT: '*', // non-standard. really?
        prototype: {
          buffer: 'maybeAccessor',
          byteOffset: 'maybeAccessor',
          byteLength: 'maybeAccessor',
          getFloat32: t,
          getFloat64: t,
          getInt8: t,
          getInt16: t,
          getInt32: t,
          getUint8: t,
          getUint16: t,
          getUint32: t,
          setFloat32: t,
          setFloat64: t,
          setInt8: t,
          setInt16: t,
          setInt32: t,
          setUint8: t,
          setUint16: t,
          setUint32: t,
        },
      },

      // 24.4 TODO: Omitting Atomics for now

      JSON: {
        // 24.5
        parse: j,
        stringify: j,
      },

      // 25 Control Abstraction Objects

      Promise: {
        // 25.4
        all: j,
        race: j,
        reject: j,
        resolve: j,
        makeHandled: t, // eventual-send
        prototype: {
          catch: t,
          then: j,
          finally: t, // proposed ES-Harmony

          // eventual-send
          delete: t,
          get: t,
          put: t,
          post: t,
          invoke: t,
          fapply: t,
          fcall: t,

          // nanoq.js
          del: t,

          // Temporary compat with the old makeQ.js
          send: t,
          end: t,
        },
      },

      // nanoq.js
      Q: {
        all: t,
        race: t,
        reject: t,
        resolve: t,

        join: t,
        isPassByCopy: t,
        passByCopy: t,
        makeRemote: t,
        makeFar: t,

        // Temporary compat with the old makeQ.js
        shorten: t,
        isPromise: t,
        async: t,
        rejected: t,
        promise: t,
        delay: t,
        memoize: t,
        defer: t,
      },

      // 26 Reflection

      Reflect: {
        // 26.1
        apply: t,
        construct: t,
        defineProperty: t,
        deleteProperty: t,
        get: t,
        getOwnPropertyDescriptor: t,
        getPrototypeOf: t,
        has: t,
        isExtensible: t,
        ownKeys: t,
        preventExtensions: t,
        set: t,
        setPrototypeOf: t,
      },

      Proxy: {
        // 26.2
        revocable: t,
      },

      // Appendix B

      // B.2.1
      escape: t,
      unescape: t,

      // B.2.5 (RegExp.prototype.compile) is marked 'false' up in 21.2

      // Other

      StringMap: {
        // A specialized approximation of ES-Harmony's Map.
        prototype: {}, // Technically, the methods should be on the prototype,
        // but doing so while preserving encapsulation will be
        // needlessly expensive for current usage.
      },

      Realm: {
        makeRootRealm: t,
        makeCompartment: t,
        prototype: {
          global: 'maybeAccessor',
          evaluate: t,
        },
      },

      SES: {
        confine: t,
        confineExpr: t,
        harden: t,
      },

      Nat: j,
      def: j,
    },
  };

  function makeConsole(parentConsole) {
    /* 'parentConsole' is the parent Realm's original 'console' object. We must
       wrap it, exposing a 'console' with a 'console.log' (and perhaps others)
       to the local realm, without allowing access to the original 'console',
       its return values, or its exception objects, any of which could be used
       to break confinement via the unsafe Function constructor. */

    // callAndWrapError is copied from proposal-realms/shim/src/realmFacade.js
    // Like Realm.apply except that it catches anything thrown and rethrows it
    // as an Error from this realm

    const errorConstructors = new Map([
      ['EvalError', EvalError],
      ['RangeError', RangeError],
      ['ReferenceError', ReferenceError],
      ['SyntaxError', SyntaxError],
      ['TypeError', TypeError],
      ['URIError', URIError],
    ]);

    function callAndWrapError(target, ...args) {
      try {
        return target(...args);
      } catch (err) {
        if (Object(err) !== err) {
          // err is a primitive value, which is safe to rethrow
          throw err;
        }
        let eName;
        let eMessage;
        let eStack;
        try {
          // The child environment might seek to use 'err' to reach the
          // parent's intrinsics and corrupt them. `${err.name}` will cause
          // string coercion of 'err.name'. If err.name is an object (probably
          // a String of the parent Realm), the coercion uses
          // err.name.toString(), which is under the control of the parent. If
          // err.name were a primitive (e.g. a number), it would use
          // Number.toString(err.name), using the child's version of Number
          // (which the child could modify to capture its argument for later
          // use), however primitives don't have properties like .prototype so
          // they aren't useful for an attack.
          eName = `${err.name}`;
          eMessage = `${err.message}`;
          eStack = `${err.stack || eMessage}`;
          // eName/eMessage/eStack are now child-realm primitive strings, and
          // safe to expose
        } catch (ignored) {
          // if err.name.toString() throws, keep the (parent realm) Error away
          // from the child
          throw new Error('unknown error');
        }
        const ErrorConstructor = errorConstructors.get(eName) || Error;
        try {
          throw new ErrorConstructor(eMessage);
        } catch (err2) {
          err2.stack = eStack; // replace with the captured inner stack
          throw err2;
        }
      }
    }

    const newConsole = {};
    const passThrough = [
      'log',
      'info',
      'warn',
      'error',
      'group',
      'groupEnd',
      'trace',
      'time',
      'timeLog',
      'timeEnd',
    ];
    // TODO: those are the properties that MDN documents. Node.js has a bunch
    // of additional ones that I didn't include, which might be appropriate.

    passThrough.forEach(name => {
      // TODO: do we reveal the presence/absence of these properties to the
      // child realm, thus exposing nondeterminism (and a hint of what platform
      // you might be on) when it is constructed with {consoleMode: allow} ? Or
      // should we expose the same set all the time, but silently ignore calls
      // to the missing ones, to hide that variation? We might even consider
      // adding console.* to the child realm all the time, even without
      // consoleMode:allow, but ignore the calls unless the mode is enabled.
      if (name in parentConsole) {
        const orig = parentConsole[name];
        // TODO: in a stack trace, this appears as
        // "Object.newConsole.(anonymous function) [as trace]"
        // can we make that "newConsole.trace" ?
        newConsole[name] = function newerConsole(...args) {
          callAndWrapError(orig, ...args);
        };
      }
    });

    return newConsole;
  }

  function makeMakeRequire(r, harden) {
    function makeRequire(config) {
      const cache = new Map();

      function build(what) {
        // This approach denies callers the ability to use inheritance to
        // manage their config objects, but a simple "if (what in config)"
        // predicate would also be truthy for e.g. "toString" and other
        // properties of Object.prototype, and require('toString') should be
        // legal if and only if the config object included an own-property
        // named 'toString'. Incidentally, this could have been
        // "config.hasOwnProperty(what)" but eslint complained.
        if (!Object.prototype.hasOwnProperty.call(config, what)) {
          throw new Error(`Cannot find module '${what}'`);
        }
        const c = config[what];

        // some modules are hard-coded ways to access functionality that SES
        // provides directly
        if (what === '@agoric/harden') {
          return harden;
        }

        // If the config points at a simple function, it must be a pure
        // function with no dependencies (i.e. no 'require' or 'import', no
        // calls to other functions defined in the same file but outside the
        // function body). We stringify it and evaluate it inside this realm.
        if (typeof c === 'function') {
          return r.evaluate(`(${c})`);
        }

        // else we treat it as an object with an 'attenuatorSource' property
        // that defines an attenuator function, which we evaluate. We then
        // invoke it with the config object, which can contain authorities that
        // it can wrap. The return value from this invocation is the module
        // object that gets returned from require(). The attenuator function
        // and the module it returns are in-realm, the authorities it wraps
        // will be out-of-realm.
        const src = `(${c.attenuatorSource})`;
        const attenuator = r.evaluate(src);
        return attenuator(c);
      }

      function newRequire(whatArg) {
        const what = `${whatArg}`;
        if (!cache.has(what)) {
          cache.set(what, harden(build(what)));
        }
        return cache.get(what);
      }

      return newRequire;
    }

    return makeRequire;
  }

  /**
   * @fileoverview Exports {@code ses.dataPropertiesToRepair}, a recursively
   * defined JSON record enumerating the optimal set of prototype properties
   * on primordials that need to be repaired before hardening.
   *
   * //provides ses.dataPropertiesToRepair
   * @author JF Paradis
   */

  /**
   * <p>The optimal set of prototype properties that need to be repaired
   * before hardening is applied on enviromments subject to the override
   * mistake.
   *
   * <p>Because "repairing" replaces data properties with accessors, every
   * time a repaired property is accessed, the associated getter is invoked,
   * which degrades the runtime performance of all code executing in the
   * repaired enviromment, compared to the non-repaired case. In order
   * to maintain performance, we only repair the properties of objects
   * for which hardening causes a breakage of their intended usage. There
   * are three cases:
   * <ul>Overriding properties on objects typically used as maps,
   *     namely {@code "Object"} and {@code "Array"}. In the case of arrays,
   *     a given program might not be aware that non-numerical properties are
   *     stored on the undelying object instance, not on the array. When an
   *     object is typically used as a map, we repair all of its prototype
   *     properties.
   * <ul>Overriding properties on objects that provide defaults on their
   *     prototype that programs typically override by assignment, such as
   *     {@code "Error.prototype.message"} and {@code "Function.prototype.name"}
   *     (both default to "").
   * <ul>Setting a prototype chain. The constructor is typically set by
   *     assignment, for example {@code "Child.prototype.constructor = Child"}.
   *
   * <p>Each JSON record enumerates the disposition of the properties on
   * some corresponding primordial object, with the root record containing:
   * <ul>
   * <li>The record for the global object.
   * <li>The record for the anonymous intrinsics.
   * </ul>
   *
   * <p>For each such record, the values associated with its property
   * names can be:
   * <ul>
   * <li>Another record, in which case this property is simply left
   *     unrepaired and that next record represents the disposition of
   *     the object which is its value. For example, {@code "Object"}
   *     leads to another record explaining what properties {@code
   *     "Object"} may have and how each such property, if present,
   *     and its value should be repaired.
   * <li>true, in which case this property is simply repaired. The
   *     value associated with that property is not traversed. For
   * 	   example, {@code "Function.prototype.name"} leads to true,
   *     meaning that the {@code "name"} property of {@code
   *     "Function.prototype"} should be repaired (which is needed
   *     when inheriting from @code{Function} and setting the subclass's
   *     {@code "prototype.name"} property). If the property is
   *     already an accessor property, it is not repaired (because
   *     accessors are not subject to the override mistake).
   * <li>"*", all properties on this object are repaired.
   * <li>falsey, in which case this property is skipped.
   * </ul>
   *
   * <p>We factor out {@code true} into the variable {@code t} just to
   * get a bit better compression from simple minifiers.
   */

  const t$1 = true;

  var dataPropertiesToRepair = {
    namedIntrinsics: {
      Object: {
        prototype: '*',
      },

      Array: {
        prototype: '*',
      },

      Function: {
        prototype: {
          constructor: t$1, // set by "regenerator-runtime"
          bind: t$1, // set by "underscore"
          name: t$1,
          toString: t$1,
        },
      },

      Error: {
        prototype: {
          constructor: t$1, // set by "fast-json-patch"
          message: t$1,
          name: t$1, // set by "precond"
          toString: t$1, // set by "bluebird"
        },
      },

      TypeError: {
        prototype: {
          constructor: t$1, // set by "readable-stream"
          name: t$1, // set by "readable-stream"
        },
      },

      Promise: {
        prototype: {
          constructor: t$1, // set by "core-js"
        },
      },
    },

    anonIntrinsics: {
      TypedArray: {
        prototype: '*',
      },

      GeneratorFunction: {
        prototype: {
          constructor: t$1,
          name: t$1,
          toString: t$1,
        },
      },

      AsyncFunction: {
        prototype: {
          constructor: t$1,
          name: t$1,
          toString: t$1,
        },
      },

      AsyncGeneratorFunction: {
        prototype: {
          constructor: t$1,
          name: t$1,
          toString: t$1,
        },
      },

      IteratorPrototype: '*',
    },
  };

  // Adapted from SES/Caja
  // Copyright (C) 2011 Google Inc.
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js

  function repairDataProperties(intrinsics, repairPlan) {
    // Object.defineProperty is allowed to fail silently,
    // use Object.defineProperties instead.

    const {
      defineProperties,
      getOwnPropertyDescriptor,
      getOwnPropertyDescriptors,
      prototype: { hasOwnProperty },
    } = Object;

    const { ownKeys } = Reflect;

    /**
     * For a special set of properties (defined in the repairPlan), it ensures
     * that the effect of freezing does not suppress the ability to override
     * these properties on derived objects by simple assignment.
     *
     * Because of lack of sufficient foresight at the time, ES5 unfortunately
     * specified that a simple assignment to a non-existent property must fail if
     * it would override a non-writable data property of the same name. (In
     * retrospect, this was a mistake, but it is now too late and we must live
     * with the consequences.) As a result, simply freezing an object to make it
     * tamper proof has the unfortunate side effect of breaking previously correct
     * code that is considered to have followed JS best practices, if this
     * previous code used assignment to override.
     */
    function enableDerivedOverride(obj, prop, desc) {
      if ('value' in desc && desc.configurable) {
        const { value } = desc;

        // eslint-disable-next-line no-inner-declarations
        function getter() {
          return value;
        }

        // Re-attach the data property on the object so
        // it can be found by the deep-freeze traversal process.
        getter.value = value;

        // eslint-disable-next-line no-inner-declarations
        function setter(newValue) {
          if (obj === this) {
            throw new TypeError(
              `Cannot assign to read only property '${prop}' of object '${obj}'`,
            );
          }
          if (hasOwnProperty.call(this, prop)) {
            this[prop] = newValue;
          } else {
            defineProperties(this, {
              [prop]: {
                value: newValue,
                writable: true,
                enumerable: desc.enumerable,
                configurable: desc.configurable,
              },
            });
          }
        }

        defineProperties(obj, {
          [prop]: {
            get: getter,
            set: setter,
            enumerable: desc.enumerable,
            configurable: desc.configurable,
          },
        });
      }
    }

    function repairOneProperty(obj, prop) {
      if (!obj) {
        return;
      }
      const desc = getOwnPropertyDescriptor(obj, prop);
      if (!desc) {
        return;
      }
      enableDerivedOverride(obj, prop, desc);
    }

    function repairAllProperties(obj) {
      if (!obj) {
        return;
      }
      const descs = getOwnPropertyDescriptors(obj);
      if (!descs) {
        return;
      }
      ownKeys(descs).forEach(prop =>
        enableDerivedOverride(obj, prop, descs[prop]),
      );
    }

    function walkRepairPlan(obj, plan) {
      if (!obj) {
        return;
      }
      if (!plan) {
        return;
      }
      ownKeys(plan).forEach(prop => {
        const subPlan = plan[prop];
        const subObj = obj[prop];
        switch (subPlan) {
          case true:
            repairOneProperty(obj, prop);
            break;

          case '*':
            repairAllProperties(subObj);
            break;

          default:
            if (Object(subPlan) !== subPlan) {
              throw TypeError(`Repair plan subPlan ${subPlan} is invalid`);
            }
            walkRepairPlan(subObj, subPlan);
        }
      });
    }

    // Do the repair.
    walkRepairPlan(intrinsics, repairPlan);
  }

  // Copyright (C) 2018 Agoric

  const FORWARDED_REALMS_OPTIONS = ['transforms'];

  function createSESWithRealmConstructor(creatorStrings, Realm) {
    function makeSESRootRealm(options) {
      // eslint-disable-next-line no-param-reassign
      options = Object(options); // Todo: sanitize
      const shims = [];

      const {
        dataPropertiesToRepair: optDataPropertiesToRepair,
        shims: optionalShims,
        sloppyGlobals,
        whitelist: optWhitelist
      } = options;

      const optionsRest = Object.assign({}, options);
      delete optionsRest.dataPropertiesToRepair;
      delete optionsRest.shims;
      delete optionsRest.sloppyGlobals;
      delete optionsRest.whitelist;

      const wl = JSON.parse(JSON.stringify(optWhitelist || whitelist));
      const repairPlan =
        optDataPropertiesToRepair !== undefined
          ? JSON.parse(JSON.stringify(optDataPropertiesToRepair))
          : dataPropertiesToRepair;

      // Forward the designated Realms options.
      const realmsOptions = {};
      FORWARDED_REALMS_OPTIONS.forEach(key => {
        if (key in optionsRest) {
          realmsOptions[key] = optionsRest[key];
        }
      });

      if (sloppyGlobals) {
        throw TypeError(`\
sloppyGlobals cannot be specified for makeSESRootRealm!
You probably want a Compartment instead, like:
  const c = s.global.Realm.makeCompartment({ sloppyGlobals: true })`);
      }

      // "allow" enables real Date.now(), anything else gets NaN
      // (it'd be nice to allow a fixed numeric value, but too hard to
      // implement right now)
      if (options.dateNowMode !== 'allow') {
        shims.push(`(${tameDate})();`);
      }

      if (options.mathRandomMode !== 'allow') {
        shims.push(`(${tameMath})();`);
      }

      // Intl is disabled entirely for now, deleted by removeProperties. If we
      // want to bring it back (under the control of this option), we'll need
      // to add it to the whitelist too, as well as taming it properly.
      if (options.intlMode !== 'allow') {
        // this shim also disables Object.prototype.toLocaleString
        shims.push(`(${tameIntl})();`);
      }

      if (options.errorStackMode !== 'allow') {
        shims.push(`(${tameError})();`);
      } else {
        // if removeProperties cleans these things from Error, v8 won't provide
        // stack traces or even toString on exceptions, and then Node.js prints
        // uncaught exceptions as "undefined" instead of a type/message/stack.
        // So if we're allowing stack traces, make sure the whitelist is
        // augmented to include them.
        wl.namedIntrinsics.Error.captureStackTrace = true;
        wl.namedIntrinsics.Error.stackTraceLimit = true;
        wl.namedIntrinsics.Error.prepareStackTrace = true;
      }

      if (options.regexpMode !== 'allow') {
        shims.push(`(${tameRegExp})();`);
      }

      // The getAnonIntrinsics function might be renamed by e.g. rollup. The
      // removeProperties() function references it by name, so we need to force
      // it to have a specific name.
      const removeProp = `const getAnonIntrinsics = (${getAnonIntrinsics$1});
               (${removeProperties})(this, ${JSON.stringify(wl)})`;
      shims.push(removeProp);

      // Add options.shims.
      if (optionalShims) {
        shims.push(...optionalShims);
      }

      const r = Realm.makeRootRealm(Object.assign({}, realmsOptions, { shims }));

      // Build a harden() with an empty fringe. It will be populated later when
      // we call harden(allIntrinsics).
      const makeHardenerSrc = `(${makeHardener})`;
      const harden = r.evaluate(makeHardenerSrc)();

      const b = r.evaluate(creatorStrings);
      b.createSESInThisRealm(r.global, creatorStrings, r);

      // Allow harden to be accessible via the SES global.
      r.global.SES.harden = harden;

      if (options.consoleMode === 'allow') {
        const s = `(${makeConsole})`;
        r.global.console = r.evaluate(s)(console);
      }

      // Extract the intrinsics from the global.
      const anonIntrinsics = r.evaluate(`(${getAnonIntrinsics$1})`)(r.global);
      const namedIntrinsics = r.evaluate(`(${getNamedIntrinsics})`)(
        r.global,
        whitelist,
      );

      // Gather the intrinsics only.
      const allIntrinsics = r.evaluate(`(${getAllPrimordials$1})`)(
        namedIntrinsics,
        anonIntrinsics,
      );

      // Gather the primordials and the globals.
      const allPrimordials = r.evaluate(`(${getAllPrimordials})`)(
        r.global,
        anonIntrinsics,
      );

      // Repair the override mistake on the intrinsics only.
      r.evaluate(`(${repairDataProperties})`)(allIntrinsics, repairPlan);

      // Finally freeze all the primordials, and the global object. This must
      // be the last thing we do that modifies the Realm's globals.
      harden(allPrimordials);

      // build the makeRequire helper, glue it to the new Realm
      r.makeRequire = harden(r.evaluate(`(${makeMakeRequire})`)(r, harden));
      return r;
    }
    const SES = {
      makeSESRootRealm,
    };

    return SES;
  }

  const creatorStrings = "(function (exports) {\n  'use strict';\n\n  // Adapted from SES/Caja - Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  // based upon:\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js\n  // then copied from proposal-frozen-realms deep-freeze.js\n  // then copied from SES/src/bundle/deepFreeze.js\n\n  /**\n   * @typedef HardenerOptions\n   * @type {object}\n   * @property {WeakSet=} fringeSet WeakSet to use for the fringeSet\n   * @property {Function=} naivePrepareObject Call with object before hardening\n   */\n\n  /**\n   * Create a `harden` function.\n   *\n   * @param {Iterable} initialFringe Objects considered already hardened\n   * @param {HardenerOptions=} options Options for creation\n   */\n  function makeHardener(initialFringe, options = {}) {\n    const { freeze, getOwnPropertyDescriptors, getPrototypeOf } = Object;\n    const { ownKeys } = Reflect;\n\n    // Objects that we won't freeze, either because we've frozen them already,\n    // or they were one of the initial roots (terminals). These objects form\n    // the \"fringe\" of the hardened object graph.\n    let { fringeSet } = options;\n    if (fringeSet) {\n      if (\n        typeof fringeSet.add !== 'function' ||\n        typeof fringeSet.has !== 'function'\n      ) {\n        throw new TypeError(\n          `options.fringeSet must have add() and has() methods`,\n        );\n      }\n\n      // Populate the supplied fringeSet with our initialFringe.\n      if (initialFringe) {\n        for (const fringe of initialFringe) {\n          fringeSet.add(fringe);\n        }\n      }\n    } else {\n      // Use a new empty fringe.\n      fringeSet = new WeakSet(initialFringe);\n    }\n\n    const naivePrepareObject = options && options.naivePrepareObject;\n\n    function harden(root) {\n      const toFreeze = new Set();\n      const prototypes = new Map();\n      const paths = new WeakMap();\n\n      // If val is something we should be freezing but aren't yet,\n      // add it to toFreeze.\n      function enqueue(val, path) {\n        if (Object(val) !== val) {\n          // ignore primitives\n          return;\n        }\n        const type = typeof val;\n        if (type !== 'object' && type !== 'function') {\n          // future proof: break until someone figures out what it should do\n          throw new TypeError(`Unexpected typeof: ${type}`);\n        }\n        if (fringeSet.has(val) || toFreeze.has(val)) {\n          // Ignore if this is an exit, or we've already visited it\n          return;\n        }\n        // console.log(`adding ${val} to toFreeze`, val);\n        toFreeze.add(val);\n        paths.set(val, path);\n      }\n\n      function freezeAndTraverse(obj) {\n        // Apply the naive preparer if they specified one.\n        if (naivePrepareObject) {\n          naivePrepareObject(obj);\n        }\n\n        // Now freeze the object to ensure reactive\n        // objects such as proxies won't add properties\n        // during traversal, before they get frozen.\n\n        // Object are verified before being enqueued,\n        // therefore this is a valid candidate.\n        // Throws if this fails (strict mode).\n        freeze(obj);\n\n        // we rely upon certain commitments of Object.freeze and proxies here\n\n        // get stable/immutable outbound links before a Proxy has a chance to do\n        // something sneaky.\n        const proto = getPrototypeOf(obj);\n        const descs = getOwnPropertyDescriptors(obj);\n        const path = paths.get(obj) || 'unknown';\n\n        // console.log(`adding ${proto} to prototypes under ${path}`);\n        if (proto !== null && !prototypes.has(proto)) {\n          prototypes.set(proto, path);\n          paths.set(proto, `${path}.__proto__`);\n        }\n\n        ownKeys(descs).forEach(name => {\n          const pathname = `${path}.${String(name)}`;\n          // todo uncurried form\n          // todo: getOwnPropertyDescriptors is guaranteed to return well-formed\n          // descriptors, but they still inherit from Object.prototype. If\n          // someone has poisoned Object.prototype to add 'value' or 'get'\n          // properties, then a simple 'if (\"value\" in desc)' or 'desc.value'\n          // test could be confused. We use hasOwnProperty to be sure about\n          // whether 'value' is present or not, which tells us for sure that this\n          // is a data property.\n          const desc = descs[name];\n          if ('value' in desc) {\n            // todo uncurried form\n            enqueue(desc.value, `${pathname}`);\n          } else {\n            enqueue(desc.get, `${pathname}(get)`);\n            enqueue(desc.set, `${pathname}(set)`);\n          }\n        });\n      }\n\n      function dequeue() {\n        // New values added before forEach() has finished will be visited.\n        toFreeze.forEach(freezeAndTraverse); // todo curried forEach\n      }\n\n      function checkPrototypes() {\n        prototypes.forEach((path, p) => {\n          if (!(toFreeze.has(p) || fringeSet.has(p))) {\n            // all reachable properties have already been frozen by this point\n            let msg;\n            try {\n              msg = `prototype ${p} of ${path} is not already in the fringeSet`;\n            } catch (e) {\n              // `${(async _=>_).__proto__}` fails in most engines\n              msg =\n                'a prototype of something is not already in the fringeset (and .toString failed)';\n              try {\n                console.log(msg);\n                console.log('the prototype:', p);\n                console.log('of something:', path);\n              } catch (_e) {\n                // console.log might be missing in restrictive SES realms\n              }\n            }\n            throw new TypeError(msg);\n          }\n        });\n      }\n\n      function commit() {\n        // todo curried forEach\n        // we capture the real WeakSet.prototype.add above, in case someone\n        // changes it. The two-argument form of forEach passes the second\n        // argument as the 'this' binding, so we add to the correct set.\n        toFreeze.forEach(fringeSet.add, fringeSet);\n      }\n\n      enqueue(root);\n      dequeue();\n      // console.log(\"fringeSet\", fringeSet);\n      // console.log(\"prototype set:\", prototypes);\n      // console.log(\"toFreeze set:\", toFreeze);\n      checkPrototypes();\n      commit();\n\n      return root;\n    }\n\n    return harden;\n  }\n\n  function tameDate() {\n    const unsafeDate = Date;\n    // Date(anything) gives a string with the current time\n    // new Date(x) coerces x into a number and then returns a Date\n    // new Date() returns the current time, as a Date object\n    // new Date(undefined) returns a Date object which stringifies to 'Invalid Date'\n\n    const newDateConstructor = function Date(...args) {\n      if (new.target === undefined) {\n        // we were not called as a constructor\n        // this would normally return a string with the current time\n        return 'Invalid Date';\n      }\n      // constructor behavior: if we get arguments, we can safely pass them through\n      if (args.length > 0) {\n        return Reflect.construct(unsafeDate, args, new.target);\n        // todo: test that our constructor can still be subclassed\n      }\n      // no arguments: return a Date object, but invalid\n      return Reflect.construct(unsafeDate, [NaN], new.target);\n    };\n\n    Object.defineProperties(\n      newDateConstructor,\n      Object.getOwnPropertyDescriptors(unsafeDate),\n    );\n    // that will copy the .prototype too, so this next line is unnecessary\n    // newDateConstructor.prototype = unsafeDate.prototype;\n    unsafeDate.prototype.constructor = newDateConstructor;\n    // disable Date.now\n    newDateConstructor.now = () => NaN;\n\n    Date = newDateConstructor; // eslint-disable-line no-global-assign\n  }\n\n  function tameMath() {\n    // Math.random = () => 4; // https://www.xkcd.com/221\n    Math.random = () => {\n      throw Error('disabled');\n    };\n  }\n\n  /* eslint-disable-next-line no-redeclare */\n  /* global Intl */\n\n  function tameIntl() {\n    // todo: somehow fix these. These almost certainly don't enable the reading\n    // of side-channels, but we want things to be deterministic across\n    // runtimes. Best bet is to just disallow calling these functions without\n    // an explicit locale name.\n\n    // the whitelist may have deleted Intl entirely, so tolerate that\n    if (typeof Intl !== 'undefined') {\n      Intl.DateTimeFormat = () => {\n        throw Error('disabled');\n      };\n      Intl.NumberFormat = () => {\n        throw Error('disabled');\n      };\n      Intl.getCanonicalLocales = () => {\n        throw Error('disabled');\n      };\n    }\n    // eslint-disable-next-line no-extend-native\n    Object.prototype.toLocaleString = () => {\n      throw new Error('toLocaleString suppressed');\n    };\n  }\n\n  function tameError() {\n    if (!Object.isExtensible(Error)) {\n      throw Error('huh Error is not extensible');\n    }\n    /* this worked back when we were running it on a global, but stopped\n    working when we turned it into a shim */\n    /*\n    Object.defineProperty(Error.prototype, \"stack\",\n                          { get() { return 'stack suppressed'; } });\n    */\n    delete Error.captureStackTrace;\n    if ('captureStackTrace' in Error) {\n      throw Error('hey we could not remove Error.captureStackTrace');\n    }\n\n    // we might do this in the future\n    /*\n    const unsafeError = Error;\n    const newErrorConstructor = function Error(...args) {\n      return Reflect.construct(unsafeError, args, new.target);\n    };\n\n    newErrorConstructor.prototype = unsafeError.prototype;\n    newErrorConstructor.prototype.construct = newErrorConstructor;\n\n    Error = newErrorConstructor;\n\n    EvalError.__proto__ = newErrorConstructor;\n    RangeError.__proto__ = newErrorConstructor;\n    ReferenceError.__proto__ = newErrorConstructor;\n    SyntaxError.__proto__ = newErrorConstructor;\n    TypeError.__proto__ = newErrorConstructor;\n    URIError.__proto__ = newErrorConstructor;\n    */\n  }\n\n  function tameRegExp() {\n    delete RegExp.prototype.compile;\n    if ('compile' in RegExp.prototype) {\n      throw Error('hey we could not remove RegExp.prototype.compile');\n    }\n\n    // We want to delete RegExp.$1, as well as any other surprising properties.\n    // On some engines we can't just do 'delete RegExp.$1'.\n    const unsafeRegExp = RegExp;\n\n    // eslint-disable-next-line no-global-assign\n    RegExp = function RegExp(...args) {\n      return Reflect.construct(unsafeRegExp, args, new.target);\n    };\n    RegExp.prototype = unsafeRegExp.prototype;\n    unsafeRegExp.prototype.constructor = RegExp;\n\n    if ('$1' in RegExp) {\n      throw Error('hey we could not remove RegExp.$1');\n    }\n  }\n\n  /* global getAnonIntrinsics */\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  /* This is evaluated in an environment in which getAnonIntrinsics() is\n     already defined (by prepending the definition of getAnonIntrinsics to the\n     stringified removeProperties()), hence we don't use the following\n     import */\n  // import { getAnonIntrinsics } from './anonIntrinsics.js';\n\n  function removeProperties(global, whitelist) {\n    // walk global object, test against whitelist, delete\n\n    const uncurryThis = fn => (thisArg, ...args) =>\n      Reflect.apply(fn, thisArg, args);\n    const {\n      getOwnPropertyDescriptor: gopd,\n      getOwnPropertyNames: gopn,\n      keys,\n    } = Object;\n    const cleaning = new WeakMap();\n    const getProto = Object.getPrototypeOf;\n    const hop = uncurryThis(Object.prototype.hasOwnProperty);\n\n    const whiteTable = new WeakMap();\n\n    function addToWhiteTable(rootValue, rootPermit) {\n      /**\n       * The whiteTable should map from each path-accessible primordial\n       * object to the permit object that describes how it should be\n       * cleaned.\n       *\n       * We initialize the whiteTable only so that {@code getPermit} can\n       * process \"*\" inheritance using the whitelist, by walking actual\n       * inheritance chains.\n       */\n      const whitelistSymbols = [true, false, '*', 'maybeAccessor'];\n      function register(value, permit) {\n        if (value !== Object(value)) {\n          return;\n        }\n        if (typeof permit !== 'object') {\n          if (whitelistSymbols.indexOf(permit) < 0) {\n            throw new Error(\n              `syntax error in whitelist; unexpected value: ${permit}`,\n            );\n          }\n          return;\n        }\n        if (whiteTable.has(value)) {\n          throw new Error('primordial reachable through multiple paths');\n        }\n        whiteTable.set(value, permit);\n        keys(permit).forEach(name => {\n          // Use gopd to avoid invoking an accessor property.\n          // Accessor properties for which permit !== 'maybeAccessor'\n          // are caught later by clean().\n          const desc = gopd(value, name);\n          if (desc) {\n            register(desc.value, permit[name]);\n          }\n        });\n      }\n      register(rootValue, rootPermit);\n    }\n\n    /**\n     * Should the property named {@code name} be whitelisted on the\n     * {@code base} object, and if so, with what Permit?\n     *\n     * <p>If it should be permitted, return the Permit (where Permit =\n     * true | \"maybeAccessor\" | \"*\" | Record(Permit)), all of which are\n     * truthy. If it should not be permitted, return false.\n     */\n    function getPermit(base, name) {\n      let permit = whiteTable.get(base);\n      if (permit) {\n        if (hop(permit, name)) {\n          return permit[name];\n        }\n        // Allow escaping of magical names like '__proto__'.\n        if (hop(permit, `ESCAPE${name}`)) {\n          return permit[`ESCAPE${name}`];\n        }\n      }\n      // eslint-disable-next-line no-constant-condition\n      while (true) {\n        base = getProto(base); // eslint-disable-line no-param-reassign\n        if (base === null) {\n          return false;\n        }\n        permit = whiteTable.get(base);\n        if (permit && hop(permit, name)) {\n          const result = permit[name];\n          if (result === '*') {\n            return result;\n          }\n          return false;\n        }\n      }\n    }\n\n    /**\n     * Removes all non-whitelisted properties found by recursively and\n     * reflectively walking own property chains.\n     *\n     * <p>Inherited properties are not checked, because we require that\n     * inherited-from objects are otherwise reachable by this traversal.\n     */\n    function clean(value, prefix, num) {\n      if (value !== Object(value)) {\n        return;\n      }\n      if (cleaning.get(value)) {\n        return;\n      }\n\n      const proto = getProto(value);\n      if (proto !== null && !whiteTable.has(proto)) {\n        // reportItemProblem(rootReports, ses.severities.NOT_ISOLATED,\n        //                  'unexpected intrinsic', prefix + '.__proto__');\n        throw new Error(`unexpected intrinsic ${prefix}.__proto__`);\n      }\n\n      cleaning.set(value, true);\n      gopn(value).forEach(name => {\n        const path = prefix + (prefix ? '.' : '') + name;\n        const p = getPermit(value, name);\n        if (p) {\n          const desc = gopd(value, name);\n          if (hop(desc, 'value')) {\n            // Is a data property\n            const subValue = desc.value;\n            clean(subValue, path);\n          } else if (p !== 'maybeAccessor') {\n            // We are not saying that it is safe for the prop to be\n            // unexpectedly an accessor; rather, it will be deleted\n            // and thus made safe.\n            // reportProperty(ses.severities.SAFE_SPEC_VIOLATION,\n            //               'Not a data property', path);\n            delete value[name]; // eslint-disable-line no-param-reassign\n          } else {\n            clean(desc.get, `${path}<getter>`);\n            clean(desc.set, `${path}<setter>`);\n          }\n        } else {\n          delete value[name]; // eslint-disable-line no-param-reassign\n        }\n      });\n    }\n\n    addToWhiteTable(global, whitelist.namedIntrinsics);\n    const intr = getAnonIntrinsics(global);\n    addToWhiteTable(intr, whitelist.anonIntrinsics);\n    clean(global, '');\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // https://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  // TODO(erights): We should test for\n  // We now have a reason to omit Proxy from the whitelist.\n  // The makeBrandTester in repairES5 uses Allen's trick at\n  // https://esdiscuss.org/topic/tostringtag-spoofing-for-null-and-undefined#content-59\n  // , but testing reveals that, on FF 35.0.1, a proxy on an exotic\n  // object X will pass this brand test when X will. This is fixed as of\n  // FF Nightly 38.0a1.\n\n  /**\n   * <p>Qualifying platforms generally include all JavaScript platforms\n   * shown on <a href=\"http://kangax.github.com/es5-compat-table/\"\n   * >ECMAScript 5 compatibility table</a> that implement {@code\n   * Object.getOwnPropertyNames}. At the time of this writing,\n   * qualifying browsers already include the latest released versions of\n   * Internet Explorer (9), Firefox (4), Chrome (11), and Safari\n   * (5.0.5), their corresponding standalone (e.g., server-side) JavaScript\n   * engines, Rhino 1.73, and BESEN.\n   *\n   * <p>On such not-quite-ES5 platforms, some elements of these\n   * emulations may lose SES safety, as enumerated in the comment on\n   * each problem record in the {@code baseProblems} and {@code\n   * supportedProblems} array below. The platform must at least provide\n   * {@code Object.getOwnPropertyNames}, because it cannot reasonably be\n   * emulated.\n   *\n   * <p>This file is useful by itself, as it has no dependencies on the\n   * rest of SES. It creates no new global bindings, but merely repairs\n   * standard globals or standard elements reachable from standard\n   * globals. If the future-standard {@code WeakMap} global is present,\n   * as it is currently on FF7.0a1, then it will repair it in place. The\n   * one non-standard element that this file uses is {@code console} if\n   * present, in order to report the repairs it found necessary, in\n   * which case we use its {@code log, info, warn}, and {@code error}\n   * methods. If {@code console.log} is absent, then this file performs\n   * its repairs silently.\n   *\n   * <p>Generally, this file should be run as the first script in a\n   * JavaScript context (i.e. a browser frame), as it relies on other\n   * primordial objects and methods not yet being perturbed.\n   *\n   * <p>TODO(erights): This file tries to protect itself from some\n   * post-initialization perturbation by stashing some of the\n   * primordials it needs for later use, but this attempt is currently\n   * incomplete. We need to revisit this when we support Confined-ES5,\n   * as a variant of SES in which the primordials are not frozen. See\n   * previous failed attempt at <a\n   * href=\"https://codereview.appspot.com/5278046/\" >Speeds up\n   * WeakMap. Preparing to support unfrozen primordials.</a>. From\n   * analysis of this failed attempt, it seems that the only practical\n   * way to support CES is by use of two frames, where most of initSES\n   * runs in a SES frame, and so can avoid worrying about most of these\n   * perturbations.\n   */\n  function getAnonIntrinsics$1(global) {\n\n    const gopd = Object.getOwnPropertyDescriptor;\n    const getProto = Object.getPrototypeOf;\n\n    // ////////////// Undeniables and Intrinsics //////////////\n\n    /**\n     * The undeniables are the primordial objects which are ambiently\n     * reachable via compositions of strict syntax, primitive wrapping\n     * (new Object(x)), and prototype navigation (the equivalent of\n     * Object.getPrototypeOf(x) or x.__proto__). Although we could in\n     * theory monkey patch primitive wrapping or prototype navigation,\n     * we won't. Hence, without parsing, the following are undeniable no\n     * matter what <i>other</i> monkey patching we do to the primordial\n     * environment.\n     */\n\n    // The first element of each undeniableTuple is a string used to\n    // name the undeniable object for reporting purposes. It has no\n    // other programmatic use.\n    //\n    // The second element of each undeniableTuple should be the\n    // undeniable itself.\n    //\n    // The optional third element of the undeniableTuple, if present,\n    // should be an example of syntax, rather than use of a monkey\n    // patchable API, evaluating to a value from which the undeniable\n    // object in the second element can be reached by only the\n    // following steps:\n    // If the value is primitve, convert to an Object wrapper.\n    // Is the resulting object either the undeniable object, or does\n    // it inherit directly from the undeniable object?\n\n    function* aStrictGenerator() {} // eslint-disable-line no-empty-function\n    const Generator = getProto(aStrictGenerator);\n    // async function* aStrictAsyncGenerator() {} // eslint-disable-line no-empty-function\n    // const AsyncGenerator = getProto(aStrictAsyncGenerator);\n    async function aStrictAsyncFunction() {} // eslint-disable-line no-empty-function\n    const AsyncFunctionPrototype = getProto(aStrictAsyncFunction);\n\n    // TODO: this is dead code, but could be useful: make this the\n    // 'undeniables' object available via some API.\n\n    const undeniableTuples = [\n      ['Object.prototype', Object.prototype, {}],\n      ['Function.prototype', Function.prototype, function foo() {}],\n      ['Array.prototype', Array.prototype, []],\n      ['RegExp.prototype', RegExp.prototype, /x/],\n      ['Boolean.prototype', Boolean.prototype, true],\n      ['Number.prototype', Number.prototype, 1],\n      ['String.prototype', String.prototype, 'x'],\n      ['%Generator%', Generator, aStrictGenerator],\n      // ['%AsyncGenerator%', AsyncGenerator, aStrictAsyncGenerator],\n      ['%AsyncFunction%', AsyncFunctionPrototype, aStrictAsyncFunction],\n    ];\n\n    undeniableTuples.forEach(tuple => {\n      const name = tuple[0];\n      const undeniable = tuple[1];\n      let start = tuple[2];\n      if (start === undefined) {\n        return;\n      }\n      start = Object(start);\n      if (undeniable === start) {\n        return;\n      }\n      if (undeniable === getProto(start)) {\n        return;\n      }\n      throw new Error(`Unexpected undeniable: ${undeniable}`);\n    });\n\n    function registerIteratorProtos(registery, base, name) {\n      const iteratorSym =\n        (global.Symbol && global.Symbol.iterator) || '@@iterator'; // used instead of a symbol on FF35\n\n      if (base[iteratorSym]) {\n        const anIter = base[iteratorSym]();\n        const anIteratorPrototype = getProto(anIter);\n        registery[name] = anIteratorPrototype; // eslint-disable-line no-param-reassign\n        const anIterProtoBase = getProto(anIteratorPrototype);\n        if (anIterProtoBase !== Object.prototype) {\n          if (!registery.IteratorPrototype) {\n            if (getProto(anIterProtoBase) !== Object.prototype) {\n              throw new Error(\n                '%IteratorPrototype%.__proto__ was not Object.prototype',\n              );\n            }\n            registery.IteratorPrototype = anIterProtoBase; // eslint-disable-line no-param-reassign\n          } else if (registery.IteratorPrototype !== anIterProtoBase) {\n            throw new Error(`unexpected %${name}%.__proto__`);\n          }\n        }\n      }\n    }\n\n    /**\n     * Get the intrinsics not otherwise reachable by named own property\n     * traversal. See\n     * https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects\n     * and the instrinsics section of whitelist.js\n     *\n     * <p>Unlike getUndeniables(), the result of sampleAnonIntrinsics()\n     * does depend on the current state of the primordials, so we must\n     * run this again after all other relevant monkey patching is done,\n     * in order to properly initialize cajaVM.intrinsics\n     */\n\n    // TODO: we can probably unwrap this into the outer function, and stop\n    // using a separately named 'sampleAnonIntrinsics'\n    function sampleAnonIntrinsics() {\n      const result = {};\n\n      // If there are still other ThrowTypeError objects left after\n      // noFuncPoison-ing, this should be caught by\n      // test_THROWTYPEERROR_NOT_UNIQUE below, so we assume here that\n      // this is the only surviving ThrowTypeError intrinsic.\n      // eslint-disable-next-line prefer-rest-params\n      result.ThrowTypeError = gopd(arguments, 'callee').get;\n\n      // Get the ES6 %ArrayIteratorPrototype%,\n      // %StringIteratorPrototype%, %MapIteratorPrototype%,\n      // %SetIteratorPrototype% and %IteratorPrototype% intrinsics, if\n      // present.\n      registerIteratorProtos(result, [], 'ArrayIteratorPrototype');\n      registerIteratorProtos(result, '', 'StringIteratorPrototype');\n      if (typeof Map === 'function') {\n        registerIteratorProtos(result, new Map(), 'MapIteratorPrototype');\n      }\n      if (typeof Set === 'function') {\n        registerIteratorProtos(result, new Set(), 'SetIteratorPrototype');\n      }\n\n      // Get the ES6 %GeneratorFunction% intrinsic, if present.\n      if (getProto(Generator) !== Function.prototype) {\n        throw new Error('Generator.__proto__ was not Function.prototype');\n      }\n      const GeneratorFunction = Generator.constructor;\n      if (getProto(GeneratorFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'GeneratorFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.GeneratorFunction = GeneratorFunction;\n      const genProtoBase = getProto(Generator.prototype);\n      if (genProtoBase !== result.IteratorPrototype) {\n        throw new Error('Unexpected Generator.prototype.__proto__');\n      }\n\n      // Get the ES6 %AsyncGeneratorFunction% intrinsic, if present.\n      /*\n      if (getProto(AsyncGenerator) !== Function.prototype) {\n        throw new Error('AsyncGenerator.__proto__ was not Function.prototype');\n      }\n      const AsyncGeneratorFunction = AsyncGenerator.constructor;\n      if (getProto(AsyncGeneratorFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'AsyncGeneratorFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.AsyncGeneratorFunction = AsyncGeneratorFunction;\n      const AsyncGeneratorPrototype = AsyncGenerator.prototype;\n      result.AsyncIteratorPrototype = getProto(AsyncGeneratorPrototype);\n      // it appears that the only way to get an AsyncIteratorPrototype is\n      // through this getProto() process, so there's nothing to check it\n      // against\n      if (getProto(result.AsyncIteratorPrototype) !== Object.prototype) {\n        throw new Error(\n          'AsyncIteratorPrototype.__proto__ was not Object.prototype',\n        );\n      }\n      */\n\n      // Get the ES6 %AsyncFunction% intrinsic, if present.\n      if (getProto(AsyncFunctionPrototype) !== Function.prototype) {\n        throw new Error(\n          'AsyncFunctionPrototype.__proto__ was not Function.prototype',\n        );\n      }\n      const AsyncFunction = AsyncFunctionPrototype.constructor;\n      if (getProto(AsyncFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'AsyncFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.AsyncFunction = AsyncFunction;\n\n      // Get the ES6 %TypedArray% intrinsic, if present.\n      (function getTypedArray() {\n        if (!global.Float32Array) {\n          return;\n        }\n        const TypedArray = getProto(global.Float32Array);\n        if (TypedArray === Function.prototype) {\n          return;\n        }\n        if (getProto(TypedArray) !== Function.prototype) {\n          // http://bespin.cz/~ondras/html/classv8_1_1ArrayBufferView.html\n          // has me worried that someone might make such an intermediate\n          // object visible.\n          throw new Error('TypedArray.__proto__ was not Function.prototype');\n        }\n        result.TypedArray = TypedArray;\n      })();\n\n      Object.keys(result).forEach(name => {\n        if (result[name] === undefined) {\n          throw new Error(`Malformed intrinsic: ${name}`);\n        }\n      });\n\n      return result;\n    }\n\n    return sampleAnonIntrinsics();\n  }\n\n  function getNamedIntrinsics(unsafeGlobal, whitelist) {\n    const { defineProperty, getOwnPropertyDescriptor, ownKeys } = Reflect;\n\n    const namedIntrinsics = {};\n\n    const propertyNames = ownKeys(whitelist.namedIntrinsics);\n\n    for (const name of propertyNames) {\n      const desc = getOwnPropertyDescriptor(unsafeGlobal, name);\n      if (desc) {\n        // Abort if an accessor is found on the unsafe global object\n        // instead of a data property. We should never get into this\n        // non standard situation.\n        if ('get' in desc || 'set' in desc) {\n          throw new TypeError(`unexpected accessor on global property: ${name}`);\n        }\n\n        defineProperty(namedIntrinsics, name, desc);\n      }\n    }\n\n    return namedIntrinsics;\n  }\n\n  function getAllPrimordials(global, anonIntrinsics) {\n\n    const root = {\n      global, // global plus all the namedIntrinsics\n      anonIntrinsics,\n    };\n    // todo: re-examine exactly which \"global\" we're freezing\n\n    return root;\n  }\n\n  function getAllPrimordials$1(namedIntrinsics, anonIntrinsics) {\n\n    const root = {\n      namedIntrinsics,\n      anonIntrinsics,\n    };\n\n    return root;\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  /**\n   * @fileoverview Exports {@code ses.whitelist}, a recursively defined\n   * JSON record enumerating all the naming paths in the ES5.1 spec,\n   * those de-facto extensions that we judge to be safe, and SES and\n   * Dr. SES extensions provided by the SES runtime.\n   *\n   * <p>Assumes only ES3. Compatible with ES5, ES5-strict, or\n   * anticipated ES6.\n   *\n   * //provides ses.whitelist\n   * @author Mark S. Miller,\n   * @overrides ses, whitelistModule\n   */\n\n  /**\n   * <p>Each JSON record enumerates the disposition of the properties on\n   * some corresponding primordial object, with the root record\n   * representing the global object. For each such record, the values\n   * associated with its property names can be\n   * <ul>\n   * <li>Another record, in which case this property is simply\n   *     whitelisted and that next record represents the disposition of\n   *     the object which is its value. For example, {@code \"Object\"}\n   *     leads to another record explaining what properties {@code\n   *     \"Object\"} may have and how each such property, if present,\n   *     and its value should be tamed.\n   * <li>true, in which case this property is simply whitelisted. The\n   *     value associated with that property is still traversed and\n   *     tamed, but only according to the taming of the objects that\n   *     object inherits from. For example, {@code \"Object.freeze\"} leads\n   *     to true, meaning that the {@code \"freeze\"} property of {@code\n   *     Object} should be whitelisted and the value of the property (a\n   *     function) should be further tamed only according to the\n   *     markings of the other objects it inherits from, like {@code\n   *     \"Function.prototype\"} and {@code \"Object.prototype\").\n   *     If the property is an accessor property, it is not\n   *     whitelisted (as invoking an accessor might not be meaningful,\n   *     yet the accessor might return a value needing taming).\n   * <li>\"maybeAccessor\", in which case this accessor property is simply\n   *     whitelisted and its getter and/or setter are tamed according to\n   *     inheritance. If the property is not an accessor property, its\n   *     value is tamed according to inheritance.\n   * <li>\"*\", in which case this property on this object is whitelisted,\n   *     as is this property as inherited by all objects that inherit\n   *     from this object. The values associated with all such properties\n   *     are still traversed and tamed, but only according to the taming\n   *     of the objects that object inherits from. For example, {@code\n   *     \"Object.prototype.constructor\"} leads to \"*\", meaning that we\n   *     whitelist the {@code \"constructor\"} property on {@code\n   *     Object.prototype} and on every object that inherits from {@code\n   *     Object.prototype} that does not have a conflicting mark. Each\n   *     of these is tamed as if with true, so that the value of the\n   *     property is further tamed according to what other objects it\n   *     inherits from.\n   * <li>false, which suppresses permission inherited via \"*\".\n   * </ul>\n   *\n   * <p>TODO: We want to do for constructor: something weaker than '*',\n   * but rather more like what we do for [[Prototype]] links, which is\n   * that it is whitelisted only if it points at an object which is\n   * otherwise reachable by a whitelisted path.\n   *\n   * <p>The members of the whitelist are either\n   * <ul>\n   * <li>(uncommented) defined by the ES5.1 normative standard text,\n   * <li>(questionable) provides a source of non-determinism, in\n   *     violation of pure object-capability rules, but allowed anyway\n   *     since we've given up on restricting JavaScript to a\n   *     deterministic subset.\n   * <li>(ES5 Appendix B) common elements of de facto JavaScript\n   *     described by the non-normative Appendix B.\n   * <li>(Harmless whatwg) extensions documented at\n   *     <a href=\"http://wiki.whatwg.org/wiki/Web_ECMAScript\"\n   *     >http://wiki.whatwg.org/wiki/Web_ECMAScript</a> that seem to be\n   *     harmless. Note that the RegExp constructor extensions on that\n   *     page are <b>not harmless</b> and so must not be whitelisted.\n   * <li>(ES-Harmony proposal) accepted as \"proposal\" status for\n   *     EcmaScript-Harmony.\n   * </ul>\n   *\n   * <p>With the above encoding, there are some sensible whitelists we\n   * cannot express, such as marking a property both with \"*\" and a JSON\n   * record. This is an expedient decision based only on not having\n   * encountered such a need. Should we need this extra expressiveness,\n   * we'll need to refactor to enable a different encoding.\n   *\n   * <p>We factor out {@code true} into the variable {@code t} just to\n   * get a bit better compression from simple minifiers.\n   */\n\n  const t = true;\n  const j = true; // included in the Jessie runtime\n\n  let TypedArrayWhitelist; // defined and used below\n\n  var whitelist = {\n    // The accessible intrinsics which are not reachable by own\n    // property name traversal are listed here so that they are\n    // processed by the whitelist, although this also makes them\n    // accessible by this path.  See\n    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects\n    // Of these, ThrowTypeError is the only one from ES5. All the\n    // rest were introduced in ES6.\n    anonIntrinsics: {\n      ThrowTypeError: {},\n      IteratorPrototype: {\n        // 25.1\n        // Technically, for SES-on-ES5, we should not need to\n        // whitelist 'next'. However, browsers are accidentally\n        // relying on it\n        // https://bugs.chromium.org/p/v8/issues/detail?id=4769#\n        // https://bugs.webkit.org/show_bug.cgi?id=154475\n        // and we will be whitelisting it as we transition to ES6\n        // anyway, so we unconditionally whitelist it now.\n        next: '*',\n        constructor: false,\n      },\n      ArrayIteratorPrototype: {},\n      StringIteratorPrototype: {},\n      MapIteratorPrototype: {},\n      SetIteratorPrototype: {},\n      // AsyncIteratorPrototype does not inherit from IteratorPrototype\n      AsyncIteratorPrototype: {},\n\n      // The %GeneratorFunction% intrinsic is the constructor of\n      // generator functions, so %GeneratorFunction%.prototype is\n      // the %Generator% intrinsic, which all generator functions\n      // inherit from. A generator function is effectively the\n      // constructor of its generator instances, so, for each\n      // generator function (e.g., \"g1\" on the diagram at\n      // http://people.mozilla.org/~jorendorff/figure-2.png )\n      // its .prototype is a prototype that its instances inherit\n      // from. Paralleling this structure, %Generator%.prototype,\n      // i.e., %GeneratorFunction%.prototype.prototype, is the\n      // object that all these generator function prototypes inherit\n      // from. The .next, .return and .throw that generator\n      // instances respond to are actually the builtin methods they\n      // inherit from this object.\n      GeneratorFunction: {\n        // 25.2\n        length: '*', // Not sure why this is needed\n        prototype: {\n          // 25.4\n          prototype: {\n            next: '*',\n            return: '*',\n            throw: '*',\n            constructor: '*', // Not sure why this is needed\n          },\n        },\n      },\n      AsyncGeneratorFunction: {\n        // 25.3\n        length: '*',\n        prototype: {\n          // 25.5\n          prototype: {\n            next: '*',\n            return: '*',\n            throw: '*',\n            constructor: '*', // Not sure why this is needed\n          },\n        },\n      },\n      AsyncFunction: {\n        // 25.7\n        length: '*',\n        prototype: '*',\n      },\n\n      TypedArray: (TypedArrayWhitelist = {\n        // 22.2\n        length: '*', // does not inherit from Function.prototype on Chrome\n        name: '*', // ditto\n        from: t,\n        of: t,\n        BYTES_PER_ELEMENT: '*',\n        prototype: {\n          buffer: 'maybeAccessor',\n          byteLength: 'maybeAccessor',\n          byteOffset: 'maybeAccessor',\n          copyWithin: '*',\n          entries: '*',\n          every: '*',\n          fill: '*',\n          filter: '*',\n          find: '*',\n          findIndex: '*',\n          forEach: '*',\n          includes: '*',\n          indexOf: '*',\n          join: '*',\n          keys: '*',\n          lastIndexOf: '*',\n          length: 'maybeAccessor',\n          map: '*',\n          reduce: '*',\n          reduceRight: '*',\n          reverse: '*',\n          set: '*',\n          slice: '*',\n          some: '*',\n          sort: '*',\n          subarray: '*',\n          values: '*',\n          BYTES_PER_ELEMENT: '*',\n        },\n      }),\n    },\n\n    namedIntrinsics: {\n      // In order according to\n      // http://www.ecma-international.org/ecma-262/ with chapter\n      // numbers where applicable\n\n      // 18 The Global Object\n\n      // 18.1\n      Infinity: j,\n      NaN: j,\n      undefined: j,\n\n      // 18.2\n      eval: j, // realms-shim depends on having indirect eval in the globals\n      isFinite: t,\n      isNaN: t,\n      parseFloat: t,\n      parseInt: t,\n      decodeURI: t,\n      decodeURIComponent: t,\n      encodeURI: t,\n      encodeURIComponent: t,\n\n      // 19 Fundamental Objects\n\n      Object: {\n        // 19.1\n        assign: t, // ES-Harmony\n        create: t,\n        defineProperties: t, // ES-Harmony\n        defineProperty: t,\n        entries: t, // ES-Harmony\n        freeze: j,\n        getOwnPropertyDescriptor: t,\n        getOwnPropertyDescriptors: t, // proposed ES-Harmony\n        getOwnPropertyNames: t,\n        getOwnPropertySymbols: t, // ES-Harmony\n        getPrototypeOf: t,\n        is: j, // ES-Harmony\n        isExtensible: t,\n        isFrozen: t,\n        isSealed: t,\n        keys: t,\n        preventExtensions: j,\n        seal: j,\n        setPrototypeOf: t, // ES-Harmony\n        values: t, // ES-Harmony\n\n        prototype: {\n          // B.2.2\n          // We need to prefix __proto__ with ESCAPE so that it doesn't\n          // just change the prototype of this object.\n          ESCAPE__proto__: 'maybeAccessor',\n          __defineGetter__: t,\n          __defineSetter__: t,\n          __lookupGetter__: t,\n          __lookupSetter__: t,\n\n          constructor: '*',\n          hasOwnProperty: t,\n          isPrototypeOf: t,\n          propertyIsEnumerable: t,\n          toLocaleString: '*',\n          toString: '*',\n          valueOf: '*',\n\n          // Generally allowed\n          [Symbol.iterator]: '*',\n          [Symbol.toPrimitive]: '*',\n          [Symbol.toStringTag]: '*',\n          [Symbol.unscopables]: '*',\n        },\n      },\n\n      Function: {\n        // 19.2\n        length: t,\n        prototype: {\n          apply: t,\n          bind: t,\n          call: t,\n          [Symbol.hasInstance]: '*',\n\n          // 19.2.4 instances\n          length: '*',\n          name: '*', // ES-Harmony\n          prototype: '*',\n          arity: '*', // non-std, deprecated in favor of length\n\n          // Generally allowed\n          [Symbol.species]: 'maybeAccessor', // ES-Harmony?\n        },\n      },\n\n      Boolean: {\n        // 19.3\n        prototype: t,\n      },\n\n      Symbol: {\n        // 19.4               all ES-Harmony\n        asyncIterator: t, // proposed? ES-Harmony\n        for: t,\n        hasInstance: t,\n        isConcatSpreadable: t,\n        iterator: t,\n        keyFor: t,\n        match: t,\n        matchAll: t,\n        replace: t,\n        search: t,\n        species: t,\n        split: t,\n        toPrimitive: t,\n        toStringTag: t,\n        unscopables: t,\n        prototype: t,\n      },\n\n      Error: {\n        // 19.5\n        prototype: {\n          name: '*',\n          message: '*',\n        },\n      },\n      // In ES6 the *Error \"subclasses\" of Error inherit from Error,\n      // since constructor inheritance generally mirrors prototype\n      // inheritance. As explained at\n      // https://code.google.com/p/google-caja/issues/detail?id=1963 ,\n      // debug.js hides away the Error constructor itself, and so needs\n      // to rewire these \"subclass\" constructors. Until we have a more\n      // general mechanism, please maintain this list of whitelisted\n      // subclasses in sync with the list in debug.js of subclasses to\n      // be rewired.\n      EvalError: {\n        prototype: t,\n      },\n      RangeError: {\n        prototype: t,\n      },\n      ReferenceError: {\n        prototype: t,\n      },\n      SyntaxError: {\n        prototype: t,\n      },\n      TypeError: {\n        prototype: t,\n      },\n      URIError: {\n        prototype: t,\n      },\n\n      // 20 Numbers and Dates\n\n      Number: {\n        // 20.1\n        EPSILON: t, // ES-Harmony\n        isFinite: j, // ES-Harmony\n        isInteger: t, // ES-Harmony\n        isNaN: j, // ES-Harmony\n        isSafeInteger: j, // ES-Harmony\n        MAX_SAFE_INTEGER: j, // ES-Harmony\n        MAX_VALUE: t,\n        MIN_SAFE_INTEGER: j, // ES-Harmony\n        MIN_VALUE: t,\n        NaN: t,\n        NEGATIVE_INFINITY: t,\n        parseFloat: t, // ES-Harmony\n        parseInt: t, // ES-Harmony\n        POSITIVE_INFINITY: t,\n        prototype: {\n          toExponential: t,\n          toFixed: t,\n          toPrecision: t,\n        },\n      },\n\n      Math: {\n        // 20.2\n        E: j,\n        LN10: j,\n        LN2: j,\n        LOG10E: t,\n        LOG2E: t,\n        PI: j,\n        SQRT1_2: t,\n        SQRT2: t,\n\n        abs: j,\n        acos: t,\n        acosh: t, // ES-Harmony\n        asin: t,\n        asinh: t, // ES-Harmony\n        atan: t,\n        atanh: t, // ES-Harmony\n        atan2: t,\n        cbrt: t, // ES-Harmony\n        ceil: j,\n        clz32: t, // ES-Harmony\n        cos: t,\n        cosh: t, // ES-Harmony\n        exp: t,\n        expm1: t, // ES-Harmony\n        floor: j,\n        fround: t, // ES-Harmony\n        hypot: t, // ES-Harmony\n        imul: t, // ES-Harmony\n        log: j,\n        log1p: t, // ES-Harmony\n        log10: j, // ES-Harmony\n        log2: j, // ES-Harmony\n        max: j,\n        min: j,\n        pow: j,\n        random: t, // questionable\n        round: j,\n        sign: t, // ES-Harmony\n        sin: t,\n        sinh: t, // ES-Harmony\n        sqrt: j,\n        tan: t,\n        tanh: t, // ES-Harmony\n        trunc: j, // ES-Harmony\n      },\n\n      // no-arg Date constructor is questionable\n      Date: {\n        // 20.3\n        now: t, // questionable\n        parse: t,\n        UTC: t,\n        prototype: {\n          // Note: coordinate this list with maintanence of repairES5.js\n          getDate: t,\n          getDay: t,\n          getFullYear: t,\n          getHours: t,\n          getMilliseconds: t,\n          getMinutes: t,\n          getMonth: t,\n          getSeconds: t,\n          getTime: t,\n          getTimezoneOffset: t,\n          getUTCDate: t,\n          getUTCDay: t,\n          getUTCFullYear: t,\n          getUTCHours: t,\n          getUTCMilliseconds: t,\n          getUTCMinutes: t,\n          getUTCMonth: t,\n          getUTCSeconds: t,\n          setDate: t,\n          setFullYear: t,\n          setHours: t,\n          setMilliseconds: t,\n          setMinutes: t,\n          setMonth: t,\n          setSeconds: t,\n          setTime: t,\n          setUTCDate: t,\n          setUTCFullYear: t,\n          setUTCHours: t,\n          setUTCMilliseconds: t,\n          setUTCMinutes: t,\n          setUTCMonth: t,\n          setUTCSeconds: t,\n          toDateString: t,\n          toISOString: t,\n          toJSON: t,\n          toLocaleDateString: t,\n          toLocaleString: t,\n          toLocaleTimeString: t,\n          toTimeString: t,\n          toUTCString: t,\n\n          // B.2.4\n          getYear: t,\n          setYear: t,\n          toGMTString: t,\n        },\n      },\n\n      // 21 Text Processing\n\n      String: {\n        // 21.2\n        fromCharCode: j,\n        fromCodePoint: t, // ES-Harmony\n        raw: j, // ES-Harmony\n        prototype: {\n          charAt: t,\n          charCodeAt: t,\n          codePointAt: t, // ES-Harmony\n          concat: t,\n          endsWith: j, // ES-Harmony\n          includes: t, // ES-Harmony\n          indexOf: j,\n          lastIndexOf: j,\n          localeCompare: t,\n          match: t,\n          normalize: t, // ES-Harmony\n          padEnd: t, // ES-Harmony\n          padStart: t, // ES-Harmony\n          repeat: t, // ES-Harmony\n          replace: t,\n          search: t,\n          slice: j,\n          split: t,\n          startsWith: j, // ES-Harmony\n          substring: t,\n          toLocaleLowerCase: t,\n          toLocaleUpperCase: t,\n          toLowerCase: t,\n          toUpperCase: t,\n          trim: t,\n\n          // B.2.3\n          substr: t,\n          anchor: t,\n          big: t,\n          blink: t,\n          bold: t,\n          fixed: t,\n          fontcolor: t,\n          fontsize: t,\n          italics: t,\n          link: t,\n          small: t,\n          strike: t,\n          sub: t,\n          sup: t,\n\n          trimLeft: t, // non-standard\n          trimRight: t, // non-standard\n\n          // 21.1.4 instances\n          length: '*',\n        },\n      },\n\n      RegExp: {\n        // 21.2\n        prototype: {\n          exec: t,\n          flags: 'maybeAccessor',\n          global: 'maybeAccessor',\n          ignoreCase: 'maybeAccessor',\n          [Symbol.match]: '*', // ES-Harmony\n          multiline: 'maybeAccessor',\n          [Symbol.replace]: '*', // ES-Harmony\n          [Symbol.search]: '*', // ES-Harmony\n          source: 'maybeAccessor',\n          [Symbol.split]: '*', // ES-Harmony\n          sticky: 'maybeAccessor',\n          test: t,\n          unicode: 'maybeAccessor', // ES-Harmony\n          dotAll: 'maybeAccessor', // proposed ES-Harmony\n\n          // B.2.5\n          compile: false, // UNSAFE. Purposely suppressed\n\n          // 21.2.6 instances\n          lastIndex: '*',\n          options: '*', // non-std\n        },\n      },\n\n      // 22 Indexed Collections\n\n      Array: {\n        // 22.1\n        from: j,\n        isArray: t,\n        of: j, // ES-Harmony?\n        prototype: {\n          concat: t,\n          copyWithin: t, // ES-Harmony\n          entries: t, // ES-Harmony\n          every: t,\n          fill: t, // ES-Harmony\n          filter: j,\n          find: t, // ES-Harmony\n          findIndex: t, // ES-Harmony\n          forEach: j,\n          includes: t, // ES-Harmony\n          indexOf: j,\n          join: t,\n          keys: t, // ES-Harmony\n          lastIndexOf: j,\n          map: j,\n          pop: j,\n          push: j,\n          reduce: j,\n          reduceRight: j,\n          reverse: t,\n          shift: j,\n          slice: j,\n          some: t,\n          sort: t,\n          splice: t,\n          unshift: j,\n          values: t, // ES-Harmony\n\n          // 22.1.4 instances\n          length: '*',\n        },\n      },\n\n      // 22.2 Typed Array stuff\n      // TODO: Not yet organized according to spec order\n\n      Int8Array: TypedArrayWhitelist,\n      Uint8Array: TypedArrayWhitelist,\n      Uint8ClampedArray: TypedArrayWhitelist,\n      Int16Array: TypedArrayWhitelist,\n      Uint16Array: TypedArrayWhitelist,\n      Int32Array: TypedArrayWhitelist,\n      Uint32Array: TypedArrayWhitelist,\n      Float32Array: TypedArrayWhitelist,\n      Float64Array: TypedArrayWhitelist,\n\n      // 23 Keyed Collections          all ES-Harmony\n\n      Map: {\n        // 23.1\n        prototype: {\n          clear: j,\n          delete: j,\n          entries: j,\n          forEach: j,\n          get: j,\n          has: j,\n          keys: j,\n          set: j,\n          size: 'maybeAccessor',\n          values: j,\n        },\n      },\n\n      Set: {\n        // 23.2\n        prototype: {\n          add: j,\n          clear: j,\n          delete: j,\n          entries: j,\n          forEach: j,\n          has: j,\n          keys: j,\n          size: 'maybeAccessor',\n          values: j,\n        },\n      },\n\n      WeakMap: {\n        // 23.3\n        prototype: {\n          // Note: coordinate this list with maintenance of repairES5.js\n          delete: j,\n          get: j,\n          has: j,\n          set: j,\n        },\n      },\n\n      WeakSet: {\n        // 23.4\n        prototype: {\n          add: j,\n          delete: j,\n          has: j,\n        },\n      },\n\n      // 24 Structured Data\n\n      ArrayBuffer: {\n        // 24.1            all ES-Harmony\n        isView: t,\n        length: t, // does not inherit from Function.prototype on Chrome\n        name: t, // ditto\n        prototype: {\n          byteLength: 'maybeAccessor',\n          slice: t,\n        },\n      },\n\n      // 24.2 TODO: Omitting SharedArrayBuffer for now\n\n      DataView: {\n        // 24.3               all ES-Harmony\n        length: t, // does not inherit from Function.prototype on Chrome\n        name: t, // ditto\n        BYTES_PER_ELEMENT: '*', // non-standard. really?\n        prototype: {\n          buffer: 'maybeAccessor',\n          byteOffset: 'maybeAccessor',\n          byteLength: 'maybeAccessor',\n          getFloat32: t,\n          getFloat64: t,\n          getInt8: t,\n          getInt16: t,\n          getInt32: t,\n          getUint8: t,\n          getUint16: t,\n          getUint32: t,\n          setFloat32: t,\n          setFloat64: t,\n          setInt8: t,\n          setInt16: t,\n          setInt32: t,\n          setUint8: t,\n          setUint16: t,\n          setUint32: t,\n        },\n      },\n\n      // 24.4 TODO: Omitting Atomics for now\n\n      JSON: {\n        // 24.5\n        parse: j,\n        stringify: j,\n      },\n\n      // 25 Control Abstraction Objects\n\n      Promise: {\n        // 25.4\n        all: j,\n        race: j,\n        reject: j,\n        resolve: j,\n        makeHandled: t, // eventual-send\n        prototype: {\n          catch: t,\n          then: j,\n          finally: t, // proposed ES-Harmony\n\n          // eventual-send\n          delete: t,\n          get: t,\n          put: t,\n          post: t,\n          invoke: t,\n          fapply: t,\n          fcall: t,\n\n          // nanoq.js\n          del: t,\n\n          // Temporary compat with the old makeQ.js\n          send: t,\n          end: t,\n        },\n      },\n\n      // nanoq.js\n      Q: {\n        all: t,\n        race: t,\n        reject: t,\n        resolve: t,\n\n        join: t,\n        isPassByCopy: t,\n        passByCopy: t,\n        makeRemote: t,\n        makeFar: t,\n\n        // Temporary compat with the old makeQ.js\n        shorten: t,\n        isPromise: t,\n        async: t,\n        rejected: t,\n        promise: t,\n        delay: t,\n        memoize: t,\n        defer: t,\n      },\n\n      // 26 Reflection\n\n      Reflect: {\n        // 26.1\n        apply: t,\n        construct: t,\n        defineProperty: t,\n        deleteProperty: t,\n        get: t,\n        getOwnPropertyDescriptor: t,\n        getPrototypeOf: t,\n        has: t,\n        isExtensible: t,\n        ownKeys: t,\n        preventExtensions: t,\n        set: t,\n        setPrototypeOf: t,\n      },\n\n      Proxy: {\n        // 26.2\n        revocable: t,\n      },\n\n      // Appendix B\n\n      // B.2.1\n      escape: t,\n      unescape: t,\n\n      // B.2.5 (RegExp.prototype.compile) is marked 'false' up in 21.2\n\n      // Other\n\n      StringMap: {\n        // A specialized approximation of ES-Harmony's Map.\n        prototype: {}, // Technically, the methods should be on the prototype,\n        // but doing so while preserving encapsulation will be\n        // needlessly expensive for current usage.\n      },\n\n      Realm: {\n        makeRootRealm: t,\n        makeCompartment: t,\n        prototype: {\n          global: 'maybeAccessor',\n          evaluate: t,\n        },\n      },\n\n      SES: {\n        confine: t,\n        confineExpr: t,\n        harden: t,\n      },\n\n      Nat: j,\n      def: j,\n    },\n  };\n\n  function makeConsole(parentConsole) {\n    /* 'parentConsole' is the parent Realm's original 'console' object. We must\n       wrap it, exposing a 'console' with a 'console.log' (and perhaps others)\n       to the local realm, without allowing access to the original 'console',\n       its return values, or its exception objects, any of which could be used\n       to break confinement via the unsafe Function constructor. */\n\n    // callAndWrapError is copied from proposal-realms/shim/src/realmFacade.js\n    // Like Realm.apply except that it catches anything thrown and rethrows it\n    // as an Error from this realm\n\n    const errorConstructors = new Map([\n      ['EvalError', EvalError],\n      ['RangeError', RangeError],\n      ['ReferenceError', ReferenceError],\n      ['SyntaxError', SyntaxError],\n      ['TypeError', TypeError],\n      ['URIError', URIError],\n    ]);\n\n    function callAndWrapError(target, ...args) {\n      try {\n        return target(...args);\n      } catch (err) {\n        if (Object(err) !== err) {\n          // err is a primitive value, which is safe to rethrow\n          throw err;\n        }\n        let eName;\n        let eMessage;\n        let eStack;\n        try {\n          // The child environment might seek to use 'err' to reach the\n          // parent's intrinsics and corrupt them. `${err.name}` will cause\n          // string coercion of 'err.name'. If err.name is an object (probably\n          // a String of the parent Realm), the coercion uses\n          // err.name.toString(), which is under the control of the parent. If\n          // err.name were a primitive (e.g. a number), it would use\n          // Number.toString(err.name), using the child's version of Number\n          // (which the child could modify to capture its argument for later\n          // use), however primitives don't have properties like .prototype so\n          // they aren't useful for an attack.\n          eName = `${err.name}`;\n          eMessage = `${err.message}`;\n          eStack = `${err.stack || eMessage}`;\n          // eName/eMessage/eStack are now child-realm primitive strings, and\n          // safe to expose\n        } catch (ignored) {\n          // if err.name.toString() throws, keep the (parent realm) Error away\n          // from the child\n          throw new Error('unknown error');\n        }\n        const ErrorConstructor = errorConstructors.get(eName) || Error;\n        try {\n          throw new ErrorConstructor(eMessage);\n        } catch (err2) {\n          err2.stack = eStack; // replace with the captured inner stack\n          throw err2;\n        }\n      }\n    }\n\n    const newConsole = {};\n    const passThrough = [\n      'log',\n      'info',\n      'warn',\n      'error',\n      'group',\n      'groupEnd',\n      'trace',\n      'time',\n      'timeLog',\n      'timeEnd',\n    ];\n    // TODO: those are the properties that MDN documents. Node.js has a bunch\n    // of additional ones that I didn't include, which might be appropriate.\n\n    passThrough.forEach(name => {\n      // TODO: do we reveal the presence/absence of these properties to the\n      // child realm, thus exposing nondeterminism (and a hint of what platform\n      // you might be on) when it is constructed with {consoleMode: allow} ? Or\n      // should we expose the same set all the time, but silently ignore calls\n      // to the missing ones, to hide that variation? We might even consider\n      // adding console.* to the child realm all the time, even without\n      // consoleMode:allow, but ignore the calls unless the mode is enabled.\n      if (name in parentConsole) {\n        const orig = parentConsole[name];\n        // TODO: in a stack trace, this appears as\n        // \"Object.newConsole.(anonymous function) [as trace]\"\n        // can we make that \"newConsole.trace\" ?\n        newConsole[name] = function newerConsole(...args) {\n          callAndWrapError(orig, ...args);\n        };\n      }\n    });\n\n    return newConsole;\n  }\n\n  function makeMakeRequire(r, harden) {\n    function makeRequire(config) {\n      const cache = new Map();\n\n      function build(what) {\n        // This approach denies callers the ability to use inheritance to\n        // manage their config objects, but a simple \"if (what in config)\"\n        // predicate would also be truthy for e.g. \"toString\" and other\n        // properties of Object.prototype, and require('toString') should be\n        // legal if and only if the config object included an own-property\n        // named 'toString'. Incidentally, this could have been\n        // \"config.hasOwnProperty(what)\" but eslint complained.\n        if (!Object.prototype.hasOwnProperty.call(config, what)) {\n          throw new Error(`Cannot find module '${what}'`);\n        }\n        const c = config[what];\n\n        // some modules are hard-coded ways to access functionality that SES\n        // provides directly\n        if (what === '@agoric/harden') {\n          return harden;\n        }\n\n        // If the config points at a simple function, it must be a pure\n        // function with no dependencies (i.e. no 'require' or 'import', no\n        // calls to other functions defined in the same file but outside the\n        // function body). We stringify it and evaluate it inside this realm.\n        if (typeof c === 'function') {\n          return r.evaluate(`(${c})`);\n        }\n\n        // else we treat it as an object with an 'attenuatorSource' property\n        // that defines an attenuator function, which we evaluate. We then\n        // invoke it with the config object, which can contain authorities that\n        // it can wrap. The return value from this invocation is the module\n        // object that gets returned from require(). The attenuator function\n        // and the module it returns are in-realm, the authorities it wraps\n        // will be out-of-realm.\n        const src = `(${c.attenuatorSource})`;\n        const attenuator = r.evaluate(src);\n        return attenuator(c);\n      }\n\n      function newRequire(whatArg) {\n        const what = `${whatArg}`;\n        if (!cache.has(what)) {\n          cache.set(what, harden(build(what)));\n        }\n        return cache.get(what);\n      }\n\n      return newRequire;\n    }\n\n    return makeRequire;\n  }\n\n  /**\n   * @fileoverview Exports {@code ses.dataPropertiesToRepair}, a recursively\n   * defined JSON record enumerating the optimal set of prototype properties\n   * on primordials that need to be repaired before hardening.\n   *\n   * //provides ses.dataPropertiesToRepair\n   * @author JF Paradis\n   */\n\n  /**\n   * <p>The optimal set of prototype properties that need to be repaired\n   * before hardening is applied on enviromments subject to the override\n   * mistake.\n   *\n   * <p>Because \"repairing\" replaces data properties with accessors, every\n   * time a repaired property is accessed, the associated getter is invoked,\n   * which degrades the runtime performance of all code executing in the\n   * repaired enviromment, compared to the non-repaired case. In order\n   * to maintain performance, we only repair the properties of objects\n   * for which hardening causes a breakage of their intended usage. There\n   * are three cases:\n   * <ul>Overriding properties on objects typically used as maps,\n   *     namely {@code \"Object\"} and {@code \"Array\"}. In the case of arrays,\n   *     a given program might not be aware that non-numerical properties are\n   *     stored on the undelying object instance, not on the array. When an\n   *     object is typically used as a map, we repair all of its prototype\n   *     properties.\n   * <ul>Overriding properties on objects that provide defaults on their\n   *     prototype that programs typically override by assignment, such as\n   *     {@code \"Error.prototype.message\"} and {@code \"Function.prototype.name\"}\n   *     (both default to \"\").\n   * <ul>Setting a prototype chain. The constructor is typically set by\n   *     assignment, for example {@code \"Child.prototype.constructor = Child\"}.\n   *\n   * <p>Each JSON record enumerates the disposition of the properties on\n   * some corresponding primordial object, with the root record containing:\n   * <ul>\n   * <li>The record for the global object.\n   * <li>The record for the anonymous intrinsics.\n   * </ul>\n   *\n   * <p>For each such record, the values associated with its property\n   * names can be:\n   * <ul>\n   * <li>Another record, in which case this property is simply left\n   *     unrepaired and that next record represents the disposition of\n   *     the object which is its value. For example, {@code \"Object\"}\n   *     leads to another record explaining what properties {@code\n   *     \"Object\"} may have and how each such property, if present,\n   *     and its value should be repaired.\n   * <li>true, in which case this property is simply repaired. The\n   *     value associated with that property is not traversed. For\n   * \t   example, {@code \"Function.prototype.name\"} leads to true,\n   *     meaning that the {@code \"name\"} property of {@code\n   *     \"Function.prototype\"} should be repaired (which is needed\n   *     when inheriting from @code{Function} and setting the subclass's\n   *     {@code \"prototype.name\"} property). If the property is\n   *     already an accessor property, it is not repaired (because\n   *     accessors are not subject to the override mistake).\n   * <li>\"*\", all properties on this object are repaired.\n   * <li>falsey, in which case this property is skipped.\n   * </ul>\n   *\n   * <p>We factor out {@code true} into the variable {@code t} just to\n   * get a bit better compression from simple minifiers.\n   */\n\n  const t$1 = true;\n\n  var dataPropertiesToRepair = {\n    namedIntrinsics: {\n      Object: {\n        prototype: '*',\n      },\n\n      Array: {\n        prototype: '*',\n      },\n\n      Function: {\n        prototype: {\n          constructor: t$1, // set by \"regenerator-runtime\"\n          bind: t$1, // set by \"underscore\"\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      Error: {\n        prototype: {\n          constructor: t$1, // set by \"fast-json-patch\"\n          message: t$1,\n          name: t$1, // set by \"precond\"\n          toString: t$1, // set by \"bluebird\"\n        },\n      },\n\n      TypeError: {\n        prototype: {\n          constructor: t$1, // set by \"readable-stream\"\n          name: t$1, // set by \"readable-stream\"\n        },\n      },\n\n      Promise: {\n        prototype: {\n          constructor: t$1, // set by \"core-js\"\n        },\n      },\n    },\n\n    anonIntrinsics: {\n      TypedArray: {\n        prototype: '*',\n      },\n\n      GeneratorFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      AsyncFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      AsyncGeneratorFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      IteratorPrototype: '*',\n    },\n  };\n\n  // Adapted from SES/Caja\n  // Copyright (C) 2011 Google Inc.\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js\n\n  function repairDataProperties(intrinsics, repairPlan) {\n    // Object.defineProperty is allowed to fail silently,\n    // use Object.defineProperties instead.\n\n    const {\n      defineProperties,\n      getOwnPropertyDescriptor,\n      getOwnPropertyDescriptors,\n      prototype: { hasOwnProperty },\n    } = Object;\n\n    const { ownKeys } = Reflect;\n\n    /**\n     * For a special set of properties (defined in the repairPlan), it ensures\n     * that the effect of freezing does not suppress the ability to override\n     * these properties on derived objects by simple assignment.\n     *\n     * Because of lack of sufficient foresight at the time, ES5 unfortunately\n     * specified that a simple assignment to a non-existent property must fail if\n     * it would override a non-writable data property of the same name. (In\n     * retrospect, this was a mistake, but it is now too late and we must live\n     * with the consequences.) As a result, simply freezing an object to make it\n     * tamper proof has the unfortunate side effect of breaking previously correct\n     * code that is considered to have followed JS best practices, if this\n     * previous code used assignment to override.\n     */\n    function enableDerivedOverride(obj, prop, desc) {\n      if ('value' in desc && desc.configurable) {\n        const { value } = desc;\n\n        // eslint-disable-next-line no-inner-declarations\n        function getter() {\n          return value;\n        }\n\n        // Re-attach the data property on the object so\n        // it can be found by the deep-freeze traversal process.\n        getter.value = value;\n\n        // eslint-disable-next-line no-inner-declarations\n        function setter(newValue) {\n          if (obj === this) {\n            throw new TypeError(\n              `Cannot assign to read only property '${prop}' of object '${obj}'`,\n            );\n          }\n          if (hasOwnProperty.call(this, prop)) {\n            this[prop] = newValue;\n          } else {\n            defineProperties(this, {\n              [prop]: {\n                value: newValue,\n                writable: true,\n                enumerable: desc.enumerable,\n                configurable: desc.configurable,\n              },\n            });\n          }\n        }\n\n        defineProperties(obj, {\n          [prop]: {\n            get: getter,\n            set: setter,\n            enumerable: desc.enumerable,\n            configurable: desc.configurable,\n          },\n        });\n      }\n    }\n\n    function repairOneProperty(obj, prop) {\n      if (!obj) {\n        return;\n      }\n      const desc = getOwnPropertyDescriptor(obj, prop);\n      if (!desc) {\n        return;\n      }\n      enableDerivedOverride(obj, prop, desc);\n    }\n\n    function repairAllProperties(obj) {\n      if (!obj) {\n        return;\n      }\n      const descs = getOwnPropertyDescriptors(obj);\n      if (!descs) {\n        return;\n      }\n      ownKeys(descs).forEach(prop =>\n        enableDerivedOverride(obj, prop, descs[prop]),\n      );\n    }\n\n    function walkRepairPlan(obj, plan) {\n      if (!obj) {\n        return;\n      }\n      if (!plan) {\n        return;\n      }\n      ownKeys(plan).forEach(prop => {\n        const subPlan = plan[prop];\n        const subObj = obj[prop];\n        switch (subPlan) {\n          case true:\n            repairOneProperty(obj, prop);\n            break;\n\n          case '*':\n            repairAllProperties(subObj);\n            break;\n\n          default:\n            if (Object(subPlan) !== subPlan) {\n              throw TypeError(`Repair plan subPlan ${subPlan} is invalid`);\n            }\n            walkRepairPlan(subObj, subPlan);\n        }\n      });\n    }\n\n    // Do the repair.\n    walkRepairPlan(intrinsics, repairPlan);\n  }\n\n  // Copyright (C) 2018 Agoric\n\n  const FORWARDED_REALMS_OPTIONS = ['transforms'];\n\n  function createSESWithRealmConstructor(creatorStrings, Realm) {\n    function makeSESRootRealm(options) {\n      // eslint-disable-next-line no-param-reassign\n      options = Object(options); // Todo: sanitize\n      const shims = [];\n\n      const {\n        dataPropertiesToRepair: optDataPropertiesToRepair,\n        shims: optionalShims,\n        sloppyGlobals,\n        whitelist: optWhitelist\n      } = options;\n\n      const optionsRest = Object.assign({}, options);\n      delete optionsRest.dataPropertiesToRepair;\n      delete optionsRest.shims;\n      delete optionsRest.sloppyGlobals;\n      delete optionsRest.whitelist;\n\n      const wl = JSON.parse(JSON.stringify(optWhitelist || whitelist));\n      const repairPlan =\n        optDataPropertiesToRepair !== undefined\n          ? JSON.parse(JSON.stringify(optDataPropertiesToRepair))\n          : dataPropertiesToRepair;\n\n      // Forward the designated Realms options.\n      const realmsOptions = {};\n      FORWARDED_REALMS_OPTIONS.forEach(key => {\n        if (key in optionsRest) {\n          realmsOptions[key] = optionsRest[key];\n        }\n      });\n\n      if (sloppyGlobals) {\n        throw TypeError(`\\\nsloppyGlobals cannot be specified for makeSESRootRealm!\nYou probably want a Compartment instead, like:\n  const c = s.global.Realm.makeCompartment({ sloppyGlobals: true })`);\n      }\n\n      // \"allow\" enables real Date.now(), anything else gets NaN\n      // (it'd be nice to allow a fixed numeric value, but too hard to\n      // implement right now)\n      if (options.dateNowMode !== 'allow') {\n        shims.push(`(${tameDate})();`);\n      }\n\n      if (options.mathRandomMode !== 'allow') {\n        shims.push(`(${tameMath})();`);\n      }\n\n      // Intl is disabled entirely for now, deleted by removeProperties. If we\n      // want to bring it back (under the control of this option), we'll need\n      // to add it to the whitelist too, as well as taming it properly.\n      if (options.intlMode !== 'allow') {\n        // this shim also disables Object.prototype.toLocaleString\n        shims.push(`(${tameIntl})();`);\n      }\n\n      if (options.errorStackMode !== 'allow') {\n        shims.push(`(${tameError})();`);\n      } else {\n        // if removeProperties cleans these things from Error, v8 won't provide\n        // stack traces or even toString on exceptions, and then Node.js prints\n        // uncaught exceptions as \"undefined\" instead of a type/message/stack.\n        // So if we're allowing stack traces, make sure the whitelist is\n        // augmented to include them.\n        wl.namedIntrinsics.Error.captureStackTrace = true;\n        wl.namedIntrinsics.Error.stackTraceLimit = true;\n        wl.namedIntrinsics.Error.prepareStackTrace = true;\n      }\n\n      if (options.regexpMode !== 'allow') {\n        shims.push(`(${tameRegExp})();`);\n      }\n\n      // The getAnonIntrinsics function might be renamed by e.g. rollup. The\n      // removeProperties() function references it by name, so we need to force\n      // it to have a specific name.\n      const removeProp = `const getAnonIntrinsics = (${getAnonIntrinsics$1});\n               (${removeProperties})(this, ${JSON.stringify(wl)})`;\n      shims.push(removeProp);\n\n      // Add options.shims.\n      if (optionalShims) {\n        shims.push(...optionalShims);\n      }\n\n      const r = Realm.makeRootRealm(Object.assign({}, realmsOptions, { shims }));\n\n      // Build a harden() with an empty fringe. It will be populated later when\n      // we call harden(allIntrinsics).\n      const makeHardenerSrc = `(${makeHardener})`;\n      const harden = r.evaluate(makeHardenerSrc)();\n\n      const b = r.evaluate(creatorStrings);\n      b.createSESInThisRealm(r.global, creatorStrings, r);\n\n      // Allow harden to be accessible via the SES global.\n      r.global.SES.harden = harden;\n\n      if (options.consoleMode === 'allow') {\n        const s = `(${makeConsole})`;\n        r.global.console = r.evaluate(s)(console);\n      }\n\n      // Extract the intrinsics from the global.\n      const anonIntrinsics = r.evaluate(`(${getAnonIntrinsics$1})`)(r.global);\n      const namedIntrinsics = r.evaluate(`(${getNamedIntrinsics})`)(\n        r.global,\n        whitelist,\n      );\n\n      // Gather the intrinsics only.\n      const allIntrinsics = r.evaluate(`(${getAllPrimordials$1})`)(\n        namedIntrinsics,\n        anonIntrinsics,\n      );\n\n      // Gather the primordials and the globals.\n      const allPrimordials = r.evaluate(`(${getAllPrimordials})`)(\n        r.global,\n        anonIntrinsics,\n      );\n\n      // Repair the override mistake on the intrinsics only.\n      r.evaluate(`(${repairDataProperties})`)(allIntrinsics, repairPlan);\n\n      // Finally freeze all the primordials, and the global object. This must\n      // be the last thing we do that modifies the Realm's globals.\n      harden(allPrimordials);\n\n      // build the makeRequire helper, glue it to the new Realm\n      r.makeRequire = harden(r.evaluate(`(${makeMakeRequire})`)(r, harden));\n      return r;\n    }\n    const SES = {\n      makeSESRootRealm,\n    };\n\n    return SES;\n  }\n\n  function createSESInThisRealm(global, creatorStrings, parentRealm) {\n    // eslint-disable-next-line no-param-reassign,no-undef\n    global.SES = createSESWithRealmConstructor(creatorStrings, Realm);\n    // todo: wrap exceptions, effectively undoing the wrapping that\n    // Realm.evaluate does\n\n    const errorConstructors = new Map([\n      ['EvalError', EvalError],\n      ['RangeError', RangeError],\n      ['ReferenceError', ReferenceError],\n      ['SyntaxError', SyntaxError],\n      ['TypeError', TypeError],\n      ['URIError', URIError],\n    ]);\n\n    // callAndWrapError is copied from the Realm shim. Our SES.confine (from\n    // inside the realm) delegates to Realm.evaluate (from outside the realm),\n    // but we need the exceptions to come from our own realm, so we use this to\n    // reverse the shim's own callAndWrapError. TODO: look for a reasonable way\n    // to avoid the double-wrapping, maybe by changing the shim/Realms-spec to\n    // provide the safeEvaluator as a Realm.evaluate method (inside a realm).\n    // That would make this trivial: global.SES = Realm.evaluate (modulo\n    // potential 'this' issues)\n\n    // the comments here were written from the POV of a parent defending itself\n    // against a malicious child realm. In this case, we are the child.\n\n    function callAndWrapError(target, ...args) {\n      try {\n        return target(...args);\n      } catch (err) {\n        if (Object(err) !== err) {\n          // err is a primitive value, which is safe to rethrow\n          throw err;\n        }\n        let eName;\n        let eMessage;\n        let eStack;\n        try {\n          // The child environment might seek to use 'err' to reach the\n          // parent's intrinsics and corrupt them. `${err.name}` will cause\n          // string coercion of 'err.name'. If err.name is an object (probably\n          // a String of the parent Realm), the coercion uses\n          // err.name.toString(), which is under the control of the parent. If\n          // err.name were a primitive (e.g. a number), it would use\n          // Number.toString(err.name), using the child's version of Number\n          // (which the child could modify to capture its argument for later\n          // use), however primitives don't have properties like .prototype so\n          // they aren't useful for an attack.\n          eName = `${err.name}`;\n          eMessage = `${err.message}`;\n          eStack = `${err.stack || eMessage}`;\n          // eName/eMessage/eStack are now child-realm primitive strings, and\n          // safe to expose\n        } catch (ignored) {\n          // if err.name.toString() throws, keep the (parent realm) Error away\n          // from the child\n          throw new Error('unknown error');\n        }\n        const ErrorConstructor = errorConstructors.get(eName) || Error;\n        try {\n          throw new ErrorConstructor(eMessage);\n        } catch (err2) {\n          err2.stack = eStack; // replace with the captured inner stack\n          throw err2;\n        }\n      }\n    }\n\n    // We must not allow other child code to access that object. SES.confine\n    // closes over the parent's Realm object so it shouldn't be accessible from\n    // the outside.\n\n    // eslint-disable-next-line no-param-reassign\n    global.SES.confine = (code, endowments) =>\n      callAndWrapError(() => parentRealm.evaluate(code, endowments));\n    // eslint-disable-next-line no-param-reassign\n    global.SES.confineExpr = (code, endowments) =>\n      callAndWrapError(() => parentRealm.evaluate(`(${code})`, endowments));\n  }\n\n  exports.createSESInThisRealm = createSESInThisRealm;\n  exports.createSESWithRealmConstructor = createSESWithRealmConstructor;\n\n  return exports;\n\n}({}))";

  // Copyright (C) 2018 Agoric

  const SES = createSESWithRealmConstructor(creatorStrings, Realm);

  return SES;

}));


/***/ }),
/* 57 */
/***/ (function(module, exports) {

var indexOf = function (xs, item) {
    if (xs.indexOf) return xs.indexOf(item);
    else for (var i = 0; i < xs.length; i++) {
        if (xs[i] === item) return i;
    }
    return -1;
};
var Object_keys = function (obj) {
    if (Object.keys) return Object.keys(obj)
    else {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    }
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

var defineProp = (function() {
    try {
        Object.defineProperty({}, '_', {});
        return function(obj, name, value) {
            Object.defineProperty(obj, name, {
                writable: true,
                enumerable: false,
                configurable: true,
                value: value
            })
        };
    } catch(e) {
        return function(obj, name, value) {
            obj[name] = value;
        };
    }
}());

var globals = ['Array', 'Boolean', 'Date', 'Error', 'EvalError', 'Function',
'Infinity', 'JSON', 'Math', 'NaN', 'Number', 'Object', 'RangeError',
'ReferenceError', 'RegExp', 'String', 'SyntaxError', 'TypeError', 'URIError',
'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape',
'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'undefined', 'unescape'];

function Context() {}
Context.prototype = {};

var Script = exports.Script = function NodeScript (code) {
    if (!(this instanceof Script)) return new Script(code);
    this.code = code;
};

Script.prototype.runInContext = function (context) {
    if (!(context instanceof Context)) {
        throw new TypeError("needs a 'context' argument.");
    }
    
    var iframe = document.createElement('iframe');
    if (!iframe.style) iframe.style = {};
    iframe.style.display = 'none';
    
    document.body.appendChild(iframe);
    
    var win = iframe.contentWindow;
    var wEval = win.eval, wExecScript = win.execScript;

    if (!wEval && wExecScript) {
        // win.eval() magically appears when this is called in IE:
        wExecScript.call(win, 'null');
        wEval = win.eval;
    }
    
    forEach(Object_keys(context), function (key) {
        win[key] = context[key];
    });
    forEach(globals, function (key) {
        if (context[key]) {
            win[key] = context[key];
        }
    });
    
    var winKeys = Object_keys(win);

    var res = wEval.call(win, this.code);
    
    forEach(Object_keys(win), function (key) {
        // Avoid copying circular objects like `top` and `window` by only
        // updating existing context properties or new properties in the `win`
        // that was only introduced after the eval.
        if (key in context || indexOf(winKeys, key) === -1) {
            context[key] = win[key];
        }
    });

    forEach(globals, function (key) {
        if (!(key in context)) {
            defineProp(context, key, win[key]);
        }
    });
    
    document.body.removeChild(iframe);
    
    return res;
};

Script.prototype.runInThisContext = function () {
    return eval(this.code); // maybe...
};

Script.prototype.runInNewContext = function (context) {
    var ctx = Script.createContext(context);
    var res = this.runInContext(ctx);

    if (context) {
        forEach(Object_keys(ctx), function (key) {
            context[key] = ctx[key];
        });
    }

    return res;
};

forEach(Object_keys(Script.prototype), function (name) {
    exports[name] = Script[name] = function (code) {
        var s = Script(code);
        return s[name].apply(s, [].slice.call(arguments, 1));
    };
});

exports.isContext = function (context) {
    return context instanceof Context;
};

exports.createScript = function (code) {
    return exports.Script(code);
};

exports.createContext = Script.createContext = function (context) {
    var copy = new Context();
    if(typeof context === 'object') {
        forEach(Object_keys(context), function (key) {
            copy[key] = context[key];
        });
    }
    return copy;
};


/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * syncer.js
 *
 * Enqueues transactions and syncs jigs
 */

const { ProtoTransaction } = __webpack_require__(21)
const { JigControl } = __webpack_require__(9)
const Xray = __webpack_require__(12)
const util = __webpack_require__(4)
const Location = __webpack_require__(8)

/**
 * Proto-transaction: A temporary structure Run uses to build transactions. This structure
 * has every action and definition that will go into the real transaction, but stored using
 * actual references to the objects instead of location strings. Run turns the proto-transaction
 * into a real transaction by converting all references into location strings. This is necessary
 * when there are queued proto-transactions and the locations may not be known yet.
 */

module.exports = class Syncer {
  constructor (run) {
    this.run = run
    this.blockchain = run.blockchain
    this.code = run.code
    this.state = run.state
    this.pay = (...args) => { return run.purse.pay(...args) }
    this.sign = (...args) => { return run.owner.sign(...args) }
    this.queued = [] // queued proto-transactions to send
    this.syncListeners = [] // callbacks for when sync completes (Array<{resolve,reject}>)
    this.lastPosted = new Map() // The last onchain location for queued jigs (Origin->Location)
    this.onBroadcastListeners = new Set() // callbacks for when a transaction is broadcast
  }

  publish (protoTx) {
    for (const [key, value] of protoTx.locations) {
      if (!this.lastPosted.has(key)) this.lastPosted.set(key, value)
    }
    this.queued.push(protoTx)
    if (this.queued.length === 1) { this.publishNext().catch(e => {}) }
  }

  async publishNext () {
    // next is the proto-transaction to publish
    const next = this.queued[0]
    if (!next.actions.length && !next.code.length) return this.finish()

    const net = util.networkSuffix(this.blockchain.network)

    let tx = null

    try {
      const result = next.buildBsvTransaction(this.run)

      const { refs, spentJigs, spentLocations } = result
      tx = result.tx

      // check that each read reference is the latest
      const refTxids = refs.map(ref => ref.slice(0, 64))
      const refVouts = refs.map(ref => parseInt(ref.slice(66)))
      const refTxns = refTxids.length
        ? await Promise.all(refTxids.map(txid => this.blockchain.fetch(txid))) : []
      refTxns.forEach((txn, n) => {
        if (typeof txn.outputs[refVouts[n]].spentTxId === 'undefined') {
          throw new Error(`Read ${refs[n]} may not be latest. Blockchain did not return spentTxId. Aborting.`)
        }
        // TODO: only has to be plausibly the latest to others
        if (txn.outputs[refVouts[n]].spentTxId !== null) {
          throw new Error(`Read ${refs[n]} is not the latest. Must sync() jigs`)
        }
      })

      // Pay then sign. The jig inputs must be signed after all payment inputs/outputs are added.
      // We don't pay for imported transactions because those must be paid for manually.
      if (!next.imported) {
        tx = await this.pay(tx)
      }
      tx = await this.sign(tx)

      // check that we have all signatures. this is more of a friendly error.
      for (let i = 0; i < spentJigs.length; i++) {
        if (!tx.inputs[i].isFullySigned()) {
          throw new Error(`Signature missing for ${spentJigs[i].constructor.name}

origin: ${spentJigs[i].origin}
location: ${spentLocations[i]}
owner: ${spentJigs[i].owner}`)
        }
      }

      await this.broadcast(tx)

      this.onBroadcastListeners.forEach(listener => listener(tx))
    } catch (e) {
      // an error occurred either while building or sending the transaction

      // notify each listener that is waiting for sync() to return
      const unhandled = this.syncListeners.length === 0
      if (unhandled) this.run.logger.error(`Unhandled ${e.toString()}`)
      this.syncListeners.forEach(c => c.reject(e))
      this.syncListeners = []

      // roll back for each pending transaction including this one
      // if the error is unhandled (no call to sync), then make the jigs permanently unusable
      this.queued.forEach(protoTx => protoTx.rollback(this.lastPosted, this.run, e, unhandled))

      // empty the queue and reset
      this.queued = []
      this.lastPosted = new Map()

      return
    }

    // the transaction was successfully posted. updated lastPosted with this transaction
    // for all jigs that are still queued, and notify each definition to update its
    // origin and location with the now-known transaction.

    const stillQueued = target => this.queued.slice(1).some(
      protoTx => protoTx.outputs.some(target2 => util.sameJig(target, target2)))

    next.outputs.forEach((target, index) => {
      const vout = 1 + next.code.length + index
      if (target.origin[0] === '_') { target.origin = `${tx.hash}_o${vout}` }
      if (stillQueued(target)) {
        this.lastPosted.set(target.origin, `${tx.hash}_o${vout}`)
      } else {
        target.location = `${tx.hash}_o${vout}`; this.lastPosted.delete(target.origin)
      }

      // also update after because we're going to use it to cache its state
      next.after.get(target).restore().origin = target.origin
      next.after.get(target).restore().location = `${tx.hash}_o${vout}`
    })

    next.code.forEach((def, index) => def.success(`${tx.hash}_o${index + 1}`))

    // cache each jig's state. the format for caching is a packed reference model
    // where local locations are preferred over full locations, and only outputs
    // are used, never inputs. only outputs are used because if a jig is inputted,
    // then it will also be outputted, and we are always referring to a cached
    // state after a transaction.
    for (const jig of next.outputs) {
      const after = next.after.get(jig)

      // Note: Converting saved state json to rich and then back to json again is a
      // tad excessive. We could probably do a transformation on the json itself.

      const restored = after.restore()

      const restoredLocation = restored.location
      if (restored.origin.startsWith(tx.hash)) delete restored.origin
      if (restored.location.startsWith(tx.hash)) delete restored.location

      const serialized = JigControl.disableProxy(() => {
        const tokenSaver = token => {
          const location = this.lastPosted.get(token.origin) || token.location
          return location.startsWith(tx.hash) ? location.slice(64) : location
        }

        const xray = new Xray()
          .allowTokens()
          .useIntrinsics(this.run.code.intrinsics)
          .useTokenSaver(tokenSaver)

        return xray.serialize(restored)
      })

      // TODO: If I could use the actions protocol, then I could have the saved state be
      // the state cache state of the jig. For now, I would just deserialize and serialize again.

      let type = jig.constructor[`origin${net}`]
      if (type.startsWith(tx.hash)) type = type.slice(64)

      const cachedState = { type, state: serialized }
      await this.state.set(restoredLocation, cachedState)
    }

    // notify the owner
    next.code.forEach(def => this.run.owner._update(def.sandbox))
    next.outputs.forEach(jig => this.run.owner._update(next.proxies.get(jig)))

    this.finish()
  }

  async broadcast (tx) {
    try {
      await this.blockchain.broadcast(tx)
    } catch (e) {
      let message = `Broadcast failed, ${e.message}`

      if (e.toString().indexOf('tx has no inputs') !== -1 || e.toString().indexOf('tx fee too low') !== -1) {
        const suggestion = 'Hint: Is the purse funded to pay for this transaction?'
        message = `${message}\n\n${suggestion}`
      }

      throw new Error(message)
    }
  }

  async finish () {
    this.queued.shift()
    if (this.queued.length) { this.publishNext(); return }
    this.syncListeners.forEach(c => c.resolve())
    this.syncListeners = []
  }

  async sync (options = {}) {
    // put all published TXIDs into a do not refresh set to speed up forward sync
    const recentlyPublishedTxids = new Set()
    const onBroadcast = tx => recentlyPublishedTxids.add(tx.hash)
    this.onBroadcastListeners.add(onBroadcast)

    // Helper method to forward sync if enabled and we have a jig to update. Returns the jig
    const forwardSync = async () => {
      const shouldForwardSync = typeof options.forward === 'undefined' || options.forward

      if (shouldForwardSync && options.target) {
        return this.fastForward(options.target, recentlyPublishedTxids)
      } else {
        return options.target
      }
    }

    // if there are no pending transactions being published, then immediately forward sync
    if (!this.queued.length) return forwardSync()

    // otherwise, create a promise that resolves when the current sync is done.
    // we will start forward syncing after
    const donePublishing = new Promise((resolve, reject) => {
      this.syncListeners.push({ resolve, reject })
    })

    // after the pending transactions are published, forward sync regardless of whether there
    // were errors. this lets the user get into a good state again if they were out of sync.
    const removeListener = () => this.onBroadcastListeners.delete(onBroadcast)
    const forwardSyncThenThrowError = e => forwardSync().then(() => { throw e }).catch(e2 => { throw e })
    return donePublishing
      .then(() => { removeListener(); return forwardSync() })
      .catch(e => { removeListener(); return forwardSyncThenThrowError(e) })
  }

  /**
   * Fast-forwards a jig and all jigs it references to their latest state
   * @param {Jig} jig jig to update
   * @param {Set<txid: string>} alreadyForceFetched Transaction IDs that were force-refreshed already
   * @param {Map<origin: string, latestState: Jig>} synced jigs already updated
   */
  async fastForward (jig, alreadyForceFetched = new Set(), synced = new Map()) {
    // If we have already fast-forwarded this jig, copy its state and return
    const cached = synced.get(jig.origin)
    if (cached) return JigControl.disableProxy(() => Object.assign(jig, cached))

    // Load the transaction this jig is in to see if it's spent
    let loc = Location.parse(jig.location)
    let tx = await this.blockchain.fetch(loc.txid, !alreadyForceFetched.has(loc.txid))
    alreadyForceFetched.add(loc.txid)

    // Update this jig transaction by transaction until there are no more updates left
    while (tx.outputs[loc.vout].spentTxId !== null) {
      tx = await this.fetchNextTransaction(tx, loc.vout, alreadyForceFetched)
      await this.updateJigWithNextTransaction(jig, tx)
      loc = Location.parse(jig.location)
    }

    // Mark this jig as updated so it isn't updated again by a circular reference
    synced.set(jig.origin, jig)

    // Fast forward all jigs inside of this one so the whole thing is up to date
    await this.fastForwardInnerTokens(jig, alreadyForceFetched, synced)

    return jig
  }

  async fetchNextTransaction (tx, vout, alreadyForceFetched) {
    const output = tx.outputs[vout]

    // If we don't know if this output is spent, then we throw an error, because we don't want
    // users to think they are in the latest state when they are not.
    if (typeof output.spentTxId === 'undefined') {
      const message = 'Failed to forward sync jig'
      const reason = 'The blockchain API does not support the spentTxId field.'
      const hint = 'Hint: To just publish updates without forward sync, use `jig.sync({ forward: false })`.'
      throw new Error(`${message}\n\n${reason}\n\n${hint}`)
    }

    // Fetch the next transaction this jig is in
    const nextTx = await this.blockchain.fetch(output.spentTxId, !alreadyForceFetched.has(output.spentTxId))
    alreadyForceFetched.add(output.spentTxId)

    const input = nextTx.inputs[output.spentIndex]
    if (!input) {
      const message = 'Blockchain API returned an incorrect spentIndex'
      const data = `Txid: ${tx.hash}\nSpent Index: ${output.spentIndex}`
      const hint = 'Hint: Check that the blockchain API is working correctly'
      throw new Error(`${message}\n\n${data}\n\n${hint}`)
    }

    if (input.prevTxId.toString('hex') !== tx.hash || input.outputIndex !== vout) {
      const message = 'Blockchain API returned an incorrect spentTxId'
      const data = `Txid: ${tx.hash}\nSpent Txid: ${output.spentTxId}`
      const hint = 'Hint: Check that the blockchain API is working correctly'
      throw new Error(`${message}\n\n${data}\n\n${hint}`)
    }

    return nextTx
  }

  async updateJigWithNextTransaction (jig, tx) {
    // Import the tx and update our jig, then make sure it was updated
    const protoTx = new ProtoTransaction()
    await protoTx.import(tx, this.run, jig, true)
    const jigProxies = Array.from(protoTx.proxies.values())
    if (!jigProxies.some(proxy => proxy === jig)) {
      const message = 'Expected but did not find a jig in its spent transaction'
      const data = `Jig origin: ${jig.origin}\nTxid: ${tx.hash}`
      const hint = 'This is an internal Run bug. Please report it to the library developers.'
      throw new Error(`${message}\n\n${data}\n\n${hint}`)
    }
  }

  async fastForwardInnerTokens (x, alreadyForceFetched, synced) {
    const xray = new Xray()
      .allowTokens()
      .deeplyScanTokens()
      .useIntrinsics(this.run.code.intrinsics)

    xray.scan(x)

    const { Jig } = __webpack_require__(15)

    for (const token of xray.tokens) {
      if (token !== x && token instanceof Jig) {
        await this.fastForward(token, alreadyForceFetched, synced)
      }
    }
  }
}


/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * purse.js
 *
 * Generic Pay API and default Purse implementation to pay for transactions
 */

const bsv = __webpack_require__(0)
const util = __webpack_require__(4)
const { Blockchain } = __webpack_require__(22)

// ------------------------------------------------------------------------------------------------
// Pay API
// ------------------------------------------------------------------------------------------------

/**
 * API to pay for transactions
 */
class Pay {
  /**
   * Adds inputs and outputs to pay for a transaction
   * @param {bsv.Transaction} tx Transaction to pay for
   * @returns {bsv.Transaction} Paid transaction
   */
  async pay (tx) {
    throw new Error('Not implemented')
  }
}

// ------------------------------------------------------------------------------------------------
// Local Purse
// ------------------------------------------------------------------------------------------------

/**
 * Local wallet that implements the Pay API
 */
class Purse {
  constructor (options = {}) {
    this.logger = parseLogger(options.logger)
    this.blockchain = parseBlockchain(options.blockchain)
    this._splits = parseSplits(options.splits)
    this._feePerKb = parseFeePerKb(options.feePerKb)

    const bsvNetwork = util.bsvNetwork(this.blockchain.network)
    this.bsvPrivateKey = new bsv.PrivateKey(options.privkey, bsvNetwork)
    this.privkey = this.bsvPrivateKey.toString()
    this.bsvAddress = this.bsvPrivateKey.toAddress()
    this.address = this.bsvAddress.toString()
  }

  get splits () { return this._splits }
  set splits (value) { this._splits = parseSplits(value) }

  get feePerKb () { return this._feePerKb }
  set feePerKb (value) { this._feePerKb = parseFeePerKb(value) }

  async pay (tx) {
    let utxos = await this.blockchain.utxos(this.address)

    if (!utxos.length) {
      // This isn't an error, because sometimes a transaction can be paid for
      // using BSV in backed jigs, and no purse outputs are needed.
      const suggestion = `Hint: Have you funded the purse address ${this.address}?`
      if (this.logger) this.logger.warn(`No purse utxos\n\n${suggestion}`)
    }

    // Shuffle the UTXOs so that when we start to add them, we don't always start in
    // the same order. This often reduces mempool chain limit errors.

    function shuffle (a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }

    utxos = shuffle(utxos)

    // We're going to calculate how many inputs and outputs we need. This is tricky, because
    // every additional input and output affects the fees required. We also want to split our
    // UTXOs, and calculating the amount to split is tricky. To do this, we're going to start
    // with a base satoshi amount we need to add inputs for, the baseSatoshisRequired. If adding
    // inputs and outputs didn't change the fees, this is what we would pay. From there, we're
    // going to walk through our UTXOS. For each one, first we'll record out how many new outputs we
    // need, and then we'll add the necessary inputs. After we figure out how many inputs to add,
    // and how many outputs we'll have, we can calculate how big the outputs need to be, and
    // then add the outputs for real to the transaction.

    const baseSatoshisRequired = Math.max(1000, tx._estimateFee() + tx._getOutputAmount())

    let satoshisRequired = baseSatoshisRequired
    let satoshisAddedInUtxos = 0
    let satoshisSpentTotal = tx._getInputAmount()
    let numUtxosSpent = 0
    let numOutputsToCreate = 0

    tx.feePerKb(this.feePerKb)

    for (const utxo of utxos) {
      tx.from(utxo)
      satoshisAddedInUtxos += utxo.satoshis
      satoshisSpentTotal += utxo.satoshis
      numUtxosSpent += 1
      satoshisRequired += 150 // 150 bytes per P2PKH input seems to be average

      const numOutputsToAdd = this.splits - utxos.length + numUtxosSpent - numOutputsToCreate
      for (let i = 0; i < numOutputsToAdd; i++) {
        satoshisRequired += 40 // 40 bytes per P2PKH output seems to be average
        satoshisRequired += 546 // We also have to add the dust amounts
        numOutputsToCreate += 1
      }

      if (satoshisSpentTotal > satoshisRequired + 50) break // Add a 50 sat buffer
    }

    // Make sure we have enough utxos
    if (satoshisSpentTotal <= satoshisRequired + 50) throw new Error('Not enough funds')

    // Add all the outputs
    const satoshisRequiredForFees = satoshisRequired - numOutputsToCreate * 546
    const satoshisPerOutput = Math.floor((satoshisAddedInUtxos - satoshisRequiredForFees) / numOutputsToCreate)
    for (let i = 0; i < numOutputsToCreate; i++) {
      if (i === numOutputsToCreate - 1) {
        tx.change(this.bsvAddress)
      } else {
        tx.to(this.bsvAddress, satoshisPerOutput)
      }
    }

    tx.sign(this.bsvPrivateKey)

    return tx
  }

  async balance () {
    return (await this.utxos()).reduce((sum, utxo) => sum + utxo.satoshis, 0)
  }

  async utxos () {
    const utxos = await this.blockchain.utxos(this.address)
    const txns = await Promise.all(utxos.map(o => this.blockchain.fetch(o.txid)))
    return utxos.filter((o, i) => util.outputType(txns[i], o.vout) === 'other')
  }
}

// ------------------------------------------------------------------------------------------------
// Parameter validation
// ------------------------------------------------------------------------------------------------

function parseLogger (logger) {
  switch (typeof logger) {
    case 'object': return logger
    case 'undefined': return null
    default: throw new Error(`Invalid logger option: ${logger}`)
  }
}

function parseSplits (splits) {
  switch (typeof splits) {
    case 'number':
      if (!Number.isInteger(splits)) throw new Error(`Option splits must be an integer: ${splits}`)
      if (splits <= 0) throw new Error(`Option splits must be at least 1: ${splits}`)
      return splits
    case 'undefined':
      // The defaults to 10 because with the mempool chain limit being 25,
      // and 10 splits to choose from, this creates a binomial distribution
      // where we would expect not to hit this limit 98.7% of the time after 120
      // transaction. This would support one transaction every 5 seconds on average.
      return 10
    default: throw new Error(`Invalid splits option: ${splits}`)
  }
}

function parseFeePerKb (feePerKb) {
  switch (typeof feePerKb) {
    case 'number':
      if (!Number.isFinite(feePerKb)) throw new Error(`Option feePerKb must be finite: ${feePerKb}`)
      if (feePerKb <= 0) throw new Error(`Option feePerKb must be at least 1: ${feePerKb}`)
      return feePerKb
    case 'undefined':
      // Current fees are 1 sat per byte, but miners are lowering to 0.5 sat/byte.
      // We should consider lowering this to 0.5 sat/byte soon.
      return 1000
    default: throw new Error(`Invalid feePerKb option: ${feePerKb}`)
  }
}

function parseBlockchain (blockchain) {
  switch (typeof blockchain) {
    case 'object':
      if (!Blockchain.isBlockchain(blockchain)) throw new Error('Invalid blockchain option')
      return blockchain
    case 'undefined': throw new Error('Option blockchain is required')
    default: throw new Error(`Invalid blockchain option: ${blockchain}`)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { Pay, Purse }


/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(61);

/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);
var bind = __webpack_require__(23);
var Axios = __webpack_require__(63);
var mergeConfig = __webpack_require__(29);
var defaults = __webpack_require__(26);

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = __webpack_require__(30);
axios.CancelToken = __webpack_require__(75);
axios.isCancel = __webpack_require__(25);

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = __webpack_require__(76);

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;


/***/ }),
/* 62 */
/***/ (function(module, exports) {

/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

module.exports = function isBuffer (obj) {
  return obj != null && obj.constructor != null &&
    typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}


/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);
var buildURL = __webpack_require__(24);
var InterceptorManager = __webpack_require__(64);
var dispatchRequest = __webpack_require__(65);
var mergeConfig = __webpack_require__(29);

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig(this.defaults, config);
  config.method = config.method ? config.method.toLowerCase() : 'get';

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;


/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;


/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);
var transformData = __webpack_require__(66);
var isCancel = __webpack_require__(25);
var defaults = __webpack_require__(26);
var isAbsoluteURL = __webpack_require__(73);
var combineURLs = __webpack_require__(74);

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};


/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};


/***/ }),
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};


/***/ }),
/* 68 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var createError = __webpack_require__(28);

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};


/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }

  error.request = request;
  error.response = response;
  error.isAxiosError = true;

  error.toJSON = function() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code
    };
  };
  return error;
};


/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};


/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
    (function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement('a');
      var originURL;

      /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
      function resolveURL(url) {
        var href = url;

        if (msie) {
        // IE needs attribute set twice to normalize properties
          urlParsingNode.setAttribute('href', href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute('href', href);

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
      return function isURLSameOrigin(requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
        return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
      };
    })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    })()
);


/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(5);

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
    (function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + '=' + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push('expires=' + new Date(expires).toGMTString());
          }

          if (utils.isString(path)) {
            cookie.push('path=' + path);
          }

          if (utils.isString(domain)) {
            cookie.push('domain=' + domain);
          }

          if (secure === true) {
            cookie.push('secure');
          }

          document.cookie = cookie.join('; ');
        },

        read: function read(name) {
          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove: function remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      };
    })() :

  // Non standard browser env (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return {
        write: function write() {},
        read: function read() { return null; },
        remove: function remove() {}
      };
    })()
);


/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};


/***/ }),
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};


/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var Cancel = __webpack_require__(30);

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;


/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};


/***/ }),
/* 77 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * owner.js
 *
 * Owner API that manages jigs and signs transactions
 */

const bsv = __webpack_require__(0)
const util = __webpack_require__(4)

class Owner {
  constructor (keyOrAddress, options) {
    const bsvNetwork = util.bsvNetwork(options.network)
    this.logger = options.logger
    this.run = options.run
    keyOrAddress = keyOrAddress || new bsv.PrivateKey(bsvNetwork)

    // Try creating the private key on mainnet and testnet
    try {
      const bsvPrivateKey = new bsv.PrivateKey(keyOrAddress, bsvNetwork)
      if (bsvPrivateKey.toString() !== keyOrAddress.toString()) throw new Error()
      return this._fromPrivateKey(bsvPrivateKey)
    } catch (e) {
      if (e.message === 'Private key network mismatch') throw e
    }

    // Try creating from a public key
    try {
      return this._fromPublicKey(new bsv.PublicKey(keyOrAddress, { network: bsvNetwork }))
    } catch (e) { }

    // Try creating from an address
    try {
      return this._fromAddress(new bsv.Address(keyOrAddress, bsvNetwork))
    } catch (e) {
      if (e.message === 'Address has mismatched network type.') throw e
    }

    throw new Error(`bad owner key or address: ${keyOrAddress}`)
  }

  _fromPrivateKey (bsvPrivateKey) {
    this.bsvPrivateKey = bsvPrivateKey
    this.privkey = bsvPrivateKey.toString()
    return this._fromPublicKey(bsvPrivateKey.publicKey)
  }

  _fromPublicKey (bsvPublicKey) {
    this.bsvPublicKey = bsvPublicKey
    this.pubkey = bsvPublicKey.toString()
    return this._fromAddress(bsvPublicKey.toAddress())
  }

  _fromAddress (bsvAddress) {
    this.bsvAddress = bsvAddress
    this.address = bsvAddress.toString()

    // Each ref should only be stored once. If we have an origin, prefer it
    this.refs = new Map() // origin|Jig|Class -> Jig|Class

    return this
  }

  get jigs () {
    try {
      return Array.from(this.refs.values())
        .filter(ref => ref instanceof this.run.constructor.Jig)
    } catch (e) {
      if (this.logger) this.logger.error(`Bad token found in owner refs. Removing.\n\n${e}`)
      this._removeErrorRefs()
      return this.jigs
    }
  }

  get code () {
    try {
      return Array.from(this.refs.values())
        .filter(ref => !(ref instanceof this.run.constructor.Jig))
    } catch (e) {
      if (this.logger) this.logger.error(`Bad token found in owner refs. Removing.\n\n${e}`)
      this._removeErrorRefs()
      return this.code
    }
  }

  _removeErrorRefs () {
    let uselessVar = true
    const toRemove = []
    for (const [key, ref] of this.refs) {
      try {
        // If a ref failed to deploy, then it will have ! in its origin and throw here
        const isJig = ref instanceof this.run.constructor.Jig
        // We need to do something with the result to keep it from being minified away.
        uselessVar = uselessVar ? !isJig : isJig
      } catch (e) {
        toRemove.push(key)
      }
    }
    toRemove.forEach(key => this.refs.delete(key))
  }

  async sign (tx) {
    if (this.bsvPrivateKey) tx.sign(this.bsvPrivateKey)
    return tx
  }

  async sync () {
    // post any pending transactions
    await this.run.syncer.sync()

    // query the latest jigs and code, but only do once at a time
    if (!this._query) {
      this._query = new Promise((resolve, reject) => {
        this._queryLatest()
          .then(() => { this._query = null; resolve() })
          .catch(e => { this._query = null; reject(e) })
      })
    }
    return this._query
  }

  async _queryLatest () {
    const newUtxos = await this.run.blockchain.utxos(this.address)

    // create a new ref set initially comprised of all pending refs, since they won't
    // be in the utxos, and also a map of our non-pending jigs to their present
    // locations so we don't reload them.
    const newRefs = new Map()
    const locationMap = new Map()
    for (const [key, ref] of this.refs) {
      if (typeof key !== 'string') newRefs.set(key, ref)
      try { locationMap.set(ref.location, ref) } catch (e) { }
    }

    // load each new utxo, and if we come across a jig we already know, re-use it
    for (const utxo of newUtxos) {
      const location = `${utxo.txid}_o${utxo.vout}`
      const prevRef = locationMap.get(location)
      if (prevRef) {
        newRefs.delete(prevRef)
        newRefs.set(location, prevRef)
        continue
      }
      try {
        const ref = await this.run.load(location)
        newRefs.set(ref.origin, ref)
      } catch (e) {
        if (this.logger) this.logger.error(`Failed to load owner location ${location}\n\n${e.toString()}`)
      }
    }

    this.refs = newRefs
  }

  _update (ref) {
    this.refs.delete(ref)
    try {
      if (ref.owner === this.pubkey) {
        try {
          if (typeof ref.origin === 'undefined') throw new Error()
          if (ref.origin.startsWith('_')) throw new Error()
          this.refs.set(ref.origin, ref)
        } catch (e) { this.refs.set(ref, ref) }
      } else {
        try { this.refs.delete(ref.origin) } catch (e) { }
      }
    } catch (e) { }
  }
}

module.exports = Owner


/***/ }),
/* 78 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * mockchain.js
 *
 * In-memory Blockchain implementation
 */

const { Address, Transaction } = __webpack_require__(0)

module.exports = class Mockchain {
  constructor (options = {}) {
    // The mockchain persists across instances of Run, just like testnet and mainnet
    if (options.lastBlockchain && options.lastBlockchain instanceof Mockchain) {
      return options.lastBlockchain
    }

    this.network = 'mock'
    this.transactions = new Map() // txid -> Transaction
    this.utxosByLocation = new Map() // Map<txid_oN, utxo>
    this.utxosByAddress = new Map() // address -> Set<location>
    this.mempool = new Set() // Set<Transaction>
    this.mempoolChainLimit = 25
    this.blockHeight = -1
  }

  async broadcast (tx) {
    // Basic transaction checks
    if (tx.inputs.length === 0) throw new Error('tx has no inputs')
    if (tx.outputs.length === 0) throw new Error('tx has no outputs')
    if (tx.getFee() < tx.toBuffer().length) throw new Error('tx fee too low')
    if (tx.verify() !== true) throw new Error(tx.verify())
    if (tx.isFullySigned() !== true) throw new Error('tx not fully signed')

    // Check that each input exists and is not spent
    const spentLocations = new Set()
    tx.inputs.forEach((input, vin) => {
      const location = `${input.prevTxId.toString('hex')}_o${input.outputIndex}`
      if (!this.utxosByLocation.has(location)) throw new Error(`tx input ${vin} missing or spent`)
      if (spentLocations.has(location)) throw new Error(`already spent input ${vin}`)
      spentLocations.add(location)
    })

    // Check that the mempool chain is < the mempool chain limit
    tx.unconfirmedHeight = Math.max(...tx.inputs.map(input => {
      const txIn = this.transactions.get(input.prevTxId.toString('hex'))
      return txIn.unconfirmedHeight + 1
    }))
    if (tx.unconfirmedHeight > this.mempoolChainLimit) {
      const suggestion = 'Hint: Use run.blockchain.block() to produce blocks on the mockchain.'
      throw new Error(`too-long-mempool-chain\n\n${suggestion}`)
    }

    // Memove spent outputs
    tx.inputs.forEach((input, vin) => {
      const prevTxId = input.prevTxId.toString('hex')
      const location = `${prevTxId}_o${input.outputIndex}`
      const prevTx = this.transactions.get(prevTxId)
      const address = prevTx.outputs[input.outputIndex].script.toAddress('testnet').toString()
      this.utxosByLocation.delete(location)
      this.utxosByAddress.get(address).delete(location)
    })

    // Add the transaction to the mockchain
    tx.time = tx.time || Date.now()
    tx.blockHeight = -1
    tx.confirmations = 0
    this.transactions.set(tx.hash, tx)
    this.mempool.add(tx)

    // Update the spentTxId of this tx and spent outputs
    tx.outputs.forEach(o => { o.spentTxId = null; o.spentIndex = null; o.spentHeight = null })
    tx.inputs.forEach((i, vin) => {
      const output = this.transactions.get(i.prevTxId.toString('hex')).outputs[i.outputIndex]
      output.spentTxId = tx.hash
      output.spentIndex = vin
      output.spentHeight = -1
    })

    // Add each output to our utxo set
    tx.outputs.forEach((output, vout) => {
      const utxo = { txid: tx.hash, vout, script: output.script, satoshis: output.satoshis }
      const location = `${tx.hash}_o${vout}`
      this.utxosByLocation.set(location, utxo)
      const address = output.script.toAddress('testnet').toString()
      const addressUtxos = this.utxosByAddress.get(address) || new Set()
      addressUtxos.add(location)
      this.utxosByAddress.set(address, addressUtxos)
    })
  }

  async fetch (txid, refresh = false) {
    const tx = this.transactions.get(txid)
    if (!tx) throw new Error(`tx not found: ${txid}`)
    return tx
  }

  async utxos (address) {
    const addr = new Address(address, 'testnet').toString()
    const addressUtxos = this.utxosByAddress.get(addr)
    if (!addressUtxos) return []
    return Array.from(addressUtxos).map(location => this.utxosByLocation.get(location))
  }

  fund (address, satoshis) {
    const random = Math.random().toString()
    const tx = new Transaction().addData(random).to(new Address(address, 'testnet'), satoshis)
    tx.time = Date.now()
    tx.confirmations = 0
    tx.blockHeight = -1
    tx.unconfirmedHeight = 0
    this.transactions.set(tx.hash, tx)
    const output = tx.outputs[1]
    const utxo = { txid: tx.hash, vout: 1, script: output.script, satoshis: output.satoshis }
    const location = `${tx.hash}_o1`
    this.utxosByLocation.set(location, utxo)
    const addressUtxos = this.utxosByAddress.get(address.toString()) || new Set()
    addressUtxos.add(location)
    this.utxosByAddress.set(address.toString(), addressUtxos)
  }

  block () {
    this.blockHeight += 1

    // Take all of the mempool transactions and mark them with a block
    for (const tx of this.mempool) {
      tx.blockHeight = this.blockHeight
      tx.unconfirmedHeight = 0
      for (const input of tx.inputs) {
        const txIn = this.transactions.get(input.prevTxId.toString('hex'))
        txIn.outputs[input.outputIndex].spentHeight = this.blockHeight
      }
    }

    this.mempool = new Set()
  }
}


/***/ }),
/* 79 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * state.js
 *
 * State API and its default StateCache implementation that ships with Run
 */

const Location = __webpack_require__(8)

// ------------------------------------------------------------------------------------------------

/**
 * API to save and provide jig states quickly.
 *
 * Jig states come in a special format and should not be created by hand. They are deterministic
 * and will not change for a given location.
 */
class State {
  /**
   * Gets the known state of a jig if it exists
   *
   * If this is an LRU cache, get should also bump the jig to the front.
   * @param {string} location Jig location string
   * @returns State object previously given with set, or undefined if it's not available
   */
  async get (location) { throw new Error('Not implemented') }

  /**
   * Saves the known state of a jig
   * @param {string} location Jig location to save
   * @param {object} state Known state
   */
  async set (location, state) { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------

/**
 * Default implementation of the State API that stores jig states in memory in a 10MB LRU cache
 */
class StateCache {
  constructor (options = {}) {
    this.cache = new Map() // location -> state
    this.sizeBytes = 0
    const maxSizeMB = typeof options.maxSizeMB === 'undefined' ? 10 : options.maxSizeMB
    this.maxSizeBytes = Math.floor(maxSizeMB * 1000 * 1000)
  }

  async get (location) {
    Location.parse(location)

    const had = this.cache.has(location)
    const value = this.cache.get(location)

    if (had) {
      // bump the state to the top
      this.set(location, value)

      return value
    }
  }

  async set (location, state) {
    Location.parse(location)

    function deepEqual (a, b) {
      if (typeof a !== typeof b) return false
      if (typeof a !== 'object' || !a || !b) return a === b
      const aKeys = Array.from(Object.keys(a))
      const bKeys = Array.from(Object.keys(b))
      if (aKeys.length !== bKeys.length) return false
      return !aKeys.some(key => !deepEqual(a[key], b[key]))
    }

    const had = this.cache.has(location)
    const previous = this.cache.get(location)

    // If we are overwriting a previous value, check that the states are the same.
    if (had) {
      if (!deepEqual(state, previous)) {
        const hint = 'This is an internal Run bug. Please report it to the library developers.'
        throw new Error(`Attempt to set different states for the same location: ${location}\n\n${hint}`)
      }

      this.cache.delete(location)
    }

    this.cache.set(location, state)

    if (had) return

    this.sizeBytes += StateCache._estimateSize(state)

    while (this.sizeBytes > this.maxSizeBytes) {
      const oldestLocation = this.cache.keys().next().value
      const state = this.cache.get(oldestLocation)
      this.cache.delete(oldestLocation)
      this.sizeBytes -= StateCache._estimateSize(state)
    }
  }

  static _estimateSize (state) {
    // Assumes only JSON-serializable values
    // Assume each property has a 1 byte type field, and pointers are 4 bytes.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures
    switch (typeof state) {
      case 'boolean': return 5
      case 'number': return 9
      case 'string': return state.length * 2 + 1
      case 'object': {
        if (!state) return 5
        const keys = Object.keys(state)
        let size = 1 + keys.length * 4
        keys.forEach(key => {
          size += StateCache._estimateSize(key)
          size += StateCache._estimateSize(state[key])
        })
        return size
      }
      default: return 5
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { State, StateCache }


/***/ }),
/* 80 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * token.js
 *
 * Token jig that provides ERC-20 like support
 */

const { Jig } = __webpack_require__(9)
const expect = __webpack_require__(31)

class Token extends Jig {
  init (amount, _tokenToDecrease, _tokensToCombine) {
    expect(this.constructor).not.toBe(Token, 'Token must be extended')

    // case: creating a change token
    if (typeof _tokenToDecrease !== 'undefined') {
      expect(_tokenToDecrease).toBeObject('bad token type')
      expect(_tokenToDecrease.constructor).toBe(this.constructor, 'bad token class')
      this._checkAmount(amount)
      _tokenToDecrease._decreaseAmount(amount)
      this.amount = amount
      return
    }

    // case: combining tokens
    if (typeof _tokensToCombine !== 'undefined') {
      expect(_tokensToCombine).toBeArray()
      expect(_tokensToCombine.length).toBeGreaterThanOrEqualTo(2, 'must combine at least two tokens')
      if (_tokensToCombine.some(token => token.constructor !== this.constructor)) throw new Error('cannot combine different token classes')
      const countOf = token => _tokensToCombine.reduce((count, next) => next === token ? count + 1 : count, 0)
      if (_tokensToCombine.some(token => countOf(token) > 1)) throw new Error('cannot combine duplicate tokens')
      this.amount = 0
      _tokensToCombine.forEach(token => {
        this.amount += token.amount
        token._destroy()
      })
      this._checkAmount(this.amount)
      return
    }

    // case: minting
    this._checkAmount(amount)
    expect(this.owner).toBe(this.constructor.owner, `Only ${this.constructor.name}'s owner may mint`)
    this.amount = amount
    this._onMint(amount, Token.caller)
  }

  send (to, amount) {
    amount = typeof amount === 'undefined' ? this.amount : amount
    this._checkAmount(amount)
    expect(amount).toBeLessThanOrEqualTo(this.amount, 'not enough funds')
    if (this.amount === amount) {
      this.owner = to
      return null
    }
    const change = new this.constructor(this.amount - amount, this)
    this.owner = to
    return change
  }

  get value () {
    let amount = this.amount
    for (let i = 0; i < this.constructor.decimals; i++) amount /= 10
    return amount
  }

  static combine (...tokens) {
    return new this(undefined, undefined, tokens)
  }

  _destroy () {
    this.amount = 0
    this.owner = '029d11c250cc84a6ffbaf84fc28da82fc4deee214021bed2dcaa22d5193d22e273' // burner
  }

  _decreaseAmount (amount) {
    this.amount -= amount
  }

  _checkAmount (amount) {
    expect(amount).toBeNumber('amount is not a number')
    expect(amount).toBeInteger('amount must be an integer')
    expect(amount).toBeGreaterThan(0, 'amount must be positive')
    expect(amount).toBeLessThanOrEqualTo(Number.MAX_SAFE_INTEGER, 'amount too large')
  }

  _onMint (amount, caller) { /* unimplemented */ }
}

Token.decimals = 0

Token.deps = { expect }

Token.originTestnet = 'f1aa1e4aade72bd9542ef61d8961488cf85a8b9c163a3dc403c8771628f1a7e6_o1'
Token.locationTestnet = 'f1aa1e4aade72bd9542ef61d8961488cf85a8b9c163a3dc403c8771628f1a7e6_o1'
Token.ownerTestnet = '02d7a53577b33811162bba7d1ed12309a5d37e6bef63a2a338ebc898501eca3529'
Token.originMainnet = '8941b77582f9f0fb455b4cdb8283a0278b8efacfd4aaca772b1677a84840a802_o1'
Token.locationMainnet = '8941b77582f9f0fb455b4cdb8283a0278b8efacfd4aaca772b1677a84840a802_o1'
Token.ownerMainnet = '0306ff4478aeb2b1be9c8a592d5bd816a9419a6684af8b7fde1df1545379354987'

module.exports = Token


/***/ }),
/* 81 */
/***/ (function(module, exports, __webpack_require__) {

const Protocol = __webpack_require__(14)
const Location = __webpack_require__(8)

// ------------------------------------------------------------------------------------------------
// UniqueMap
// ------------------------------------------------------------------------------------------------

/**
 * A Map that guarantees token keys are unique. The API is intended to be the same as the built-in
 * Map so that this can be a drop-in replacement in sandboxed code.

 * For a given entry, there are 4 cases to consider:
 *    1) Deployed tokens
 *    2) Undeployed tokens
 *    3) Deployable code currently undeployed
 *    4) Everything else
 */
class UniqueMap {
  constructor (iterable) {
    this._undeployed = new Set() // Undeployed tokens without an origin
    this._deployed = new Map() // Origin -> Token
    this._map = new Map()
    if (iterable) { for (const [x, y] of iterable) this.set(x, y) }
  }

  clear () {
    this._undeployed.clear()
    this._deployed.clear()
    this._map.clear()
  }

  _getUniqueKey (x) {
    const inconsistentWorldview = () => {
      const hint = 'Hint: Try syncing the relevant tokens before use.'
      const reason = 'Found two tokens with the same origin at different locations.'
      const message = 'Inconsistent worldview'
      throw new Error(`${message}\n\n${reason}\n\n${hint}`)
    }

    if (Protocol.isToken(x)) {
      const xOrigin = Protocol.getOrigin(x)
      const xLocation = Protocol.getLocation(x)
      const deployed = !!Location.parse(xOrigin).txid

      if (deployed) {
        // Case 1: Deployed token

        // Was this token previously in our undeployed set? If so, update it.
        for (const y of this._undeployed) {
          if (xOrigin === y.origin) {
            const yLocation = Protocol.getLocation(y)
            if (xLocation !== yLocation) inconsistentWorldview()
            this._undeployed.delete(y)
            this._deployed.set(xOrigin, y)
            return y
          }
        }

        // Have we already seen a token at this origin? If so, use that one.
        const y = this._deployed.get(xOrigin)
        if (y) {
          const yLocation = Protocol.getLocation(y)
          if (xLocation !== yLocation) inconsistentWorldview()
          return y
        }

        // First time seeing a token at this origin. Remember it.
        this._deployed.set(xOrigin, x)
        return x
      } else {
        // Case 2: Undeployed token
        this._undeployed.add(x)
        return x
      }
    } else if (Protocol.isDeployable(x)) {
      // Case 3: Undeployed code
      this._undeployed.add(x)
      return x
    } else {
      // Case 4: Everything else
      return x
    }
  }

  delete (x) {
    const key = this._getUniqueKey(x)
    this._undeployed.delete(key)
    this._deployed.delete(key)
    return this._map.delete(key)
  }

  get (x) { return this._map.get(this._getUniqueKey(x)) }
  set (x, y) { this._map.set(this._getUniqueKey(x), y); return this }
  has (x) { return this._map.has(this._getUniqueKey(x)) }
  get size () { return this._map.size }
  get [Symbol.species] () { return UniqueMap }
  entries () { return this._map.entries() }
  keys () { return this._map.keys() }
  forEach (callback, thisArg) { return this._map.forEach(callback, thisArg) }
  values () { return this._map.values() }
  [Symbol.iterator] () { return this._map[Symbol.iterator]() }
}

// ------------------------------------------------------------------------------------------------
// UniqueSet
// ------------------------------------------------------------------------------------------------

/**
 * A Set that guarantees tokens are unique. The API is intended to be the same as the built-in
 * Set so that this can be a drop-in replacement in sandboxed code.
 */
class UniqueSet {
  constructor (iterable) {
    this.map = new UniqueMap()
    if (iterable) { for (const x of iterable) this.add(x) }
  }

  get size () { return this.map.size }
  get [Symbol.species] () { return UniqueSet }
  add (x) { this.map.set(x, x); return this }
  clear () { this.map.clear() }
  delete (x) { return this.map.delete(x) }
  entries () { return this.map.entries() }
  forEach (callback, thisArg) { return this.map.forEach(x => callback.call(thisArg, x)) }
  has (x) { return this.map.has(x) }
  values () { return this.map.values() }
  [Symbol.iterator] () { return this.map.keys() }
}

// ------------------------------------------------------------------------------------------------

module.exports = { UniqueSet, UniqueMap }


/***/ })
/******/ ]);