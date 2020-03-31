const bsv = require('bsv')
const { expect } = require('chai')
const { Run } = require('../config')
const { Intrinsics } = Run

const run = new Run()

// ------------------------------------------------------------------------------------------------
// Test vectors
// ------------------------------------------------------------------------------------------------

function addTestVectors (intrinsics, testIntrinsics) {
  const {
    Uint8Array, Int8Array,
    Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array,
    Float32Array, Float64Array
  } = testIntrinsics

  const addTestVector = () => {}

  // Uint8Array
  addTestVector(new Uint8Array()).serialized({ $ui8a: '' })
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Uint8Array))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Uint8Array))
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

  // Unknown intrinsics
  const sandboxIntrinsics = run.code.intrinsics.allowed[1]
  addTestVector(new sandboxIntrinsics.Uint8Array()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new sandboxIntrinsics.Set()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new sandboxIntrinsics.Map()).unscannable().uncloneable().unserializable().undeserializable()

  // Deployable
  // finish implementing serializable, etc.
  // register test as needing deployable, and which deployables they are
  // check deployables after scan, etc.
  // test xray with and without support

  // allow deployables in other tests, even when don't support it

  // TODO: Wrap errors for tests to print what test it is

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

  // TODO: if (key.startsWith('$')) throw new Error('$ properties must not be defined')
  // -On Set properties
  // Port existing classes over
}

const evaluator = run.code.evaluator

const globalIntrinsics = new Intrinsics()
addTestVectors(globalIntrinsics, globalIntrinsics.allowed[0])

const sesIntrinsics = new Intrinsics()
sesIntrinsics.set(evaluator.intrinsics.default)
addTestVectors(sesIntrinsics, sesIntrinsics.allowed[0])

// const allIntrinsics = new Intrinsics()
// allIntrinsics.use(evaluator.intrinsics.default)
// addTestVectors(allIntrinsics, allIntrinsics.allowed[0])
// addTestVectors(allIntrinsics, allIntrinsics.allowed[1])

// ------------------------------------------------------------------------------------------------
