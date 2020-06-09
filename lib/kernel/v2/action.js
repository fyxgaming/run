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
const Log = require('../../util/log')

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
  static get _TAG () { return 'Action' }

  constructor () {
    this._id = bsv.crypto.Random.getRandomBuffer(32).toString('hex')

    Log._info(this.constructor._TAG, 'Creating', this._id)

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
     * (If they are on the right network)
     *
     * Locations are not set until publish, because until then they are works in progress
     */
  _commit () {
    Log._info(this.constructor._TAG, 'Committing', this._id)

    _Action._publish(this)

    // Calls _bind on jigs
    // Membrane._special(() => x.bind('location', location, network))

    // Membrane._sudo(() => {
    // x.location = [...]
    // })

    // _bind(T)
  }

  static _publish (action) {
    if (this._multi) {
      this._multi._add(action)
      return
    }

    Log._info(this.constructor._TAG, 'Publishing', this._id)
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
  static get _TAG () { return 'DeployAction' }

  constructor () {
    super('DEPLOY')

    this._code = new Map()
  }

  _getActionJSON () {
    return ['DEPLOY', 'class X {}', { n: 1, owner: '...' }, 'class Y {}']
  }

  _add (T) {
    // Have we already added this type?
    if (this._outputs.has(T)) return

    Log._info(_DeployAction._TAG, 'Adding', T.name)

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
  static get _TAG () { return 'NewAction' }

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
  static get _TAG () { return 'CallAction' }

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
  static get _TAG () { return 'MultiAction' }

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
