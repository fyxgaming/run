/**
 * record.js
 *
 * Stores jig actions as they happen
 */

const bsv = require('bsv')
const { crypto } = bsv
const Unbound = require('../util/unbound')
const { _assert, _text, _checkState, _hasJig, _kernel } = require('../util/misc')
const { _location, _UNDEPLOYED } = require('../util/bindings')
const { _sudo } = require('../util/admin')
const Snapshot = require('../util/snapshot')
const { _Action } = require('./action')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

// ------------------------------------------------------------------------------------------------
// Record
// ------------------------------------------------------------------------------------------------

class Record {
  constructor () {
    // Create an ID
    this._id = 'record://' + crypto.Random.getRandomBuffer(32).toString('hex')

    // Nested transaction depth
    this._nested = 0

    // Top-level actions
    this._actions = []

    // [Action]
    this._stack = []

    // Error
    this._error = null

    // CRUDAD ordered sets. Jigs may belong to multiple.
    this._creates = []
    this._reads = []
    this._updates = []
    this._deletes = []
    this._auths = []
    this._disables = []

    // Commits we depend on
    this._deps = []

    // All jigs updated in this record, in order of add. This is just used to assign locations.
    this._jigs = []

    // Snapshots
    this._snapshots = new Map()

    // Whether to create a commit and then publish automatically
    this._autopublish = true

    // Whether this record is being created to replay a transaction
    this._importing = false

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

    // If any jigs changed their owners or satoshis, they cannot be used in a later action
    // because those owners cannot sign off on the changes, breaking an ownership rule.
    // However, if the owner and satoshis are unbound and undetermined, then it doesn't
    // violate the ownership rules and we allow it.
    _sudo(() => {
      for (const [jig, snapshot] of this._snapshots) {
        if (_hasJig(this._disables, jig)) continue
        if (snapshot._props.owner === jig.owner &&
          snapshot._props.satoshis === jig.satoshis) continue
        const ownerUnbound = jig.owner instanceof Unbound && jig.owner._value !== undefined
        const satoshisUnbound = jig.satoshis instanceof Unbound && jig.satoshis._value !== undefined
        if (!ownerUnbound && !satoshisUnbound) continue
        this._disable(jig)
      }
    })

    // All deleted jigs become un-updatable
    this._deletes
      .filter(jig => !_hasJig(this._disables, jig))
      .forEach(jig => this._disable(jig))

    // Assign locations to every jig updated
    this._creates.forEach(jig => this._assignRecordLocation(jig))
    this._auths.forEach(jig => this._assignRecordLocation(jig))
    this._updates.forEach(jig => this._assignRecordLocation(jig))
    this._deletes.forEach(jig => this._assignRecordLocation(jig))

    if (!this._importing) {
      const kernel = _kernel()
      this._jigs.forEach(jig => kernel._emit('update', jig))
    }

    if (!this._nested && this._autopublish) this._commit()
  }

  // --------------------------------------------------------------------------

  _disable (jig) {
    _assert(!this._rolledBack)
    if (_hasJig(this._disables, jig)) return
    if (Log._debugOn) Log._debug(TAG, `Disable ${_text(jig)}`)
    this._disables.push(jig)
  }

  // --------------------------------------------------------------------------

  _assignRecordLocation (jig) {
    if (_hasJig(this._jigs, jig)) return
    this._jigs.push(jig)
    _sudo(() => {
      const deleted = _hasJig(this._deletes, jig)
      const prefix = deleted ? '_d' : '_o'
      jig.location = `${this._id}${prefix}${this._jigs.length - 1}`
      if (jig.origin === _UNDEPLOYED) jig.origin = jig.location
    })
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

    // If there are no actions, then there should be no changed jigs
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
      !this._deletes.length && !this._auths.length) return

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
   * Adds a jig to the CREATE set
   */
  _create (jig) {
    this._checkNotWithinBerry(jig, 'create')

    _assert(!this._rolledBack)
    if (_hasJig(this._creates, jig)) { this._authCallers(); return }
    if (Log._debugOn) Log._debug(TAG, 'Create', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    const native = _sudo(() => _location(jig.origin).nativeid)
    _assert(!native)
    _assert(!_hasJig(this._updates, jig))
    _assert(!_hasJig(this._deletes, jig))
    _assert(!_hasJig(this._auths, jig))
    _assert(!_hasJig(this._disables, jig))

    this._creates.push(jig)
    this._link(jig, false, 'create')
    this._snapshot(jig)
    this._authCallers()
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a jig to the READ set
   */
  _read (jig) {
    _assert(!this._rolledBack)
    if (_hasJig(this._reads, jig)) return
    if (Log._debugOn) Log._debug(TAG, 'Read', _text(jig))

    const Universal = require('./universal')
    _assert(jig instanceof Universal)

    this._reads.push(jig)
    this._link(jig, true, 'read')
    this._snapshot(jig)
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a jig to the UPDATE set
   */
  _update (jig, existingSnapshot = undefined) {
    this._checkNotWithinBerry(jig, 'update')

    _assert(!this._rolledBack)
    if (_hasJig(this._updates, jig)) {
      this._checkNotDisabled(jig, 'update')
      this._authCallers()
      return
    }

    if (Log._debugOn) Log._debug(TAG, 'Update', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    const undeployed = _sudo(() => jig.origin === _UNDEPLOYED)
    _assert(!undeployed || _hasJig(this._creates, jig))
    const native = _sudo(() => _location(jig.origin).nativeid)
    _assert(!native)
    this._checkNotDisabled(jig, 'update')

    this._updates.push(jig)
    this._link(jig, false, 'update')
    this._snapshot(jig, existingSnapshot)
    this._authCallers()
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a jig to the DELETE set
   */
  _delete (jig) {
    this._checkNotWithinBerry(jig, 'delete')

    _assert(!this._rolledBack)
    if (_hasJig(this._deletes, jig)) {
      this._checkNotDisabled(jig, 'delete')
      this._authCallers()
      return
    }

    if (Log._debugOn) Log._debug(TAG, 'Delete', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    const native = _sudo(() => _location(jig.origin).nativeid)
    _assert(!native)
    this._checkNotDisabled(jig, 'delete')

    this._deletes.push(jig)
    this._link(jig, false, 'delete')
    this._snapshot(jig)
    this._authCallers()

    // Set the jig's owner and satoshis
    _sudo(() => {
      jig.owner = null
      jig.satoshis = 0
    })
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a jig to the AUTH set
   */
  _auth (jig, callers = true) {
    this._checkNotWithinBerry(jig, 'auth')

    _assert(!this._rolledBack)
    if (_hasJig(this._auths, jig)) {
      this._checkNotDisabled(jig, 'auth')
      if (callers) this._authCallers()
      return
    }

    if (Log._debugOn) Log._debug(TAG, 'Auth', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    _assert(!_hasJig(this._creates, jig))
    this._checkNotDisabled(jig, 'auth')

    this._auths.push(jig)
    this._link(jig, false, 'auth')
    this._snapshot(jig)
    this._authCallers()
  }

  // --------------------------------------------------------------------------

  /**
   * Auths all jigs used to produce some action
   */
  _authCallers () {
    _assert(!this._rolledBack)
    this._stack
      .map(action => action._jig)
      .filter(jig => !!jig)
      .filter(jig => !_hasJig(this._creates, jig))
      .forEach(jig => this._auth(jig, false))
  }

  // --------------------------------------------------------------------------

  /**
   * Checks that a change to a jig can be signed by its owner
   */
  _checkNotDisabled (jig, method) {
    const reason = _hasJig(this._deletes, jig) ? `${_text(jig)} deleted` : `${_text(jig)} has an unbound new owner or satoshis value`
    const msg = `${method} disabled: ${reason}`
    _checkState(!_hasJig(this._disables, jig), msg)
  }

  // --------------------------------------------------------------------------

  /**
   * Checks that we are not currently loading a berry. Many operations are disabled in this case.
   */
  _checkNotWithinBerry (jig, method) {
    if (!this._stack.length) return
    const Berry = require('./berry')
    const withinBerry = this._stack.some(action => action._jig instanceof Berry)
    const error = `Cannot ${method} ${_text(jig)} in berry`
    _checkState(!withinBerry, error)
  }

  // --------------------------------------------------------------------------

  /**
   * Takes a snapshot of a jig if it has not already been captured
   */
  _snapshot (jig, existingSnapshot) {
    if (this._snapshots.has(jig)) return
    const snapshot = existingSnapshot || new Snapshot(jig)
    this._snapshots.set(jig, snapshot)
  }

  // --------------------------------------------------------------------------

  /**
   * Hooks up this commit to the upstream commit the jig is in
   */
  _link (jig, readonly, method) {
    _assert(!this._rolledBack)

    const location = _sudo(() => jig.location)
    const { commitid, recordid } = _location(location)

    // Reading from an open transaction is safe. Writing is definitely not.
    // Linking should happen before any updates happen, so this should be safe.
    if (recordid) {
      const thisRecord = recordid.startsWith(this._id)
      if (!thisRecord && !readonly) throw new Error(`Cannot ${method} ${_text(jig)}: open transaction`)
      return
    }

    // Commits should be being published. If not, we are in a transaction.
    if (commitid) {
      const Commit = require('./commit')
      const commit = Commit._findPublishing(commitid)
      if (!commit && !readonly) throw new Error(`Cannot ${method} ${_text(jig)}: open transaction`)
      if (commit && !this._deps.includes(commit)) this._deps.push(commit)
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Rolls back changes to the record
   */
  _rollback (e) {
    if (this._rolledBack) return

    if (Log._debugOn) Log._debug(TAG, 'Rollback')

    // Roll back each jig modified
    this._snapshots.forEach(snapshot => snapshot._rollback())

    // If we rolled back the current record, create a new one
    if (this._id === Record._CURRENT_RECORD._id) {
      Record._CURRENT_RECORD = new Record()
    }

    // Notify of the rollback if any code is checking
    const kernel = _kernel()
    this._jigs.forEach(jig => kernel._emit('update', jig))

    // Mark rolled back so that we don't use it again
    this._rolledBack = true
  }

  // --------------------------------------------------------------------------

  /**
   * Gets the calling jig for the currently running action
   */
  _caller () {
    // Get the call and pluck actions. New actions are skipped over.
    const { _CallAction } = require('./action')
    const callStack = this._stack.filter(x => x instanceof _CallAction)

    // If we're not in an action within another action, then there's no caller
    if (callStack.length < 2) return null

    // The second-most top-of-stack is our caller
    return callStack[callStack.length - 2]._jig
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
      this._rollback()
      throw e
    }
  }
}

// ------------------------------------------------------------------------------------------------

Record._CURRENT_RECORD = new Record()

module.exports = Record
