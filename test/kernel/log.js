/**
 * log.js
 *
 * Tests for lib/kernel/log.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { stub } = require('sinon')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Log = unmangle(unmangle(Run)._Log)

// ------------------------------------------------------------------------------------------------
// Log
// ------------------------------------------------------------------------------------------------

describe('Log', () => {
  it('info', () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    Log._info('TAG', 'hello', 'world')
    expect(logger.info.called).to.equal(true)
    expect(logger.info.args.length).to.equal(1)
    expect(new Date(logger.info.args[0][0]).toString()).not.to.equal('Invalid Date')
    expect(logger.info.args[0][1]).to.equal('INFO')
    expect(logger.info.args[0][2]).to.equal('[TAG]')
    expect(logger.info.args[0][3]).to.equal('hello')
    expect(logger.info.args[0][4]).to.equal('world')
    Log._logger = Log._defaultLogger
  })

  // --------------------------------------------------------------------------

  it('warn', () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    Log._warn('TAG', 123, true)
    expect(logger.warn.called).to.equal(true)
    expect(logger.warn.args.length).to.equal(1)
    expect(new Date(logger.warn.args[0][0]).toString()).not.to.equal('Invalid Date')
    expect(logger.warn.args[0][1]).to.equal('WARN')
    expect(logger.warn.args[0][2]).to.equal('[TAG]')
    expect(logger.warn.args[0][3]).to.equal(123)
    expect(logger.warn.args[0][4]).to.equal(true)
    Log._logger = Log._defaultLogger
  })

  // --------------------------------------------------------------------------

  it('error', () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    const e = new Error()
    Log._error('TAG', e)
    expect(logger.error.called).to.equal(true)
    expect(logger.error.args.length).to.equal(1)
    expect(new Date(logger.error.args[0][0]).toString()).not.to.equal('Invalid Date')
    expect(logger.error.args[0][1]).to.equal('ERROR')
    expect(logger.error.args[0][2]).to.equal('[TAG]')
    expect(logger.error.args[0][3]).to.equal(e)
    Log._logger = Log._defaultLogger
  })

  // --------------------------------------------------------------------------

  it('debug', () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    const o = { a: [], n: 2 }
    Log._debug('TAG', o)
    expect(logger.debug.called).to.equal(true)
    expect(logger.debug.args.length).to.equal(1)
    expect(new Date(logger.debug.args[0][0]).toString()).not.to.equal('Invalid Date')
    expect(logger.debug.args[0][1]).to.equal('DEBUG')
    expect(logger.debug.args[0][2]).to.equal('[TAG]')
    expect(logger.debug.args[0][3]).to.equal(o)
    Log._logger = Log._defaultLogger
  })

  // --------------------------------------------------------------------------

  it('partially defined logger', () => {
    const logger = stub({ info: x => x })
    Log._logger = logger
    Log._info('A', 1)
    Log._warn('B', 2)
    Log._error('C', 3)
    Log._debug('D', 4)
    expect(logger.info.called).to.equal(true)
    Log._logger = Log._defaultLogger
  })

  // --------------------------------------------------------------------------

  it('undefined logger', () => {
    Log._logger = null
    Log._info('A', 1)
    Log._warn('B', 2)
    Log._error('C', 3)
    Log._debug('D', 4)
    Log._logger = Log._defaultLogger
  })

  // --------------------------------------------------------------------------

  it('invalid logger', () => {
    Log._logger = { info: 1, warn: null, error: {}, debug: 'z' }
    Log._info('A', 1)
    Log._warn('B', 2)
    Log._error('C', 3)
    Log._debug('D', 4)
    Log._logger = Log._defaultLogger
  })

  // --------------------------------------------------------------------------

  it('logger method on', () => {
    Log._logger = console
    expect(Log._infoOn).to.equal(true)
    expect(Log._warnOn).to.equal(true)
    expect(Log._errorOn).to.equal(true)
    expect(Log._debugOn).to.equal(true)
    Log._logger = Log._defaultLogger
  })

  // --------------------------------------------------------------------------

  it('logger method off', () => {
    Log._logger = { info: 1, warn: null, error: {}, debug: 'z' }
    expect(Log._infoOn).to.equal(false)
    expect(Log._warnOn).to.equal(false)
    expect(Log._errorOn).to.equal(false)
    expect(Log._debugOn).to.equal(false)
    Log._logger = null
    expect(Log._infoOn).to.equal(false)
    expect(Log._warnOn).to.equal(false)
    expect(Log._errorOn).to.equal(false)
    expect(Log._debugOn).to.equal(false)
    Log._logger = Log._defaultLogger
  })
})

// ------------------------------------------------------------------------------------------------