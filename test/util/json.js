/**
 * json.js
 *
 * Tests for lib/util/json.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const bsv = require('bsv')
const { Run } = require('../config')
const { Jig, Berry } = Run
const { TokenJSON } = Run._util
const DeterministicRealm = require('@runonbitcoin/sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const run = new Run()
const realm = new DeterministicRealm()
const compartment = realm.makeCompartment()
const _sandboxIntrinsics = {
  Object: compartment.evaluate('Object'),
  Array: compartment.evaluate('Array'),
  Set: compartment.evaluate('Set'),
  Map: compartment.evaluate('Map'),
  Uint8Array: compartment.evaluate('Uint8Array')
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function serializePass (x, y, opts) {
  const serialized = TokenJSON._serialize(x, opts)
  const jsonString = JSON.stringify(serialized)
  const json = JSON.parse(jsonString)
  expect(json).to.deep.equal(y)
  expect(TokenJSON._deserialize(json, opts)).to.deep.equal(x)
}

const serializeFail = (...args) => expect(() => TokenJSON._serialize(...args)).to.throw('Cannot serialize')
const deserializeFail = (...args) => expect(() => TokenJSON._deserialize(...args)).to.throw('Cannot deserialize')

// ------------------------------------------------------------------------------------------------
// TokenJSON
// ------------------------------------------------------------------------------------------------

describe('TokenJSON', () => {
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
      o.b = new Uint8Array()
      serializePass(o, { a: [{ n: 1 }], o: { a: [] }, u: { $undef: 1 }, b: { $ui8a: '' } })
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

    it('should support buffers', () => {
      serializePass(new Uint8Array(), { $ui8a: '' })
      serializePass(new Uint8Array([0, 1]), { $ui8a: 'AAE=' })
      const hello = Buffer.from('hello', 'utf8')
      serializePass(new Uint8Array(hello), { $ui8a: hello.toString('base64') })
      const random = bsv.crypto.Random.getRandomBuffer(1024)
      serializePass(new Uint8Array(random), { $ui8a: random.toString('base64') })
    })

    it('should fail for buffers with props', () => {
      const b = new Uint8Array()
      b.x = 1
      serializeFail(b)
    })

    it('should fail for extensions to built-in types', () => {
      serializeFail(new (class CustomArray extends Array {})())
      serializeFail(new (class CustomObject extends Object {})())
      serializeFail(new (class CustomSet extends Set {})())
      serializeFail(new (class CustomMap extends Map {})())
      serializeFail(new (class CustomUint8Array extends Uint8Array {})())
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

    it('should use output intrinsics', () => {
      const opts = { _outputIntrinsics: _sandboxIntrinsics }
      // Primitives
      expect(TokenJSON._serialize({}, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize({ $: 1 }, opts).$obj.constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(undefined, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(-0, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(NaN, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(Infinity, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(-Infinity, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      // Array
      expect(TokenJSON._serialize([], opts).constructor).to.equal(_sandboxIntrinsics.Array)
      const a = []
      a.x = 1
      expect(TokenJSON._serialize(a, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(a, opts).$arr.constructor).to.equal(_sandboxIntrinsics.Object)
      // Set
      const s = new Set()
      s.x = 1
      expect(TokenJSON._serialize(s, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(s, opts).$set.constructor).to.equal(_sandboxIntrinsics.Array)
      expect(TokenJSON._serialize(s, opts).props.constructor).to.equal(_sandboxIntrinsics.Object)
      // Map
      const m = new Map()
      m.x = 1
      expect(TokenJSON._serialize(m, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize(m, opts).$map.constructor).to.equal(_sandboxIntrinsics.Array)
      expect(TokenJSON._serialize(m, opts).props.constructor).to.equal(_sandboxIntrinsics.Object)
      // Uint8Array
      const b = new Uint8Array()
      expect(TokenJSON._serialize(b, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      // Dedup
      const o = { }
      expect(TokenJSON._serialize([o, o], opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._serialize([o, o], opts).$dedup.constructor).to.equal(_sandboxIntrinsics.Array)
      expect(TokenJSON._serialize([o, o], opts).dups.constructor).to.equal(_sandboxIntrinsics.Array)
      expect(TokenJSON._serialize([o, o], opts).dups[0].constructor).to.equal(_sandboxIntrinsics.Object)
    })

    it('should default to host intrinsics', () => {
      const opts = { _sandboxIntrinsics }
      expect(TokenJSON._serialize({}, opts).constructor).to.equal(Object)
      expect(TokenJSON._serialize([], opts).constructor).to.equal(Array)
    })

    it('should fail for raw intrinsics', () => {
      serializeFail(console)
      serializeFail(Object)
      serializeFail(Function)
      serializeFail(Error)
      serializeFail(Math)
      serializeFail(Buffer)
      serializeFail(Date)
      serializeFail(JSON)
      serializeFail(Promise)
      serializeFail(Proxy)
      serializeFail(Int8Array)
      serializeFail(Int16Array)
      serializeFail(Int32Array)
      serializeFail(Uint8Array)
      serializeFail(Uint16Array)
      serializeFail(Uint32Array)
      serializeFail(Uint8ClampedArray)
      serializeFail(Float32Array)
      serializeFail(Float64Array)
      if (typeof BigInt64Array !== 'undefined') serializeFail(BigInt64Array) // eslint-disable-line
      if (typeof BigUint64Array !== 'undefined') serializeFail(BigUint64Array) // eslint-disable-line
      if (typeof BigInt !== 'undefined') serializeFail(BigInt) // eslint-disable-line
      if (typeof WebAssembly !== 'undefined') serializeFail(WebAssembly) // eslint-disable-line
      serializeFail(_sandboxIntrinsics.Object, { _sandboxIntrinsics })
      serializeFail(_sandboxIntrinsics.Array, { _sandboxIntrinsics })
      serializeFail(_sandboxIntrinsics.Set, { _sandboxIntrinsics })
      serializeFail(_sandboxIntrinsics.Map, { _sandboxIntrinsics })
      serializeFail(_sandboxIntrinsics.Uint8Array, { _sandboxIntrinsics })
    })

    it('should fail for unsupported objects intrinsics', () => {
      serializeFail(new Date())
      serializeFail(new WeakSet())
      serializeFail(new WeakMap())
      serializeFail(new RegExp())
      serializeFail(/^abc/)
      serializeFail(new Error())
      serializeFail(Buffer.alloc(0))
    })

    it('should fail for unrecognized intrinsics', () => {
      // Use sandbox intrinsics, but don't set them
      serializeFail(new _sandboxIntrinsics.Set())
      serializeFail(new _sandboxIntrinsics.Map())
      serializeFail(new _sandboxIntrinsics.Uint8Array())
      // Use host intrinsics, but set them to sandbox
      const opts = { _hostIntrinsics: _sandboxIntrinsics }
      serializeFail(new Set(), opts)
      serializeFail(new Map(), opts)
      serializeFail(new Uint8Array(), opts)
    })

    it('should support custom replacer', () => {
      class A {}
      expect(() => TokenJSON._serialize(new A())).to.throw('Cannot serialize')
      expect(TokenJSON._serialize(new A(), {
        _replacer: x => { if (x instanceof A) return { $a: 1 } }
      })).to.deep.equal({ $a: 1 })
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
      deserializeFail([{ $undef: undefined }])
      deserializeFail({ $arr: 1 })
      deserializeFail({ $arr: [] })
      // Set
      deserializeFail({ $set: null })
      deserializeFail({ $set: {} })
      deserializeFail({ $set: new Set() })
      deserializeFail({ $set: [{ $err: 1 }] })
      deserializeFail({ $set: new Uint8Array() })
      deserializeFail({ $set: [], props: 0 })
      deserializeFail({ $set: [], props: [] })
      // Map
      deserializeFail({ $map: null })
      deserializeFail({ $map: {} })
      deserializeFail({ $map: new Map() })
      deserializeFail({ $map: [{}] })
      deserializeFail({ $map: [[]] })
      deserializeFail({ $map: [[1]] })
      deserializeFail({ $map: [[1, 2, 3]] })
      deserializeFail({ $map: [], props: 0 })
      deserializeFail({ $map: [], props: [] })
      // Uint8Array
      deserializeFail({ $ui8a: null })
      deserializeFail({ $ui8a: [] })
      deserializeFail({ $ui8a: {} })
      deserializeFail({ $ui8a: '*' })
      deserializeFail({ $ui8a: new Uint8Array() })
      // Dedup
      deserializeFail({ $dedup: {} })
      deserializeFail({ $dedup: {}, dups: {} })
      deserializeFail({ $dedup: { $dup: 0 }, dups: [] })
      deserializeFail({ $dedup: { $dup: 1 }, dups: [{}] })
      deserializeFail({ $dedup: { $dup: 0 }, dups: [{ $dup: 1 }] })
      deserializeFail({ $dedup: { $dedup: { }, dups: [] }, dups: [] })
    })

    it('should default to sandbox intrinsics', () => {
      const opts = { _sandboxIntrinsics }
      expect(TokenJSON._deserialize({}, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._deserialize([], opts).constructor).to.equal(_sandboxIntrinsics.Array)
    })

    it('should use output intrinsics', () => {
      const opts = { _outputIntrinsics: _sandboxIntrinsics }
      expect(TokenJSON._deserialize({}, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._deserialize({ $obj: {} }, opts).constructor).to.equal(_sandboxIntrinsics.Object)
      expect(TokenJSON._deserialize([], opts).constructor).to.equal(_sandboxIntrinsics.Array)
      expect(TokenJSON._deserialize({ $arr: {} }, opts).constructor).to.equal(_sandboxIntrinsics.Array)
      expect(TokenJSON._deserialize({ $set: [] }, opts).constructor).to.equal(_sandboxIntrinsics.Set)
      expect(TokenJSON._deserialize({ $map: [] }, opts).constructor).to.equal(_sandboxIntrinsics.Map)
      expect(TokenJSON._deserialize({ $ui8a: '' }, opts).constructor).to.equal(_sandboxIntrinsics.Uint8Array)
    })

    it('should support custom reviver', () => {
      class A {}
      const a = new A()
      expect(() => TokenJSON._deserialize({ $a: 1 })).to.throw('Cannot deserialize')
      expect(TokenJSON._deserialize({ $a: 1 }, {
        _reviver: x => { if (x.$a === 1) return a }
      })).to.equal(a)
    })
  })

  describe('tokens', () => {
    it('should replace jigs with location ref', () => {
      class Dragon extends Jig { }
      const dragon = new Dragon()
      const opts = {
        _outputIntrinsics: _sandboxIntrinsics,
        _replacer: TokenJSON._replace._tokens(token => '123')
      }
      const json = TokenJSON._serialize(dragon, opts)
      expect(json).to.deep.equal({ $ref: '123' })
      expect(json.constructor).to.equal(_sandboxIntrinsics.Object)
    })

    it('should revive jigs from location ref', () => {
      class Dragon extends Jig { }
      const dragon = new Dragon()
      const opts = {
        _sandboxIntrinsics,
        _reviver: TokenJSON._revive._tokens(ref => dragon)
      }
      expect(TokenJSON._deserialize({ $ref: '123' }, opts)).to.equal(dragon)
    })

    it('should replace and revive jigs in complex structures', () => {
      class Dragon extends Jig { }
      const dragon = new Dragon()
      const opts = {
        _outputIntrinsics: _sandboxIntrinsics,
        _replacer: TokenJSON._replace._tokens(token => '123'),
        _reviver: TokenJSON._revive._tokens(ref => dragon)
      }
      const x = [dragon, { dragon }, new Set([dragon])]
      const json = TokenJSON._serialize(x, opts)
      const parsed = JSON.parse(JSON.stringify(json))
      const output = TokenJSON._deserialize(parsed, opts)
      expect(output).to.deep.equal(x)
    })

    it('should fail to deserialize bad ref', () => {
      const opts = { _reviver: TokenJSON._revive._tokens(ref => {}) }
      deserializeFail({ $ref: 1, $ref2: 2 }, opts)
      deserializeFail({ $ref: '123' })
    })

    it('should replace deployables with location ref', () => {
      const opts = { _replacer: TokenJSON._replace._tokens(x => '123') }
      expect(TokenJSON._serialize(class {}, opts)).to.deep.equal({ $ref: '123' })
      expect(TokenJSON._serialize(class A {}, opts)).to.deep.equal({ $ref: '123' })
      expect(TokenJSON._serialize(class { method () { return null } }, opts)).to.deep.equal({ $ref: '123' })
      expect(TokenJSON._serialize(class B { constructor () { this.x = 1 } }, opts)).to.deep.equal({ $ref: '123' })
      expect(TokenJSON._serialize(function f () {}, opts)).to.deep.equal({ $ref: '123' })
      expect(TokenJSON._serialize(function add (a, b) { return a + b }, opts)).to.deep.equal({ $ref: '123' })
      expect(TokenJSON._serialize(function () {}, opts)).to.deep.equal({ $ref: '123' })
      expect(TokenJSON._serialize(() => {}, opts)).to.deep.equal({ $ref: '123' })
      expect(TokenJSON._serialize(x => x, opts)).to.deep.equal({ $ref: '123' })
    })

    it('should fail to serialize built-in functions', () => {
      const opts = { _replacer: TokenJSON._replace._tokens(x => '123') }
      expect(() => TokenJSON._serialize(Math.random, opts)).to.throw('Cannot serialize')
      expect(() => TokenJSON._serialize(Array.prototype.indexOf, opts)).to.throw('Cannot serialize')
      expect(() => TokenJSON._serialize(WeakSet.prototype.has, opts)).to.throw('Cannot serialize')
      expect(() => TokenJSON._serialize(String.prototype.endsWith, opts)).to.throw('Cannot serialize')
      expect(() => TokenJSON._serialize(isNaN, opts)).to.throw('Cannot serialize')
      expect(() => TokenJSON._serialize(isFinite, opts)).to.throw('Cannot serialize')
      expect(() => TokenJSON._serialize(parseInt, opts)).to.throw('Cannot serialize')
      expect(() => TokenJSON._serialize(escape, opts)).to.throw('Cannot serialize')
      expect(() => TokenJSON._serialize(eval, opts)).to.throw('Cannot serialize') // eslint-disable-line
    })

    it('should replace and revive berries', () => {
      class CustomBerry extends Berry { }
      run.deploy(CustomBerry)
      const berry = { location: 'abc' }
      Object.setPrototypeOf(berry, CustomBerry.prototype)
      const opts = {
        _sandboxIntrinsics,
        _replacer: TokenJSON._replace._tokens(token => '123'),
        _reviver: TokenJSON._revive._tokens(ref => berry)
      }
      serializePass(berry, { $ref: '123' }, opts)
    })
  })

  describe('arbitrary objects', () => {
    const tokens = []
    const opts = {
      _sandboxIntrinsics,
      _replacer: TokenJSON._replace._multiple(
        TokenJSON._replace._tokens(x => { tokens.push(x); return tokens.length - 1 }),
        TokenJSON._replace._arbitraryObjects()
      ),
      _reviver: TokenJSON._revive._multiple(
        TokenJSON._revive._tokens(x => tokens[x]),
        TokenJSON._revive._arbitraryObjects()
      )
    }

    it('should support basic arbitrary objects', () => {
      const $ref = tokens.length
      class A { }
      const a = new A()
      a.n = 1
      serializePass(a, { $arb: { n: 1 }, T: { $ref } }, opts)
    })

    it('should support arbitrary objects with circular references', () => {
      const $ref = tokens.length
      class A { }
      const a = new A()
      a.a = a
      serializePass(a, { $dedup: { $dup: 0 }, dups: [{ $arb: { a: { $dup: 0 } }, T: { $ref } }] }, opts)
    })

    it('should support arbitrary objects with duplicate inners', () => {
      const $ref = tokens.length
      const o = {}
      class A { }
      const a = new A()
      a.o1 = o
      a.o2 = o
      serializePass(a, { $dedup: { $arb: { o1: { $dup: 0 }, o2: { $dup: 0 } }, T: { $ref } }, dups: [{ }] }, opts)
    })
  })

  describe('_findAllTokenRefsInTokenJson', () => {
    function f () { }
    let n = 1
    const opts = { _replacer: TokenJSON._replace._tokens(token => n++) }
    const x = [f, { f }, new Set([f])]
    const json = TokenJSON._serialize(x, opts)
    const refs = TokenJSON._findAllTokenRefsInTokenJson(json)
    expect(Array.from(refs)).to.deep.equal([1, 2, 3])
  })
})

// ------------------------------------------------------------------------------------------------
