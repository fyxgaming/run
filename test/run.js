/**
 * run.js
 *
 * Tests for lib/run.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { stub } = require('sinon')
const { expect } = require('chai')
const bsv = require('bsv')
const Run = require('./env/run')
const unmangle = require('./env/unmangle')
const { Jig } = Run
const { RunConnect, MatterCloud, WhatsOnChain, Mockchain, LocalCache, BrowserCache, NodeCache, Inventory } = Run.plugins
const { BROWSER } = require('./env/config')
const request = unmangle(Run)._request
const Log = unmangle(unmangle(Run)._Log)

// ------------------------------------------------------------------------------------------------
// Run
// ------------------------------------------------------------------------------------------------

describe('Run', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    // ------------------------------------------------------------------------
    // api
    // ------------------------------------------------------------------------

    describe('api', () => {
      it('defaults to default', () => {
        expect(new Run().api).to.equal(Run.defaults.api)
      })

      // ------------------------------------------------------------------------

      it('run', () => {
        expect(new Run({ api: 'run', network: 'main' }).blockchain instanceof RunConnect).to.equal(true)
      })

      // ------------------------------------------------------------------------

      it('mattercloud', () => {
        expect(new Run({ api: 'mattercloud', network: 'main' }).blockchain instanceof MatterCloud).to.equal(true)
      })

      // ------------------------------------------------------------------------

      it('whatsonchain', () => {
        expect(new Run({ api: 'whatsonchain', network: 'test' }).blockchain instanceof WhatsOnChain).to.equal(true)
      })

      // ------------------------------------------------------------------------

      it('throws if unsupported', () => {
        expect(() => new Run({ api: 'run', network: 'mock' })).to.throw('"mock" network is not compatible with the "run" api')
        expect(() => new Run({ api: 'run', network: 'stn' })).to.throw('RunConnect API does not support the "stn" network')
        expect(() => new Run({ api: 'mattercloud', network: 'test' })).to.throw('MatterCloud API does not support the "test" network')
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ api: 'mock' })).to.throw('Invalid api: "mock"')
        expect(() => new Run({ api: 'bad' })).to.throw('Invalid api: "bad"')
        expect(() => new Run({ api: null })).to.throw('Invalid api: null')
        expect(() => new Run({ api: 123 })).to.throw('Invalid api: 123')
        expect(() => new Run({ api: 'WhatsOnChain' })).to.throw('Invalid api: "WhatsOnChain"')
      })
    })

    // ------------------------------------------------------------------------
    // apiKey
    // ------------------------------------------------------------------------

    describe('apiKey', () => {
      it('defaults to default', () => {
        expect(new Run().apiKey).to.equal(Run.defaults.apiKey)
      })

      // ------------------------------------------------------------------------

      it('assigns api key for run', () => {
        expect(new Run({ network: 'main', api: 'mattercloud', apiKey: 'abc' }).apiKey).to.equal('abc')
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ network: 'main', api: 'whatsonchain', apiKey: null })).to.throw('Invalid apiKey: null')
      })
    })

    // --------------------------------------------------------------------------
    // app
    // --------------------------------------------------------------------------

    describe('app', () => {
      it('defaults to default', () => {
        expect(new Run().app).to.equal(Run.defaults.app)
      })

      // ------------------------------------------------------------------------

      it('custom app', () => {
        expect(new Run({ app: '' }).app).to.equal('')
        expect(new Run({ app: '123abc' }).app).to.equal('123abc')
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ app: undefined })).to.throw('Invalid app: undefined')
        expect(() => new Run({ app: null })).to.throw('Invalid app: null')
        expect(() => new Run({ app: 123 })).to.throw('Invalid app: 123')
        expect(() => new Run({ app: new Map() })).to.throw('Invalid app: [object Map]')
      })
    })

    // --------------------------------------------------------------------------
    // autofund
    // --------------------------------------------------------------------------

    describe('autofund', () => {
      it('defaults to default', () => {
        expect(new Run().autofund).to.equal(Run.defaults.autofund)
      })

      // ------------------------------------------------------------------------

      it('true', async () => {
        const run = new Run({ autofund: true, network: 'mock' })
        expect(run.autofund).to.equal(true)
        expect((await run.blockchain.utxos(run.purse.address)).length > 0).to.equal(true)
      })

      // ------------------------------------------------------------------------

      it('false', async () => {
        const run = new Run({ autofund: false, network: 'mock' })
        expect(run.autofund).to.equal(false)
        expect((await run.blockchain.utxos(run.purse.address)).length > 0).to.equal(false)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ autofund: undefined })).to.throw('Invalid autofund: undefined')
        expect(() => new Run({ autofund: null })).to.throw('Invalid autofund: null')
        expect(() => new Run({ autofund: -1 })).to.throw('Invalid autofund: -1')
        expect(() => new Run({ autofund: new Set() })).to.throw('Invalid autofund: [object Set]')
      })
    })

    // ------------------------------------------------------------------------
    // blockchain
    // ------------------------------------------------------------------------

    describe('blockchain', () => {
      it('defaults to api if main', () => {
        const run = new Run({ api: 'run', network: 'main' })
        expect(run.blockchain instanceof RunConnect).to.equal(true)
        expect(run.blockchain.api).to.equal('run')
        expect(run.blockchain.network).to.equal('main')
      })

      // ------------------------------------------------------------------------

      it('defaults to mockchain if mock', () => {
        const run = new Run({ network: 'mock' })
        expect(run.blockchain instanceof Mockchain).to.equal(true)
      })

      // ------------------------------------------------------------------------

      it('mockchain', () => {
        const blockchain = new Mockchain()
        const run = new Run({ blockchain })
        expect(run.blockchain).to.equal(blockchain)
        expect(run.network).to.equal('mock')
        expect(run.api).to.equal(undefined)
        expect(run.apiKey).to.equal(undefined)
      })

      // ------------------------------------------------------------------------

      it('run', () => {
        const blockchain = new RunConnect()
        const run = new Run({ blockchain })
        expect(run.blockchain).to.equal(blockchain)
        expect(run.network).to.equal('main')
        expect(run.api).to.equal(undefined)
        expect(run.apiKey).to.equal(undefined)
        expect(run.blockchain.api).to.equal('run')
        expect(run.blockchain.apiKey).to.equal(undefined)
      })

      // ------------------------------------------------------------------------

      it('mattercloud', () => {
        const blockchain = new MatterCloud({ apiKey: 'abc' })
        const run = new Run({ blockchain })
        expect(run.blockchain).to.equal(blockchain)
        expect(run.network).to.equal('main')
        expect(run.api).to.equal(undefined)
        expect(run.apiKey).to.equal(undefined)
        expect(run.blockchain.api).to.equal('mattercloud')
        expect(run.blockchain.apiKey).to.equal('abc')
      })

      // ------------------------------------------------------------------------

      it('whatsonchain', () => {
        const blockchain = new WhatsOnChain({ network: 'test', apiKey: '123' })
        const run = new Run({ blockchain })
        expect(run.blockchain).to.equal(blockchain)
        expect(run.network).to.equal('test')
        expect(run.api).to.equal(undefined)
        expect(run.apiKey).to.equal(undefined)
        expect(run.blockchain.api).to.equal('whatsonchain')
        expect(run.blockchain.apiKey).to.equal('123')
      })

      // ------------------------------------------------------------------------

      it('custom', () => {
        let fetched = false
        const blockchain = {
          network: 'main',
          broadcast: async () => {},
          fetch: async () => { fetched = true },
          utxos: async () => {},
          time: async () => 0,
          spends: async () => null
        }
        const run = new Run({ blockchain })
        run.blockchain.fetch()
        expect(fetched).to.equal(true)
        expect(run.blockchain).to.equal(blockchain)
      })

      // ------------------------------------------------------------------------

      it('defaults to default', () => {
        const defaultBlockchain = Run.defaults.blockchain
        Run.defaults.blockchain = new MatterCloud()
        expect(new Run().blockchain).to.equal(Run.defaults.blockchain)
        Run.defaults.blockchain = defaultBlockchain
      })

      // ------------------------------------------------------------------------

      it('resuses mockchain', () => {
        const run = new Run({ network: 'mock' })
        const run2 = new Run({ network: 'mock' })
        expect(run.blockchain).to.equal(run2.blockchain)
      })

      // ------------------------------------------------------------------------

      it('resuses blockchain if same api, apiKey, and network', () => {
        const run = new Run({ api: 'whatsonchain', apiKey: 'abc', network: 'test' })
        const run2 = new Run({ api: 'whatsonchain', apiKey: 'abc', network: 'test' })
        expect(run.blockchain).to.equal(run2.blockchain)
      })

      // ------------------------------------------------------------------------

      it('does not reuse blockchain if different apis', () => {
        const run = new Run({ api: 'mattercloud', apiKey: 'abc', network: 'main' })
        const run2 = new Run({ api: 'whatsonchain', apiKey: 'abc', network: 'main' })
        expect(run.blockchain).not.to.equal(run2.blockchain)
      })

      // ------------------------------------------------------------------------

      it('does not reuse blockchain if different api keys', () => {
        const run = new Run({ api: 'mattercloud', apiKey: 'abc', network: 'main' })
        const run2 = new Run({ api: 'mattercloud', apiKey: 'def', network: 'main' })
        expect(run.blockchain).not.to.equal(run2.blockchain)
      })

      // ------------------------------------------------------------------------

      it('does not reuse blockchain if different networks', () => {
        const run = new Run({ api: 'run', network: 'main' })
        const run2 = new Run({ api: 'run', network: 'test' })
        expect(run.blockchain).not.to.equal(run2.blockchain)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ blockchain: undefined })).to.throw('Invalid blockchain: undefined')
        expect(() => new Run({ blockchain: null })).to.throw('Invalid blockchain: null')
        expect(() => new Run({ blockchain: 123 })).to.throw('Invalid blockchain: 123')
        expect(() => new Run({ blockchain: false })).to.throw('Invalid blockchain: false')
        expect(() => new Run({ blockchain: () => {} })).to.throw('Invalid blockchain: [anonymous function]')
        const blockchain = {
          network: 'main',
          broadcast: async () => {},
          fetch: async () => { },
          time: async () => 0,
          spends: async () => null
        }
        expect(() => new Run({ blockchain })).to.throw('Invalid blockchain: [object Object]')
      })

      // ------------------------------------------------------------------------

      it('throws if incompatible settings', () => {
        expect(() => new Run({ blockchain: new Mockchain(), api: 'run' })).to.throw('Blockchain mismatch with "run" api')
        expect(() => new Run({ blockchain: new Mockchain(), apiKey: 'abc' })).to.throw('Blockchain mismatch with "abc" apiKey')
        expect(() => new Run({ blockchain: new Mockchain(), network: 'main' })).to.throw('Blockchain mismatch with "main" network')
        expect(() => new Run({ blockchain: new RunConnect(), network: 'mock' })).to.throw('Blockchain mismatch with "mock" network')
        expect(() => new Run({ blockchain: new WhatsOnChain(), api: 'run' })).to.throw('Blockchain mismatch with "run" api')
      })
    })

    // --------------------------------------------------------------------------
    // cache
    // --------------------------------------------------------------------------

    describe('cache', () => {
      if (BROWSER) {
        it('defaults to BrowserCache if browser', () => {
          expect(new Run().cache instanceof BrowserCache).to.equal(true)
          expect(new Run().cache.localCache instanceof LocalCache).to.equal(true)
        })
      } else {
        it('defaults to NodeCache if node', () => {
          expect(new Run().cache instanceof NodeCache).to.equal(true)
        })
      }

      // ------------------------------------------------------------------------

      it('local cache', () => {
        const cache = new LocalCache()
        expect(new Run({ cache }).cache).to.equal(cache)
      })

      // ------------------------------------------------------------------------

      it('map', () => {
        const cache = new Map()
        expect(new Run({ cache }).cache).to.equal(cache)
      })

      // ------------------------------------------------------------------------

      it('custom', () => {
        const cache = { get: () => { }, set: () => { } }
        expect(new Run({ cache }).cache).to.equal(cache)
      })

      // ------------------------------------------------------------------------

      it('defaults to default', () => {
        const defaultCache = Run.defaults.cache
        Run.defaults.cache = new LocalCache()
        expect(new Run().cache).to.equal(Run.defaults.cache)
        Run.defaults.cache = defaultCache
      })

      // ------------------------------------------------------------------------

      it('reuses cache if same network', () => {
        const run = new Run()
        const run2 = new Run()
        expect(run.cache).to.equal(run2.cache)
      })

      // ------------------------------------------------------------------------

      it('does not reuse cache if different networks', () => {
        const run = new Run({ network: 'main' })
        const run2 = new Run({ network: 'mock' })
        expect(run.cache).not.to.equal(run2.cache)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ cache: undefined })).to.throw('Invalid cache: undefined')
        expect(() => new Run({ cache: null })).to.throw('Invalid cache: null')
        expect(() => new Run({ cache: {} })).to.throw('Invalid cache: [object Object]')
        expect(() => new Run({ cache: new Set() })).to.throw('Invalid cache: [object Set]')
        expect(() => new Run({ cache: { get: () => { } } })).to.throw('Invalid cache: [object Object]')
        expect(() => new Run({ cache: { set: () => { } } })).to.throw('Invalid cache: [object Object]')
        expect(() => new Run({ cache: { get: () => { }, set: 1 } })).to.throw('Invalid cache: [object Object]')
        expect(() => new Run({ cache: { get: null, set: () => {} } })).to.throw('Invalid cache: [object Object]')
      })
    })

    // --------------------------------------------------------------------------
    // client
    // --------------------------------------------------------------------------

    describe('client', () => {
      it('defaults to default', () => {
        expect(new Run().client).to.equal(Run.defaults.client)
      })

      // ------------------------------------------------------------------------

      it('boolean', () => {
        expect(new Run({ client: true }).client).to.equal(true)
        expect(new Run({ client: false }).client).to.equal(false)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ client: undefined })).to.throw('Invalid client: undefined')
        expect(() => new Run({ client: null })).to.throw('Invalid client: null')
        expect(() => new Run({ client: -1 })).to.throw('Invalid client: -1')
        expect(() => new Run({ client: new Set() })).to.throw('Invalid client: [object Set]')
      })
    })

    // --------------------------------------------------------------------------
    // debug
    // --------------------------------------------------------------------------

    describe('debug', () => {
      it('defaults to default', () => {
        expect(new Run().debug).to.equal(Run.defaults.debug)
      })

      // ------------------------------------------------------------------------

      it('boolean', () => {
        expect(new Run({ debug: true }).debug).to.equal(true)
        expect(new Run({ debug: false }).debug).to.equal(false)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ debug: undefined })).to.throw('Invalid debug: undefined')
        expect(() => new Run({ debug: null })).to.throw('Invalid debug: null')
        expect(() => new Run({ debug: 1 })).to.throw('Invalid debug: 1')
        expect(() => new Run({ debug: () => {} })).to.throw('Invalid debug: [anonymous function]')
      })
    })

    // ------------------------------------------------------------------------
    // inventory
    // ------------------------------------------------------------------------

    describe('inventory', () => {
      it('defaults to new inventory', () => {
        expect(new Run().inventory instanceof Inventory).to.equal(true)
      })

      // ------------------------------------------------------------------------

      it('may pass existing inventory', () => {
        const inventory = new Inventory()
        expect(new Run({ inventory }).inventory).to.equal(inventory)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ inventory: undefined })).to.throw('Invalid inventory: undefined')
        expect(() => new Run({ inventory: null })).to.throw('Invalid inventory: null')
        expect(() => new Run({ inventory: true })).to.throw('Invalid inventory: true')
        expect(() => new Run({ inventory: {} })).to.throw('Invalid inventory: [object Object]')
        expect(() => new Run({ inventory: 123 })).to.throw('Invalid inventory: 123')
      })

      // ------------------------------------------------------------------------

      it('does not reuse across run instances', () => {
        const run = new Run()
        const run2 = new Run()
        expect(run.inventory).not.to.equal(run2.inventory)
      })
    })

    // ------------------------------------------------------------------------
    // logger
    // ------------------------------------------------------------------------

    describe('logger', () => {
      it('defaults to default', () => {
        expect(new Run().logger).to.equal(Run.defaults.logger)
      })

      // ------------------------------------------------------------------------

      it('null', () => {
        expect(new Run({ logger: null }).logger).to.equal(null)
      })

      // ------------------------------------------------------------------------

      it('console', () => {
        expect(new Run({ logger: console }).logger).to.equal(console)
      })

      // ------------------------------------------------------------------------

      it('custom', () => {
        expect(() => new Run({ logger: {} })).not.to.throw()

        // Create a basic info logger as an object
        let loggedInfo = false
        const run = new Run({ logger: { info: () => { loggedInfo = true } } })
        run.logger.info('test')
        expect(loggedInfo).to.equal(true)

        // Create a basic error logger as a function object
        let loggedError = false
        const functionLogger = function () { }
        functionLogger.error = () => { loggedError = true }
        const run2 = new Run({ logger: functionLogger })
        run2.logger.error('test')
        expect(loggedError).to.equal(true)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ logger: 1 })).to.throw('Invalid logger: 1')
        expect(() => new Run({ logger: false })).to.throw('Invalid logger: false')
        expect(() => new Run({ logger: 'none' })).to.throw('Invalid logger: "none"')
        expect(() => new Run({ logger: undefined })).to.throw('Invalid logger: undefined')
      })
    })

    // ------------------------------------------------------------------------
    // network
    // ------------------------------------------------------------------------

    describe('network', () => {
      it('RunConnect used for main network', () => {
        const run = new Run({ network: 'main' })
        expect(run.blockchain instanceof RunConnect).to.equal(true)
        expect(run.state instanceof RunConnect).to.equal(true)
        expect(run.cache instanceof RunConnect).to.equal(false)
        expect(run.api).to.equal('run')
      })

      // ------------------------------------------------------------------------

      it('RunConnect used for test network', () => {
        const run = new Run({ network: 'test', purse: undefined, owner: undefined })
        expect(run.blockchain instanceof RunConnect).to.equal(true)
        expect(run.state instanceof RunConnect).to.equal(false)
        expect(run.cache instanceof RunConnect).to.equal(false)
        expect(run.api).to.equal('run')
      })

      // ------------------------------------------------------------------------

      it('WhatsOnChain used for stn network', () => {
        const run = new Run({ network: 'stn', purse: undefined, owner: undefined })
        expect(run.blockchain instanceof WhatsOnChain).to.equal(true)
        expect(run.cache instanceof RunConnect).to.equal(false)
        expect(run.api).to.equal('whatsonchain')
      })

      // ------------------------------------------------------------------------

      it('Mockchain used for mock network', () => {
        const run = new Run({ network: 'mock', purse: undefined, owner: undefined })
        expect(run.blockchain instanceof Mockchain).to.equal(true)
        expect(run.cache instanceof RunConnect).to.equal(false)
        expect(run.api).to.equal(undefined)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ network: '' })).to.throw('Unsupported network')
        expect(() => new Run({ network: 'mainnet' })).to.throw('Unsupported network')
        expect(() => new Run({ network: 'tester' })).to.throw('Unsupported network')
        expect(() => new Run({ network: 'mocknet' })).to.throw('Unsupported network')
        expect(() => new Run({ network: null })).to.throw('Unsupported network')
      })
    })

    // --------------------------------------------------------------------------
    // networkRetries
    // --------------------------------------------------------------------------

    describe('networkRetries', () => {
      it('defaults to default', () => {
        const previousDefault = Run.defaults.networkRetries
        Run.defaults.networkRetries = 10
        expect(new Run().networkRetries).to.equal(Run.defaults.networkRetries)
        expect(request.defaults.retries).to.equal(Run.defaults.networkRetries)
        Run.defaults.networkRetries = previousDefault
      })

      // ------------------------------------------------------------------------

      it('non-negative integer', () => {
        const test = (x) => {
          expect(new Run({ networkRetries: x }).networkRetries).to.equal(x)
          expect(request.defaults.retries).to.equal(x)
        }
        test(0)
        test(1)
        test(10)
        test(Number.MAX_SAFE_INTEGER)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        const retriesBefore = request.defaults.retries
        expect(() => new Run({ networkRetries: undefined })).to.throw('Invalid network retries: undefined')
        expect(() => new Run({ networkRetries: null })).to.throw('Invalid network retries: null')
        expect(() => new Run({ networkRetries: {} })).to.throw('Invalid network retries: [object Object]')
        expect(() => new Run({ networkRetries: () => {} })).to.throw('Invalid network retries: [anonymous function]')
        expect(() => new Run({ networkRetries: -1 })).to.throw('Invalid network retries: -1')
        expect(() => new Run({ networkRetries: Number.MAX_VALUE })).to.throw(`Invalid network retries: ${Number.MAX_VALUE}`)
        expect(() => new Run({ networkRetries: NaN })).to.throw('Invalid network retries: NaN')
        expect(() => new Run({ networkRetries: Infinity })).to.throw('Invalid network retries: Infinity')
        expect(() => new Run({ networkRetries: 1.5 })).to.throw('Invalid network retries: 1.5')
        expect(() => new Run({ networkRetries: -1.5 })).to.throw('Invalid network retries: -1.5')
        expect(request.defaults.retries).to.equal(retriesBefore)
      })
    })

    // --------------------------------------------------------------------------
    // networkTimeout
    // --------------------------------------------------------------------------

    describe('networkTimeout', () => {
      it('defaults to default', () => {
        const previousDefault = Run.defaults.networkTimeout
        Run.defaults.networkTimeout = 18000
        expect(new Run().networkTimeout).to.equal(Run.defaults.networkTimeout)
        expect(request.defaults.timeout).to.equal(Run.defaults.networkTimeout)
        Run.defaults.networkRetries = previousDefault
      })

      // ------------------------------------------------------------------------

      it('non-negative number', () => {
        const test = (x) => {
          expect(new Run({ networkTimeout: x }).networkTimeout).to.equal(x)
          expect(request.defaults.timeout).to.equal(x)
        }
        test(0)
        test(1)
        test(10)
        test(1000000.5)
        test(Number.MAX_SAFE_INTEGER)
        test(Number.MAX_VALUE)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        const timeoutBefore = request.defaults.timeout
        expect(() => new Run({ networkTimeout: undefined })).to.throw('Invalid network timeout: undefined')
        expect(() => new Run({ networkTimeout: null })).to.throw('Invalid network timeout: null')
        expect(() => new Run({ networkTimeout: {} })).to.throw('Invalid network timeout: [object Object]')
        expect(() => new Run({ networkTimeout: () => {} })).to.throw('Invalid network timeout: [anonymous function]')
        expect(() => new Run({ networkTimeout: -1 })).to.throw('Invalid network timeout: -1')
        expect(() => new Run({ networkTimeout: NaN })).to.throw('Invalid network timeout: NaN')
        expect(() => new Run({ networkTimeout: Infinity })).to.throw('Invalid network timeout: Infinity')
        expect(() => new Run({ networkTimeout: -1.5 })).to.throw('Invalid network timeout: -1.5')
        expect(request.defaults.timeout).to.equal(timeoutBefore)
      })
    })

    // --------------------------------------------------------------------------
    // owner
    // --------------------------------------------------------------------------

    describe('owner', () => {
      it.skip('defaults to new random local owner', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('local owner', () => {
        // const cache = new LocalCache()
        // expect(new Run({ cache }).cache).to.equal(cache)
      })

      // ------------------------------------------------------------------------

      it.skip('private key string', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('public key string', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('private key bsv object', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('public key bsv object', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('address string mainnet', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('address string testnet', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('address bsv object mainnet', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('address bsv object testnet', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('throws if mainnet address string on testnet', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('throws if testnet address bsv object on mainnet', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('custom owner', () => {
        // const cache = { get: () => { }, set: () => { } }
        // expect(new Run({ cache }).cache).to.equal(cache)
      })

      // ------------------------------------------------------------------------

      it.skip('viewer', () => {
        // TODO
      })

      // ------------------------------------------------------------------------

      it.skip('defaults to default', () => {
        // const defaultCache = Run.defaults.cache
        // Run.defaults.cache = new LocalCache()
        // expect(new Run().cache).to.equal(Run.defaults.cache)
        // Run.defaults.cache = defaultCache
      })

      // ------------------------------------------------------------------------

      it.skip('does not reuse owner', () => {
        // const run = new Run({ network: 'main' })
        // const run2 = new Run({ network: 'mock' })
        // expect(run.cache).not.to.equal(run2.cache)
      })

      // ------------------------------------------------------------------------

      it.skip('throws if invalid', () => {
        // expect(() => new Run({ cache: undefined })).to.throw('Invalid cache: undefined')
        // expect(() => new Run({ cache: null })).to.throw('Invalid cache: null')
        // expect(() => new Run({ cache: {} })).to.throw('Invalid cache: [object Object]')
        // expect(() => new Run({ cache: new Set() })).to.throw('Invalid cache: [object Set]')
        // expect(() => new Run({ cache: { get: () => { } } })).to.throw('Invalid cache: [object Object]')
        // expect(() => new Run({ cache: { set: () => { } } })).to.throw('Invalid cache: [object Object]')
        // expect(() => new Run({ cache: { get: () => { }, set: 1 } })).to.throw('Invalid cache: [object Object]')
        // expect(() => new Run({ cache: { get: null, set: () => {} } })).to.throw('Invalid cache: [object Object]')
      })
    })

    // --------------------------------------------------------------------------
    // state
    // --------------------------------------------------------------------------

    describe('state', () => {
      it('defaults to RunConnect on mainnet', () => {
        const run = new Run({ network: 'main' })
        expect(run.state instanceof RunConnect).to.equal(true)
      })

      // ------------------------------------------------------------------------

      it('defaults to undefined on testnet', () => {
        const run = new Run({ network: 'test' })
        expect(run.state).to.equal(undefined)
      })

      // ------------------------------------------------------------------------

      it('defaults to undefined on non-run api', () => {
        const run = new Run({ network: 'main', api: 'mattercloud' })
        expect(run.state).to.equal(undefined)
      })

      // ------------------------------------------------------------------------

      it('defaults to default', () => {
        const stateBefore = Run.defaults.state
        Run.defaults.state = { state: () => { } }
        const run = new Run({ network: 'main', api: 'mattercloud' })
        expect(run.state).to.equal(Run.defaults.state)
        Run.defaults.state = stateBefore
      })

      // ------------------------------------------------------------------------

      it('custom state', () => {
        const state = { state: () => { } }
        const run = new Run({ state })
        expect(run.state).to.equal(state)
      })

      // ------------------------------------------------------------------------

      it('specify RunConnect with other api', () => {
        const state = new RunConnect()
        const run = new Run({ api: 'mattercloud', network: 'main', state })
        expect(run.state).to.equal(state)
      })

      // ------------------------------------------------------------------------

      it('reuses state if same network and api', () => {
        const state = { state: () => { } }
        new Run({ state }) // eslint-disable-line
        const run2 = new Run()
        expect(run2.state).to.equal(state)
      })

      // ------------------------------------------------------------------------

      it('does not reuse state if different network', () => {
        const state = { state: () => { } }
        new Run({ state, network: 'main' }) // eslint-disable-line
        const run2 = new Run({ network: 'test' })
        expect(run2.state).not.to.equal(state)
      })

      // ------------------------------------------------------------------------

      it('does not reuse state if different api', () => {
        const state = { state: () => { } }
        new Run({ state, network: 'main' }) // eslint-disable-line
        const run2 = new Run({ api: 'mattercloud', network: 'main' })
        expect(run2.state).not.to.equal(state)
      })

      // ------------------------------------------------------------------------

      it('throws if invalid', () => {
        expect(() => new Run({ state: undefined })).to.throw('Invalid state: undefined')
        expect(() => new Run({ state: null })).to.throw('Invalid state: null')
        expect(() => new Run({ state: {} })).to.throw('Invalid state: [object Object]')
        expect(() => new Run({ state: new Set() })).to.throw('Invalid state: [object Set]')
        expect(() => new Run({ state: { get: () => { } } })).to.throw('Invalid state: [object Object]')
        expect(() => new Run({ state: { state: 1 } })).to.throw('Invalid state: [object Object]')
        expect(() => new Run({ state: { state: null } })).to.throw('Invalid state: [object Object]')
      })
    })
  })

  // --------------------------------------------------------------------------
  // properties
  // --------------------------------------------------------------------------

  describe('properties', () => {
    // ------------------------------------------------------------------------
    // api
    // ------------------------------------------------------------------------

    describe('api', () => {
      it('run', () => {
        const run = new Run({ api: 'mattercloud', network: 'main' })
        run.api = 'run'
        expect(run.api).to.equal('run')
        expect(run.blockchain instanceof RunConnect).to.equal(true)
        expect(run.state instanceof RunConnect).to.equal(true)
        expect(run.cache instanceof RunConnect).to.equal(false)
        expect(run.network).to.equal('main')
      })

      // ----------------------------------------------------------------------

      it('mattercloud', () => {
        const run = new Run({ api: 'run', network: 'main' })
        run.api = 'mattercloud'
        expect(run.api).to.equal('mattercloud')
        expect(run.blockchain instanceof MatterCloud).to.equal(true)
        expect(run.cache instanceof RunConnect).to.equal(false)
        expect(run.network).to.equal('main')
      })

      // ----------------------------------------------------------------------

      it('whatsonchain', () => {
        const run = new Run({ api: 'run', network: 'test' })
        run.api = 'whatsonchain'
        expect(run.api).to.equal('whatsonchain')
        expect(run.blockchain instanceof WhatsOnChain).to.equal(true)
        expect(run.cache instanceof RunConnect).to.equal(false)
        expect(run.network).to.equal('test')
      })

      // ----------------------------------------------------------------------

      it('throws if unsupported', () => {
        const run = new Run({ api: 'run', network: 'test' })
        expect(() => { run.api = 'mattercloud' }).to.throw('MatterCloud API does not support the "test" network')
        expect(run.api).to.equal('run')
        expect(run.blockchain instanceof RunConnect).to.equal(true)
        expect(run.network).to.equal('test')
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run({ api: 'run', network: 'test' })
        expect(() => { run.api = 'mock' }).to.throw('Invalid api: "mock"')
        expect(() => { run.api = 'bad' }).to.throw('Invalid api: "bad"')
        expect(() => { run.api = null }).to.throw('Invalid api: null')
        expect(() => { run.api = 123 }).to.throw('Invalid api: 123')
        expect(run.api).to.equal('run')
        expect(run.blockchain instanceof RunConnect).to.equal(true)
        expect(run.network).to.equal('test')
      })

      // ----------------------------------------------------------------------

      it('change blockchain', () => {
        const run = new Run({ api: 'run', network: 'main' })
        run.blockchain = new Run.plugins.WhatsOnChain()
        expect(run.api).to.equal(undefined)
        run.blockchain = new Run.plugins.RunConnect()
        expect(run.api).to.equal(undefined)
        run.blockchain = new Run.plugins.Mockchain()
        expect(run.api).to.equal(undefined)
      })
    })

    // ------------------------------------------------------------------------
    // apiKey
    // ------------------------------------------------------------------------

    describe('apiKey', () => {
      it('change', () => {
        const run = new Run({ api: 'mattercloud', network: 'main' })
        run.apiKey = '123'
        expect(run.apiKey).to.equal(run.blockchain.apiKey)
        expect(run.apiKey).to.equal('123')
        expect(run.api).to.equal('mattercloud')
      })
    })

    // ------------------------------------------------------------------------
    // app
    // ------------------------------------------------------------------------

    describe('app', () => {
      it('change', () => {
        const run = new Run()
        run.app = 'abc'
        expect(run.app).to.equal('abc')
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run({ app: 'abc' })
        expect(() => { run.app = undefined }).to.throw('Invalid app: undefined')
        expect(() => { run.app = null }).to.throw('Invalid app: null')
        expect(() => { run.app = false }).to.throw('Invalid app: false')
        expect(() => { run.app = {} }).to.throw('Invalid app: [object Object]')
        expect(run.app).to.equal('abc')
      })
    })

    // ------------------------------------------------------------------------
    // autofund
    // ------------------------------------------------------------------------

    describe('autofund', () => {
      it('enable', async () => {
        const run = new Run({ network: 'mock', autofund: false })
        run.autofund = true
        expect(run.autofund).to.equal(true)
        expect((await run.blockchain.utxos(run.purse.address)).length > 0).to.equal(true)
      })

      // ----------------------------------------------------------------------

      it('disable', async () => {
        const run = new Run({ network: 'mock', autofund: true })
        run.autofund = false
        expect(run.autofund).to.equal(false)
        expect((await run.blockchain.utxos(run.purse.address)).length > 0).to.equal(true)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run({ autofund: true })
        expect(() => { run.autofund = undefined }).to.throw('Invalid autofund: undefined')
        expect(() => { run.autofund = null }).to.throw('Invalid autofund: null')
        expect(() => { run.autofund = 'abc' }).to.throw('Invalid autofund: "abc"')
        expect(() => { run.autofund = NaN }).to.throw('Invalid autofund: NaN')
        expect(run.autofund).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------
    // blockchain
    // ------------------------------------------------------------------------

    describe('blockchain', () => {
      it('change', () => {
        const run = new Run({ api: 'whatsonchain', network: 'test', apiKey: 'abc' })
        run.blockchain = new Mockchain()
        expect(run.api).to.equal(undefined)
        expect(run.apiKey).to.equal(undefined)
        expect(run.network).to.equal('mock')
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run()
        const blockchain = run.blockchain
        expect(() => { run.blockchain = undefined }).to.throw('Invalid blockchain: undefined')
        expect(() => { run.blockchain = null }).to.throw('Invalid blockchain: null')
        expect(() => { run.blockchain = {} }).to.throw('Invalid blockchain: [object Object]')
        expect(() => { run.blockchain = true }).to.throw('Invalid blockchain: true')
        expect(run.blockchain).to.equal(blockchain)
      })
    })

    // ------------------------------------------------------------------------
    // cache
    // ------------------------------------------------------------------------

    describe('cache', () => {
      it('change', () => {
        const run = new Run()
        const cache = new Map()
        run.cache = cache
        expect(run.cache === cache).to.equal(true)
        expect(cache.size).to.equal(0)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run()
        const cache = run.cache
        expect(() => { run.cache = undefined }).to.throw('Invalid cache: undefined')
        expect(() => { run.cache = null }).to.throw('Invalid cache: null')
        expect(() => { run.cache = { get: () => { } } }).to.throw('Invalid cache: [object Object]')
        expect(() => { run.cache = false }).to.throw('Invalid cache: false')
        expect(run.cache).to.equal(cache)
      })
    })

    // ------------------------------------------------------------------------
    // client
    // ------------------------------------------------------------------------

    describe('client', () => {
      it('change', () => {
        const run = new Run()
        const client = run.client
        run.client = !client
        expect(run.client).to.equal(!client)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run({ client: true })
        expect(() => { run.client = undefined }).to.throw('Invalid client: undefined')
        expect(() => { run.client = null }).to.throw('Invalid client: null')
        expect(() => { run.client = 'abc' }).to.throw('Invalid client: "abc"')
        expect(() => { run.client = {} }).to.throw('Invalid client: [object Object]')
        expect(run.client).to.equal(true)
      })
    })

    // ------------------------------------------------------------------------
    // debug
    // ------------------------------------------------------------------------

    describe('debug', () => {
      it('enable', async () => {
        const logger = stub({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} })
        const run = new Run({ logger })
        run.debug = false
        class A extends Jig { }
        const a = new A()
        await a.sync()
        expect(logger.debug.called).to.equal(false)
      })

      // ----------------------------------------------------------------------

      it('disable', async () => {
        const logger = stub({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} })
      new Run({ debug: true, logger }) // eslint-disable-line
        class A extends Jig { }
        const a = new A()
        await a.sync()
        expect(logger.debug.called).to.equal(true)
      })

      // ----------------------------------------------------------------------

      it('change', () => {
        const run = new Run()
        const debug = run.debug
        run.debug = !debug
        expect(run.debug).to.equal(!debug)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run({ debug: true })
        expect(() => { run.debug = undefined }).to.throw('Invalid debug: undefined')
        expect(() => { run.debug = null }).to.throw('Invalid debug: null')
        expect(() => { run.debug = 'abc' }).to.throw('Invalid debug: "abc"')
        expect(() => { run.debug = {} }).to.throw('Invalid debug: [object Object]')
        expect(run.debug).to.equal(true)
      })
    })

    // ----------------------------------------------------------------------
    // inventory
    // ----------------------------------------------------------------------

    describe('inventory', () => {
      it('set inventory', () => {
        const inventory = new Inventory()
        const run = new Run()
        run.inventory = inventory
        expect(run.inventory).to.equal(inventory)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run()
        const inventory = run.inventory
        expect(() => { run.inventory = undefined }).to.throw('Invalid inventory: undefined')
        expect(() => { run.inventory = null }).to.throw('Invalid inventory: null')
        expect(() => { run.inventory = true }).to.throw('Invalid inventory: true')
        expect(() => { run.inventory = [] }).to.throw('Invalid inventory: [object Array]')
        expect(() => { run.inventory = 'abc' }).to.throw('Invalid inventory: "abc"')
        expect(run.inventory).to.equal(inventory)
      })

      // ----------------------------------------------------------------------

      it('changes when change owner', () => {
        const run = new Run()
        const inventory = run.inventory
        run.owner = new bsv.PrivateKey().toString()
        expect(run.inventory).not.to.equal(inventory)
      })
    })

    // ------------------------------------------------------------------------
    // logger
    // ------------------------------------------------------------------------

    describe('logger', () => {
      it('custom', () => {
        const run = new Run()
        const originalLogger = run.logger
        const logger = {}
        run.logger = logger
        expect(run.logger).to.equal(logger)
        expect(run.logger).not.to.equal(originalLogger)
      })

      // ----------------------------------------------------------------------

      it('null', () => {
        const run = new Run()
        run.logger = null
        expect(run.logger).to.equal(null)
      })

      // ----------------------------------------------------------------------

      it('console', () => {
        const run = new Run()
        run.logger = console
        expect(run.logger).to.equal(console)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run({ logger: console })
        expect(() => { run.logger = 0 }).to.throw('Invalid logger: 0')
        expect(() => { run.logger = true }).to.throw('Invalid logger: true')
        expect(() => { run.logger = [] }).to.throw('Invalid logger: [object Array]')
        expect(() => { run.logger = undefined }).to.throw('Invalid logger: undefined')
        expect(run.logger).to.equal(console)
      })
    })

    // ------------------------------------------------------------------------
    // network
    // ------------------------------------------------------------------------

    describe('network', () => {
      it('change', () => {
        const run = new Run()
        run.network = 'main'
        expect(run.network).to.equal(run.blockchain.network)
        expect(run.network).to.equal('main')
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run()
        expect(() => { run.network = undefined }).to.throw('Unsupported network: undefined')
        expect(() => { run.network = null }).to.throw('Unsupported network: null')
        expect(() => { run.network = ['main'] }).to.throw('Unsupported network: [object Array]')
        expect(() => { run.network = -1 }).to.throw('Unsupported network: -1')
        expect(() => { run.network = true }).to.throw('Unsupported network: true')
        expect(() => { run.network = '' }).to.throw('Unsupported network: ""')
        expect(run.network).to.equal(Run.defaults.network)
      })
    })

    // ------------------------------------------------------------------------
    // networkRetries
    // ------------------------------------------------------------------------

    describe('networkRetries', () => {
      it('change', () => {
        const run = new Run()
        run.networkRetries = 10
        expect(run.networkRetries).to.equal(10)
        expect(request.defaults.retries).to.equal(10)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run()
        expect(() => { run.networkRetries = undefined }).to.throw('Invalid network retries: undefined')
        expect(() => { run.networkRetries = null }).to.throw('Invalid network retries: null')
        expect(() => { run.networkRetries = 100.1 }).to.throw('Invalid network retries: 100.1')
        expect(() => { run.networkRetries = -1 }).to.throw('Invalid network retries: -1')
        expect(() => { run.networkRetries = true }).to.throw('Invalid network retries: true')
        expect(() => { run.networkRetries = 'abc' }).to.throw('Invalid network retries: "abc"')
        expect(run.networkRetries).to.equal(Run.defaults.networkRetries)
        expect(request.defaults.retries).to.equal(Run.defaults.networkRetries)
      })
    })

    // ------------------------------------------------------------------------
    // networkTimeout
    // ------------------------------------------------------------------------

    describe('networkTimeout', () => {
      it('change', () => {
        const run = new Run()
        run.networkTimeout = 12345
        expect(run.networkTimeout).to.equal(12345)
        expect(request.defaults.timeout).to.equal(12345)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run()
        expect(() => { run.networkTimeout = undefined }).to.throw('Invalid network timeout: undefined')
        expect(() => { run.networkTimeout = null }).to.throw('Invalid network timeout: null')
        expect(() => { run.networkTimeout = Infinity }).to.throw('Invalid network timeout: Infinity')
        expect(() => { run.networkTimeout = -1 }).to.throw('Invalid network timeout: -1')
        expect(() => { run.networkTimeout = true }).to.throw('Invalid network timeout: true')
        expect(() => { run.networkTimeout = 'abc' }).to.throw('Invalid network timeout: "abc"')
        expect(run.networkTimeout).to.equal(Run.defaults.networkTimeout)
        expect(request.defaults.timeout).to.equal(Run.defaults.networkTimeout)
      })
    })

    // ------------------------------------------------------------------------
    // owner
    // ------------------------------------------------------------------------

    describe('owner', () => {
      it.skip('change', () => {
        /*
        const run = new Run()
        const cache = new Map()
        run.cache = cache
        expect(run.cache === cache).to.equal(true)
        expect(cache.size).to.equal(0)
        */
      })

      // ----------------------------------------------------------------------

      it.skip('reuses inventory if same owner', () => {
        // TODO
      })

      // ----------------------------------------------------------------------

      it.skip('creates new inventory if different owner', () => {
        // TODO
      })

      // ----------------------------------------------------------------------

      it.skip('throws if invalid', () => {
        /*
        const run = new Run()
        const cache = run.cache
        expect(() => { run.cache = undefined }).to.throw('Invalid cache: undefined')
        expect(() => { run.cache = null }).to.throw('Invalid cache: null')
        expect(() => { run.cache = { get: () => { } } }).to.throw('Invalid cache: [object Object]')
        expect(() => { run.cache = false }).to.throw('Invalid cache: false')
        expect(run.cache).to.equal(cache)
        */
      })
    })

    // ------------------------------------------------------------------------
    // state
    // ------------------------------------------------------------------------

    describe('state', () => {
      it('change', () => {
        const run = new Run()
        const state = { state: () => { } }
        run.state = state
        expect(run.state).to.equal(state)
      })

      // ----------------------------------------------------------------------

      it('throws if invalid', () => {
        const run = new Run()
        const state = run.state
        expect(() => { run.state = undefined }).to.throw('Invalid state: undefined')
        expect(() => { run.state = null }).to.throw('Invalid state: null')
        expect(() => { run.state = { state: new Map() } }).to.throw('Invalid state: [object Object]')
        expect(() => { run.state = false }).to.throw('Invalid state: false')
        expect(run.state).to.equal(state)
      })
    })
  })

  // --------------------------------------------------------------------------
  // activate
  // --------------------------------------------------------------------------

  describe('activate', () => {
    it('assigns instance', () => {
      const run = new Run({ debug: false })
      new Run({ debug: true }) // eslint-disable-line
      run.activate()
      expect(Run.instance).to.equal(run)
    })

    // ------------------------------------------------------------------------

    it('assigns debug to log', () => {
      const run = new Run({ debug: false })
      new Run({ debug: true }) // eslint-disable-line
      run.activate()
      expect(Log._enableDebug).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('assigns logger to log', () => {
      const run = new Run({ logger: { info: () => { } } })
      new Run({ logger: { warn: () => { } } }) // eslint-disable-line
      run.activate()
      expect(Log._logger).to.equal(run.logger)
    })

    // ------------------------------------------------------------------------

    it('assigns network retries to request', () => {
      const run = new Run({ networkRetries: 10 })
      new Run({ networkRetries: 11 }) // eslint-disable-line
      run.activate()
      expect(request.defaults.retries).to.equal(10)
    })

    // ------------------------------------------------------------------------

    it('assigns network timeout to request', () => {
      const run = new Run({ networkTimeout: 1200 })
      new Run({ networkTimeout: 1100 }) // eslint-disable-line
      run.activate()
      expect(request.defaults.timeout).to.equal(1200)
    })
  })

  // --------------------------------------------------------------------------
  // deactivate
  // --------------------------------------------------------------------------

  describe('deactivate', () => {
    it('clears instance', () => {
      const run = new Run()
      run.deactivate()
      expect(Run.instance).to.equal(null)
    })
  })

  // --------------------------------------------------------------------------
  // trust
  // --------------------------------------------------------------------------

  describe('trust', () => {
    it('trust valid values', () => {
      const run = new Run()
      run.trust('*')
      run.trust('cache')
      run.trust('61e1265acb3d93f1bf24a593d70b2a6b1c650ec1df90ddece8d6954ae3cdd915')
      run.trust('1111111111111111111111111111111111111111111111111111111111111111')
    })

    // ------------------------------------------------------------------------

    it('trust array of valid values', () => {
      const run = new Run()
      run.trust([
        '*',
        'cache',
        '61e1265acb3d93f1bf24a593d70b2a6b1c650ec1df90ddece8d6954ae3cdd915',
        '1111111111111111111111111111111111111111111111111111111111111111'
      ])
    })

    // ------------------------------------------------------------------------

    it('throws if invalid values', () => {
      const run = new Run()
      expect(() => run.trust('61e1265acb3d93f1bf24a593d70b2a6b1c650ec1df90ddece8d6954ae3cdd915_o1')).to.throw('Not trustable')
      expect(() => run.trust('')).to.throw('Not trustable')
      expect(() => run.trust(null)).to.throw('Not trustable')
      expect(() => run.trust(1)).to.throw('Not trustable')
      expect(() => run.trust('cache2')).to.throw('Not trustable')
      expect(() => run.trust('-')).to.throw('Not trustable')
      expect(() => run.trust('all')).to.throw('Not trustable')
      expect(() => run.trust([''])).to.throw('Not trustable')
      expect(() => run.trust(['*', ''])).to.throw('Not trustable')
    })
  })

  // TODO
  /*
  describe('constructor', () => {
    describe('purse', () => {
      it('should default to random purse', () => {
        const run = new Run()
        expect(run.purse instanceof LocalPurse).to.equal(true)
      })

      it('should throw for invalid purse', () => {
        expect(() => new Run({ purse: {} })).to.throw('Invalid purse: [object Object]')
        expect(() => new Run({ purse: 123 })).to.throw('Invalid purse: 123')
        expect(() => new Run({ purse: true })).to.throw('Invalid purse: true')
        expect(() => new Run({ purse: null }).purse).to.throw('Invalid purse: null')
      })
    })

    describe('misc', () => {
      it('should set global bsv network', () => {
      new Run({ network: 'main' }) // eslint-disable-line
        expect(bsv.Networks.defaultNetwork).to.equal(bsv.Networks.mainnet)
      new Run({ network: 'test' }) // eslint-disable-line
        expect(bsv.Networks.defaultNetwork).to.equal(bsv.Networks.testnet)
      })
    })
  })

  describe('purse', () => {
    it('throw accept setting valid purse', () => {
      const run = new Run()
      run.purse = new PrivateKey()
      expect(run.purse instanceof LocalPurse).to.equal(true)
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
      const key = new PrivateKey('testnet')
      const run = new Run({ owner: key, purse: key })
      class A extends Jig { set (name) { this.name = name; return this } }
      const a = new A()
      await a.sync()
      const purseUtxos = await run.purse.utxos()
      expect(purseUtxos.length).to.equal(10)
      await run.sync()
      expect(run.inventory.code.length).to.equal(1)
      expect(run.inventory.jigs.length).to.equal(1)

      const txid = run.inventory.code[0].location.slice(0, 64)
      const codeVout = parseInt(run.inventory.code[0].location.slice(66))
      const jigVout = parseInt(run.inventory.jigs[0].location.slice(66))
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

    it.skip('should reuse cache', async () => {
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
      new Run({ code: new run.inventory.code() }) // eslint-disable-line
      const a1 = new A()
      new Run({ code: new run.inventory.code() }) // eslint-disable-line
      const a2 = new A()
      expect(a1.constructor).not.to.equal(a2.constructor)
      expect(() => a2.set(a1)).to.throw('Different code instances')
    })
  })

  // TODO: Change Blockchain during publish throws?
  */
})

// ------------------------------------------------------------------------------------------------
