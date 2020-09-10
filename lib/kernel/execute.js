/**
 * execute.js
 *
 * Runs the actions in a program
 */

const Log = require('../util/log')
const Codec = require('../util/codec')
const Sandbox = require('../util/sandbox')
const { _checkState, _setOwnProperty, _assert } = require('../util/misc')
const { StateError } = require('../util/errors')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Execute'

// ------------------------------------------------------------------------------------------------
// _execute
// ------------------------------------------------------------------------------------------------

function _execute (op, data, masterList) {
  if (Log._debugOn) Log._debug(TAG, 'Executing', op, JSON.stringify(data))

  switch (op) {
    case 'DEPLOY': return _executeDeploy(data, masterList)
    case 'DESTROY': return _executeDestroy(data, masterList)
    case 'AUTH': return _executeAuth(data, masterList)
    case 'UPGRADE': return _executeUpgrade(data, masterList)
    case 'CALL': return _executeCall(data, masterList)
    case 'NEW': return _executeNew(data, masterList)
    default: throw new StateError(`Unknown opcode: ${op}`)
  }
}

// ------------------------------------------------------------------------------------------------
// _executeDeploy
// ------------------------------------------------------------------------------------------------

function _executeDeploy (encdata, masterList) {
  const Code = require('./code')

  _checkState(encdata instanceof Array && encdata.length % 2 === 0, 'Invalid deploy data')

  // Create temporary code for each source
  const ncode = encdata.length / 2
  const code = []
  for (let i = 0; i < ncode; i++) code.push(new Code())

  // Create a special decoder that returns jigs in the newly created code before they are installed
  const codec = new Codec()._toSandbox()._loadJigs(n => {
    const jig = masterList[n] || code[n - masterList.length]
    _checkState(jig, `Invalid local jig reference: ${n}`)
    return jig
  })

  const data = codec._decode(encdata)

  // Install each code
  for (let i = 0; i < ncode; i++) {
    const src = data[i * 2 + 0]
    const props = data[i * 2 + 1]

    // Create the local type from the source
    const [T] = Sandbox._evaluate(src, props.deps)
    Object.keys(props).forEach(key => {
      _setOwnProperty(T, key, props[key])
    })

    // Create the sandbox
    const C = code[i]
    const local = false
    const [S] = Code._makeSandbox(C, T, local)

    // Install the code into the sandbox
    const editor = Code._editor(C)
    editor._install(S, local)
  }

  // Add each new code as a create. This preserves deploy order.
  const CURRENT_RECORD = require('./record')._CURRENT_RECORD
  code.forEach(C => CURRENT_RECORD._create(C))

  // Deploy each code
  Code._deployMultiple(...code)
}

// ------------------------------------------------------------------------------------------------
// _executeDestroy
// ------------------------------------------------------------------------------------------------

function _executeDestroy (data, masterList) {
  const codec = new Codec()
    ._toSandbox()
    ._loadJigs(x => masterList[x])

  const x = codec._decode(data)

  const Code = require('./code')
  const Jig = require('./jig')
  _checkState(x instanceof Code || x instanceof Jig, 'Invalid destroy target')

  x.destroy()
}

// ------------------------------------------------------------------------------------------------
// _executeAuth
// ------------------------------------------------------------------------------------------------

function _executeAuth (data, masterList) {
  const codec = new Codec()
    ._toSandbox()
    ._loadJigs(x => masterList[x])

  const x = codec._decode(data)

  const Code = require('./code')
  const Jig = require('./jig')
  _checkState(x instanceof Code || x instanceof Jig, 'Invalid auth target')

  x.auth()
}

// ------------------------------------------------------------------------------------------------
// _executeUpgrade
// ------------------------------------------------------------------------------------------------

function _executeUpgrade (encdata, masterList) {
  const Code = require('./code')

  const codec = new Codec()
    ._toSandbox()
    ._loadJigs(x => masterList[x])

  const data = codec._decode(encdata)

  _assert(Array.isArray(data))
  _assert(data.length === 3)
  _assert(data[0] instanceof Code)
  _assert(typeof data[1] === 'string')

  const [C, src, props] = data

  // Create the source
  const [T] = Sandbox._evaluate(src, props.deps)
  Object.keys(props).forEach(key => {
    _setOwnProperty(T, key, props[key])
  })

  // Create the sandbox
  const [S] = Code._makeSandbox(C, T)

  // Upgrade the code
  const local = false
  C.upgrade(S, local)
}

// ------------------------------------------------------------------------------------------------
// _executeCall
// ------------------------------------------------------------------------------------------------

function _executeCall (encdata, masterList) {
  const Code = require('./code')
  const Jig = require('./jig')

  const codec = new Codec()
    ._toSandbox()
    ._loadJigs(x => masterList[x])

  const data = codec._decode(encdata)

  _assert(data.length === 3)
  _assert(data[0] instanceof Code || data[0] instanceof Jig)
  _assert(typeof data[1] === 'string')
  _assert(Array.isArray(data[2]))

  const [x, method, args] = data
  x[method](...args)
}

// ------------------------------------------------------------------------------------------------
// _executeNew
// ------------------------------------------------------------------------------------------------

function _executeNew (encdata, masterList) {
  const Code = require('./code')

  const codec = new Codec()
    ._toSandbox()
    ._loadJigs(x => masterList[x])

  const data = codec._decode(encdata)

  _assert(data.length === 2)
  _assert(data[0] instanceof Code)
  _assert(Array.isArray(data[1]))

  const [C, args] = data

  new C(...args) // eslint-disable-line
}

// ------------------------------------------------------------------------------------------------

module.exports = _execute
