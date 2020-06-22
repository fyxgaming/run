/**
 * json.js
 *
 * Tests for lib/util/json.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const bsv = require('bsv')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const Codec = unmangle(unmangle(Run)._util)._Codec
const SI = unmangle(Run.sandbox)._intrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

/*
const sandbox = unmangle(Run.sandbox)
const sandboxIntrinsics = sandbox._intrinsics

const _replace = unmangle(unmangle(ResourceJSON)._replace)
const _revive = unmangle(unmangle(ResourceJSON)._revive)
*/

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function encodePass (x, y) {
  const codec = unmangle(new Codec())
  const encoded = codec._encode(x)
  const jsonString = JSON.stringify(encoded)
  const json = JSON.parse(jsonString)
  expect(json).to.deep.equal(y)
  const decoded = codec._decode(json)
  expect(decoded).to.deep.equal(x)
}

const encodeFail = x => expect(() => unmangle(new Codec())._encode(x)).to.throw('Cannot encode')
const decodeFail = y => expect(() => unmangle(new Codec())._decode(y)).to.throw('Cannot decode')

// ------------------------------------------------------------------------------------------------
// Codec
// ------------------------------------------------------------------------------------------------

describe('Codec', () => {
  describe('_encode', () => {
    it('should supported non-symbol primitives', () => {
      new Run() // eslint-disable-line
      // Booleans
      encodePass(true, true)
      encodePass(false, false)
      // Numbers
      encodePass(0, 0)
      encodePass(1, 1)
      encodePass(-1, -1)
      encodePass(1.5, 1.5)
      encodePass(-0.1234567890987654321, -0.1234567890987654321)
      encodePass(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
      encodePass(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER)
      encodePass(Number.MAX_VALUE, Number.MAX_VALUE)
      encodePass(Number.MIN_VALUE, Number.MIN_VALUE)
      encodePass(-0, { $n0: 1 })
      encodePass(Infinity, { $inf: 1 })
      encodePass(-Infinity, { $ninf: 1 })
      encodePass(NaN, { $nan: 1 })
      // Strings
      encodePass('', '')
      encodePass('abc', 'abc')
      encodePass('🐉', '🐉')
      let longString = ''
      for (let i = 0; i < 10000; i++) longString += 'abcdefghijklmnopqrstuvwxyz'
      encodePass(longString, longString)
      // Undefined
      encodePass(undefined, { $und: 1 })
      // Null
      encodePass(null, null)
    })

    it('should fail to encode symbols', () => {
      new Run() // eslint-disable-line
      encodeFail(Symbol.hasInstance)
      encodeFail(Symbol.iterator)
      encodeFail(Symbol.species)
      encodeFail(Symbol.unscopables)
    })

    it('should support basic objects', () => {
      new Run() // eslint-disable-line
      encodePass({}, {})
      encodePass({ n: 1 }, { n: 1 })
      encodePass({ a: 'a', b: true, c: {}, d: null }, { a: 'a', b: true, c: {}, d: null })
      encodePass({ a: { a: { a: {} } } }, { a: { a: { a: {} } } })
      encodePass({ a: {}, b: {}, c: {} }, { a: {}, b: {}, c: {} })
      encodePass(new Proxy({}, {}), {})
    })

    it('should support objects with $ properties', () => {
      new Run() // eslint-disable-line
      encodePass({ $n: 1 }, { $obj: { $n: 1 } })
      encodePass({ $obj: {} }, { $obj: { $obj: {} } })
      encodePass({ a: { $a: { a: {} } } }, { a: { $obj: { $a: { a: {} } } } })
      encodePass({ $und: 1 }, { $obj: { $und: 1 } })
    })

    it('should support basic arrays', () => {
      new Run() // eslint-disable-line
      encodePass([], [])
      encodePass([1, 'a', false, {}], [1, 'a', false, {}])
      encodePass([[[]]], [[[]]])
      encodePass([[1], [2], [3]], [[1], [2], [3]])
      encodePass([0, undefined, 2], [0, { $und: 1 }, 2])
    })

    it('should support sparse arrays', () => {
      new Run() // eslint-disable-line
      const a = []
      a[0] = 0
      a[9] = 9
      encodePass(a, { $arr: { 0: 0, 9: 9 } })
    })

    it('should support arrays with non-numeric properties', () => {
      new Run() // eslint-disable-line
      const a = [1]
      a[9] = 9
      a[-1] = -1
      a.x = 'a'
      a[''] = true
      a.$obj = {}
      encodePass(a, { $arr: { 0: 1, 9: 9, '-1': -1, x: 'a', '': true, $obj: {} } })
    })

    it('should support complex objects', () => {
      new Run() // eslint-disable-line
      const o = {}
      o.o = { a: [] }
      o.a = [{ n: 1 }]
      o.u = undefined
      o.b = new Uint8Array()
      encodePass(o, { a: [{ n: 1 }], o: { a: [] }, u: { $und: 1 }, b: { $ui8a: '' } })
    })

    it('should support duplicate objects', () => {
      new Run() // eslint-disable-line
      const o = {}
      const p = [1]
      const d0 = { $dup: 0 }
      const d1 = { $dup: 1 }
      encodePass([o, o], { $top: [d0, d0], dups: [{}] })
      encodePass({ a: o, b: o }, { $top: { a: d0, b: d0 }, dups: [{}] })
      encodePass([o, { o }], { $top: [d0, { o: d0 }], dups: [{}] })
      encodePass([o, p, o, p], { $top: [d0, d1, d0, d1], dups: [{}, [1]] })
      encodePass([o, o, p, [o, p], { z: p }], { $top: [d0, d0, d1, [d0, d1], { z: d1 }], dups: [{}, [1]] })
    })

    it('should support circular references', () => {
      new Run() // eslint-disable-line
      const o = {}
      o.o = o
      encodePass(o, { $top: { $dup: 0 }, dups: [{ o: { $dup: 0 } }] })
      const a = [{}, []]
      a[0].x = a[1]
      a[1].push(a[0])
      a.a = a
      encodePass(a, { $top: { $dup: 2 }, dups: [{ x: { $dup: 1 } }, [{ $dup: 0 }], { $arr: { 0: { $dup: 0 }, 1: { $dup: 1 }, a: { $dup: 2 } } }] })
    })

    it('should support sets', () => {
      new Run() // eslint-disable-line
      // Basic keys and values
      encodePass(new Set(), { $set: [] })
      encodePass(new Set([0, false, null]), { $set: [0, false, null] })
      // Object keys and values
      encodePass(new Set([new Set()]), { $set: [{ $set: [] }] })
      const s = new Set()
      encodePass(new Set([s, s]), { $set: [{ $set: [] }] })
      // Circular entries
      const s2 = new Set()
      s2.add(s2)
      encodePass(s2, { $top: { $dup: 0 }, dups: [{ $set: [{ $dup: 0 }] }] })
      // Props
      const s3 = new Set([1])
      s3.x = null
      encodePass(s3, { $set: [1], props: { x: null } })
      // Circular props
      const s4 = new Set([])
      s4.add(s4)
      s4.s = s4
      encodePass(s4, { $top: { $dup: 0 }, dups: [{ $set: [{ $dup: 0 }], props: { s: { $dup: 0 } } }] })
    })

    it('should support maps', () => {
      new Run() // eslint-disable-line
      // Basic keys and values
      encodePass(new Map(), { $map: [] })
      encodePass(new Map([['a', 'b']]), { $map: [['a', 'b']] })
      encodePass(new Map([[1, 2], [null, {}]]), { $map: [[1, 2], [null, {}]] })
      // Object keys and values
      encodePass(new Map([[{}, []], [new Set(), new Map()]]), { $map: [[{}, []], [{ $set: [] }, { $map: [] }]] })
      // Duplicate keys and values
      const m = new Map()
      encodePass(new Map([[m, m]]), { $top: { $map: [[{ $dup: 0 }, { $dup: 0 }]] }, dups: [{ $map: [] }] })
      // Circular keys
      const m2 = new Map()
      m2.set(m2, 1)
      encodePass(m2, { $top: { $dup: 0 }, dups: [{ $map: [[{ $dup: 0 }, 1]] }] })
      // Circular values
      const m3 = new Map()
      const a = [m3]
      m3.set(1, a)
      encodePass(a, { $top: { $dup: 0 }, dups: [[{ $map: [[1, { $dup: 0 }]] }]] })
      // Props
      const m4 = new Map([[1, 2]])
      m4.x = 'abc'
      m4[''] = 'def'
      encodePass(m4, { $map: [[1, 2]], props: { x: 'abc', '': 'def' } })
      // Circular props
      const m5 = new Map()
      m5.x = m5
      m5.set(m5.x, 1)
      encodePass(m5, { $top: { $dup: 0 }, dups: [{ $map: [[{ $dup: 0 }, 1]], props: { x: { $dup: 0 } } }] })
    })

    it('should support buffers', () => {
      new Run() // eslint-disable-line
      encodePass(new Uint8Array(), { $ui8a: '' })
      encodePass(new Uint8Array([0, 1]), { $ui8a: 'AAE=' })
      const hello = Buffer.from('hello', 'utf8')
      encodePass(new Uint8Array(hello), { $ui8a: hello.toString('base64') })
      const random = bsv.crypto.Random.getRandomBuffer(1024)
      encodePass(new Uint8Array(random), { $ui8a: random.toString('base64') })
    })

    it('should fail for buffers with props', () => {
      new Run() // eslint-disable-line
      const b = new Uint8Array()
      b.x = 1
      encodeFail(b)
    })

    it('should fail for extensions to built-in types', () => {
      new Run() // eslint-disable-line
      encodeFail(new (class CustomArray extends Array {})())
      encodeFail(new (class CustomObject extends Object {})())
      encodeFail(new (class CustomSet extends Set {})())
      encodeFail(new (class CustomMap extends Map {})())
      encodeFail(new (class CustomUint8Array extends Uint8Array {})())
    })

    it('should maintain key order', () => {
      new Run() // eslint-disable-line
      const o = {}
      o.x = 'x'
      o[3] = 3
      o[2] = 2
      o.n = 3
      const encoded = new Codec()._encode(o)
      const json = JSON.parse(JSON.stringify(encoded))
      const o2 = new Codec()._decode(json)
      expect(Object.keys(o)).to.deep.equal(Object.keys(o2))
    })

    it('should default to host intrinsics', () => {
      new Run() // eslint-disable-line
      expect(unmangle(new Codec())._encode({}).constructor).to.equal(Object)
      expect(unmangle(new Codec())._encode([]).constructor).to.equal(Array)
    })

    it('may serialize to sandbox intrinsics', () => {
      new Run() // eslint-disable-line
      const codec = unmangle(new Codec())._toSandbox()
      // Primitives
      expect(codec._encode({}).constructor).to.equal(SI.Object)
      expect(codec._encode({ $: 1 }).$obj.constructor).to.equal(SI.Object)
      expect(codec._encode(undefined).constructor).to.equal(SI.Object)
      expect(codec._encode(-0).constructor).to.equal(SI.Object)
      expect(codec._encode(NaN).constructor).to.equal(SI.Object)
      expect(codec._encode(Infinity).constructor).to.equal(SI.Object)
      expect(codec._encode(-Infinity).constructor).to.equal(SI.Object)
      // Array
      expect(codec._encode([]).constructor).to.equal(SI.Array)
      const a = []
      a.x = 1
      expect(codec._encode(a).constructor).to.equal(SI.Object)
      expect(codec._encode(a).$arr.constructor).to.equal(SI.Object)
      // Set
      const s = new Set()
      s.x = 1
      expect(codec._encode(s).constructor).to.equal(SI.Object)
      expect(codec._encode(s).$set.constructor).to.equal(SI.Array)
      expect(codec._encode(s).props.constructor).to.equal(SI.Object)
      // Map
      const m = new Map()
      m.x = 1
      expect(codec._encode(m).constructor).to.equal(SI.Object)
      expect(codec._encode(m).$map.constructor).to.equal(SI.Array)
      expect(codec._encode(m).props.constructor).to.equal(SI.Object)
      // Uint8Array
      const b = new Uint8Array()
      expect(codec._encode(b).constructor).to.equal(SI.Object)
      // Dedup
      const o = { }
      expect(codec._encode([o, o]).constructor).to.equal(SI.Object)
      expect(codec._encode([o, o]).$top.constructor).to.equal(SI.Array)
      expect(codec._encode([o, o]).dups.constructor).to.equal(SI.Array)
      expect(codec._encode([o, o]).dups[0].constructor).to.equal(SI.Object)
    })

    it('should fail for raw intrinsics', () => {
      new Run() // eslint-disable-line
      encodeFail(console)
      encodeFail(Object)
      encodeFail(Function)
      encodeFail(Error)
      encodeFail(Math)
      encodeFail(Buffer)
      encodeFail(Date)
      encodeFail(JSON)
      encodeFail(Promise)
      encodeFail(Proxy)
      encodeFail(Int8Array)
      encodeFail(Int16Array)
      encodeFail(Int32Array)
      encodeFail(Uint8Array)
      encodeFail(Uint16Array)
      encodeFail(Uint32Array)
      encodeFail(Uint8ClampedArray)
      encodeFail(Float32Array)
      encodeFail(Float64Array)
      if (typeof BigInt64Array !== 'undefined') encodeFail(BigInt64Array) // eslint-disable-line
      if (typeof BigUint64Array !== 'undefined') encodeFail(BigUint64Array) // eslint-disable-line
      if (typeof BigInt !== 'undefined') encodeFail(BigInt) // eslint-disable-line
      if (typeof WebAssembly !== 'undefined') encodeFail(WebAssembly) // eslint-disable-line
      encodeFail(SI.Object)
      encodeFail(SI.Array)
      encodeFail(SI.Set)
      encodeFail(SI.Map)
      encodeFail(SI.Uint8Array)
    })

    it('should fail for unsupported objects intrinsics', () => {
      new Run() // eslint-disable-line
      encodeFail(new Date())
      encodeFail(new WeakSet())
      encodeFail(new WeakMap())
      encodeFail(new Promise((resolve, reject) => {}))
      encodeFail(new RegExp())
      encodeFail(/^abc/)
      encodeFail(new Error())
      encodeFail(Buffer.alloc(0))
    })

    it('should fail for unrecognized intrinsics', () => {
      new Run() // eslint-disable-line
      const vm = require('vm')
      const [VMSet, VMMap, VMUint8Array] = vm.runInNewContext('[Set, Map, Uint8Array]')
      encodeFail(new VMSet())
      encodeFail(new VMMap())
      encodeFail(new VMUint8Array())
    })
  })

  describe('_decode', () => {
    it('should fail to decode unsupported types', () => {
      new Run() // eslint-disable-line
      // Undefined
      decodeFail(undefined)
      // Numbers
      decodeFail(-0)
      decodeFail(NaN)
      decodeFail(Infinity)
      decodeFail(-Infinity)
      // Symbols
      decodeFail(Symbol.iterator)
      decodeFail(Symbol.hasInstance)
      // Functions
      decodeFail(class A {})
      decodeFail(function f () { })
      // Objects
      decodeFail({ $: 1 })
      decodeFail({ $err: 1 })
      decodeFail({ $und: 1, $nan: 1 })
      decodeFail({ $obj: null })
      // Array
      decodeFail([{ $und: undefined }])
      decodeFail({ $arr: 1 })
      decodeFail({ $arr: [] })
      // Set
      decodeFail({ $set: null })
      decodeFail({ $set: {} })
      decodeFail({ $set: new Set() })
      decodeFail({ $set: [{ $err: 1 }] })
      decodeFail({ $set: new Uint8Array() })
      decodeFail({ $set: [], props: 0 })
      decodeFail({ $set: [], props: [] })
      // Map
      decodeFail({ $map: null })
      decodeFail({ $map: {} })
      decodeFail({ $map: new Map() })
      decodeFail({ $map: [{}] })
      decodeFail({ $map: [[]] })
      decodeFail({ $map: [[1]] })
      decodeFail({ $map: [[1, 2, 3]] })
      decodeFail({ $map: [], props: 0 })
      decodeFail({ $map: [], props: [] })
      // Uint8Array
      decodeFail({ $ui8a: null })
      decodeFail({ $ui8a: [] })
      decodeFail({ $ui8a: {} })
      decodeFail({ $ui8a: '*' })
      decodeFail({ $ui8a: new Uint8Array() })
      // Dedup
      decodeFail({ $top: null })
      decodeFail({ $top: {} })
      decodeFail({ $top: {}, dups: {} })
      decodeFail({ $top: { $dup: 0 }, dups: [] })
      decodeFail({ $top: { $dup: 1 }, dups: [{}] })
      decodeFail({ $top: { $dup: 0 }, dups: [{ $dup: 1 }] })
      decodeFail({ $top: { $top: { }, dups: [] }, dups: [] })
      decodeFail({ $top: { $dup: '0' }, dups: [] })
    })

    /*
    it('should default to sandbox intrinsics', () => {
      new Run() // eslint-disable-line
      expect(_deserialize({}).constructor).to.equal(sandboxIntrinsics.Object)
      expect(_deserialize([]).constructor).to.equal(sandboxIntrinsics.Array)
    })

    it('should use output intrinsics', () => {
      new Run() // eslint-disable-line
      const opts = mangle({ _outputIntrinsics: sandboxIntrinsics })
      expect(_deserialize({}, opts).constructor).to.equal(sandboxIntrinsics.Object)
      expect(_deserialize({ $obj: {} }, opts).constructor).to.equal(sandboxIntrinsics.Object)
      expect(_deserialize([], opts).constructor).to.equal(sandboxIntrinsics.Array)
      expect(_deserialize({ $arr: {} }, opts).constructor).to.equal(sandboxIntrinsics.Array)
      expect(_deserialize({ $set: [] }, opts).constructor).to.equal(sandboxIntrinsics.Set)
      expect(_deserialize({ $map: [] }, opts).constructor).to.equal(sandboxIntrinsics.Map)
      expect(_deserialize({ $ui8a: '' }, opts).constructor).to.equal(sandboxIntrinsics.Uint8Array)
    })

    it('should support custom reviver', () => {
      new Run() // eslint-disable-line
      class A {}
      const a = new A()
      expect(() => _deserialize({ $a: 1 })).to.throw('Cannot deserialize')
      expect(_deserialize({ $a: 1 }, mangle({
        _reviver: x => { if (x.$a === 1) return a }
      }))).to.equal(a)
      expect(() => _deserialize(a, { _reviver: () => {} })).to.throw('Cannot deserialize')
    })
  })

  describe('resources', () => {
    it('should replace jigs with location ref', () => {
      new Run() // eslint-disable-line
      class Dragon extends Jig { }
      const dragon = new Dragon()
      const opts = mangle({
        _outputIntrinsics: sandboxIntrinsics,
        _replacer: _replace._resources(resource => '123')
      })
      const json = _serialize(dragon, opts)
      expect(json).to.deep.equal({ $ref: '123' })
      expect(json.constructor).to.equal(sandboxIntrinsics.Object)
    })

    it('should revive jigs from location ref', () => {
      new Run() // eslint-disable-line
      class Dragon extends Jig { }
      const dragon = new Dragon()
      const opts = mangle({
        _reviver: _revive._resources(ref => dragon)
      })
      expect(_deserialize({ $ref: '123' }, opts)).to.equal(dragon)
    })

    it('should replace and revive jigs in complex structures', () => {
      new Run() // eslint-disable-line
      class Dragon extends Jig { }
      const dragon = new Dragon()
      const opts = mangle({
        _outputIntrinsics: sandbox._hostIntrinsics,
        _replacer: _replace._resources(resource => '123'),
        _reviver: _revive._resources(ref => dragon)
      })
      const x = [dragon, { dragon }, new Set([dragon])]
      const json = _serialize(x, opts)
      const parsed = JSON.parse(JSON.stringify(json))
      const output = _deserialize(parsed, opts)
      expect(output).to.deep.equal(x)
    })

    it('should fail to deserialize bad ref', () => {
      new Run() // eslint-disable-line
      const opts = mangle({ _reviver: _revive._resources(ref => {}) })
      decodeFail({ $ref: 1, $ref2: 2 }, opts)
      decodeFail({ $ref: '123' })
    })

    it('should replace deployables with location ref', () => {
      new Run() // eslint-disable-line
      const opts = mangle({ _replacer: _replace._resources(x => '123') })
      expect(_serialize(class {}, opts)).to.deep.equal({ $ref: '123' })
      expect(_serialize(class A {}, opts)).to.deep.equal({ $ref: '123' })
      expect(_serialize(class { method () { return null } }, opts)).to.deep.equal({ $ref: '123' })
      expect(_serialize(class B { constructor () { this.x = 1 } }, opts)).to.deep.equal({ $ref: '123' })
      expect(_serialize(function f () {}, opts)).to.deep.equal({ $ref: '123' })
      expect(_serialize(function add (a, b) { return a + b }, opts)).to.deep.equal({ $ref: '123' })
      expect(_serialize(function () {}, opts)).to.deep.equal({ $ref: '123' })
      expect(_serialize(() => {}, opts)).to.deep.equal({ $ref: '123' })
      expect(_serialize(x => x, opts)).to.deep.equal({ $ref: '123' })
    })

    it('should fail to serialize built-in functions', () => {
      new Run() // eslint-disable-line
      const opts = mangle({ _replacer: _replace._resources(x => '123') })
      expect(() => _serialize(Math.random, opts)).to.throw('Cannot serialize')
      expect(() => _serialize(Array.prototype.indexOf, opts)).to.throw('Cannot serialize')
      expect(() => _serialize(WeakSet.prototype.has, opts)).to.throw('Cannot serialize')
      expect(() => _serialize(String.prototype.endsWith, opts)).to.throw('Cannot serialize')
      expect(() => _serialize(isNaN, opts)).to.throw('Cannot serialize')
      expect(() => _serialize(isFinite, opts)).to.throw('Cannot serialize')
      expect(() => _serialize(parseInt, opts)).to.throw('Cannot serialize')
      expect(() => _serialize(escape, opts)).to.throw('Cannot serialize')
      expect(() => _serialize(eval, opts)).to.throw('Cannot serialize') // eslint-disable-line
    })

    it('should replace and revive berries', async () => {
      new Run() // eslint-disable-line
      class CustomBerry extends Berry { }
      const CustomBerrySandbox = await run.load(await run.deploy(CustomBerry))
      const berry = { location: '_o1' }
      Object.setPrototypeOf(berry, CustomBerrySandbox.prototype)
      const opts = mangle({
        _replacer: _replace._resources(resource => '123'),
        _reviver: _revive._resources(ref => berry)
      })
      encodePass(berry, { $ref: '123' }, opts)
    })
  })

  describe('arbitrary objects', () => {
    const resources = []
    const opts = mangle({
      _replacer: _replace._multiple(
        _replace._resources(x => { resources.push(x); return resources.length - 1 }),
        _replace._arbitraryObjects()
      ),
      _reviver: _revive._multiple(
        _revive._resources(x => resources[x]),
        _revive._arbitraryObjects()
      )
    })

    it('should support basic arbitrary objects', () => {
      new Run() // eslint-disable-line
      const $ref = resources.length
      class A { }
      const a = new A()
      a.n = 1
      encodePass(a, { $arb: { n: 1 }, T: { $ref } }, opts)
    })

    it('should support arbitrary objects with circular references', () => {
      new Run() // eslint-disable-line
      const $ref = resources.length
      class A { }
      const a = new A()
      a.a = a
      encodePass(a, { $top: { $dup: 0 }, dups: [{ $arb: { a: { $dup: 0 } }, T: { $ref } }] }, opts)
    })

    it('should support arbitrary objects with duplicate inners', () => {
      new Run() // eslint-disable-line
      const $ref = resources.length
      const o = {}
      class A { }
      const a = new A()
      a.o1 = o
      a.o2 = o
      encodePass(a, { $top: { $arb: { o1: { $dup: 0 }, o2: { $dup: 0 } }, T: { $ref } }, dups: [{ }] }, opts)
    })
    */
  })
})

// ------------------------------------------------------------------------------------------------
