/**
 * blockchain.js
 *
 * Universal blockchain API test suite
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const { Run } = require('./config')

const { blockchain } = new Run()

describe('Blockchain', () => {
  describe('broadcast', () => {
    it('should support sending to self', async () => {
      // const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      const tx = new bsv.Transaction()
      await blockchain.broadcast(tx)
    })
  })
})
