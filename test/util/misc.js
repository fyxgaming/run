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
  _SerialTaskQueue
} = unmangle(unmangle(Run)._util)

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
