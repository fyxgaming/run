/**
 * util.js
 *
 * Helpers used throughout the library
 */

const bsv = require('bsv')
const { Intrinsics } = require('./intrinsics')

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
