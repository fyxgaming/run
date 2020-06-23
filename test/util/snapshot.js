/**
 * snapshot.js
 *
 * Tests for lib/util/snapshot.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { Berry } = Run
const { unmangle } = require('../env/unmangle')
const Snapshot = unmangle(unmangle(Run)._util)._Snapshot

// ------------------------------------------------------------------------------------------------
// Snapshot
// ------------------------------------------------------------------------------------------------

describe('Snapshot', () => {
  describe('constructor', () => {
    it('should snapshot jigs', () => {

    })

    it('should snapshot code', () => {

    })

    it('should snapshot berries', async () => {
      const run = new Run()
      class A extends Berry {
        init () { this.n = 1 }
        static pluck () { return new A() }
      }
      const berry = await run.load('123', A)
      const snapshot = new Snapshot(berry)
      expect(unmangle(snapshot)._type).to.equal('berry')
      expect(unmangle(snapshot)._props.n).to.equal(1)
      expect(unmangle(snapshot)._props.location).to.equal('!A not deployed')
    })

    it('should throw if not a jig', () => {
      expect(() => new Snapshot()).to.throw()
      expect(() => new Snapshot(null)).to.throw()
      expect(() => new Snapshot({})).to.throw()
      expect(() => new Snapshot(class A { })).to.throw()
    })
  })
})

// ------------------------------------------------------------------------------------------------
