/**
 * log.js
 *
 * The logger used throughout Run
 */

// ------------------------------------------------------------------------------------------------
// Log
// ------------------------------------------------------------------------------------------------

const Log = { }

Log._defaultLogger = { warn: console.warn, error: console.error }

Log._logger = Log._defaultLogger

function _log (method, tag, ...args) {
  if (!Log._logger || !Log._logger[method]) return
  Log._logger[method](new Date().toISOString(), `[${tag}]`, ...args)
}

Log._info = (...args) => _log('info', ...args)
Log._warn = (...args) => _log('warn', ...args)
Log._error = (...args) => _log('error', ...args)
Log._debug = (...args) => _log('debug', ...args)

// ------------------------------------------------------------------------------------------------

module.exports = Log
