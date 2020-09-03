/**
 * instruction.js
 *
 * Generates an instrution in the program from an action
 */

const { _assert } = require('../util/misc')
const { _DeployAction, _UpgradeAction, _DestroyAction, _AuthAction, _CallAction, _NewAction } = require('./action')
const { StateError } = require('../util/errors')

// ------------------------------------------------------------------------------------------------
// instruction
// ------------------------------------------------------------------------------------------------

function instruction (action, codec) {
  // --------------------------------------------------------------------------
  // Deploy
  // --------------------------------------------------------------------------

  if (action instanceof _DeployAction) {
    _assert(action._srcList.length === action._propsList.length)

    const data = []

    for (let i = 0; i < action._srcList.length; i++) {
      const src = action._srcList[i]
      const props = action._propsList[i]

      data.push(src)
      data.push(codec._encode(props))
    }

    return { op: 'DEPLOY', data }
  }

  // --------------------------------------------------------------------------
  // Upgrade
  // --------------------------------------------------------------------------

  if (action instanceof _UpgradeAction) {
    const data = []

    data.push(codec._encode(action._jig))
    data.push(action._src)
    data.push(codec._encode(action._props))

    return { op: 'UPGRADE', data }
  }

  // --------------------------------------------------------------------------
  // Destroy
  // --------------------------------------------------------------------------

  if (action instanceof _DestroyAction) {
    const data = codec._encode(action._jig)

    return { op: 'DESTROY', data }
  }

  // --------------------------------------------------------------------------
  // Auth
  // --------------------------------------------------------------------------

  if (action instanceof _AuthAction) {
    const data = codec._encode(action._jig)

    return { op: 'AUTH', data }
  }

  // --------------------------------------------------------------------------
  // Call
  // --------------------------------------------------------------------------

  if (action instanceof _CallAction) {
    const data = []

    data.push(codec._encode(action._jig))
    data.push(action._method)
    data.push(codec._encode(action._args))

    return { op: 'CALL', data }
  }

  // --------------------------------------------------------------------------
  // New
  // --------------------------------------------------------------------------

  if (action instanceof _NewAction) {
    const data = []

    data.push(codec._encode(action._classJig))
    data.push(codec._encode(action._args))

    return { op: 'NEW', data }
  }

  // --------------------------------------------------------------------------

  throw new StateError(`Unknown action: ${action}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = instruction
