/**
 * run.js
 *
 * Tests for lib/run.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('./env/run')
const { RunConnect, WhatsOnChain, Mockchain } = Run.plugins

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
    it('RunConnect used for main network', () => {
      const run = new Run({ network: 'main' })
      expect(run.blockchain instanceof RunConnect).to.equal(true)
      expect(run.cache instanceof RunConnect).to.equal(true)
      expect(run.api).to.equal('run')
    })

    // ------------------------------------------------------------------------

    it('RunConnect used for test network', () => {
      const run = new Run({ network: 'test', purse: undefined, owner: undefined })
      expect(run.blockchain instanceof RunConnect).to.equal(true)
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

    it('throws for invalid network', () => {
      expect(() => new Run({ network: '' })).to.throw('Unsupported network')
      expect(() => new Run({ network: 'mainnet' })).to.throw('Unsupported network')
      expect(() => new Run({ network: 'tester' })).to.throw('Unsupported network')
      expect(() => new Run({ network: 'mocknet' })).to.throw('Unsupported network')
      expect(() => new Run({ network: null })).to.throw('Unsupported network')
    })

    // ------------------------------------------------------------------------

    it('throws for bad api', () => {
      expect(() => new Run({ api: 'bad' })).to.throw('Invalid API: bad')
      expect(() => new Run({ api: null })).to.throw('Invalid API: null')
      expect(() => new Run({ api: 123 })).to.throw('Invalid API: 123')
    })
  })

  // --------------------------------------------------------------------------
  // api
  // --------------------------------------------------------------------------

  describe('api', () => {
    it('change', () => {
      const run = new Run({ api: 'run', apiKey: '123', network: 'test' })
      run.api = 'whatsonchain'
      expect(run.api).to.equal(run.blockchain.api)
      expect(run.api).to.equal('whatsonchain')
      expect(run.blockchain instanceof WhatsOnChain).to.equal(true)
      expect(run.network).to.equal('test')
    })
  })

  // --------------------------------------------------------------------------
  // apiKey
  // --------------------------------------------------------------------------

  describe('apiKey', () => {
    it('change', () => {
      const run = new Run({ api: 'mattercloud', network: 'main' })
      run.apiKey = '123'
      expect(run.apiKey).to.equal(run.blockchain.apiKey)
      expect(run.apiKey).to.equal('123')
      expect(run.api).to.equal('mattercloud')
    })
  })

  // --------------------------------------------------------------------------
  // network
  // --------------------------------------------------------------------------

  describe('network', () => {
    it('change', () => {
      const run = new Run()
      run.network = 'main'
      expect(run.network).to.equal(run.blockchain.network)
      expect(run.network).to.equal('main')
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
})

// ------------------------------------------------------------------------------------------------
