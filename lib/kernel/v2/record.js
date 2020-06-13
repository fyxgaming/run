/**
 * record.js
 *
 * A recording of jig actions on the local machine
 */

const bsv = require('bsv')
const Membrane = require('./membrane')
const { SafeSet } = require('../../util/safe')
const { _text, _sourceCode } = require('../../util/type')
const Log = require('../../util/log')
const Sandbox = require('../../util/sandbox')
const Changes = require('../../util/changes')
const { _deepClone } = require('../../util/deep')

// ------------------------------------------------------------------------------------------------
// _Record
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

class _Record {
  constructor () {
    this._id = bsv.crypto.Random.getRandomBuffer(32).toString('hex')
    this._actions = []
    this._inputs = new SafeSet()
    this._outputs = new SafeSet()
    this._changes = new Changes()
    this._refs = []
    this._tx = null
  }

  _deploy (Cs, owner) {
    Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

    // Format: ['deploy', <owner>, <src1>, <props1>, <src2>, <props2>, ...]
    const action = ['deploy', owner]

    // For each code to deploy, remember its source code and original properties
    Cs.forEach(C => {
      const Membrane = require('./membrane')
      const props = Membrane._sudo(() => Object.assign({}, C))
      const src = _sourceCode(C)

      // Remove bindings from the props because they won't be deployed
      delete props.location
      delete props.origin
      delete props.owner
      delete props.satoshis

      const clonedProps = Membrane._sudo(() => _deepClone(props, Sandbox._hostIntrinsics))

      this._outputs.add(C)
      action.push(src)
      action.push(clonedProps)
    })

    this._actions.push(action)

    this._assignOutputLocations()
  }

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

  _rollback () {
    Log._info(TAG, 'Rollback')

    // Todo
  }

  _absorb (record) {
    // Todo
  }

  _publish () {
    Log._info(TAG, 'Publish', this._id)
  }
}

// ------------------------------------------------------------------------------------------------
// _transaction
// ------------------------------------------------------------------------------------------------

let ACTIVE_RECORD = null

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

module.exports = { _transaction, _import }
