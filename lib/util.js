/**
 * util.js
 *
 * Helpers used throughout the library
 */

const bsv = require('bsv')

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
const PROTOCOL_VERSION = 0x01 // TODO: Reset to 0 for public launch

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
  return typeof type === 'function' && (/^class [A-Za-z0-9_]/.test(type.toString()) ||
    /^function [A-Za-z0-9_]/.test(type.toString())) && type.toString().indexOf('[native code]') === -1
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
// OBJECT <-> JSON
//
// Run often has complex data structures that cannot be directly stored as JSON. But we choose
// to use JSON as our serialization format anyway because of how easily it can be parsed. These
// two helper functions, `richObjectToJson` and `jsonToRichObject`, let us convert between a
// serialized JSON form and a rich data structure by using "replacer" functions that transform
// objects that could not otherwise be stored as JSON into a format that can later be unpacked.
// ------------------------------------------------------------------------------------------------

/**
 * Transforms a rich object into a format suitable for JSON stringification. We use this for
 * converting arguments into methods and checkpointing jig state in case we need to roll it back.
 *
 * The following data types are transformed natively:
 *  - Uint8Array
 *  - undefined
 *
 * Additional non-null objects and functions may be transformed using replacer functions.
 *
 * Properties starting with $ are not allowed. The final output is guaranteed to be JSON.
 */
function richObjectToJson (target, customReplacers = [], parent = null, name = null, stack = [null]) {
  // Handle basic data types and symbols
  switch (typeof target) {
    case 'undefined': return { $class: 'undefined' }
    case 'string': return target
    case 'boolean': return target
    case 'number':
      if (isNaN(target) || !isFinite(target)) throw new Error(`${target} cannot be serialized to json`)
      return target
    case 'symbol': throw new Error(`${target.toString()} cannot be serialized to json`)
  }

  // Null returns directly
  if (target === null) return null

  // Run custom replacers. The result must be JSON-serializable
  for (const replacer of customReplacers) {
    const replaced = replacer(target, parent, name)
    if (typeof replaced !== 'undefined') return replaced
  }

  if (typeof target === 'function') throw new Error(`${target} cannot be serialized to json`)

  // ------------------------------------------------------
  // NON-NULL OBJECT SERIALIZATION
  // ------------------------------------------------------

  // Check for circular references
  if (stack.indexOf(target) !== -1) throw new Error(`circular reference detected: ${name}`)

  // If the object is a basic object or array, make a deep copy and ensure no $ properties
  const protoproto = Object.getPrototypeOf(Object.getPrototypeOf(target))
  const isBasicObject = protoproto === null
  const isBasicArray = Array.isArray(target) && Object.getPrototypeOf(protoproto) === null
  if (isBasicObject || isBasicArray) {
    const copy = isBasicObject ? {} : []
    stack.push(target)
    Object.keys(target).forEach(key => {
      if (key.startsWith('$')) throw new Error('$ properties must not be defined')
      copy[key] = richObjectToJson(target[key], customReplacers, copy, key, stack)
    })
    stack.pop()
    return copy
  }

  // Replace Uint8Array
  const CommonUint8Array = require('.').code.intrinsics.Uint8Array
  if (target.constructor === CommonUint8Array || target.constructor === Uint8Array) {
    return { $class: 'Uint8Array', base64Data: Buffer.from(target).toString('base64') }
  }

  const obj = target.constructor.name ? target.constructor.name : target.toString()
  throw new Error(`${obj} cannot be serialized to json`)
}

/**
 * Converts a JSON-serialized run object back into its original rich structure. We use this to
 * hydrate arguments and jig state from their serialized form.
 */
function jsonToRichObject (target, customReplacers = [], parent = null, name = null, stack = [null]) {
  // Handle non-objects
  switch (typeof target) {
    case 'undefined': throw new Error('JSON should not contain undefined')
    case 'string': return target
    case 'boolean': return target
    case 'number':
      if (isNaN(target) || !isFinite(target)) throw new Error(`JSON should not contain ${target}`)
      return target
    case 'function': throw new Error(`JSON should not contain ${target}`)
    case 'symbol': throw new Error(`JSON should not contain ${target.toString()}`)
  }

  // Null returns directly
  if (target === null) return null

  // Check for circular references
  if (stack.indexOf(target) !== -1) throw new Error(`circular reference detected: ${name}`)

  // Run custom replacers. The result must be JSON-serializable
  for (const replacer of customReplacers) {
    const newValue = replacer(target, parent, name)
    if (typeof newValue !== 'undefined') return newValue
  }

  // Replace Uint8Array
  if (target.$class === 'Uint8Array') {
    const Uint8Array = require('.').code.intrinsics.Uint8Array
    return new Uint8Array(Buffer.from(target.base64Data, 'base64'))
  }

  // Replace undefined
  if (target.$class === 'undefined') return undefined

  // If the object is a basic object or array, make a deep copy
  const protoproto = Object.getPrototypeOf(Object.getPrototypeOf(target))
  const isBasicObject = protoproto === null
  const isBasicArray = Array.isArray(target) && Object.getPrototypeOf(protoproto) === null
  if (isBasicObject || isBasicArray) {
    const copy = isBasicObject ? {} : []
    stack.push(target)
    Object.keys(target).forEach(key => {
      if (key.startsWith('$')) throw new Error('$ properties must not be defined')
      copy[key] = jsonToRichObject(target[key], customReplacers, copy, key, stack)
    })
    stack.pop()
    return copy
  }

  const obj = target.constructor.name ? target.constructor.name : target.toString()
  throw new Error(`JSON should not contain ${obj}`)
}

// ------------------------------------------------------------------------------------------------
// REPLACERS
// ------------------------------------------------------------------------------------------------

/**
 * Pulls out jig instances and deployable code into a separate array, replacing each with a special
 * dollar sign object. They can be replaced back using injectJigsAndCodeFromArray. We use this to
 * serialize state before objects have a location on the blockchain.
 */
function extractJigsAndCodeToArray (arr) {
  const { Jig } = require('.')
  return (target, parent, name) => {
    if (target instanceof Jig || deployable(target)) {
      arr.push(target)
      return { $index: arr.length - 1 }
    }
  }
}

/**
 * The opposite of extractJigsAndCodeToArray
 */
function injectJigsAndCodeFromArray (arr) {
  return target => {
    if (typeof target.$index !== 'undefined') return arr[target.$index]
  }
}

// ------------------------------------------------------------------------------------------------
// DEEP TRAVERSAL
// ------------------------------------------------------------------------------------------------

/**
 * Deeply iterates through an object using a depth-first search, calling each visiter for each
 * property. Visiters callbacks take the format `(target: any, parent: object, name: string)`
 * where target is the visited property, parent is its parent object (or null if root), and name is
 * the name of the property in its parent object (which may also be null). Any duplicate or
 * circular references will be interated into only once.
 */
function deepTraverse (target, visit = [], parent = null, name = null, visited = new Set()) {
  if (Array.isArray(visit)) {
    visit.forEach(visiter => visiter(target, parent, name))
  } else {
    visit(target, parent, name)
  }

  if (typeof target === 'object' && target && !visited.has(target)) {
    visited.add(target)

    Object.keys(target).forEach(key => {
      deepTraverse(target[key], visit, target, key, visited)
    })
  }
}

// ------------------------------------------------------------------------------------------------
// MISC
// ------------------------------------------------------------------------------------------------

/**
 * Returns the current run instance that is active
 */
function activeRunInstance () {
  const Run = require('.')
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

  richObjectToJson,
  jsonToRichObject,

  extractJigsAndCodeToArray,
  injectJigsAndCodeFromArray,

  deepTraverse,

  activeRunInstance,
  sameJig,
  networkSuffix,
  bsvNetwork,

  SerialTaskQueue
}
