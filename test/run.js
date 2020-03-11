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
        expect(!!createRun().logger).to.equal(true)
      })

      it('should accept null logger', () => {
        expect(() => createRun({ logger: null })).not.to.throw()
      })

      it('should throw for invalid logger', () => {
        expect(() => createRun({ logger: 1 })).to.throw('Option \'logger\' must be an object. Received: 1')
        expect(() => createRun({ logger: false })).to.throw('Option \'logger\' must be an object. Received: false')
        expect(() => createRun({ logger: () => {} })).to.throw('Option \'logger\' must be an object. Received: ')
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
        const run = createRun({ network: 'main' })
        expect(run.blockchain instanceof Run.BlockchainServer).to.equal(true)
        expect(run.blockchain.network).to.equal('main')
        expect(run.blockchain.api.name).to.equal('run')
      })

      it('should support creating mockchain', () => {
        const run = createRun({ network: 'mock' })
        expect(run.blockchain instanceof Run.Mockchain).to.equal(true)
        expect(run.blockchain.network).to.equal('mock')
      })

      it('should support creating blockchain service', () => {
        const run = createRun({ blockchain: 'whatsonchain', network: 'test' })
        expect(run.blockchain instanceof Run.BlockchainServer).to.equal(true)
        expect(run.blockchain.api.name).to.equal('whatsonchain')
        expect(run.blockchain.network).to.equal('test')
      })

      it('should accept custom blockchain', () => {
        let fetched = false
        const blockchain = { broadcast: async () => {}, fetch: async () => { fetched = true }, utxos: async () => {}, network: 'main' }
        const run = createRun({ blockchain })
        run.blockchain.fetch()
        expect(fetched).to.equal(true)
      })

      it('should throw for invalid custom blockchain', () => {
        const blockchain = { broadcast: async () => {}, fetch: async () => {}, utxos: async () => {}, network: 'main' }
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { broadcast: null }) })).to.throw('Invalid \'blockchain\'')
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { fetch: null }) })).to.throw('Invalid \'blockchain\'')
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { utxos: null }) })).to.throw('Invalid \'blockchain\'')
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { network: null }) })).to.throw('Invalid \'blockchain\'')
      })

      it('should throw for null blockchain', () => {
        expect(() => createRun({ blockchain: null })).to.throw('Invalid \'blockchain\'')
      })

      it('should throw for invalid blockchain', () => {
        expect(() => createRun({ blockchain: 123 })).to.throw('Option \'blockchain\' must be an object or string. Received: 123')
        expect(() => createRun({ blockchain: false })).to.throw('Option \'blockchain\' must be an object or string. Received: false')
        expect(() => createRun({ blockchain: () => {} })).to.throw('Option \'blockchain\' must be an object or string. Received: ')
      })

      it('should support all networks', () => {
        const networks = ['main', 'test', 'stn', 'mock']
        networks.forEach(network => {
          expect(createRun({ network }).blockchain.network).to.equal(network)
        })
      })

      it('should copy mockchain from previous blockchain', () => {
        const run1 = createRun()
        const run2 = createRun()
        expect(run1.blockchain).to.deep.equal(run2.blockchain)
      })

      it('should copy blockchain cache from previous blockchain', async () => {
        const run1 = createRun({ network: 'test' })
        await run1.blockchain.fetch('d89f6bfb9f4373212ed18b9da5f45426d50a4676a4a684c002a4e838618cf3ee')
        const run2 = createRun({ network: 'test' })
        expect(run1.blockchain).not.to.deep.equal(run2.blockchain)
        expect(run1.blockchain.cache).to.deep.equal(run2.blockchain.cache)
      })
    })

    describe('sandbox', () => {
      it('should default to sandbox enabled', () => {
        expect(createRun({ network: 'mock' }).code.sandbox).to.equal(true)
        class A extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).to.throw()
      })

      it('should support enabling sandbox', () => {
        expect(createRun({ sandbox: true }).code.sandbox).to.equal(true)
      })

      it('should support disabling sandbox', () => {
        const run = createRun({ network: 'mock', sandbox: false })
        expect(run.code.sandbox).to.equal(false)
        class A extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).not.to.throw()
        run.deactivate()
      })

      it('should support RegExp sandbox', () => {
        const run = createRun({ network: 'mock', sandbox: /A/ })
        expect(run.code.sandbox instanceof RegExp).to.equal(true)
        class A extends Jig { init () { this.version = Run.version } }
        class B extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).to.throw()
        expect(() => new B()).not.to.throw()
        run.deactivate()
      })

      it('should throw for bad sandbox', () => {
        expect(() => createRun({ sandbox: null })).to.throw('Invalid option \'sandbox\'. Received: null')
        expect(() => createRun({ sandbox: 0 })).to.throw('Option \'sandbox\' must be a boolean or RegExp. Received: 0')
        expect(() => createRun({ sandbox: {} })).to.throw('Invalid option \'sandbox\'. Received:')
        expect(() => createRun({ sandbox: () => {} })).to.throw('Option \'sandbox\' must be a boolean or RegExp. Received: ')
      })
    })

    describe('app', () => {
      it('should default to empty app string', () => {
        expect(createRun().app).to.equal('')
      })

      it('should support custom app name', () => {
        expect(createRun({ app: 'biz' }).app).to.equal('biz')
      })

      it('should throw if bad app name', () => {
        expect(() => createRun({ app: 0 })).to.throw('Option \'app\' must be a string. Received: 0')
        expect(() => createRun({ app: true })).to.throw('Option \'app\' must be a string. Received: true')
        expect(() => createRun({ app: { name: 'biz' } })).to.throw('Option \'app\' must be a string. Received: [object Object]')
      })
    })

    describe('state', () => {
      it('should default to state cache', () => {
        expect(createRun().state instanceof Run.StateCache).to.equal(true)
      })

      it('should support custom state', () => {
        const state = new Run.StateCache()
        expect(createRun({ state }).state).to.deep.equal(state)
      })

      it('should throw if invalid state', () => {
        expect(() => createRun({ state: { get: () => {} } })).to.throw('State requires a set method')
        expect(() => createRun({ state: { set: () => {} } })).to.throw('State requires a get method')
        expect(() => createRun({ state: null })).to.throw('Option \'state\' must not be null')
        expect(() => createRun({ state: false })).to.throw('Option \'state\' must be an object. Received: false')
      })

      it('should copy previous state', () => {
        const run1 = createRun()
        const run2 = createRun()
        expect(run2.state).to.deep.equal(run1.state)
      })
    })

    describe('owner', () => {
      it('should default to random owner', () => {
        const run = createRun()
        expect(run.owner).not.to.equal(null)
        expect(typeof run.owner.privkey).to.equal('string')
      })

      it('should support null owner', () => {
        expect(createRun({ owner: null }).owner).not.to.equal(null)
      })

      it('should throw for invalid owner', () => {
        expect(() => createRun({ owner: 123 })).to.throw('Option \'owner\' must be a valid key, address, or Owner instance. Received: 123')
        expect(() => createRun({ owner: false })).to.throw('Option \'owner\' must be a valid key, address, or Owner instance. Received: false')
      })
    })

    describe('purse', () => {
      it('should default to random purse', () => {
        const run = createRun()
        expect(run.purse).not.to.equal(null)
        expect(typeof run.purse.privkey).to.equal('string')
      })

      it('should support null purse', () => {
        expect(createRun({ purse: null }).purse).not.to.equal(null)
      })

      it('should throw for invalid purse', () => {
        expect(() => createRun({ purse: {} })).to.throw('Purse requires a pay method')
        expect(() => createRun({ purse: 123 })).to.throw('Option \'purse\' must be a valid private key or Pay API. Received: 123')
        expect(() => createRun({ purse: true })).to.throw('Option \'purse\' must be a valid private key or Pay API. Received: true')
      })
    })

    describe('code', () => {
      it('should default to new code', () => {
        expect(createRun().code instanceof Run.Code).to.equal(true)
      })

      it('should support creating with new code', () => {
        expect(() => createRun({ code: new Run.Code() })).not.to.throw()
      })

      it('should reuse code if possible', () => {
        expect(new Map(createRun().code.installs)).to.deep.equal(new Map(createRun().code.installs))
        expect(new Map(createRun({ sandbox: false }).code.installs))
          .not.to.deep.equal(new Map(createRun({ sandbox: true }).code.installs))
      })

      it('should throw for invalid code', () => {
        expect(() => createRun({ code: null })).to.throw('Option \'code\' must be an instance of Code')
        expect(() => createRun({ code: 123 })).to.throw('Option \'code\' must be an instance of Code')
        expect(() => createRun({ code: false })).to.throw('Option \'code\' must be an instance of Code')
      })
    })

    it('should set global bsv network', () => {
      createRun()
      expect(bsv.Networks.defaultNetwork).to.equal('testnet')
      createRun({ network: 'main' })
      expect(bsv.Networks.defaultNetwork).to.equal('mainnet')
    })
  })

  describe('purse', () => {
    it('throw accept setting valid purse', () => {
      const run = createRun()
      run.purse = new bsv.PrivateKey()
      expect(run.purse instanceof Run.Purse).to.equal(true)
    })

    it('throw throw if set invalid purse', () => {
      const run = createRun()
      expect(() => { run.purse = 123 }).to.throw('Option \'purse\' must be a valid private key or Pay API')
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
      await expect(run.load()).to.be.rejectedWith('Location must be a string: undefined')
      await expect(run.load(123)).to.be.rejectedWith('Location must be a string: 123')
      await expect(run.load({})).to.be.rejectedWith('Location must be a string: [object Object]')
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
      const run = createRun()
      class A extends Jig { }
      class B extends A { }
      await run.deploy(B)
      class C extends Jig { init () { if (!B) throw new Error() } }
      C.deps = { B }
      await run.deploy(C)
      class D extends C { }
      const d = new D()
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const p1 = run2.load(d.location)
      const p2 = run2.load(d.location)
      await Promise.all([p1, p2])
    })

    it('should reuse state cache', async () => {
      const networks = ['main', 'test']

      async function timeLoad (network, location) {
        const run = createRun({ network })
        const before = new Date()
        await run.load(location)
        return new Date() - before
      }

      for (const network of networks) {
        const run = createRun({ network })
        class A extends Jig {}
        const a = new A()
        await a.sync()
        const location = a.location
        run.deactivate()

        expect(await timeLoad(network, location) > 1000).to.equal(true)
        expect(await timeLoad(network, location) > 1000).to.equal(false)
      }
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
