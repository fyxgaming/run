/**
 * log.js
 *
 * The logger used throughout RUN
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
const keys = { _infoOn: 1, _warnOn: 2, _errorOn: 3, _debugOn: 4 }
const [infoOn, warnOn, errorOn, debugOn] = Object.keys(keys)
_defineGetter(Log, infoOn, () => Log._logger && Log._logger.info && typeof Log._logger.info === 'function')
_defineGetter(Log, warnOn, () => Log._logger && Log._logger.warn && typeof Log._logger.warn === 'function')
_defineGetter(Log, errorOn, () => Log._logger && Log._logger.error && typeof Log._logger.error === 'function')
_defineGetter(Log, debugOn, () => Log._logger && Log._logger.debug && typeof Log._logger.debug === 'function')

// ------------------------------------------------------------------------------------------------

module.exports = Log
