/**
 * blockchain-wrapper.js
 *
 * Tests for lib/plugins/blockchain-wrapper.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { stub } = require('sinon')
const bsv = require('bsv')
const Run = require('../env/run')
const { BlockchainWrapper } = Run.plugins

// ------------------------------------------------------------------------------------------------
// BlockchainWrapper
// ------------------------------------------------------------------------------------------------

describe('BlockchainWrapper', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('wraps methods when extended', () => {
      class MyBlockchain extends BlockchainWrapper {
        get network () { 'abc' }
        broadcast () { }
        fetch () { }
        utxos () { }
        spends () { }
        time () { }
      }
      const wrapper = new MyBlockchain()
      expect(wrapper.broadcast).not.to.equal(MyBlockchain.prototype.broadcast)
      expect(wrapper.fetch).not.to.equal(MyBlockchain.prototype.fetch)
      expect(wrapper.utxos).not.to.equal(MyBlockchain.prototype.utxos)
      expect(wrapper.spends).not.to.equal(MyBlockchain.prototype.spends)
      expect(wrapper.time).not.to.equal(MyBlockchain.prototype.time)
      expect(wrapper.network).to.equal(MyBlockchain.prototype.network)
    })

    // ------------------------------------------------------------------------

    it('wraps methods when passed in', () => {
      const blockchain = stub({
        network: 'abc',
        broadcast: () => {},
        fetch: () => {},
        utxos: () => {},
        spends: () => {},
        time: () => {}
      })
      const wrapper = new BlockchainWrapper(blockchain)
      expect(wrapper.broadcast).not.to.equal(blockchain.broadcast)
      expect(wrapper.fetch).not.to.equal(blockchain.fetch)
      expect(wrapper.utxos).not.to.equal(blockchain.utxos)
      expect(wrapper.spends).not.to.equal(blockchain.spends)
      expect(wrapper.time).not.to.equal(blockchain.time)
      expect(wrapper.network).to.equal(blockchain.network)
    })
  })

  // --------------------------------------------------------------------------
  // broadcast
  // --------------------------------------------------------------------------

  describe('broadcast', () => {
    it('wraps', async () => {
      const blockchain = stub({
        network: 'abc',
        broadcast: () => {},
        fetch: () => {},
        utxos: () => {},
        spends: () => {},
        time: () => {}
      })
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = new bsv.Transaction()
        .from({ txid: '0000000000000000000000000000000000000000000000000000000000000000', vout: 0, script: '', satoshis: 0 })
        .to(new bsv.PrivateKey().toAddress(), 0)
      const rawtx = tx.toString()
      const txid = tx.hash
      blockchain.broadcast.returns(txid)
      const response = await wrapper.broadcast(rawtx)
      expect(response).to.equal(txid)
    })

    // ------------------------------------------------------------------------

    it.skip('logs call', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs with class name', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs performance in debug', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates txid in debug mode', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates tx is valid', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('accepts bsv transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if no inputs', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if no outputs', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if too big satoshis', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if duplicate inputs', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if coinbase', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches time if exists', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('does not cache time if exists', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches spent inputs', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches tx', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('updates recent broadcasts', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('does not broadcast if recently broadcast', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // fetch
  // --------------------------------------------------------------------------

  describe('fetch', () => {
    it.skip('wraps', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs call', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs performance in debug', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates txid', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates response', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('gets from cache if exists', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches tx', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches spends', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // utxos
  // --------------------------------------------------------------------------

  describe('utxos', () => {
    it.skip('wraps', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs call', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs performance in debug', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates script', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('accepts bsv script', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('accepts address', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('accepts bsv address', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates response', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('dedups utxos', () => {
      // TODO

      /*
      const a = { txid: '0', vout: 1, script: '2', satoshis: 3 }
      const b = { txid: '4', vout: 5, script: '6', satoshis: 7 }
      expect(_dedupUtxos([a, b, b])).to.deep.equal([a, b])
      */
    })

    // ------------------------------------------------------------------------

    it.skip('logs warning if dupped utxos', () => {
      // TODO

      /*
      const Log = unmangle(unmangle(Run)._Log)
      const previousLogger = Log._logger
      try {
        Log._logger = stub({ warn: () => {} })
        const a = { txid: 'abc', vout: 1, script: '2', satoshis: 3 }
        expect(_dedupUtxos([a, a])).to.deep.equal([a])
        const lastWarning = Log._logger.warn.lastCall.args.join(' ')
        expect(lastWarning.includes('[bsv] Duplicate utxo returned from server: abc_o1')).to.equal(true)
      } finally {
        Log._logger = previousLogger
      }
      */
    })

    // ------------------------------------------------------------------------

    it.skip('corrects utxos with recent broadcasts', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // spends
  // --------------------------------------------------------------------------

  describe('spends', () => {
    it.skip('wraps', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs call', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs performance in debug', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates location', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates response', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('gets from cache if exists', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches spend', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // time
  // --------------------------------------------------------------------------

  describe('time', () => {
    it.skip('wraps', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs call', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs performance in debug', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates txid', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates response', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('gets from cache if exists', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches time', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // setWrappingEnabled
  // --------------------------------------------------------------------------

  describe('setWrappingEnabled', () => {
    it.skip('disable', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('reenable', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
