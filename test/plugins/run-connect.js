/**
 * run-connect.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { NETWORK } = require('../env/config')
const Run = require('../env/run')
const { RunConnect } = Run.plugins

// ------------------------------------------------------------------------------------------------
// RunConnect
// ------------------------------------------------------------------------------------------------

describe('RunConnect', () => {
  // RunConnect is only supported on mainnet and testnet
  if (NETWORK !== 'main' && NETWORK !== 'test') return

  // --------------------------------------------------------------------------
  // time
  // --------------------------------------------------------------------------

  describe('time', () => {
    it('block transaction', async () => {
      const blockchain = new RunConnect({ network: NETWORK })
      const time = await blockchain.time('71b4c5ec629456a041705a35b1b2ae143df7f968f8b5039a7c6047a2323b445c')
      expect(time).to.equal(1615835686)
    })
  })
})

// ------------------------------------------------------------------------------------------------
