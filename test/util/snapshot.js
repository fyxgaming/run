/**
 * snapshot.js
 *
 * Tests for lib/util/snapshot.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { Jig, Berry } = Run
const { unmangle } = require('../env/unmangle')
const Code = unmangle(Run)._Code
const Snapshot = unmangle(unmangle(Run)._util)._Snapshot

// ------------------------------------------------------------------------------------------------
// Snapshot
// ------------------------------------------------------------------------------------------------

describe('Snapshot', () => {
  describe('constructor', () => {
    it('should snapshot jigs', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      class B extends Jig { init (a) { this.a = a; this.arr = [1, 2, {}] } }
      const a = new A()
      const b = new B(a)
      const snapshot = new Snapshot(b)
      expect(unmangle(snapshot)._type).to.equal('jig')
      expect(unmangle(snapshot)._props.a).to.equal(a)
      expect(unmangle(snapshot)._props.arr).to.deep.equal(b.arr)
      expect(unmangle(snapshot)._props.arr).not.to.equal(b.arr)
    })

    it('should snapshot code', () => {
      new Run() // eslint-disable-line
      class A { }
      A.n = null
      A.m = undefined
      const CA = new Code(A)
      const snapshot = new Snapshot(CA)
      expect(unmangle(snapshot)._type).to.equal('code')
      expect(unmangle(snapshot)._props.n).to.equal(null)
      expect(unmangle(snapshot)._props.m).to.equal(undefined)
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
      new Run() // eslint-disable-line
      expect(() => new Snapshot()).to.throw()
      expect(() => new Snapshot(null)).to.throw()
      expect(() => new Snapshot({})).to.throw()
      expect(() => new Snapshot(class A { })).to.throw()
    })
  })
})

// ------------------------------------------------------------------------------------------------
