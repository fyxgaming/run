/**
 * pay-server.js
 *
 * Tests for lib/module/pay-server.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { HDPrivateKey, Transaction } = require('bsv')
const { Run } = require('../env/config')
const { network } = Run.defaults
const { Jig, PayServer } = Run

// ------------------------------------------------------------------------------------------------
// Keys
// ------------------------------------------------------------------------------------------------

const apiKeys = {
  main: 'xpub68bsAQGp2VLopL8t4EowTRKtfPRpZKwiAENYckkGbXm3WHcqdCYx4aCVP6fY4GgQ7QK25XLpMenJeMHLEiZTf5XjQQKd1yNBvXhSMc6oxKe',
  test: 'tpubD9fidjoMPrsVEnYutakv62cR6acAAfWW5hTfgrEoedyijTiVkPnnkq2VyvUpx5WnssWLDrCsHYEKMvmp1nQSj8kH2AGhyeyAw1Fb3wiy8Bh'
}

// ------------------------------------------------------------------------------------------------
// PayServer
// ------------------------------------------------------------------------------------------------

describe('PayServer', () => {
  const apiKey = apiKeys[network]
  if (!apiKey) return

  describe('constructor', () => {
    it('should detect network', () => {
      const purse = new PayServer(apiKey)
      expect(purse.network).to.equal(network)
    })

    it('should fail for invalid api keys', () => {
      expect(() => new PayServer('')).to.throw('Invalid API key')
      expect(() => new PayServer(null)).to.throw('Invalid API key')
      expect(() => new PayServer(0)).to.throw('Invalid API key')
      expect(() => new PayServer(true)).to.throw('Invalid API key')
    })
  })

  describe('pay', () => {
    it('should pay for jig transactions', async () => {
      const purse = new PayServer(apiKey)
      const run = new Run({ purse })
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      a.f()
      await run.sync()
    })

    it('should pay for non-standard inputs', async () => {
      class CustomLock {
        script () { return new Uint8Array([0x01]) }
        domain () { return 1 }
      }
      class CustomKey {
        owner () { return new CustomLock() }
        sign (rawtx, parents) {
          const tx = new Transaction(rawtx)
          parents[0].lock && tx.inputs[0].setScript('OP_1')
          return tx.toString('hex')
        }
      }
      const purse = new PayServer(apiKey)
      const run = new Run({ purse, owner: new CustomKey() })
      class A extends Jig {
        send (to) { this.owner = to }
      }
      A.deps = { CustomLock }
      run.transaction.begin()
      const a = new A()
      a.send(new CustomLock())
      run.transaction.end()
      await run.sync()
      a.send(new CustomLock())
      await run.sync()
    })

    it.skip('should pass stress test', async () => {
      // Post 120 transactions over 2 minutes
      const purse = new PayServer(apiKey)
      const run = new Run({ purse })
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      for (let i = 0; i < 120; i++) {
        console.log('posting', i, 'of 120')
        a.f()
        await run.sync()
      }
    })

    it('should fail if API key not recognized', async () => {
      const run = new Run()
      const badApiKey = new HDPrivateKey().hdPublicKey.toString()
      run.purse = new PayServer(badApiKey)
      class A extends Jig { }
      await expect(run.deploy(A)).to.be.rejectedWith('API key not recognized')
    })
  })
})

// ------------------------------------------------------------------------------------------------
