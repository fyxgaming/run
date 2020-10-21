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
    it('valid addresses', () => {
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

    it('returns P2PKH script', () => {
      const addr = '14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1'
      const script = bsv.Script.fromAddress(addr)
      const hex1 = script.toHex()
      const hex2 = new StandardLock(addr).script()
      expect(hex1).to.deep.equal(hex2)
    })
  })

  describe('domain', () => {
    it('returns P2PKH unlock script max size', () => {
      expect(new StandardLock('14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1').domain()).to.equal(108)
    })
  })
})

// ------------------------------------------------------------------------------------------------
