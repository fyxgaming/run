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
  describe('info', () => {
    it('writes log', () => {
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
    })
  })
})

// ------------------------------------------------------------------------------------------------
