const createJigShell = require('./create-jig-shell')
const hydrateJigShell = require('./hydrate-jig-shell')
const validateState = require('./validate-state')
const { _location } = require('../bindings')

function recreateJigsFromStates (states) {
  Object.keys(states).forEach(location => _location(location))
  Object.values(states).forEach(state => validateState(state))

  const shells = {}
  for (const [location, state] of Object.entries(states)) {
    shells[location] = createJigShell(state)
  }

  for (const [location, shell] of Object.entries(shells)) {
    hydrateJigShell(shell, location, states[location], shells)
  }

  return shells
}

module.exports = recreateJigsFromStates
