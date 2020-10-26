/**
 * bindings.js
 *
 * Tests for lib/kernel/bindings.js
 */

const { PrivateKey, Transaction } = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { CommonLock } = Run
const unmangle = require('../env/unmangle')
const { _location, _nonce, _satoshis, _owner, _markUndeployed } = unmangle(unmangle(Run)._Bindings)

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TXID = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

// ------------------------------------------------------------------------------------------------
// Bindings
// ------------------------------------------------------------------------------------------------

describe('Bindings', () => {
  // ----------------------------------------------------------------------------------------------
  // _location
  // ----------------------------------------------------------------------------------------------

  describe('_location', () => {
    it('valid locations', () => {
      // Jigs
      expect(_location(`${TXID}_o0`)).to.deep.equal({ txid: TXID, vout: 0 })
      expect(_location(`${TXID}_d1`)).to.deep.equal({ txid: TXID, vdel: 1 })
      expect(_location('native://Jig')).to.deep.equal({ nativeid: 'native://Jig' })
      // Local jigs
      expect(_location('_o10')).to.deep.equal({ vout: 10 })
      expect(_location('_d1')).to.deep.equal({ vdel: 1 })
      // Berries
      expect(_location(`${TXID}_o0?berry=&hash=${HASH}&version=5`))
        .to.deep.equal({ txid: TXID, vout: 0, berry: '', hash: HASH, version: 5 })
      expect(_location(`${TXID}_o0?berry=abc&hash=${HASH}&version=5`))
        .to.deep.equal({ txid: TXID, vout: 0, berry: 'abc', hash: HASH, version: 5 })
      expect(_location(`${TXID}_d0?berry=${TXID}_o0&hash=${HASH}&version=5`))
        .to.deep.equal({ txid: TXID, vdel: 0, berry: `${TXID}_o0`, hash: HASH, version: 5 })
      expect(_location(`${TXID}_o0?berry=line1%0Aline2&hash=${HASH}&version=5`))
        .to.deep.equal({ txid: TXID, vout: 0, berry: 'line1\nline2', hash: HASH, version: 5 })
      expect(_location(`${TXID}_o0?berry=${encodeURIComponent('😀')}&hash=${HASH}&version=5`))
        .to.deep.equal({ txid: TXID, vout: 0, berry: '😀', hash: HASH, version: 5 })
      // Partial berries
      expect(_location(`_d1?berry=abc&hash=${HASH}&version=5`))
        .to.deep.equal({ vdel: 1, berry: 'abc', hash: HASH, version: 5 })
      // Errors
      expect(_location('error://')).to.deep.equal({ error: '' })
      expect(_location('error://Something bad happened')).to.deep.equal({ error: 'Something bad happened' })
      expect(_location('error://line1\nline2')).to.deep.equal({ error: 'line1\nline2' })
      expect(_location('error://Undeployed')).to.deep.equal({ error: 'Undeployed', undeployed: true })
      // Commit locations
      expect(_location(`commit://${TXID}_o1`)).to.deep.equal({ commitid: `commit://${TXID}`, vout: 1 })
      expect(_location(`commit://${TXID}_d2`)).to.deep.equal({ commitid: `commit://${TXID}`, vdel: 2 })
      // Record locations
      expect(_location(`record://${TXID}_o1`)).to.deep.equal({ recordid: `record://${TXID}`, vout: 1 })
      expect(_location(`record://${TXID}_d2`)).to.deep.equal({ recordid: `record://${TXID}`, vdel: 2 })
    })

    // ------------------------------------------------------------------------

    it('throws for invalid locations', () => {
      // Invalid types
      expect(() => _location()).to.throw()
      expect(() => _location(1)).to.throw()
      expect(() => _location({})).to.throw()
      expect(() => _location(null)).to.throw()
      // Bad creation structure
      expect(() => _location(`${TXID}`)).to.throw()
      expect(() => _location(`${TXID}_`)).to.throw()
      expect(() => _location(`${TXID}_i0`)).to.throw()
      expect(() => _location(`${TXID}_r0`)).to.throw()
      expect(() => _location(`${TXID}_j0`)).to.throw()
      expect(() => _location(`${TXID}_o`)).to.throw()
      expect(() => _location(`${TXID}_i`)).to.throw()
      expect(() => _location(`${TXID}_0`)).to.throw()
      expect(() => _location(`${TXID}_a0`)).to.throw()
      expect(() => _location(`_${TXID}_o0`)).to.throw()
      // Bad partial creation structure
      expect(() => _location('_i0')).to.throw()
      expect(() => _location('_r0')).to.throw()
      // Bad berry structure
      expect(() => _location(`${TXID}_o0_berry=abc&hash=${HASH}&version=5`)).to.throw()
      expect(() => _location(`${TXID}_o0?berry=abc+hash=${HASH}+version=5`)).to.throw()
      expect(() => _location(`${TXID}_o0?berry=abc&hash=${HASH}&version=0`)).to.throw()
      expect(() => _location(`${TXID}_o0?berry=abc&hash=${HASH}&version=abc`)).to.throw()
      expect(() => _location(`${TXID}_o0?hash=${HASH}&version=5`)).to.throw()
      expect(() => _location(`${TXID}_o0?berry=abc&hash=abc&version=5`)).to.throw()
      expect(() => _location(`${TXID}_o0?berry=abc&version=5`)).to.throw()
      expect(() => _location(`${TXID}_o0?berry=abc&hash=${HASH}`)).to.throw()
      expect(() => _location(`${TXID}_o0?berry=%abc&hash=${HASH}&version=5`)).to.throw()
      // Bad commit structure
      expect(() => _location(`commit://${TXID}_o`)).to.throw()
      expect(() => _location(`commit://${TXID}_0`)).to.throw()
      expect(() => _location(`commit://${TXID}_j1`)).to.throw()
      expect(() => _location('commit://_o1')).to.throw()
      expect(() => _location('commit://_d2')).to.throw()
      // Bad record structure
      expect(() => _location('record://_j2')).to.throw()
      expect(() => _location(`record://${TXID}`)).to.throw()
      // Bad record structure
      expect(() => _location('native://')).to.throw()
      expect(() => _location('native://!')).to.throw()
      // Bad lengths
      expect(() => _location('abc_o0')).to.throw()
      expect(() => _location('record://abc_o1')).to.throw()
      expect(() => _location('commit://abc_d0')).to.throw()
      // Invalid chars
      expect(() => _location('$_o1')).to.throw()
      expect(() => _location(`${TXID}_o*`)).to.throw()
      expect(() => _location(`${TXID}-o1`)).to.throw()
      expect(() => _location(`${TXID}_o0?berry=\n&hash=${HASH}&version=5`)).to.throw()
      // Bad schemes
      expect(() => _location(`commit:${TXID}_o1`)).to.throw()
      expect(() => _location(`tmp://${TXID}_o1`)).to.throw()
      expect(() => _location(`error:/${TXID}_o1`)).to.throw()
      expect(() => _location(`err://${TXID}_o1`)).to.throw()
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

    // ------------------------------------------------------------------------

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
    it('supports valid owners on different networks', () => {
      for (const bsvNetwork of ['mainnet', 'testnet']) {
        const privkey = new PrivateKey(bsvNetwork)
        const pubkey = privkey.publicKey.toString()
        const addr = privkey.toAddress().toString()
        const bytes = new CommonLock(addr).script()
        expect(_owner(pubkey).script()).to.deep.equal(bytes)
        expect(_owner(addr).script()).to.deep.equal(bytes)
        expect(_owner(new CommonLock(addr)).script()).to.deep.equal(bytes)
      }
    })

    // ------------------------------------------------------------------------

    it('throws if bad owner', () => {
      expect(() => _owner()).to.throw('Invalid owner: undefined')
      expect(() => _owner(null)).to.throw('Invalid owner: null')
      expect(() => _owner(123)).to.throw('Invalid owner: 123')
      expect(() => _owner('hello')).to.throw('Invalid owner: "hello"')
      expect(() => _owner(new PrivateKey())).to.throw('Invalid owner')
      expect(() => _owner(new PrivateKey().publicKey)).to.throw('Invalid owner')
      expect(() => _owner([new PrivateKey().publicKey.toString()])).to.throw('Invalid owner')
    })

    // ------------------------------------------------------------------------

    it('allows null', () => {
      expect(_owner(null, true)).to.equal(null)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _satoshis
  // ----------------------------------------------------------------------------------------------

  describe('_satoshis', () => {
    it('allowed values', () => {
      expect(() => _satoshis(0)).not.to.throw()
      expect(() => _satoshis(1)).not.to.throw()
      expect(() => _satoshis(Transaction.DUST_AMOUNT)).not.to.throw()
      expect(() => _satoshis(100000000)).not.to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if bad satoshis', () => {
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
  // _markUndeployed
  // ----------------------------------------------------------------------------------------------

  describe('_markUndeployed', () => {
    it('initializess undeployed bindings', () => {
      const o = {}
      _markUndeployed(o)
      expect(o.origin).to.equal('error://Undeployed')
      expect(o.location).to.equal('error://Undeployed')
      expect(o.nonce).to.equal(0)
      expect(o.owner).to.deep.equal(unmangle.mangle({ _value: undefined }))
      expect(o.satoshis).to.deep.equal(unmangle.mangle({ _value: undefined }))
    })
  })
})

// ------------------------------------------------------------------------------------------------
