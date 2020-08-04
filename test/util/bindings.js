/**
 * bindings.js
 *
 * Tests for lib/kernel/bindings.js
 */

const { PrivateKey, Transaction } = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { StandardLock } = Run
const unmangle = require('../env/unmangle')
const { _location, _nonce, _satoshis, _owner, _init } = unmangle(unmangle(Run)._bindings)

describe('Bindings', () => {
  // ----------------------------------------------------------------------------------------------
  // _location
  // ----------------------------------------------------------------------------------------------

  describe('_location', () => {
    it('should parse valid locations', () => {
      // Jigs
      expect(_location('abc_o0')).to.deep.equal({ txid: 'abc', vout: 0 })
      expect(_location('abc_d1')).to.deep.equal({ txid: 'abc', vdel: 1 })
      expect(_location('native://Jig')).to.deep.equal({ native: 'Jig' })
      // Local jigs
      expect(_location('_o10')).to.deep.equal({ vout: 10 })
      expect(_location('_d1')).to.deep.equal({ vdel: 1 })
      // Berries
      expect(_location('abc_o0_')).to.deep.equal({ txid: 'abc', vout: 0, berry: '' })
      expect(_location('abc_o0_def')).to.deep.equal({ txid: 'abc', vout: 0, berry: 'def' })
      expect(_location('abc_o0_def_o2')).to.deep.equal({ txid: 'abc', vout: 0, berry: 'def_o2' })
      expect(_location('abc_d0_def')).to.deep.equal({ txid: 'abc', vdel: 0, berry: 'def' })
      // Partial berries
      expect(_location('_o0_def')).to.deep.equal({ vout: 0, berry: 'def' })
      expect(_location('_d0_def_o2')).to.deep.equal({ vdel: 0, berry: 'def_o2' })
      expect(_location('_d2_')).to.deep.equal({ vdel: 2, berry: '' })
      // Errors
      expect(_location('error://')).to.deep.equal({ error: '' })
      expect(_location('error://Something bad happened')).to.deep.equal({ error: 'Something bad happened' })
      expect(_location('error://line1\nline2')).to.deep.equal({ error: 'line1\nline2' })
      expect(_location('error://Undeployed')).to.deep.equal({ error: 'Undeployed', undeployed: true })
      // Record locations
      expect(_location('commit://abc_o1')).to.deep.equal({ commitid: 'commit://abc', vout: 1 })
      expect(_location('commit://abc_d2')).to.deep.equal({ commitid: 'commit://abc', vdel: 2 })
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
      expect(() => _location('abc_i0')).to.throw()
      expect(() => _location('abc_r0')).to.throw()
      expect(() => _location('abc_j0')).to.throw()
      expect(() => _location('abc_o')).to.throw()
      expect(() => _location('abc_i')).to.throw()
      expect(() => _location('abc_0')).to.throw()
      expect(() => _location('abc_a0')).to.throw()
      expect(() => _location('_abc_o0')).to.throw()
      expect(() => _location('_i0')).to.throw()
      expect(() => _location('_r0')).to.throw()
      expect(() => _location('commit://abc_o')).to.throw()
      expect(() => _location('commit://abc_0')).to.throw()
      expect(() => _location('commit://abc_j1')).to.throw()
      expect(() => _location('commit://_o1')).to.throw()
      expect(() => _location('commit://_d2')).to.throw()
      expect(() => _location('native://')).to.throw()
      expect(() => _location('native://!')).to.throw()
      // Invalid chars
      expect(() => _location('$_o1')).to.throw()
      expect(() => _location('abc_o*')).to.throw()
      expect(() => _location('abc-o1')).to.throw()
      // Bad protocols
      expect(() => _location('commit:abc_o1')).to.throw()
      expect(() => _location('tmp://abc_o1')).to.throw()
      expect(() => _location('error:/abc_o1')).to.throw()
      expect(() => _location('err://abc_o1')).to.throw()
      expect(() => _location('nat://Jig')).to.throw()
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _nonce
  // ----------------------------------------------------------------------------------------------

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

  // ----------------------------------------------------------------------------------------------
  // _owner
  // ----------------------------------------------------------------------------------------------

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

  // ----------------------------------------------------------------------------------------------
  // _satoshis
  // ----------------------------------------------------------------------------------------------

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

  // ----------------------------------------------------------------------------------------------
  // _init
  // ----------------------------------------------------------------------------------------------

  describe('_init', () => {
    it('should initialize undeployed bindings', () => {
      const o = {}
      _init(o)
      expect(o.origin).to.equal('error://Undeployed')
      expect(o.location).to.equal('error://Undeployed')
      expect(o.nonce).to.equal(-1)
      expect(o.owner).to.deep.equal(unmangle.mangle({ _value: undefined }))
      expect(o.satoshis).to.deep.equal(unmangle.mangle({ _value: undefined }))
    })
  })

  // ----------------------------------------------------------------------------------------------
})
