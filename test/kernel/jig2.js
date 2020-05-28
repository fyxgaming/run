/**
 * jig.js
 *
 * Tests for lib/kernel/jig.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const JigHandler = unmangle(Run)._JigHandler

// ------------------------------------------------------------------------------------------------
// JigHandler
// ------------------------------------------------------------------------------------------------

describe('JigHandler', () => {
  it('should test', () => {
    console.log(JigHandler)
  })
})

// ------------------------------------------------------------------------------------------------
