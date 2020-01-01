const bsv = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('./run')
const { createRun } = require('./helpers')
const runBlockchainTestSuite = require('./blockchain')
const { Api } = Run

// sample transactions with spent outputs in mined blocks on each network
const sampleTransactions = {
  main: {
    txid: 'afc557ef2970af0b5fb8bc1a70a320af425c7a45ca5d40eac78475109563c5f8',
    blockhash: '000000000000000005609907e3092b92882c522fffb0705c73e91ddc3a6941ed',
    blocktime: 1556620117,
    time: 1556620117000,
    minConfirmations: 15000,
    vout: [{
      spentTxId: '26fb663eeb8d3cd407276b045a8d71da9f625ef3dca66f51cb047d97a8cad3a6',
      spentIndex: 0,
      spentHeight: 580333
    }]
  },
  test: {
    txid: 'acf2d978febb09e3a0d5817f180b19df675a0e95f75a2a1efeec739ebff865a7',
    blockhash: '00000000000001ffaf368388b7ac954a562bd76fe39f6e114b171655273a38a7',
    blocktime: 1556695666,
    time: 1556695666000,
    minConfirmations: 18000,
    vout: [{
      spentTxId: '806444d15f416477b00b6bbd937c02ff3c8f8c5e09dae28425c87a8a0ef58af0',
      spentIndex: 0,
      spentHeight: 1298618
    }]
  },
  stn: {
    txid: 'a40ee613c5982d6b39d2425368eb2375f49b38a45b457bd72db4ec666d96d4c6'
  }
}

const networks = ['main', 'test']

const errors = {
  noInputs: 'tx has no inputs',
  noOutputs: 'tx has no outputs',
  feeTooLow: 'tx fee too low',
  notFullySigned: 'tx not fully signed',
  duplicateInput: /transaction input [0-9]* duplicate input/,
  missingInput: 'Missing inputs'
}

networks.forEach(network => {
  describe(`Star (${network})`, () => {
    const run = createRun({ network, blockchain: 'star' })
    runBlockchainTestSuite(run.blockchain, run.purse.privkey,
      sampleTransactions[network], true /* supportsSpentTxIdInBlocks */,
      true /* supportsSpentTxIdInMempool */, 0 /* indexingLatency */, errors)
  })
})

networks.forEach(network => {
  describe(`BitIndex (${network})`, () => {
    const run = createRun({ network, blockchain: 'bitindex' })
    runBlockchainTestSuite(run.blockchain, run.purse.privkey,
      sampleTransactions[network], true /* supportsSpentTxId */,
      true /* supportsSpentTxIdInMempool */, 1000 /* indexingLatency */, errors)
  })
})

networks.forEach(network => {
  describe(`WhatsOnChain (${network})`, () => {
    const run = createRun({ network, blockchain: 'whatsonchain' })
    runBlockchainTestSuite(run.blockchain, run.purse.privkey,
      sampleTransactions[network], false /* supportsSpentTxId */,
      false /* supportsSpentTxIdInMempool */, 1000 /* indexingLatency */, errors)
  })
})

describe('api', () => {
  describe('utxos', () => {
    it('correct for server returning duplicates', async () => {
      const address = bsv.PrivateKey('mainnet').toAddress().toString()
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      const api = { }
      api.utxosUrl = (network, address) => 'https://www.google.com'
      api.utxosResp = (data, address) => {
        const utxo = { txid, vout: 0, satoshis: 0, script: new bsv.Script() }
        return [utxo, utxo]
      }
      function warn (warning) { this.lastWarning = warning }
      const logger = { info: () => {}, warn }
      const blockchain = new Api({ network: 'main', api, logger })
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(1)
      expect(logger.lastWarning).to.equal(`duplicate utxo returned from server: ${txid}_o0`)
    })
  })
})
