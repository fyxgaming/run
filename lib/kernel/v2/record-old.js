/**
 * record.js
 *
 * A recording of jig actions on the local machine
 */

/*
const { crypto, Transaction } = require('bsv')
const Action = require('./action')
const Membrane = require('./membrane')
const { _location, _BINDINGS } = require('../../util/bindings')
const { _kernel, _assert } = require('../../util/misc')
const Log = require('../../util/log')
const Codec = require('../../util/codec')
const Snapshot = require('../../util/snapshot')

// ------------------------------------------------------------------------------------------------
// Record
// ------------------------------------------------------------------------------------------------

class Record {
  _add (action) {
    // ...

    // Encode the args
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

    // Leave a placeholder if we need an owner
    const actionJson = [action._name, action._args]
    if (action._creates.length) { actionJson.push(null) }

    const codec = new Codec()._saveJigs(jigEncoder)
    const encodedAction = codec._encode(actionJson)

    // Add outputs: changed + spends + creates - deleted
    const outputs = []

    Array.from(changed)
      .concat(Array.from(action._spends))
      .concat(Array.from(action._creates))
      .filter(jig => !_jigInArray(outputs, jig))
      .filter(jig => !_jigInArray(action._deletes, jig))
      .filter(jig => !_jigInMapKeys(this._outputs, jig))
      .forEach(jig => outputs.push(jig))

    outputs.forEach(jig => {
      const key = _jigMapKey(this._outputs, jig)

      const ss = after.get(jig) || new Snapshot(jig)
      this._outputs.set(key, ss)

      const vout = this._outputs.size
      const location = `${this._id}_o${vout}`

      // Set output bindings
      Membrane._sudo(() => {
        const hasOrigin = !key.origin.startsWith('error://')

        if (!hasOrigin) key.origin = location
        key.location = location
        key.nonce = key.nonce + 1

        const ss = this._outputs.get(key)

        ss._props.origin = key.origin
        ss._props.location = key.location
        ss._props.nonce = key.nonce
      })
    })

    // Delete all deleted jigs from outputs, and set bindings
    action._deletes.forEach(jig => {
      Membrane._sudo(() => {
        const key = _jigMapKey(this._outputs, jig)
        const hasOrigin = !key.origin.startsWith('error://') && !key.origin.startsWith('record://')

        _assert(!_jigInArray(this._deletes))

        const location = `${this._id}_d${this._deletes.length}`
        if (!hasOrigin) key.origin = location
        key.location = location

        this._deletes.push(key)

        const ss = this._outputs.get(key)
        if (ss) {
          ss._props.origin = key.origin
          ss._props.location = key.location
        } else {
          key.nonce = key.nonce + 1
        }

        this._outputs.delete(key)
      })
    })

    // Add the action
    this._actions.push(encodedAction)
  }

  async _publish () {
    _assert(this._readyToPublish())
    this._published = true
    CURRENT_RECORD = null

    // Check that there is anything to publish
    if (!this._actions.length) {
      this._delete()
      return
    }

    // Figure which jigs need their bindings set
    const terminals = new Set()
    for (const [jig] of this._outputs) {
      if (!this._hasDependents(jig)) terminals.add(jig)
    }

    const Unbound = require('./unbound')

    // Bind owners and satoshis
    for (const [jig, snapshot] of this._outputs) {
      if (snapshot._props.owner instanceof Unbound) {
        snapshot._props.owner = snapshot._props.owner._value
      }

      if (snapshot._props.satoshis instanceof Unbound) {
        snapshot._props.satoshis = snapshot._props.satoshis._value
      }

      if (terminals.has(jig)) {
        Membrane._sudo(() => {
          if (jig.satoshis instanceof Unbound) { jig.satoshis = jig.satoshis._value }
          if (jig.owner instanceof Unbound) { jig.owner = jig.owner._value }
        })
      }
    }

    // Assign the owner to the actions that need it and to the jigs and snapshots
    const needsOwner = this._actions.some(action => action.length === 3 && !action[2])

    if (needsOwner) {
      const owner = await this._kernel._owner.owner()

      this._actions.forEach(action => {
        if (action.length === 3 && !action[2]) {
          action[2] = owner
        }
      })

      for (const [jig, snapshot] of this._outputs) {
        if (!snapshot._props.owner) snapshot._props.owner = owner

        Membrane._sudo(() => {
          if (!jig.owner) jig.owner = owner
        })
      }
    }

    // TODO: Deleted ... below

    // Bind origin and location to non-record locations

    // Create refs - and make inputs if they double-exit
    const refs = []
    for (const [, snapshot] of this._refs) {
      refs.push(snapshot._props.location)
    }

    // Create actions
    const exec = this._actions

    // Save states of jigs
    const states = []
    for (const [, snapshot] of this._outputs) {
      const props = new Codec()
        ._saveJigs(x => '123')
        ._encode(snapshot._props)

      states.push(props)
    }

    const jigs = states

    const json = { exec, refs, jigs }

    console.log(JSON.stringify(json, 0, 3))

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
      if (terminals.has(jig)) {
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
*/
