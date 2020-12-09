/**
 * record.js
 *
 * A live recording of actions on creations
 */

const bsv = require('bsv')
const { crypto } = bsv
const { _assert, _text, _hasCreation, _kernel, _defined, _addCreations, _subtractCreations } =
  require('../util/misc')
const { _location, _compileLocation, _UNDEPLOYED_LOCATION } = require('../util/bindings')
const { _sudo } = require('../util/admin')
const Snapshot = require('../util/snapshot')
const Log = require('../util/log')
const { StateError } = require('../util/errors')
const Proxy2 = require('../util/proxy2')

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

    // [Creation]
    this._stack = []

    // Error
    this._error = null

    // Live recording sets. Creations may belong to multiple.
    this._creates = []
    this._reads = []
    this._updates = []
    this._deletes = []
    this._signs = []
    this._unbound = []

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
   * Pushes an creation onto the call stack
   */
  _push (creation) {
    const Creation = require('./creation')
    _assert(!this._rolledBack)
    _assert(creation instanceof Creation)
    if (Log._debugOn) Log._debug(TAG, `Push ${_text(creation)}`)
    this._stack.push(creation)
  }

  // --------------------------------------------------------------------------

  /**
   * Pops an action from the stack
   */
  _pop () {
    _assert(this._stack.length)
    const creation = this._stack.pop()
    if (Log._debugOn) Log._debug(TAG, `Pop ${_text(creation)}`)
  }

  // --------------------------------------------------------------------------

  /**
   * Record a top-level action
   */
  _action (action) {
    _assert(!this._stack.length)

    if (Log._debugOn) Log._debug(TAG, `Action ${action}`)
    this._actions.push(action)

    // Generate derived record properties
    this._finalize()

    if (!this._replaying) {
      const kernel = _kernel()
      this._outputs.concat(this._deletes).forEach(creation => kernel._emit('update', creation))
    }

    if (!this._nested && this._autopublish) this._commit()
  }

  // --------------------------------------------------------------------------

  _finalize () {
    // The transaction sets are needed to assign record locations.
    _regenerateTransactionSets(this)

    // Locations are assigned at the end of every top-level action. This
    // allows locations to be read in the middle of an action if needed.
    _assignRecordLocations(this)
  }

  // --------------------------------------------------------------------------

  _unbind (creation) {
    _assert(!this._rolledBack)
    if (_hasCreation(this._unbound, creation)) return
    if (Log._debugOn) Log._debug(TAG, `Unbind ${_text(creation)}`)
    this._unbound.push(creation)
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
      _assert(!this._signs.length)
      return
    }

    // If this was a readonly action, like berry plucks, then no commit is generated
    if (this._actions.length && !this._creates.length && !this._updates.length &&
        !this._deletes.length && !this._signs.length) {
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
    if (_hasCreation(this._creates, creation)) { this._signCallers(); return }
    if (Log._debugOn) Log._debug(TAG, 'Create', _text(creation))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(creation instanceof Code || creation instanceof Jig)
    const native = _sudo(() => _location(creation.origin).native)
    _assert(!_defined(native))
    _assert(!_hasCreation(this._updates, creation))
    _assert(!_hasCreation(this._deletes, creation))
    _assert(!_hasCreation(this._signs, creation))
    _assert(!_hasCreation(this._unbound, creation))

    this._creates.push(creation)
    this._link(creation, false, 'create')
    this._snapshot(creation)
    this._signCallers(creation)
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
      this._checkBound(creation, 'update')
      this._signCallers(creation)
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
    this._checkBound(creation, 'update')

    this._updates.push(creation)
    this._link(creation, false, 'update')
    this._snapshot(creation, existingSnapshot)
    this._signCallers(creation)
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a creation to the DELETE set
   */
  _delete (creation) {
    this._checkNotWithinBerry(creation, 'delete')

    _assert(!this._rolledBack)
    if (_hasCreation(this._deletes, creation)) {
      this._checkBound(creation, 'delete')
      this._signCallers(creation)
      return
    }

    if (Log._debugOn) Log._debug(TAG, 'Delete', _text(creation))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(creation instanceof Code || creation instanceof Jig)
    const native = _sudo(() => _location(creation.origin).native)
    _assert(!_defined(native))
    this._checkBound(creation, 'delete')

    this._deletes.push(creation)
    this._link(creation, false, 'delete')
    this._snapshot(creation)
    this._signCallers(creation)

    // Set the creation's UTXO bindings
    _sudo(() => {
      creation.owner = null
      creation.satoshis = 0
    })
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a creation to the SIGN set
   */
  _sign (creation, callers = true) {
    this._checkNotWithinBerry(creation, 'sign')

    _assert(!this._rolledBack)
    if (_hasCreation(this._signs, creation)) {
      this._checkBound(creation, 'sign', true)
      if (callers) this._signCallers(creation)
      return
    }

    if (Log._debugOn) Log._debug(TAG, 'Sign', _text(creation))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(creation instanceof Code || creation instanceof Jig)
    _assert(!_hasCreation(this._creates, creation))
    this._checkBound(creation, 'sign', true)

    this._signs.push(creation)
    this._link(creation, false, 'sign')
    this._snapshot(creation)
    this._signCallers(creation)
  }

  // --------------------------------------------------------------------------

  /**
   * Signs all creations used to produce some action
   *
   * We sign callers because intuitively it makes more sense than the alternative. We could imagine
   * an alternative Run where calling a method on a jig that produced a change in another, or created
   * another, like event.createTicket(), didn't require a spend. In fact, it's easy to even imagine
   * use cases. You could call private methods and write transaction-like code that is not possible
   * with sidekick functions attached to jigs. The problem simply is that it feels weird. Imagine jigs
   * are machines. A getter that doesn't change anything is like reading a display off the machine. But
   * if that machine produced something or changed something else, it cannot do so passively. There
   * must be actual interactions. And therefore we say those interactions have to be signed. We try
   * to use physical analogies to jigs because they are more like physical things purely digital.
   * There is also the other issue of the initial owner being assigned to the caller. Is this right
   * behavior if the caller never approved?
   */
  _signCallers (target) {
    _assert(!this._rolledBack)
    this._stack
      .filter(creation => target !== creation)
      .filter(creation => !!creation)
      .filter(creation => !_hasCreation(this._creates, creation))
      .forEach(creation => this._sign(creation, false))
  }

  // --------------------------------------------------------------------------

  /**
   * Checks that a change to a creation can be signed by its UTXO in its current state
   */
  _checkBound (creation, method, pending) {
    const unbound = _hasCreation(this._unbound, creation) ||
      (pending && Proxy2._getHandler(creation)._pendingUnbind())
    if (unbound) {
      const reason = _hasCreation(this._deletes, creation)
        ? `${_text(creation)} deleted`
        : `${_text(creation)} has an unbound owner or satoshis value`
      throw new StateError(`${method} disabled: ${reason}`)
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Checks that we are not currently loading a berry. Many operations are disabled in this case.
   */
  _checkNotWithinBerry (creation, method) {
    if (!this._stack.length) return
    const Berry = require('./berry')
    const withinBerry = this._stack.some(creation => creation instanceof Berry)
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
    // If we're not in an action within another action, then there's no caller
    if (this._stack.length < 2) return null

    // The second-most top-of-stack is our caller
    return this._stack[this._stack.length - 2]
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
  // INPUTS = UPDATES + SIGNS + DELETES - CREATES
  record._inputs = _subtractCreations(_addCreations(_addCreations(
    record._updates, record._signs), record._deletes), record._creates)

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
