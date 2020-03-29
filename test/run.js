/**
 * run.js
 *
 * Tests for Run class
 */

const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('./config')
const { Jig } = Run
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
        expect(() => new Run({ logger: 1 })).to.throw('Invalid logger: 1')
        expect(() => new Run({ logger: false })).to.throw('Invalid logger: false')
        expect(() => new Run({ logger: () => {} })).to.throw('Invalid logger: [anonymous function]')
      })

      it('should complete methods for custom logger', () => {
        let infoMessage = ''; let errorMessage = ''; let errorData = null
        const run = new Run({
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
        const run = new Run({ network: 'main' })
        expect(run.blockchain instanceof Run.BlockchainApi).to.equal(true)
        expect(run.blockchain.network).to.equal('main')
        expect(run.blockchain.api).to.equal('run')
      })

      it('should support creating mockchain', () => {
        const run = new Run({ network: 'mock' })
        expect(run.blockchain instanceof Run.Mockchain).to.equal(true)
        expect(run.blockchain.network).to.equal('mock')
      })

      it('should support setting blockchain api', () => {
        const run = new Run({ api: 'whatsonchain', network: 'test' })
        expect(run.blockchain instanceof Run.BlockchainApi).to.equal(true)
        expect(run.blockchain.api).to.equal('whatsonchain')
        expect(run.blockchain.network).to.equal('test')
      })

      it('should accept custom blockchain', () => {
        let fetched = false
        const blockchain = { broadcast: async () => {}, fetch: async () => { fetched = true }, utxos: async () => {}, network: 'main' }
        const run = new Run({ blockchain })
        run.blockchain.fetch()
        expect(fetched).to.equal(true)
      })

      it('should throw for null blockchain', () => {
        expect(() => new Run({ blockchain: null })).to.throw('Invalid blockchain')
      })

      it('should throw for invalid blockchain', () => {
        expect(() => new Run({ blockchain: 123 })).to.throw('Invalid blockchain: 123')
        expect(() => new Run({ blockchain: false })).to.throw('Invalid blockchain: false')
        expect(() => new Run({ blockchain: () => {} })).to.throw('Invalid blockchain: [anonymous function]')
      })

      it('should support all networks', () => {
        const networks = ['main', 'test', 'mock']
        networks.forEach(network => {
          expect(new Run({ network }).blockchain.network).to.equal(network)
        })
      })

      it('should copy mockchain from previous blockchain', () => {
        const run1 = new Run({ network: 'mock' })
        const run2 = new Run({ network: 'mock' })
        expect(run1.blockchain).to.be.instanceOf(Run.Mockchain)
        expect(run1.blockchain).to.deep.equal(run2.blockchain)
      })

      it('should copy blockchain cache from previous blockchain', async () => {
        const run1 = new Run({ network: 'test' })
        await run1.blockchain.fetch('d89f6bfb9f4373212ed18b9da5f45426d50a4676a4a684c002a4e838618cf3ee')
        const run2 = new Run({ network: 'test' })
        expect(run1.blockchain).not.to.deep.equal(run2.blockchain)
        expect(run1.blockchain.cache).to.deep.equal(run2.blockchain.cache)
      })
    })

    describe('sandbox', () => {
      it('should default to sandbox enabled', () => {
        expect(new Run({ network: 'mock', sandbox: undefined }).sandbox).to.equal(true)
        class A extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).to.throw()
      })

      it('should support enabling sandbox', () => {
        expect(new Run({ sandbox: true }).sandbox).to.equal(true)
      })

      it('should support disabling sandbox', () => {
        const run = new Run({ network: 'mock', sandbox: false })
        expect(run.sandbox).to.equal(false)
        class A extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).not.to.throw()
        run.deactivate()
      })

      it('should support RegExp sandbox', () => {
        const run = new Run({ network: 'mock', sandbox: /A/ })
        expect(run.sandbox instanceof RegExp).to.equal(true)
        class A extends Jig { init () { this.version = Run.version } }
        class B extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).to.throw()
        expect(() => new B()).not.to.throw()
        run.deactivate()
      })

      it('should throw for bad sandbox', () => {
        expect(() => new Run({ sandbox: null })).to.throw('Invalid sandbox: null')
        expect(() => new Run({ sandbox: 0 })).to.throw('Invalid sandbox: 0')
        expect(() => new Run({ sandbox: {} })).to.throw('Invalid sandbox: [object Object]')
        expect(() => new Run({ sandbox: () => {} })).to.throw('Invalid sandbox: [anonymous function]')
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
        expect(() => new Run({ app: 0 })).to.throw('Invalid app: 0')
        expect(() => new Run({ app: true })).to.throw('Invalid app: true')
        expect(() => new Run({ app: { name: 'biz' } })).to.throw('Invalid app: [object Object]')
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
        expect(() => new Run({ state: { get: () => {} } })).to.throw('Invalid state: [object Object]')
        expect(() => new Run({ state: { set: () => {} } })).to.throw('Invalid state: [object Object]')
        expect(() => new Run({ state: null })).to.throw('Invalid state: null')
        expect(() => new Run({ state: false })).to.throw('Invalid state: false')
      })

      it('should copy previous state', () => {
        const run1 = new Run()
        const run2 = new Run()
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
        expect(() => new Run({ owner: 123 })).to.throw('Invalid owner: 123')
        expect(() => new Run({ owner: false })).to.throw('Invalid owner: false')
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
        expect(() => new Run({ purse: 123 })).to.throw('Invalid purse: 123')
        expect(() => new Run({ purse: true })).to.throw('Invalid purse: true')
      })
    })

    it('should set global bsv network', () => {
      new Run({ network: 'main' }) // eslint-disable-line
      expect(bsv.Networks.defaultNetwork).to.equal('mainnet')
      new Run({ network: 'test' }) // eslint-disable-line
      expect(bsv.Networks.defaultNetwork).to.equal('testnet')
    })
  })

  describe('purse', () => {
    it('throw accept setting valid purse', () => {
      const run = new Run()
      run.purse = new bsv.PrivateKey()
      expect(run.purse instanceof Run.LocalPurse).to.equal(true)
    })

    it('throw throw if set invalid purse', () => {
      const run = new Run()
      expect(() => { run.purse = 123 }).to.throw('Invalid purse: 123')
    })
  })

  describe('static properties', () => {
    it('version should match package.json', () => {
      expect(Run.version).to.equal(packageInfo.version)
    })
  })

  describe('load', () => {
    it('should throw if inactive', async () => {
      const run = new Run()
      class A { }
      await run.deploy(A)
      new Run() // eslint-disable-line
      await expect(run.load(A.location)).to.be.rejectedWith('This Run instance is not active')
    })

    it('should throw for invalid arg', async () => {
      const run = new Run()
      await expect(run.load()).to.be.rejectedWith('Location must be a string: undefined')
      await expect(run.load(123)).to.be.rejectedWith('Location must be a string: 123')
      await expect(run.load({})).to.be.rejectedWith('Location must be a string: [object Object]')
    })
  })

  describe('deploy', () => {
    it('should throw if inactive', async () => {
      class A { }
      const run = new Run()
      new Run() // eslint-disable-line
      await expect(run.deploy(A)).to.be.rejectedWith('This Run instance is not active')
    })

    it('should support batch deploy', async () => {
      class A { }
      const run = new Run()
      run.transaction.begin()
      await run.deploy(A)
      run.transaction.end()
    })
  })

  describe('misc', () => {
    it('should support same owner and purse', async () => {
      const key = new bsv.PrivateKey('testnet')
      const run = new Run({ owner: key, purse: key })
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
      const run = new Run()
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
      const run2 = new Run({ blockchain: run.blockchain })
      const p1 = run2.load(d.location)
      const p2 = run2.load(d.location)
      await Promise.all([p1, p2])
    })

    it.skip('should reuse state cache', async () => {
      const networks = ['main', 'test']

      async function timeLoad (network, location) {
        const run = new Run({ network })
        const before = new Date()
        await run.load(location)
        return new Date() - before
      }

      for (const network of networks) {
        const run = new Run({ network })
        class A extends Jig {}
        const a = new A()
        await a.sync()
        const location = a.location
        run.deactivate()

        expect(await timeLoad(network, location) > 1000).to.equal(true)
        expect(await timeLoad(network, location) > 1000).to.equal(false)
      }
    })

    it.skip('should fail if reuse jigs across code instances', () => {
      // TODO: What should this behavior be?
      class A extends Jig { set (x) { this.x = x } }
      new Run({ code: new Run.Code() }) // eslint-disable-line
      const a1 = new A()
      new Run({ code: new Run.Code() }) // eslint-disable-line
      const a2 = new A()
      expect(a1.constructor).not.to.equal(a2.constructor)
      expect(() => a2.set(a1)).to.throw('Different code instances')
    })
  })
})
