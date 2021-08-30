/**
 * bsv.js
 *
 * Tests for lib/kernel/bsv.js
 */

const bsv = require('bsv')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { _calculateDust, _scripthash, _dedupUtxos } = unmangle(unmangle(Run)._bsv)

// ------------------------------------------------------------------------------------------------
// bsv
// ------------------------------------------------------------------------------------------------

describe('bsv', () => {
  // --------------------------------------------------------------------------
  // _calculateDust
  // --------------------------------------------------------------------------

  describe('_calculateDust', () => {
    it('p2pkh', () => {
      expect(_calculateDust(25, 1000)).to.equal(546)
    })

    // ------------------------------------------------------------------------

    it('p2pkh with lower relay fee', () => {
      expect(_calculateDust(25, 500)).to.equal(273)
    })

    // ------------------------------------------------------------------------

    it('custom script', () => {
      expect(_calculateDust(1000, 1000)).to.equal(3477)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _scripthash
  // ----------------------------------------------------------------------------------------------

  describe('_scripthash', () => {
    it('calculates script hash', async () => {
      const script = bsv.Script.fromAddress('1Kc8XRNryDycwvfEQiFF2TZwD1CVhgwGy2').toHex()
      const scripthash = await _scripthash(script)
      expect(scripthash).to.equal('e3cc7609f70142ba04cc5af3ca5b189e75abe0c48c1623b49535dd28f32e530e')
    })

    // ------------------------------------------------------------------------

    it('caches result', async () => {
      const script = new bsv.PrivateKey().toAddress().toHex()
      const t0 = new Date()
      await _scripthash(script)
      const t1 = new Date()
      const first = t1 - t0
      for (let i = 0; i < 100; i++) {
        await _scripthash(script)
      }
      const t2 = new Date()
      const subsequent = (t2 - t1) / 100
      expect(subsequent < first)
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

    // ------------------------------------------------------------------------

    it('logs warning', () => {
      let lastWarning = null
      const Log = unmangle(unmangle(Run)._Log)
      Log._logger = { warn: (time, tag, ...warning) => { lastWarning = warning.join(' ') } }
      const a = { txid: 'abc', vout: 1, script: '2', satoshis: 3 }
      expect(_dedupUtxos([a, a])).to.deep.equal([a])
      expect(lastWarning).to.equal('[bsv] Duplicate utxo returned from server: abc_o1')
      Log._logger = Log._defaultLogger
    })
  })
})

// ------------------------------------------------------------------------------------------------
