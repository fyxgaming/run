/**
 * changes.js
 *
 * Tests for lib/util/changes.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const Changes = unmangle(unmangle(Run)._util)._Changes

// ------------------------------------------------------------------------------------------------
// Changes
// ------------------------------------------------------------------------------------------------

describe('Changes', () => {
  describe('set', () => {
    it('makes changes to objects', () => {
      const o = {}
      const changes = unmangle(new Changes())
      changes._set(o, o, 'a', 1)
      expect(o.a).to.equal(1)
    })
  })

  describe('rollback', () => {
    it('rolls back object sets while preserving order', () => {

    })
  })
})

// ------------------------------------------------------------------------------------------------
