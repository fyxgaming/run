/**
 * run-connect.js
 *
 * Tests for lib/plugins/run-connect.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { RunConnect2: RunConnect } = Run.plugins

// ------------------------------------------------------------------------------------------------
// RunConnect
// ------------------------------------------------------------------------------------------------

describe('RunConnect', () => {
  describe('constructor', () => {
    it('defaults to mainnet', () => {
      expect(new RunConnect().network).to.equal('main')
    })

    // --------------------------------------------------------------------------------------------

    it('create on supported network', () => {
      const mainnetRun = new RunConnect({ network: 'main' })
      expect(mainnetRun.network).to.equal('main')
      const testnetRun = new RunConnect({ network: 'test' })
      expect(testnetRun.network).to.equal('test')
    })

    // --------------------------------------------------------------------------------------------

    it('throws if create with invalid network', () => {
      expect(() => new RunConnect({ network: '' })).to.throw('Unsupported network: ')
      expect(() => new RunConnect({ network: 'stn' })).to.throw('Unsupported network: stn')
      expect(() => new RunConnect({ network: null })).to.throw('Unsupported network: null')
      expect(() => new RunConnect({ network: 0 })).to.throw('Unsupported network: 0')
    })
  })
})

// ------------------------------------------------------------------------------------------------
