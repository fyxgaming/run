/**
 * standard-lock.js
 *
 * Tests for lib/kernel/standard-lock.js
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { StandardLock } = Run

// ------------------------------------------------------------------------------------------------
// StandardLock
// ------------------------------------------------------------------------------------------------

describe('StandardLock', () => {
  describe('script', () => {
    it('should create script for valid addresses', () => {
      new StandardLock('14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1').script() // eslint-disable-line
      new StandardLock('mhZZFmSiUqcmf8wQrBNjPAVHUCFsHso9ni').script() // eslint-disable-line
    })

    it('throws if bad address', () => {
      expect(() => new StandardLock().script()).to.throw('Address is not a string')
      expect(() => new StandardLock([]).script()).to.throw('Address is not a string')
      expect(() => new StandardLock('3P14159f73E4gFr7JterCCQh9QjiTjiZrG').script()).to.throw('Address may only be a P2PKH type')
      expect(() => new StandardLock('mhZZFmSiUqcmf8wQrBNjPAVHUCFsHso9n').script()).to.throw('Address may only be a P2PKH type')
      expect(() => new StandardLock('@').script()).to.throw('Invalid character in address')
      expect(() => new StandardLock('3P14').script()).to.throw('Address too short: 3P14')
    })

    it('should correctly return P2PKH buffer', () => {
      const addr = '14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1'
      const script = bsv.Script.fromAddress(addr)
      const buffer1 = new Uint8Array(script.toBuffer())
      const buffer2 = new StandardLock(addr).script()
      expect(buffer1).to.deep.equal(buffer2)
    })
  })

  describe('domain', () => {
    it('should return P2PKH unlock script max size', () => {
      expect(new StandardLock('14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1').domain()).to.equal(108)
    })
  })
})

// ------------------------------------------------------------------------------------------------
