/**
 * pay-server.js
 *
 * Tests for lib/module/pay-server.js
 */

const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { HDPrivateKey } = require('bsv')
const { Run, NETWORK } = require('../env/config')
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
  const apiKey = apiKeys[NETWORK]
  if (!apiKey) return

  describe('constructor', () => {
    it('should detect network', () => {
      const purse = new PayServer(apiKey)
      expect(purse.network).to.equal(NETWORK)
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
