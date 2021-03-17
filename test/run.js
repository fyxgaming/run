/**
 * run.js
 *
 * Tests for lib/run.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const bsv = require('bsv')
const { expect } = require('chai')
const Run = require('./env/run')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Run
// ------------------------------------------------------------------------------------------------

describe('Run', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // api
  // --------------------------------------------------------------------------

  describe('api', () => {
    it('change', () => {
      const run = new Run({ api: 'run', apiKey: '123', network: 'test' })
      run.api = 'whatsonchain'
      expect(run.api).to.equal(run.blockchain.api)
      expect(run.api).to.equal('whatsonchain')
      expect(run.apiKey).to.equal('123')
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
  // util
  // --------------------------------------------------------------------------

  describe('util', () => {
    it('metadata', async () => {
      const run = new Run({ app: 'TestApp' })
      class A extends Jig { }
      run.deploy(A)
      await run.sync()
      const txid = A.location.slice(0, 64)
      const rawtx = await run.blockchain.fetch(txid)
      const metadata = Run.util.metadata(rawtx)

      const exec = [{ op: 'DEPLOY', data: [A.toString(), { deps: { Jig: { $jig: 0 } } }] }]
      expect(typeof metadata).to.equal('object')
      expect(metadata.version).to.equal(Run.protocol)
      expect(metadata.app).to.equal('TestApp')
      expect(metadata.in).to.equal(0)
      expect(metadata.ref).to.deep.equal(['native://Jig'])
      expect(metadata.out.length).to.equal(1)
      expect(metadata.del.length).to.equal(0)
      expect(metadata.cre).to.deep.equal([run.owner.address])
      expect(metadata.exec).to.deep.equal(exec)
    })

    // ------------------------------------------------------------------------

    it('throws if invalid transaction', () => {
      expect(() => Run.util.metadata()).to.throw('Invalid transaction')
      expect(() => Run.util.metadata(null)).to.throw('Invalid transaction')
      expect(() => Run.util.metadata('')).to.throw('Invalid transaction')
      expect(() => Run.util.metadata(new bsv.Transaction())).to.throw('Invalid transaction')
    })

    // ------------------------------------------------------------------------

    it.skip('throws if not a run transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if invalid run metadata', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
