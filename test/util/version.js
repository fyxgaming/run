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
    expect(_parseStateVersion('04')).to.equal(5)
  })

  // --------------------------------------------------------------------------

  it('throws if unsupported', () => {
    expect(() => _parseStateVersion()).to.throw('Unsupported state version: undefined')
    expect(() => _parseStateVersion(4)).to.throw('Unsupported state version: 4')
    expect(() => _parseStateVersion(5)).to.throw('Unsupported state version: 5')
    expect(() => _parseStateVersion('03')).to.throw('Unsupported state version: 03')
    expect(() => _parseStateVersion('05')).to.throw('Unsupported state version: 05')
    expect(() => _parseStateVersion('0004')).to.throw('Unsupported state version: 0004')
  })
})

// ------------------------------------------------------------------------------------------------
// _getPayloadVersion
// ------------------------------------------------------------------------------------------------

describe('_getPayloadVersion', () => {
  it('returns converted version', () => {
    expect(_getPayloadVersion(5)).to.equal('05')
  })

  // --------------------------------------------------------------------------

  it('throws if unsupported', () => {
    expect(() => _getPayloadVersion()).to.throw('Unsupported protocol version: undefined')
    expect(() => _getPayloadVersion(6)).to.throw('Unsupported protocol version: 6')
    expect(() => _getPayloadVersion(4)).to.throw('Unsupported protocol version: 4')
    expect(() => _getPayloadVersion('05')).to.throw('Unsupported protocol version: 05')
  })
})

// ------------------------------------------------------------------------------------------------
// _getStateVersion
// ------------------------------------------------------------------------------------------------

describe('_getStateVersion', () => {
  it('returns converted version', () => {
    expect(_getStateVersion(5)).to.equal('04')
  })

  // --------------------------------------------------------------------------

  it('throws if unsupported', () => {
    expect(() => _getStateVersion()).to.throw('Unsupported protocol version: undefined')
    expect(() => _getStateVersion(6)).to.throw('Unsupported protocol version: 6')
    expect(() => _getStateVersion(4)).to.throw('Unsupported protocol version: 4')
    expect(() => _getStateVersion('05')).to.throw('Unsupported protocol version: 05')
  })
})

// ------------------------------------------------------------------------------------------------
