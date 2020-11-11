/**
 * misc.js
 *
 * Tests for lib/kernel/misc.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Berry } = Run
const unmangle = require('../env/unmangle')
const Sandbox = unmangle(Run)._Sandbox
const {
  _kernel, _assert, _bsvNetwork, _parent, _parentName, _extendsFrom, _text, _sandboxSourceCode,
  _basicObject, _basicArray, _basicSet, _basicMap, _basicUint8Array, _arbitraryObject,
  _defined, _intrinsic, _serializable, _protoLen, _anonymizeSourceCode,
  _deanonymizeSourceCode, _anonymous, _getOwnProperty, _hasOwnProperty, _setOwnProperty,
  _ownGetters, _ownMethods, _sameCreation, _hasCreation, _addCreations, _subtractCreations, _limit, _Timeout,
  _deterministicJSONStringify, _deterministicCompareKeys, _negativeZero
} = unmangle(unmangle(Run)._misc)
const SI = unmangle(Sandbox)._intrinsics

describe('Misc', () => {
  // ----------------------------------------------------------------------------------------------
  // _kernel
  // ----------------------------------------------------------------------------------------------

  describe('_kernel', () => {
    it('return active run kernel', () => {
      const run = unmangle(new Run())
      expect(_kernel()).to.equal(run._kernel)
    })

    // ------------------------------------------------------------------------

    it('throws if no run instance is active', () => {
      new Run().deactivate() // eslint-disable-line
      expect(() => _kernel()).to.throw('Run instance not active')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _assert
  // ----------------------------------------------------------------------------------------------

  describe('_assert', () => {
    it('pass', () => {
      _assert(true)
      _assert(1)
    })

    // ------------------------------------------------------------------------

    it('fail', () => {
      expect(() => _assert(false)).to.throw()
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _bsvNetwork
  // ----------------------------------------------------------------------------------------------

  describe('_bsvNetwork', () => {
    it('returns appropriate network', () => {
      expect(_bsvNetwork('main')).to.equal('mainnet')
      expect(_bsvNetwork('mainnet')).to.equal('mainnet')
      expect(_bsvNetwork('mainSideChain')).to.equal('mainnet')
      expect(_bsvNetwork('test')).to.equal('testnet')
      expect(_bsvNetwork('mock')).to.equal('testnet')
      expect(_bsvNetwork('stn')).to.equal('testnet')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _parent
  // ----------------------------------------------------------------------------------------------

  describe('_parent', () => {
    it('gets parent class', () => {
      class B { }
      class A extends B { }
      expect(_parent(A)).to.equal(B)
    })

    // ------------------------------------------------------------------------

    it('returns undefined when no parent', () => {
      expect(_parent(function () { })).to.equal(undefined)
      expect(_parent(class {})).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('returns undefined for non-functions', () => {
      expect(_parent(null)).to.equal(undefined)
      expect(_parent(0)).to.equal(undefined)
      expect(_parent('hello')).to.equal(undefined)
      expect(_parent([])).to.equal(undefined)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _parentName
  // ----------------------------------------------------------------------------------------------

  describe('_parentName', () => {
    it('returns null if no parent', () => {
      const src = 'class A { }'
      expect(_parentName(src)).to.equal(null)
    })

    // ------------------------------------------------------------------------

    it('returns null for functions', () => {
      const src = 'function f() { }'
      expect(_parentName(src)).to.equal(null)
    })

    // ------------------------------------------------------------------------

    it('returns parent name if there is a parent', () => {
      const src = 'class A extends B { }'
      expect(_parentName(src)).to.equal('B')
    })

    // ------------------------------------------------------------------------

    it('supports multi-line class definitions', () => {
      const src = 'class A\nextends B\n{ }'
      expect(_parentName(src)).to.equal('B')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _extendsFrom
  // ----------------------------------------------------------------------------------------------

  describe('_extendsFrom', () => {
    it('returns true when class is an ancestor', () => {
      class A { }
      class B extends A { }
      class C extends B { }
      expect(_extendsFrom(B, A)).to.equal(true)
      expect(_extendsFrom(C, A)).to.equal(true)
      expect(_extendsFrom(C, B)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns false when class is not an ancestor', () => {
      class A { }
      class B extends A { }
      class C { }
      expect(_extendsFrom(B, C)).to.equal(false)
      expect(_extendsFrom(C, B)).to.equal(false)
      expect(_extendsFrom(A, B)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns false for self', () => {
      class A { }
      expect(_extendsFrom(A, A)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns false when args are not classes', () => {
      expect(_extendsFrom()).to.equal(false)
      expect(_extendsFrom(class A { })).to.equal(false)
      expect(_extendsFrom(null, class B { })).to.equal(false)
      expect(_extendsFrom(1, 2)).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _text
  // ----------------------------------------------------------------------------------------------

  describe('_text', () => {
    it('short names', () => {
    // Strings
      expect(_text('')).to.equal('""')
      expect(_text('abc')).to.equal('"abc"')
      expect(_text('The quick brown fox jumped over blah blah')).to.equal('"The quick brown fox …"')
      // Booleans
      expect(_text(true)).to.equal('true')
      expect(_text(false)).to.equal('false')
      // Numbers
      expect(_text(1)).to.equal('1')
      expect(_text(-1)).to.equal('-1')
      expect(_text(1.5)).to.equal('1.5')
      expect(_text(NaN)).to.equal('NaN')
      expect(_text(-Infinity)).to.equal('-Infinity')
      // Symbols
      expect(_text(Symbol.iterator)).to.equal('Symbol(Symbol.iterator)')
      expect(_text(Symbol.unscopables)).to.equal('Symbol(Symbol.unscopables)')
      // Undefined
      expect(_text(undefined)).to.equal('undefined')
      // Objects
      expect(_text(null)).to.equal('null')
      expect(_text({})).to.equal('[object Object]')
      expect(_text({ a: 1 })).to.equal('[object Object]')
      expect(_text([1, 2, 3])).to.equal('[object Array]')
      expect(_text(new class Dragon {}())).to.equal('[object Dragon]')
      expect(_text(new class {}())).to.equal('[anonymous object]')
      // Functions
      expect(_text(function f () { })).to.equal('f')
      expect(_text(class A { })).to.equal('A')
      expect(_text(function () { })).to.equal('[anonymous function]')
      expect(_text(() => { })).to.equal('[anonymous function]')
      expect(_text((x, y) => { })).to.equal('[anonymous function]')
      expect(_text(_$xX123 => _$xX123)).to.equal('[anonymous function]')
      expect(_text(class { })).to.equal('[anonymous class]')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _sandboxSourceCode
  // ----------------------------------------------------------------------------------------------

  describe('_sandboxSourceCode', () => {
    // Node 8 and Node 12 have slightly different spacing for getNormalizedSourceCode('function () { return 1 }')
    // We don't need the normalized code to always be exactly the same, as long as it functions the same.
    // Compiled build also add semicolons, so we normlize that too.

    function expectNormalizedSourceCode (T, src) {
      const normalize = s => s.replace(/\s+/g, '').replace(/;/g, '')
      const sandboxSrc = _sandboxSourceCode(T.toString(), T)
      expect(normalize(sandboxSrc)).to.equal(normalize(src))
    }

    // ------------------------------------------------------------------------

    it('basic class', () => {
      class A {}
      expectNormalizedSourceCode(A, 'class A {}')
    })

    // ------------------------------------------------------------------------

    it('basic function', () => {
      function f () { return 1 }
      expectNormalizedSourceCode(f, 'function f() { return 1 }')
    })

    // ------------------------------------------------------------------------

    it('class that extends another class', () => {
      const SomeLibrary = { B: class B { } }
      class A extends SomeLibrary.B {}
      expectNormalizedSourceCode(A, 'class A extends B {}')
    })

    // ------------------------------------------------------------------------

    it('single-line class', () => {
      class B { }
      class A extends B { f () {} }
      expectNormalizedSourceCode(A, 'class A extends B { f () {} }')
    })

    // ------------------------------------------------------------------------

    it('method', () => {
      class B { f () { } }
      expectNormalizedSourceCode(B.prototype.f, 'function f () { }')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _anonymizeSourceCode
  // ----------------------------------------------------------------------------------------------

  describe('_anonymizeSourceCode', () => {
    it('anonymizes', () => {
      expect(_anonymizeSourceCode('class A { }')).to.equal('class  { }')
      expect(_anonymizeSourceCode('class A{f(){}}')).to.equal('class {f(){}}')
      expect(_anonymizeSourceCode('class A extends B { }')).to.equal('class  extends B { }')
      expect(_anonymizeSourceCode('function f() { }')).to.equal('function () { }')
      expect(_anonymizeSourceCode('function f    () {\n}')).to.equal('function     () {\n}')
      expect(_anonymizeSourceCode('class A extends SomeLibrary.B { }')).to.equal('class  extends SomeLibrary.B { }')
      expect(_anonymizeSourceCode('class A extends C["B"] { }')).to.equal('class  extends C["B"] { }')
    })

    // ------------------------------------------------------------------------

    it('throws if bad source', () => {
      expect(() => _anonymizeSourceCode('hello world')).to.throw('Bad source code')
      expect(() => _anonymizeSourceCode('() => { }')).to.throw('Bad source code')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _deanonymizeSourceCode
  // ----------------------------------------------------------------------------------------------

  describe('_deanonymizeSourceCode', () => {
    it('deanonymizes', () => {
      expect(_deanonymizeSourceCode('class { }', 'A')).to.equal('class A{ }')
      expect(_deanonymizeSourceCode('class  extends B{ }', 'A')).to.equal('class A extends B{ }')
      expect(_deanonymizeSourceCode('function () { }', 'f')).to.equal('function f() { }')
    })

    // ------------------------------------------------------------------------

    it('same after anonymize and deanonymize', () => {
      function test (x, n) { expect(_deanonymizeSourceCode(_anonymizeSourceCode(x), n)).to.equal(x) }
      test('class A { }', 'A')
      test('class A{ }', 'A')
      test('class A extends C { }', 'A')
      test('class A extends C\n{ }', 'A')
      test('class A extends C{ }', 'A')
      test('function f() { }', 'f')
      test('function f () { }', 'f')
      test('function f () {\n}', 'f')
    })

    // ------------------------------------------------------------------------

    it('throws if bad source', () => {
      expect(() => _deanonymizeSourceCode('hello world', '')).to.throw('Bad source code')
      expect(() => _deanonymizeSourceCode('() => { }', '')).to.throw('Bad source code')
      expect(() => _deanonymizeSourceCode('class{}', '')).to.throw('Bad source code')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _basicObject
  // ----------------------------------------------------------------------------------------------

  describe('_basicObject', () => {
    it('returns whether basic object', () => {
      expect(_basicObject({})).to.equal(true)
      expect(_basicObject(null)).to.equal(false)
      expect(_basicObject(new class {}())).to.equal(false)
      expect(_basicObject([])).to.equal(false)
      expect(_basicObject(1)).to.equal(false)
      expect(_basicObject(Symbol.hasInstance)).to.equal(false)
      expect(_basicObject(function () { })).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _basicArray
  // ----------------------------------------------------------------------------------------------

  describe('_basicArray', () => {
    it('returns whether basic array', () => {
      expect(_basicArray([])).to.equal(true)
      expect(_basicArray(new SI.Array())).to.equal(true)
      expect(_basicArray(new class C extends Array {}())).to.equal(false)
      expect(_basicArray({})).to.equal(false)
      expect(_basicArray(null)).to.equal(false)
      expect(_basicArray(new class {}())).to.equal(false)
      expect(_basicArray('hello')).to.equal(false)
      expect(_basicArray(Symbol.hasInstance)).to.equal(false)
      expect(_basicArray(class A { })).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _basicSet
  // ----------------------------------------------------------------------------------------------

  describe('_basicSet', () => {
    it('returns whether basic set', () => {
      expect(_basicSet(new Set())).to.equal(true)
      expect(_basicSet(new Set([1, 2, 3]))).to.equal(true)
      expect(_basicSet(new SI.Set())).to.equal(true)
      expect(_basicSet(new (class Set2 extends Set {})())).to.equal(false)
      expect(_basicSet([])).to.equal(false)
      expect(_basicSet(new Map())).to.equal(false)
      expect(_basicSet(new (class Set {})())).to.equal(false)
      expect(_basicSet(null)).to.equal(false)
      expect(_basicSet('Set')).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _basicMap
  // ----------------------------------------------------------------------------------------------

  describe('_basicMap', () => {
    it('returns whether basic map', () => {
      expect(_basicMap(new Map())).to.equal(true)
      expect(_basicMap(new Map([[1, 2]]))).to.equal(true)
      expect(_basicMap(new SI.Map())).to.equal(true)
      expect(_basicMap(new (class Map2 extends Map {})())).to.equal(false)
      expect(_basicMap([])).to.equal(false)
      expect(_basicMap(new Set())).to.equal(false)
      expect(_basicMap(new (class Map {})())).to.equal(false)
      expect(_basicMap(null)).to.equal(false)
      expect(_basicMap('Map')).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _basicUint8Array
  // ----------------------------------------------------------------------------------------------

  describe('_basicUint8Array', () => {
    it('returns whether basic uint8array', () => {
      expect(_basicUint8Array(new Uint8Array())).to.equal(true)
      expect(_basicUint8Array(new Uint8Array([1, 2, 3]))).to.equal(true)
      expect(_basicUint8Array(new SI.Uint8Array())).to.equal(true)
      expect(_basicMap(new (class Buffer extends Uint8Array {})())).to.equal(false)
      expect(_basicUint8Array(Buffer.alloc(1))).to.equal(false)
      expect(_basicUint8Array([])).to.equal(false)
      expect(_basicUint8Array({})).to.equal(false)
      expect(_basicUint8Array(null)).to.equal(false)
      expect(_basicUint8Array(new class {}())).to.equal(false)
      expect(_basicUint8Array('hello')).to.equal(false)
      expect(_basicUint8Array(Symbol.hasInstance)).to.equal(false)
      expect(_basicUint8Array(class A { })).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _arbitraryObject
  // ----------------------------------------------------------------------------------------------

  describe('_arbitraryObject', () => {
    it('returns whether arbitrary object', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(_arbitraryObject(new CA())).to.equal(true)
      expect(_arbitraryObject(new A())).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('non-arbitrary objects', () => {
      expect(_arbitraryObject(new Map())).to.equal(false)
      expect(_arbitraryObject(new Set())).to.equal(false)
      expect(_arbitraryObject(null)).to.equal(false)
      expect(_arbitraryObject({ $arb: 1 })).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('jigs', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(_arbitraryObject(new CA())).to.equal(false)
      expect(_arbitraryObject(new A())).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('berries', async () => {
      new Run() // eslint-disable-line
      class B extends Berry { }
      const b = await B.load('abc')
      expect(_arbitraryObject(b)).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _defined
  // ----------------------------------------------------------------------------------------------

  describe('_defined', () => {
    it('returns whether not undefined', () => {
      expect(_defined()).to.equal(false)
      expect(_defined(undefined)).to.equal(false)
      expect(_defined(null)).to.equal(true)
      expect(_defined(0)).to.equal(true)
      expect(_defined({})).to.equal(true)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _negativeZero
  // ----------------------------------------------------------------------------------------------

  describe('_negativeZero', () => {
    it('returns whether negative zero', () => {
      expect(_negativeZero(-0)).to.equal(true)
      expect(_negativeZero(1 / -Infinity)).to.equal(true)
      expect(_negativeZero(0)).to.equal(false)
      expect(_negativeZero(1)).to.equal(false)
      expect(_negativeZero(-1)).to.equal(false)
      expect(_negativeZero(-Infinity)).to.equal(false)
      expect(_negativeZero(NaN)).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _intrinsic
  // ----------------------------------------------------------------------------------------------

  describe('_intrinsic', () => {
    it('true for intrinsic', () => {
      expect(_intrinsic(Math)).to.equal(true)
      expect(_intrinsic(Set)).to.equal(true)
      expect(_intrinsic(RegExp)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('true for sandbox intrinsic', () => {
      expect(_intrinsic(SI.Object)).to.equal(true)
      expect(_intrinsic(SI.Uint8Array)).to.equal(true)
      expect(_intrinsic(SI.Date)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('false for non-intrinsic', () => {
      expect(_intrinsic(class A { })).to.equal(false)
      expect(_intrinsic(function f () { })).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('false for intrinsic instance', () => {
      expect(_intrinsic({})).to.equal(false)
      expect(_intrinsic([])).to.equal(false)
      expect(_intrinsic(new Set())).to.equal(false)
      expect(_intrinsic(new Map())).to.equal(false)
      expect(_intrinsic(new Date())).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _serializable
  // ----------------------------------------------------------------------------------------------

  describe('_serializable', () => {
    it('true if serializable', () => {
      const run = new Run()
      expect(_serializable(undefined)).to.equal(true)
      expect(_serializable(true)).to.equal(true)
      expect(_serializable(false)).to.equal(true)
      expect(_serializable(0)).to.equal(true)
      expect(_serializable(1)).to.equal(true)
      expect(_serializable(-1.5)).to.equal(true)
      expect(_serializable(NaN)).to.equal(true)
      expect(_serializable(Infinity)).to.equal(true)
      expect(_serializable(-Infinity)).to.equal(true)
      expect(_serializable(-0)).to.equal(true)
      expect(_serializable('')).to.equal(true)
      expect(_serializable('abc')).to.equal(true)
      expect(_serializable('😃')).to.equal(true)
      expect(_serializable(null)).to.equal(true)
      expect(_serializable({})).to.equal(true)
      expect(_serializable([])).to.equal(true)
      expect(_serializable(new Set())).to.equal(true)
      expect(_serializable(new Map())).to.equal(true)
      expect(_serializable(new Uint8Array())).to.equal(true)
      expect(_serializable(new SI.Set())).to.equal(true)
      expect(_serializable(new SI.Map())).to.equal(true)
      expect(_serializable(new SI.Uint8Array())).to.equal(true)
      expect(_serializable(run.deploy(class A {}))).to.equal(true)
      expect(_serializable(new (class A extends Jig { })())).to.equal(true)
      expect(_serializable(new (run.deploy(class A { }))())).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('false if unserializable', () => {
      expect(_serializable(new RegExp())).to.equal(false)
      expect(_serializable(Math)).to.equal(false)
      expect(_serializable(Date)).to.equal(false)
      expect(_serializable(new Date())).to.equal(false)
      expect(_serializable(new Uint16Array())).to.equal(false)
      expect(_serializable(class A { })).to.equal(false)
      expect(_serializable(class A extends Jig { })).to.equal(false)
      expect(_serializable(function f () { })).to.equal(false)
      expect(_serializable(() => { })).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _anonymous
  // ----------------------------------------------------------------------------------------------

  describe('_anonymous', () => {
    it('true if anonymous', () => {
      const A = class { }
      const f = function () { }
      const g = () => { }
      expect(_anonymous(A)).to.equal(true)
      expect(_anonymous(f)).to.equal(true)
      expect(_anonymous(g)).to.equal(true)
      expect(_anonymous(() => { })).to.equal(true)
      expect(_anonymous(x => x)).to.equal(true)
      expect(_anonymous(class { })).to.equal(true)
      expect(_anonymous(class extends A { })).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('false if non-anonymous', () => {
      expect(_anonymous(0)).to.equal(false)
      expect(_anonymous(true)).to.equal(false)
      expect(_anonymous(null)).to.equal(false)
      expect(_anonymous(undefined)).to.equal(false)
      expect(_anonymous('function f() { }')).to.equal(false)
      expect(_anonymous({})).to.equal(false)
      expect(_anonymous(function f () { })).to.equal(false)
      expect(_anonymous(class A { })).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _protoLen
  // ----------------------------------------------------------------------------------------------

  describe('_protoLen', () => {
    it('returns length of prototype chain', () => {
      expect(_protoLen(null)).to.equal(0)
      expect(_protoLen(0)).to.equal(0)
      expect(_protoLen({})).to.equal(2)
      expect(_protoLen('abc')).to.equal(3)
      expect(_protoLen([])).to.equal(3)
      expect(_protoLen(new Set())).to.equal(3)
      expect(_protoLen(new Map())).to.equal(3)
      expect(_protoLen(new Uint8Array())).to.equal(4)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _getOwnProperty
  // ----------------------------------------------------------------------------------------------

  describe('_getOwnProperty', () => {
    it('returns property', () => {
      class A { }
      A.n = 1
      expect(_getOwnProperty(A, 'n')).to.equal(1)
      expect(_getOwnProperty({ n: 1 }, 'n')).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('does not return prototype property', () => {
      class A { }
      A.n = 1
      class B extends A { }
      expect(_getOwnProperty(B, 'n')).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('returns undefined for non-objects', () => {
      expect(_getOwnProperty(1, 'n')).to.equal(undefined)
      expect(_getOwnProperty(null, 'n')).to.equal(undefined)
      expect(_getOwnProperty('abc', 'n')).to.equal(undefined)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _hasOwnProperty
  // ----------------------------------------------------------------------------------------------

  describe('_hasOwnProperty', () => {
    it('returns string property exists', () => {
      class A { }
      A.n = 1
      expect(_hasOwnProperty(A, 'n')).to.equal(true)
      expect(_hasOwnProperty({ n: 1 }, 'n')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns symbol property exists', () => {
      class A { }
      A[Symbol.species] = 1
      expect(_hasOwnProperty(A, Symbol.species)).to.equal(true)
      expect(_hasOwnProperty(A, Symbol.iterator)).to.equal(false)
      expect(_hasOwnProperty(A, Symbol.hasInstance)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('does not return prototype property exists', () => {
      class A { }
      A.n = 1
      class B extends A { }
      expect(_hasOwnProperty(B, 'n')).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _setOwnProperty
  // ----------------------------------------------------------------------------------------------

  describe('_setOwnProperty', () => {
    it('sets current property', () => {
      class A { }
      A.n = 1
      _setOwnProperty(A, 'n', 1)
      expect(A.n).to.equal(1)
      const o = {}
      _setOwnProperty(o, 'n', 1)
      expect(o.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('does not set parent property', () => {
      class A { }
      A.n = 1
      class B extends A { }
      _setOwnProperty(B, 'n', 2)
      expect(B.n).to.equal(2)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _ownGetters
  // ----------------------------------------------------------------------------------------------

  describe('_ownGetters', () => {
    it('gets getters', () => {
      class B { static get m () { } }
      class A extends B { static get n () { } }
      Object.defineProperty(A, 'l', { get: () => { } })
      expect(_ownGetters(A)).to.deep.equal(['n', 'l'])
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _ownMethods
  // ----------------------------------------------------------------------------------------------

  describe('_ownMethods', () => {
    it('gets methods', () => {
      class B { static m () { } }
      class A extends B { static n () { } }
      A.l = () => { }
      expect(_ownMethods(A)).to.deep.equal(['n', 'l'])
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _sameCreation
  // ----------------------------------------------------------------------------------------------

  describe('_sameCreation', () => {
    it('true if same', () => {
      const run = new Run()
      const A = run.deploy(class A { })
      expect(_sameCreation(A, A)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('true if different instances of same jig', async () => {
      const run = new Run()
      const A = run.deploy(class A { })
      await A.sync()
      const A2 = await run.load(A.location)
      expect(_sameCreation(A, A2)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('throws if different jigs', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      class B extends Jig { }
      const a = new A()
      const a2 = new A()
      const b = new B()
      expect(_sameCreation(a, a2)).to.equal(false)
      expect(_sameCreation(a, b)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('throws if different locations', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _sameCreation(a, a2)).to.throw('Inconsistent worldview')
    })

    // ------------------------------------------------------------------------

    it('false if non-jig', () => {
      expect(_sameCreation({}, {})).to.equal(false)
      expect(_sameCreation(null, null)).to.equal(false)
      class A { }
      expect(_sameCreation(A, A)).to.equal(false)
      const run = new Run()
      const A2 = run.deploy(A)
      expect(_sameCreation(A2, {})).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns false if undeployed', () => {
      const run = new Run()
      const A = Run.install(class A { })
      const B = run.deploy(class B { })
      expect(_sameCreation(A, B)).to.equal(false)
      expect(_sameCreation(B, A)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns true for same berries', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await CB.load('abc')
      const b2 = await CB.load('abc')
      expect(_sameCreation(b, b2)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('return false for different berries', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()

      const b = await CB.load('abc')
      const b2 = await CB.load('def')
      expect(_sameCreation(b, b2)).to.equal(false)

      class C extends Berry { }
      const CC = run.deploy(C)
      await CC.sync()

      const c = await C.load('abc')
      expect(_sameCreation(b, c)).to.equal(false)

      const b3 = { location: `${CB.location}_abc` }
      Object.setPrototypeOf(b3, CB.prototype)
      expect(_sameCreation(b, b3)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns false for undeployed berries', async () => {
      new Run() // eslint-disable-line
      class B extends Berry { }
      const b = await B.load('abc')
      const b2 = await B.load('abc')
      expect(_sameCreation(b, b2)).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _hasCreation
  // ----------------------------------------------------------------------------------------------

  describe('_hasCreation', () => {
    it('returns true if jig in array', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      expect(_hasCreation([a], a)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns false for nonjig', () => {
      const o = { }
      expect(_hasCreation([o], o)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('return false if jig not in array', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      expect(_hasCreation([{}], a)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('throws if inconsistent worldview', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _hasCreation([a], a2)).to.throw('Inconsistent worldview')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _addCreations
  // ----------------------------------------------------------------------------------------------

  describe('_addCreations', () => {
    it('adds jigs once', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const a2 = await run.load(a.location)
      const arr = [a]
      const b = new A()
      expect(_addCreations(arr, [a2, b])).to.deep.equal([a, b])
    })

    // ------------------------------------------------------------------------

    it('throws if inconsistent worldview', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _addCreations([a], [a2])).to.throw('Inconsistent worldview')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _subtractCreations
  // ----------------------------------------------------------------------------------------------

  describe('_subtractCreations', () => {
    it('removes same jigs', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const a2 = await run.load(a.location)
      const b = new A()
      const arr = [a, b]
      expect(_subtractCreations(arr, [a2, b])).to.deep.equal([])
    })

    // ------------------------------------------------------------------------

    it('throws if inconsistent worldview', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _subtractCreations([a], [a2])).to.throw('Inconsistent worldview')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _limit
  // ----------------------------------------------------------------------------------------------

  describe('_limit', () => {
    it('limits values', () => {
      expect(_limit(null)).to.equal(Number.MAX_VALUE)
      expect(_limit(-1)).to.equal(Number.MAX_VALUE)
      expect(_limit(Infinity)).to.equal(Number.MAX_VALUE)
      expect(_limit(0)).to.equal(0)
      expect(_limit(10)).to.equal(10)
      expect(_limit(Number.MAX_SAFE_INTEGER)).to.equal(Number.MAX_SAFE_INTEGER)
    })

    // ------------------------------------------------------------------------

    it('throws if invalid', () => {
      expect(() => _limit()).to.throw('Invalid limit')
      expect(() => _limit(-2)).to.throw('Invalid limit')
      expect(() => _limit(-Infinity)).to.throw('Invalid limit')
    })

    // ------------------------------------------------------------------------

    it('custom name', () => {
      expect(() => _limit(undefined, 'timeout')).to.throw('Invalid timeout: undefined')
      expect(() => _limit({}, 'size')).to.throw('Invalid size: [object Object]')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _Timeout
  // ----------------------------------------------------------------------------------------------

  describe('_Timeout', () => {
    it('does not throw before timeout', () => {
      unmangle(new _Timeout('', 1000))._check()
    })

    // ------------------------------------------------------------------------

    it('throws after timeout', async () => {
      const timeout = new _Timeout('hello', 0)
      await new Promise((resolve, reject) => setTimeout(resolve, 10))
      expect(() => unmangle(timeout)._check()).to.throw('hello timeout')
      expect(() => unmangle(timeout)._check()).to.throw('hello timeout')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _deterministicJSONStringify
  // ----------------------------------------------------------------------------------------------

  describe('_deterministicJSONStringify', () => {
    it('stringifies', () => {
      expect(_deterministicJSONStringify({ a: [{ b: 2 }, '3'] })).to.equal('{"a":[{"b":2},"3"]}')
    })

    // ------------------------------------------------------------------------

    it('orders keys alphabetically', () => {
      expect(_deterministicJSONStringify({ 3: 3, b: 2, 1: 1 })).to.equal('{"1":1,"3":3,"b":2}')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _deterministicCompareKeys
  // ----------------------------------------------------------------------------------------------

  describe('_deterministicCompareKeys', () => {
    it('sorts strings before symbols', () => {
      const x = [Symbol.iterator, 'b', 'a', 'a', '1', '0', Symbol.hasInstance]
      const y = x.sort(_deterministicCompareKeys)
      expect(y).to.deep.equal(['0', '1', 'a', 'a', 'b', Symbol.hasInstance, Symbol.iterator])
    })

    // ------------------------------------------------------------------------

    it('sorts integer keys before string keys', () => {
      const x = ['b', 'a', '0', '01', '10', '11', '1', '2', '011']
      const y = x.sort(_deterministicCompareKeys)
      expect(y).to.deep.equal(['0', '1', '2', '10', '11', '01', '011', 'a', 'b'])
    })
  })
})

// ------------------------------------------------------------------------------------------------
