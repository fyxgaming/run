/**
 * wrapped-cache.js
 *
 * Tests for lib/plugins/wrapped-cache.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// WrappedCache
// ------------------------------------------------------------------------------------------------

describe('WrappedCache', () => {
  it('test', () => {
    console.log(Run.plugins.WrappedCache)
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
