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
  it('should replace objects', () => {
    const o = {}
    o.p = {}
    const callback = stub()
    callback.withArgs(o.p).returns([])
    expect(_deepReplace(o, callback)).to.deep.equal({ p: [] })
  })

  it('should replace arrays', () => {
    const a = [1, 2, []]
    const callback = stub()
    callback.withArgs(a[2]).returns(3)
    expect(_deepReplace(a, callback)).to.deep.equal([1, 2, 3])
  })

  it('should replace functions', () => {
    function f () { }
    f.g = () => {}
    const h = x => x
    const callback = stub()
    callback.withArgs(f.g).returns(h)
    expect(_deepReplace(f, callback).g).to.equal(h)
  })

  it('should replace classes', () => {
    class A { }
    class B { get x () { return 1 } }
    const a = new A()
    const callback = stub()
    callback.withArgs(A).returns(B)
    const a2 = _deepReplace(a, callback)
    expect(a2.constructor).to.equal(B)
    expect(a2.x).to.equal(1)
  })

  it('should replace parent classes', () => {
    class A { cls () { return 'A' } }
    class B extends A { }
    class C { cls () { return 'C' } }
    C.y = 1
    const b = new B()
    const callback = stub()
    callback.withArgs(A).returns(C)
    const c = _deepReplace(b, callback)
    expect(c.cls()).to.equal('C')
  })

  it('should not replace non-objects and non-functions', () => {
    const callback = fake()
    expect(_deepReplace(1, callback)).to.equal(1)
    expect(callback.called).to.equal(false)
    expect(_deepReplace('abc', callback)).to.equal('abc')
    expect(callback.called).to.equal(false)
    expect(_deepReplace(null, callback)).to.equal(null)
    expect(callback.called).to.equal(false)
    expect(_deepReplace(undefined, callback)).to.equal(undefined)
    expect(callback.called).to.equal(false)
    expect(_deepReplace(Symbol.hasInstance, callback)).to.equal(Symbol.hasInstance)
    expect(callback.called).to.equal(false)
  })
})

// deepReplace, maintains order in set/map

// ------------------------------------------------------------------------------------------------
