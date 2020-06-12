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
      const a = []
      changes._set(a, a, 0, 1)
      expect(a[0]).to.equal(1)
    })

    it('sets on sets', () => {
      const changes = unmangle(new Changes())
      const s = new Set()
      changes._set(s, s, 'a', 1)
      expect(s.a).to.equal(1)
    })

    it('sets on maps', () => {
      const changes = unmangle(new Changes())
      const m = new Map()
      changes._set(m, m, 'm', m)
      expect(m.m).to.equal(m)
    })
  })

  describe('delete', () => {
    it('delete properties', () => {
      const changes = unmangle(new Changes())
      const s = new Set()
      s.a = 1
      changes._delete(s, s, 'a')
      expect('a' in s).to.equal(false)
      expect(typeof s.a).to.equal('undefined')
    })
  })

  describe('setAdd', () => {
    it('adds to set', () => {
      const changes = unmangle(new Changes())
      const s = new Set()
      s.a = 1
      changes._delete(s, s, 'a')
      expect('a' in s).to.equal(false)
      expect(typeof s.a).to.equal('undefined')
    })
  })

  describe('setDelete', () => {
    // TODO
  })

  describe('setClear', () => {
    // TODO
  })

  describe('mapSet', () => {
    // TODO
  })

  describe('mapDelete', () => {
    // TODO
  })

  describe('mapClear', () => {
    // TODO
  })

  describe('rollback', () => {
    it('rolls back objects', () => {
      const changes = unmangle(new Changes())
      const o = { a: 1, b: 2 }
      changes._set(o, o, 'b', 3)
      changes._delete(o, o, 'a')
      changes._rollback()
      expect(o).to.deep.equal({ a: 1, b: 2 })
    })

    it('rolls back arrays', () => {
      const changes = unmangle(new Changes())
      const a = [1]
      changes._set(a, a, 3, 3)
      changes._rollback()
      expect(a).to.deep.equal([1])
    })

    it('fixes key ordering', () => {
      const changes = unmangle(new Changes())
      const o = { a: 1, b: 2 }
      changes._delete(o, o, 'a')
      changes._set(o, o, 'a', 1)
      expect(Object.keys(o)).to.deep.equal(['b', 'a'])
      changes._rollback()
      expect(Object.keys(o)).to.deep.equal(['a', 'b'])
    })

    it('rolls back set properties', () => {

    })

    it('rolls back map properties', () => {

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
      const changes = unmangle(new Changes())
      const o = { a: 1, b: 2 }
      changes._delete(o, o, 'a')
      changes._set(o, o, 'a', 1)
      expect(changes._diff()).to.deep.equal(new Set([o]))
    })

    it('detects reverts', () => {
      const changes = unmangle(new Changes())
      const o = { a: 1, b: 2 }
      changes._delete(o, o, 'a')
      changes._set(o, o, 'a', 1)
      changes._delete(o, o, 'b')
      changes._set(o, o, 'b', 2)
      expect(changes._diff()).to.deep.equal(new Set([]))
    })

    it('detects array changes', () => {
      // TODO: Sparse
    })

    it('detects array changes to custom properties', () => {
      // TODO: Sparse
    })

    it('detect set properties', () => {

    })

    it('detect map properties', () => {

    })

    it('detects set adds', () => {

    })

    it('detects set deletes', () => {

    })

    it('detects set reorders', () => {

    })

    it('detects reverted set changes', () => {

    })

    it('detects map sets', () => {

    })

    it('detects map deletes', () => {

    })

    it('detects map reorders', () => {

    })

    it('detects reverted map changes', () => {

    })
  })

  // Different owner tests
})

// ------------------------------------------------------------------------------------------------
