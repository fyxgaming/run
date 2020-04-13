/**
 * owner.js
 *
 * Tests common for all owners
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Owner
// ------------------------------------------------------------------------------------------------

describe('Owner', () => {
  describe('next', () => {
    it('should call next for every new jig or code', async () => {
      // Hook next() to count the number of times its called
      const owner = new Run().owner
      const oldNext = owner.next
      let nextCount = 0
      owner.next = () => { nextCount++; return oldNext.call(owner) }
      // Create a jig and code
      class A extends Jig { }
      const run = new Run({ owner })
      expect(nextCount).to.equal(0)
      run.deploy(A)
      expect(nextCount).to.equal(1)
      const a = new A()
      expect(nextCount).to.equal(2)
      await a.sync()
      expect(nextCount).to.equal(2)
    })

    it('should support changing lock every call', () => {
      // And assigns to proper token
      // Deploy jigs and code together with different owners, then create one more.
    })

    it('should fail to create tokens if next throws', () => {
    })
  })

  describe('sign', () => {
    it('should support signing with custom scripts', () => {
    })

    it('should throw if script does not evaluate to true', () => {
    })

    it('should rethrow error during sign', () => {
    })

    it('should throw if partially signed', () => {
    })

    it('should pass StandardLock for address token owner', () => {
      // Jig / Code
    })

    it('should pass StandardLock for pubkey token owner', () => {
      // Jig / Code
    })

    it('should pass custom lock for custom token owner', () => {
      // Jig / Code
    })

    it('should pass custom locks with host intrinsics', () => {
      // Jig / Code
    })

    it('should pass locks for token inputs and undefined for payment inputs', () => {
      // Custom lock
      // Payment input
    })

    it('should pass all undefined for empty transaction', () => {
    })
  })

  describe('ours', () => {
    it('should support owner without ours method', () => {
    })

    it('should add to inventory if returns true', () => {
    })

    it('should not add to inventory if returns false', () => {
    })

    it('should rethrow error in sync if ours throws', () => {
    })
  })

  describe('locations', () => {
    it('should support owner without ours method', () => {
    })

    it('should use locations for inventory sync', () => {
    })

    it('should throw if locations does not return valid array', () => {
    })

    it('should log errors if locations do not load', () => {
    })
  })

  describe('lock owners', () => {
    it('should throw if Run owner is a Lock', () => {
    })

    it('should sync tokens using lock', () => {
    })

    it('should create new tokens with owner as lock', () => {
      // export
    })
  })

  describe('changing owners', () => {
    it('should call next on the new owner for new tokens', () => {
    })

    it('should use prior owner for tokens enqueued', () => {
    })

    it('should call sign on owner that was assigned when token was created', () => {
    })

    it('should create a new inventory when owner changes', () => {
    })

    it('should leave existing inventory to be saved and reassigned', () => {
    })

    it('should support changing owners within batch transaction', () => {
    })
  })
})

// ------------------------------------------------------------------------------------------------
