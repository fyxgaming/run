/**
 * record.js
 *
 * A recording of jig actions on the local machine
 */

const { crypto, Transaction } = require('bsv')
const Membrane = require('./membrane')
const Bindings = require('../../util/bindings')
const { _kernel, _assert } = require('../../util/misc')
const { _text, _sourceCode, _parent } = require('../../util/type')
const Log = require('../../util/log')
const Changes = require('../../util/changes')
const Codec = require('../../util/codec')
const { _deepClone } = require('../../util/deep')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

// The record currently currently being added to. This is the last record created.
let CURRENT_RECORD = null

// A list of the "active" records in the system. We use this to look up a record when we know its
// ID in a jig location. Active means it has not yet been broadcast.
const RECORDS = new Map() // id -> Record

// TODO
// Problem is ... do we need to store states before / after?
// What about state caching, does it matter here?
// Should rollback be rolling back cached state?
// When bindings are updated, where are they set?

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
    this._id = crypto.Random.getRandomBuffer(32).toString('hex')
    Log._debug(TAG, 'Create', this._id)

    this._editing = 0
    this._published = false

    this._actions = []
    this._changes = new Changes()

    this._inputs = [] // [Jig]
    this._outputs = [] // [Jig]
    this._refs = [] // [Jig]

    this._inputLocations = [] // [Location]
    this._inputOwners = [] // [Owner]
    this._refLocations = [] // [Location]

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
   * Deletes the record. This is called internally after the record is published or rolled back.
   */
  _delete () {
    if (CURRENT_RECORD === this) { CURRENT_RECORD = null }

    RECORDS.delete(this._id)

    this._dependencies.forEach(dependency => dependency._dependents.delete(this))
  }

  /**
   * Whether the record is able to be published
   */
  _readyToPublish () {
    return !this._editing && !this._dependencies.size && !this._published
  }

  /**
   * Adds an action to the record
   */
  _addAction (id, args, inputs, outputs, refs) {
    _assert(this._editing)

    // Add the inputs
    for (const jig of inputs) {
      if (hasJig(this._inputs, jig)) continue
      if (hasJig(this._outputs, jig)) continue

      this._inputs.push(jig)
      this._inputLocations.push(Membrane._sudo(() => jig.location))
      this._inputOwners.push(Membrane._sudo(() => _deepClone(jig.owner)))

      this._linkRecords(jig, true)
    }

    // Add the refs
    for (const jig of refs) {
      if (hasJig(this._inputs, jig)) continue
      if (hasJig(this._outputs, jig)) continue
      if (hasJig(this._refs, jig)) continue

      this._refs.push(jig)
      this._refLocations.push(Membrane._sudo(() => jig.location))

      this._linkRecords(jig, false)
    }

    // Encode the args, using the inputs and refs
    const codec = new Codec()._saveJigs(jig => {
      // Check outputs first, because when we encode actions, outputs should not be added
      const vout = indexOfJig(this._outputs, jig)
      if (vout !== -1) return `_o${vout + 1}`

      const vin = indexOfJig(this._inputs, jig)
      if (vin !== -1) return `_i${vin}`

      const vref = indexOfJig(this._refs, jig)
      if (vref !== -1) return `_r${vref}`

      // Add the ref
      this._refs.push(jig)
      this._refLocations.push(Membrane._sudo(() => jig.location))
      this._linkRecords(jig, false)
    })
    const encodedArgs = codec._encode(args)

    // Add the outputs and set any new bindings
    for (const jig of outputs) {
      if (hasJig(this._outputs, jig)) return

      const vout = this._outputs.length + 1
      const location = `record://${this._id}_o${vout}`

      this._outputs.push(jig)

      Membrane._sudo(() => {
        const hasOrigin = !jig.origin.startsWith('error://')
        if (!hasOrigin) this._changes._set(jig, jig, 'origin', location)
        this._changes._set(jig, jig, 'location', location)
        this._changes._set(jig, jig, 'nonce', jig.nonce + 1)
      })
    }

    // Add the action
    this._actions.push([id, encodedArgs])
  }

  /**
   * Broadcasts this record as a bitcoin transaction, and triggers dependents to be broadcasted too.
   */
  async _publish () {
    _assert(this._readyToPublish())
    this._published = true

    // Minimize our refs. Remove spent or outputted jigs from it.
    this._refs = this._refs.filter(jig => !hasJig(this._inputs, jig) && !hasJig(this._outputs, jig))

    // Translate refs into inputs if there double-exist

    // Serialize when the action is created
    // Refer to _iN, _oN, _rN.
    // Changes are on a transaction level, and on a JIG method. On a record level?
    // Combine records? Seems complex. More like change checkpoints.
    // For now, if a transaction fails, all dependency transactions fail.
    // So if not the deepest, and an error, rethrow at a higher level.
    // Or, just a single record at a time. Transaction knows how to roll back.
    // Transaction is a wrapper for begin/end

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
    console.log(JSON.stringify(this._actions))
    console.log('inp', this._inputs.length)
    console.log('out', this._outputs.length)
    console.log('ref', this._refs.length)
    console.log('<', this._dependencies.size)
    console.log('>', this._dependents.size)

    const tx = new Transaction()
    const txid = tx.hash

    Log._debug(TAG, 'Broadcasting record', this._id, 'as tx', txid)

    // TODO REMOVE
    // function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
    // await sleep(100)

    // Set final bindings
    let vout = 1
    for (const jig of this._outputs) {
      const spent = !hasJig(this._inputs, jig)

      if (spent) {

      }

      const location = `${txid}_o${vout++}`

      // Set this jig if! None of its dependents depend on it.
      // Outputs
      if (spent) {
        // A dependent depends on this
      }

      Membrane._sudo(() => {
        // Set origin
        const hasOrigin = !jig.origin.startsWith('record://')
        if (!hasOrigin) this._changes._set(jig, jig, 'origin', location)

        // Set location
        this._changes._set(jig, jig, 'location', location)
      })
    }

    // If there are no dependents, set them on the jig
    // Otherwise, invisibly record them on our changes

    // Notify dependents
    for (const dependent of this._dependents) {
      dependent._dependencyPublished(this)
    }

    this._delete()
  }

  /**
   * Notification when a dependency is published
   *
   * This record should updates it internal bindings with the now-known tx locations. It should
   * also remove the dependency, and if there are no more dependencies, start publishing.
   */
  _dependencyPublished (record) {
    // Remove the dependency
    this._dependencies.delete(record)

    Log._info(TAG, 'Published dependency record of', this._id, `(${this._dependencies.size} remaining)`)

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

    // Update all refs

    // If there are no more dependencies, then publish this transaction too
    if (this._readyToPublish()) this._publish()
  }

  /**
   * Rolls back and destroys this entire record and any of its dependents
   */
  _rollback () {
    if (!RECORDS.has(this._id)) return

    this._dependents.forEach(dependent => dependent._rollback())

    Log._debug(TAG, 'Rollback', this._id)

    this._changes._rollback()

    this._delete()
  }

  _linkRecords (jig, isInput) {
    const location = Membrane._sudo(() => jig.location)
    const { record, txid } = Bindings._location(location)

    // If the jig is not in a prior record, then there's nothing to link
    if (!record) return

    // Get the dependency record
    const dependency = RECORDS.get(txid)
    _assert(dependency, `Record not found: ${txid}`)

    // Only published dependencies may be depended upon
    _assert(dependency._published)

    // Link the prior to this, and this to the prior
    Log._debug(TAG, 'Linking dependency', dependency._id, 'to dependent', this._id)
    dependency._dependents.add(this)
    this._dependencies.add(dependency)
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
    try { record._rollback() } catch (e) { }
    try { record._delete() } catch (e) { }
    throw e
  }
}

// ------------------------------------------------------------------------------------------------
// _deploy
// ------------------------------------------------------------------------------------------------

Record._deploy = function (record, Cs) {
  Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

  const args = []
  const inputs = []
  const outputs = []
  const refs = []

  // Add inputs
  // By default, parents must be spent when extending. Exceptions are utility classes.
  // If the parent is being deployed however, then it doesn't need to be spent.
  Cs.forEach(C => {
    if (C.options && C.options.utility) return
    const Parent = _parent(C)
    if (!Parent) return
    if (Cs.includes(Parent)) return

    if (!hasJig(outputs, Parent)) {
      inputs.push(Parent)
      outputs.push(Parent)
    }
  })

  // Create the arguments for the deploy action
  Cs.forEach(C => {
    const src = _sourceCode(C)
    const props = Membrane._sudo(() => Object.assign({}, C))

    // Remove bindings from the props because they won't be deployed
    Bindings._BINDINGS.forEach(x => delete props[x])

    // Make sure there are no presets
    _assert(!props.presets)

    args.push(src)
    args.push(props)

    outputs.push(C)
  })

  // const clonedProps = Membrane._sudo(() => _deepClone(props, Sandbox._hostIntrinsics))

  // Add every jig referenced in the props as a ref, which will include the parents
  /*
      _deepVisit(clonedProps, x => {
        const { Jig } = require('../jig')
        const Code = require('./code')
        // Berry?
        if (x instanceof Jig || x instanceof Code) {
          if (!hasJig(this._refs)) this._refs.push(x)
          return false
        }
      })
      */

  // Store the action
  record._addAction('deploy', args, inputs, outputs, refs)
  // this._actions.push(['deploy', actionArgs])

  // Add outputs
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

function indexOfJig (arr, jig) {
  return Membrane._sudo(() => {
    for (let i = 0; i < arr.length; i++) {
      const entry = arr[i]
      if (entry === jig) return i
      if (entry.origin !== jig.origin) continue
      if (entry.location !== jig.location) throw new Error('Inconsistent worldview')
      return i
    }
    return -1
  })
}

// ------------------------------------------------------------------------------------------------

function hasJig (arr, jig) {
  return indexOfJig(arr, jig) !== -1
}

// ------------------------------------------------------------------------------------------------

module.exports = Record
