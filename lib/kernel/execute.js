/**
 * execute.js
 *
 * Runs instructions in a program
 */

const Log = require('../util/log')
const Codec = require('../util/codec')
const Sandbox = require('../util/sandbox')
const { _checkState, _setOwnProperty } = require('../util/misc')
const { StateError } = require('../util/errors')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Execute'

// ------------------------------------------------------------------------------------------------
// _execute
// ------------------------------------------------------------------------------------------------

function _execute (op, data, masterList) {
  Log._debug(TAG, 'Executing', op, JSON.stringify(data))

  const CURRENT_RECORD = require('./record')._CURRENT_RECORD

  CURRENT_RECORD._multiple(() => {
    switch (op) {
      case 'DEPLOY': return _executeDeploy(op, data, masterList)
      // case 'UPGRADE': return _executeUpgrade(record, op, data)
      // case 'DESTROY': return _executeDestroy(record, op, data)
      // case 'AUTH': return _executeAuth(record, op, data)
      // case 'CALL': return _executeCall(record, op, data)
      default: throw new StateError(`Unknown opcode: ${op}`)
    }
  })
}

// ------------------------------------------------------------------------------------------------
// _executeDeploy
// ------------------------------------------------------------------------------------------------

function _executeDeploy (op, data, masterList) {
  const Code = require('./code')

  _checkState(data instanceof Array && data.length % 2 === 0, 'Invalid deploy data')

  // Create temporary code for each source
  const ncode = data.length / 2
  const code = []
  for (let i = 0; i < ncode; i++) code.push(new Code())

  // Create a special decodre that returns jigs in the newly created code before they are installed
  const codec = new Codec()._toSandbox()._loadJigs(n => {
    const jig = masterList[n] || code[n - masterList.length]
    _checkState(jig, `Invalid local jig reference: ${n}`)
    return jig
  })

  // Install each code
  for (let i = 0; i < ncode; i++) {
    const src = data[i * 2 + 0]
    const encprops = data[i * 2 + 1]
    const props = codec._decode(encprops)

    // Create the source from the sandbox without any other dependencies
    const [S] = Sandbox._evaluate(src, props.deps)

    // Assign the props onto the sandbox
    Object.keys(props).forEach(key => {
      _setOwnProperty(S, key, props[key])
    })

    // Install the code into the sandbox
    const local = false
    const editor = Code._editor(code[i])
    editor._install(S, local)
  }

  // Add each new code as a create. This preserves deploy order.
  const CURRENT_RECORD = require('./record')._CURRENT_RECORD
  code.forEach(C => CURRENT_RECORD._create(C))

  // Deploy each code
  Code._deployMultiple(...code)
}

// ------------------------------------------------------------------------------------------------
// _executeUpgrade
// ------------------------------------------------------------------------------------------------

/*
function _executeUpgrade (record, op, data) {
  _assert(data.length === 3)
  _assert(typeof data[1] === 'string')

  const [Cenc, src, encprops] = data

  const codec = new Codec()._toSandbox()._loadJigs(x => record._jigs[x])
  const C = codec._decode(Cenc)

  const Code = require('./code')
  _assert(C instanceof Code, 'Invalid upgrade target')

  const [D] = _evaluateSources(record, [src], [encprops])

  const File = require('./file')
  const file = File._find(C)
  const local = false
  file._upgrade(D, local)
}
*/

// ------------------------------------------------------------------------------------------------
// _executeDestroy
// ------------------------------------------------------------------------------------------------

/*
function _executeDestroy (record, op, data) {
  _assert(data.length === 1)

  const Code = require('./code')
  const Jig = require('./jig')

  const codec = new Codec()._toSandbox()._loadJigs(x => record._jigs[x])
  const C = codec._decode(data[0])

  _assert(C instanceof Code || C instanceof Jig, 'Invalid destroy target')

  C.destroy()
}
*/

// ------------------------------------------------------------------------------------------------
// _executeAuth
// ------------------------------------------------------------------------------------------------

/*
function _executeAuth (record, op, data) {
  _assert(data.length === 1)

  const Code = require('./code')
  const Jig = require('./jig')

  const codec = new Codec()._toSandbox()._loadJigs(x => record._jigs[x])
  const C = codec._decode(data[0])

  _assert(C instanceof Code || C instanceof Jig, 'Invalid auth target')

  C.auth()
}
*/

// ------------------------------------------------------------------------------------------------
// _executeCall
// ------------------------------------------------------------------------------------------------

/*
function _executeCall (record, op, data) {
  _assert(data.length === 3)

  const Code = require('./code')
  const Jig = require('./jig')

  const codec = new Codec()._toSandbox()._loadJigs(x => record._jigs[x])
  const C = codec._toSandbox()._decode(data[0])

  _assert(C instanceof Code || C instanceof Jig, 'Invalid call target')

  const method = data[1]
  _assert(typeof method === 'string', 'Invalid method name')

  const args = codec._toSandbox()._decode(data[2])
  _assert(Array.isArray(args), 'Invalid args')

  C[method](...args)
}
*/

// ------------------------------------------------------------------------------------------------

module.exports = _execute
