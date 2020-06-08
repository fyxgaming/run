/**
 * type.js
 *
 * Tests for lib/util/type.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const { _text, _sourceCode } = unmangle(unmangle(Run)._util)

// ------------------------------------------------------------------------------------------------
// _text
// ------------------------------------------------------------------------------------------------

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

// ------------------------------------------------------------------------------------------------
// _sourceCode
// ------------------------------------------------------------------------------------------------

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

  // TODO: More tests
})

// ------------------------------------------------------------------------------------------------
