/**
 * bsv.js
 *
 * Tests for lib/util/bsv.js
 */

const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { _calculateDust } = unmangle(unmangle(Run)._bsv)

// ------------------------------------------------------------------------------------------------
// bsv
// ------------------------------------------------------------------------------------------------

describe('bsv', () => {
  // --------------------------------------------------------------------------
  // _calculateDust
  // --------------------------------------------------------------------------

  describe('_calculateDust', () => {
    it('p2pkh', () => {
      expect(_calculateDust(25, 1000)).to.equal(546)
    })

    // ------------------------------------------------------------------------

    it('p2pkh with lower relay fee', () => {
      expect(_calculateDust(25, 500)).to.equal(273)
    })

    // ------------------------------------------------------------------------

    it('custom script', () => {
      expect(_calculateDust(1000, 1000)).to.equal(3477)
    })
  })
})

// ------------------------------------------------------------------------------------------------
