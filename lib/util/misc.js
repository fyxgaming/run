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
// _resourceType
// ------------------------------------------------------------------------------------------------

/**
 * Gets the kind of resource this value is
 * @param {*} x Value to check
 * @returns {?string} Ether 'jig', 'berry', code', or undefined if not a resource
 */
function _resourceType (x) {
  return JigControl._disableSafeguards(() => {
    if (!x) return
    if (x instanceof Jig) return 'jig'
    if (x instanceof Berry) return 'berry'
    if (_deployable(x)) return 'code'
  })
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
// _text
// ------------------------------------------------------------------------------------------------

/*
 * Converts any value into a short string form usable in error messages and logs.
 * @param {*} x Value to stringify
 */
function _text (x) {
  return JigControl._disableSafeguards(() => {
    switch (typeof x) {
      case 'string': return `"${x.length > 20 ? x.slice(0, 20) + '…' : x}"`
      case 'object':
        if (!x) return 'null'
        if (!x.constructor.name) return '[anonymous object]'
        return `[object ${x.constructor.name}]`
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
  })
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
// _checkNoObjectsBelongingToOtherResources
// ------------------------------------------------------------------------------------------------

function _checkNoObjectsBelongingToOtherResources (value, resource) {
  const { _deepVisit } = require('./deep')

  _deepVisit(value, x => {
    if (_resourceType(x)) return false

    JigControl._enableSpecialProps(() => {
      if (typeof x.$owner !== 'undefined' && x.$owner !== resource) {
        const suggestion = 'Hint: Consider storing a clone of the value instead.'
        throw new Error(`${_text(x)} belongs to a different resource\n\n${suggestion}`)
      }
    })

    return true
  })
}

// ------------------------------------------------------------------------------------------------
// _SerialTaskQueue
// ------------------------------------------------------------------------------------------------

class _SerialTaskQueue {
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

  const ResourceJSON = require('./json')
  const Sandbox = require('./sandbox')
  const refs = []

  // TODO: Refs needs to be cloned for outside?

  const opts = {
    _outputIntrinsics: Sandbox._hostIntrinsics,

    _replacer: ResourceJSON._replace._multiple(
      ResourceJSON._replace._resources(x => { refs.push(x); return refs.length - 1 }),
      ResourceJSON._replace._arbitraryObjects()),

    _reviver: ResourceJSON._revive._multiple(
      ResourceJSON._revive._resources(ref => refs[ref]),
      ResourceJSON._revive._arbitraryObjects())
  }

  const y = ResourceJSON._serialize(x, opts)

  return ResourceJSON._deserialize(y, opts)
}

function _cloneForSandbox (x) {
  // TODO: A direct deepClone method would be faster, but this is safe for now.

  const ResourceJSON = require('./json')
  const Sandbox = require('./sandbox')
  const refs = []

  // TODO: Refs needs to be cloned for outside?

  const opts = {
    _outputIntrinsics: Sandbox._sandboxIntrinsics,

    _replacer: ResourceJSON._replace._multiple(
      ResourceJSON._replace._resources(x => { refs.push(x); return refs.length - 1 }),
      ResourceJSON._replace._arbitraryObjects()),

    _reviver: ResourceJSON._revive._multiple(
      ResourceJSON._revive._resources(ref => refs[ref]),
      ResourceJSON._revive._arbitraryObjects())
  }

  const y = ResourceJSON._serialize(x, opts)

  return ResourceJSON._deserialize(y, opts)
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _activeRun,
  _bsvNetwork,
  _networkSuffix,
  _deployable,
  _resourceType,
  _sameJig,
  _text,
  _sourceCode,
  _checkNoObjectsBelongingToOtherResources,
  _SerialTaskQueue,
  _txToTxo,
  _cloneForHost,
  _cloneForSandbox
}
