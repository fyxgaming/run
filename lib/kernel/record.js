/**
 * Record.js
 *
 * Central object for recording jig actions as they happen
 */

const Membrane = require('./membrane')
const { _assert, _text } = require('../util/misc')
const { _location, _UNDEPLOYED } = require('../util/bindings')
const Snapshot = require('../util/snapshot')
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
    this._reset()
  }

  /**
   * Resets the record
   */
  _reset () {
    // Nested transaction depth
    this._nested = 0

    // Top-level actions
    this._actions = []

    // [Action]
    this._stack = []

    // CRUDA ordered sets. Jigs may belong to multiple.
    this._creates = []
    this._reads = []
    this._updates = []
    this._deletes = []
    this._auths = []

    // Snapshots
    this._snapshots = new Map()
  }

  /**
   * Begins a new group of actions
   */
  _begin () {
    Log._debug(TAG, 'Begin')
    this._nested++
  }

  /**
   * Ends a previous group of actions
   */
  _end () {
    _assert(this._nested)
    Log._debug(TAG, 'End')
    this._nested--
  }

  /**
   * Pushes an action onto the stack
   */
  _push (action) {
    Log._debug(TAG, 'Push', action)
    this._stack.push(action)
  }

  /**
   * Pops an action from the stack
   */
  _pop () {
    _assert(this._stack.length)
    const action = this._stack.pop()
    this._actions.push(action)
    Log._debug(TAG, 'Pop', action)
  }

  /**
   * Adds a jig to the CREATE set
   */
  _create (jig) {
    if (hasJig(this._creates, jig)) return
    Log._debug(TAG, 'Create', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    const native = Membrane._sudo(() => _location(jig.origin).native)
    _assert(!native)
    _assert(!hasJig(this._auths, jig))
    _assert(!hasJig(this._deletes, jig))
    _assert(!hasJig(this._reads, jig))
    _assert(!hasJig(this._updates, jig))

    this._creates.push(jig)
    this._snapshot(jig)
    this._authCallers()
  }

  /**
   * Adds a jig to the READ set
   */
  _read (jig) {
    if (hasJig(this._reads, jig)) return
    Log._debug(TAG, 'Read', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    const Berry = require('./berry')
    _assert(jig instanceof Code || jig instanceof Jig || jig instanceof Berry)

    this._reads.push(jig)
    this._snapshot(jig)
  }

  /**
   * Adds a jig to the UPDATE set
   */
  _update (jig) {
    if (hasJig(this._updates, jig)) return
    Log._debug(TAG, 'Update', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    const undeployed = Membrane._sudo(() => jig.origin === _UNDEPLOYED)
    _assert(!undeployed)
    const native = Membrane._sudo(() => _location(jig.origin).native)
    _assert(!native)

    this._updates.push(jig)
    this._snapshot(jig)
    this._authCallers()
  }

  /**
   * Adds a jig to the DELETE set
   */
  _delete (jig) {
    if (hasJig(this._deletes, jig)) return
    Log._debug(TAG, 'Delete', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    const native = Membrane._sudo(() => _location(jig.origin).native)
    _assert(!native)

    this._deletes.push(jig)
    this._snapshot(jig)
    this._authCallers()
  }

  /**
   * Adds a jig to the AUTH set
   */
  _auth (jig) {
    if (hasJig(this._auths, jig)) return
    Log._debug(TAG, 'Auth', _text(jig))

    const Code = require('./code')
    const Jig = require('./jig')
    _assert(jig instanceof Code || jig instanceof Jig)
    _assert(!hasJig(this._creates, jig))

    this._auths.push(jig)
    this._snapshot(jig)
    this._authCallers()
  }

  /**
   * Auths all jigs used to produce some action
   */
  _authCallers () {
    this._stack
      .map(action => action._jig)
      .filter(jig => !!jig)
      .forEach(jig => this._auth(jig))
  }

  /**
   * Takes a snapshot of a jig if it has not already been captured
   */
  _snapshot (jig) {
    if (this._snapshots.has(jig)) return
    const snapshot = new Snapshot(jig)
    this._snapshots.set(jig, snapshot)
  }

  /**
   * Rolls back changes to the record
   */
  _rollback (e) {
    Log._debug(TAG, 'Rollback')
    this._snapshots.forEach(snapshot => snapshot._rollback())
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function sameJig (a, b) {
  return Membrane._sudo(() => {
    if (a === b) return true
    if (_location(a.origin).error) return false
    if (_location(b.origin).error) return false
    if (a.origin !== b.origin) return false
    if (a.location !== b.location) throw new Error('Inconsistent worldview')
    return true
  })
}

// ------------------------------------------------------------------------------------------------

const hasJig = (arr, jig) => arr.some(x => sameJig(x, jig))

// ------------------------------------------------------------------------------------------------

// The one and only record
const CURRENT_RECORD = new Record()

module.exports = CURRENT_RECORD
