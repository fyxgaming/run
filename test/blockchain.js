/**
 * blockchain.js
 *
 * Universal blockchain API test suite
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const { Run } = require('./config')

const run = new Run()
const { purse, blockchain } = run

describe('Blockchain', () => {
  describe('broadcast', () => {
    it('should support sending to self', async () => {
      const tx = await purse.pay(new bsv.Transaction())
      await blockchain.broadcast(tx)
    })
  })
})
