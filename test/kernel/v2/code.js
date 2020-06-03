/**
 * code.js
 *
 * Tests for lib/kernel/code.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../../env/config')
const Code = Run._Code

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  it('basic test', () => {
    new Run() // eslint-disable-line
    class A {}
    const ACode = new Code(A)
    console.log(ACode)
  })
})

// ------------------------------------------------------------------------------------------------
