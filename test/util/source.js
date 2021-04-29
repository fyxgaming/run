/**
 * source.js
 *
 * Tests for lib/util/source.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { _anonymize, _deanonymize } = unmangle(unmangle(Run)._source)

// ----------------------------------------------------------------------------------------------
// Source
// ----------------------------------------------------------------------------------------------

describe('Source', () => {
  // ----------------------------------------------------------------------------------------------
  // _anonymize
  // ----------------------------------------------------------------------------------------------

  describe('_anonymize', () => {
    it('anonymizes', () => {
      expect(_anonymize('class A { }')).to.equal('class  { }')
      expect(_anonymize('class A{f(){}}')).to.equal('class {f(){}}')
      expect(_anonymize('class A extends B { }')).to.equal('class  extends B { }')
      expect(_anonymize('function f() { }')).to.equal('function () { }')
      expect(_anonymize('function f    () {\n}')).to.equal('function     () {\n}')
      expect(_anonymize('class A extends SomeLibrary.B { }')).to.equal('class  extends SomeLibrary.B { }')
      expect(_anonymize('class A extends C["B"] { }')).to.equal('class  extends C["B"] { }')
    })

    // ------------------------------------------------------------------------

    it('throws if bad source', () => {
      expect(() => _anonymize('hello world')).to.throw('Bad source code')
      expect(() => _anonymize('() => { }')).to.throw('Bad source code')
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _deanonymize
  // ----------------------------------------------------------------------------------------------

  describe('_deanonymize', () => {
    it('deanonymizes', () => {
      expect(_deanonymize('class { }', 'A')).to.equal('class A{ }')
      expect(_deanonymize('class  extends B{ }', 'A')).to.equal('class A extends B{ }')
      expect(_deanonymize('function () { }', 'f')).to.equal('function f() { }')
    })

    // ------------------------------------------------------------------------

    it('same after anonymize and deanonymize', () => {
      function test (x, n) { expect(_deanonymize(_anonymize(x), n)).to.equal(x) }
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
      expect(() => _deanonymize('hello world', '')).to.throw('Bad source code')
      expect(() => _deanonymize('() => { }', '')).to.throw('Bad source code')
      expect(() => _deanonymize('class{}', '')).to.throw('Bad source code')
    })
  })
})

// ------------------------------------------------------------------------------------------------
