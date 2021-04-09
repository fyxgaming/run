/**
 * network.js
 *
 * Tests for lib/util/network.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const bsv = require('bsv')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const {
  _dedupRequest, _cacheResponse, _dedupUtxos, _addToBroadcastCache, _updateUtxosWithBroadcasts
} = unmangle(unmangle(Run)._network)

// ------------------------------------------------------------------------------------------------
// Network
// ------------------------------------------------------------------------------------------------

describe('Network', () => {
  // ----------------------------------------------------------------------------------------------
  // _dedupRequest
  // ----------------------------------------------------------------------------------------------

  describe('_dedupRequest', () => {
    it('returns same result', async () => {
      const cache = {}
      let resolver = null
      let count = 0
      const f = () => new Promise((resolve, reject) => { count++; resolver = resolve })
      const key = '123'
      const result = 'abc'
      const promise1 = _dedupRequest(cache, key, f)
      expect(key in cache).to.equal(true)
      const promise2 = _dedupRequest(cache, key, f)
      resolver(result)
      expect(count).to.equal(1)
      expect(await promise1).to.equal(result)
      expect(await promise2).to.equal(result)
      expect(key in cache).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns same error', async () => {
      const cache = {}
      let rejecter = null
      let count = 0
      const error = new Error('abc')
      const f = () => new Promise((resolve, reject) => { count++; rejecter = reject })
      const key = '123'
      const promise1 = _dedupRequest(cache, key, f)
      expect(key in cache).to.equal(true)
      const promise2 = _dedupRequest(cache, key, f)
      rejecter(error)
      expect(count).to.equal(1)
      await expect(promise1).to.be.rejectedWith(error)
      await expect(promise2).to.be.rejectedWith(error)
      expect(key in cache).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('does not dedup after completion', async () => {
      const cache = {}
      let resolver = null
      let count = 0
      const f = () => new Promise((resolve, reject) => { count++; resolver = resolve })
      const key = '123'
      const promise1 = _dedupRequest(cache, key, f)
      resolver('abc')
      expect(await promise1).to.equal('abc')
      const promise2 = _dedupRequest(cache, key, f)
      resolver('def')
      expect(await promise2).to.equal('def')
      expect(count).to.equal(2)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _cacheResponse
  // ----------------------------------------------------------------------------------------------

  describe('_cacheResponse', () => {
    it('caches result', async () => {
      const cache = {}
      let count = 0
      const f = async () => { count++; return 'abc' }
      expect(await _cacheResponse(cache, '123', 10, f)).to.equal('abc')
      expect(await _cacheResponse(cache, '123', 10, f)).to.equal('abc')
      expect(count).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('caches error', async () => {
      const cache = {}
      let count = 0
      const error = new Error('abc')
      const f = async () => { count++; throw error }
      await expect(_cacheResponse(cache, '123', 10, f)).to.be.rejectedWith(error)
      await expect(_cacheResponse(cache, '123', 10, f)).to.be.rejectedWith(error)
      expect(count).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('expires result', async () => {
      const cache = {}
      let count = 0
      const f = async () => { count++; return 'abc' }
      expect(await _cacheResponse(cache, '123', 1, f)).to.equal('abc')
      await new Promise((resolve, reject) => setTimeout(resolve, 10))
      expect(await _cacheResponse(cache, '123', 1, f)).to.equal('abc')
      expect(count).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('expires error', async () => {
      const cache = {}
      let count = 0
      const error = new Error('abc')
      const f = async () => { count++; throw error }
      await expect(_cacheResponse(cache, '123', 1, f)).to.be.rejectedWith(error)
      await new Promise((resolve, reject) => setTimeout(resolve, 10))
      await expect(_cacheResponse(cache, '123', 1, f)).to.be.rejectedWith(error)
      expect(count).to.equal(2)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _dedupUtxos
  // ----------------------------------------------------------------------------------------------

  describe('_dedupUtxos', () => {
    it('dedups utxos', () => {
      const a = { txid: '0', vout: 1, script: '2', satoshis: 3 }
      const b = { txid: '4', vout: 5, script: '6', satoshis: 7 }
      expect(_dedupUtxos([a, b, b])).to.deep.equal([a, b])
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _addToBroadcastQueue
  // ----------------------------------------------------------------------------------------------

  describe('_addToBroadcastQueue', () => {
    it('adds new transaction', () => {
      const broadcasts = []
      const tx = new bsv.Transaction()
      tx.to(new bsv.PrivateKey().toAddress(), 100)
      _addToBroadcastCache(broadcasts, 1000, tx.hash, tx)
      expect(broadcasts.length).to.equal(1)
      expect(broadcasts[0].txid).to.equal(tx.hash)
      expect(broadcasts[0].tx).to.equal(tx)
    })

    // ------------------------------------------------------------------------

    it('does not add duplicate', () => {
      const broadcasts = []
      const tx = new bsv.Transaction()
      tx.to(new bsv.PrivateKey().toAddress(), 100)
      _addToBroadcastCache(broadcasts, 1000, tx.hash, tx)
      _addToBroadcastCache(broadcasts, 1000, tx.hash, tx)
      expect(broadcasts.length).to.equal(1)
      expect(broadcasts[0].txid).to.equal(tx.hash)
      expect(broadcasts[0].tx).to.equal(tx)
    })

    // ------------------------------------------------------------------------

    it('filters expired', async () => {
      const broadcasts = []
      const tx1 = new bsv.Transaction()
      tx1.to(new bsv.PrivateKey().toAddress(), 100)
      _addToBroadcastCache(broadcasts, 10, tx1.hash, tx1)
      await new Promise((resolve, reject) => setTimeout(resolve, 100))
      const tx2 = new bsv.Transaction()
      tx2.to(new bsv.PrivateKey().toAddress(), 100)
      _addToBroadcastCache(broadcasts, 10, tx2.hash, tx2)
      expect(broadcasts.length).to.equal(1)
      expect(broadcasts[0].txid).to.equal(tx2.hash)
      expect(broadcasts[0].tx).to.equal(tx2)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _updateUtxosWithBroadcasts
  // ----------------------------------------------------------------------------------------------

  describe('_updateUtxosWithBroadcasts', () => {
    it('removes spent utxos', () => {
      const broadcasts = []
      const address1 = new bsv.PrivateKey().toAddress()
      const address2 = new bsv.PrivateKey().toAddress()
      const tx1 = new bsv.Transaction()
      tx1.to(address1, 100)
      const utxos = [{ txid: tx1.hash, vout: 0, script: tx1.outputs[0].script, satoshis: tx1.outputs[0].satoshis }]
      const tx2 = new bsv.Transaction()
      tx2.from(utxos[0])
      tx2.to(address2, 200)
      _addToBroadcastCache(broadcasts, 100, tx2.hash, tx2)
      const utxos2 = _updateUtxosWithBroadcasts(broadcasts, 1000, utxos, new bsv.Script(address1))
      expect(utxos2.length).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('adds unspent utxos in broadcasts', () => {
      const utxos = []
      const broadcasts = []
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction()
      tx.to(address, 100)
      _addToBroadcastCache(broadcasts, 100, tx.hash, tx)
      const utxos2 = _updateUtxosWithBroadcasts(broadcasts, 1000, utxos, new bsv.Script(address))
      expect(utxos2.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('does not add spent utxos in broadcasts', () => {
      const broadcasts = []
      const address = new bsv.PrivateKey().toAddress()
      const tx1 = new bsv.Transaction()
      tx1.to(address, 100)
      const utxos = [{ txid: tx1.hash, vout: 0, script: tx1.outputs[0].script, satoshis: tx1.outputs[0].satoshis }]
      const tx2 = new bsv.Transaction()
      tx2.from(utxos[0])
      tx2.to(address, 200)
      _addToBroadcastCache(broadcasts, 100, tx2.hash, tx2)
      const utxos2 = _updateUtxosWithBroadcasts(broadcasts, 1000, utxos, new bsv.Script(address))
      expect(utxos2.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it.skip('filters expired', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
