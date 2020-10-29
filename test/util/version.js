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
// _parsePayloadVersion
// ------------------------------------------------------------------------------------------------

describe('_parsePayloadVersion', () => {
  it('returns parsed version', () => {
    expect(_parsePayloadVersion('05')).to.equal(5)
  })

  // --------------------------------------------------------------------------

  it('throws if unsupported', () => {
    expect(() => _parsePayloadVersion()).to.throw('Unsupported payload version: undefined')
    expect(() => _parsePayloadVersion(5)).to.throw('Unsupported payload version: 5')
    expect(() => _parsePayloadVersion('04')).to.throw('Unsupported payload version: 04')
    expect(() => _parsePayloadVersion('06')).to.throw('Unsupported payload version: 06')
    expect(() => _parsePayloadVersion('0005')).to.throw('Unsupported payload version: 0005')
  })
})

// ------------------------------------------------------------------------------------------------
// _parseStateVersion
// ------------------------------------------------------------------------------------------------

describe('_parseStateVersion', () => {
  it('returns parsed version', () => {
    console.log(_parseStateVersion)
  })

  // --------------------------------------------------------------------------

  it('throws if unsupported', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
// _getPayloadVersion
// ------------------------------------------------------------------------------------------------

describe('_getPayloadVersion', () => {
  it('returns converted version', () => {
    console.log(_getPayloadVersion)
  })

  // --------------------------------------------------------------------------

  it('throws if unsupported', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
// _getStateVersion
// ------------------------------------------------------------------------------------------------

describe('_getStateVersion', () => {
  it('returns converted version', () => {
    console.log(_getStateVersion)
  })

  // --------------------------------------------------------------------------

  it('throws if unsupported', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
