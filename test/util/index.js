/**
 * index.js
 *
 * Tests for lib/util/index.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../config')
const { expect } = require('chai')
const { _bsvNetwork, _name } = Run._util

describe('util', () => {
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

  describe('_name', () => {
    it('should create short names', () => {
      // Strings
      expect(_name('')).to.equal('""')
      expect(_name('abc')).to.equal('"abc"')
      expect(_name('Hello, world!')).to.equal('"Hello, wor…"')
      // Booleans
      expect(_name(true)).to.equal('true')
      expect(_name(false)).to.equal('false')
      // Numbers
      expect(_name(1)).to.equal('1')
      expect(_name(-1)).to.equal('-1')
      expect(_name(1.5)).to.equal('1.5')
      expect(_name(NaN)).to.equal('NaN')
      expect(_name(-Infinity)).to.equal('-Infinity')
      // Symbols
      expect(_name(Symbol.iterator)).to.equal('Symbol(Symbol.iterator)')
      expect(_name(Symbol.unscopables)).to.equal('Symbol(Symbol.unscopables)')
      // Undefined
      expect(_name(undefined)).to.equal('undefined')
      // Objects
      expect(_name(null)).to.equal('null')
      expect(_name({})).to.equal('[object Object]')
      expect(_name({ a: 1 })).to.equal('[object Object]')
      expect(_name([1, 2, 3])).to.equal('[object Array]')
      expect(_name(new class Dragon {}())).to.equal('[object Dragon]')
      // Functions
      expect(_name(function f () { })).to.equal('f')
      expect(_name(class A { })).to.equal('A')
      expect(_name(function () { })).to.equal('[anonymous function]')
      expect(_name(() => { })).to.equal('[anonymous function]')
      expect(_name(class { })).to.equal('[anonymous class]')
    })
  })
})
