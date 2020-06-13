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
const { _deepClone, _deepVisit } = require('../../util/deep')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

let ACTIVE_RECORD = null

const RECORDS = new Map() // id -> Record

// ------------------------------------------------------------------------------------------------
// _Record
// ------------------------------------------------------------------------------------------------

/**
 * A live recording of actions performed on jigs. This is turned into a JSON record in the
 * transaction that looks like the following:
 *
 *  {
 *      "exec": [
 *          ["deploy", "class A {}", {}, "<owner>"],
 *          ["new", "_o1", [], "<owner>"],
 *          ["new", "_r0", [], "<owner>"]
 *      ],
 *      "refs": ["<location>"]
 *      "jigs": ["<hash1>", "<hash2>", "<hash3>"]
 *  }
 */
class Record {
  /**
   * Creates a new record. It is expected that it will be published or rolled back.
   */
  constructor () {
    this._id = bsv.crypto.Random.getRandomBuffer(32).toString('hex')

    this._actions = []
    this._changes = new Changes()
    this._inputs = new SafeSet()
    this._outputs = new SafeSet()
    this._refs = new SafeSet()
    this._recin = new Set() // [Record]
    this._recout = new Set() // [Record]

    RECORDS.set(this._id, this)
  }

  /**
   * Deploys a group of code together in one command
   * @param {Array<Code>} Cs Code jigs to deploy
   */
  _deploy (Cs) {
    this._checkNotDestroyed()
    const Membrane = require('./membrane')

    Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

    // Format: ['deploy', <src1>, <props1>, <src2>, <props2>, ...]
    const action = ['deploy']

    // For each code to deploy, remember its source code and original properties
    Cs.forEach(C => {
      this._addOutput(C)

      const src = _sourceCode(C)
      const props = Membrane._sudo(() => Object.assign({}, C))

      // Remove bindings from the props because they won't be deployed
      Bindings._BINDINGS.forEach(x => delete props[x])

      const clonedProps = Membrane._sudo(() => _deepClone(props, Sandbox._hostIntrinsics))

      _findJigs(clonedProps).forEach(jig => this._addRef(jig))

      action.push(src)
      action.push(clonedProps)
    })

    this._actions.push(action)
  }

  _rollback () {
    this._checkNotDestroyed()
    Log._info(TAG, 'Rollback')
    this._changes._rollback()
    this._destroy()
  }

  _absorb (record) {
    this._checkNotDestroyed()

    // Todo

    record._destroy()
  }

  _publish () {
    this._checkNotDestroyed()

    // Remove refs in inputs

    // Do all references in a transaction have to be local? Would make things easier.

    Log._info(TAG, 'Publish', this._id)
    console.log(this._actions)
    console.log(this._inputs.size)
    console.log(this._outputs.size)
    console.log(this._refs.size)
    console.log(this._recin.size)
    console.log(this._recout.size)

    this._destroy()
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  _addInput (jig) { this._inputs.add(jig); this._linkRecords(jig) }
  _addRef (jig) { this._refs.add(jig); this._linkRecords(jig) }
  _addOutput (jig) {
    if (!this._outputs.has(jig)) {
      this._outputs.add(jig)
      const location = `record://${this._id}_o${this._outputs.size + 1}`
      Membrane._sudo(() => {
        const hasOrigin = !jig.origin.startsWith('error://')
        if (!hasOrigin) this._changes._set(jig, jig, 'origin', location)
        this._changes._set(jig, jig, 'location', location)
      })
    }
  }

  _linkRecords (x) {
    const location = Membrane._sudo(() => x.location)
    const { record, txid } = Bindings._location(location)
    if (!record) return
    const r = RECORDS.get(txid)
    _assert(r, `Record not found: ${txid}`)
    if (r === this) return
    r._recout.add(this)
    this._recin.add(r)
  }

  // Destroys this record do it may no longer be published
  _destroy () { RECORDS.delete(this._id); this._id = null }
  _checkNotDestroyed () { _assert(this._id, 'Record already destroyed') }
}

// --------------------------------------------------------------------------
// _transaction
// --------------------------------------------------------------------------

Record._transaction = function (callback) {
  const prev = ACTIVE_RECORD
  ACTIVE_RECORD = new Record()

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

// function _import (transaction) {
// Returns record
// Override publish
// Change owner for each action
// }

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function _findJigs (x) {
  const { Jig } = require('../jig')
  const Code = require('./code')
  const jigs = new Set()
  _deepVisit(x, x => {
    if (x instanceof Jig || x instanceof Code) {
      jigs.add(x)
      return false
    }
  })
  return Array.from(jigs)
}

// ------------------------------------------------------------------------------------------------

module.exports = Record
