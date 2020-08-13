/**
 * execute.js
 *
 * Runs instructions in a program
 */

const Log = require('../util/log')
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
  /*
  const Code = require('./code')

  _checkState(data instanceof Array && data.length % 2 === 0, 'Invalid deploy data')

  // Create temporary files for each source
  const ncode = data.length / 2
  const files = []
  for (let i = 0; i < ncode; i++) files.push(new File())

  // Create a special decoder that returns the jigs in the new files before they are installed
  const codec = new Codec()._loadJigs(n => {
    const jig = masterList[n] || files[n - masterList.length]._jig
    _checkState(jig, `Invalid local jig reference: ${n}`)
    return jig
  })

  // Recreate each code
  for (let i = 0; i < ncode; i++) {
    const src = data[i * 2 + 0]
    const encprops = data[i * 2 + 1]
    const props = codec._decode(encprops)

    // Create the source from sandbox without any other dependencies first
    const parentName = _parentName(src)
    const env = parentName ? { [parentName]: props.deps[parentName] } : { }
    const [S, SGlobal] = Sandbox._evaluate(src, env)
    console.log('----', S, typeof SGlobal)
    console.log(S.toString(), _setOwnProperty)
    // _assert(S.toString() === src)

    const local = false
    files[i]._installLocal(S, local)
  }
  */

  /*
    // Install global dependencies
    Object.assign(SGlobal, props.deps)

    // Assign properties afterwards
    Membrane._sudo(() => {
      Object.keys(props).forEach(key => _setOwnProperty(file._jig, key, props[key]))
    })
    */

  // Add each file jig as a create
  // files.forEach(file => CURRENT_RECORD._create(file._jig))

  // Create files for each create
  // console.log(files)

  /*

  const srcList = data.filter((x, i) => i % 2 === 0)
  const encpropsList = data.filter((x, i) => i % 2 === 1)

  _assert(data.length % 2 === 0, 'Invalid data')
  _assert(!srcList.some(x => typeof x !== 'string'), 'Invalid src')

  const newCode = _evaluateSources(record, srcList, encpropsList)

  // Turn the functions into Code
  for (let i = 0; i < newCode.length; i++) {
    const local = false
    newCode[i] = new File(newCode[i], local)._jig
  }

  File._deployMultiple(...newCode)
  */
}

// ------------------------------------------------------------------------------------------------
// _executeUpgrade
// ------------------------------------------------------------------------------------------------

/*
function _executeUpgrade (record, op, data) {
  _assert(data.length === 3)
  _assert(typeof data[1] === 'string')

  const [Cenc, src, encprops] = data

  const codec = new Codec()._loadJigs(x => record._jigs[x])
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

  const codec = new Codec()._loadJigs(x => record._jigs[x])
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

  const codec = new Codec()._loadJigs(x => record._jigs[x])
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

  const codec = new Codec()._loadJigs(x => record._jigs[x])
  const C = codec._decode(data[0])

  _assert(C instanceof Code || C instanceof Jig, 'Invalid call target')

  const method = data[1]
  _assert(typeof method === 'string', 'Invalid method name')

  const args = codec._decode(data[2])
  _assert(Array.isArray(args), 'Invalid args')

  C[method](...args)
}
*/

// ------------------------------------------------------------------------------------------------
// _evaluateSources
// ------------------------------------------------------------------------------------------------

/*
function _evaluateSources (record, srcList, encpropsList) {
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
*/

// ------------------------------------------------------------------------------------------------

module.exports = _execute
