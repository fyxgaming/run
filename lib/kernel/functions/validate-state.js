const { _parseStateVersion } = require('../version')

function validateState (state) {
  _parseStateVersion(state.version)

  // TODO
}

module.exports = validateState
