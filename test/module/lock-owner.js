/**
 * lock-owner.js
 *
 * Tests for lib/module/lock-owner.js
 */

const { describe, it } = require('mocha')

// ------------------------------------------------------------------------------------------------
// LockOwner
// ------------------------------------------------------------------------------------------------

describe('LockOwner', () => {
  describe('constructor', () => {
    it('should throw if owner is invalid', () => {
      // TODO
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
