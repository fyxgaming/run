/**
 * misc.js
 *
 * Tests for lib/kernel/misc.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Sandbox = Run.sandbox
const {
  _kernel, _assert, _bsvNetwork, _parent, _text, _sourceCode, _isBasicObject, _isBasicArray,
  _isUndefined, _isBoolean, _protoLen
} = unmangle(unmangle(Run)._misc)

describe('Misc', () => {
  // ----------------------------------------------------------------------------------------------
  // _kernel
  // ----------------------------------------------------------------------------------------------

  describe('_kernel', () => {
    it('return active run kernel', () => {
      const run = unmangle(new Run())
      expect(_kernel()).to.equal(run._kernel)
    })

    it('should throw if no run instance is active', () => {
      new Run().deactivate() // eslint-disable-line
      expect(() => _kernel()).to.throw('Run instance not active')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _assert
  // ----------------------------------------------------------------------------------------------

  describe('_kernel', () => {
    it('should not throw if assert passes', () => {
      _assert(true)
      _assert(1)
    })

    it('should throw if assert fails', () => {
      expect(() => _assert(false)).to.throw()
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _bsvNetwork
  // ----------------------------------------------------------------------------------------------

  describe('_bsvNetwork', () => {
    it('should return appropriate network', () => {
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
    it('should get parent class', () => {
      class B { }
      class A extends B { }
      expect(_parent(A)).to.equal(B)
    })

    it('should return undefined when no parent', () => {
      expect(_parent(function () { })).to.equal(undefined)
      expect(_parent(class {})).to.equal(undefined)
    })

    it('should return undefined for non-functions', () => {
      expect(_parent(null)).to.equal(undefined)
      expect(_parent(0)).to.equal(undefined)
      expect(_parent('hello')).to.equal(undefined)
      expect(_parent([])).to.equal(undefined)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _isBasicObject
  // ----------------------------------------------------------------------------------------------

  describe('_isBasicObject', () => {
    it('should return whether value is a basic object', () => {
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
    it('should return whether value is a basic array', () => {
      expect(_isBasicArray([])).to.equal(true)
      expect(_isBasicArray(new Sandbox._intrinsics.Array())).to.equal(true)
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
  // _isUndefined
  // ----------------------------------------------------------------------------------------------

  describe('_isUndefined', () => {
    it('should return whether value is undefined', () => {
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
    it('should return whether value is a boolean', () => {
      expect(_isBoolean(true)).to.equal(true)
      expect(_isBoolean(false)).to.equal(true)
      expect(_isBoolean()).to.equal(false)
      expect(_isBoolean('true')).to.equal(false)
      expect(_isBoolean(null)).to.equal(false)
      expect(_isBoolean(0)).to.equal(false)
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
  // _text
  // ----------------------------------------------------------------------------------------------

  describe('_text', () => {
    it('should create short names', () => {
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
  // _sourceCode
  // ----------------------------------------------------------------------------------------------

  describe('_sourceCode', () => {
  // Node 8 and Node 12 have slightly different spacing for getNormalizedSourceCode('function () { return 1 }')
  // We don't need the normalized code to always be exactly the same, as long as it functions the same.
  // Compiled build also add semicolons, so we normlize that too.

    function expectNormalizedSourceCode (type, text) {
      const normalize = str => str.replace(/\s+/g, '').replace(/;/g, '')
      expect(normalize(_sourceCode(type))).to.equal(normalize(text))
    }

    it('should get code for basic class', () => {
      class A {}
      expectNormalizedSourceCode(A, 'class A {}')
    })

    it('should get code for basic function', () => {
      function f () { return 1 }
      expectNormalizedSourceCode(f, 'function f () { return 1 }')
    })

    it('should get code for class that extends another class', () => {
      const SomeLibrary = { B: class B { } }
      class A extends SomeLibrary.B {}
      expectNormalizedSourceCode(A, 'class A extends B {}')
    })

    it('should get code for single-line class', () => {
      class B { }
      class A extends B { f () {} }
      expectNormalizedSourceCode(A, 'class A extends B { f () {} }')
    })

    it('should get code for method', () => {
      class B { f () { } }
      expectNormalizedSourceCode(B.prototype.f, 'function f() { }')
    })
  })

  // ----------------------------------------------------------------------------------------------
})
