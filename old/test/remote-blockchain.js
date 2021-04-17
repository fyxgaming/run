/**
 * blockchain-server.js
 *
 * Tests for lib/plugins/blockchain-server.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { PrivateKey, Script } = require('bsv')
const Run = require('../../test/env/run')
const unmangle = require('../../test/env/unmangle')
const { RemoteBlockchain } = Run.plugins

// ------------------------------------------------------------------------------------------------
// RemoteBlockchain
// ------------------------------------------------------------------------------------------------

describe('RemoteBlockchain', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    // ------------------------------------------------------------------------
    // lastBlockchain
    // ------------------------------------------------------------------------

    describe('lastBlockchain', () => {
      it('should support passing different last blockchain', () => {
        const lastBlockchain = { cache: {} }
        expect(RemoteBlockchain.create({ lastBlockchain }).cache).not.to.equal(lastBlockchain.cache)
      })

      // ----------------------------------------------------------------------

      it('should only copy cache if same network', async () => {
        const testnet1 = RemoteBlockchain.create({ network: 'test' })
        // Fill the cache with one transaction
        await testnet1.fetch('78db863a75faf35190b3524842abeaa835ed5a5a025df62f275fab63881791bb')
        const testnet2 = RemoteBlockchain.create({ network: 'test', lastBlockchain: testnet1 })
        const mainnet = RemoteBlockchain.create({ network: 'main', lastBlockchain: testnet2 })
        expect(testnet2.cache).to.deep.equal(testnet1.cache)
        expect(mainnet.cache).not.to.equal(testnet2.cache)
      })
    })
  })

  // --------------------------------------------------------------------------
  // utxos
  // --------------------------------------------------------------------------

  describe('utxos', () => {
    it('should correct for server returning duplicates', async () => {
      const address = new PrivateKey('mainnet').toAddress().toString()
      const script = Script.fromAddress(address)
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      const blockchain = RemoteBlockchain.create({ api: 'whatsonchain' })
      unmangle(blockchain)._getUtxos = async () => {
        const utxo = { txid, vout: 0, satoshis: 0, script: '' }
        return [utxo, utxo]
      }
      let lastWarning = null
      const Log = unmangle(unmangle(Run)._Log)
      Log._logger = { warn: (time, tag, ...warning) => { lastWarning = warning.join(' ') } }
      const utxos = await blockchain.utxos(script)
      expect(utxos.length).to.equal(1)
      expect(lastWarning).to.equal(`[Network] Duplicate utxo returned from server: ${txid}_o0`)
      Log._logger = Log._defaultLogger
    })
  })
})

// ------------------------------------------------------------------------------------------------
