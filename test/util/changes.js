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
      const changes = unmangle(new Changes())
      const o = {}
      changes._set(o, o, 'a', 1)
      expect(o.a).to.equal(1)
    })

    it('makes changes to arrays', () => {
      const changes = unmangle(new Changes())
      const o = {}
      changes._set(o, o, 'a', 1)
      expect(o.a).to.equal(1)
    })
  })

  describe('rollback', () => {
    it('rolls back object sets while preserving order', () => {

    })
  })

  describe('diff', () => {
    it('detects object adds', () => {
      const changes = unmangle(new Changes())
      const o = {}
      changes._set(o, o, 'a', 1)
      expect(changes._diff()).to.deep.equal(new Set([o]))
    })

    it('detects object sets', () => {
      const changes = unmangle(new Changes())
      const o = { a: 1 }
      changes._set(o, o, 'a', 2)
      expect(changes._diff()).to.deep.equal(new Set([o]))
    })

    it('detects object deletes', () => {
      const changes = unmangle(new Changes())
      const o = { a: 1 }
      changes._delete(o, o, 'a')
      expect(changes._diff()).to.deep.equal(new Set([o]))
    })

    it('detects object reorders', () => {

    })

    it('detects reverts', () => {

    })
  })
})

// ------------------------------------------------------------------------------------------------
