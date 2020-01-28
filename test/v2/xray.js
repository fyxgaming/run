const { describe, it } = require('mocha')
const { expect } = require('chai')
const Xray = require('../../lib/v2/xray')

// ------------------------------------------------------------------------------------------------
// Test vector class
// ------------------------------------------------------------------------------------------------

class TestVector {
  constructor (x) {
    this.x = x
    this.scannable = true
    this.cloneable = true
    this.serializable = true
    this.serializedX = x
  }

  unscannable () { this.scannable = false; return this }
  uncloneable () { this.cloneable = false; return this }
  unserializable () { this.serializable = false; return this }
  serialized (value) { this.serializedX = value; return this }

  testScan () {
    const xray = new Xray()
    if (this.scannable) {
      expect(() => xray.scan(this.x)).not.to.throw()
    } else {
      expect(() => xray.scan(this.x)).to.throw(`${this.x} cannot be scanned`)
    }
  }

  testCloneable () {
    const xray = new Xray()
    expect(xray.cloneable(this.x)).to.equal(this.cloneable)
    expect(xray.caches.cloneable.get(this.x)).to.equal(this.cloneable)
  }

  testSerializable () {
    const xray = new Xray()
    expect(xray.serializable(this.x)).to.equal(this.serializable)
    expect(xray.caches.serializable.get(this.x)).to.equal(this.serializable)
  }

  testClone () {
    const xray = new Xray()

    if (!this.cloneable) {
      expect(() => xray.clone(this.x)).to.throw(`${this.x} cannot be cloned`)
      return
    }

    if (typeof this.x === 'object' && this.x) {
      expect(xray.clone(this.x)).not.to.equal(this.x)
    }
    expect(xray.clone(this.x)).to.deep.equal(this.x)
    expect(xray.caches.clone.get(this.x)).to.deep.equal(this.x)
  }

  testSerialize () {
    const xray = new Xray()

    if (!this.serializable) {
      expect(() => xray.serialize(this.x)).to.throw(`${this.x} cannot be serialized`)
      return
    }

    if (typeof this.x === 'object' && this.x) {
      expect(xray.serialize(this.x)).not.to.equal(this.serializedX)
    }
    expect(xray.serialize(this.x)).to.deep.equal(this.serializedX)
    expect(xray.caches.serialize.get(this.x)).to.deep.equal(this.serializedX)
  }
}

// ------------------------------------------------------------------------------------------------
// Test vectors
// ------------------------------------------------------------------------------------------------

const vectors = []

function addTestVector (x) {
  const vector = new TestVector(x)
  vectors.push(vector)
  return vector
}

// Booleans
addTestVector(true)
addTestVector(false)

// Numbers
addTestVector(0)
addTestVector(-0)
addTestVector(-1)
addTestVector(Number.MAX_SAFE_INTEGER)
addTestVector(Number.MIN_SAFE_INTEGER)
addTestVector(Number.MAX_VALUE)
addTestVector(Number.MIN_VALUE)
addTestVector(0.5)
addTestVector(-1.5)
addTestVector(0.1234567890987654321)
addTestVector(NaN).unserializable()
addTestVector(Infinity).unserializable()
addTestVector(-Infinity).unserializable()

// Strings
addTestVector('')
addTestVector('abc')
addTestVector('🐉')
let longString = ''
for (let i = 0; i < 10000; i++) longString += 'abcdefghijklmnopqrstuvwxyz'
addTestVector(longString)

// Undefined
addTestVector(undefined).serialized({ $class: 'undefined' })

// Objects
addTestVector(null)
addTestVector({})
addTestVector({ n: 1 })
addTestVector({ o1: { o2: { o3: {} } } })
addTestVector({ s: 't', a: [1], b: true, n: 0, o: { n2: 2 }, z: null })
addTestVector({ $class: 'undefined' }).unserializable()
addTestVector({ $ref: '123' }).unserializable()
addTestVector({ $n: '0' }).unserializable()
addTestVector({ undef: undefined }).serialized({ undef: { $class: 'undefined' } })

// Array
addTestVector([])
addTestVector([1, 'a', true])
addTestVector([[[]]])
const z = [[1], [2], [3]]
addTestVector(z)
const arr = [1]
arr.x = 2
addTestVector(arr)
addTestVector([undefined, null]).serialized([{ $class: 'undefined' }, null])
class CustomArray extends Array {}
addTestVector(CustomArray.from([])).unscannable().uncloneable().unserializable()

/*
// Circular references
// const circ = {}
// circ.circ = circ
// addTestVector(circ)

// Duplicate references
// const dup = {}
*/

// Circular array

// Uint8Array

// TypedArray
/*
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
  */

// Sets
/*
  new Set(),
  new Set([1, 2, 3]),
  new Set([new Set(['a', 'b', 'c']), {}])
  */

// Deployable
/*
addTestVector(class { }, { deployable: true })
addTestVector(class A { }, { deployable: true })
addTestVector(class { method() { return null }}, { deployable: true })
addTestVector(class B { constructor() {}}, { deployable: true })
addTestVector(function f() {}, { deployable: true })
addTestVector(function add(a, b) { return a + b}, { deployable: true })
addTestVector(function () { return '123' }, { deployable: true })
addTestVector(() => {}, { deployable: true })
addTestVector(x => x, { deployable: true })

// Non-deployable
addTestVector(Math.random, { deployable: false })
addTestVector(Array.prototype.indexOf, { deployable: false })
addTestVector(WeakSet.prototype.has, { deployable: false })
addTestVector(String.prototype.endsWith, { deployable: false })
addTestVector(isNaN, { deployable: false })
addTestVector(isFinite, { deployable: false })
addTestVector(parseInt, { deployable: false })
addTestVector(escape, { deployable: false })
addTestVector(eval, { deployable: false })

// Symbols
addTestVector(Symbol.hasInstance, { cloneable: false, serializable: false })
addTestVector(Symbol.iterator, { cloneable: false, serializable: false })
addTestVector(Symbol.species, { cloneable: false, serializable: false })
addTestVector(Symbol.unscopables, { cloneable: false, serializable: false })

// Intrinsic objects
addTestVector(console, { cloneable: false, serializable: false })
addTestVector(Object, { cloneable: false, serializable: false })
addTestVector(Function, { cloneable: false, serializable: false })
addTestVector(Error, { cloneable: false, serializable: false })
addTestVector(Math, { cloneable: false, serializable: false })
addTestVector(Buffer, { cloneable: false, serializable: false })
addTestVector(String, { cloneable: false, serializable: false })
addTestVector(JSON, { cloneable: false, serializable: false })
addTestVector(Promise, { cloneable: false, serializable: false })
addTestVector(Proxy, { cloneable: false, serializable: false })
addTestVector(WebAssembly, { cloneable: false, serializable: false })

// Unsupported objects
addTestVector(new Date(), { cloneable: false, serializable: false })
addTestVector(new WeakSet, { cloneable: false, serializable: false })
addTestVector(new WeakMap, { cloneable: false, serializable: false })
addTestVector(new Proxy({}, {}), { cloneable: false, serializable: false })
*/

// Regexp

// Tokens

// Non-standard intrinsics

// ------------------------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------------------------

describe('Xray', () => {
  describe('scan', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testScan())
    })
  })

  describe('cloneable', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testCloneable())
    })
  })

  describe('serializable', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testSerializable())
    })
  })

  describe('clone', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testClone())
    })
  })

  describe('serialize', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testSerialize())
    })
  })
})

// Serializable, and more
// Each scanner
// Tests: Circular
// Duplicates
// Caches
// TODO: if (key.startsWith('$')) throw new Error('$ properties must not be defined')
// Port existing classes over

// ------------------------------------------------------------------------------------------------
