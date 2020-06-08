/**
 * action.js
 *
 * A recording of jig actions which may be converted to a Bitcoin transaction
 */

const bsv = require('bsv')
const { SafeSet } = require('../../util/safe')
const { _sourceCode } = require('../../util/type')
const { _deepClone } = require('../../util/deep')
const Sandbox = require('../../util/sandbox')

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
  constructor (name) {
    this._name = name
    this._id = bsv.crypto.Random.getRandomBuffer(32).toString('hex')
    console.log('Creating', this._name, 'action:', this._id)

    this._inputs = new SafeSet()
    this._outputs = new SafeSet()
    this._refs = []

    this._axin = []
    this._axout = []
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
    console.log('Committing', this._name, 'action:', this._id)

    _Action._publish(this)
  }

  static _publish (action) {
    if (this._multi) {
      this._multi._add(action)
      return
    }

    console.log('Publishing', action._name, 'action:', action._id)
  }

  static _transaction (f) {
    const prev = this._multi
    const multi = new _MultiAction()
    this._multi = multi
    try {
      f()
      this._multi = prev
      this._publish(multi)
    } catch (e) {
      this._multi = prev
      multi._rollback()
      throw e
    }
  }
}

// ------------------------------------------------------------------------------------------------
// DeployAction
// ------------------------------------------------------------------------------------------------

class _DeployAction extends _Action {
  constructor () {
    super('DEPLOY')

    this._code = new Map()
  }

  _getActionJSON () {
    return ['DEPLOY', 'class X {}', { n: 1, owner: '...' }, 'class Y {}']
  }

  _add (T) {
    if (this._outputs.has(T)) return

    console.log('Adding', T.name)

    this._outputs.add(T)

    const Membrane = require('./membrane')

    const src = _sourceCode(T)
    const props = Membrane._sudo(() => _deepClone(Object.assign({}, T), Sandbox._hostIntrinsics))

    console.log('PROPS', props)

    this._code.set(T, { src, props })
  }
}

// ------------------------------------------------------------------------------------------------
// NewAction
// ------------------------------------------------------------------------------------------------

class _NewAction extends _Action {
  constructor () {
    super('NEW')
  }

  _getActionJSON () {
    return ['NEW', '_i0', [], '...']
  }
}

// ------------------------------------------------------------------------------------------------
// CallAction
// ------------------------------------------------------------------------------------------------

class _CallAction extends _Action {
  constructor () {
    super('CALL')

    this._changes = new _ChangeSet()
  }

  _getActionJSON () {
    return ['CALL', '_i0', 'send', []]
  }
}

// ------------------------------------------------------------------------------------------------
// MultiAction
// ------------------------------------------------------------------------------------------------

class _MultiAction extends _Action {
  constructor () {
    super('MULTI')

    this._actions = []
  }

  _add (action) {
    this._actions.push(action)
  }

  _getActionJSON () {
    return ['MULTI', [], []]
  }
}

// ------------------------------------------------------------------------------------------------

_Action._DeployAction = _DeployAction
_Action._NewAction = _NewAction
_Action._CallAction = _CallAction
_Action._MultiAction = _MultiAction

module.exports = _Action
