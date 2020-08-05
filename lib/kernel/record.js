/**
 * record.js
 *
 * Central object for recording jig actions as they happen
 */

const Membrane = require('./membrane')
const Unbound = require('../util/unbound')
const { _assert, _text, _checkState, _hasJig } = require('../util/misc')
const { _location, _UNDEPLOYED } = require('../util/bindings')
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
    // Nested transaction depth
    this._nested = 0

    // Top-level actions
    this._actions = []

    // [Action]
    this._stack = []

    // CRUDAD ordered sets. Jigs may belong to multiple.
    this._creates = []
    this._reads = []
    this._updates = []
    this._deletes = []
    this._auths = []
    this._disables = []

    // Snapshots
    this._snapshots = new Map()

    // Whether to create a commit and then publish automatically
    this._autopublish = true
  }

  // --------------------------------------------------------------------------

  /**
   * Begins a new group of actions
   */
  _begin () {
    Log._debug(TAG, 'Begin')
    this._nested++
  }

  // --------------------------------------------------------------------------

  /**
   * Ends a previous group of actions
   */
  _end () {
    _assert(this._nested)
    Log._debug(TAG, 'End')
    this._nested--
    if (!this._nested && this._autopublish) this._commit()
  }

  // --------------------------------------------------------------------------

  /**
   * Pushes an action onto the stack
   */
  _push (action) {
    _assert(action instanceof _Action)
    Log._debug(TAG, `Push ${action}`)
    this._stack.push(action)
  }

  // --------------------------------------------------------------------------

  /**
   * Pops an action from the stack
   */
  _pop () {
    _assert(this._stack.length)
    const action = this._stack.pop()
    Log._debug(TAG, `Pop ${action}`)
    if (!this._stack) this._action(action)
  }

  // --------------------------------------------------------------------------

  /**
   * Record a top-level action
   */
  _action (action) {
    _assert(action instanceof _Action)
    _assert(!this._stack.length)
    Log._debug(TAG, `Action ${action}`)
    this._actions.push(action)

    // If any jigs changed their owners or satoshis, they cannot be used in a later action
    // because those owners cannot sign off on the changes, breaking an ownership rule.
    Membrane._sudo(() => {
      for (const [jig, snapshot] of this._snapshots) {
        if (_hasJig(this._disables, jig)) continue
        if (snapshot._props.owner === jig.owner) continue
        if (snapshot._props.satoshis === jig.satoshis) continue
        if (!(jig.owner instanceof Unbound)) continue
        if (!(jig.satoshis instanceof Unbound)) continue
        this._disables.push(jig)
      }
    })

    // All deleted jigs become un-updatable
    this._deletes
      .filter(jig => !_hasJig(this._disables, jig))
      .forEach(jig => this._disables.push(jig))

    if (!this._nested && this._autopublish) this._commit()
  }

  // --------------------------------------------------------------------------

  /**
   * Converts the record into a commit
   */
  _commit () {
    const Commit = require('./commit')

    Log._debug(TAG, 'Commit')

    // If we are committing the current record, create a new current record
    if (this === Record._CURRENT_RECORD) {
      Record._CURRENT_RECORD = new Record()
    }

    // If there are no actions, then there should be no changed jigs
    if (!this._actions.length) {
      Log._warn(TAG, 'No actions found')
      _assert(!this._creates.length)
      _assert(!this._updates.length)
      _assert(!this._deletes.length)
      _assert(!this._auths.length)
      return
    }

    // Convert this record to a commit
    try {
      return new Commit(this) // eslint-disable-line
    } catch (e) {
      this._rollback()
      throw e
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a jig to the CREATE set
   */
  _create (jig) {
    if (_hasJig(this._creates, jig)) return
    Log._debug(TAG, 'Create', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    const native = Membrane._sudo(() => _location(jig.origin).nativeid)
    _assert(!native)
    _assert(!_hasJig(this._reads, jig))
    _assert(!_hasJig(this._updates, jig))
    _assert(!_hasJig(this._deletes, jig))
    _assert(!_hasJig(this._auths, jig))
    _assert(!_hasJig(this._disables, jig))

    this._creates.push(jig)
    this._snapshot(jig)
    this._authCallers()
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a jig to the READ set
   */
  _read (jig) {
    if (_hasJig(this._reads, jig)) return
    Log._debug(TAG, 'Read', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    const Berry = require('./berry')
    _assert(jig instanceof Code || jig instanceof Jig || jig instanceof Berry)

    this._reads.push(jig)
    this._snapshot(jig)
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a jig to the UPDATE set
   */
  _update (jig, existingSnapshot = undefined) {
    if (_hasJig(this._updates, jig)) return
    Log._debug(TAG, 'Update', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    const undeployed = Membrane._sudo(() => jig.origin === _UNDEPLOYED)
    _assert(!undeployed)
    const native = Membrane._sudo(() => _location(jig.origin).nativeid)
    _assert(!native)
    this._checkNotDisabled(jig)

    this._updates.push(jig)
    this._snapshot(jig, existingSnapshot)
    this._authCallers()
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a jig to the DELETE set
   */
  _delete (jig) {
    if (_hasJig(this._deletes, jig)) return
    Log._debug(TAG, 'Delete', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    const native = Membrane._sudo(() => _location(jig.origin).nativeid)
    _assert(!native)
    this._checkNotDisabled(jig)

    this._deletes.push(jig)
    this._snapshot(jig)
    this._authCallers()
  }

  // --------------------------------------------------------------------------

  /**
   * Adds a jig to the AUTH set
   */
  _auth (jig) {
    if (_hasJig(this._auths, jig)) return
    Log._debug(TAG, 'Auth', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    _assert(!_hasJig(this._creates, jig))
    this._checkNotDisabled(jig)

    this._auths.push(jig)
    this._snapshot(jig)
    this._authCallers()
  }

  // --------------------------------------------------------------------------

  /**
   * Auths all jigs used to produce some action
   */
  _authCallers () {
    this._stack
      .map(action => action._jig)
      .filter(jig => !!jig)
      .forEach(jig => this._auth(jig))
  }

  // --------------------------------------------------------------------------

  /**
   * Checks that a change to a jig can be signed by its owner
   */
  _checkNotDisabled (jig) {
    const info = `Jig: ${_text(jig)}`
    const hint = 'Hint: Split your action into multiple transactions'
    const msg1 = `New owners cannot sign for changes in this transaction\n\n${info}\n\n${hint}`
    const msg2 = `Destroyed jigs cannot be used again in this transaction\n\n${info}`
    const destroyed = _hasJig(this._deletes, jig)
    const msg = destroyed ? msg2 : msg1
    _checkState(!_hasJig(this._disables, jig), msg)
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
   * Rolls back changes to the record
   */
  _rollback (e) {
    Log._debug(TAG, 'Rollback')

    this._snapshots.forEach(snapshot => snapshot._rollback())

    // If we rolled back the current record, create a new one
    if (this === Record._CURRENT_RECORD) {
      Record._CURRENT_RECORD = new Record()
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Records a single action and rolls back if there are errors
   */
  _single (f) {
    try {
      return f()
    } catch (e) {
      this._rollback()
      throw e
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Records multiple actions and rolls back if there are errors
   */
  _multiple (f) {
    return this._single(() => {
      this._begin()
      const ret = f()
      this._end()
      return ret
    })
  }
}

// ------------------------------------------------------------------------------------------------

Record._CURRENT_RECORD = new Record()

module.exports = Record
