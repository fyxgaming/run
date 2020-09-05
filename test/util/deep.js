/**
 * deep.js
 *
 * Tests for lib/util/deep.js
 */

const { describe, it } = require('mocha')
const { fake, stub } = require('sinon')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Berry } = Run
const unmangle = require('../env/unmangle')
const { _deepVisit, _deepReplace, _deepClone } = unmangle(unmangle(Run)._deep)

// ------------------------------------------------------------------------------------------------
// _deepVisit
// ------------------------------------------------------------------------------------------------

describe('_deepVisit', () => {
  it('objects', () => {
    const o = { p: {} }
    const callback = fake()
    _deepVisit(o, callback)
    expect(callback.args).to.deep.equal([[o], [o.p]])
  })

  // --------------------------------------------------------------------------

  it('arrays', () => {
    const a = [[], []]
    const callback = fake()
    _deepVisit(a, callback)
    expect(callback.args).to.deep.equal([[a], [a[0]], [a[1]]])
  })

  // --------------------------------------------------------------------------

  it('functions', () => {
    function f () { }
    f.g = () => { }
    const callback = fake()
    _deepVisit(f, callback)
    expect(callback.args).to.deep.equal([[f], [f.g]])
  })

  // --------------------------------------------------------------------------

  it('classes', () => {
    class A { }
    const a = new A()
    const callback = fake()
    _deepVisit(a, callback)
    expect(callback.args).to.deep.equal([[a], [A]])
  })

  // --------------------------------------------------------------------------

  it('parent classes', () => {
    class A { }
    class B extends A { }
    const b = new B()
    const callback = fake()
    _deepVisit(b, callback)
    expect(callback.args).to.deep.equal([[b], [B], [A]])
  })

  // --------------------------------------------------------------------------

  it('class properties', () => {
    class A { }
    A.x = {}
    const a = new A()
    const callback = fake()
    _deepVisit(a, callback)
    expect(callback.args).to.deep.equal([[a], [A], [A.x]])
  })

  // --------------------------------------------------------------------------

  it('set', () => {
    const o = {}
    const s = new Set()
    s.add(o)
    s.a = []
    const callback = fake()
    _deepVisit(s, callback)
    expect(callback.args).to.deep.equal([[s], [o], [s.a]])
  })

  // --------------------------------------------------------------------------

  it('map', () => {
    const s = new Set()
    const a = []
    const m = new Map()
    m.set(s, a)
    m.o = {}
    const callback = fake()
    _deepVisit(m, callback)
    expect(callback.args).to.deep.equal([[m], [s], [a], [m.o]])
  })

  // --------------------------------------------------------------------------

  it('primitive types', () => {
    const callback = fake()
    _deepVisit(1, callback)
    expect(callback.called).to.equal(true)
    _deepVisit('abc', callback)
    expect(callback.called).to.equal(true)
    _deepVisit(null, callback)
    expect(callback.called).to.equal(true)
    _deepVisit(undefined, callback)
    expect(callback.called).to.equal(true)
    _deepVisit(Symbol.hasInstance, callback)
    expect(callback.called).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('circular objects', () => {
    const o = {}
    o.o = o
    o.p = [o]
    const callback = fake()
    _deepVisit(o, callback)
    expect(callback.args).to.deep.equal([[o], [o.p]])
  })

  // --------------------------------------------------------------------------

  it('circular classes', () => {
    class A { }
    A.A = A
    class B extends A { }
    B.x = { A }
    const callback = fake()
    _deepVisit(B, callback)
    expect(callback.args).to.deep.equal([[B], [B.x], [A]])
  })

  // --------------------------------------------------------------------------

  it('stop traversing', () => {
    const a = [[{}]]
    const callback = stub()
    callback.withArgs(a[0]).returns(false)
    _deepVisit(a, callback)
    expect(callback.args).to.deep.equal([[a], [a[0]]])
  })

  // --------------------------------------------------------------------------

  it('recognizes sandbox intrinsics', () => {
    const SI = unmangle(Run.sandbox)._intrinsics
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
  it('objects', () => {
    const o = {}
    o.p = {}
    const callback = stub()
    callback.withArgs(o.p).returns([])
    expect(_deepReplace(o, callback)).to.deep.equal({ p: [] })
  })

  // --------------------------------------------------------------------------

  it('arrays', () => {
    const a = [1, 2, []]
    const callback = stub()
    callback.withArgs(a[2]).returns(3)
    expect(_deepReplace(a, callback)).to.deep.equal([1, 2, 3])
  })

  // --------------------------------------------------------------------------

  it('functions', () => {
    function f () { }
    f.g = () => {}
    const h = x => x
    const callback = stub()
    callback.withArgs(f.g).returns(h)
    expect(_deepReplace(f, callback).g).to.equal(h)
  })

  // --------------------------------------------------------------------------

  it('classes', () => {
    class A { }
    class B { get x () { return 1 } }
    const a = new A()
    const callback = stub()
    callback.withArgs(A).returns(B)
    const a2 = _deepReplace(a, callback)
    expect(a2.constructor).to.equal(B)
    expect(a2.x).to.equal(1)
  })

  // --------------------------------------------------------------------------

  it('parent classes', () => {
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

  // --------------------------------------------------------------------------

  it('class properties', () => {
    class A {}
    A.o = class B { }
    const a = new A()
    const callback = stub()
    callback.withArgs(A.o).returns([])
    _deepReplace(a, callback)
    expect(A.o).to.deep.equal([])
  })

  // --------------------------------------------------------------------------

  it('traverses replaced values', () => {
    const o = {}
    o.p = []
    const callback = stub()
    function f () { }
    callback.withArgs(o.p).returns([{}, o, f])
    callback.withArgs(f).returns(1)
    _deepReplace(o, callback)
    expect(o.p).to.deep.equal([{}, o, 1])
  })

  // --------------------------------------------------------------------------

  it('set entries', () => {
    const s = new Set()
    const o = {}
    const m = new Map()
    s.add(1)
    s.add(o)
    s.add(3)
    const callback = stub()
    callback.withArgs(o).returns(m)
    _deepReplace(s, callback)
    expect(Array.from(s)).to.deep.equal([1, m, 3])
  })

  // --------------------------------------------------------------------------

  it('map entries', () => {
    const m = new Map()
    function f () { }
    class B { }
    m.set(1, 1)
    m.set(f, 2)
    m.set(B, B)
    m.set(4, 4)
    m.a = []
    const callback = stub()
    callback.withArgs(m.a).returns({})
    callback.withArgs(f).returns(2)
    callback.withArgs(B).returns(m)
    _deepReplace(m, callback)
    expect(m.a).to.deep.equal({})
    expect(Array.from(m.keys())).to.deep.equal([1, 2, m, 4])
    expect(Array.from(m.values())).to.deep.equal([1, 2, m, 4])
  })

  // --------------------------------------------------------------------------

  it('circular objects', () => {
    const o = {}
    o.p = {}
    o.p.q = o
    const callback = stub()
    callback.withArgs(o.p).returns([o])
    _deepReplace(o, callback)
    expect(o.p).to.deep.equal([o])
  })

  // --------------------------------------------------------------------------

  it('circular classes', () => {
    class A {}
    class B extends A { }
    A.B = B
    class C {}
    C.B = B
    const b = new B()
    const callback = stub()
    callback.withArgs(B).returns(C)
    _deepReplace(b, callback)
    expect(b.constructor).to.equal(C)
    expect(b.constructor.B).to.equal(C)
  })

  // --------------------------------------------------------------------------

  it('callback can return non-objects and non-functions', () => {
    const a = [{}, [], () => {}]
    const callback = stub()
    callback.withArgs(a[0]).returns(Symbol.hasInstance)
    callback.withArgs(a[1]).returns(1)
    callback.withArgs(a[2]).returns('hello')
    _deepReplace(a, callback)
    expect(a).to.deep.equal([Symbol.hasInstance, 1, 'hello'])
  })

  // --------------------------------------------------------------------------

  it('recognizes sandbox intrinsics', () => {
    const SI = unmangle(Run.sandbox)._intrinsics
    new Run() // eslint-disable-line
    const o = new SI.Object()
    o.s = new SI.Set()
    const a = new SI.Array()
    o.s.add(a)
    const callback = stub()
    callback.withArgs(o.s).returns([1])
    _deepReplace(o, callback)
    expect(o.s).to.deep.equal([1])
  })

  // --------------------------------------------------------------------------

  it('does not replace non-objects and non-functions', () => {
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

// ------------------------------------------------------------------------------------------------
// _deepClone
// ------------------------------------------------------------------------------------------------

describe('_deepClone', () => {
  it('primitives', () => {
    expect(_deepClone(0)).to.equal(0)
    expect(_deepClone(1)).to.equal(1)
    expect(_deepClone(Infinity)).to.equal(Infinity)
    expect(_deepClone(true)).to.equal(true)
    expect(_deepClone(false)).to.equal(false)
    expect(_deepClone('')).to.equal('')
    expect(_deepClone('abc')).to.equal('abc')
    expect(_deepClone(null)).to.equal(null)
  })

  // --------------------------------------------------------------------------

  it('throws for symbols', () => {
    expect(() => _deepClone(Symbol.hasInstance)).to.throw('Cannot clone')
    expect(() => _deepClone(Symbol.iterator)).to.throw('Cannot clone')
  })

  // --------------------------------------------------------------------------

  it('basic objects', () => {
    const o = { p: { m: 1 } }
    expect(_deepClone(o)).to.deep.equal({ p: { m: 1 } })
  })

  // --------------------------------------------------------------------------

  it('basic array', () => {
    const a = [1, false, [], {}]
    expect(_deepClone(a)).to.deep.equal([1, false, [], {}])
  })

  // --------------------------------------------------------------------------

  it('uint8array', () => {
    const b = new Uint8Array([0, 1, 255])
    const b2 = _deepClone(b)
    expect(b2 instanceof Uint8Array).to.equal(true)
    expect(Array.from(b2)).to.deep.equal([0, 1, 255])
  })

  // --------------------------------------------------------------------------

  it('set', () => {
    const s = new Set([false, null, {}, new Map()])
    s.x = 1
    const s2 = _deepClone(s)
    expect(s2 instanceof Set).to.equal(true)
    expect(Array.from(s2)).to.deep.equal([false, null, {}, new Map()])
    expect(s2.x).to.equal(1)
  })

  // --------------------------------------------------------------------------

  it('map', () => {
    const m = new Map([[0, 1], ['a', 'b'], [[], {}], [new Set(), new Map()]])
    m.o = {}
    const m2 = _deepClone(m)
    expect(m2 instanceof Map).to.equal(true)
    expect(Array.from(m2)).to.deep.equal([[0, 1], ['a', 'b'], [[], {}], [new Set(), new Map()]])
    expect(m2.o).to.deep.equal({})
  })

  // --------------------------------------------------------------------------

  it('jig', () => {
    new Run() // eslint-disable-line
    class A extends Jig { }
    const a = new A()
    expect(_deepClone(a)).to.equal(a)
  })

  // --------------------------------------------------------------------------

  it('code', () => {
    const run = new Run()
    class A extends Jig { }
    const CA = run.deploy(A)
    expect(_deepClone(CA)).to.equal(CA)
  })
  // --------------------------------------------------------------------------

  it('static code', () => {
    const run = new Run()
    function f () { }
    const cf = run.deploy(f)
    expect(_deepClone(cf)).to.equal(cf)
    class A { }
    const CA = run.deploy(A)
    expect(_deepClone(CA)).to.equal(CA)
  })

  // --------------------------------------------------------------------------

  it('non-jig code', () => {
    function f () { }
    expect(() => _deepClone(f)).to.throw('Cannot clone non-code function')
    class A { }
    expect(() => _deepClone(A)).to.throw('Cannot clone non-code function')
    class B extends Jig { }
    expect(() => _deepClone(B)).to.throw('Cannot clone non-code function')
  })

  // --------------------------------------------------------------------------

  it.skip('berry', async () => {
    const run = new Run()
    class A extends Berry { static pluck () { return new A() } }
    const berry = await run.load('123', A)
    expect(_deepClone(berry)).to.equal(berry)
  })

  // --------------------------------------------------------------------------

  it('arbitrary objects', () => {
    const run = new Run()
    class A { }
    const A2 = run.deploy(A)
    const a = new A2()
    const a2 = _deepClone(a)
    expect(a).to.deep.equal(a2)
    expect(A2).to.equal(a2.constructor)
  })

  // --------------------------------------------------------------------------

  it('undeployed arbitrary objects', () => {
    const run = new Run()
    class A { }
    const A2 = run.install(A)
    const a = new A2()
    const a2 = _deepClone(a)
    expect(a).to.deep.equal(a2)
    expect(A2).to.equal(a2.constructor)
    expect(() => A2.location).to.throw()
  })

  // --------------------------------------------------------------------------

  it('circular references', () => {
    const run = new Run()
    const o = {}
    o.o = o
    o.a = []
    o.a.push(o.a)
    o.s = new Set()
    o.s.add(o)
    o.m = new Map()
    o.m.set(o.m, o.m)
    const A2 = run.deploy(class A {})
    o.z = new A2()
    o.z.z = o.z
    o.s.s = o.s
    o.m.m = o.m
    const o2 = _deepClone(o)
    expect(o2.o).to.equal(o2)
    expect(o2.a[0]).to.equal(o2.a)
    expect(o2.s.has(o2)).to.equal(true)
    expect(o2.m.get(o2.m)).to.equal(o2.m)
    expect(o2.z.z).to.equal(o2.z)
    expect(o2.s.s).to.equal(o2.s)
    expect(o2.m.m).to.equal(o2.m)
  })

  // --------------------------------------------------------------------------

  it('throws for intrinsics', () => {
    expect(() => _deepClone(Math)).to.throw('Cannot clone')
    expect(() => _deepClone(new WeakSet())).to.throw('Cannot clone')
    expect(() => _deepClone(/123/)).to.throw('Cannot clone')
    expect(() => _deepClone(Promise)).to.throw('Cannot clone')
  })

  // --------------------------------------------------------------------------

  it('throws for extensions of supported types', () => {
    expect(() => _deepClone(new (class MySet extends Set {})())).to.throw('Cannot clone')
    expect(() => _deepClone(new (class MySet extends Map {})())).to.throw('Cannot clone')
  })

  // --------------------------------------------------------------------------

  it('to sandbox intrinsics', () => {
    const SI = unmangle(Run.sandbox)._intrinsics
    expect(_deepClone(new Set(), SI) instanceof SI.Set).to.equal(true)
    expect(_deepClone(new Map(), SI) instanceof SI.Map).to.equal(true)
    expect(_deepClone(new Uint8Array(), SI) instanceof SI.Uint8Array).to.equal(true)
    expect(Object.getPrototypeOf(_deepClone([], SI))).to.equal(SI.Array.prototype)
    expect(Object.getPrototypeOf(_deepClone({}, SI))).to.equal(SI.Object.prototype)
  })

  // --------------------------------------------------------------------------

  it('from sandbox intrinsics', () => {
    const SI = unmangle(Run.sandbox)._intrinsics
    expect(_deepClone(new SI.Set()) instanceof Set).to.equal(true)
    expect(_deepClone(new SI.Map()) instanceof Map).to.equal(true)
    expect(_deepClone(new SI.Uint8Array()) instanceof Uint8Array).to.equal(true)
    expect(Object.getPrototypeOf(_deepClone(new SI.Array()))).to.equal(Array.prototype)
    expect(Object.getPrototypeOf(_deepClone(new SI.Object()))).to.equal(Object.prototype)
  })
})

// ------------------------------------------------------------------------------------------------
// _deepEqual
// ------------------------------------------------------------------------------------------------

describe('_deepEqual', () => {
  it.skip('placeholder', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
