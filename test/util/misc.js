/**
 * misc.js
 *
 * Tests for lib/util/misc.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../config')
const { _deployable, _display } = Run._util

// ------------------------------------------------------------------------------------------------
// _deployable
// ------------------------------------------------------------------------------------------------

describe('_deployable', () => {
  it('should return true for allowed', () => {
    class B { }
    expect(_deployable(class A { })).to.equal(true)
    expect(_deployable(class A extends B { })).to.equal(true)
    expect(_deployable(function f () {})).to.equal(true)
    expect(_deployable(() => {})).to.equal(true)
    expect(_deployable(function () { })).to.equal(true)
    expect(_deployable(class {})).to.equal(true)
  })

  it('should return false for non-functions', () => {
    expect(_deployable()).to.equal(false)
    expect(_deployable(1)).to.equal(false)
    expect(_deployable({})).to.equal(false)
    expect(_deployable(true)).to.equal(false)
  })

  it('should return false for standard library objects', () => {
    expect(_deployable(Array)).to.equal(false)
    expect(_deployable(Uint8Array)).to.equal(false)
    expect(_deployable(Math.sin)).to.equal(false)
  })
})

// ------------------------------------------------------------------------------------------------
// _tokenType
// ------------------------------------------------------------------------------------------------

describe('_tokenType', () => {
  // TODO: add tests
})

// ------------------------------------------------------------------------------------------------
// _display
// ------------------------------------------------------------------------------------------------

describe('_display', () => {
  it('should create short names', () => {
    // Strings
    expect(_display('')).to.equal('""')
    expect(_display('abc')).to.equal('"abc"')
    expect(_display('Hello, world!')).to.equal('"Hello, wor…"')
    // Booleans
    expect(_display(true)).to.equal('true')
    expect(_display(false)).to.equal('false')
    // Numbers
    expect(_display(1)).to.equal('1')
    expect(_display(-1)).to.equal('-1')
    expect(_display(1.5)).to.equal('1.5')
    expect(_display(NaN)).to.equal('NaN')
    expect(_display(-Infinity)).to.equal('-Infinity')
    // Symbols
    expect(_display(Symbol.iterator)).to.equal('Symbol(Symbol.iterator)')
    expect(_display(Symbol.unscopables)).to.equal('Symbol(Symbol.unscopables)')
    // Undefined
    expect(_display(undefined)).to.equal('undefined')
    // Objects
    expect(_display(null)).to.equal('null')
    expect(_display({})).to.equal('[object Object]')
    expect(_display({ a: 1 })).to.equal('[object Object]')
    expect(_display([1, 2, 3])).to.equal('[object Array]')
    expect(_display(new class Dragon {}())).to.equal('[object Dragon]')
    // Functions
    expect(_display(function f () { })).to.equal('f')
    expect(_display(class A { })).to.equal('A')
    expect(_display(function () { })).to.equal('[anonymous function]')
    expect(_display(() => { })).to.equal('[anonymous function]')
    expect(_display((x, y) => { })).to.equal('[anonymous function]')
    expect(_display(_$xX123 => _$xX123)).to.equal('[anonymous function]')
    expect(_display(class { })).to.equal('[anonymous class]')
  })
})

// ------------------------------------------------------------------------------------------------
