/**
 * jig.js
 *
 * Tests for lib/kernel/jig.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../../env/config')
const { Jig2 } = Run

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

describe('Jig', () => {
  it.only('should create basic jig', () => {
    new Run() // eslint-disable-line
    console.log(Jig2.location)
  })
})

// ------------------------------------------------------------------------------------------------
