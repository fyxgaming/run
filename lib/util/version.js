
/**
 * version.js
 *
 * Describes the version changes that have occurred to the protocol.
 *
 * Summary
 *
 *      Name            Protocol        Changes
 *      ----------      ----------      ----------
 *      0.6             5               Initial launch
 *
 * Notes
 *
 *      - The Run protocol is designed to evolve
 *      - Jigs created with previous Run versions will continue to be supported
 *      - Jigs cannot be used in a tx with an earlier protocol version than themselves had
 */

const { StateError } = require('./errors')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const PROTOCOL_VERSION = 5

// ------------------------------------------------------------------------------------------------
// Functions
// ------------------------------------------------------------------------------------------------

function version (ver) {
  if (ver !== PROTOCOL_VERSION) throw new StateError(`Unsupported version: ${ver}`)
  return ver
}

// ------------------------------------------------------------------------------------------------

function parsePayloadVersion (payloadVersion) {
  if (payloadVersion === '05') return PROTOCOL_VERSION
  throw new StateError(`Unsupported payload version: ${payloadVersion}`)
}

// ------------------------------------------------------------------------------------------------

function parseStateVersion (stateVersion) {
  if (stateVersion === '04') return PROTOCOL_VERSION
  throw new StateError(`Unsupported state version: ${stateVersion}`)
}

// ------------------------------------------------------------------------------------------------

function getPayloadVersion (protocolVersion) {
  if (protocolVersion === 5) return '05'
  throw new StateError(`Unsupported protocol version: ${protocolVersion}`)
}

// ------------------------------------------------------------------------------------------------

function getStateVersion (protocolVersion) {
  if (protocolVersion === 5) return '04'
  throw new StateError(`Unsupported protocol version: ${protocolVersion}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _PROTOCOL_VERSION: PROTOCOL_VERSION,
  _version: version,
  _parsePayloadVersion: parsePayloadVersion,
  _parseStateVersion: parseStateVersion,
  _getPayloadVersion: getPayloadVersion,
  _getStateVersion: getStateVersion
}
