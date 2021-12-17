/**
 * blockchain-wrapper.js
 *
 * Tests for lib/plugins/blockchain-wrapper.js
 */

const { describe, it } = require('mocha')

// ------------------------------------------------------------------------------------------------
// BlockchainWrapper
// ------------------------------------------------------------------------------------------------

describe('BlockchainWrapper', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it.skip('wraps methods when extended', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('wraps methods when passed in', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // broadcast
  // --------------------------------------------------------------------------

  describe('broadcast', () => {
    it.skip('wraps', () => {
      // TODO
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
    // TODO
  })

  // --------------------------------------------------------------------------
  // utxos
  // --------------------------------------------------------------------------

  describe('utxos', () => {
    // TODO
  })

  // --------------------------------------------------------------------------
  // spends
  // --------------------------------------------------------------------------

  describe('spends', () => {
    // TODO
  })

  // --------------------------------------------------------------------------
  // time
  // --------------------------------------------------------------------------

  describe('time', () => {
    // TODO
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

/*
  // ----------------------------------------------------------------------------------------------
  // _dedupUtxos
  // ----------------------------------------------------------------------------------------------

  describe('_dedupUtxos', () => {
    it('dedups utxos', () => {
      const a = { txid: '0', vout: 1, script: '2', satoshis: 3 }
      const b = { txid: '4', vout: 5, script: '6', satoshis: 7 }
      expect(_dedupUtxos([a, b, b])).to.deep.equal([a, b])
    })

    // ------------------------------------------------------------------------

    it('logs warning', () => {
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
    })

    // ------------------------------------------------------------------------

    it.only('throws if set different value', async () => {
      const cache = new LocalCache()
      const error = 'Attempt to set different values for the same key'
      const prefixes = ['jig://', 'berry://', 'tx://']
      for (const prefix of prefixes) {
        const key = prefix + Math.random().toString()
        await cache.set(key, { n: 1 })
        await expect(cache.set(key, 0)).to.be.rejectedWith(error)
        await expect(cache.set(key, 'hello')).to.be.rejectedWith(error)
        await expect(cache.set(key, { n: 2 })).to.be.rejectedWith(error)
        await expect(cache.set(key, { n: 1, m: 2 })).to.be.rejectedWith(error)
        await cache.set(key, { n: 1 })
      }
    })
  })
  */
