/**
 * version.js
 *
 * Tests for test/util/version.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const {
  _version,
  _parsePayloadVersion,
  _parseStateVersion,
  _getPayloadVersion,
  _getStateVersion
} = unmangle(unmangle(Run)._version)

console.log(_parsePayloadVersion, _parseStateVersion, _getPayloadVersion, _getStateVersion)

// ------------------------------------------------------------------------------------------------
// _version
// ------------------------------------------------------------------------------------------------

describe('_version', () => {
  it('returns version if supported', () => {
    expect(_version(5)).to.equal(5)
    expect(_version(Run.protocol)).to.equal(5)
  })

  // --------------------------------------------------------------------------

  it('throws if unsupported', () => {
    expect(() => _version(4)).to.throw('Unsupported version: 4')
    expect(() => _version(6)).to.throw('Unsupported version: 6')
    expect(() => _version(null)).to.throw('Unsupported version: null')
    expect(() => _version()).to.throw('Unsupported version: undefined')
    expect(() => _version('5')).to.throw('Unsupported version: 5')
  })
})

// ------------------------------------------------------------------------------------------------
