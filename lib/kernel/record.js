/**
 * record.js
 *
 * A live recording of actions on creations
 */

const bsv = require('bsv')
const { crypto } = bsv
const Unbound = require('../util/unbound')
const { _assert, _text, _hasCreation, _kernel, _defined, _addCreations, _subtractCreations } =
  require('../util/misc')
const { _location, _compileLocation, _UNDEPLOYED_LOCATION } = require('../util/bindings')
const { _sudo } = require('../util/admin')
const Snapshot = require('../util/snapshot')
const { _Action } = require('./action')
const Log = require('../util/log')
const { StateError } = require('../util/errors')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

// ------------------------------------------------------------------------------------------------
// Record
// ------------------------------------------------------------------------------------------------

class Record {
  constructor () {
    // Generate a unique id
    this._id = crypto.Random.getRandomBuffer(32).toString('hex')

    // Nested recording block depth
    this._nested = 0

    // Top-level actions
    this._actions = []

    // [Action]
    this._stack = []

    // Error
    this._error = null

    // Live recording sets. Creations may belong to multiple.
    this._creates = []
    this._reads = []
    this._updates = []
    this._deletes = []
    this._auths = []
    this._disables = []

    // Transaction sets. Generated from the recording sets.
    this._inputs = []
    this._outputs = []
    this._refs = []

    // Commits we depend on
    this._upstream = []

    // Full snapshots for incoming creations
    this._before = new Map()

    // Whether to create a commit and then publish automatically
    this._autopublish = true

    // Whether this record is being created to replay a transaction
    this._replaying = false

    // If rolled back, we can't use this record again. A new one must be created
    this._rolledBack = false
  }

  // --------------------------------------------------------------------------

  /**
   * Begins a new group of actions
   */
  _begin () {
    _assert(!this._rolledBack)
    if (Log._debugOn) Log._debug(TAG, 'Begin')
    this._nested++
  }

  // --------------------------------------------------------------------------

  /**
   * Ends a previous group of actions
   */
  _end () {
    _assert(this._nested)
    if (Log._debugOn) Log._debug(TAG, 'End')
    this._nested--
    if (!this._nested && this._autopublish && !this._rolledBack) this._commit()
  }

  // --------------------------------------------------------------------------

  /**
   * Pushes an action onto the stack
   */
  _push (action) {
    _assert(!this._rolledBack)
    _assert(action instanceof _Action)
    if (Log._debugOn) Log._debug(TAG, `Push ${action}`)
    this._stack.push(action)
  }

  // --------------------------------------------------------------------------

  /**
   * Pops an action from the stack
   */
  _pop () {
    _assert(this._stack.length)
    const action = this._stack.pop()
    if (Log._debugOn) Log._debug(TAG, `Pop ${action}`)
    if (!this._stack.length && !this._rolledBack) this._action(action)
  }

  // --------------------------------------------------------------------------

  /**
   * Record a top-level action
   */
  _action (action) {
    _assert(action instanceof _Action)
    _assert(!this._stack.length)
    if (Log._debugOn) Log._debug(TAG, `Add ${action}`)
    this._actions.push(action)

    // If any creations changed their owners or satoshis, they cannot be used in a later action
    // because those owners cannot sign off on the changes, breaking an ownership rule.
    // However, if the owner and satoshis are unbound and undetermined, then it doesn't
    // violate the ownership rules and we allow it.
    _sudo(() => {
      for (const [creation, snapshot] of this._before) {
        if (_hasCreation(this._disables, creation)) continue
        if (snapshot._props.owner === creation.owner &&
          snapshot._props.satoshis === creation.satoshis) continue
        const ownerUnbound = creation.owner instanceof Unbound && creation.owner._value !== undefined
        const satoshisUnbound = creation.satoshis instanceof Unbound && creation.satoshis._value !== undefined
        if (!ownerUnbound && !satoshisUnbound) continue
        this._disable(creation)
      }
    })

    // All deleted creations become un-updatable
    this._deletes
      .filter(creation => !_hasCreation(this._disables, creation))
      .forEach(creation => this._disable(creation))

    // The transaction sets are needed to assign record locations.
    _regenerateTransactionSets(this)

    // Locations are assigned at the end of every top-level action. This
    // allows locations to be read in the middle of an action if needed.
    _assignRecordLocations(this)

    if (!this._replaying) {
      const kernel = _kernel()
      this._outputs.concat(this._deletes).forEach(creation => kernel._emit('update', creation))
    }

    if (!this._nested && this._autopublish) this._commit()
  }

  // --------------------------------------------------------------------------

  _disable (creation) {
    _assert(!this._rolledBack)
    if (_hasCreation(this._disables, creation)) return
    if (Log._debugOn) Log._debug(TAG, `Disable ${_text(creation)}`)
    this._disables.push(creation)
  }

  // --------------------------------------------------------------------------

  /**
   * Converts the record into a commit
   */
  _commit () {
    _assert(!this._rolledBack)

    const Commit = require('./commit')

    if (Log._debugOn) Log._debug(TAG, 'Commit')

    // If we are committing the current record, create a new current record
    if (this._id === Record._CURRENT_RECORD._id) {
      _assert(!Record._CURRENT_RECORD._nested)
      Record._CURRENT_RECORD = new Record()
    }

    // If there are no actions, then there should be no changed creations
    if (!this._actions.length) {
      if (Log._warnOn) Log._warn(TAG, 'No actions found')
      _assert(!this._creates.length)
      _assert(!this._updates.length)
      _assert(!this._deletes.length)
      _assert(!this._auths.length)
      return
    }

    // If this was a readonly action, then no commit is generated
    if (this._actions.length && !this._creates.length && !this._updates.length &&
        !this._deletes.length && !this._auths.length) {
      return
    }

    // Convert this record to a commit
    try {
      return new Commit(this) // eslint-disable-line
    } catch (e) {
      this._rollback(e)
      throw e
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a creation to the CREATE set
   */
  _create (creation) {
    this._checkNotWithinBerry(creation, 'create')

    _assert(!this._rolledBack)
    if (_hasCreation(this._creates, creation)) { this._authCallers(); return }
    if (Log._debugOn) Log._debug(TAG, 'Create', _text(creation))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(creation instanceof Code || creation instanceof Jig)
    const native = _sudo(() => _location(creation.origin).native)
    _assert(!_defined(native))
    _assert(!_hasCreation(this._updates, creation))
    _assert(!_hasCreation(this._deletes, creation))
    _assert(!_hasCreation(this._auths, creation))
    _assert(!_hasCreation(this._disables, creation))

    this._creates.push(creation)
    this._link(creation, false, 'create')
    this._snapshot(creation)
    this._authCallers()
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a creation to the READ set
   */
  _read (creation) {
    _assert(!this._rolledBack)
    if (_hasCreation(this._reads, creation)) return
    if (Log._debugOn) Log._debug(TAG, 'Read', _text(creation))

    const Creation = require('./creation')
    _assert(creation instanceof Creation)

    this._reads.push(creation)
    this._link(creation, true, 'read')
    this._snapshot(creation, undefined, true)
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a creation to the UPDATE set
   */
  _update (creation, existingSnapshot = undefined) {
    this._checkNotWithinBerry(creation, 'update')

    _assert(!this._rolledBack)
    if (_hasCreation(this._updates, creation)) {
      this._checkNotDisabled(creation, 'update')
      this._authCallers()
      return
    }

    if (Log._debugOn) Log._debug(TAG, 'Update', _text(creation))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(creation instanceof Code || creation instanceof Jig)
    const undeployed = _sudo(() => creation.origin === _UNDEPLOYED_LOCATION)
    _assert(!undeployed || _hasCreation(this._creates, creation))
    const native = _sudo(() => _location(creation.origin).native)
    _assert(!_defined(native))
    this._checkNotDisabled(creation, 'update')

    this._updates.push(creation)
    this._link(creation, false, 'update')
    this._snapshot(creation, existingSnapshot)
    this._authCallers()
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a creation to the DELETE set
   */
  _delete (creation) {
    this._checkNotWithinBerry(creation, 'delete')

    _assert(!this._rolledBack)
    if (_hasCreation(this._deletes, creation)) {
      this._checkNotDisabled(creation, 'delete')
      this._authCallers()
      return
    }

    if (Log._debugOn) Log._debug(TAG, 'Delete', _text(creation))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(creation instanceof Code || creation instanceof Jig)
    const native = _sudo(() => _location(creation.origin).native)
    _assert(!_defined(native))
    this._checkNotDisabled(creation, 'delete')

    this._deletes.push(creation)
    this._link(creation, false, 'delete')
    this._snapshot(creation)
    this._authCallers()

    // Set the creation's UTXO bindings
    _sudo(() => {
      creation.owner = null
      creation.satoshis = 0
    })
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a creation to the AUTH set
   */
  _auth (creation, callers = true) {
    this._checkNotWithinBerry(creation, 'auth')

    _assert(!this._rolledBack)
    if (_hasCreation(this._auths, creation)) {
      this._checkNotDisabled(creation, 'auth')
      if (callers) this._authCallers()
      return
    }

    if (Log._debugOn) Log._debug(TAG, 'Auth', _text(creation))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(creation instanceof Code || creation instanceof Jig)
    _assert(!_hasCreation(this._creates, creation))
    this._checkNotDisabled(creation, 'auth')

    this._auths.push(creation)
    this._link(creation, false, 'auth')
    this._snapshot(creation)
    this._authCallers()
  }

  // --------------------------------------------------------------------------

  /**
   * Auths all creations used to produce some action
   */
  _authCallers () {
    _assert(!this._rolledBack)
    this._stack
      .map(action => action._creation)
      .filter(creation => !!creation)
      .filter(creation => !_hasCreation(this._creates, creation))
      .forEach(creation => this._auth(creation, false))
  }

  // --------------------------------------------------------------------------

  /**
   * Checks that a change to a creation can be signed by its owner
   */
  _checkNotDisabled (creation, method) {
    const reason = _hasCreation(this._deletes, creation) ? `${_text(creation)} deleted`
      : `${_text(creation)} has an unbound new owner or satoshis value`
    if (_hasCreation(this._disables, creation)) throw new StateError(`${method} disabled: ${reason}`)
  }

  // --------------------------------------------------------------------------

  /**
   * Checks that we are not currently loading a berry. Many operations are disabled in this case.
   */
  _checkNotWithinBerry (creation, method) {
    if (!this._stack.length) return
    const Berry = require('./berry')
    const withinBerry = this._stack.some(action => action._creation instanceof Berry)
    if (withinBerry) throw new StateError(`Cannot ${method} ${_text(creation)} in berry`)
  }

  // --------------------------------------------------------------------------

  /**
   * Takes a snapshot of a creation if it has not already been captured
   */
  _snapshot (creation, existingSnapshot, readOnly) {
    const rollbacks = () => { try { return _kernel()._rollbacks } catch (e) { return false } }
    const bindingsOnly = readOnly || !rollbacks()

    // If we have a pre-existing snapshot, make a full snapshot if this is bindings only
    const prevss = this._before.get(creation)
    if (prevss) {
      if (!bindingsOnly && prevss._bindingsOnly) prevss._captureAll()
      if (!readOnly) prevss._readOnly = false
      return
    }

    const snapshot = existingSnapshot || new Snapshot(creation, bindingsOnly, readOnly)
    this._before.set(creation, snapshot)
  }

  // --------------------------------------------------------------------------

  /**
   * Hooks up this commit to the upstream commit the creation is in
   */
  _link (creation, readonly, method) {
    _assert(!this._rolledBack)

    const location = _sudo(() => creation.location)
    const loc = _location(location)

    if (_defined(loc.record)) {
      // If we are linking to ourselves, ie. in a transaction, don't add it to our upstream set
      if (loc.record === this._id) return

      const Commit = require('./commit')
      const commit = Commit._findPublishing(loc.record)

      // Reading from an open transaction is safe. Writing is definitely not.
      if (!commit && !readonly) throw new Error(`Cannot ${method} ${_text(creation)}: open transaction`)

      // If the commit is not published, then link to it
      if (commit && !this._upstream.includes(commit) && !commit._published) {
        this._upstream.push(commit)
      }
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Rolls back changes to the record
   */
  _rollback (e) {
    if (this._rolledBack) return

    if (Log._debugOn) Log._debug(TAG, 'Rollback')

    // Roll back each creation modified
    this._before.forEach(snapshot => snapshot._rollback(e))

    // If we rolled back the current record, create a new one
    if (this._id === Record._CURRENT_RECORD._id) {
      Record._CURRENT_RECORD = new Record()
    }

    // Notify of the rollback if any code is checking
    const kernel = _kernel()
    this._outputs.concat(this._deletes).forEach(creation => kernel._emit('update', creation))

    // Mark rolled back so that we don't use it again
    this._rolledBack = true
  }

  // --------------------------------------------------------------------------

  /**
   * Gets the calling creation for the currently running action
   */
  _caller () {
    // Get the call and pluck actions. New actions are skipped over.
    const { _CallAction } = require('./action')
    const callStack = this._stack.filter(x => x instanceof _CallAction)

    // If we're not in an action within another action, then there's no caller
    if (callStack.length < 2) return null

    // The second-most top-of-stack is our caller
    return callStack[callStack.length - 2]._creation
  }

  // --------------------------------------------------------------------------

  /**
   * Records updates to the record and rolls back if there are errors
   *
   * All updates should be in a capture operation to be safe.
   */
  _capture (f) {
    try {
      this._begin()
      const ret = f()
      this._end()
      return ret
    } catch (e) {
      this._rollback(e)
      throw e
    }
  }
}

// ------------------------------------------------------------------------------------------------
// _regenerateTransactionSets
// ------------------------------------------------------------------------------------------------

function _regenerateTransactionSets (record, readonly) {
  // INPUTS = UPDATES + AUTHS + DELETES - CREATES
  record._inputs = _subtractCreations(_addCreations(_addCreations(
    record._updates, record._auths), record._deletes), record._creates)

  // OUTPUTS = INPUTS + CREATES - DELETES
  record._outputs = _subtractCreations(_addCreations(
    record._inputs, record._creates), record._deletes)

  // REFS = READS - INPUTS - OUTPUTS - DELETES
  record._refs = _subtractCreations(_subtractCreations(_subtractCreations(
    record._reads, record._inputs), record._outputs), record._deletes)
}

// ------------------------------------------------------------------------------------------------
// _assignRecordLocations
// ------------------------------------------------------------------------------------------------

function _assignRecordLocations (record) {
  const requiresOrigin = creation => {
    const loc = _location(creation.origin)
    return loc.undeployed || loc.record === record._id
  }

  _sudo(() => {
    record._outputs.forEach((creation, n) => {
      creation.location = _compileLocation({ record: record._id, vout: n + 1 })
      if (requiresOrigin(creation)) creation.origin = creation.location
      creation.nonce = record._before.get(creation)._props.nonce + 1
    })

    record._deletes.forEach((creation, n) => {
      creation.location = _compileLocation({ record: record._id, vdel: n })
      if (requiresOrigin(creation)) creation.origin = creation.location
      creation.nonce = record._before.get(creation)._props.nonce + 1
    })
  })
}

// ------------------------------------------------------------------------------------------------

Record._CURRENT_RECORD = new Record()

module.exports = Record
