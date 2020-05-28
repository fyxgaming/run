/**
 * jig.js
 *
 * Tests for lib/kernel/jig.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const JigHandler = unmangle(Run)._JigHandler

// ------------------------------------------------------------------------------------------------
// JigHandler
// ------------------------------------------------------------------------------------------------

describe('JigHandler', () => {
  it('should test', () => {
    class A { }
    const A2 = unmangle(JigHandler)._createProxy(A)
    const a = new A2()
    expect(a instanceof A).to.equal(true)
    expect(a instanceof A2).to.equal(true)
    expect(a.constructor).not.to.equal(A)
    expect(a.constructor).to.equal(A2)
  })
})

// ------------------------------------------------------------------------------------------------
