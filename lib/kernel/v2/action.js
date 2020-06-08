/**
 * action.js
 *
 * A recording of jig actions which may be converted to a Bitcoin transaction
 */

const bsv = require('bsv')

// ------------------------------------------------------------------------------------------------
// ChangeSet
// ------------------------------------------------------------------------------------------------

class _ChangeSet {
  _set (jig, target, prop, value) {
    // TODO
  }

  _rollback () {

  }
}

// ------------------------------------------------------------------------------------------------
// Action
// ------------------------------------------------------------------------------------------------

class _Action {
  constructor () {
    this._id = bsv.crypto.Random.getRandomBuffer(32).toString('hex')
    this._jigin = []
    this._jigout = []
    this._axin = []
    this._axout = []
    this._refs = []
  }

  _getRunJSON () {
    return {
      exec: this.getActionJSON(),
      refs: [],
      jout: 0
    }
  }

  _getActionJSON () {
    return []
  }

  _rollback () {

  }

  /**
     * Called when a jig input is bound to a transaction
     */
  _bind (jig, prop, value) {
    // Bindings go into a change set when location is applied
  }

  /**
     * Commit should set locations for jigs
     *
     * Locations are not set until publish, because until then they are works in progress
     */
  _commit () {
    console.log('Committing', this.id)
    _Action._publish(this)
  }

  static _publish (action) {
    if (this._multi) {
      this._multi._add(action)
      return
    }

    console.log('Publishing', action.id)
  }

  static _transaction (f) {
    const prev = this._multi
    const multi = new _MultiAction()
    this._multi = multi
    try {
      f()
      this._multi = prev
      this._publish(multi)
    } catch {
      this._multi = prev
      multi._rollback()
    }
  }
}

// ------------------------------------------------------------------------------------------------
// DeployAction
// ------------------------------------------------------------------------------------------------

class _DeployAction extends _Action {
  _getActionJSON () {
    return ['deploy', 'class X {}', { n: 1, owner: '...' }, 'class Y {}']
  }

  _add (T) {
    // TODO
  }
}

// ------------------------------------------------------------------------------------------------
// NewAction
// ------------------------------------------------------------------------------------------------

class _NewAction extends _Action {
  _getActionJSON () {
    return ['new', '_i0', [], '...']
  }
}

// ------------------------------------------------------------------------------------------------
// CallAction
// ------------------------------------------------------------------------------------------------

class _CallAction extends _Action {
  constructor () {
    super()
    this._changes = new _ChangeSet()
  }

  _getActionJSON () {
    return ['call', '_i0', 'send', []]
  }
}

// ------------------------------------------------------------------------------------------------
// MultiAction
// ------------------------------------------------------------------------------------------------

class _MultiAction extends _Action {
  _getActionJSON () {
    return ['multi', [], []]
  }
}

// ------------------------------------------------------------------------------------------------

_Action._DeployAction = _DeployAction
_Action._NewAction = _NewAction
_Action._CallAction = _CallAction
_Action._MultiAction = _MultiAction

module.exports = _Action
