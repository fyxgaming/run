/**
 * run.js
 *
 * Tests for ../lib/index.js
 */

const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Jig, Run, createRun } = require('./helpers')
const bsv = require('bsv')
const packageInfo = require('../package.json')

describe('Run', () => {
  describe('constructor', () => {
    it('should set basic properties', () => {
      const run = createRun()
      expect(Run.version).to.equal(packageInfo.version)
      expect(run.owner.privkey).not.to.equal(run.purse.privkey)
      expect(run.owner.bsvPrivateKey.publicKey.toString()).to.equal(run.owner.pubkey)
      expect(run.owner.bsvPrivateKey.toAddress().toString()).to.equal(run.owner.address)
      expect(run.purse.privkey.toAddress().toString()).to.equal(run.purse.address.toString())
      expect(run.app).to.equal('')
    })

    it('should set global bsv network', () => {
      createRun()
      expect(bsv.Networks.defaultNetwork).to.equal('testnet')
      createRun({ network: 'main' })
      expect(bsv.Networks.defaultNetwork).to.equal('mainnet')
    })

    it('should support all networks', () => {
      // TODO: re-enable stn
      const networks = ['main', 'test', 'mock']
      networks.forEach(network => {
        expect(createRun({ network }).blockchain.network).to.equal(network)
      })
    })

    it('should support null purse', () => {
      expect(createRun({ purse: null }).purse).not.to.equal(null)
    })

    it('should support null owner', () => {
      expect(createRun({ owner: null }).owner).not.to.equal(null)
    })

    it('should support custom app name', () => {
      expect(createRun({ app: 'biz' }).app).to.equal('biz')
    })

    it('should throw if bad app name', () => {
      expect(() => createRun({ app: 0 })).to.throw('app must be a string')
      expect(() => createRun({ app: true })).to.throw('app must be a string')
      expect(() => createRun({ app: { name: 'biz' } })).to.throw('app must be a string')
    })

    describe('logger', () => {
      it('should support custom logger', () => {
        let infoMessage = ''; let errorMessage = ''; let errorData = null
        const run = createRun({
          logger: {
            info: message => { infoMessage = message },
            error: (message, data) => { errorMessage = message; errorData = data }
          }
        })
        run.logger.info('info')
        run.logger.debug('debug')
        run.logger.warn('warn')
        run.logger.error('error', 1)
        expect(infoMessage).to.equal('info')
        expect(errorMessage).to.equal('error')
        expect(errorData).to.equal(1)
      })

      it('should throw if bad logger', () => {
        expect(() => createRun({ logger: 1 })).to.throw('logger must be an object, found 1')
        expect(() => createRun({ logger: false })).to.throw('logger must be an object, found false')
        expect(() => createRun({ logger: function log (message) {} })).to.throw('logger must be an object, found')
      })
    })
  })

  describe('load', () => {
    it('should throw if inactive', async () => {
      const run = createRun()
      class A { }
      await run.deploy(A)
      createRun()
      await expect(run.load(A.location)).to.be.rejectedWith('run instance is not active. call run.activate() first.')
    })

    it('should throw for invalid arg', async () => {
      const run = createRun()
      await expect(run.load()).to.be.rejectedWith('typeof location is undefined - must be string')
      await expect(run.load(123)).to.be.rejectedWith('typeof location is number - must be string')
      await expect(run.load({})).to.be.rejectedWith('typeof location is object - must be string')
    })
  })

  describe('deploy', () => {
    it('should throw if inactive', async () => {
      class A { }
      const run = createRun()
      createRun()
      await expect(run.deploy(A)).to.be.rejectedWith('run instance is not active. call run.activate() first.')
    })

    it('should support batch deploy', async () => {
      class A { }
      const run = createRun()
      run.transaction.begin()
      await run.deploy(A)
      run.transaction.end()
    })
  })

  describe('misc', () => {
    it('should support same owner and purse', async () => {
      const key = new bsv.PrivateKey('testnet')
      const run = createRun({ owner: key, purse: key })
      class A extends Jig { set (name) { this.name = name; return this } }
      const a = await new A().sync()
      const purseUtxos = await run.purse.utxos()
      expect(purseUtxos.length).to.equal(10)
      await run.sync()
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.jigs.length).to.equal(1)

      const txid = run.owner.code[0].location.slice(0, 64)
      const codeVout = parseInt(run.owner.code[0].location.slice(66))
      const jigVout = parseInt(run.owner.jigs[0].location.slice(66))
      expect(codeVout).to.equal(1)
      expect(jigVout).to.equal(2)

      purseUtxos.forEach(utxo => {
        expect(utxo.txid !== txid || utxo.vout !== jigVout).to.equal(true)
        expect(utxo.txid !== txid || utxo.vout !== codeVout).to.equal(true)
      })

      await a.set('a').sync()
    })

    it('should support multiple simultaneous loads', async () => {
      // This tests a tricky timing issue where class dependencies need to be fully
      // loaded before load() returns. There used to be a case where that was possible.
      const run = createRun({ network: 'mock' })
      class A extends Jig { }
      class B extends A { }
      await run.deploy(B)
      class C extends Jig { init () { if (!B) throw new Error() } }
      C.deps = { B }
      await run.deploy(C)
      class D extends C { }
      const d = new D()
      await run.sync()
      Run.code.flush()
      run.state.clear()
      const p1 = run.load(d.location)
      const p2 = run.load(d.location)
      await Promise.all([p1, p2])
    })

    it('should reuse state cache', async () => {
      async function timeLoad (network, location) {
        const run = createRun({ network })
        const before = new Date()
        await run.load(location)
        return new Date() - before
      }

      const testLocation = '7d96e1638074471796c6981b12239865b0daeff24ea72fee207338cf2d388ffd_o1'
      const mainLocation = 'a0dd3999349d0cdd116a1a607eb07e5e394355484af3ba7a7a5babe0c2efc5ca_o1'

      expect(await timeLoad('test', testLocation) > 1000).to.equal(true)
      expect(await timeLoad('test', testLocation) > 1000).to.equal(false)

      expect(await timeLoad('main', mainLocation) > 1000).to.equal(true)
      expect(await timeLoad('main', mainLocation) > 1000).to.equal(false)
    }).timeout(30000)
  })
})
