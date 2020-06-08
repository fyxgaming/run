/**
 * type.js
 *
 * Tests for lib/util/type.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const { _sourceCode } = unmangle(unmangle(Run)._util)

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
