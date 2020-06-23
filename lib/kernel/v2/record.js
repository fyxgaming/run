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
const { InternalError } = require('../../util/errors')
const Codec = require('../../util/codec')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

// The record currently currently being added to
let CURRENT_RECORD = null

// A list of the "active" records in the system. We use this to look up a record when we know its
// ID in a jig location. Active means it has not yet been broadcast.
const RECORDS = new Map() // id -> Record

// TODO
// Problem is ... do we need to store states before / after?
// What about state caching, does it matter here?
// Should rollback be rolling back cached state?
// When bindings are updated, where are they set?

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

function hasJig (arr, jig) {
  return indexOfJig(arr, jig) !== -1
}

// ------------------------------------------------------------------------------------------------
// Record
// ------------------------------------------------------------------------------------------------

/**
 * A live recording of actions performed on jigs. This is turned into a JSON record in the
 * transaction that looks like the following:
 *
 *  {
 *      "exec": [
 *          ["deploy", ["class A {}", {}, "<owner>"]],
 *          ["new", [{ $ref: "_o1" }, [], "<owner>"]],
 *          ["new", [{ $ref: "_o1" }, [], "<owner>"]]
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
 *
 * Records are independent objects. Different run instances my depend on updates from each
 * other. The current Run instance when the record is created is the owner and purse.
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
    this._kernel = _kernel()
    this._id = crypto.Random.getRandomBuffer(32).toString('hex')
    Log._debug(TAG, 'Create', this._id)

    this._mutable = true
    this._actions = []
    this._changes = new Changes()

    this._inputs = [] // [Jig]
    this._outputs = [] // [Jig]
    this._refs = [] // [Jig]

    this._inputLocations = [] // [Location]
    this._inputOwners = [] // [Owner]
    this._refLocations = [] // [Location]

    this._parents = new Set() // Set<Record>
    this._children = new Set() // Set<Record>

    RECORDS.set(this._id, this)
  }

  /**
   * Adds an action to the record
   *
   * All changes made by this action to existing jigs should have already been added to _changes.
   * @param {Action} action Action to add
   */
  _add (action) {
    _assert(RECORDS.has(this._id))
    _assert(this._mutable)

    // Add inputs from the action to the record and also detect if these rely on other records.
    // If the input is from a previous output that has not been deployed, don't make it a tx input
    action._inputs
      .filter(jig => !hasJig(this._outputs, jig) && !hasJig(this._inputs, jig))
      .forEach(jig => {
        this._inputs.push(jig)
        this._linkRecords(jig, true)
      })

    // Add outputs from the action to the record
    action._outputs
      .filter(jig => !hasJig(this._outputs, jig))
      .forEach(jig => this._outputs.push(jig))

    // Add references from the action to the record and also detect if these rely on other records.
    action._refs
      .filter(jig => !hasJig(this._inputs, jig))
      .filter(jig => !hasJig(this._outputs, jig))
      .forEach(jig => {
        this._refs.push(jig)
        this._refLocations.push(Membrane._sudo(() => jig.location))
        this._linkRecords(jig, false)
      })

    // Update the location bindings for the jig outputs to be this record, so that other records
    // may depend on it. We do this last because the inputs and refs need to be linked before the
    // location changes.
    this._outputs.forEach((jig, index) => {
      // Records are like transactions, in that _o0 is reserved, and outputted jigs start at _o1.
      const location = `record://${this._id}_o${index + 1}`
      // Set origin, location, and nonce
      Membrane._sudo(() => {
        const hasOrigin = !jig.origin.startsWith('error://')
        if (!hasOrigin) this._changes._set(jig, jig, 'origin', location)
        this._changes._set(jig, jig, 'location', location)
        this._changes._set(jig, jig, 'nonce', jig.nonce + 1)
      })
    })

    // Add the action intact
    this._actions.push(action)
  }

  /**
   * Broadcasts this record as a bitcoin transaction, and triggers children to be broadcasted too.
   */
  async _publish () {
    _assert(RECORDS.has(this._id))
    _assert(this._mutable)
    _assert(!this._parents.size)

    // Minimize our refs. Remove spent or outputted jigs from it.
    this._refs = this._refs.filter(jig => !hasJig(this._inputs, jig) && !hasJig(this._outputs, jig))

    // The record may no longer be changed after it is in queue for publish
    this._mutable = false

    // Serialize when the action is created
    // Refer to _iN, _oN, _rN.
    // Changes are on a transaction level, and on a JIG method. On a record level?
    // Combine records? Seems complex. More like change checkpoints.
    // For now, if a transaction fails, all parent transactions fail.
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
    console.log(this._actions)
    console.log('inp', this._inputs.length)
    console.log('out', this._outputs.length)
    console.log('ref', this._refs.length)
    console.log('par', this._parents.size)
    console.log('chl', this._children.size)

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

      // Set this jig if! None of its children depend on it.
      // Outputs
      if (spent) {
        // A child depends on this
      }

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
    RECORDS.delete(this._id)
  }

  /**
   * Notification when a parent is published
   *
   * This record should updates it internal bindings with the now-known tx locations. It should
   * also remove the parent record, and if there are no more parents, start publishing.
   */
  _parentPublished (parent) {
    // Remove the parent
    this._parents.delete(parent)

    Log._info(TAG, 'Published parent record of', this._id, `(${this._parents.size} remaining)`)

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

    // If there are no more parents, then publish this transaction too
    if (!this._parents.size) this._publish()
  }

  /**
   * Rolls back this entire record and any children with it, then destroys it
   */
  _rollback () {
    // Don't roll back more than once
    if (!RECORDS.has(this._id)) return

    // Each child needs to be rolled back first
    for (const child of this._children) {
      child._rollback()
    }

    Log._debug(TAG, 'Rollback', this._id)

    // Now roll back this record too
    this._changes._rollback()

    // Apply the initial bindings

    // After rollback, the record is done
    this._mutable = false
    RECORDS.delete(this._id)
  }

  _absorb (record) {
    _assert(RECORDS.has(this._id))
    _assert(this._mutable)

    Log._debug(TAG, 'Absorbing', record._id, 'into', this._id)

    // Todo

    // After absorbing a record, it is done
    RECORDS.delete(this._id)
  }

  _linkRecords (jig, isInput) {
    const location = Membrane._sudo(() => jig.location)
    const { record, txid } = Bindings._location(location)

    // If the jig is not in a prior record, then there's nothing to link
    if (!record) return

    // Get the parent record
    const parent = RECORDS.get(txid)
    _assert(parent, `Record not found: ${txid}`)

    // Only published parents may be depended upon
    _assert(!parent._mutable)

    // Link the prior to this, and this to the prior
    Log._debug(TAG, 'Linking parent', parent._id, 'to child', this._id)
    parent._children.add(this)
    this._parents.add(parent)
  }

  _deploy (Cs) {
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
    this._addAction('deploy', args, inputs, outputs, refs)
    // this._actions.push(['deploy', actionArgs])

    // Add outputs
  }

  /**
   * Adds an action to the record
   * @param {string} id Unique name of the action
   * @param {*} args Unserialized action arguments
   * @param {Array<Jig|Code>} inputs Inputs to spend
   * @param {Array<Jig|Code>} outputs Outputs to generate
   * @param {Array<Jig|Code|Berry>} refs References in addition to those jigs in args
   */
  _addAction (id, args, inputs, outputs, refs) {
    console.log('ADDING', id, args)

    const codec = new Codec()._saveJigs(x => '123')

    console.log(codec._encode(args))

    /*
    Membrane._sudo(() => {
      this._inputLocations.push(jig.location)
      this._inputOwners.push(jig.owner)
      // Set input location, changes, etc.
    })
    */

    // Add inputs from the action to the record and also detect if these rely on other records.
    // If the input is from a previous output that has not been deployed, don't make it a tx input
    inputs
      .filter(jig => !hasJig(this._outputs, jig) && !hasJig(this._inputs, jig))
      .forEach(jig => {
        this._inputs.push(jig)
        this._linkRecords(jig, true)
      })

    // Set the bindings
    outputs.forEach(jig => {
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
    })

    /*
    // Serialize the action args
    const json = ResourceJSON._serialize(actionArgs, { })

        _replacer: ResourceJSON._replace._cache(
          ResourceJSON._replace._multiple(
            ResourceJSON._replace._resources(resourceSaver),
            ResourceJSON._replace._arbitraryObjects())),
            */

    // If owner generates new outputs, then record owner
  }

  _jigToLocalForm (jig) {
    // if (jig instanceof Berry) {
    // return Membrane._sudo(() => jig.location)
    // }

    // if (!(jig instanceof Jig || jig instanceof Code)) {
    // return
    // }

    // Check outputs first, because when we serialize, outputs should not be added
    const outputIndex = indexOfJig(this._outputs, jig)
    if (outputIndex !== -1) return `_o${outputIndex}`
    // Then check inputs, before we check references, because we prefer inputs
    const inputIndex = indexOfJig(this._inputs, jig)
    if (inputIndex !== -1) return `_i${inputIndex}`
    // Finally check references
    const refIndex = indexOfJig(this._references, jig)
    if (refIndex !== -1) return `_r${refIndex}`
    // If not in outputs, inputs, or references, then we haven't added the jig yet
    throw new InternalError(`Missing jig reference: ${jig}`)
  }
}

// --------------------------------------------------------------------------
// _transaction
// --------------------------------------------------------------------------

Record._transaction = function (callback) {
  const parent = CURRENT_RECORD
  const child = new Record()

  try {
    CURRENT_RECORD = child

    const ret = callback(child)

    if (ret instanceof Promise) {
      throw new Error('Transactions must not include any asyncronous code')
    }

    if (parent) {
      // TODO: BEGIN/END with a begin count for simplicity
      parent._absorb(child)
    } else {
      // If the child depends on nothing, publish it
      if (!child._parents.size) child._publish()
    }
  } catch (e) {
    child._rollback()
    throw e
  } finally {
    CURRENT_RECORD = parent
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

module.exports = Record
