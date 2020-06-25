/**
 * actions.js
 *
 * The actions that may be stored in the record.
 */

const Membrane = require('./membrane')
const { _jigInMapKeys, _jigInArray } = require('../../util/misc2')
const { _text, _sourceCode, _parent } = require('../../util/type')
const { _BINDINGS } = require('../../util/bindings')
const { _assert } = require('../../util/misc')
const Snapshot = require('../../util/snapshot')
const Log = require('../../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Action'

// ------------------------------------------------------------------------------------------------
// Action
// ------------------------------------------------------------------------------------------------

/**
 * An action that updates jigs in a record
 *
 * An action exists at a higher level than the record. It describes what happens to jigs, not
 * necessarily the inputs and outputs. The record translates the action into inputs and outputs.
 *
 * All changes to action that happen during the action are locked in when the action is complete.
 * Until then, nothing is final. For example, a deleted jig may still be used in an action.
 */
class Action {
  constructor () {
    this._name = null
    this._args = []
    this._snapshots = new Map() // Jig -> Snapshot
    this._spends = []
    this._deletes = []
    this._creates = []
    this._reads = []
  }

  /**
   * Names the action. This is required.
   */
  _init (name) {
    this._name = name
  }

  /**
   * Adds a value to the action's args
   */
  _arg (arg) {
    this._args.push(arg)
  }

  /**
   * Snapshots a jig before any changes. If the jig is changed, it will be spent.
   */
  _snapshot (jig) {
    if (_jigInMapKeys(this._snapshots, jig)) return

    this._snapshots.set(jig, new Snapshot(jig))
  }

  /**
   * Forces an existing jig to be spent. The jig will get an output if not deleted.
   */
  _spend (jig) {
    if (_jigInArray(this._spends, jig)) return

    this._spends.push(jig)
  }

  /**
   * Deletes a jig after this action. The jig will not get an output.
   */
  _delete (jig) {
    if (_jigInArray(this._deletes, jig)) return

    this._deletes.push(jig)
  }

  /**
   * Creates a new jig output. The jig must not be deployed.
   */
  _create (jig) {
    if (_jigInArray(this._creates, jig)) return

    this._creates.push(jig)
  }

  /**
   * References a jig. This will not change the outputs
   */
  _read (jig) {
    if (_jigInArray(this._reads, jig)) return

    this._reads.push(jig)
  }

  /**
   * Rolls back to all snapshots in the action and resets the action
   */
  _rollback () {
    for (const [, snapshot] of this._snapshots) {
      snapshot._rollback()
    }
  }
}

// ------------------------------------------------------------------------------------------------
// _deploy
// ------------------------------------------------------------------------------------------------

Action._deploy = function (record, Cs) {
  Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

  record._action(action => {
    action._init('deploy')

    // Spend parent inputs
    Cs.forEach(C => {
    // Utility classes don't need to be spent
      if (C.options && C.options.utility) return

      // No parent, no spend
      const Parent = _parent(C)
      if (!Parent) return

      action._spend(Parent)
    })

    // Create the arguments for the deploy action
    Cs.forEach(C => {
      const src = _sourceCode(C)
      const props = Membrane._sudo(() => Object.assign({}, C))

      // Remove bindings from the props because they won't be deployed
      _BINDINGS.forEach(x => delete props[x])

      // Make sure there are no presets
      _assert(!props.presets)

      action._arg(src)
      action._arg(props)

      action._create(C)
    })
  })
}

// ------------------------------------------------------------------------------------------------

module.exports = Action
