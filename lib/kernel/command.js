/**
 * command.js
 *
 * Generates a command in the program from an action
 */

const {
  _DeployAction,
  _UpgradeAction,
  _DestroyAction,
  _AuthAction,
  _CallAction
} = require('./action')

// ------------------------------------------------------------------------------------------------

function command (action, codec) {
  if (action instanceof _DeployAction) {
    return { cmd: 'deploy', data: [] }
  }

  if (action instanceof _UpgradeAction) {
    return { cmd: 'upgrade', data: [] }
  }

  if (action instanceof _DestroyAction) {
    return { cmd: 'destroy', data: [] }
  }

  if (action instanceof _AuthAction) {
    return { cmd: 'auth', data: [] }
  }

  if (action instanceof _CallAction) {
    return { cmd: 'call', data: [] }
  }

  throw new Error(`Unknown action: ${action}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = command
