/**
 * execute.js
 *
 * Reexecutes actions in a record
 */

const { _assert, _parentName, _setOwnProperty } = require('../util/misc')
const Log = require('../util/log')
const Codec = require('../util/codec')
const Sandbox = require('../util/sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Execute'

// ------------------------------------------------------------------------------------------------

function _execute (record, cmd, data) {
  Log._debug(TAG, 'Executing', cmd, JSON.stringify(data))

  record._intercept(() => {
    switch (cmd) {
      case 'deploy': return _executeDeploy(record, cmd, data)
      case 'upgrade': return _executeUpgrade(record, cmd, data)
      case 'destroy': return _executeDestroy(record, cmd, data)
      case 'auth': return _executeAuth(record, cmd, data)
      case 'call': return _executeCall(record, cmd, data)
      default: throw new Error(`Unknown command: ${cmd}`)
    }
  })
}

// ------------------------------------------------------------------------------------------------
// _executeDeploy
// ------------------------------------------------------------------------------------------------

function _executeDeploy (record, cmd, data) {
  const Repository = require('./file')
  const repository = Repository._active()

  const srcList = data.filter((x, i) => i % 2 === 0)
  const encpropsList = data.filter((x, i) => i % 2 === 1)

  _assert(data.length % 2 === 0, 'Invalid data')
  _assert(!srcList.some(x => typeof x !== 'string'), 'Invalid src')

  const newCode = _evaluateSrcs(record, srcList, encpropsList)

  // Turn the functions into Code
  const options = { _repository: new Map() }
  for (let i = 0; i < newCode.length; i++) {
    newCode[i] = repository._install(newCode[i], options)
  }

  repository._deploy(...newCode)
}

// ------------------------------------------------------------------------------------------------
// _executeUpgrade
// ------------------------------------------------------------------------------------------------

function _executeUpgrade (record, cmd, data) {
  _assert(data.length === 3)
  _assert(typeof data[1] === 'string')

  const [Cenc, src, encprops] = data

  const codec = new Codec()._loadJigs(x => record._jigs[x])
  const C = codec._decode(Cenc)

  const Code = require('./code')
  _assert(C instanceof Code, 'Invalid upgrade target')

  const [D] = _evaluateSrcs(record, [src], [encprops])

  C.upgrade(D)
}

// ------------------------------------------------------------------------------------------------
// _executeDestroy
// ------------------------------------------------------------------------------------------------

function _executeDestroy (record, cmd, data) {
  _assert(data.length === 1)

  const Code = require('./code')
  const Jig = require('./jig')

  const codec = new Codec()._loadJigs(x => record._jigs[x])
  const C = codec._decode(data[0])

  _assert(C instanceof Code || C instanceof Jig, 'Invalid destroy target')

  C.destroy()
}

// ------------------------------------------------------------------------------------------------
// _executeAuth
// ------------------------------------------------------------------------------------------------

function _executeAuth (record, cmd, data) {
  _assert(data.length === 1)

  const Code = require('./code')
  const Jig = require('./jig')

  const codec = new Codec()._loadJigs(x => record._jigs[x])
  const C = codec._decode(data[0])

  _assert(C instanceof Code || C instanceof Jig, 'Invalid auth target')

  C.auth()
}

// ------------------------------------------------------------------------------------------------
// _executeCall
// ------------------------------------------------------------------------------------------------

function _executeCall (record, cmd, data) {
  _assert(data.length === 3)

  const Code = require('./code')
  const Jig = require('./jig')

  const codec = new Codec()._loadJigs(x => record._jigs[x])
  const C = codec._decode(data[0])

  _assert(C instanceof Code || C instanceof Jig, 'Invalid call target')

  const method = data[1]
  _assert(typeof method === 'string', 'Invalid method name')

  const args = codec._decode(data[2])
  _assert(Array.isArray(args), 'Invalid args')

  C[method](...args)
}

// ------------------------------------------------------------------------------------------------
// _evaluateSrcs
// ------------------------------------------------------------------------------------------------

function _evaluateSrcs (record, srcList, encpropsList) {
  _assert(srcList.length === encpropsList.length)

  const Ss = []
  const SGlobals = []

  const makeCodec = () => new Codec()._loadJigs(x => (x < record._jigs.length)
    ? record._jigs[x] : Ss[x - record._jigs.length])

  // Create source code containers first
  for (let i = 0; i < srcList.length; i++) {
    const src = srcList[i]
    const encprops = encpropsList[i]

    const env = {}

    // Get the parent if there is one
    const parentName = _parentName(src)
    if (parentName) {
      const props = makeCodec()._decode(encprops)
      env[parentName] = props.deps[parentName]
    }

    const [S, SGlobal] = Sandbox._evaluate(src, env)

    _assert(S.toString() === src)

    Ss.push(S)
    SGlobals.push(SGlobal)
  }

  // Create and assign all of the props and deps
  for (let i = 0; i < encpropsList.length; i++) {
    const encprops = encpropsList[i]
    const S = Ss[i]
    const SGlobal = SGlobals[i]

    const props = makeCodec()._decode(encprops)

    // Assign the props
    Object.keys(props).forEach(key => {
      _setOwnProperty(S, key, props[key])
    })

    // Assign deps
    Object.assign(SGlobal, props.deps)
  }

  return Ss
}

// ------------------------------------------------------------------------------------------------

module.exports = _execute
