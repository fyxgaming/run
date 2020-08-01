/**
 * action.js
 *
 * Actions stored in the record and commits
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
  constructor (target) {
    this._target = target
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
// _recordDeploy
// ------------------------------------------------------------------------------------------------

function _recordDeploy (CodeJigs) {
  const Membrane = require('./membrane')
  const File = require('./file')
  const Code = require('./code')
  const CURRENT_RECORD = require('./record')

  _assert(CodeJigs.length)
  _assert(CodeJigs.every(C => C instanceof Code))

  Log._debug(TAG, 'Deploy', CodeJigs.map(C => _text(C)).join(', '))

  try {
    // Add deploy code to the CREATE set
    CodeJigs.forEach(C => CURRENT_RECORD._create(C))

    // Add parent classes to the AUTH set
    for (const C of CodeJigs) {
      const Parent = _parent(C)
      if (!Parent) continue

      const parentFile = File._find(Parent)
      if (parentFile._native) continue

      const parentSealed = _hasOwnProperty(Parent, 'sealed') ? Parent.sealed : 'owner'
      switch (parentSealed) {
        case 'owner':
          if (!CodeJigs.includes(Parent)) {
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

    // Create the deploy action
    const action = new _DeployAction()

    for (const C of CodeJigs) {
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
  } finally {
    CURRENT_RECORD._rollback()
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _Action,
  _DeployAction,
  _recordDeploy
}
