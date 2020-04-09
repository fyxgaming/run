/**
 * misc.js
 *
 * Various helper methods
 */

const bsv = require('bsv')
const { Jig, JigControl } = require('../kernel/jig')
const { Berry } = require('../kernel/berry')

// ------------------------------------------------------------------------------------------------
// _activeRun
// ------------------------------------------------------------------------------------------------

/**
 * Returns the current run instance that is active
 */
function _activeRun () {
  const Run = require('..')
  if (!Run.instance) throw new Error('Run not instantiated')
  return Run.instance
}

// ------------------------------------------------------------------------------------------------
// _bsvNetwork
// ------------------------------------------------------------------------------------------------

/**
 * Gets a bsv library network string from a Run network string
 *
 * All networks that start with 'main' are considered mainnet. Everything else is testnet. This
 * lets us have potentially many "testnet" networks - ie. stn, mock, dev - that are clearly
 * distinct from mainnets. There might be multiple "mainnet" networks too if we have a hybrid
 * on-chain and off-chain system such as Overpool, which could be, for example, 'main-overpool'.
 * @param {string} network Run network string
 */
function _bsvNetwork (network) {
  return network.startsWith('main') ? 'mainnet' : 'testnet'
}

// ------------------------------------------------------------------------------------------------
// _networkSuffix
// ------------------------------------------------------------------------------------------------

/**
 * Returns the network suffix used for network-specific class properties, like originMainnet,
 * ownerTestnet, etc. The argument is the network set when creating Run.
 */
function _networkSuffix (network) {
  switch (network) {
    case 'main': return 'Mainnet'
    case 'test': return 'Testnet'
    case 'stn': return 'Stn'
    case 'mock': return 'Mocknet'
    default: throw new Error(`Unknown network: ${network}`)
  }
}

// ------------------------------------------------------------------------------------------------
// _deployable
// ------------------------------------------------------------------------------------------------

/**
 * Returns whether a given function or class can be deployed on-chain. For now, the most important
 * check is that the function is not a native function built into the Javascript runtime. Other
 * checks are important, but they will be done during deploy.
 */
function _deployable (T) {
  return typeof T === 'function' && T.toString().indexOf('[native code]') === -1
}

// ------------------------------------------------------------------------------------------------
// _tokenType
// ------------------------------------------------------------------------------------------------

/**
 * Gets the kind of token this value is
 * @param {*} x Value to check
 * @returns {?string} Ether 'jig', 'berry', code', or undefined if not a token
 */
function _tokenType (x) {
  if (!x) return
  if (x instanceof Jig) return 'jig'
  if (x instanceof Berry) return 'berry'
  if (_deployable(x)) return 'code'
}

// ------------------------------------------------------------------------------------------------
// _sameJig
// ------------------------------------------------------------------------------------------------

/**
 * Returns whether two jigs have or will have the same blockchain origin
 */
function _sameJig (a, b) {
  if (a === b) return true
  return a.origin && a.origin[0] !== '_' && a.origin === b.origin
}

// ------------------------------------------------------------------------------------------------
// _display
// ------------------------------------------------------------------------------------------------

/*
 * Converts any value into a short string form usable in error messages and logs.
 * @param {*} x Value to stringify
 */
function _display (x) {
  switch (typeof x) {
    case 'string': return `"${x.length > 20 ? x.slice(0, 20) + '…' : x}"`
    case 'object': return x ? `[object ${x.constructor.name}]` : 'null'
    case 'function': {
      const s = x.toString()
      const isAnonymousFunction =
        /^\(/.test(s) || // () => {}
        /^function\s*\(/.test(s) || // function() {}
        /^[a-zA-Z0-9_$]+\s*=>/.test(s) // x => x
      if (isAnonymousFunction) return '[anonymous function]'
      const isAnonymousClass = /^class\s*{/.test(s)
      if (isAnonymousClass) return '[anonymous class]'
      return x.name
    }
    case 'undefined': return 'undefined'
    default: return x.toString()
  }
}

// ------------------------------------------------------------------------------------------------
// Source code
// ------------------------------------------------------------------------------------------------

/**
 * Returns the "normalized" source code for a class or function.
 *
 * This is generally T.toString(), with some fixes.
 *
 * For classes, if T is a class that extends another class, we make sure the parent class name in
 * the extends expression is the actual name of the parent class, because man times the code will
 * be "class X extends SomeLibrary.Y" and what is deployed should be "class X extends Y", or an
 * obfuscator will change the variable name.
 *
 * For functions, Safari sometimes ignores the "function" keyword when printing method calls. We
 * add that back in so that we always can parse the code.
 *
 * Lastly, this may still return slightly different results in different environments, usually
 * related to line returns and whitespace. Functionally though, according to the spec, the code
 * should be the same.
 */
function _sourceCode (T) {
  const code = T.toString()
  const Parent = Object.getPrototypeOf(T)

  if (Parent.prototype) {
    const classDef = /^class \S+ extends \S+ {/
    return code.replace(classDef, `class ${T.name} extends ${Parent.name} {`)
  }

  const functionMatch = code.match(/^([a-zA-Z0-9_$]+)\S*\(/)
  if (functionMatch && functionMatch[1] !== 'function') return `function ${code}`

  return code
}

// ------------------------------------------------------------------------------------------------
// _checkNoObjectsBelongingToOtherTokens
// ------------------------------------------------------------------------------------------------

function _checkNoObjectsBelongingToOtherTokens (value, token) {
  _deepTraverseObjects([value], x => {
    if (_tokenType(x)) return false

    JigControl.enableSpecialProps(() => {
      if (typeof x.$owner !== 'undefined' && x.$owner !== token) {
        const suggestion = 'Hint: Consider storing a clone of the value instead.'
        throw new Error(`${_display(x)} belongs to a different token\n\n${suggestion}`)
      }
    })

    return true
  })
}

// ------------------------------------------------------------------------------------------------
// _deepTraverseObjects
// ------------------------------------------------------------------------------------------------

/**
 * Deeply traverses an object, calling the callback for every internal object value
 *
 * Callbacks should return true or false for whether to dive down deeper.
 *
 * This is a relable way to traverse jig state, but it will not traverse every possible token.
 * In particular, arbitrary object constructors are not detected. Also, if the object relies
 * on any hidden or external state, or data types not supported in Jigs (ie. WeakMap), we will
 * not traverse it either. This is specifically for traversing Jig state data.
 * @param {*} x Object to traverse
 * @param {function} callback Callback that is passed the object, and returns whether to traverse.
 * @param {?object} alternateIntrinsics Optional alternate intrinsics to consider
 */
function _deepTraverseObjects (x, callback, visited = new Set()) {
  if ((typeof x !== 'function' && typeof x !== 'object') || !x) return
  _deepTraverseSubObjects(x, callback, visited)
}

function _deepTraverseSubObjects (x, callback, visited) {
  if (visited.has(x)) return
  visited.add(x)

  const visit = value => {
    if ((typeof value !== 'function' && typeof value !== 'object') || !value) return
    if (!callback(value)) return
    _deepTraverseObjects(value, callback, visited)
  }

  const sandbox = require('./sandbox')._instance

  // Traverse set entries
  if (x instanceof sandbox._hostIntrinsics.Set || (x instanceof sandbox._intrinsics.Set)) {
    for (const value of x) visit(value)
  }

  // Traverse map keys and values
  if (x instanceof sandbox._hostIntrinsics.Map || (x instanceof sandbox._intrinsics.Map)) {
    for (const [key, value] of x) { visit(key); visit(value) }
  }

  // Traverse standard properties
  Object.keys(x).forEach(key => visit(x[key]))
}

// ------------------------------------------------------------------------------------------------
// _deepReplaceObjects
// ------------------------------------------------------------------------------------------------

/**
 * Deeply traverses an object, replacing objects with new objects, before traversing
 *
 * Callback is passed and object, and returns a new object.
 */
function _deepReplaceObjects (x, callback, visited = new Set()) {
  if ((typeof x !== 'function' && typeof x !== 'object') || !x) return
  _deepReplaceSubObjects(x, callback, visited)
}

function _deepReplaceSubObjects (x, callback, visited) {
  if (visited.has(x)) return
  visited.add(x)

  const visit = value => {
    if ((typeof value !== 'function' && typeof value !== 'object') || !value) return value
    const inner = callback(value)
    _deepReplaceSubObjects(inner, callback, visited)
    return inner
  }

  const sandbox = require('./sandbox')._instance

  // Traverse set entries
  if (x instanceof sandbox._hostIntrinsics.Set || (x instanceof sandbox._intrinsics.Set)) {
    const deletes = []
    const adds = []
    for (const value of x) {
      const newValue = visit(value)
      if (newValue !== value) {
        deletes.push(value)
        adds.push(newValue)
      }
      deletes.forEach(value => x.delete(value))
      adds.forEach(value => x.add(value))
    }
  }

  // Traverse map keys and values
  if (x instanceof sandbox._hostIntrinsics.Map || (x instanceof sandbox._intrinsics.Map)) {
    const deletes = []
    const sets = []
    for (const [key, value] of x) {
      const newKey = visit(key)
      const newValue = visit(value)
      if (newKey !== key) deletes.push(key)
      if (newKey !== key || newValue !== value) sets.push([newKey, newValue])
    }
    deletes.forEach(key => {
      x.delete(key)
    })
    sets.forEach(([key, value]) => x.set(key, value))
  }

  // Traverse standard properties
  Object.keys(x).forEach(key => { x[key] = visit(x[key]) })
}

// ------------------------------------------------------------------------------------------------
// _checkSatoshis
// ------------------------------------------------------------------------------------------------

/**
 * The maximum amount of satoshis able to be set on a Jig. Currently 1 BSV. We restrict this
 * for security reasons. TODO: There should be an option to disable this in the future.
 */
const MAX_SATOSHIS = 100000000

/**
 * Checks that the satoshis property of a Jig is a non-negative number within a certain range
 */
function _checkSatoshis (satoshis) {
  if (typeof satoshis !== 'number') throw new Error('satoshis must be a number')
  if (!Number.isInteger(satoshis)) throw new Error('satoshis must be an integer')
  if (isNaN(satoshis) || !isFinite(satoshis)) throw new Error('satoshis must be finite')
  if (satoshis < 0) throw new Error('satoshis must be non-negative')
  if (satoshis > MAX_SATOSHIS) throw new Error(`satoshis must be <= ${MAX_SATOSHIS}`)
}

// ------------------------------------------------------------------------------------------------
// _ownerLock
// ------------------------------------------------------------------------------------------------

/**
 * Returns the Script object version of this owner, or throws an error
 */
function _ownerLock (owner, bsvNetwork) {
  // Have to include here, because owner also requires util
  const { AddressLock } = require('../kernel/tray')

  if (typeof owner === 'string') {
    // Try parsing it as a public key
    try {
      // Public key owners are converted into address scripts because
      // the public APIs more frequently support P2PKH UTXO queries and
      // we want as much compatibility as posible for the common use case.
      // Public key owners enable encryption that isn't possible with
      // address owners, no matter how the UTXO is represented.
      const pubkey = new bsv.PublicKey(owner, { network: bsvNetwork })
      return new AddressLock(pubkey.toAddress().toString())
    } catch (e) { }

    // Try parsing it as an address
    try {
      new bsv.Address(owner, bsvNetwork) // eslint-disable-line
      return new AddressLock(owner)
    } catch (e) { }
  }

  // Check if it is a custom owner
  if (typeof owner === 'object' && owner) {
    const script = owner.script
    const Sandbox = require('./sandbox')
    const _hostIntrinsics = Sandbox._instance._hostIntrinsics
    const _sandboxIntrinsics = Sandbox._instance._intrinsics
    if (script instanceof _hostIntrinsics.Uint8Array || script instanceof _sandboxIntrinsics.Uint8Array) {
      return owner
    }
  }

  throw new Error(`Invalid owner: ${_display(owner)}`)
}

// ------------------------------------------------------------------------------------------------
// SerialTaskQueue
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
// _txToTxo
// ------------------------------------------------------------------------------------------------

// A modified version of the txo format form unwriter
// Source: https://github.com/interplanaria/txo/blob/master/index.js
var _txToTxo = function (tx, options) {
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

// ------------------------------------------------------------------------------------------------

function _cloneForHost (x) {
  // TODO: A direct deepClone method would be faster, but this is safe for now.
  const TokenJSON = require('./json')
  const Sandbox = require('./sandbox')
  const refs = []
  const opts = {
    _outputIntrinsics: Sandbox._instance._hostIntrinsics,
    _replacer: TokenJSON._replace._tokens(x => { refs.push(x); return refs.length - 1 }),
    _reviver: TokenJSON._revive._tokens(ref => refs[ref])
  }
  const y = TokenJSON._serialize(x, opts)
  return TokenJSON._deserialize(y, opts)
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _activeRun,
  _bsvNetwork,
  _networkSuffix,
  _deployable,
  _tokenType,
  _sameJig,
  _display,
  _sourceCode,
  _checkNoObjectsBelongingToOtherTokens,
  _deepTraverseObjects,
  _deepReplaceObjects,
  _checkSatoshis,
  _ownerLock,
  SerialTaskQueue,
  _txToTxo,
  _cloneForHost
}
