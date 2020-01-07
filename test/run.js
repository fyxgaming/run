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
    describe('logger', () => {
      it('should create default logger', () => {
        expect(!!new Run().logger).to.equal(true)
      })

      it('should accept null logger', () => {
        expect(() => new Run({ logger: null })).not.to.throw()
      })

      it('should throw for invalid logger', () => {
        expect(() => new Run({ logger: 1 })).to.throw('Option \'logger\' must be an object. Received: 1')
        expect(() => new Run({ logger: false })).to.throw('Option \'logger\' must be an object. Received: false')
        expect(() => new Run({ logger: () => {} })).to.throw('Option \'logger\' must be an object. Received: ')
      })

      it('should complete methods for custom logger', () => {
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
    })

    describe('blockchain', () => {
      it('should create default blockchain', () => {
        const run = new Run()
        expect(run.blockchain instanceof Run.BlockchainServer).to.equal(true)
        expect(run.blockchain.network).to.equal('main')
        expect(run.blockchain.api.name).to.equal('star')
      })

      it('should support creating mockchain', () => {
        const run = new Run({ network: 'mock' })
        expect(run.blockchain instanceof Run.Mockchain).to.equal(true)
        expect(run.blockchain.network).to.equal('mock')
      })

      it('should support creating blockchain service', () => {
        const run = new Run({ blockchain: 'whatsonchain', network: 'test' })
        expect(run.blockchain instanceof Run.BlockchainServer).to.equal(true)
        expect(run.blockchain.api.name).to.equal('whatsonchain')
        expect(run.blockchain.network).to.equal('test')
      })

      it('should accept custom blockchain', () => {
        let fetched = false
        const blockchain = { broadcast: async () => {}, fetch: async () => { fetched = true }, utxos: async () => {}, network: 'main' }
        const run = new Run({ blockchain })
        run.blockchain.fetch()
        expect(fetched).to.equal(true)
      })

      it('should throw for invalid custom blockchain', () => {
        const blockchain = { broadcast: async () => {}, fetch: async () => {}, utxos: async () => {}, network: 'main' }
        expect(() => new Run({ blockchain: { ...blockchain, broadcast: null } })).to.throw('Blockchain requires a broadcast method')
        expect(() => new Run({ blockchain: { ...blockchain, fetch: null } })).to.throw('Blockchain requires a fetch method')
        expect(() => new Run({ blockchain: { ...blockchain, utxos: null } })).to.throw('Blockchain requires a utxos method')
        expect(() => new Run({ blockchain: { ...blockchain, network: null } })).to.throw('Blockchain requires a network string')
      })

      it('should throw for null blockchain', () => {
        expect(() => new Run({ blockchain: null })).to.throw('Option \'blockchain\' must not be null')
      })

      it('should throw for invalid blockchain', () => {
        expect(() => new Run({ blockchain: 123 })).to.throw('Option \'blockchain\' must be an object or string. Received: 123')
        expect(() => new Run({ blockchain: false })).to.throw('Option \'blockchain\' must be an object or string. Received: false')
        expect(() => new Run({ blockchain: () => {} })).to.throw('Option \'blockchain\' must be an object or string. Received: ')
      })

      it('should support all networks', () => {
        const networks = ['main', 'test', 'stn', 'mock']
        networks.forEach(network => {
          expect(createRun({ network }).blockchain.network).to.equal(network)
        })
      })

      it('should copy cache from previous blockchain', () => {
        const run1 = new Run()
        const run2 = new Run()
        expect(run1.blockchain).not.to.deep.equal(run2.blockchain)
        expect(run1.blockchain.cache).to.deep.equal(run2.blockchain.cache)
      })
    })

    describe('sandbox', () => {
      it('should default to sandbox enabled', () => {
        expect(new Run({ network: 'mock' }).code.sandbox).to.equal(true)
        class A extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).to.throw()
      })

      it('should support enabling sandbox', () => {
        expect(new Run({ sandbox: true }).code.sandbox).to.equal(true)
      })

      it('should support disabling sandbox', () => {
        const run = new Run({ network: 'mock', sandbox: false })
        expect(run.code.sandbox).to.equal(false)
        class A extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).not.to.throw()
      })

      it('should support RegExp sandbox', () => {
        const run = new Run({ network: 'mock', sandbox: /A/ })
        expect(run.code.sandbox instanceof RegExp).to.equal(true)
        class A extends Jig { init () { this.version = Run.version } }
        class B extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).to.throw()
        expect(() => new B()).not.to.throw()
      })

      it('should throw for bad sandbox', () => {
        expect(() => new Run({ sandbox: null })).to.throw('Invalid option \'sandbox\'. Received: null')
        expect(() => new Run({ sandbox: 0 })).to.throw('Option \'sandbox\' must be a boolean or RegExp. Received: 0')
        expect(() => new Run({ sandbox: {} })).to.throw('Invalid option \'sandbox\'. Received:')
        expect(() => new Run({ sandbox: () => {} })).to.throw('Option \'sandbox\' must be a boolean or RegExp. Received: ')
      })
    })

    describe('app', () => {
      it('should default to empty app string', () => {
        expect(new Run().app).to.equal('')
      })

      it('should support custom app name', () => {
        expect(new Run({ app: 'biz' }).app).to.equal('biz')
      })

      it('should throw if bad app name', () => {
        expect(() => createRun({ app: 0 })).to.throw('Option \'app\' must be a string. Received: 0')
        expect(() => createRun({ app: true })).to.throw('Option \'app\' must be a string. Received: true')
        expect(() => createRun({ app: { name: 'biz' } })).to.throw('Option \'app\' must be a string. Received: [object Object]')
      })
    })

    describe('state', () => {
      it('should default to state cache', () => {
        expect(new Run().state instanceof Run.StateCache).to.equal(true)
      })

      it('should support custom state', () => {
        const state = new Run.StateCache()
        expect(new Run({ state }).state).to.deep.equal(state)
      })

      it('should throw if invalid state', () => {
        expect(() => new Run({ state: { get: () => {} } })).to.throw('State requires a set method')
        expect(() => new Run({ state: { set: () => {} } })).to.throw('State requires a get method')
        expect(() => new Run({ state: null })).to.throw('Option \'state\' must not be null')
        expect(() => new Run({ state: false })).to.throw('Option \'state\' must be an object. Received: false')
      })

      it('should copy cache from previous state', () => {
        const run1 = createRun()
        const run2 = createRun()
        expect(run2.state).to.deep.equal(run1.state)
      })
    })

    describe('owner', () => {
      it('should default to random owner', () => {
        const run = new Run()
        expect(run.owner).not.to.equal(null)
        expect(typeof run.owner.privkey).to.equal('string')
      })

      it('should support null owner', () => {
        expect(new Run({ owner: null }).owner).not.to.equal(null)
      })

      it('should throw for invalid owner', () => {
        expect(() => new Run({ owner: 123 })).to.throw('Option \'owner\' must be a valid key or address. Received: 123')
        expect(() => new Run({ owner: false })).to.throw('Option \'owner\' must be a valid key or address. Received: false')
      })
    })

    describe('purse', () => {
      it('should default to random purse', () => {
        const run = new Run()
        expect(run.purse).not.to.equal(null)
        expect(typeof run.purse.privkey).to.equal('string')
      })

      it('should support null purse', () => {
        expect(new Run({ purse: null }).purse).not.to.equal(null)
      })

      it('should throw for invalid purse', () => {
        expect(() => new Run({ purse: {} })).to.throw('Purse requires a pay method')
        expect(() => new Run({ purse: 123 })).to.throw('Option \'purse\' must be a valid private key or Pay API. Received: 123')
        expect(() => new Run({ purse: true })).to.throw('Option \'purse\' must be a valid private key or Pay API. Received: true')
      })
    })

    describe('code', () => {
      it('should default to new code', () => {
        expect(new Run().code instanceof Run.Code).to.equal(true)
      })

      it('should support creating with new code', () => {
        expect(() => new Run({ code: new Run.Code() })).not.to.throw()
      })

      it('should reuse code if possible', () => {
        expect(new Map(new Run().code.installs)).to.deep.equal(new Map(new Run().code.installs))
        expect(new Map(new Run({ sandbox: false }).code.installs))
          .not.to.deep.equal(new Map(new Run({ sandbox: true }).code.installs))
      })

      it('should throw for invalid code', () => {
        expect(() => new Run({ code: null })).to.throw('Option \'code\' must be an instance of Code')
        expect(() => new Run({ code: 123 })).to.throw('Option \'code\' must be an instance of Code')
        expect(() => new Run({ code: false })).to.throw('Option \'code\' must be an instance of Code')
      })
    })

    it('should set global bsv network', () => {
      createRun()
      expect(bsv.Networks.defaultNetwork).to.equal('testnet')
      createRun({ network: 'main' })
      expect(bsv.Networks.defaultNetwork).to.equal('mainnet')
    })
  })

  describe('static properties', () => {
    it('version should match package.json', () => {
      expect(Run.version).to.equal(packageInfo.version)
    })
  })

  describe('load', () => {
    it('should throw if inactive', async () => {
      const run = createRun()
      class A { }
      await run.deploy(A)
      createRun()
      await expect(run.load(A.location)).to.be.rejectedWith('This Run instance is not active')
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
      await expect(run.deploy(A)).to.be.rejectedWith('This Run instance is not active')
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
      run.code.flush()
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

    it.skip('should fail if reuse jigs across code instances', () => {
      // TODO: What should this behavior be?
      class A extends Jig { set (x) { this.x = x } }
      createRun({ code: new Run.Code() })
      const a1 = new A()
      createRun({ code: new Run.Code() })
      const a2 = new A()
      expect(a1.constructor).not.to.equal(a2.constructor)
      expect(() => a2.set(a1)).to.throw('Different code instances')
    })
  })
})
