/**
 * codec.js
 *
 * Tests for lib/util/codec.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
// const bsv = require('bsv')
const Run = require('../env/run')
// const { Jig, Berry } = Run
const unmangle = require('../env/unmangle')
const Codec = unmangle(Run)._Codec2
// const SI = unmangle(Run.sandbox)._intrinsics
// const HI = unmangle(Run.sandbox)._hostIntrinsics

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
// const decodeFail = y => expect(() => unmangle(new Codec())._decode(y)).to.throw('Cannot decode')

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

    /*
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
      const d0 = { $dup: 0 }
      const d1 = { $dup: 1 }
      encodePass([o, o], { $top: [d0, d0], dups: [{}] })
      encodePass({ a: o, b: o }, { $top: { a: d0, b: d0 }, dups: [{}] })
      encodePass([o, { o }], { $top: [d0, { o: d0 }], dups: [{}] })
      encodePass([o, p, o, p], { $top: [d0, d1, d0, d1], dups: [{}, [1]] })
      encodePass([o, o, p, [o, p], { z: p }], { $top: [d0, d0, d1, [d0, d1], { z: d1 }], dups: [{}, [1]] })
    })

    // ------------------------------------------------------------------------

    it('duplicate $ objects', () => {

      const o = { $n: 1 }
      encodePass([o, o], { $top: [{ $dup: 0 }, { $dup: 0 }], dups: [{ $obj: { $n: 1 } }] })
    })

    // ------------------------------------------------------------------------

    it('circular references', () => {

      const o = {}
      o.o = o
      encodePass(o, { $top: { $dup: 0 }, dups: [{ o: { $dup: 0 } }] })
      const a = [{}, []]
      a[0].x = a[1]
      a[1].push(a[0])
      a.a = a
      encodePass(a, { $top: { $dup: 2 }, dups: [{ x: { $dup: 1 } }, [{ $dup: 0 }], { $arr: { 0: { $dup: 0 }, 1: { $dup: 1 }, a: { $dup: 2 } } }] })
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

    it('maintains key order', () => {

      const o = {}
      o.x = 'x'
      o[3] = 3
      o[2] = 2
      o.n = 3
      const encoded = unmangle(new Codec())._encode(o)
      const json = JSON.parse(JSON.stringify(encoded))
      const o2 = unmangle(new Codec())._decode(json)
      expect(Object.keys(o)).to.deep.equal(Object.keys(o2))
    })

    // ------------------------------------------------------------------------

    it('defaults to host intrinsics', () => {

      expect(unmangle(new Codec())._encode({}).constructor).to.equal(Object)
      expect(unmangle(new Codec())._encode([]).constructor).to.equal(Array)
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
  })

  // --------------------------------------------------------------------------
  // _decode
  // --------------------------------------------------------------------------

  describe('_decode', () => {
    it('throws for unsupported types', () => {

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

    // ------------------------------------------------------------------------

    it('defaults to host intrinsics', () => {

      expect(unmangle(new Codec())._decode({}).constructor).to.equal(Object)
      expect(unmangle(new Codec())._decode([]).constructor).to.equal(Array)
    })
  })

  // --------------------------------------------------------------------------
  // _toSandbox
  // --------------------------------------------------------------------------

  describe('_toSandbox', () => {
    it('encodes to sandbox intrinsics', () => {

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

    // ------------------------------------------------------------------------

    it('decodes to sandbox intrinsics', () => {

      const codec = unmangle(new Codec())._toSandbox()
      expect(codec._decode({}).constructor).to.equal(SI.Object)
      expect(codec._decode({ $obj: {} }).constructor).to.equal(SI.Object)
      expect(codec._decode([]).constructor).to.equal(SI.Array)
      expect(codec._decode({ $arr: {} }).constructor).to.equal(SI.Array)
      expect(codec._decode({ $set: [] }).constructor).to.equal(SI.Set)
      expect(codec._decode({ $map: [] }).constructor).to.equal(SI.Map)
      expect(codec._decode({ $ui8a: '' }).constructor).to.equal(SI.Uint8Array)
    })
  })

  // --------------------------------------------------------------------------
  // Jigs
  // --------------------------------------------------------------------------

  describe('Jigs', () => {
    it('saves jigs with location', () => {

      class Dragon extends Jig { }
      const dragon = new Dragon()
      const codec = unmangle(new Codec())._saveJigs(x => '123')
      const json = codec._encode(dragon)
      expect(json).to.deep.equal({ $jig: '123' })
      expect(json.constructor).to.equal(HI.Object)
    })

    // ------------------------------------------------------------------------

    it('to sandbox intrinsics', () => {

      class Dragon extends Jig { }
      const dragon = new Dragon()
      const codec = unmangle(new Codec())._toSandbox()._saveJigs(x => '123')
      const json = codec._encode(dragon)
      expect(json.constructor).to.equal(SI.Object)
    })

    // ------------------------------------------------------------------------

    it('loads jigs from location', () => {

      class Dragon extends Jig { }
      const dragon = new Dragon()
      const codec = unmangle(new Codec())._loadJigs(x => dragon)
      expect(codec._decode({ $jig: '123' })).to.equal(dragon)
    })

    // ------------------------------------------------------------------------

    it('saves and loads jigs in complex structures', () => {

      class Dragon extends Jig { }
      const dragon = new Dragon()
      const codec = unmangle(new Codec())._saveJigs(x => '123')._loadJigs(x => dragon)
      const x = [dragon, { dragon }, new Set([dragon])]
      const json = codec._encode(x)
      const parsed = JSON.parse(JSON.stringify(json))
      const output = codec._decode(parsed)
      expect(output).to.deep.equal(x)
    })

    // ------------------------------------------------------------------------

    it('throws for bad jig ref', () => {

      const codec = unmangle(new Codec())._loadJigs(x => {})
      expect(() => codec._decode({ $jig: 1, $jig2: 2 })).to.throw()
      expect(() => codec._decode({ $jig: '123' })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('replaces code with location', () => {
      const run = new Run()
      const codec = unmangle(new Codec())._saveJigs(x => '123')
      expect(codec._encode(run.install(class B { constructor () { this.x = 1 } }))).to.deep.equal({ $jig: '123' })
      expect(codec._encode(run.install(function add (a, b) { return a + b }))).to.deep.equal({ $jig: '123' })
    })

    // ------------------------------------------------------------------------

    it('throws for functions that are not code jigs', () => {

      const codec = unmangle(new Codec())._saveJigs(x => '123')
      expect(() => codec._encode(Math.random)).to.throw('Cannot encode')
      expect(() => codec._encode(Array.prototype.indexOf)).to.throw('Cannot encode')
      expect(() => codec._encode(WeakSet.prototype.has)).to.throw('Cannot encode')
      expect(() => codec._encode(String.prototype.endsWith)).to.throw('Cannot encode')
      expect(() => codec._encode(isNaN)).to.throw('Cannot encode')
      expect(() => codec._encode(isFinite)).to.throw('Cannot encode')
      expect(() => codec._encode(parseInt)).to.throw('Cannot encode')
      expect(() => codec._encode(escape)).to.throw('Cannot encode')
      expect(() => codec._encode(eval)).to.throw('Cannot encode') // eslint-disable-line
      expect(() => codec._encode(() => {})).to.throw('Cannot encode')
      expect(() => codec._encode(function a () { })).to.throw('Cannot encode')
      expect(() => codec._encode(class A { })).to.throw('Cannot encode')
    })

    // ------------------------------------------------------------------------

    it.skip('replaces and revives berries', async () => {
      const run = new Run()
      class CustomBerry extends Berry { }
      const CustomBerrySandbox = await run.load(await run.deploy(CustomBerry))
      const berry = { location: '_o1' }
      Object.setPrototypeOf(berry, CustomBerrySandbox.prototype)
      const codec = unmangle(new Codec())._saveJigs(x => '123')
      const json = codec._encode(berry)
      expect(json).to.deep.equal({ $jig: '123' })
    })
  })

  // --------------------------------------------------------------------------
  // Arbitrary objects
  // --------------------------------------------------------------------------

  describe('Arbitrary objects', () => {
    it('basic arbitrary objects', () => {
      const run = new Run()
      const jigs = []
      const codec = unmangle(new Codec())
        ._saveJigs(x => { jigs.push(x); return jigs.length - 1 })
        ._loadJigs(x => jigs[x])
      const A2 = run.install(class A { })
      const a = new A2()
      a.n = 1
      const json = codec._encode(a)
      const expected = { $arb: { n: 1 }, T: { $jig: 0 } }
      expect(json).to.deep.equal(expected)
      expect(codec._decode(json)).to.deep.equal(a)
    })

    // ------------------------------------------------------------------------

    it('arbitrary objects with circular references', () => {
      const run = new Run()
      const jigs = []
      const codec = unmangle(new Codec())
        ._saveJigs(x => { jigs.push(x); return jigs.length - 1 })
        ._loadJigs(x => jigs[x])
      const A2 = run.install(class A { })
      const a = new A2()
      a.a = a
      const json = codec._encode(a)
      const expected = { $top: { $dup: 0 }, dups: [{ $arb: { a: { $dup: 0 } }, T: { $jig: 0 } }] }
      expect(json).to.deep.equal(expected)
      expect(codec._decode(json)).to.deep.equal(a)
    })

    // ------------------------------------------------------------------------

    it('arbitrary objects with duplicate inners', () => {
      const run = new Run()
      const jigs = []
      const codec = unmangle(new Codec())
        ._saveJigs(x => { jigs.push(x); return jigs.length - 1 })
        ._loadJigs(x => jigs[x])
      const o = {}
      const A2 = run.install(class A { })
      const a = new A2()
      a.o1 = o
      a.o2 = o
      const expected = { $top: { $arb: { o1: { $dup: 0 }, o2: { $dup: 0 } }, T: { $jig: 0 } }, dups: [{ }] }
      const json = codec._encode(a)
      expect(json).to.deep.equal(expected)
      expect(codec._decode(json)).to.deep.equal(a)
    })
  */
  })
})

// ------------------------------------------------------------------------------------------------