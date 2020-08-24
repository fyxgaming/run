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
  describe('constructor', () => {
    it('creates proxy', () => {
      // TODO
    })
  })

  describe('errors', () => {
    it('throws if jig errors on jig', () => {
      const p = new Membrane({}, 'jig')
      p.location = 'error://oops'
      console.log(p.x)
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
