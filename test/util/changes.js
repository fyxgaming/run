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
      expect(changes._setAdd(s, s, 'a')).to.equal(s)
      expect(s.has('a')).to.equal(true)
    })
  })

  describe('setDelete', () => {
    it('deletes from set', () => {
      const changes = unmangle(new Changes())
      const s = new Set([1])
      expect(changes._setDelete(s, s, 1)).to.equal(true)
      expect(s.has(1)).to.equal(false)
    })

    it('does not delete missing entry', () => {
      const changes = unmangle(new Changes())
      const s = new Set([1])
      expect(changes._setDelete(s, s, 'a')).to.equal(false)
      expect(s.has(1)).to.equal(true)
    })
  })

  describe('setClear', () => {
    it('clears set', () => {
      const changes = unmangle(new Changes())
      const s = new Set([1, 2])
      changes._setClear(s, s)
      expect(s.size).to.equal(0)
    })
  })

  describe('mapSet', () => {
    it('sets to map', () => {
      const changes = unmangle(new Changes())
      const m = new Map()
      expect(changes._mapSet(m, m, 'a', 'b')).to.equal(m)
      expect(m.get('a')).to.equal('b')
    })
  })

  describe('mapDelete', () => {
    it('deletes from map', () => {
      const changes = unmangle(new Changes())
      const m = new Map([[1, 2]])
      expect(changes._mapDelete(m, m, 1)).to.equal(true)
      expect(m.has(1)).to.equal(false)
    })

    it('does not delete missing entry', () => {
      const changes = unmangle(new Changes())
      const m = new Map([[1, 2]])
      expect(changes._mapDelete(m, m, 'a')).to.equal(false)
      expect(m.has(1)).to.equal(true)
    })
  })

  describe('mapClear', () => {
    it('clears map', () => {
      const changes = unmangle(new Changes())
      const m = new Map([[1, 2], [[], {}]])
      changes._mapClear(m, m)
      expect(m.size).to.equal(0)
    })
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

    it('rolls back changed sets', () => {

    })

    it('preserves set order', () => {

    })

    it('rolls back cleared sets', () => {

    })

    it('rolls back changed maps', () => {

    })

    it('preserves map order', () => {

    })

    it('rolls back cleared maps', () => {

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
      const changes = unmangle(new Changes())
      const a = [0]
      changes._set(a, a, 1000, 'a')
      expect(changes._diff()).to.deep.equal(new Set([a]))
    })

    it('detects array changes to custom properties', () => {
      const changes = unmangle(new Changes())
      const a = [0]
      changes._set(a, a, 'n', 1)
      expect(changes._diff()).to.deep.equal(new Set([a]))
    })

    it('detects set adds', () => {
      const changes = unmangle(new Changes())
      const s = new Set()
      changes._setAdd(s, s, 'n')
      expect(changes._diff()).to.deep.equal(new Set([s]))
    })

    it('detects set deletes', () => {
      const changes = unmangle(new Changes())
      const a = []
      const s = new Set([a])
      changes._setDelete(s, s, a)
      expect(changes._diff()).to.deep.equal(new Set([s]))
    })

    it('detects set reorders', () => {
      const changes = unmangle(new Changes())
      const s = new Set([1, 2])
      changes._setClear(s, s)
      changes._setAdd(s, s, 2)
      changes._setAdd(s, s, 1)
      expect(changes._diff()).to.deep.equal(new Set([s]))
    })

    it('detects cleared sets', () => {
      const changes = unmangle(new Changes())
      const s = new Set([1, 2])
      changes._setClear(s, s)
      expect(changes._diff()).to.deep.equal(new Set([s]))
    })

    it('detects clears on empty sets', () => {
      const changes = unmangle(new Changes())
      const s = new Set()
      changes._setClear(s, s)
      expect(changes._diff()).to.deep.equal(new Set([]))
    })

    it('detect set properties', () => {
      const changes = unmangle(new Changes())
      const s = new Set()
      changes._set(s, s, 'a', 1)
      expect(changes._diff()).to.deep.equal(new Set([s]))
    })

    it('detects reverted set changes', () => {
      const changes = unmangle(new Changes())
      const s = new Set()
      changes._setAdd(s, s, 'a')
      changes._setDelete(s, s, 'a')
      expect(changes._diff()).to.deep.equal(new Set([]))
    })

    it('detects map sets', () => {
      const changes = unmangle(new Changes())
      const m = new Map()
      changes._mapSet(m, m, 'n', 1)
      expect(changes._diff()).to.deep.equal(new Set([m]))
    })

    it('detects map deletes', () => {
      const changes = unmangle(new Changes())
      const m = new Map([[1, 2]])
      changes._mapDelete(m, m, 1)
      expect(changes._diff()).to.deep.equal(new Set([m]))
    })

    it('detects map reorders', () => {
      const changes = unmangle(new Changes())
      const m = new Map([[1, 2], [3, 4]])
      changes._mapDelete(m, m, 1)
      changes._mapDelete(m, m, 3)
      changes._mapSet(m, m, 3, 4)
      changes._mapSet(m, m, 1, 2)
      expect(changes._diff()).to.deep.equal(new Set([m]))
    })

    it('detects reverted map changes', () => {
      const changes = unmangle(new Changes())
      const m = new Map([[1, 2]])
      changes._mapDelete(m, m, 1)
      changes._mapSet(m, m, 1, 2)
      expect(changes._diff()).to.deep.equal(new Set([]))
    })

    it('detects cleared maps', () => {
      const changes = unmangle(new Changes())
      const m = new Map([[1, 2]])
      changes._mapClear(m, m)
      expect(changes._diff()).to.deep.equal(new Set([m]))
    })

    it('detects clears on empty maps', () => {
      const changes = unmangle(new Changes())
      const m = new Map([])
      changes._mapClear(m, m)
      expect(changes._diff()).to.deep.equal(new Set([]))
    })

    it('detect map properties', () => {
      const changes = unmangle(new Changes())
      const m = new Map([])
      m.n = 1
      changes._delete(m, m, 'n')
      expect(changes._diff()).to.deep.equal(new Set([m]))
    })
  })

  // Different owner tests
})

// ------------------------------------------------------------------------------------------------
