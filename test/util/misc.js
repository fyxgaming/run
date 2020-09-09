/**
 * misc.js
 *
 * Tests for lib/kernel/misc.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig } = Run
const unmangle = require('../env/unmangle')
const Sandbox = Run.sandbox
const {
  _kernel, _assert, _bsvNetwork, _parent, _parentName, _extendsFrom, _text, _sandboxSourceCode,
  _isBasicObject, _isBasicArray, _isBasicSet, _isBasicMap, _isBasicUint8Array, _isArbitraryObject,
  _isUndefined, _isBoolean, _isIntrinsic, _isSerializable, _protoLen, _checkArgument, _checkState,
  _anonymizeSourceCode, _deanonymizeSourceCode, _isAnonymous, _getOwnProperty, _hasOwnProperty,
  _setOwnProperty, _ownGetters, _ownMethods, _sameJig, _hasJig, _addJigs, _subtractJigs, _limit,
  _Timeout
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
  // _checkArgument
  // ----------------------------------------------------------------------------------------------

  describe('_checkArgument', () => {
    it('pass', () => {
      _checkArgument(true)
      _checkArgument(1)
    })

    // ------------------------------------------------------------------------

    it('fail', () => {
      expect(() => _checkArgument(false)).to.throw(Run.errors.ArgumentError)
      expect(() => _checkArgument(false, 'hello')).to.throw('hello')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _checkState
  // ----------------------------------------------------------------------------------------------

  describe('_checkState', () => {
    it('pass', () => {
      _checkState(true)
      _checkState(1)
    })

    // ------------------------------------------------------------------------

    it('fail', () => {
      expect(() => _checkState(false)).to.throw(Run.errors.StateError)
      expect(() => _checkState(false, 'world')).to.throw('world')
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

    it('converts', () => {
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
  })

  // ----------------------------------------------------------------------------------------------
  // _isBasicObject
  // ----------------------------------------------------------------------------------------------

  describe('_isBasicObject', () => {
    it('returns whether basic object', () => {
      expect(_isBasicObject({})).to.equal(true)
      expect(_isBasicObject(null)).to.equal(false)
      expect(_isBasicObject(new class {}())).to.equal(false)
      expect(_isBasicObject([])).to.equal(false)
      expect(_isBasicObject(1)).to.equal(false)
      expect(_isBasicObject(Symbol.hasInstance)).to.equal(false)
      expect(_isBasicObject(function () { })).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isBasicArray
  // ----------------------------------------------------------------------------------------------

  describe('_isBasicArray', () => {
    it('returns whether basic array', () => {
      expect(_isBasicArray([])).to.equal(true)
      expect(_isBasicArray(new SI.Array())).to.equal(true)
      expect(_isBasicArray(new class C extends Array {}())).to.equal(false)
      expect(_isBasicArray({})).to.equal(false)
      expect(_isBasicArray(null)).to.equal(false)
      expect(_isBasicArray(new class {}())).to.equal(false)
      expect(_isBasicArray('hello')).to.equal(false)
      expect(_isBasicArray(Symbol.hasInstance)).to.equal(false)
      expect(_isBasicArray(class A { })).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isBasicSet
  // ----------------------------------------------------------------------------------------------

  describe('_isBasicSet', () => {
    it('returns whether basic set', () => {
      expect(_isBasicSet(new Set())).to.equal(true)
      expect(_isBasicSet(new Set([1, 2, 3]))).to.equal(true)
      expect(_isBasicSet(new SI.Set())).to.equal(true)
      expect(_isBasicSet(new (class Set2 extends Set {})())).to.equal(false)
      expect(_isBasicSet([])).to.equal(false)
      expect(_isBasicSet(new Map())).to.equal(false)
      expect(_isBasicSet(new (class Set {})())).to.equal(false)
      expect(_isBasicSet(null)).to.equal(false)
      expect(_isBasicSet('Set')).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isBasicMap
  // ----------------------------------------------------------------------------------------------

  describe('_isBasicMap', () => {
    it('returns whether basic map', () => {
      expect(_isBasicMap(new Map())).to.equal(true)
      expect(_isBasicMap(new Map([[1, 2]]))).to.equal(true)
      expect(_isBasicMap(new SI.Map())).to.equal(true)
      expect(_isBasicMap(new (class Map2 extends Map {})())).to.equal(false)
      expect(_isBasicMap([])).to.equal(false)
      expect(_isBasicMap(new Set())).to.equal(false)
      expect(_isBasicMap(new (class Map {})())).to.equal(false)
      expect(_isBasicMap(null)).to.equal(false)
      expect(_isBasicMap('Map')).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isBasicUint8Array
  // ----------------------------------------------------------------------------------------------

  describe('_isBasicUint8Array', () => {
    it('returns whether basic uint8array', () => {
      expect(_isBasicUint8Array(new Uint8Array())).to.equal(true)
      expect(_isBasicUint8Array(new Uint8Array([1, 2, 3]))).to.equal(true)
      expect(_isBasicUint8Array(new SI.Uint8Array())).to.equal(true)
      expect(_isBasicMap(new (class Buffer extends Uint8Array {})())).to.equal(false)
      expect(_isBasicUint8Array(Buffer.alloc(1))).to.equal(false)
      expect(_isBasicUint8Array([])).to.equal(false)
      expect(_isBasicUint8Array({})).to.equal(false)
      expect(_isBasicUint8Array(null)).to.equal(false)
      expect(_isBasicUint8Array(new class {}())).to.equal(false)
      expect(_isBasicUint8Array('hello')).to.equal(false)
      expect(_isBasicUint8Array(Symbol.hasInstance)).to.equal(false)
      expect(_isBasicUint8Array(class A { })).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isArbitraryObject
  // ----------------------------------------------------------------------------------------------

  describe('_isArbitraryObject', () => {
    it('returns whether arbitrary object', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(_isArbitraryObject(new CA())).to.equal(true)
      expect(_isArbitraryObject(new A())).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('non-arbitrary objects', () => {
      expect(_isArbitraryObject(new Map())).to.equal(false)
      expect(_isArbitraryObject(new Set())).to.equal(false)
      expect(_isArbitraryObject(null)).to.equal(false)
      expect(_isArbitraryObject({ $arb: 1 })).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('jigs', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(_isArbitraryObject(new CA())).to.equal(false)
      expect(_isArbitraryObject(new A())).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it.skip('berries', () => {
      // TODO
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isUndefined
  // ----------------------------------------------------------------------------------------------

  describe('_isUndefined', () => {
    it('returns whether undefined', () => {
      expect(_isUndefined()).to.equal(true)
      expect(_isUndefined(undefined)).to.equal(true)
      expect(_isUndefined(null)).to.equal(false)
      expect(_isUndefined(0)).to.equal(false)
      expect(_isUndefined({})).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isBoolean
  // ----------------------------------------------------------------------------------------------

  describe('_isBoolean', () => {
    it('returns whether boolean', () => {
      expect(_isBoolean(true)).to.equal(true)
      expect(_isBoolean(false)).to.equal(true)
      expect(_isBoolean()).to.equal(false)
      expect(_isBoolean('true')).to.equal(false)
      expect(_isBoolean(null)).to.equal(false)
      expect(_isBoolean(0)).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isIntrinsic
  // ----------------------------------------------------------------------------------------------

  describe('_isIntrinsic', () => {
    it('true for intrinsic', () => {
      expect(_isIntrinsic(Math)).to.equal(true)
      expect(_isIntrinsic(Set)).to.equal(true)
      expect(_isIntrinsic(RegExp)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('true for sandbox intrinsic', () => {
      expect(_isIntrinsic(SI.Object)).to.equal(true)
      expect(_isIntrinsic(SI.Uint8Array)).to.equal(true)
      expect(_isIntrinsic(SI.Date)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('false for non-intrinsic', () => {
      expect(_isIntrinsic(class A { })).to.equal(false)
      expect(_isIntrinsic(function f () { })).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('false for intrinsic instance', () => {
      expect(_isIntrinsic({})).to.equal(false)
      expect(_isIntrinsic([])).to.equal(false)
      expect(_isIntrinsic(new Set())).to.equal(false)
      expect(_isIntrinsic(new Map())).to.equal(false)
      expect(_isIntrinsic(new Date())).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isSerializable
  // ----------------------------------------------------------------------------------------------

  describe('_isSerializable', () => {
    it('true if serializable', () => {
      const run = new Run()
      expect(_isSerializable(undefined)).to.equal(true)
      expect(_isSerializable(true)).to.equal(true)
      expect(_isSerializable(false)).to.equal(true)
      expect(_isSerializable(0)).to.equal(true)
      expect(_isSerializable(1)).to.equal(true)
      expect(_isSerializable(-1.5)).to.equal(true)
      expect(_isSerializable(NaN)).to.equal(true)
      expect(_isSerializable(Infinity)).to.equal(true)
      expect(_isSerializable(-Infinity)).to.equal(true)
      expect(_isSerializable(-0)).to.equal(true)
      expect(_isSerializable('')).to.equal(true)
      expect(_isSerializable('abc')).to.equal(true)
      expect(_isSerializable('😃')).to.equal(true)
      expect(_isSerializable(null)).to.equal(true)
      expect(_isSerializable({})).to.equal(true)
      expect(_isSerializable([])).to.equal(true)
      expect(_isSerializable(new Set())).to.equal(true)
      expect(_isSerializable(new Map())).to.equal(true)
      expect(_isSerializable(new Uint8Array())).to.equal(true)
      expect(_isSerializable(new SI.Set())).to.equal(true)
      expect(_isSerializable(new SI.Map())).to.equal(true)
      expect(_isSerializable(new SI.Uint8Array())).to.equal(true)
      expect(_isSerializable(run.deploy(class A {}))).to.equal(true)
      expect(_isSerializable(new (class A extends Jig { })())).to.equal(true)
      expect(_isSerializable(new (run.deploy(class A { }))())).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('false if unserializable', () => {
      expect(_isSerializable(new RegExp())).to.equal(false)
      expect(_isSerializable(Math)).to.equal(false)
      expect(_isSerializable(Date)).to.equal(false)
      expect(_isSerializable(new Date())).to.equal(false)
      expect(_isSerializable(new Uint16Array())).to.equal(false)
      expect(_isSerializable(class A { })).to.equal(false)
      expect(_isSerializable(class A extends Jig { })).to.equal(false)
      expect(_isSerializable(function f () { })).to.equal(false)
      expect(_isSerializable(() => { })).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isAnonymous
  // ----------------------------------------------------------------------------------------------

  describe('_isAnonymous', () => {
    it('true if anonymous', () => {
      const A = class { }
      const f = function () { }
      const g = () => { }
      expect(_isAnonymous(A)).to.equal(true)
      expect(_isAnonymous(f)).to.equal(true)
      expect(_isAnonymous(g)).to.equal(true)
      expect(_isAnonymous(() => { })).to.equal(true)
      expect(_isAnonymous(x => x)).to.equal(true)
      expect(_isAnonymous(class { })).to.equal(true)
      expect(_isAnonymous(class extends A { })).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('false if non-anonymous', () => {
      expect(_isAnonymous(0)).to.equal(false)
      expect(_isAnonymous(true)).to.equal(false)
      expect(_isAnonymous(null)).to.equal(false)
      expect(_isAnonymous(undefined)).to.equal(false)
      expect(_isAnonymous('function f() { }')).to.equal(false)
      expect(_isAnonymous({})).to.equal(false)
      expect(_isAnonymous(function f () { })).to.equal(false)
      expect(_isAnonymous(class A { })).to.equal(false)
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
  })

  // ----------------------------------------------------------------------------------------------
  // _hasOwnProperty
  // ----------------------------------------------------------------------------------------------

  describe('_hasOwnProperty', () => {
    it('returns property exists', () => {
      class A { }
      A.n = 1
      expect(_hasOwnProperty(A, 'n')).to.equal(true)
      expect(_hasOwnProperty({ n: 1 }, 'n')).to.equal(true)
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
  // _sameJig
  // ----------------------------------------------------------------------------------------------

  describe('_sameJig', () => {
    it('true if same', () => {
      const run = new Run()
      const A = run.deploy(class A { })
      expect(_sameJig(A, A)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('true if different instances of same jig', async () => {
      const run = new Run()
      const A = run.deploy(class A { })
      await A.sync()
      const A2 = await run.load(A.location)
      expect(_sameJig(A, A2)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('throws if different jigs', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      class B extends Jig { }
      const a = new A()
      const a2 = new A()
      const b = new B()
      expect(_sameJig(a, a2)).to.equal(false)
      expect(_sameJig(a, b)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('throws if different locations', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _sameJig(a, a2)).to.throw('Inconsistent worldview')
    })

    // ------------------------------------------------------------------------

    it('false if non-jig', () => {
      expect(_sameJig({}, {})).to.equal(false)
      expect(_sameJig(null, null)).to.equal(false)
      class A { }
      expect(_sameJig(A, A)).to.equal(false)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _hasJig
  // ----------------------------------------------------------------------------------------------

  describe('_hasJig', () => {
    it('returns true if jig in array', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      expect(_hasJig([a], a)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns false for nonjig', () => {
      const o = { }
      expect(_hasJig([o], o)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('return false if jig not in array', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      expect(_hasJig([{}], a)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('throws if inconsistent worldview', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _hasJig([a], a2)).to.throw('Inconsistent worldview')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _addJigs
  // ----------------------------------------------------------------------------------------------

  describe('_addJigs', () => {
    it('adds jigs once', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const a2 = await run.load(a.location)
      const arr = [a]
      const b = new A()
      expect(_addJigs(arr, [a2, b])).to.deep.equal([a, b])
    })

    // ------------------------------------------------------------------------

    it('throws if inconsistent worldview', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _addJigs([a], [a2])).to.throw('Inconsistent worldview')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _subtractJigs
  // ----------------------------------------------------------------------------------------------

  describe('_subtractJigs', () => {
    it('removes same jigs', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const a2 = await run.load(a.location)
      const b = new A()
      const arr = [a, b]
      expect(_subtractJigs(arr, [a2, b])).to.deep.equal([])
    })

    // ------------------------------------------------------------------------

    it('throws if inconsistent worldview', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _subtractJigs([a], [a2])).to.throw('Inconsistent worldview')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _limit
  // ----------------------------------------------------------------------------------------------

  describe('_limit', () => {
    it('limits values', () => {
      expect(_limit(null)).to.equal(Number.MAX_VALUE)
      expect(_limit(Infinity)).to.equal(Number.MAX_VALUE)
      expect(_limit(0)).to.equal(0)
      expect(_limit(10)).to.equal(10)
      expect(_limit(Number.MAX_SAFE_INTEGER)).to.equal(Number.MAX_SAFE_INTEGER)
    })

    // ------------------------------------------------------------------------

    it('throws if invalid', () => {
      expect(() => _limit()).to.throw('Invalid limit')
      expect(() => _limit(-1)).to.throw('Invalid limit')
      expect(() => _limit(-Infinity)).to.throw('Invalid limit')
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
})
