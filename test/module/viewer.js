/**
 * viewer.js
 *
 * Tests for lib/module/viewer.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { PrivateKey, PublicKey, Transaction } = require('bsv')
const Run = require('../env/run')
const { Viewer, StandardLock } = Run

// ------------------------------------------------------------------------------------------------
// Viewer
// ------------------------------------------------------------------------------------------------

describe('Viewer', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('address owners', () => {
      const address = new PrivateKey().toAddress().toString()
      const viewer = new Viewer(address)
      expect(viewer.lock instanceof StandardLock).to.equal(true)
      expect(viewer.lock.address).to.equal(address)
    })

    // ------------------------------------------------------------------------

    it('pubkey owners', () => {
      const pubkey = new PrivateKey().publicKey.toString()
      const address = new PublicKey(pubkey).toAddress().toString()
      const viewer = new Viewer(pubkey)
      expect(viewer.lock instanceof StandardLock).to.equal(true)
      expect(viewer.lock.address).to.equal(address)
    })

    // ------------------------------------------------------------------------

    it('lock object owners', () => {
      class CustomLock {
        script () { return new Uint8Array([0, 1, 2]) }
        domain () { return 1 }
      }
      const lock = new CustomLock()
      const viewer = new Viewer(lock)
      expect(viewer.lock).to.deep.equal(lock)
    })

    // ------------------------------------------------------------------------

    it('throws if owner is invalid', () => {
      expect(() => new Viewer()).to.throw('Invalid owner: undefined')
      expect(() => new Viewer(null)).to.throw('Invalid owner: null')
      expect(() => new Viewer(new (class {})())).to.throw('Invalid owner: [anonymous object]')
    })
  })

  // --------------------------------------------------------------------------
  // nextOwner
  // --------------------------------------------------------------------------

  describe('nextOwner', () => {
    it('always returns the lock', () => {
      class CustomLock {
        script () { return new Uint8Array([0, 1, 2]) }
        domain () { return 1 }
      }
      const lock = new CustomLock()
      const viewer = new Viewer(lock)
      expect(viewer.nextOwner()).to.equal(lock)
    })
  })

  // --------------------------------------------------------------------------
  // sign
  // --------------------------------------------------------------------------

  describe('sign', () => {
    it('does not sign', async () => {
      const address = new PrivateKey().toAddress().toString()
      const viewer = new Viewer(address)
      const tx = new Transaction()
      const hashBefore = tx.hash
      expect(await viewer.sign(tx, [])).to.equal(tx)
      expect(tx.hash).to.equal(hashBefore)
    })
  })
})

// ------------------------------------------------------------------------------------------------
