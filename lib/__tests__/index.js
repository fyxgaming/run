const { createRun, Jig, Run } = require('./test-util')
const bsv = require('bsv')
const packageInfo = require('../../package.json')

describe('Run', () => {
  describe('constructor', () => {
    test('basic properties', () => {
      const run = createRun()
      expect(Run.version).toBe(packageInfo.version)
      expect(run.owner.privkey).not.toBe(run.purse.privkey)
      expect(run.owner.bsvPrivateKey.publicKey.toString()).toBe(run.owner.pubkey)
      expect(run.owner.bsvPrivateKey.toAddress().toString()).toBe(run.owner.address)
      expect(run.purse.privkey.toAddress().toString()).toBe(run.purse.address.toString())
      expect(run.app).toBe('')
    })

    test('sets global bsv network', () => {
      createRun()
      expect(bsv.Networks.defaultNetwork).toBe('testnet')
      createRun({ network: 'main' })
      expect(bsv.Networks.defaultNetwork).toBe('mainnet')
    })

    test('networks', () => {
      // TODO: re-enable stn
      const networks = ['main', 'test', 'mock']
      networks.forEach(network => {
        expect(createRun({ network }).blockchain.network).toBe(network)
      })
    })

    test('null purse', () => {
      expect(createRun({ purse: null }).purse).not.toBeNull()
    })

    test('null owner', () => {
      expect(createRun({ owner: null }).owner).not.toBeNull()
    })

    test('custom app', () => {
      expect(createRun({ app: 'biz' }).app).toBe('biz')
    })

    test('bad app', () => {
      expect(() => createRun({ app: 0 })).toThrow('app must be a string')
      expect(() => createRun({ app: true })).toThrow('app must be a string')
      expect(() => createRun({ app: { name: 'biz' } })).toThrow('app must be a string')
    })

    describe('logger', () => {
      test('default logs only warnings and error', () => {
        const run = createRun({ logger: undefined })
        expect(run.logger.info.toString()).toBe('() => {}')
        expect(run.logger.debug.toString()).toBe('() => {}')
        expect(run.logger.warn).toBe(console.warn)
        expect(run.logger.error).toBe(console.error)
      })

      test('custom logger', () => {
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
        expect(infoMessage).toBe('info')
        expect(errorMessage).toBe('error')
        expect(errorData).toBe(1)
      })

      test('bad logger throws', () => {
        expect(() => createRun({ logger: 1 })).toThrow('logger must be an object, found 1')
        expect(() => createRun({ logger: false })).toThrow('logger must be an object, found false')
        expect(() => createRun({ logger: function log (message) {} })).toThrow('logger must be an object, found function log(message) {}')
      })
    })
  })

  describe('load', () => {
    test('inactive', async () => {
      const run = createRun()
      class A { }
      await run.deploy(A)
      const run2 = createRun()
      expect(Run.instance).toBe(run2)
      await expect(run.load(A.location)).rejects.toThrow('run instance is not active. call run.activate() first.')
    })

    test('invalid arg', async () => {
      const run = createRun()
      await expect(run.load()).rejects.toThrow('typeof location is undefined - must be string')
      await expect(run.load(123)).rejects.toThrow('typeof location is number - must be string')
      await expect(run.load({})).rejects.toThrow('typeof location is object - must be string')
    })
  })

  describe('deploy', () => {
    test('inactive', async () => {
      class A { }
      const run = createRun()
      createRun()
      await expect(run.deploy(A)).rejects.toThrow('run instance is not active. call run.activate() first.')
    })

    test('batch', async () => {
      class A { }
      const run = createRun()
      run.transaction.begin()
      await run.deploy(A)
      run.transaction.end()
    })
  })

  describe('misc', () => {
    test('same owner and purse', async () => {
      const key = new bsv.PrivateKey('testnet')
      const run = createRun({ owner: key, purse: key })
      class A extends Jig { set (name) { this.name = name; return this } }
      const a = await new A().sync()
      const purseUtxos = await run.purse.utxos()
      expect(purseUtxos.length).toBe(10)
      await run.sync()
      expect(run.owner.code.length).toBe(1)
      expect(run.owner.jigs.length).toBe(1)

      const txid = run.owner.code[0].location.slice(0, 64)
      const codeVout = parseInt(run.owner.code[0].location.slice(66))
      const jigVout = parseInt(run.owner.jigs[0].location.slice(66))
      expect(codeVout).toBe(1)
      expect(jigVout).toBe(2)

      purseUtxos.forEach(utxo => {
        expect(utxo.txid !== txid || utxo.vout !== jigVout).toBe(true)
        expect(utxo.txid !== txid || utxo.vout !== codeVout).toBe(true)
      })

      await a.set('a').sync()
    })

    test('multiple simultaneous loads', async () => {
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

    test('reuse state cache', async () => {
      async function timeLoad (network, location) {
        const run = createRun({ network })
        const before = new Date()
        await run.load(location)
        return new Date() - before
      }

      const testLocation = '7d96e1638074471796c6981b12239865b0daeff24ea72fee207338cf2d388ffd_o1'
      const mainLocation = 'a0dd3999349d0cdd116a1a607eb07e5e394355484af3ba7a7a5babe0c2efc5ca_o1'

      expect(await timeLoad('test', testLocation) > 1000).toBe(true)
      expect(await timeLoad('test', testLocation) > 1000).toBe(false)

      expect(await timeLoad('main', mainLocation) > 1000).toBe(true)
      expect(await timeLoad('main', mainLocation) > 1000).toBe(false)
    })

    // TODO: Remove
    test.skip('True Reviews Test', async () => {
      const run = createRun({
        network: 'main',
        owner: '1N3U7rCvbjYu3zAgJzMa1xpxndmqDpU2jg',
        logger: console
      })

      const before = new Date()
      await run.sync()

      console.log(new Date() - before)

      // ---

      console.log('---')

      const run2 = createRun({
        network: 'main',
        owner: '1N3U7rCvbjYu3zAgJzMa1xpxndmqDpU2jg',
        logger: console
      })

      const before2 = new Date()
      await run2.sync()
      console.log(new Date() - before2)
    })
  })
})
