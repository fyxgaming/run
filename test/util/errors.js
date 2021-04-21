/**
 * errors.js
 *
 * Tests for lib/util/errors.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// Errors
// ------------------------------------------------------------------------------------------------

describe('Errors', () => {
  it('ArgumentError', () => {
    const error = new Run.errors.ArgumentError('hello')
    expect(error.name).to.equal('ArgumentError')
    expect(error.message).to.equal('hello')
  })

  // --------------------------------------------------------------------------

  it('ClientModeError', () => {
    const error = new Run.errors.ClientModeError('abc', 'jig')
    expect(error.name).to.equal('ClientModeError')
    expect(error.message).to.equal('Cannot load abc\n\nOnly cached jigs may be loaded in client mode')
    expect(error.data).to.equal('abc')
    expect(error.type).to.equal('jig')
  })

  // --------------------------------------------------------------------------

  it('InternalError', () => {
    const error = new Run.errors.InternalError('hello')
    expect(error.name).to.equal('InternalError')
    expect(error.message).to.equal('hello')
  })

  // --------------------------------------------------------------------------

  it('NotImplementedError', () => {
    const error = new Run.errors.NotImplementedError('hello')
    expect(error.name).to.equal('NotImplementedError')
    expect(error.message).to.equal('hello')
  })

  // --------------------------------------------------------------------------

  it.skip('RequestError', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it.skip('TimeoutError', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it.skip('TrustError', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
