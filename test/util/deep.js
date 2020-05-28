/**
 * deep.js
 *
 * Tests for lib/util/deep.js
 */

const { describe, it } = require('mocha')
const { fake, stub } = require('sinon')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const { _deepVisit, _deepReplace } = unmangle(unmangle(Run)._util)

// ------------------------------------------------------------------------------------------------
// _deepVisit
// ------------------------------------------------------------------------------------------------

describe('_deepVisit', () => {
  it('should visit objects', () => {
    const o = { p: {} }
    const callback = fake()
    _deepVisit(o, callback)
    expect(callback.args).to.deep.equal([[o], [o.p]])
  })

  it('should visit arrays', () => {
    const a = [[], []]
    const callback = fake()
    _deepVisit(a, callback)
    expect(callback.args).to.deep.equal([[a], [a[0]], [a[1]]])
  })

  it('should visit functions', () => {
    function f () { }
    f.g = () => { }
    const callback = fake()
    _deepVisit(f, callback)
    expect(callback.args).to.deep.equal([[f], [f.g]])
  })

  it('should visit classes', () => {
    class A { }
    const a = new A()
    const callback = fake()
    _deepVisit(a, callback)
    expect(callback.args).to.deep.equal([[a], [A]])
  })

  it('should visit parent classes', () => {
    class A { }
    class B extends A { }
    const b = new B()
    const callback = fake()
    _deepVisit(b, callback)
    expect(callback.args).to.deep.equal([[b], [B], [A]])
  })

  it('should visit class properties', () => {
    class A { }
    A.x = {}
    const a = new A()
    const callback = fake()
    _deepVisit(a, callback)
    expect(callback.args).to.deep.equal([[a], [A], [A.x]])
  })

  it('should visit set', () => {
    const o = {}
    const s = new Set()
    s.add(o)
    s.a = []
    const callback = fake()
    _deepVisit(s, callback)
    expect(callback.args).to.deep.equal([[s], [o], [s.a]])
  })

  it('should visit map', () => {
    const s = new Set()
    const a = []
    const m = new Map()
    m.set(s, a)
    m.o = {}
    const callback = fake()
    _deepVisit(m, callback)
    expect(callback.args).to.deep.equal([[m], [s], [a], [m.o]])
  })

  it('should not visit non-objects and non-functions', () => {
    const callback = fake()
    _deepVisit(1, callback)
    expect(callback.called).to.equal(false)
    _deepVisit('abc', callback)
    expect(callback.called).to.equal(false)
    _deepVisit(null, callback)
    expect(callback.called).to.equal(false)
    _deepVisit(undefined, callback)
    expect(callback.called).to.equal(false)
    _deepVisit(Symbol.hasInstance, callback)
    expect(callback.called).to.equal(false)
  })

  it('should not visit circular objects', () => {
    const o = {}
    o.o = o
    o.p = [o]
    const callback = fake()
    _deepVisit(o, callback)
    expect(callback.args).to.deep.equal([[o], [o.p]])
  })

  it('should not visit circular classes', () => {
    class A { }
    A.A = A
    class B extends A { }
    B.x = { A }
    const callback = fake()
    _deepVisit(B, callback)
    expect(callback.args).to.deep.equal([[B], [B.x], [A]])
  })

  it('should not traverse deeper if return false', () => {
    const a = [[{}]]
    const callback = stub()
    callback.withArgs(a[0]).returns(false)
    _deepVisit(a, callback)
    expect(callback.args).to.deep.equal([[a], [a[0]]])
  })

  it('should recognize sandbox intrinsics', () => {
    const SI = unmangle(unmangle(Run.sandbox)._instance)._intrinsics
    new Run() // eslint-disable-line
    const o = new SI.Object()
    o.s = new SI.Set()
    const a = new SI.Array()
    o.s.add(a)
    const callback = fake()
    _deepVisit(o, callback)
    expect(callback.args).to.deep.equal([[o], [o.s], [a]])
  })
})

// ------------------------------------------------------------------------------------------------
// _deepReplace
// ------------------------------------------------------------------------------------------------

describe('_deepReplace', () => {
  console.log(_deepReplace('hello'))
})

// deepReplace, maintains order in set/map

// ------------------------------------------------------------------------------------------------
