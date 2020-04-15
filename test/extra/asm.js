/**
 * asm.js
 *
 * Tests for lib/extra/asm.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../env/config')
const { deploy } = require('../env/helpers')
const { asm } = Run

// ------------------------------------------------------------------------------------------------
// asm
// ------------------------------------------------------------------------------------------------

describe('asm', () => {
  it.skip('should deploy', async () => {
    await deploy(asm)
  })
})

// ------------------------------------------------------------------------------------------------
