/**
 * record.js
 *
 * A recording of jig actions on the local machine
 */

const { crypto, Transaction } = require('bsv')
const Membrane = require('./membrane')
const { SafeSet, SafeMap } = require('../../util/safe')
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
// Record
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
 *
 * The record stores active references to the jigs being used, as well as all changes made to
 * those jigs. The actions are a recording of events that can be turned into the above JSON.
 * The record also knows about parent records and children records, and these form a DAG that
 * mirrors the Bitcoin transactions. Run uses this to parallelize updates. Finally, the record
 * is responsible for updating the bindings on the output jigs, and storing ALL changes
 * in the _changes data structure.
 */
class Record {
  /**
   * Creates a new record. It is expected that it will be published or rolled back.
   *
   * Jigs call the record to create new transactions by adding actions. Actions
   * should update the inputs, outputs, and references in the transaction, as well
   * as add an entry to the actions array.
   */
  constructor () {
    this._id = crypto.Random.getRandomBuffer(32).toString('hex')
    Log._debug(TAG, 'Create', this._id)

    this._actions = []
    this._mutable = true
    this._changes = new Changes()
    this._inputs = new SafeSet()
    this._outputs = new SafeSet()
    this._refs = new SafeMap() // Jig -> Location
    this._parents = new Set() // [Record]
    this._children = new Set() // [Record]

    RECORDS.set(this._id, this)
  }

  get _alive () { return RECORDS.has(this._id) }
  set _alive (value) { _assert(!value); RECORDS.delete(this._id) }

  /**
   * Adds an action to the record
   *
   * All changes made by this action to existing jigs should have already been added to _changes.
   * @param {Action} action Action to add
   */
  _add (action) {
    _assert(this._alive)
    _assert(this._mutable)

    // Add inputs from the action to the record and also detect if these rely on other records.
    action._inputs.forEach(jig => {
      this._inputs.add(jig)
      this._linkRecords(jig)
    })

    // Add references from the action to the record and also detect if these rely on other records.
    action._refs.forEach(jig => {
      this._refs.set(jig, Membrane._sudo(() => jig.location))
      this._linkRecords(jig)
    })

    // Add outputs from the action to the record, and bind the updated jigs.
    // We do this last because the inputs and refs need to be linked before the location changes.
    action._outputs.forEach(jig => {
      if (this._outputs.has(jig)) return

      this._outputs.add(jig)

      // Records are like transactions, in that _o0 is reserved, and outputted jigs start at _o1.
      const location = `record://${this._id}_o${this._outputs.size + 1}`

      Membrane._sudo(() => {
        // Set origin
        const hasOrigin = !jig.origin.startsWith('error://')
        if (!hasOrigin) this._changes._set(jig, jig, 'origin', location)

        // Set location
        this._changes._set(jig, jig, 'location', location)

        // Bump nonce
        this._changes._set(jig, jig, 'nonce', jig.nonce + 1)
      })
    })

    // Add the action intact
    this._actions.push(action)
  }

  _publish () {
    _assert(this._alive)
    _assert(this._mutable)
    _assert(!this._parents.size)

    // The record may no longer be changed after it is in queue for publish
    this._mutable = false

    // Remove refs in inputs

    // What happens if outputs become inputs?

    // Do all references in a transaction have to be local? Would make things easier.

    // Maybe locations don't go into the changes
    // They go into bindings, which is different

    // REFERENCE TXIDS ...

    // Create Record JSON
    // Create TX
    // Pay for TX
    // Sign TX
    // Broadcast
    // Finalize locations
    // Add to cache
    // Add to inventory
    // Notify next transaction to start publishing

    // Refs needs to be a list of locations ...

    Log._debug(TAG, 'Publish', this._id)
    console.log(this._actions)
    console.log(this._inputs.size)
    console.log(this._outputs.size)
    console.log(this._refs.size)
    console.log(this._parents.size)
    console.log(this._children.size)

    const tx = new Transaction()
    const txid = tx.hash

    Log._debug(TAG, 'Broadcasting record', this._id, 'as tx', txid)

    // Set final bindings
    let vout = 1
    for (const jig of this._outputs) {
      const location = `${txid}_o${vout++}`

      Membrane._sudo(() => {
        // Set origin
        const hasOrigin = !jig.origin.startsWith('record://')
        if (!hasOrigin) this._changes._set(jig, jig, 'origin', location)

        // Set location
        this._changes._set(jig, jig, 'location', location)
      })
    }

    // If there are no children, set them on the jig
    // Otherwise, invisibly record them on our changes

    // Notify children
    for (const child of this._children) {
      child._parentPublished(this)
    }

    // After publish, the record is finished. No need to store it anymore.
    this._alive = false
  }

  _parentPublished (parent) {
    console.log('Parent published')

    // Remove the parent
    this._parents.delete(parent)

    Log._info(TAG, 'Published parent record of ', this._id, ` (${this._parents.size} remaining`)

    // Update all inputs that were parent outputs
    // for (const jig of this._inputs) {
    // If this comes from the parent ... check rollback value

    // parent._changes.get(jig, 'location')
    // this._changes._setRollbackValue(jig, jig, 'location', location)

    // this._changes.copyRollbackState(jig, parent._changes)

    //   const location = parent._changes._get(jig, 'location')
    //   this._changes._setRollbackValue(jig, jig, 'location', location)
    // And origin
    // And owner
    // And satoshis
    // And nonce
    // All bindings

    //
    // }

    // If there are no more parents, then publish this transaction too
    if (!this._parents.size) this._publish()
  }

  _rollback () {
    _assert(this._alive)

    Log._debug(TAG, 'Rollback', this._id)

    // Rollback children

    this._changes._rollback()

    // After rollback, the record is done
    this._mutable = false
    this._alive = false
  }

  _absorb (record) {
    _assert(this._alive)
    _assert(this._mutable)

    Log._debug(TAG, 'Absorbing', record._id, 'into', this._id)

    // Todo

    // After absorbing a record, it is done
    record._alive = false
  }

  _linkRecords (jig) {
    const location = Membrane._sudo(() => jig.location)
    const { record, txid } = Bindings._location(location)

    // If the jig is not in a prior record, then there's nothing to link
    if (!record) return

    // Get the parent record
    const parent = RECORDS.get(txid)
    _assert(parent, `Record not found: ${txid}`)

    // Only link published parents
    _assert(!parent._mutable)

    // Link the prior to this, and this to the prior
    Log._debug(TAG, 'Linking parent', parent._id, 'to child', this._id)
    parent._children.add(this)
    this._parents.add(parent)
  }
}

// ------------------------------------------------------------------------------------------------
// Action
// ------------------------------------------------------------------------------------------------

/**
 * The role of an action is to save all state needed later to put the action in the Record JSON.
 */
class Action {
  constructor () {
    this._inputs = new SafeSet()
    this._outputs = new SafeSet()
    this._refs = new SafeSet()
  }
}

// ------------------------------------------------------------------------------------------------
// DeployAction
// ------------------------------------------------------------------------------------------------

/**
 * Deploys a group of code together in one command
 */
class DeployAction extends Action {
  constructor (Cs) {
    super()

    Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

    // For each code to deploy, remember its source code and original properties
    this._src = []
    this._props = []

    const Membrane = require('./membrane')

    Cs.forEach(C => {
      this._outputs.add(C)

      const src = _sourceCode(C)
      const props = Membrane._sudo(() => Object.assign({}, C))

      // Remove bindings from the props because they won't be deployed
      Bindings._BINDINGS.forEach(x => delete props[x])

      // Make sure there are no presets
      _assert(!props.presets)

      const clonedProps = Membrane._sudo(() => _deepClone(props, Sandbox._hostIntrinsics))

      // Add every jig referenced in the props as a ref, which will include the parents
      _deepVisit(clonedProps, x => {
        const { Jig } = require('../jig')
        const Code = require('./code')
        if (x instanceof Jig || x instanceof Code) {
          this._refs.add(x)
          return false
        }
      })

      this._src.push(src)
      this._props.push(clonedProps)
    })
  }
}

// --------------------------------------------------------------------------
// _transaction
// --------------------------------------------------------------------------

Record._transaction = function (callback) {
  const parent = ACTIVE_RECORD
  const child = new Record()

  try {
    ACTIVE_RECORD = child

    const ret = callback(child)

    if (ret instanceof Promise) {
      throw new Error('Transactions must not include any asyncronous code')
    }

    if (parent) {
      parent._absorb(child)
    } else {
      // If the child depends on nothing, publish it
      if (!child._parents.size) child._publish()
    }
  } catch (e) {
    child._rollback()
    throw e
  } finally {
    ACTIVE_RECORD = parent
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

Record._DeployAction = DeployAction

module.exports = Record
