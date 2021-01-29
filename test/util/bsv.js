/**
 * bsv.js
 *
 * Tests for lib/util/bsv.js
 */

const bsv = require('bsv')
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
      const oldFeePerKb = bsv.Transaction.FEE_PER_KB
      bsv.Transaction.FEE_PER_KB = 1000
      try {
        expect(_calculateDust(25)).to.equal(546)
      } finally {
        bsv.Transaction.FEE_PER_KB = oldFeePerKb
      }
    })

    // ------------------------------------------------------------------------

    it('p2pkh with lower relay fee', () => {
      const oldFeePerKb = bsv.Transaction.FEE_PER_KB
      bsv.Transaction.FEE_PER_KB = 500
      try {
        expect(_calculateDust(25)).to.equal(273)
      } finally {
        bsv.Transaction.FEE_PER_KB = oldFeePerKb
      }
    })

    // ------------------------------------------------------------------------

    it('custom script', () => {
      const oldFeePerKb = bsv.Transaction.FEE_PER_KB
      bsv.Transaction.FEE_PER_KB = 1000
      try {
        expect(_calculateDust(1000)).to.equal(3477)
      } finally {
        bsv.Transaction.FEE_PER_KB = oldFeePerKb
      }
    })
  })
})

// ------------------------------------------------------------------------------------------------
