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

const _COMMANDS = ['destroy', 'auth', 'call']

// ------------------------------------------------------------------------------------------------
// _destroy
// ------------------------------------------------------------------------------------------------

function _destroy (record, jig) {
  Log._info(TAG, 'Destroy', _text(jig))

  record._spend(jig)
  record._delete(jig)

  const data = [jig]
  record._cmd('destroy', data)
}

// ------------------------------------------------------------------------------------------------
// _destroy
// ------------------------------------------------------------------------------------------------

function _auth (record, jig) {
  Log._info(TAG, 'Auth', _text(jig))

  record._nocreate(jig)
  record._spend(jig)

  const data = [jig]
  record._cmd('auth', data)
}

// ------------------------------------------------------------------------------------------------
// _call
// ------------------------------------------------------------------------------------------------

function _call (record, jig, method, args) {
  Log._info(TAG, 'Call', _text(jig), method)

  const data = [jig, method, args]

  record._cmd('call', data)
}

// ------------------------------------------------------------------------------------------------

module.exports = { _COMMANDS, _destroy, _auth, _call }
