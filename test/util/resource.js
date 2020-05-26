/**
 * resource.js
 *
 * Tests for lib/util/resource.js
 */

const { PrivateKey, Transaction } = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { StandardLock } = Run
const { unmangle } = require('../env/unmangle')
const {
  _location,
  _satoshis,
  _owner
} = unmangle(unmangle(Run)._util)

// ------------------------------------------------------------------------------------------------
// _location
// ------------------------------------------------------------------------------------------------

describe('_location', () => {
  // TODO
  console.log(_location)
})

// ------------------------------------------------------------------------------------------------
// _satoshis
// ------------------------------------------------------------------------------------------------

describe('_satoshis', () => {
  it('should support allowed values', () => {
    expect(() => _satoshis(0)).not.to.throw()
    expect(() => _satoshis(1)).not.to.throw()
    expect(() => _satoshis(Transaction.DUST_AMOUNT)).not.to.throw()
    expect(() => _satoshis(100000000)).not.to.throw()
  })

  it('should throw if bad satoshis', () => {
    expect(() => _satoshis()).to.throw('satoshis must be a number')
    expect(() => _satoshis(-1)).to.throw('satoshis must be non-negative')
    expect(() => _satoshis('0')).to.throw('satoshis must be a number')
    expect(() => _satoshis([0])).to.throw('satoshis must be a number')
    expect(() => _satoshis(1.5)).to.throw('satoshis must be an integer')
    expect(() => _satoshis(NaN)).to.throw('satoshis must be an integer')
    expect(() => _satoshis(Infinity)).to.throw('satoshis must be an integer')
    expect(() => _satoshis(100000001)).to.throw('satoshis must be <= 100000000')
  })
})

// ------------------------------------------------------------------------------------------------
// _owner
// ------------------------------------------------------------------------------------------------

describe('_owner', () => {
  it('should support valid owners on different networks', () => {
    for (const bsvNetwork of ['mainnet', 'testnet']) {
      const privkey = new PrivateKey(bsvNetwork)
      const pubkey = privkey.publicKey.toString()
      const addr = privkey.toAddress().toString()
      const bytes = new StandardLock(addr).script()
      expect(_owner(pubkey).script()).to.deep.equal(bytes)
      expect(_owner(addr).script()).to.deep.equal(bytes)
      expect(_owner(new StandardLock(addr)).script()).to.deep.equal(bytes)
    }
  })

  it('should throw if bad owner', () => {
    expect(() => _owner()).to.throw('Invalid owner: undefined')
    expect(() => _owner(123)).to.throw('Invalid owner: 123')
    expect(() => _owner('hello')).to.throw('Invalid owner: "hello"')
    expect(() => _owner(new PrivateKey())).to.throw('Invalid owner')
    expect(() => _owner(new PrivateKey().publicKey)).to.throw('Invalid owner')
    expect(() => _owner([new PrivateKey().publicKey.toString()])).to.throw('Invalid owner')
  })
})

// ------------------------------------------------------------------------------------------------
