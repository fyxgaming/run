/**
 * record.js
 *
 * A recording of jig actions on the local machine
 */

const bsv = require('bsv')
const Membrane = require('./membrane')
const { SafeSet } = require('../../util/safe')
const Bindings = require('../../util/bindings')
const { _assert } = require('../../util/misc')
const { _text, _sourceCode } = require('../../util/type')
const Log = require('../../util/log')
const Sandbox = require('../../util/sandbox')
const Changes = require('../../util/changes')
const { _deepClone } = require('../../util/deep')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const RECORDS = new Map() // id -> Record

// ------------------------------------------------------------------------------------------------
// _findAllJigs
// ------------------------------------------------------------------------------------------------

/*
function _findAllJigs (x) {
  const Jig = require('../jig')
  const Code = require('./code')
  const jigs = new Set()
  _deepVisit(x, x => {
    if (x instanceof Jig || x instanceof Code) {
      jigs.add(x)
    }
    return true
  })
  return Array.from(jigs)
}
*/

// ------------------------------------------------------------------------------------------------
// _Record
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

class _Record {
  constructor () {
    this._id = bsv.crypto.Random.getRandomBuffer(32).toString('hex')

    this._actions = []
    this._changes = new Changes()

    this._inputs = new SafeSet()
    this._outputs = new SafeSet()
    this._refs = new SafeSet()

    this._prevs = new Set() // [Record]
    this._nexts = new Set() // [Record]

    RECORDS.set(this._id, this)
  }

  _deploy (Cs) {
    this._checkNotDestroyed()

    Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

    // Format: ['deploy', <src1>, <props1>, <src2>, <props2>, ...]
    const action = ['deploy']

    // For each code to deploy, remember its source code and original properties
    Cs.forEach(C => {
      const Membrane = require('./membrane')
      const props = Membrane._sudo(() => Object.assign({}, C))
      const src = _sourceCode(C)

      // Remove bindings from the props because they won't be deployed
      Bindings._BINDINGS.forEach(x => delete props[x])

      const clonedProps = Membrane._sudo(() => _deepClone(props, Sandbox._hostIntrinsics))

      // Do all references in a transaction have to be local? Would make things easier.
      // What about assumed references, references from the inputs?

      this._outputs.add(C)
      action.push(src)
      action.push(clonedProps)
    })

    this._actions.push(action)

    this._assignOutputLocations()
  }

  _rollback () {
    this._checkNotDestroyed()

    Log._info(TAG, 'Rollback')

    this._destroy()

    // Todo
  }

  _absorb (record) {
    this._checkNotDestroyed()

    // Todo

    record._destroy()
  }

  _publish () {
    this._checkNotDestroyed()

    // Connect dependent records
    this._inputs.forEach(input => this._linkDependencies(input))
    this._refs.forEach(ref => this._linkDependencies(ref))

    Log._info(TAG, 'Publish', this._id)

    this._destroy()
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  _assignOutputLocations () {
    Membrane._sudo(() => {
      let vout = 0
      for (const output of this._outputs) {
        const location = `record://${this._id}_o${vout++}`
        const hasOrigin = !output.origin.startsWith('error://')
        if (!hasOrigin) this._changes._set(output, output, 'origin', location)
        this._changes._set(output, output, 'location', location)
      }
    })
  }

  _addInput (jig) {
    this._linkDependencies(jig)
    this._inputs.add(jig)
  }

  _addRef (jig) {
    this._linkDependencies(jig)
    this._refs.add(jig)
  }

  _linkDependencies (jig) {
    const location = Membrane._sudo(() => jig.location)
    const { record, txid } = Bindings._location(location)
    if (!record) return
    const r = RECORDS.get(txid)
    _assert(r, `Record not found: ${txid}`)
    if (r === this) return
    r._nexts.add(this)
    this._prevs.add(r)
  }

  // Destroys this record do it may no longer be published
  _destroy () { RECORDS.delete(this._id); this._id = null }
  _checkNotDestroyed () { _assert(this._id, 'Record already destroyed') }
}

// ------------------------------------------------------------------------------------------------
// _transaction
// ------------------------------------------------------------------------------------------------

let ACTIVE_RECORD = null

// Move onto Record
function _transaction (callback) {
  const prev = ACTIVE_RECORD
  ACTIVE_RECORD = new _Record()

  try {
    callback(ACTIVE_RECORD)

    if (prev) {
      prev._absorb(ACTIVE_RECORD)
      ACTIVE_RECORD = prev
    } else {
      ACTIVE_RECORD._publish()
    }
  } catch (e) {
    ACTIVE_RECORD._rollback()
    ACTIVE_RECORD = prev
    throw e
  }
}

// ------------------------------------------------------------------------------------------------
// _import
// ------------------------------------------------------------------------------------------------

function _import (transaction) {
  // Returns record
  // Override publish
  // Change owner for each action
}

// ------------------------------------------------------------------------------------------------

module.exports = { _Record, _transaction, _import }
