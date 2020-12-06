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
      expect(unmangle(snapshot)._kind).to.equal('jig')
      expect(unmangle(snapshot)._props.a).to.equal(a)
      expect(unmangle(snapshot)._props.arr).to.deep.equal(b.arr)
      expect(unmangle(snapshot)._props.arr).not.to.equal(b.arr)
      expect(unmangle(snapshot)._cls).to.equal(b.constructor)
    })

    it('should snapshot code', () => {
      class A { }
      A.n = null
      A.m = undefined
      const CA = Run.util.install(A)
      const snapshot = new Snapshot(CA)
      expect(unmangle(snapshot)._kind).to.equal('code')
      expect(unmangle(snapshot)._props.n).to.equal(null)
      expect(unmangle(snapshot)._props.m).to.equal(undefined)
      expect(unmangle(snapshot)._src).to.equal(A.toString())
    })

    it('should snapshot berries', async () => {
      const run = new Run()
      class A extends Berry {
        init () { this.n = 1 }
        static pluck () { return new A() }
      }
      const berry = await run.load('123', A)
      const snapshot = new Snapshot(berry)
      expect(unmangle(snapshot)._kind).to.equal('berry')
      expect(unmangle(snapshot)._props.n).to.equal(1)
      expect(unmangle(snapshot)._props.location).to.equal('!A not deployed')
      expect(unmangle(snapshot)._cls).to.equal(berry.constructor)
    })

    it('should throw if not a jig', () => {
      new Run() // eslint-disable-line
      expect(() => new Snapshot()).to.throw()
      expect(() => new Snapshot(null)).to.throw()
      expect(() => new Snapshot({})).to.throw()
      expect(() => new Snapshot(class A { })).to.throw()
    })
  })

  describe('rollback', () => {
    it('should rollback instance jigs', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      const snapshot = new Snapshot(a)
      a.f()
      expect(a.n).to.equal(1)
      unmangle(snapshot)._rollback()
      expect('n' in a).to.equal(false)
    })
  })

  describe('code should evaluate the same in every environment', () => {
    it('should save deterministic code', () => {
      const test = s => expect(eval(`${s};A`).toString()).to.equal(s) // eslint-disable-line
      test('class A {    \n      f() { return      1 }  }')
      test('class     A        {}')
    })
  })
})

// ------------------------------------------------------------------------------------------------
