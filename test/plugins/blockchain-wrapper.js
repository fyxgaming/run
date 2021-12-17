/**
 * blockchain-wrapper.js
 *
 * Tests for lib/plugins/blockchain-wrapper.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
require('chai').use(require('chai-as-promised'))
const { stub } = require('sinon')
const bsv = require('bsv')
const Run = require('../env/run')
const { BlockchainWrapper } = Run.plugins
const unmangle = require('../env/unmangle')
const Log = unmangle(unmangle(Run)._Log)

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function stubBlockchain () {
  return stub({
    network: 'abc',
    broadcast: () => {},
    fetch: () => {},
    utxos: () => {},
    spends: () => {},
    time: () => {}
  })
}

function mockTransaction () {
  return new bsv.Transaction()
    .from({ txid: '0000000000000000000000000000000000000000000000000000000000000000', vout: 0, script: '', satoshis: 0 })
    .to(new bsv.PrivateKey().toAddress(), 0)
}

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
      const blockchain = stubBlockchain()
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
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      const rawtx = tx.toString()
      const txid = tx.hash
      blockchain.broadcast.returns(txid)
      const response = await wrapper.broadcast(rawtx)
      expect(response).to.equal(txid)
    })

    // ------------------------------------------------------------------------

    it('logs call with txid', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      blockchain.broadcast.returns(tx.hash)
      await wrapper.broadcast(tx.toString())
      expect(logger.info.args.some(args => args.join(' ').includes(`[Blockchain] Broadcast ${tx.hash}`))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('logs with class name', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const tx = mockTransaction()
      class MyBlockchain extends BlockchainWrapper {
        get network () { 'abc' }
        broadcast () { return tx.hash }
        fetch () { }
        utxos () { }
        spends () { }
        time () { }
      }
      const wrapper = new MyBlockchain()
      await wrapper.broadcast(tx.toString())
      expect(logger.info.args.some(args => args.join(' ').includes(`[MyBlockchain] Broadcast ${tx.hash}`))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('logs performance in debug', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      blockchain.broadcast.returns(tx.hash)
      await wrapper.broadcast(tx.toString())
      expect(logger.debug.args.some(args => args.join(' ').includes('[Blockchain] Broadcast (end): '))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('validates txid response matches in debug mode', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      const rawtx = tx.toString()
      blockchain.broadcast.returns('0000000000000000000000000000000000000000000000000000000000000000')
      await expect(wrapper.broadcast(rawtx)).to.be.rejectedWith('Txid response mismatch')
    })

    // ------------------------------------------------------------------------

    it('validates tx is valid', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      await expect(wrapper.broadcast('abc')).to.be.rejectedWith('Invalid transaction')
    })

    // ------------------------------------------------------------------------

    it('accepts bsv transaction', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      blockchain.broadcast.returns(tx.hash)
      await wrapper.broadcast(tx)
    })

    // ------------------------------------------------------------------------

    it('throws if no inputs', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 0)
      await expect(wrapper.broadcast(tx.toString())).to.be.rejectedWith('tx has no inputs')
    })

    // ------------------------------------------------------------------------

    it('throws if no outputs', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = new bsv.Transaction()
        .from({ txid: '0000000000000000000000000000000000000000000000000000000000000000', vout: 0, script: '', satoshis: 0 })
      await expect(wrapper.broadcast(tx.toString())).to.be.rejectedWith('tx has no outputs')
    })

    // ------------------------------------------------------------------------

    it('throws if too big satoshis', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = new bsv.Transaction()
        .from({ txid: '0000000000000000000000000000000000000000000000000000000000000000', vout: 0, script: '', satoshis: 0 })
        .to(new bsv.PrivateKey().toAddress(), Number.MAX_SAFE_INTEGER)
      await expect(wrapper.broadcast(tx.toString())).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('throws if duplicate inputs', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = new bsv.Transaction()
        .from({ txid: '0000000000000000000000000000000000000000000000000000000000000000', vout: 0, script: '', satoshis: 0 })
        .from({ txid: '0000000000000000000000000000000000000000000000000000000000000000', vout: 0, script: '', satoshis: 0 })
        .to(new bsv.PrivateKey().toAddress(), 0)
      await expect(wrapper.broadcast(tx.toString())).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('caches time if exists', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      const rawtx = tx.toString()
      const txid = tx.hash
      blockchain.broadcast.returns(txid)
      await wrapper.broadcast(rawtx)
      const key = `time://${txid}`
      const value = await wrapper.cache.get(key)
      expect(typeof value).to.equal('number')
      expect(value > Date.now() - 1000).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('does not cache time if already exists', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      const rawtx = tx.toString()
      const txid = tx.hash
      blockchain.broadcast.returns(txid)
      const key = `time://${txid}`
      await wrapper.cache.set(key, 1234)
      await wrapper.broadcast(rawtx)
      const value = await wrapper.cache.get(key)
      expect(value).to.equal(1234)
    })

    // ------------------------------------------------------------------------

    it('caches spent inputs', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      const rawtx = tx.toString()
      const txid = tx.hash
      blockchain.broadcast.returns(txid)
      await wrapper.broadcast(rawtx)
      const key = `spend://${tx.inputs[0].prevTxId.toString('hex')}_o${tx.inputs[0].outputIndex}`
      const value = await wrapper.cache.get(key)
      expect(value).to.equal(txid)
    })

    // ------------------------------------------------------------------------

    it('caches tx', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      const rawtx = tx.toString()
      const txid = tx.hash
      blockchain.broadcast.returns(txid)
      await wrapper.broadcast(rawtx)
      const key = `tx://${txid}`
      const value = await wrapper.cache.get(key)
      expect(value).to.equal(rawtx)
    })

    // ------------------------------------------------------------------------

    it('updates recent broadcasts', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      const rawtx = tx.toString()
      const txid = tx.hash
      blockchain.broadcast.returns(txid)
      await wrapper.broadcast(rawtx)
      const key = 'config://recent-broadcasts'
      const value = await wrapper.cache.get(key)
      expect(Array.isArray(value)).to.equal(true)
      expect(value.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('does not broadcast if recently broadcast', async () => {
      const blockchain = stubBlockchain()
      const wrapper = new BlockchainWrapper(blockchain)
      const tx = mockTransaction()
      const rawtx = tx.toString()
      const txid = tx.hash
      blockchain.broadcast.returns(txid)
      await wrapper.broadcast(rawtx)
      await wrapper.broadcast(rawtx)
      expect(blockchain.broadcast.callCount).to.equal(1)
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
