/**
 * action.js
 *
 * Defines and records actions that happened on jigs
 */

const { _BINDINGS, _location } = require('../util/bindings')
const { _assert, _text, _parent, _hasOwnProperty, _checkState } = require('../util/misc')
const { _deepVisit } = require('../util/deep')
const { StateError } = require('../util/errors')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Action'

// ------------------------------------------------------------------------------------------------
// _Action
// ------------------------------------------------------------------------------------------------

/**
 * Base class for all actions stored in the record
 *
 * If an action has a jig, then it will be spent when callers are authorized.
 */
class _Action {
  constructor (jig) {
    this._jig = jig
  }

  toString () { return `${this.constructor.name}` }
}

// ------------------------------------------------------------------------------------------------
// _DeployAction
// ------------------------------------------------------------------------------------------------

class _DeployAction extends _Action {
  constructor () {
    super(null)
    this._srcList = []
    this._propsList = []
  }

  toString () {
    const count = this._srcList.length
    return `Deploy (count: ${count})`
  }
}

// ------------------------------------------------------------------------------------------------
// _UpgradeAction
// ------------------------------------------------------------------------------------------------

class _UpgradeAction extends _Action {
  constructor (jig, src, props) {
    super(jig)
    this._src = src
    this._props = props
  }

  toString () { return `Upgrade ${_text(this._jig)}` }
}

// ------------------------------------------------------------------------------------------------
// _DestroyAction
// ------------------------------------------------------------------------------------------------

class _DestroyAction extends _Action {
  toString () { return `Destroy ${_text(this._jig)}` }
}

// ------------------------------------------------------------------------------------------------
// _AuthAction
// ------------------------------------------------------------------------------------------------

class _AuthAction extends _Action {
  toString () { return `Auth ${_text(this._jig)}` }
}

// ------------------------------------------------------------------------------------------------
// _CallAction
// ------------------------------------------------------------------------------------------------

class _CallAction extends _Action {
  constructor (jig, method, args) {
    super(jig)
    this._method = method
    this._args = args
  }

  toString () { return `Call ${_text(this._jig)} ${this._method}` }
}

// ------------------------------------------------------------------------------------------------
// _deploy
// ------------------------------------------------------------------------------------------------

function _deploy (jigs) {
  const Membrane = require('./membrane')
  const Code = require('./code')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  _assert(jigs.length)
  _assert(jigs.every(C => C instanceof Code))

  Log._debug(TAG, 'Deploy', jigs.map(C => _text(C)).join(', '))

  CURRENT_RECORD._single(() => {
    // Add deploy code to the CREATE set
    jigs.forEach(C => CURRENT_RECORD._create(C))

    // Add parent classes to the AUTH set
    jigs.forEach(jig => authParent(jig))

    // Create the deploy action
    const action = new _DeployAction()

    for (const C of jigs) {
      // Object.assign() will only copy owned class props, not parent props. This is good.
      const src = C.toString()
      const props = Membrane._sudo(() => Object.assign({}, C))

      // Remove bindings from the props because they won't be deployed
      _BINDINGS.forEach(x => delete props[x])

      // Presets should also never be present on code jigs
      _assert(!props.presets)

      action._srcList.push(src)
      action._propsList.push(props)

      // Add all jig properties as reads
      addReadRefs(props)
    }

    // Add the action as a top-level action
    CURRENT_RECORD._action(action)
  })
}

// ------------------------------------------------------------------------------------------------
// _upgrade
// ------------------------------------------------------------------------------------------------

function _upgrade (jig, snapshot) {
  const Membrane = require('./membrane')
  const Code = require('./code')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  _assert(jig instanceof Code)

  Log._debug(TAG, 'Upgrade', _text(jig))

  CURRENT_RECORD._single(() => {
    authParent(jig)

    // Create the deploy action
    const src = jig.toString()
    const props = Membrane._sudo(() => Object.assign({}, jig))

    // Remove bindings from the props because they won't be deployed
    _BINDINGS.forEach(x => delete props[x])

    // Presets should also never be present on code jigs
    _assert(!props.presets)

    const action = new _UpgradeAction(jig, src, props)

    // Spend the jig being updated
    CURRENT_RECORD._update(jig, snapshot)

    // Add all jig properties as reads
    addReadRefs(props)

    // Add the action as a top-level action
    CURRENT_RECORD._action(action)
  })
}

// ------------------------------------------------------------------------------------------------
// _destroy
// ------------------------------------------------------------------------------------------------

function _destroy (jig) {
  const Membrane = require('./membrane')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  Log._info(TAG, 'Destroy', _text(jig))

  // If already destroyed, then nothing to do
  if ('vdel' in _location(Membrane._sudo(() => jig.location))) return

  CURRENT_RECORD._single(() => {
    CURRENT_RECORD._delete(jig)

    // Only add the action if there is not already an action in progress
    if (CURRENT_RECORD._stack.length) return

    const action = new _DestroyAction(jig)
    CURRENT_RECORD._action(action)
  })
}

// ------------------------------------------------------------------------------------------------
// _auth
// ------------------------------------------------------------------------------------------------

function _auth (jig) {
  const Membrane = require('./membrane')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  Log._info(TAG, 'Auth', _text(jig))

  // If already destroyed, then we can't auth
  _checkState(!('vdel' in _location(Membrane._sudo(() => jig.location))),
    'Cannot auth destroyed jig')

  CURRENT_RECORD._single(() => {
    CURRENT_RECORD._auth(jig)

    // Only add the action if there is not already an action in progress
    if (CURRENT_RECORD._stack.length) return

    const action = new _AuthAction(jig)
    CURRENT_RECORD._action(action)
  })
}

// ------------------------------------------------------------------------------------------------
// _call
// ------------------------------------------------------------------------------------------------

function _call (jig, method, args) {
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  Log._info(TAG, 'Call', _text(jig), method)

  CURRENT_RECORD._single(() => {
    CURRENT_RECORD._update(jig)

    // Add jig args as references
    addReadRefs(args)

    const action = new _CallAction(jig, method, args)

    CURRENT_RECORD._action(action)
  })
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function authParent (jig) {
  const Code = require('./code')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  const Parent = _parent(jig)
  if (!Parent) return

  const parentCode = Code._editor(Parent)
  if (parentCode._native) return

  const parentSealed = _hasOwnProperty(Parent, 'sealed') ? Parent.sealed : 'owner'
  switch (parentSealed) {
    case 'owner':
      if (!CURRENT_RECORD._creates.includes(Parent)) {
        CURRENT_RECORD._auth(Parent)
      }
      break
    case true:
      throw new StateError('Parent class sealed')
    case false:
      break
    default:
      throw new StateError(`Bad sealed property: ${parentSealed}`)
  }
}

// ------------------------------------------------------------------------------------------------

function addReadRefs (obj) {
  const Code = require('./code')
  const Jig = require('./jig')
  const Berry = require('./berry')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  _deepVisit(obj, x => {
    if (x instanceof Code || x instanceof Jig || x instanceof Berry) {
      CURRENT_RECORD._read(x)
      return false
    }
  })
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _Action,
  _DeployAction,
  _UpgradeAction,
  _DestroyAction,
  _AuthAction,
  _CallAction,
  _deploy,
  _upgrade,
  _destroy,
  _auth,
  _call
}
