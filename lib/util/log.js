/**
 * log.js
 *
 * The logger used throughout Run
 */

const { _defineGetter } = require('./misc')

// ------------------------------------------------------------------------------------------------
// Log
// ------------------------------------------------------------------------------------------------

const Log = { }

Log._defaultLogger = { warn: console.warn, error: console.error }

Log._logger = Log._defaultLogger

function _log (method, tag, ...args) {
  if (!Log._logger || !Log._logger[method] || typeof Log._logger[method] !== 'function') return
  Log._logger[method](new Date().toISOString(), method.toUpperCase(), `[${tag}]`, ...args)
}

Log._info = (...args) => _log('info', ...args)
Log._warn = (...args) => _log('warn', ...args)
Log._error = (...args) => _log('error', ...args)
Log._debug = (...args) => _log('debug', ...args)

// These should be checked before logging because arguments otherwise might get stringified for no reason
_defineGetter(Log, '_infoOn', () => Log._logger && Log._logger._info && typeof Log._logger._info === 'function')
_defineGetter(Log, '_warnOn', () => Log._logger && Log._logger._warn && typeof Log._logger._warn === 'function')
_defineGetter(Log, '_errorOn', () => Log._logger && Log._logger._error && typeof Log._logger._error === 'function')
_defineGetter(Log, '_debugOn', () => Log._logger && Log._logger._debug && typeof Log._logger._debug === 'function')

// ------------------------------------------------------------------------------------------------

module.exports = Log
