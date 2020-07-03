/**
 * asm.js
 *
 * Tests for lib/extra/asm.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../../../test/env/config')
const { asm } = Run

// ------------------------------------------------------------------------------------------------
// asm
// ------------------------------------------------------------------------------------------------

describe('asm', () => {
  it('should support 21e8', () => {
    asm('e34d02244f210de0bcfd936f0f29e4a19008b3e1106f2fa6265edb3f04459d17 21e8 OP_SIZE OP_4 OP_PICK OP_SHA256 OP_SWAP OP_SPLIT OP_DROP OP_EQUALVERIFY OP_DROP OP_CHECKSIG')
  })

  it('should support single digit', () => {
    asm('a')
    asm('1')
    asm('8')
    asm('10')
  })
})

// ------------------------------------------------------------------------------------------------
