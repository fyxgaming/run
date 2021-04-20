/**
 * snapshot.js
 *
 * Tests for lib/util/snapshot.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Berry } = Run
const unmangle = require('../env/unmangle')
const Snapshot = unmangle(Run)._Snapshot

// ------------------------------------------------------------------------------------------------
// Snapshot
// ------------------------------------------------------------------------------------------------

describe('Snapshot', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('snapshot jigs', () => {
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

    // ------------------------------------------------------------------------

    it('snapshot code', () => {
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

    // ------------------------------------------------------------------------

    it('snapshot berries', async () => {
      new Run() // eslint-disable-line
      class A extends Berry {
        init () { this.n = 1 }
        static async pluck () { return new A() }
      }
      const berry = await A.load('123')
      const snapshot = new Snapshot(berry)
      expect(unmangle(snapshot)._kind).to.equal('berry')
      expect(unmangle(snapshot)._props.n).to.equal(1)
      expect(unmangle(snapshot)._props.location).to.equal('error://Undeployed')
      expect(unmangle(snapshot)._cls).to.equal(berry.constructor)
    })

    // ------------------------------------------------------------------------

    it('throws if not a jig', () => {
      new Run() // eslint-disable-line
      expect(() => new Snapshot()).to.throw('Not a creation: undefined')
      expect(() => new Snapshot(null)).to.throw('Not a creation: null')
      expect(() => new Snapshot({})).to.throw('Not a creation: [object Object]')
      expect(() => new Snapshot(class A { })).to.throw('Not a creation: A')
      expect(() => new Snapshot(class A extends Jig { })).to.throw('Not a creation: A')
    })
  })

  // --------------------------------------------------------------------------
  // _rollback
  // --------------------------------------------------------------------------

  describe('_rollback', () => {
    it('rollback jigs', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      const snapshot = new Snapshot(a)
      a.f()
      expect(a.n).to.equal(1)
      unmangle(snapshot)._rollback()
      expect('n' in a).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('rollback code', () => {
      const run = new Run()
      class A extends Jig { static f () { } }
      A.n = 1
      const C = run.deploy(A)
      const snapshot = new Snapshot(C)
      class B extends Jig { static g () { } }
      B.m = 2
      C.upgrade(B)
      expect(typeof C.f).to.equal('undefined')
      expect(typeof C.g).to.equal('function')
      expect(C.n).to.equal(undefined)
      expect(C.m).to.equal(2)
      unmangle(snapshot)._rollback()
      expect(typeof C.f).to.equal('function')
      expect(typeof C.g).to.equal('undefined')
      expect(C.n).to.equal(1)
      expect(C.m).to.equal(undefined)
    })
  })

  // describe('code should evaluate the same in every environment', () => {
  // it('should save deterministic code', () => {
  /*
      const test = s => expect(eval(`${s};A`).toString()).to.equal(s) // eslint-disable-line
      test('class A {    \n      f() { return      1 }  }')
      test('class     A        {}')
      */
  // })
  // })
})

// ------------------------------------------------------------------------------------------------
