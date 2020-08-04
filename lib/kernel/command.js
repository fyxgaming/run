/**
 * command.js
 *
 * Generates a command in the json program from an action
 */

const { _assert } = require('../util/misc')
const { _DeployAction, _UpgradeAction, _DestroyAction, _AuthAction, _CallAction } = require('./action')

// ------------------------------------------------------------------------------------------------
// command
// ------------------------------------------------------------------------------------------------

function command (action, codec) {
  // --------------------------------------------------------------------------
  // Deploy
  // --------------------------------------------------------------------------

  if (action instanceof _DeployAction) {
    _assert(action._srcList.length === action._propsList.length)

    const arr = []
    for (let i = 0; i < action._srcList.length; i++) {
      arr.push(action._srcList[i])
      arr.push(action._propsList[i])
    }

    const data = codec._encode(arr)

    return { cmd: 'deploy', data }
  }

  // --------------------------------------------------------------------------
  // Upgrade
  // --------------------------------------------------------------------------

  if (action instanceof _UpgradeAction) {
    const arr = []
    arr.push(action._jig)
    arr.push(action._src)
    arr.push(action._props)

    const data = codec._encode(arr)

    return { cmd: 'upgrade', data }
  }

  // --------------------------------------------------------------------------
  // Destroy
  // --------------------------------------------------------------------------

  if (action instanceof _DestroyAction) {
    const arr = [action._jig]
    arr.push(action._jig)

    const data = codec._encode(arr)

    return { cmd: 'destroy', data }
  }

  // --------------------------------------------------------------------------
  // Auth
  // --------------------------------------------------------------------------

  if (action instanceof _AuthAction) {
    const arr = []
    arr.push(action._jig)

    const data = codec._encode(arr)

    return { cmd: 'auth', data }
  }

  // --------------------------------------------------------------------------
  // Call
  // --------------------------------------------------------------------------

  if (action instanceof _CallAction) {
    const arr = []
    arr.push(action._jig)
    arr.push(action._method)
    arr.push(action._args)

    const data = codec._encode(arr)

    return { cmd: 'call', data }
  }

  // --------------------------------------------------------------------------

  throw new Error(`Unknown action: ${action}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = command
