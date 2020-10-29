/**
 * version.js
 *
 * Tests for test/util/version.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const {
  _version,
  _parsePayloadVersion,
  _parseStateVersion,
  _getPayloadVersion,
  _getStateVersion
} = unmangle(unmangle(Run)._version)

console.log(_version, _parsePayloadVersion, _parseStateVersion, _getPayloadVersion, _getStateVersion)

// ------------------------------------------------------------------------------------------------
// _version
// ------------------------------------------------------------------------------------------------

describe('_version', () => {
  it('hello', () => {
    console.log('world')
  })
})

// ------------------------------------------------------------------------------------------------
