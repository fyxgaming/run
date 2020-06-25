/**
 * bindings.js
 *
 * Tests for lib/util/binding.js
 */

const { PrivateKey, Transaction } = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { StandardLock } = Run
const { unmangle } = require('../env/unmangle')
const { _location, _nonce, _satoshis, _owner } = unmangle(unmangle(Run)._util)

// ------------------------------------------------------------------------------------------------
// _location
// ------------------------------------------------------------------------------------------------

describe('_location', () => {
  const USER = 1
  const JIG = 2
  const BERRY = 4

  it('should parse valid locations', () => {
    // Jigs
    expect(_location('abc_o0')).to.deep.equal({ txid: 'abc', vout: 0 })
    expect(_location('abc_i1')).to.deep.equal({ txid: 'abc', vin: 1 })
    expect(_location('abc_d0')).to.deep.equal({ txid: 'abc', vdel: 0 })
    expect(_location('native://Jig')).to.deep.equal({ native: 'Jig' })
    // Partial jigs
    expect(_location('_o10')).to.deep.equal({ vout: 10 })
    expect(_location('_i20')).to.deep.equal({ vin: 20 })
    expect(_location('_d1')).to.deep.equal({ vdel: 1 })
    // Berries
    expect(_location('abc_o0_')).to.deep.equal({ txid: 'abc', vout: 0, path: '' })
    expect(_location('abc_o0_def')).to.deep.equal({ txid: 'abc', vout: 0, path: 'def' })
    expect(_location('abc_o0_def_o2')).to.deep.equal({ txid: 'abc', vout: 0, path: 'def_o2' })
    expect(_location('abc_d0_def')).to.deep.equal({ txid: 'abc', vdel: 0, path: 'def' })
    // Partial berries
    expect(_location('_o0_def')).to.deep.equal({ vout: 0, path: 'def' })
    expect(_location('_i0_def_o2')).to.deep.equal({ vin: 0, path: 'def_o2' })
    expect(_location('_d2_def')).to.deep.equal({ vdel: 2, path: 'def' })
    // Errors
    expect(_location('error://')).to.deep.equal({ error: '' })
    expect(_location('error://Something bad happened')).to.deep.equal({ error: 'Something bad happened' })
    expect(_location('error://line1\nline2')).to.deep.equal({ error: 'line1\nline2' })
    // Record locations
    expect(_location('record://abc_o1')).to.deep.equal({ record: 'record://abc', vout: 1 })
    expect(_location('record://abc_d1')).to.deep.equal({ record: 'record://abc', vdel: 1 })
  })

  it('should throw for invalid locations', () => {
    // Invalid types
    expect(() => _location()).to.throw()
    expect(() => _location(1)).to.throw()
    expect(() => _location({})).to.throw()
    expect(() => _location(null)).to.throw()
    // Bad structure
    expect(() => _location('abc')).to.throw()
    expect(() => _location('abc_')).to.throw()
    expect(() => _location('abc_o')).to.throw()
    expect(() => _location('abc_i')).to.throw()
    expect(() => _location('abc_0')).to.throw()
    expect(() => _location('abc_a0')).to.throw()
    expect(() => _location('_abc_o0')).to.throw()
    expect(() => _location('record://abc_o')).to.throw()
    expect(() => _location('record://abc_0')).to.throw()
    expect(() => _location('record://_o1')).to.throw()
    expect(() => _location('record://_i2')).to.throw()
    expect(() => _location('native://')).to.throw()
    expect(() => _location('native://!')).to.throw()
    // Invalid chars
    expect(() => _location('$_o1')).to.throw()
    expect(() => _location('abc_o*')).to.throw()
    expect(() => _location('abc-o1')).to.throw()
    // Bad protocols
    expect(() => _location('record:abc_o1')).to.throw()
    expect(() => _location('tmp://abc_o1')).to.throw()
    expect(() => _location('error:/abc_o1')).to.throw()
    expect(() => _location('err://abc_o1')).to.throw()
    expect(() => _location('nat://Jig')).to.throw()
  })

  it('should accept matching flags', () => {
    // Jig
    _location('abc_o1', JIG)
    _location('_o1', JIG)
    _location('_i2', JIG)
    _location('record://abc_o1', JIG)
    _location('native://Jig', JIG)
    _location('native://Berry', JIG)
    // Berry
    _location('abc_o1_', BERRY)
    _location('abc_o1_def', BERRY)
    _location('_i1_def', BERRY)
    // User
    _location('abc_o1', USER)
    _location('abc_o1_def', USER)
    _location('abc_d2', USER)
    _location('native://Jig', USER)
    _location('native://Berry', USER)
    // Jig and User
    _location('abc_o1', USER)
  })

  it('should throw when flags dont match', () => {
    // Jig
    expect(() => _location('abc_o1_', JIG)).to.throw()
    expect(() => _location('error://', JIG)).to.throw()
    // Berry
    expect(() => _location('abc_o1', BERRY)).to.throw()
    expect(() => _location('error://', BERRY)).to.throw()
    expect(() => _location('record://abc_o1_def', BERRY)).to.throw()
    expect(() => _location('native://Berry', BERRY)).to.throw()
    // User
    expect(() => _location('_o1', USER)).to.throw()
    expect(() => _location('_i1', USER)).to.throw()
    expect(() => _location('_o1_def', USER)).to.throw()
    // Jig and User
    expect(() => _location('abc_o1_', USER | JIG)).to.throw()
    expect(() => _location('_o1', USER | JIG)).to.throw()
  })
})

// ------------------------------------------------------------------------------------------------
// _nonce
// ------------------------------------------------------------------------------------------------

describe('_nonce', () => {
  it('supports valid nonce', () => {
    _nonce(1)
    _nonce(Number.MAX_SAFE_INTEGER)
  })

  it('throws if invalid nonce', () => {
    expect(() => _nonce(0)).to.throw()
    expect(() => _nonce(-1)).to.throw()
    expect(() => _nonce(1.5)).to.throw()
    expect(() => _nonce(Infinity)).to.throw()
    expect(() => _nonce(NaN)).to.throw()
    expect(() => _nonce(null)).to.throw()
    expect(() => _nonce()).to.throw()
    expect(() => _nonce('2')).to.throw()
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
