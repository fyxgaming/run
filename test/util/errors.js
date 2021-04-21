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

  it('RequestError', () => {
    const error = new Run.errors.RequestError('Wifi off', 100, 'No connection', 'GET', 'http://localhost:8000/status')
    expect(error.name).to.equal('RequestError')
    expect(error.message).to.equal('100 No connection\n\nGET http://localhost:8000/status\n\nWifi off')
    expect(error.reason).to.equal('Wifi off')
    expect(error.status).to.equal(100)
    expect(error.statusText).to.equal('No connection')
    expect(error.method).to.equal('GET')
    expect(error.url).to.equal('http://localhost:8000/status')
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
