/**
 * command.js
 *
 * Stores actions as commands in records
 */

const Log = require('../util/log')
const { _text } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Command'

const _COMMANDS = ['call']

// ------------------------------------------------------------------------------------------------
// _call
// ------------------------------------------------------------------------------------------------

function _call (record, jig, method, args) {
  Log._info(TAG, 'Call', _text(jig), method)

  const data = [jig, method, args]

  record._cmd('call', data)
}

// ------------------------------------------------------------------------------------------------

module.exports = { _COMMANDS, _call }
