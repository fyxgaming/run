/**
 * misc.js
 *
 * Tests for lib/util/misc.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { Jig } = Run
const { unmangle } = require('../env/unmangle')
const {
  _bsvNetwork,
  _deployable,
  _text,
  _resourceType,
  _sourceCode,
  _deepTraverseObjects,
  _SerialTaskQueue
} = unmangle(unmangle(Run)._util)
const Sandbox = Run.sandbox

// ------------------------------------------------------------------------------------------------
// _bsvNetwork
// ------------------------------------------------------------------------------------------------

describe('_bsvNetwork', () => {
  it('should return appropriate network', () => {
    expect(_bsvNetwork('main')).to.equal('mainnet')
    expect(_bsvNetwork('mainnet')).to.equal('mainnet')
    expect(_bsvNetwork('mainSideChain')).to.equal('mainnet')
    expect(_bsvNetwork('test')).to.equal('testnet')
    expect(_bsvNetwork('mock')).to.equal('testnet')
    expect(_bsvNetwork('stn')).to.equal('testnet')
  })
})

// ------------------------------------------------------------------------------------------------
// _deployable
// ------------------------------------------------------------------------------------------------

describe('_deployable', () => {
  it('should return true for allowed', () => {
    class B { }
    expect(_deployable(class A { })).to.equal(true)
    expect(_deployable(class A extends B { })).to.equal(true)
    expect(_deployable(function f () {})).to.equal(true)
    expect(_deployable(() => {})).to.equal(true)
    expect(_deployable(function () { })).to.equal(true)
    expect(_deployable(class {})).to.equal(true)
  })

  it('should return false for non-functions', () => {
    expect(_deployable()).to.equal(false)
    expect(_deployable(1)).to.equal(false)
    expect(_deployable({})).to.equal(false)
    expect(_deployable(true)).to.equal(false)
  })

  it('should return false for standard library objects', () => {
    expect(_deployable(Array)).to.equal(false)
    expect(_deployable(Uint8Array)).to.equal(false)
    expect(_deployable(Math.sin)).to.equal(false)
  })
})

// ------------------------------------------------------------------------------------------------
// _resourceType
// ------------------------------------------------------------------------------------------------

describe('_resourceType', () => {
  const test = (x, type) => expect(_resourceType(x)).to.equal(type)
  it('should return jig for jigs', () => test(new (class A extends Jig {})(), 'jig'))
  it('should return code for class', () => test(class A extends Jig {}, 'code'))
  it('should return code for function', () => test(function f () {}, 'code'))
  it('should return code for anonymous function', () => test(x => x, 'code'))
  it('should return undefined for null', () => test(null, undefined))
  it('should return undefined for number', () => test(0, undefined))
  it('should return undefined for string', () => test('abc', undefined))
  it('should return undefined for object', () => test({}, undefined))
  it('should return undefined for undefined', () => test({}, undefined))
})

// ------------------------------------------------------------------------------------------------
// _text
// ------------------------------------------------------------------------------------------------

describe('_text', () => {
  it('should create short names', () => {
    // Strings
    expect(_text('')).to.equal('""')
    expect(_text('abc')).to.equal('"abc"')
    expect(_text('The quick brown fox jumped over blah blah')).to.equal('"The quick brown fox …"')
    // Booleans
    expect(_text(true)).to.equal('true')
    expect(_text(false)).to.equal('false')
    // Numbers
    expect(_text(1)).to.equal('1')
    expect(_text(-1)).to.equal('-1')
    expect(_text(1.5)).to.equal('1.5')
    expect(_text(NaN)).to.equal('NaN')
    expect(_text(-Infinity)).to.equal('-Infinity')
    // Symbols
    expect(_text(Symbol.iterator)).to.equal('Symbol(Symbol.iterator)')
    expect(_text(Symbol.unscopables)).to.equal('Symbol(Symbol.unscopables)')
    // Undefined
    expect(_text(undefined)).to.equal('undefined')
    // Objects
    expect(_text(null)).to.equal('null')
    expect(_text({})).to.equal('[object Object]')
    expect(_text({ a: 1 })).to.equal('[object Object]')
    expect(_text([1, 2, 3])).to.equal('[object Array]')
    expect(_text(new class Dragon {}())).to.equal('[object Dragon]')
    expect(_text(new class {}())).to.equal('[anonymous object]')
    // Functions
    expect(_text(function f () { })).to.equal('f')
    expect(_text(class A { })).to.equal('A')
    expect(_text(function () { })).to.equal('[anonymous function]')
    expect(_text(() => { })).to.equal('[anonymous function]')
    expect(_text((x, y) => { })).to.equal('[anonymous function]')
    expect(_text(_$xX123 => _$xX123)).to.equal('[anonymous function]')
    expect(_text(class { })).to.equal('[anonymous class]')
  })
})

// ------------------------------------------------------------------------------------------------
// _sourceCode
// ------------------------------------------------------------------------------------------------

describe('_sourceCode', () => {
  // Node 8 and Node 12 have slightly different spacing for getNormalizedSourceCode('function () { return 1 }')
  // We don't need the normalized code to always be exactly the same, as long as it functions the same.
  // Compiled build also add semicolons, so we normlize that too.
  function expectNormalizedSourceCode (type, text) {
    const normalize = str => str.replace(/\s+/g, '').replace(/;/g, '')
    expect(normalize(_sourceCode(type))).to.equal(normalize(text))
  }

  it('should get code for basic class', () => {
    class A {}
    expectNormalizedSourceCode(A, 'class A {}')
  })

  it('should get code for basic function', () => {
    function f () { return 1 }
    expectNormalizedSourceCode(f, 'function f () { return 1 }')
  })

  it('should get code for class that extends another class', () => {
    const SomeLibrary = { B: class B { } }
    class A extends SomeLibrary.B {}
    expectNormalizedSourceCode(A, 'class A extends B {}')
  })

  it('should get code for single-line class', () => {
    class B { }
    class A extends B { f () {} }
    expectNormalizedSourceCode(A, 'class A extends B { f () {} }')
  })

  // TODO: More tests
})

// ------------------------------------------------------------------------------------------------
// _deepTraverseObjects
// ------------------------------------------------------------------------------------------------

describe('_deepTraverseObjects', () => {
  it('should call callback for every function or object', () => {
    const a2 = []
    class C { }
    const c = new C()
    c.x = {}
    const f = function f () { }
    f.n = 1
    f.o = { a: [{}] }
    f.s = new Set()
    f.s.add(c)
    f.s.a = []
    f.m = new Map()
    f.m.set(C, a2)
    f.m.o = { }
    const results = []
    _deepTraverseObjects(f, x => { results.push(x); return true })
    expect(results.length).to.equal(11)
    expect(results[0]).to.equal(f.o)
    expect(results[1]).to.equal(f.o.a)
    expect(results[2]).to.equal(f.o.a[0])
    expect(results[3]).to.equal(f.s)
    expect(results[4]).to.equal(c)
    expect(results[5]).to.equal(c.x)
    expect(results[6]).to.equal(f.s.a)
    expect(results[7]).to.equal(f.m)
    expect(results[8]).to.equal(C)
    expect(results[9]).to.equal(a2)
    expect(results[10]).to.equal(f.m.o)
  })

  it('should not dive deep if callback returns false', () => {
    const a = [[{}]]
    const results = []
    _deepTraverseObjects(a, x => { results.push(x); return false })
    expect(results.length).to.equal(1)
    expect(results[0]).to.equal(a[0])
  })

  it('should only traverse once in circular reference', () => {
    const o = {}
    o.o = o
    const results = []
    _deepTraverseObjects(o, x => { results.push(x); return true })
    expect(results.length).to.equal(1)
    expect(results[0]).to.equal(o)
  })

  it('should recognize sandbox sets and maps', () => {
    const sandboxIntrinsics = unmangle(unmangle(Sandbox)._instance)._intrinsics
    const set = new sandboxIntrinsics.Set()
    set.add({})
    const map = new sandboxIntrinsics.Map()
    map.set({}, {})
    const results = []
    _deepTraverseObjects([set, map], x => { results.push(x); return true })
    expect(results.length).to.equal(5)
  })

  it('should not deep traverse non-objects', () => {
    const results = []
    _deepTraverseObjects(123, x => { results.push(x); return true })
    _deepTraverseObjects(true, x => { results.push(x); return true })
    _deepTraverseObjects(Symbol.iterator, x => { results.push(x); return true })
    _deepTraverseObjects('hello', x => { results.push(x); return true })
    _deepTraverseObjects(null, x => { results.push(x); return true })
  })
})

// ------------------------------------------------------------------------------------------------
// _SerialTaskQueue
// ------------------------------------------------------------------------------------------------

describe('_SerialTaskQueue', () => {
  const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }

  it('should serialize tasks in order', async () => {
    const queue = new _SerialTaskQueue()
    const order = []; const promises = []
    promises.push(queue.enqueue(async () => { await sleep(5); order.push(1) }))
    promises.push(queue.enqueue(async () => { await sleep(3); order.push(2) }))
    promises.push(queue.enqueue(async () => { await sleep(1); order.push(3) }))
    await Promise.all(promises)
    expect(order).to.deep.equal([1, 2, 3])
  })

  it('should support stops and starts', async () => {
    const queue = new _SerialTaskQueue()
    let done1 = false; let done2 = false
    await queue.enqueue(() => { done1 = true })
    expect(done1).to.equal(true)
    await queue.enqueue(() => { done2 = true })
    expect(done2).to.equal(true)
  })
})

// ------------------------------------------------------------------------------------------------
