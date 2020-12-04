/**
 * execute.js
 *
 * Runs the actions in a program
 */

const Log = require('../util/log')
const Codec = require('../util/codec')
const Sandbox = require('../sandbox/sandbox')
const { _assert, _setOwnProperty } = require('../util/misc')
const { StateError } = require('../util/errors')
const Action = require('./action')

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
    case 'SIGN': return _executeSign(data, masterList)
    case 'UPGRADE': return _executeUpgrade(data, masterList)
    case 'CALL': return _executeCall(data, masterList)
    case 'NEW': return _executeNew(data, masterList)
    default: throw new StateError(`Unknown op: ${op}`)
  }
}

// ------------------------------------------------------------------------------------------------
// _executeDeploy
// ------------------------------------------------------------------------------------------------

function _executeDeploy (encdata, masterList) {
  const Editor = require('./editor')

  if (!(encdata instanceof Array && encdata.length % 2 === 0)) {
    throw new StateError('Invalid deploy data')
  }

  // Create temporary code for each source
  const ncode = encdata.length / 2
  const code = []
  for (let i = 0; i < ncode; i++) code.push(Editor._createCode())

  // Create a special decoder that returns jigs in the newly created code before they are installed
  const codec = new Codec()._toSandbox()._loadJigs(n => {
    const jig = masterList[n] || code[n - masterList.length]
    if (!jig) throw new StateError(`Invalid local jig reference: ${n}`)
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
    const [S] = Editor._makeSandbox(C, T, local)

    // Install the code into the sandbox
    const editor = Editor._get(C)
    editor._install(S, local, [], src)
  }

  // Deploy each code
  Action._deploy(code)
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
  if (!(x instanceof Code || x instanceof Jig)) throw new StateError('Invalid destroy target')

  x.destroy()
}

// ------------------------------------------------------------------------------------------------
// _executeSign
// ------------------------------------------------------------------------------------------------

function _executeSign (data, masterList) {
  const codec = new Codec()
    ._toSandbox()
    ._loadJigs(x => masterList[x])

  const x = codec._decode(data)

  const Code = require('./code')
  const Jig = require('./jig')
  if (!(x instanceof Code || x instanceof Jig)) throw new StateError('Invalid sign target')

  x.sign()
}

// ------------------------------------------------------------------------------------------------
// _executeUpgrade
// ------------------------------------------------------------------------------------------------

function _executeUpgrade (encdata, masterList) {
  const Code = require('./code')
  const Editor = require('./editor')

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
  const [S] = Editor._makeSandbox(C, T)

  // Upgrade the code
  const local = false
  Editor._upgradeCode(C, S, local, src)
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
