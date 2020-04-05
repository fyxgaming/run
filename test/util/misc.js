/**
 * misc.js
 *
 * Tests for lib/util/misc.js
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../config')
const { AddressScript, PubKeyScript } = Run
const {
  _bsvNetwork,
  _deployable,
  _display,
  _sourceCode,
  _deepTraverseObjects,
  _checkSatoshis,
  _ownerScript,
  SerialTaskQueue
} = Run._util
const Sandbox = Run._sandbox

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
// _tokenType
// ------------------------------------------------------------------------------------------------

describe('_tokenType', () => {
  // TODO: add tests
})

// ------------------------------------------------------------------------------------------------
// _display
// ------------------------------------------------------------------------------------------------

describe('_display', () => {
  it('should create short names', () => {
    // Strings
    expect(_display('')).to.equal('""')
    expect(_display('abc')).to.equal('"abc"')
    expect(_display('Hello, world!')).to.equal('"Hello, wor…"')
    // Booleans
    expect(_display(true)).to.equal('true')
    expect(_display(false)).to.equal('false')
    // Numbers
    expect(_display(1)).to.equal('1')
    expect(_display(-1)).to.equal('-1')
    expect(_display(1.5)).to.equal('1.5')
    expect(_display(NaN)).to.equal('NaN')
    expect(_display(-Infinity)).to.equal('-Infinity')
    // Symbols
    expect(_display(Symbol.iterator)).to.equal('Symbol(Symbol.iterator)')
    expect(_display(Symbol.unscopables)).to.equal('Symbol(Symbol.unscopables)')
    // Undefined
    expect(_display(undefined)).to.equal('undefined')
    // Objects
    expect(_display(null)).to.equal('null')
    expect(_display({})).to.equal('[object Object]')
    expect(_display({ a: 1 })).to.equal('[object Object]')
    expect(_display([1, 2, 3])).to.equal('[object Array]')
    expect(_display(new class Dragon {}())).to.equal('[object Dragon]')
    // Functions
    expect(_display(function f () { })).to.equal('f')
    expect(_display(class A { })).to.equal('A')
    expect(_display(function () { })).to.equal('[anonymous function]')
    expect(_display(() => { })).to.equal('[anonymous function]')
    expect(_display((x, y) => { })).to.equal('[anonymous function]')
    expect(_display(_$xX123 => _$xX123)).to.equal('[anonymous function]')
    expect(_display(class { })).to.equal('[anonymous class]')
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
    const set = new Sandbox._instance._intrinsics.Set()
    set.add({})
    const map = new Sandbox._instance._intrinsics.Map()
    map.set({}, {})
    const results1 = []
    _deepTraverseObjects([set, map], x => { results1.push(x); return true })
    expect(results1.length).to.equal(2)
    const results2 = []
    _deepTraverseObjects([set, map], x => { results2.push(x); return true })
    expect(results2.length).to.equal(5)
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
// _checkSatoshis
// ------------------------------------------------------------------------------------------------

describe('_checkSatoshis', () => {
  it('should support allowed values', () => {
    expect(() => _checkSatoshis(0)).not.to.throw()
    expect(() => _checkSatoshis(1)).not.to.throw()
    expect(() => _checkSatoshis(bsv.Transaction.DUST_AMOUNT)).not.to.throw()
    expect(() => _checkSatoshis(100000000)).not.to.throw()
  })

  it('should throw if bad satoshis', () => {
    expect(() => _checkSatoshis()).to.throw('satoshis must be a number')
    expect(() => _checkSatoshis(-1)).to.throw('satoshis must be non-negative')
    expect(() => _checkSatoshis('0')).to.throw('satoshis must be a number')
    expect(() => _checkSatoshis([0])).to.throw('satoshis must be a number')
    expect(() => _checkSatoshis(1.5)).to.throw('satoshis must be an integer')
    expect(() => _checkSatoshis(NaN)).to.throw('satoshis must be an integer')
    expect(() => _checkSatoshis(Infinity)).to.throw('satoshis must be an integer')
    expect(() => _checkSatoshis(100000001)).to.throw('satoshis must be <= 100000000')
  })
})

// ------------------------------------------------------------------------------------------------
// _ownerScript
// ------------------------------------------------------------------------------------------------

describe('_ownerScript', () => {
  it('should support valid owners on different networks', () => {
    for (const bsvNetwork of ['mainnet', 'testnet']) {
      const privkey = new bsv.PrivateKey(bsvNetwork)
      const pubkey = privkey.publicKey.toString()
      const addr = privkey.toAddress().toString()
      const bytes = new AddressScript(addr).toBytes()
      expect(_ownerScript(pubkey).toBytes()).to.deep.equal(bytes)
      expect(_ownerScript(addr).toBytes()).to.deep.equal(bytes)
      expect(_ownerScript(new PubKeyScript(pubkey)).toBytes()).to.deep.equal(new PubKeyScript(pubkey).toBytes())
      expect(_ownerScript(new AddressScript(addr)).toBytes()).to.deep.equal(bytes)
    }
  })

  it('should throw if bad owner', () => {
    expect(() => _ownerScript()).to.throw('Invalid owner: undefined')
    expect(() => _ownerScript(123)).to.throw('Invalid owner: 123')
    expect(() => _ownerScript('hello')).to.throw('Invalid owner: hello')
    expect(() => _ownerScript(new bsv.PrivateKey())).to.throw('Invalid owner')
    expect(() => _ownerScript(new bsv.PrivateKey().publicKey)).to.throw('Invalid owner')
    expect(() => _ownerScript([new bsv.PrivateKey().publicKey.toString()])).to.throw('Invalid owner')
  })
})

// ------------------------------------------------------------------------------------------------
// SerialTaskQueue
// ------------------------------------------------------------------------------------------------

describe('SerialTaskQueue', () => {
  const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }

  it('should serialize tasks in order', async () => {
    const queue = new SerialTaskQueue()
    const order = []; const promises = []
    promises.push(queue.enqueue(async () => { await sleep(5); order.push(1) }))
    promises.push(queue.enqueue(async () => { await sleep(3); order.push(2) }))
    promises.push(queue.enqueue(async () => { await sleep(1); order.push(3) }))
    await Promise.all(promises)
    expect(order).to.deep.equal([1, 2, 3])
  })

  it('should support stops and starts', async () => {
    const queue = new SerialTaskQueue()
    let done1 = false; let done2 = false
    await queue.enqueue(() => { done1 = true })
    expect(done1).to.equal(true)
    await queue.enqueue(() => { done2 = true })
    expect(done2).to.equal(true)
  })
})

// ------------------------------------------------------------------------------------------------
