/**
 * record.js
 *
 * A recording of jig actions on the local machine
 */

const { crypto, Transaction } = require('bsv')
const Action = require('./action')
const Membrane = require('./membrane')
const { _location, _BINDINGS } = require('../../util/bindings')
const { _kernel, _assert } = require('../../util/misc')
const Log = require('../../util/log')
const Codec = require('../../util/codec')
const Snapshot = require('../../util/snapshot')
const { _sameJig, _jigMapKey, _jigInMapKeys, _indexOfJigInMapKeys } = require('../../util/misc2')

// TODO
//    -publish functionality
//    -publish async .. needs catch, and sync listeners
//    -sync functionality
//    -Detect if owners need to be set. Same for satoshis.
//    -Check that references and inputs are not the same
//    -Don't publish if no actions
//    -Inputs without outputs (Destroys), what is the location?

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

// The record currently currently being added to. This is the last record created.
let CURRENT_RECORD = null

// A list of the "active" records in the system. We use this to look up a record when we know its
// ID in a jig location. Active means it has not yet been broadcast.
const RECORDS = new Map() // id -> Record

// ------------------------------------------------------------------------------------------------
// Record
// ------------------------------------------------------------------------------------------------

/**
 * A live recording of actions performed on jigs.
 *
 * Records can be turned into transactions. The data in a record is serialized into an OP_RETURN
 * output. Records are independent and different Run instances may depend on updates from different
 * records. The current Run instance when the record is created is used for the owner and purse.
 */
class Record {
  constructor () {
    this._kernel = _kernel()
    this._id = 'record://' + crypto.Random.getRandomBuffer(32).toString('hex')
    Log._debug(TAG, 'Create', this._id)

    this._editing = 0
    this._published = false

    this._actions = []

    this._inputs = new Map() // Jig -> Snapshot
    this._outputs = new Map() // Jig -> Snapshot
    this._refs = new Map() // Jig -> Snapshot

    this._dependencies = new Set() // Set<Record>
    this._dependents = new Set() // Set<Record>

    RECORDS.set(this._id, this)
    CURRENT_RECORD = this
  }

  /**
   * Begins editing to add actions
   */
  _begin () {
    _assert(RECORDS.has(this._id))
    _assert(!this._published)

    this._editing++
  }

  /**
   * Ends editing
   */
  _end () {
    _assert(this._editing)
    _assert(!this._published)

    this._editing--
  }

  /**
   * Creates a new action. The callback is passed an Action object to fill in.
   */
  _action (callback) {
    const action = new Action()

    try {
      callback(action)

      this._add(action)
    } catch (e) {
      try { action._rollback() } catch (e) { Log._warn(TAG, 'Error during action rollback', e) }
      throw e
    }
  }

  /**
   * Adds an action to the record
   */
  _add (action) {
    _assert(this._editing)
    _assert(action._name)
    _assert(Array.isArray(action._args))

    // Get snapshots of each jig after the action
    const after = new Map()
    for (const [jig] of action._snapshots) {
      after.set(jig, new Snapshot(after))
    }

    // Determine which jigs changed and must be spent
    const changed = new Set()
    for (const [jig, snapshot] of action._snapshots) {
      if (!snapshot.equals(after.get(jig))) {
        changed.add(jig)
      }
    }

    console.log('CHANGED', changed)

    // Add each spend

    // Add action

    // TODO
    const inputs = new Map()
    const outputs = new Map()
    const refs = new Map()

    // Is there anything in this action?

    // Add each input
    // If the input's location

    // What about rolling back snapshots

    // To add an input,

    // Add the inputs
    for (const [jig, snapshot] of inputs) {
      // If this jig is already an input, then it must also be an output to be used
      if (_jigInMapKeys(this._inputs, jig)) {
        _assert(_jigInMapKeys(this._outputs, jig))
        continue
      }

      // If the input's previous state is unbound and not undefined

      // If this jig is a new output, then
      if (_jigInMapKeys(this._outputs, jig)) continue

      this._inputs.set(jig, snapshot)

      this._addDependency(jig)
    }

    // Add the refs
    for (const [jig, snapshot] of refs) {
      if (_jigInMapKeys(this._inputs, jig)) continue
      if (_jigInMapKeys(this._outputs, jig)) continue
      if (_jigInMapKeys(this._refs, jig)) continue

      this._refs.set(jig, snapshot)

      this._addDependency(jig)
    }

    const jigEncoder = jig => {
      // Check outputs first because action outputs have not be added
      const vout = _indexOfJigInMapKeys(this._outputs, jig) + 1
      if (vout !== -1) return `_o${vout}`

      const vin = _indexOfJigInMapKeys(this._inputs, jig)
      if (vin !== -1) return `_i${vin}`

      const vref = _indexOfJigInMapKeys(this._refs, jig)
      if (vref !== -1) return `_r${vref}`

      // Add the ref
      this._refs.set(jig, new Snapshot(jig))
      this._addDependency(jig)
      return `r${this._refs.size - 1}`
    }

    // Encode the args
    const codec = new Codec()._saveJigs(jigEncoder)
    const encodedArgs = codec._encode(action._args)

    // Add the outputs
    for (const [jig, snapshot] of outputs) {
      if (_jigInMapKeys(this._outputs, jig)) return

      // Must not be deployed if not an input

      const vout = this._outputs.size
      const location = `${this._id}_o${vout}`

      this._outputs.set(jig, snapshot)

      // Set bindings
      Membrane._sudo(() => {
        const hasOrigin = !jig.origin.startsWith('error://')

        if (!hasOrigin) jig.origin = location
        jig.location = location
        jig.nonce = jig.nonce + 1

        snapshot._props.origin = jig.origin
        snapshot._props.location = jig.location
        snapshot._props.nonce = jig.nonce
      })
    }

    // Add the action
    this._actions.push([action._name, encodedArgs])
  }

  /**
   * Whether the record is able to be published
   */
  _readyToPublish () {
    return !this._editing && !this._dependencies.size && !this._published
  }

  /**
   * Broadcasts this record as a bitcoin transaction, and triggers dependents to be broadcasted too.
   */
  async _publish () {
    _assert(this._readyToPublish())
    this._published = true
    CURRENT_RECORD = null

    // Check that there is anything to publish
    // Create refs - and make inputs if they double-exit
    // Create actions
    // Get states of jigs
    // Hash states of jigs
    // Create Record JSON
    // Create TX
    // Pay for TX
    // Sign TX
    // Broadcast
    // Apply final bindings, outputs and deletes
    // Add to cache
    // Add to inventory
    // Notify next transaction to start publishing

    Log._debug(TAG, 'Publish', this._id)
    console.log(JSON.stringify(this._actions))
    console.log('inp', this._inputs.size)
    console.log('out', this._outputs.size)
    console.log('ref', this._refs.size)
    console.log('<', this._dependencies.size)
    console.log('>', this._dependents.size)

    const tx = new Transaction()
    const txid = tx.hash

    Log._debug(TAG, 'Broadcasting', this._id, 'as tx', txid)

    // TODO REMOVE
    function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
    await sleep(100)

    // Set final bindings
    let vout = 1
    for (const [jig, snapshot] of this._outputs) {
      const location = `${txid}_o${vout++}`

      const hasOrigin = !snapshot._props.origin.startsWith('record://')
      if (!hasOrigin) snapshot._props.origin = location
      snapshot._props.location = location

      // Owner, and satoshis

      vout++

      // Set this jig if none of the dependent records input it.
      const hasDependents = Array.from(this._dependents)
        .some(record => Array.from(record._inputs.keys()).some(jig2 => _sameJig(jig, jig2)))
      if (!hasDependents) {
        Membrane._sudo(() => {
          jig.origin = location
          jig.location = location
        })
      }
    }

    // Notify dependents
    for (const dependent of this._dependents) {
      dependent._dependencyPublished(this)
    }

    this._delete()
  }

  /**
   * Rolls back and destroys this entire record and any of its dependents
   */
  _rollback (e) {
    if (!RECORDS.has(this._id)) return

    const e2 = new Error(`A dependent transaction failed\n\n${e}`)
    this._dependents.forEach(dependent => dependent._rollback(e2))

    Log._debug(TAG, 'Rollback', this._id)

    // Mark all outputs as not deployed
    for (const [jig] of this._outputs) {
      Membrane._sudo(() => {
        let location = 'error://Not deployed'
        if (e) location += `\n\n${e}`
        jig.origin = location
        jig.location = location
      })
    }

    // Roll back all input states
    for (const [jig, snapshot] of this._inputs) {
      Membrane._sudo(() => {
        Object.assign(jig, snapshot.props)
      })
    }

    this._delete()
  }

  /**
   * Deletes the record. This is called internally after the record is published or rolled back.
   */
  _delete () {
    if (CURRENT_RECORD === this) { CURRENT_RECORD = null }

    RECORDS.delete(this._id)

    this._dependencies.forEach(dependency => dependency._dependents.delete(this))
  }

  /**
   * Connects dependency records based on a jig
   */
  _addDependency (jig) {
    const location = Membrane._sudo(() => jig.location)
    const { record } = _location(location)

    // If the jig is not in a prior record, then there's nothing to link
    if (!record) return

    // Get the dependency record
    const dependency = RECORDS.get(record)
    _assert(dependency, `Record not found: ${record}`)

    // Only published dependencies may be depended upon
    _assert(dependency._published)

    // Link the prior to this, and this to the prior
    Log._debug(TAG, 'Linking dependency', dependency._id, 'to', this._id)
    dependency._dependents.add(this)
    this._dependencies.add(dependency)
  }

  /**
   * Notification when a dependency is published
   */
  _dependencyPublished (record) {
    this._dependencies.delete(record)

    Log._info(TAG, 'Published dependency of', this._id, `(${this._dependencies.size} remaining)`)

    // For each output, copy the bindings to our input and ref snapshots
    for (const [jig, snapshot] of record._outputs) {
      if (_jigInMapKeys(this._inputs, jig)) {
        const key = _jigMapKey(this._inputs, jig)
        const inputSnapshot = this._inputs.get(key)
        _BINDINGS.forEach(key => { inputSnapshot._props[key] = snapshot._props[key] })
      }

      if (_jigInMapKeys(this._refs, jig)) {
        const key = _jigMapKey(this._refs, jig)
        const refSnapshot = this._ref.get(key)
        _BINDINGS.forEach(key => { refSnapshot._props[key] = snapshot._props[key] })
      }
    }

    // If there are no more dependencies, then publish this transaction too
    if (this._readyToPublish()) this._publish()
  }
}

// ------------------------------------------------------------------------------------------------
// _transaction
// ------------------------------------------------------------------------------------------------

Record._transaction = function (callback) {
  const record = CURRENT_RECORD || new Record()

  try {
    record._begin()

    const ret = callback(record)
    if (ret instanceof Promise) {
      throw new Error('Transactions must not include any asyncronous code')
    }

    record._end()

    if (record._readyToPublish()) {
      record._publish()
    }
  } catch (e) {
    try { record._rollback(e) } catch (e) { Log._warn(TAG, 'Error during record rollback', e) }
    try { record._delete() } catch (e) { Log._warn(TAG, 'Error during record delete', e) }
    throw e
  }
}

// ------------------------------------------------------------------------------------------------
// _import
// ------------------------------------------------------------------------------------------------

Record._import = function (transaction) {
  // TODO
  // Returns record
  // Override publish
  // Change owner for each action
}

// ------------------------------------------------------------------------------------------------

module.exports = Record
