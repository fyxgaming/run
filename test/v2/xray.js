const bsv = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const Xray = require('../../lib/v2/xray')
const { display } = require('../../lib/util')

// const evaluator = new Evaluator()

// ------------------------------------------------------------------------------------------------
// Test vector class
// ------------------------------------------------------------------------------------------------

class TestVector {
  constructor (x) {
    this.x = x
    this.scannable = true
    this.cloneable = true
    this.serializable = true
    this.deserializable = true
    this.serializedX = x
    this.deserializedChecks = []
    this.intrinsics = Xray.Intrinsics.defaultIntrinsics
  }

  unscannable () { this.scannable = false; return this }
  uncloneable () { this.cloneable = false; return this }
  unserializable () { this.serializable = false; return this }
  undeserializable () { this.deserializable = false; return this }
  serialized (value) { this.serializedX = value; return this }
  checkDeserialized (f) { this.deserializedChecks.push(f); return this }
  useIntrinsics (intrinsics) { this.intrinsics = intrinsics; return this }

  testScan () {
    const xray = new Xray().useIntrinsics(this.intrinsics)
    if (this.scannable) {
      expect(() => xray.scan(this.x)).not.to.throw()
    } else {
      expect(() => xray.scan(this.x)).to.throw(`${display(this.x)} cannot be scanned`)
    }
  }

  testCloneable () {
    const xray = new Xray().useIntrinsics(this.intrinsics)
    expect(xray.cloneable(this.x)).to.equal(this.cloneable)
    expect(xray.caches.cloneable.get(this.x)).to.equal(this.cloneable)
  }

  testSerializable () {
    const xray = new Xray().useIntrinsics(this.intrinsics)
    expect(xray.serializable(this.x)).to.equal(this.serializable)
    expect(xray.caches.serializable.get(this.x)).to.equal(this.serializable)
  }

  testDeserializable () {
    const xray = new Xray().useIntrinsics(this.intrinsics)
    expect(xray.deserializable(this.serializedX)).to.equal(this.deserializable)
    expect(xray.caches.deserializable.get(this.serializedX)).to.equal(this.deserializable)
  }

  testClone () {
    const xray = new Xray().useIntrinsics(this.intrinsics)

    if (!this.cloneable) {
      expect(() => xray.clone(this.x)).to.throw(`${display(this.x)} cannot be cloned`)
      return
    }

    if (typeof this.x === 'object' && this.x) {
      expect(xray.clone(this.x)).not.to.equal(this.x)
    }
    expect(xray.clone(this.x)).to.deep.equal(this.x)
    expect(xray.caches.clone.get(this.x)).to.deep.equal(this.x)
  }

  testSerialize () {
    const xray = new Xray().useIntrinsics(this.intrinsics)

    if (!this.serializable) {
      expect(() => xray.serialize(this.x)).to.throw(`${display(this.x)} cannot be serialized`)
      return
    }

    if (typeof this.x === 'object' && this.x) {
      expect(xray.serialize(this.x)).not.to.equal(this.serializedX)
    }
    expect(xray.serialize(this.x)).to.deep.equal(this.serializedX)
    expect(xray.caches.serialize.get(this.x)).to.deep.equal(this.serializedX)
  }

  testDeserialize () {
    const xray = new Xray().useIntrinsics(this.intrinsics)

    if (!this.deserializable) {
      expect(() => xray.deserialize(this.serializedX)).to.throw(`${display(this.serializedX)} cannot be deserialized`)
      return
    }

    const deserialized = xray.deserialize(this.serializedX)

    if (typeof this.x === 'object' && this.x) {
      expect(deserialized).not.to.equal(this.x)
    }
    expect(deserialized).to.deep.equal(this.x)
    expect(xray.caches.deserialize.get(this.serializedX)).to.deep.equal(this.x)

    this.deserializedChecks.forEach(f => f(deserialized))
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
addTestVector(NaN).unserializable().undeserializable()
addTestVector(Infinity).unserializable().undeserializable()
addTestVector(-Infinity).unserializable().undeserializable()

// Strings
addTestVector('')
addTestVector('abc')
addTestVector('🐉')
let longString = ''
for (let i = 0; i < 10000; i++) longString += 'abcdefghijklmnopqrstuvwxyz'
addTestVector(longString)

// Undefined
addTestVector(undefined).serialized({ $undef: 1 })

// Objects
addTestVector(null)
addTestVector({})
addTestVector({ n: 1 })
addTestVector({ o1: { o2: { o3: {} } } })
addTestVector({ s: 't', a: [1], b: true, n: 0, o: { n2: 2 }, z: null })
addTestVector(new Proxy({}, {}))
addTestVector({ $undef: 1 }).serialized(undefined).unserializable().undeserializable()
addTestVector({ $ref: '123' }).unserializable().undeserializable()
addTestVector({ $n: '0' }).unserializable().undeserializable()
addTestVector({ $invalid: 1 }).unserializable().undeserializable()
addTestVector({ undef: undefined }).serialized({ undef: { $undef: 1 } })

// Array
addTestVector([])
addTestVector([1, 'a', true])
addTestVector([[[]]])
const z = [[1], [2], [3]]
addTestVector(z)
const arr = [1]
arr.x = 2
addTestVector(arr)
addTestVector([undefined, null]).serialized([{ $undef: 1 }, null])
class CustomArray extends Array {}
addTestVector(CustomArray.from([])).unscannable().uncloneable().unserializable().undeserializable()
addTestVector([{ $invalid: 1 }]).unserializable().undeserializable()

// Sets
addTestVector(new Set()).serialized({ $set: [] })
addTestVector(new Set([1, 2, 3])).serialized({ $set: [1, 2, 3] })
addTestVector(new Set([new Set(['a', false, null]), {}, []]))
  .serialized({ $set: [{ $set: ['a', false, null] }, {}, []] })
const setWithProps = new Set([0])
Object.assign(setWithProps, { a: 'a', b: [], c: new Set() })
addTestVector(setWithProps).serialized({ $set: [0], props: { a: 'a', b: [], c: { $set: [] } } })
addTestVector({ $set: null }).unserializable().undeserializable()
addTestVector({ $set: {} }).unserializable().undeserializable()
addTestVector({ $set: [{ $invalid: 1 }] }).unserializable().undeserializable()
addTestVector({ $set: new Uint8Array() }).unserializable().undeserializable()

// Maps
addTestVector(new Map()).serialized({ $map: [] })
addTestVector(new Map([[1, 2]])).serialized({ $map: [[1, 2]] })
addTestVector(new Map([['a', true], ['b', false]])).serialized({ $map: [['a', true], ['b', false]] })
addTestVector(new Map([[0, new Map()]])).serialized({ $map: [[0, { $map: [] }]] })
const mapWithProps = new Map([[0, 1]])
Object.assign(mapWithProps, { x: new Set() })
addTestVector(mapWithProps).serialized({ $map: [[0, 1]], props: { x: { $set: [] } } })
addTestVector({ $map: null }).unserializable().undeserializable()
addTestVector({ $map: {} }).unserializable().undeserializable()
addTestVector({ $map: [{}] }).unserializable().undeserializable()
addTestVector({ $map: [[1, 2, 3]] }).unserializable().undeserializable()

// Uint8Array
addTestVector(new Uint8Array()).serialized({ $ui8a: '' })
addTestVector(new Uint8Array([0x00, 0x01])).serialized({ $ui8a: 'AAE=' })
const hellobuf = Buffer.from('hello', 'utf8')
addTestVector(new Uint8Array(hellobuf)).serialized({ $ui8a: hellobuf.toString('base64') })
const randombuf = bsv.crypto.Random.getRandomBuffer(1024)
addTestVector(new Uint8Array(randombuf)).serialized({ $ui8a: randombuf.toString('base64') })
const bufWithProps = new Uint8Array()
bufWithProps.x = 1
addTestVector(bufWithProps).serialized({ $ui8a: '' }).unscannable().uncloneable().unserializable()
addTestVector(Buffer.alloc(0)).unscannable().uncloneable().unserializable().undeserializable()
addTestVector({ $ui8a: [] }).unserializable().undeserializable()
addTestVector({ $ui8a: {} }).unserializable().undeserializable()
addTestVector({ $ui8a: '🐉' }).unserializable().undeserializable()
addTestVector({ $ui8a: new Uint8Array() }).unserializable().undeserializable()

// Duplicate references
const objDup = { n: null }
const dupObj = { a: objDup, b: objDup }
addTestVector(dupObj)
  .serialized({ $dedup: { a: { $dup: 0 }, b: { $dup: 0 } }, dups: [{ n: null }] })
  .checkDeserialized(x => expect(x.a).to.equal(x.b))
const arrDup = [undefined]
const dupArr = [arrDup, arrDup]
addTestVector(dupArr)
  .serialized({ $dedup: [{ $dup: 0 }, { $dup: 0 }], dups: [[{ $undef: 1 }]] })
  .checkDeserialized(x => expect(x[0]).to.equal(x[1]))
const bufDup = new Uint8Array()
const dupBuf = [bufDup, bufDup]
addTestVector(dupBuf)
  .serialized({ $dedup: [{ $dup: 0 }, { $dup: 0 }], dups: [{ $ui8a: '' }] })
  .checkDeserialized(x => expect(x[0]).to.equal(x[1]))
const setDup = new Set()
const dupSet = new Set([{ a: setDup }, { b: setDup }])
addTestVector(dupSet)
  .serialized({ $dedup: { $set: [{ a: { $dup: 0 } }, { b: { $dup: 0 } }] }, dups: [{ $set: [] }] })
  .checkDeserialized(x => {
    const keys = Array.from(x.keys())
    expect(keys[0].a).to.equal(keys[1].b)
    expect(keys[0].a).not.to.equal(undefined)
  })
const mapDup = new Map()
const dupMap = new Map([[0, mapDup], [1, mapDup]])
addTestVector(dupMap)
  .serialized({ $dedup: { $map: [[0, { $dup: 0 }], [1, { $dup: 0 }]] }, dups: [{ $map: [] }] })
  .checkDeserialized(x => expect(x.has(0)).to.equal(true))
  .checkDeserialized(x => expect(x.has(1)).to.equal(true))
  .checkDeserialized(x => expect(x.get(0)).to.equal(x.get(1)))

// Multiple dups in a tree
const multipleDups = { arr: [] }
multipleDups.a = []
multipleDups.arr.push(multipleDups.a)
multipleDups.b = new Uint8Array()
multipleDups.arr.push(multipleDups.b)
multipleDups.c = new Set()
multipleDups.arr.push(multipleDups.c)
addTestVector(multipleDups)
  .serialized({
    $dedup: { a: { $dup: 0 }, b: { $dup: 1 }, c: { $dup: 2 }, arr: [{ $dup: 0 }, { $dup: 1 }, { $dup: 2 }] },
    dups: [[], { $ui8a: '' }, { $set: [] }]
  })
  .checkDeserialized(x => expect(x.a).to.equal(x.arr[0]))
  .checkDeserialized(x => expect(x.b).to.equal(x.arr[1]))
  .checkDeserialized(x => expect(x.c).to.equal(x.arr[2]))

// Circular references
const circObj = {}
circObj.c = circObj
addTestVector(circObj)
  .serialized({
    $dedup: { $dup: 0 },
    dups: [{ c: { $dup: 0 } }]
  })
  .checkDeserialized(x => expect(x.c).to.equal(x))
const circArr = []
circArr.push(circArr)
addTestVector(circArr)
  .serialized({
    $dedup: { $dup: 0 },
    dups: [[{ $dup: 0 }]]
  })
  .checkDeserialized(x => expect(x[0]).to.equal(x))
const circSet = new Set()
circSet.add(circSet)
circSet.c = circSet
addTestVector(circSet)
  .serialized({
    $dedup: { $dup: 0 },
    dups: [{ $set: [{ $dup: 0 }], props: { c: { $dup: 0 } } }]
  })
  .checkDeserialized(x => expect(x.c).to.equal(x.keys().next().value))
const circMap = new Map()
circMap.set(circMap, 1)
circMap.set(1, circMap)
circMap.m = circMap
addTestVector(circMap)
  .serialized({
    $dedup: { $dup: 0 },
    dups: [{
      $map: [[{ $dup: 0 }, 1], [1, { $dup: 0 }]],
      props: { m: { $dup: 0 } }
    }]
  })
  .checkDeserialized(x => expect(x.m).to.equal(x.get(1)))
  .checkDeserialized(x => expect(x.get(x.m)).to.equal(1))

// Complex circular dups
const complexMap = new Map()
const complexObj = {}
const complexArr = []
complexArr.push(complexMap)
complexArr.push(complexObj)
complexMap.set('a', complexObj)
complexObj.b = complexArr
addTestVector(complexArr)
  .serialized({
    $dedup: { $dup: 0 },
    dups: [[{ $map: [['a', { $dup: 1 }]] }, { $dup: 1 }], { b: { $dup: 0 } }]
  })
  .checkDeserialized(x => expect(x).to.equal(x[0].get('a').b))
  .checkDeserialized(x => expect(x[0]).to.equal(x[0].get('a').b[0]))
  .checkDeserialized(x => expect(x[0].get('a')).to.equal(x[0].get('a').b[0].get('a')))

// Bad dedup serialization
addTestVector({ $dedup: {} }).unserializable().undeserializable()
addTestVector({ $dedup: {}, dups: {} }).unserializable().undeserializable()
addTestVector({ $dedup: { $dup: 0 }, dups: [] }).unserializable().undeserializable()
addTestVector({ $dedup: { $dup: 0 }, dups: [{ $dup: 1 }] }).unserializable().undeserializable()

// Unsupported TypedArrays
addTestVector(new Int8Array()).serialized({ $i8a: '' }).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(new Uint8ClampedArray()).serialized({ $ui8ca: '' }).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(new Int16Array()).serialized({ $i16a: '' }).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(new Uint16Array()).serialized({ $u16a: '' }).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(new Int32Array()).serialized({ $i32a: '' }).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(new Uint32Array()).serialized({ $ui32a: '' }).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(new Float32Array()).serialized({ $f32a: '' }).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(new Float64Array()).serialized({ $f64a: '' }).unscannable().uncloneable().unserializable().undeserializable()
if (typeof BigInt64Array !== 'undefined') {
  // eslint-disable-next-line
  addTestVector(new BigInt64Array()).serialized({ $bi64a: '' }).unscannable().uncloneable().unserializable().undeserializable()
}
if (typeof BigUint64Array !== 'undefined') {
  // eslint-disable-next-line
  addTestVector(new BigUint64Array()).serialized({ $bui64a: '' }).unscannable().uncloneable().unserializable().undeserializable()
}

// Symbols
addTestVector(Symbol.hasInstance).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Symbol.iterator).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Symbol.species).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Symbol.unscopables).unscannable().uncloneable().unserializable().undeserializable()

// Intrinsic objects
addTestVector(console).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Object).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Function).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Error).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Math).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Buffer).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(String).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Date).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(JSON).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Promise).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(Proxy).unscannable().uncloneable().unserializable().undeserializable()
if (typeof WebAssembly !== 'undefined') {
  // eslint-disable-next-line
  addTestVector(WebAssembly).unscannable().uncloneable().unserializable().undeserializable()
}

// Unsupported objects
addTestVector(new Date()).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(new WeakSet()).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(new WeakMap()).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(new RegExp()).unscannable().uncloneable().unserializable().undeserializable()
addTestVector(/^abc/).unscannable().uncloneable().unserializable().undeserializable()

// TODO: Circular arb object

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
*/

// Tokens

// Non-standard intrinsics

// TODO: if (key.startsWith('$')) throw new Error('$ properties must not be defined')
// -On Set properties
// Port existing classes over

// ------------------------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------------------------

describe('Xray', () => {
  describe('constructor', () => {
    it('should use default intrinsics', () => {
      expect(new Xray().intrinsics).to.equal(Xray.Intrinsics.defaultIntrinsics)
    })
  })

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

  describe('deserializable', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testDeserializable())
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

  describe('deserialize', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testDeserialize())
    })
  })
})

// ------------------------------------------------------------------------------------------------
