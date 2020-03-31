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

function serializePass (x, y) {
  const serialized = TokenJSON._serialize(x)
  const jsonString = JSON.stringify(serialized)
  const json = JSON.parse(jsonString)
  expect(json).to.deep.equal(y)
  expect(TokenJSON._deserialize(json)).to.deep.equal(x)
}

function serializeFail (x) {
  expect(() => TokenJSON._serialize(x)).to.throw(`Cannot serialize ${_display(x)}`)
}

function deserializeFail (y) {
  expect(() => TokenJSON._deserialize(y)).to.throw(`Cannot deserialize ${_display(y)}`)
}

// ------------------------------------------------------------------------------------------------
// TokenJSON
// ------------------------------------------------------------------------------------------------

describe.only('TokenJSON', () => {
  describe('_serialize', () => {
    it('should supported non-symbol primitives', () => {
      // Booleans
      serializePass(true, true)
      serializePass(false, false)
      // Numbers
      serializePass(0, 0)
      serializePass(1, 1)
      serializePass(-1, -1)
      serializePass(1.5, 1.5)
      serializePass(-0.1234567890987654321, -0.1234567890987654321)
      serializePass(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
      serializePass(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER)
      serializePass(Number.MAX_VALUE, Number.MAX_VALUE)
      serializePass(Number.MIN_VALUE, Number.MIN_VALUE)
      serializePass(-0, { $n0: 1 })
      serializePass(Infinity, { $inf: 1 })
      serializePass(-Infinity, { $ninf: 1 })
      serializePass(NaN, { $nan: 1 })
      // Strings
      serializePass('', '')
      serializePass('abc', 'abc')
      serializePass('🐉', '🐉')
      let longString = ''
      for (let i = 0; i < 10000; i++) longString += 'abcdefghijklmnopqrstuvwxyz'
      serializePass(longString, longString)
      // Undefined
      serializePass(undefined, { $undef: 1 })
      // Null
      serializePass(null, null)
    })

    it('should fail to serialize symbols', () => {
      serializeFail(Symbol.hasInstance)
      serializeFail(Symbol.iterator)
      serializeFail(Symbol.species)
      serializeFail(Symbol.unscopables)
    })

    it('should support basic objects', () => {
      serializePass({}, {})
      serializePass({ n: 1 }, { n: 1 })
      serializePass({ a: 'a', b: true, c: {}, d: null }, { a: 'a', b: true, c: {}, d: null })
      serializePass({ a: { a: { a: {} } } }, { a: { a: { a: {} } } })
      serializePass({ a: {}, b: {}, c: {} }, { a: {}, b: {}, c: {} })
      serializePass(new Proxy({}, {}), {})
    })

    it('should support objects with $ properties', () => {
      serializePass({ $n: 1 }, { $obj: { $n: 1 } })
      serializePass({ $obj: {} }, { $obj: { $obj: {} } })
      serializePass({ a: { $a: { a: {} } } }, { a: { $obj: { $a: { a: {} } } } })
      serializePass({ $undef: 1 }, { $obj: { $undef: 1 } })
    })

    it('should support basic arrays', () => {
      serializePass([], [])
      serializePass([1, 'a', false, {}], [1, 'a', false, {}])
      serializePass([[[]]], [[[]]])
      serializePass([[1], [2], [3]], [[1], [2], [3]])
      serializePass([0, undefined, 2], [0, { $undef: 1 }, 2])
    })

    it('should support sparse arrays', () => {
      const a = []
      a[0] = 0
      a[9] = 9
      serializePass(a, { $arr: { 0: 0, 9: 9 } })
    })

    it('should support arrays with non-numeric properties', () => {
      const a = [1]
      a[9] = 9
      a[-1] = -1
      a.x = 'a'
      a[''] = true
      a.$obj = {}
      serializePass(a, { $arr: { 0: 1, 9: 9, '-1': -1, x: 'a', '': true, $obj: {} } })
    })

    it('should support complex objects', () => {
      const o = {}
      o.o = { a: [] }
      o.a = [{ n: 1 }]
      o.u = undefined
      serializePass(o, { a: [{ n: 1 }], o: { a: [] }, u: { $undef: 1 } })
    })

    it('should support duplicate objects', () => {
      const o = {}
      const p = [1]
      const d0 = { $dup: 0 }
      const d1 = { $dup: 1 }
      serializePass([o, o], { $dedup: [d0, d0], dups: [{}] })
      serializePass({ a: o, b: o }, { $dedup: { a: d0, b: d0 }, dups: [{}] })
      serializePass([o, { o }], { $dedup: [d0, { o: d0 }], dups: [{}] })
      serializePass([o, p, o, p], { $dedup: [d0, d1, d0, d1], dups: [{}, [1]] })
      serializePass([o, o, p, [o, p], { z: p }], { $dedup: [d0, d0, d1, [d0, d1], { z: d1 }], dups: [{}, [1]] })
    })

    it('should support circular references', () => {
      const o = {}
      o.o = o
      serializePass(o, { $dedup: { $dup: 0 }, dups: [{ o: { $dup: 0 } }] })
      const a = [{}, []]
      a[0].x = a[1]
      a[1].push(a[0])
      a.a = a
      serializePass(a, { $dedup: { $dup: 2 }, dups: [{ x: { $dup: 1 } }, [{ $dup: 0 }], { $arr: { 0: { $dup: 0 }, 1: { $dup: 1 }, a: { $dup: 2 } } }] })
    })

    it('should support sets', () => {
      // Basic keys and values
      serializePass(new Set(), { $set: [] })
      serializePass(new Set([0, false, null]), { $set: [0, false, null] })
      // Object keys and values
      serializePass(new Set([new Set()]), { $set: [{ $set: [] }] })
      const s = new Set()
      serializePass(new Set([s, s]), { $set: [{ $set: [] }] })
      // Circular entries
      const s2 = new Set()
      s2.add(s2)
      serializePass(s2, { $dedup: { $dup: 0 }, dups: [{ $set: [{ $dup: 0 }] }] })
      // Props
      const s3 = new Set([1])
      s3.x = null
      serializePass(s3, { $set: [1], props: { x: null } })
      // Circular props
      const s4 = new Set([])
      s4.add(s4)
      s4.s = s4
      serializePass(s4, { $dedup: { $dup: 0 }, dups: [{ $set: [{ $dup: 0 }], props: { s: { $dup: 0 } } }] })
    })

    it('should support maps', () => {
      // Basic keys and values
      serializePass(new Map(), { $map: [] })
      serializePass(new Map([['a', 'b']]), { $map: [['a', 'b']] })
      serializePass(new Map([[1, 2], [null, {}]]), { $map: [[1, 2], [null, {}]] })
      // Object keys and values
      serializePass(new Map([[{}, []], [new Set(), new Map()]]), { $map: [[{}, []], [{ $set: [] }, { $map: [] }]] })
      // Duplicate keys and values
      const m = new Map()
      serializePass(new Map([[m, m]]), { $dedup: { $map: [[{ $dup: 0 }, { $dup: 0 }]] }, dups: [{ $map: [] }] })
      // Circular keys
      const m2 = new Map()
      m2.set(m2, 1)
      serializePass(m2, { $dedup: { $dup: 0 }, dups: [{ $map: [[{ $dup: 0 }, 1]] }] })
      // Circular values
      const m3 = new Map()
      const a = [m3]
      m3.set(1, a)
      serializePass(a, { $dedup: { $dup: 0 }, dups: [[{ $map: [[1, { $dup: 0 }]] }]] })
      // Props
      const m4 = new Map([[1, 2]])
      m4.x = 'abc'
      m4[''] = 'def'
      serializePass(m4, { $map: [[1, 2]], props: { x: 'abc', '': 'def' } })
      // Circular props
      const m5 = new Map()
      m5.x = m5
      m5.set(m5.x, 1)
      serializePass(m5, { $dedup: { $dup: 0 }, dups: [{ $map: [[{ $dup: 0 }, 1]], props: { x: { $dup: 0 } } }] })
    })

    it('should fail for extensions to built-in types', () => {
      serializeFail(new (class CustomArray extends Array {})())
      serializeFail(new (class CustomObject extends Object {})())
      serializeFail(new (class CustomSet extends Set {})())
      serializeFail(new (class CustomMap extends Map {})())
    })

    it('should maintain key order', () => {
      const o = {}
      o.x = 'x'
      o[3] = 3
      o[2] = 2
      o.n = 3
      const serialized = TokenJSON._serialize(o)
      const json = JSON.parse(JSON.stringify(serialized))
      const o2 = TokenJSON._deserialize(json)
      expect(Object.keys(o)).to.deep.equal(Object.keys(o2))
    })

    it('should create output intrinsics', () => {
      const opts = { _outputIntrinsics: _sandboxIntrinsics }
      expect(TokenJSON._serialize({}, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize({ $: 1 }, opts).$obj.constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(undefined, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(-0, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(NaN, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(Infinity, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(-Infinity, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize([], opts).constructor).to.equal(_sandboxIntrinsics.Array)
      const a = []
      a.x = 1
      expect(TokenJSON._serialize(a, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(a, opts).$arr.constructor).to.equal(_sandboxIntrinsics.Object)
      const s = new Set()
      s.x = 1
      expect(TokenJSON._serialize(s, opts).$set.constructor).to.equal(_sandboxIntrinsics.Array)
      expect(TokenJSON._serialize(s, opts).props.constructor).to.equal(_sandboxIntrinsics.Object)
      const m = new Map()
      m.x = 1
      expect(TokenJSON._serialize(m, opts).$map.constructor).to.equal(_sandboxIntrinsics.Array)
      expect(TokenJSON._serialize(m, opts).props.constructor).to.equal(_sandboxIntrinsics.Object)
      const o = { }
      expect(TokenJSON._serialize([o, o], opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize([o, o], opts).$dedup.constructor).to.equal(_sandboxIntrinsics.Array)
      expect(TokenJSON._serialize([o, o], opts).dups.constructor).to.equal(_sandboxIntrinsics.Array)
      expect(TokenJSON._serialize([o, o], opts).dups[0].constructor).to.equal(_sandboxIntrinsics.Object)
    })

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
    it('should fail to deserialize unsupported types', () => {
      // Undefined
      deserializeFail(undefined)
      // Numbers
      deserializeFail(-0)
      deserializeFail(NaN)
      deserializeFail(Infinity)
      deserializeFail(-Infinity)
      // Symbols
      deserializeFail(Symbol.iterator)
      deserializeFail(Symbol.hasInstance)
      // Functions
      deserializeFail(class A {})
      deserializeFail(function f () { })
      // Objects
      deserializeFail({ $: 1 })
      deserializeFail({ $err: 1 })
      deserializeFail({ $undef: 1, $nan: 1 })
      // Array
      deserializeFail({ $arr: 1 })
      deserializeFail({ $arr: [] })
      // Set
      deserializeFail({ $set: null })
      deserializeFail({ $set: {} })
      deserializeFail({ $set: [], props: 0 })
      deserializeFail({ $set: [], props: [] })
      // Map
    })

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
