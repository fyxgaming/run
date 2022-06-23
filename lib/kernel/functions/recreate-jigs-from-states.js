const createJigShell = require('./create-jig-shell')
const hydrateJigShell = require('./hydrate-jig-shell')
const validateState = require('./validate-state')
const { _location } = require('../bindings')

function recreateJigsFromStates (states) {
  const shells = {}

  const keys = {}

  for (const [key, state] of Object.entries(states)) {
    if (!key.startsWith('jig://') && !key.startsWith('berry://')) {
      continue
    }

    const location = key.split('://')[1]

    _location(location)
    validateState(state)

    keys[location] = key
    shells[location] = createJigShell(state)
  }

  for (const [location, shell] of Object.entries(shells)) {
    hydrateJigShell(shell, location, states[keys[location]], shells)
  }

  return shells
}

module.exports = recreateJigsFromStates
