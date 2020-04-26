/**
 * hex.js
 *
 * Tests for lib/extra/hex.js
 */

const { describe, it } = require('mocha')
const deploy = require('../env/deploy')
const { Run } = require('../env/config')
const { hex } = Run

// ------------------------------------------------------------------------------------------------
// hex
// ------------------------------------------------------------------------------------------------

describe('hex', () => {
  it.skip('should deploy', async () => {
    await deploy(hex)
  })
})

// ------------------------------------------------------------------------------------------------
