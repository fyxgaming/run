/**
 * json.js
 *
 * Tests for lib/util/json.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../config')
const { TokenJSON, _display } = Run._util
const DeterministicRealm = require('@runonbitcoin/sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const _hostIntrinsics = { Object, Array, Set, Map }

const realm = new DeterministicRealm()
const compartment = realm.makeCompartment()

const _sandboxIntrinsics = {
  Object: compartment.evaluate('Object'),
  Array: compartment.evaluate('Array'),
  Set: compartment.evaluate('Object'),
  Map: compartment.evaluate('Array')
}

const options = { _hostIntrinsics, _sandboxIntrinsics }

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function testSuccess (x, y) {
  const serialized = TokenJSON._serialize(x)
  const jsonString = JSON.stringify(serialized)
  const json = JSON.parse(jsonString)
  expect(json).to.deep.equal(y)
  expect(TokenJSON._deserialize(json)).to.deep.equal(x)
}

function testFail (x) {
  expect(() => TokenJSON._serialize(x)).to.throw(`Cannot serialize ${_display(x)}`)
}

// ------------------------------------------------------------------------------------------------
// TokenJSON
// ------------------------------------------------------------------------------------------------

describe.only('TokenJSON', () => {
  describe('_serialize', () => {
    it('should supported non-symbol primitives', () => {
      // Booleans
      testSuccess(true, true)
      testSuccess(false, false)
      // Numbers
      testSuccess(0, 0)
      testSuccess(1, 1)
      testSuccess(-1, -1)
      testSuccess(1.5, 1.5)
      testSuccess(-0.1234567890987654321, -0.1234567890987654321)
      testSuccess(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
      testSuccess(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER)
      testSuccess(Number.MAX_VALUE, Number.MAX_VALUE)
      testSuccess(Number.MIN_VALUE, Number.MIN_VALUE)
      testSuccess(-0, { $n0: 1 })
      testSuccess(Infinity, { $inf: 1 })
      testSuccess(-Infinity, { $ninf: 1 })
      testSuccess(NaN, { $nan: 1 })
      // Strings
      testSuccess('', '')
      testSuccess('abc', 'abc')
      testSuccess('🐉', '🐉')
      let longString = ''
      for (let i = 0; i < 10000; i++) longString += 'abcdefghijklmnopqrstuvwxyz'
      testSuccess(longString, longString)
      // Undefined
      testSuccess(undefined, { $undef: 1 })
      // Null
      testSuccess(null, null)
    })

    it('should support basic objects', () => {
      testSuccess({}, {})
      testSuccess({ n: 1 }, { n: 1 })
      testSuccess({ a: 'a', b: true, c: {}, d: null }, { a: 'a', b: true, c: {}, d: null })
      testSuccess({ a: { a: { a: {} } } }, { a: { a: { a: {} } } })
      testSuccess({ a: {}, b: {}, c: {} }, { a: {}, b: {}, c: {} })
    })

    it('should support objects with $ properties', () => {
      testSuccess({ $n: 1 }, { $obj: { $n: 1 } })
      testSuccess({ $obj: {} }, { $obj: { $obj: {} } })
      testSuccess({ a: { $a: { a: {} } } }, { a: { $obj: { $a: { a: {} } } } })
    })

    it('should support basic arrays', () => {
      testSuccess([], [])
      testSuccess([1, 'a', false, {}], [1, 'a', false, {}])
      testSuccess([[[]]], [[[]]])
      testSuccess([[1], [2], [3]], [[1], [2], [3]])
      testSuccess([0, undefined, 2], [0, { $undef: 1 }, 2])
    })

    it('should support arrays with properties', () => {
      const a1 = [1]
      a1.x = 'a'
      a1[''] = true
      a1.$obj = {}
      testSuccess(a1, { $arr: { 0: 1, x: 'a', '': true, $obj: {} } })
    })

    it('should support sparse arrays', () => {
      const a2 = []
      a2[0] = 0
      a2[9] = 9
      testSuccess(a2, { $arr: { 0: 0, 9: 9 } })
    })

    it('should support complex objects', () => {
      // Dollar signs, mixture of arrays and objects

    })

    it('should support duplicate objects', () => {
      // Multiple
    })

    it('should support circular references', () => {
      // Multiple
    })

    it('should fail to serialize symbols', () => {
      testFail(Symbol.hasInstance)
      testFail(Symbol.iterator)
      testFail(Symbol.species)
      testFail(Symbol.unscopables)
    })

    it('test intrinsics', () => {
      // For everything that creates objects or arrays
    })

    // Extensions of Object and Array, Map and Set

    // Set, Map

    it.skip('rest', () => {
      console.log(JSON.stringify(TokenJSON._serialize({ n: 1 })))
      console.log(JSON.stringify(TokenJSON._serialize({ $hello: 'world' })))
      console.log(JSON.stringify(TokenJSON._serialize(new Set([1, 'a', 2, {}]))))
      console.log(JSON.stringify(TokenJSON._serialize(new Map([[1, 2], [{}, 'o']]))))
      const s = new Set()
      s.x = 1
      console.log(JSON.stringify(TokenJSON._serialize(s)))
      const o = Object.create(Object.prototype)
      o.n = 1
      o.m = o
      const p = Array.from([o, o])
      console.log(JSON.stringify(TokenJSON._serialize(p)))

      // Custom object
      // class Dragon { }
      // const dragon = new Dragon()
      // dragon.name = 'Empress'
      // dragon.self = dragon

      // const deployables = []

      // const _replacer = _firstResult(
      // _replaceDeployables(deployables),
      // _replaceCustomObjects(deployables))

      // console.log(JSON.stringify(TokenJSON._serialize(dragon, { _replacer })))
      // console.log(deployables)

      // Tests
      // Multiple dups
      // Dups in custom objects
    })
  })

  describe('_deserialize', () => {
    it.skip('test', () => {
      console.log(JSON.stringify(TokenJSON._deserialize(TokenJSON._serialize({ n: 1 }))))

      const x = { $hello: 'world' }
      const y = TokenJSON._serialize(x, { options, _outputIntrinsics: _sandboxIntrinsics })
      console.log(y)
      console.log(y.constructor === _hostIntrinsics.Object)
      console.log(y.constructor === _sandboxIntrinsics.Object)
      const z = TokenJSON._deserialize(y, options)
      console.log(z)

      console.log(TokenJSON._deserialize(TokenJSON._serialize(new Set([1, 'a', 2, {}]))))
      console.log(TokenJSON._deserialize(TokenJSON._serialize(new Map([[1, 2], [{}, 'o']]))))

      const s = new Set()
      s.x = 1
      console.log(TokenJSON._deserialize(TokenJSON._serialize(s)).x)

      const o = Object.create(Object.prototype)
      o.n = 1
      o.m = o
      const p = Array.from([o, o])
      const q = TokenJSON._deserialize(TokenJSON._serialize(p))
      console.log(q[0] === q[1])
      // console.log(q)

      class Dragon {}
      const dragon = new Dragon()
      const opts = {
        _replacer: x => x instanceof Dragon && { $dragon: x },
        _reviver: x => x.$dragon
      }
      console.log(TokenJSON._deserialize(TokenJSON._serialize(dragon, opts), opts))
    })
  })
})

// ------------------------------------------------------------------------------------------------
