/**
 * misc.js
 *
 * Various helper methods
 */

const bsv = require('bsv')
const { Jig, JigControl } = require('./jig')
const { Berry } = require('../../old/berry')
const { _text } = require('./type')
const { InternalError } = require('./errors')

// ------------------------------------------------------------------------------------------------
// _activeRun
// ------------------------------------------------------------------------------------------------

/**
 * Returns the current run instance that is active
 *
 * TODO: DEPRECATED, REMOVE
 */
function _activeRun () {
  const Run = require('../../dist/run.node.min')
  if (!Run.instance) throw new Error('Run not instantiated')
  return Run.instance
}

// ------------------------------------------------------------------------------------------------
// _kernel
// ------------------------------------------------------------------------------------------------

/**
 * Returns the active kernel
 */
function _kernel () {
  const Kernel = require('./kernel')
  if (!Kernel._instance) throw new Error('Run instance not active')
  return Kernel._instance
}

// ------------------------------------------------------------------------------------------------
// _assert
// ------------------------------------------------------------------------------------------------

function _assert (condition, reason) {
  if (!condition) throw new InternalError(reason || 'assert failed')
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
 *
 * TODO: REMOVE
 * @param {*} x Value to check
 * @returns {?string} Ether 'jig', 'berry', code', or undefined if not a resource
 */
function _resourceType (x) {
  const Membrane = require('./membrane')
  const Code = require('./code')
  return Membrane._sudo(() => JigControl._disableSafeguards(() => {
    if (!x) return
    if (x instanceof Jig) return 'jig'
    if (x instanceof Berry) return 'berry'
    if (x instanceof Code) return 'code'
    if (_deployable(x)) return 'code'
  }))
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

  const ResourceJSON = require('../../old/util/json')
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

  const ResourceJSON = require('../../old/util/json')
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

// ------------------------------------------------------------------------------------------------

module.exports = {
  _activeRun,
  _kernel,
  _assert,
  _bsvNetwork,
  _networkSuffix,
  _deployable,
  _resourceType,
  _sameJig,
  _checkNoObjectsBelongingToOtherResources,
  _SerialTaskQueue,
  _txToTxo,
  _cloneForHost,
  _cloneForSandbox
}
