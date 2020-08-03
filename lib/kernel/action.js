/**
 * action.js
 *
 * Defines and records actions that happened on jigs
 */

const { _BINDINGS } = require('../util/bindings')
const { _assert, _text, _parent, _hasOwnProperty } = require('../util/misc')
const { BadStateError } = require('../util/errors')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Action'

// ------------------------------------------------------------------------------------------------
// _Action
// ------------------------------------------------------------------------------------------------

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

  toString () {
    return 'Upgrade'
  }
}

// ------------------------------------------------------------------------------------------------
// _deploy
// ------------------------------------------------------------------------------------------------

function _deploy (jigs) {
  const Membrane = require('./membrane')
  const Code = require('./code')
  const CURRENT_RECORD = require('./record')

  _assert(jigs.length)
  _assert(jigs.every(C => C instanceof Code))

  Log._debug(TAG, 'Deploy', jigs.map(C => _text(C)).join(', '))

  try {
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
    }

    // Add the action as a top-level action
    CURRENT_RECORD._action(action)
  } catch (e) {
    CURRENT_RECORD._rollback()
    throw e
  }
}

// ------------------------------------------------------------------------------------------------
// _upgrade
// ------------------------------------------------------------------------------------------------

function _upgrade (jig, snapshot) {
  const Membrane = require('./membrane')
  const Code = require('./code')
  const CURRENT_RECORD = require('./record')

  _assert(jig instanceof Code)

  Log._debug(TAG, 'Upgrade', _text(jig))

  try {
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

    // Add the action as a top-level action
    CURRENT_RECORD._action(action)
  } catch (e) {
    CURRENT_RECORD._rollback()
    throw e
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function authParent (jig) {
  const File = require('./file')
  const CURRENT_RECORD = require('./record')

  const Parent = _parent(jig)
  if (!Parent) return

  const parentFile = File._find(Parent)
  if (parentFile._native) return

  const parentSealed = _hasOwnProperty(Parent, 'sealed') ? Parent.sealed : 'owner'
  switch (parentSealed) {
    case 'owner':
      if (!CURRENT_RECORD._creates.includes(Parent)) {
        CURRENT_RECORD._auth(Parent)
      }
      break
    case true:
      throw new BadStateError('Parent class sealed')
    case false:
      break
    default:
      throw new Error(`Bad sealed property: ${parentSealed}`)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _Action,
  _DeployAction,
  _UpgradeAction,
  _deploy,
  _upgrade
}
