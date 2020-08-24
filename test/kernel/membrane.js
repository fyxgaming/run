/**
 * membrane.js
 *
 * Tests for lib/kernel/membrane.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Membrane = unmangle(Run)._Membrane

// ------------------------------------------------------------------------------------------------
// Membrane
// ------------------------------------------------------------------------------------------------

describe('Membrane', () => {
  describe('errors', () => {
    it('throws if jig errors on jig', () => {
      console.log(Membrane)
    })

    it('throws if jig errors on inner object', () => {
      // TODO
    })

    it('does not throw if no errors', () => {
      // TODO
    })
  })

  describe('admin', () => {
    it('admin mode runs directly on target', () => {
      // TODO
    })

    it('admin mode overrides errors', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
