const { Run } = require('../config')
const { Intrinsics } = Run

const run = new Run()

// ------------------------------------------------------------------------------------------------
// Test vectors
// ------------------------------------------------------------------------------------------------

function addTestVectors (intrinsics, testIntrinsics) {
  const addTestVector = () => {}

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
