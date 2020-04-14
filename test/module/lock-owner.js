/**
 * lock-owner.js
 *
 * Tests for lib/module/lock-owner.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { LockOwner } = Run

// ------------------------------------------------------------------------------------------------
// LockOwner
// ------------------------------------------------------------------------------------------------

describe('LockOwner', () => {
  describe('constructor', () => {
    it('should support creating with owner and blockchain', () => {

    })

    it('should throw if owner is invalid', () => {
      expect(() => new LockOwner()).to.throw('Invalid owner: undefined')
      expect(() => new LockOwner({ owner: null })).to.throw('Invalid owner: null')
      expect(() => new LockOwner({ owner: new (class {})() })).to.throw('Invalid owner: [anonymous object]')
    })
  })

  describe('next', () => {
    it('should always return the lock', () => {
      // TODO
    })
  })

  describe('sign', () => {
    it('should log warning and not sign', () => {
      // TODO
    })
  })

  describe('locations', () => {
    it('should return utxos for locking script', () => {
      // TODO
    })

    it('should return empty array is blockchain is undefined', () => {
      // TODO
    })
  })

  describe('ours', () => {
    it('should return true for same locking scripts', () => {
      // TODO
    })

    it('should return false for different locking scripts', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
