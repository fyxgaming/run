/**
 * lock-owner.js
 *
 * Tests for lib/module/lock-owner.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { PrivateKey, PublicKey } = require('bsv')
const { Run } = require('../env/config')
const { LockOwner, Mockchain, StandardLock } = Run

// ------------------------------------------------------------------------------------------------
// LockOwner
// ------------------------------------------------------------------------------------------------

describe('LockOwner', () => {
  describe('constructor', () => {
    it('should support address lock owners', () => {
      const blockchain = new Mockchain()
      const address = new PrivateKey().toAddress().toString()
      const addressLockOwner = new LockOwner({ owner: address, blockchain })
      expect(addressLockOwner.blockchain).to.equal(blockchain)
      expect(addressLockOwner.lock instanceof StandardLock).to.equal(true)
      expect(addressLockOwner.lock.address).to.equal(address)
    })

    it('should support pubkey lock owners', () => {
      const blockchain = new Mockchain()
      const pubkey = new PrivateKey().publicKey.toString()
      const address = new PublicKey(pubkey).toAddress().toString()
      const pubkeyLockOwner = new LockOwner({ owner: pubkey, blockchain })
      expect(pubkeyLockOwner.blockchain).to.equal(blockchain)
      expect(pubkeyLockOwner.lock instanceof StandardLock).to.equal(true)
      expect(pubkeyLockOwner.lock.address).to.equal(address)
    })

    it('should support custom lock owners', () => {
      class CustomLock { get script () { return new Uint8Array([0, 1, 2]) }}
      const blockchain = new Mockchain()
      const lock = new CustomLock()
      const lockOwner = new LockOwner({ owner: lock, blockchain })
      expect(lockOwner.blockchain).to.equal(blockchain)
      expect(lockOwner.lock).to.equal(lock)
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
