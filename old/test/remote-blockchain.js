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
