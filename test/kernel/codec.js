/**
 * codec.js
 *
 * Tests for lib/kernel/codec.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const bsv = require('bsv')
const Run = require('../env/run')
const { Jig, Berry } = Run
const unmangle = require('../env/unmangle')
const mangle = unmangle.mangle
const Codec = unmangle(Run)._Codec
const { _encode, _decode } = unmangle(Codec)
const SI = unmangle(unmangle(Run)._Sandbox)._intrinsics
const HI = unmangle(unmangle(Run)._Sandbox)._hostIntrinsics

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function encodePass (x, y) {
  const encoded = _encode(x)
  const jsonString = JSON.stringify(encoded)
  const json = JSON.parse(jsonString)
  expect(json).to.deep.equal(y)
  const decoded = _decode(json)
  expect(decoded).to.deep.equal(x)
}

const encodeFail = x => expect(() => _encode(x)).to.throw('Cannot encode')
const decodeFail = y => expect(() => _decode(y)).to.throw('Cannot decode')

// ------------------------------------------------------------------------------------------------
// Codec
// ------------------------------------------------------------------------------------------------

describe('Codec', () => {
  // --------------------------------------------------------------------------
  // _encode
  // --------------------------------------------------------------------------

  describe('_encode', () => {
    it('non-symbol primitives', () => {
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

    // ------------------------------------------------------------------------

    it('throws for symbols', () => {
      encodeFail(Symbol.hasInstance)
      encodeFail(Symbol.iterator)
      encodeFail(Symbol.species)
      encodeFail(Symbol.unscopables)
    })

    // ------------------------------------------------------------------------

    it('basic objects', () => {
      encodePass({}, {})
      encodePass({ n: 1 }, { n: 1 })
      encodePass({ a: 'a', b: true, c: {}, d: null }, { a: 'a', b: true, c: {}, d: null })
      encodePass({ a: { a: { a: {} } } }, { a: { a: { a: {} } } })
      encodePass({ a: {}, b: {}, c: {} }, { a: {}, b: {}, c: {} })
      encodePass(new Proxy({}, {}), {})
    })

    // ------------------------------------------------------------------------

    it('objects with $ properties', () => {
      encodePass({ $n: 1 }, { $obj: { $n: 1 } })
      encodePass({ $obj: {} }, { $obj: { $obj: {} } })
      encodePass({ a: { $a: { a: {} } } }, { a: { $obj: { $a: { a: {} } } } })
      encodePass({ $und: 1 }, { $obj: { $und: 1 } })
    })

    // ------------------------------------------------------------------------

    it('basic arrays', () => {
      encodePass([], [])
      encodePass([1, 'a', false, {}], [1, 'a', false, {}])
      encodePass([[[]]], [[[]]])
      encodePass([[1], [2], [3]], [[1], [2], [3]])
      encodePass([0, undefined, 2], [0, { $und: 1 }, 2])
    })

    // ------------------------------------------------------------------------

    it('sparse arrays', () => {
      const a = []
      a[0] = 0
      a[9] = 9
      encodePass(a, { $arr: { 0: 0, 9: 9 } })
    })

    // ------------------------------------------------------------------------

    it('arrays with non-numeric properties', () => {
      const a = [1]
      a[9] = 9
      a[-1] = -1
      a.x = 'a'
      a[''] = true
      a.$obj = {}
      encodePass(a, { $arr: { 0: 1, 9: 9, '-1': -1, x: 'a', '': true, $obj: {} } })
    })

    // ------------------------------------------------------------------------

    it('complex objects', () => {
      const o = {}
      o.o = { a: [] }
      o.a = [{ n: 1 }]
      o.u = undefined
      o.b = new Uint8Array()
      encodePass(o, { a: [{ n: 1 }], o: { a: [] }, u: { $und: 1 }, b: { $ui8a: '' } })
    })

    // ------------------------------------------------------------------------

    it('duplicate objects', () => {
      const o = {}
      const p = [1]
      encodePass([o, o], [{}, { $dup: ['0'] }])
      encodePass({ a: o, b: o }, { a: {}, b: { $dup: ['a'] } })
      encodePass([o, { o }], [{}, { o: { $dup: ['0'] } }])
      encodePass([o, p, o, p], [{}, [1], { $dup: ['0'] }, { $dup: ['1'] }])
      encodePass([o, o, p, [o, p], { z: p }], [{}, { $dup: ['0'] }, [1],
        [{ $dup: ['0'] }, { $dup: ['2'] }], { z: { $dup: ['2'] } }])
    })

    // ------------------------------------------------------------------------

    it('duplicate $ objects', () => {
      const o = { $n: 1 }
      encodePass([o, o], [{ $obj: { $n: 1 } }, { $dup: ['0'] }])
    })

    // ------------------------------------------------------------------------

    it('circular references', () => {
      const o = {}
      o.o = o
      encodePass(o, { o: { $dup: [] } })
      const a = [{}, []]
      a[0].x = a[1]
      a[1].push(a[0])
      a.a = a
      encodePass(a, { $arr: { 0: { x: [{ $dup: ['$arr', '0'] }] }, 1: { $dup: ['$arr', '0', 'x'] }, a: { $dup: [] } } })
    })

    // ------------------------------------------------------------------------

    it('sets', () => {
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
      encodePass(s2, { $set: [{ $dup: [] }] })
      // Props
      const s3 = new Set([1])
      s3.x = null
      encodePass(s3, { $set: [1], props: { x: null } })
      // Circular props
      const s4 = new Set([])
      s4.add(s4)
      s4.s = s4
      encodePass(s4, { $set: [{ $dup: [] }], props: { s: { $dup: [] } } })
    })

    // ------------------------------------------------------------------------

    it('maps', () => {
      // Basic keys and values
      encodePass(new Map(), { $map: [] })
      encodePass(new Map([['a', 'b']]), { $map: [['a', 'b']] })
      encodePass(new Map([[1, 2], [null, {}]]), { $map: [[1, 2], [null, {}]] })
      // Object keys and values
      encodePass(new Map([[{}, []], [new Set(), new Map()]]), { $map: [[{}, []], [{ $set: [] }, { $map: [] }]] })
      // Duplicate keys and values
      const m = new Map()
      encodePass(new Map([[m, m]]), { $map: [[{ $map: [] }, { $dup: ['$map', '0', '0'] }]] })
      // Circular keys
      const m2 = new Map()
      m2.set(m2, 1)
      encodePass(m2, { $map: [[{ $dup: [] }, 1]] })
      // Circular values
      const m3 = new Map()
      const a = [m3]
      m3.set(1, a)
      encodePass(a, [{ $map: [[1, { $dup: [] }]] }])
      // Props
      const m4 = new Map([[1, 2]])
      m4.x = 'abc'
      m4[''] = 'def'
      encodePass(m4, { $map: [[1, 2]], props: { x: 'abc', '': 'def' } })
      // Circular props
      const m5 = new Map()
      m5.x = m5
      m5.set(m5.x, 1)
      encodePass(m5, { $map: [[{ $dup: [] }, 1]], props: { x: { $dup: [] } } })
    })

    // ------------------------------------------------------------------------

    it('buffers', () => {
      encodePass(new Uint8Array(), { $ui8a: '' })
      encodePass(new Uint8Array([0, 1]), { $ui8a: 'AAE=' })
      const hello = Buffer.from('hello', 'utf8')
      encodePass(new Uint8Array(hello), { $ui8a: hello.toString('base64') })
      const random = bsv.crypto.Random.getRandomBuffer(1024)
      encodePass(new Uint8Array(random), { $ui8a: random.toString('base64') })
    })

    // ------------------------------------------------------------------------

    it('throws for buffers with props', () => {
      const b = new Uint8Array()
      b.x = 1
      encodeFail(b)
    })

    // ------------------------------------------------------------------------

    it('throws for extensions to built-in types', () => {
      encodeFail(new (class CustomArray extends Array {})())
      encodeFail(new (class CustomObject extends Object {})())
      encodeFail(new (class CustomSet extends Set {})())
      encodeFail(new (class CustomMap extends Map {})())
      encodeFail(new (class CustomUint8Array extends Uint8Array {})())
    })

    // ------------------------------------------------------------------------

    it('sorts keys', () => {
      const o = {}
      o.x = 'x'
      o[3] = 3
      o[2] = 2
      o[10] = 1
      o.n = 3
      const encoded = _encode(o)
      const json = JSON.parse(JSON.stringify(encoded))
      const o2 = _decode(json)
      expect(Object.keys(o2)).to.deep.equal(['2', '3', '10', 'n', 'x'])
    })

    // ------------------------------------------------------------------------

    it('defaults to host intrinsics', () => {
      expect(_encode({}).constructor).to.equal(Object)
      expect(_encode([]).constructor).to.equal(Array)
    })

    // ------------------------------------------------------------------------

    it('throws for raw intrinsics', () => {
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

    // ------------------------------------------------------------------------

    it('throws for unsupported objects intrinsics', () => {
      encodeFail(new Date())
      encodeFail(new WeakSet())
      encodeFail(new WeakMap())
      encodeFail(new Promise((resolve, reject) => {}))
      encodeFail(new RegExp())
      encodeFail(/^abc/)
      encodeFail(new Error())
      encodeFail(Buffer.alloc(0))
    })

    // ------------------------------------------------------------------------

    it('throws for unrecognized intrinsics', () => {
      const vm = require('vm')
      const [VMSet, VMMap, VMUint8Array] = vm.runInNewContext('[Set, Map, Uint8Array]')
      encodeFail(new VMSet())
      encodeFail(new VMMap())
      encodeFail(new VMUint8Array())
    })

    // ------------------------------------------------------------------------

    it('throws for functions that are not code jigs', () => {
      const opts = mangle({ _encodeJig: x => '123' })
      expect(() => _encode(Math.random, opts)).to.throw('Cannot encode')
      expect(() => _encode(Array.prototype.indexOf, opts)).to.throw('Cannot encode')
      expect(() => _encode(WeakSet.prototype.has, opts)).to.throw('Cannot encode')
      expect(() => _encode(String.prototype.endsWith, opts)).to.throw('Cannot encode')
      expect(() => _encode(isNaN, opts)).to.throw('Cannot encode')
      expect(() => _encode(isFinite, opts)).to.throw('Cannot encode')
      expect(() => _encode(parseInt, opts)).to.throw('Cannot encode')
      expect(() => _encode(escape, opts)).to.throw('Cannot encode')
      expect(() => _encode(eval, opts)).to.throw('Cannot encode') // eslint-disable-line
      expect(() => _encode(() => {}, opts)).to.throw('Cannot encode')
      expect(() => _encode(function a () { }, opts)).to.throw('Cannot encode')
      expect(() => _encode(class A { }, opts)).to.throw('Cannot encode')
    })

    // ------------------------------------------------------------------------

    it('sandbox intrinsics', () => {
      const opts = mangle({ _intrinsics: SI })
      // Primitives
      expect(_encode({}, opts).constructor).to.equal(SI.Object)
      expect(_encode({ $: 1 }, opts).$obj.constructor).to.equal(SI.Object)
      expect(_encode(undefined, opts).constructor).to.equal(SI.Object)
      expect(_encode(-0, opts).constructor).to.equal(SI.Object)
      expect(_encode(NaN, opts).constructor).to.equal(SI.Object)
      expect(_encode(Infinity, opts).constructor).to.equal(SI.Object)
      expect(_encode(-Infinity, opts).constructor).to.equal(SI.Object)
      // Array
      expect(_encode([], opts).constructor).to.equal(SI.Array)
      const a = []
      a.x = 1
      expect(_encode(a, opts).constructor).to.equal(SI.Object)
      expect(_encode(a, opts).$arr.constructor).to.equal(SI.Object)
      // Set
      const s = new Set()
      s.x = 1
      expect(_encode(s, opts).constructor).to.equal(SI.Object)
      expect(_encode(s, opts).$set.constructor).to.equal(SI.Array)
      expect(_encode(s, opts).props.constructor).to.equal(SI.Object)
      // Map
      const m = new Map()
      m.x = 1
      expect(_encode(m, opts).constructor).to.equal(SI.Object)
      expect(_encode(m, opts).$map.constructor).to.equal(SI.Array)
      expect(_encode(m, opts).props.constructor).to.equal(SI.Object)
      // Uint8Array
      const b = new Uint8Array()
      expect(_encode(b, opts).constructor).to.equal(SI.Object)
      // Dups
      const o = { }
      expect(_encode([o, o], opts).constructor).to.equal(SI.Array)
      expect(_encode([o, o], opts)[1].$dup.constructor).to.equal(SI.Array)
      // Jigs
      new Run() // eslint-disable-line
      class Dragon extends Jig { }
      const dragon = new Dragon()
      const json = _encode(dragon, mangle({ _encodeJig: x => '123', _intrinsics: SI }))
      expect(json.constructor).to.equal(SI.Object)
    })

    // ------------------------------------------------------------------------

    it('jig', () => {
      new Run() // eslint-disable-line
      class Dragon extends Jig { }
      const dragon = new Dragon()
      const json = _encode(dragon, mangle({ _encodeJig: x => '123' }))
      expect(json).to.deep.equal({ $jig: '123' })
      expect(json.constructor).to.equal(HI.Object)
    })

    // ------------------------------------------------------------------------

    it('code', () => {
      const opts = mangle({ _encodeJig: x => '123' })
      const CB = Run.util.install(class B { constructor () { this.x = 1 } })
      expect(_encode(CB, opts)).to.deep.equal({ $jig: '123' })
      const cadd = Run.util.install(function add (a, b) { return a + b })
      expect(_encode(cadd, opts)).to.deep.equal({ $jig: '123' })
    })

    // ------------------------------------------------------------------------

    it('berry', async () => {
      new Run() // eslint-disable-line
      class B extends Berry {
        static async pluck () { return new B() }
      }
      const berry = await B.load('abc')
      const json = _encode(berry, mangle({ _encodeJig: x => '123' }))
      expect(json).to.deep.equal({ $jig: '123' })
    })

    // ------------------------------------------------------------------------

    it('basic arbitrary objects', () => {
      const jigs = []
      const A2 = Run.util.install(class A { })
      const a = new A2()
      a.n = 1
      const json = _encode(a, mangle({ _encodeJig: x => { jigs.push(x); return jigs.length - 1 } }))
      const expected = { $arb: { n: 1 }, T: { $jig: 0 } }
      expect(json).to.deep.equal(expected)
      const decoded = _decode(json, mangle({ _decodeJig: x => jigs[x] }))
      expect(decoded).to.deep.equal(a)
    })

    // ------------------------------------------------------------------------

    it('arbitrary objects with circular references', () => {
      const jigs = []
      const A2 = Run.util.install(class A { })
      const a = new A2()
      a.a = a
      const json = _encode(a, mangle({ _encodeJig: x => { jigs.push(x); return jigs.length - 1 } }))
      const expected = { $arb: { a: { $dup: [] } }, T: { $jig: 0 } }
      expect(json).to.deep.equal(expected)
      const decoded = _decode(json, mangle({ _decodeJig: x => jigs[x] }))
      expect(decoded).to.deep.equal(a)
    })

    // ------------------------------------------------------------------------

    it('arbitrary objects with duplicate inners', () => {
      const jigs = []
      const o = {}
      const A2 = Run.util.install(class A { })
      const a = new A2()
      a.o1 = o
      a.o2 = o
      const expected = { $arb: { o1: { }, o2: { $dup: ['$arb', 'o1'] } }, T: { $jig: 0 } }
      const json = _encode(a, mangle({ _encodeJig: x => { jigs.push(x); return jigs.length - 1 } }))
      expect(json).to.deep.equal(expected)
      const decoded = _decode(json, mangle({ _decodeJig: x => jigs[x] }))
      expect(decoded).to.deep.equal(a)
    })
  })

  // --------------------------------------------------------------------------
  // _decode
  // --------------------------------------------------------------------------

  describe('_decode', () => {
    it('throws for unsupported types', () => {
      // Undefined
      decodeFail(undefined)
      // Numbers
      // decodeFail(-0) - allow for firefox bug
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
      // Dups
      decodeFail({ $dup: null })
      decodeFail({ $dup: {} })
      decodeFail({ $dup: [null] })
      decodeFail({ $dup: [0] })
      decodeFail({ a: { $dup: ['b'] }, b: [] })
    })

    // ------------------------------------------------------------------------

    it('defaults to host intrinsics', () => {
      expect(_decode({}).constructor).to.equal(Object)
      expect(_decode([]).constructor).to.equal(Array)
    })

    // ------------------------------------------------------------------------

    it('sandbox intrinsics', () => {
      const opts = mangle({ _intrinsics: SI })
      expect(_decode({}, opts).constructor).to.equal(SI.Object)
      expect(_decode({ $obj: {} }, opts).constructor).to.equal(SI.Object)
      expect(_decode([], opts).constructor).to.equal(SI.Array)
      expect(_decode({ $arr: {} }, opts).constructor).to.equal(SI.Array)
      expect(_decode({ $set: [] }, opts).constructor).to.equal(SI.Set)
      expect(_decode({ $map: [] }, opts).constructor).to.equal(SI.Map)
      expect(_decode({ $ui8a: '' }, opts).constructor).to.equal(SI.Uint8Array)
    })

    // ------------------------------------------------------------------------

    it('throws for bad jig ref', () => {
      const opts = mangle({ _decodeJig: x => {} })
      expect(() => _decode({ $jig: 1, $jig2: 2 }, opts)).to.throw()
      expect(() => _decode({ $jig: '123' }, opts)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('jig', () => {
      new Run() // eslint-disable-line
      class Dragon extends Jig { }
      const dragon = new Dragon()
      const opts = mangle({ _decodeJig: x => dragon })
      expect(_decode({ $jig: '123' }, opts)).to.equal(dragon)
    })

    // ------------------------------------------------------------------------

    it('jig in complex structure', () => {
      new Run() // eslint-disable-line
      class Dragon extends Jig { }
      const dragon = new Dragon()
      const encodeOptions = mangle({ _encodeJig: x => '123' })
      const decodeOptions = mangle({ _decodeJig: x => dragon })
      const x = [dragon, { dragon }, new Set([dragon])]
      const json = _encode(x, encodeOptions)
      const parsed = JSON.parse(JSON.stringify(json))
      const output = _decode(parsed, decodeOptions)
      expect(output).to.deep.equal(x)
    })
  })
})

// ------------------------------------------------------------------------------------------------
