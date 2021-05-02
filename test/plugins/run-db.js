/**
 * run-db.js
 *
 * Tests for lib/plugins/run-db.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { stub } = require('sinon')
const Run = require('../env/run')
const { RequestError, TimeoutError } = Run.errors
const { RunDB } = Run.plugins

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const HOST = 'http://localhost:8000'

// ------------------------------------------------------------------------------------------------
// RunDB
// ------------------------------------------------------------------------------------------------

describe('RunDB', () => {
  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    it('tx', async () => {
      const rundb = new RunDB(HOST)
      rundb.request = stub().returns('def')
      expect(await rundb.get('tx://abc')).to.equal('def')
      expect(rundb.request.firstCall.firstArg).to.equal(`${HOST}/tx/abc`)
    })

    // ------------------------------------------------------------------------

    it('jig', async () => {
      const rundb = new RunDB(HOST)
      rundb.request = stub().returns('def')
      expect(await rundb.get('jig://abc')).to.equal('def')
      expect(rundb.request.firstCall.firstArg).to.equal(`${HOST}/jig/abc`)
    })

    // ------------------------------------------------------------------------

    it('berry', async () => {
      const rundb = new RunDB(HOST)
      rundb.request = stub().returns('def')
      expect(await rundb.get('berry://abc')).to.equal('def')
      expect(rundb.request.firstCall.firstArg).to.equal(`${HOST}/berry/abc`)
    })

    // ------------------------------------------------------------------------

    it('spend', async () => {
      const rundb = new RunDB(HOST)
      rundb.request = stub().returns(123)
      expect(await rundb.get('spend://abc')).to.equal(123)
      expect(rundb.request.firstCall.firstArg).to.equal(`${HOST}/spends/abc`)
    })

    // ------------------------------------------------------------------------

    it('time', async () => {
      const rundb = new RunDB(HOST)
      rundb.request = stub().returns('def')
      expect(await rundb.get('time://abc')).to.equal('def')
      expect(rundb.request.firstCall.firstArg).to.equal(`${HOST}/time/abc`)
    })

    // ------------------------------------------------------------------------

    it('trust', async () => {
      const rundb = new RunDB(HOST)
      rundb.request = stub().returns(true)
      expect(await rundb.get('trust://abc')).to.equal(true)
      expect(rundb.request.firstCall.firstArg).to.equal(`${HOST}/trust/abc`)
    })

    // ------------------------------------------------------------------------

    it.skip('ban not called', async () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('config not called', async () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('puts into local cache', async () => {
      const rundb = new RunDB(HOST)
      const responses = { }
      responses[`${HOST}/jig/5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o1`] = { kind: 'code', props: { deps: { Jig: { $jig: 'native://Jig' } }, location: '_o1', metadata: { emoji: '🐉' }, nonce: 1, origin: '_o1', owner: '14aJe8iM3HopTwa44Ed5ZQq2UxdDvrEMXo', satoshis: 0 }, src: 'class Dragon extends Jig {\n    init(name, age) {\n        this.name = name\n        this.age = age\n    }\n}', version: '04' }
      rundb.request = url => responses[url]
      await rundb.get('jig://5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o1')
      expect(typeof rundb.localCache.get('jig://5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o1')).to.equal('object')
    })

    // ------------------------------------------------------------------------

    it('gets from local cache', async () => {
      const rundb = new RunDB(HOST)
      await rundb.localCache.set('jig://5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o1', { kind: 'code', props: { deps: { Jig: { $jig: 'native://Jig' } }, location: '_o1', metadata: { emoji: '🐉' }, nonce: 1, origin: '_o1', owner: '14aJe8iM3HopTwa44Ed5ZQq2UxdDvrEMXo', satoshis: 0 }, src: 'class Dragon extends Jig {\n    init(name, age) {\n        this.name = name\n        this.age = age\n    }\n}', version: '04' })
      const value = await rundb.get('jig://5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o1')
      expect(typeof value).to.equal('object')
    })

    // ------------------------------------------------------------------------

    it('returns undefined if 404', async () => {
      const rundb = new RunDB(HOST)
      rundb.request = () => { throw new RequestError('Missing', 404) }
      const value = await rundb.get('jig://5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o1')
      expect(typeof value).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it('throws if timeout', async () => {
      const rundb = new RunDB(HOST)
      rundb.request = () => { throw new TimeoutError() }
      await expect(rundb.get('jig://abc')).to.be.rejected
    })
  })

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  describe('set', () => {
    it('sets in local cache', async () => {
      const rundb = new RunDB(HOST)
      await rundb.set('abc', 'def')
      expect(await rundb.localCache.get('abc')).to.equal('def')
    })
  })

  // --------------------------------------------------------------------------
  // unspent
  // --------------------------------------------------------------------------

  describe('unspent', () => {
    it('requests utxos', async () => {
      const rundb = new RunDB(HOST)
      rundb.request = stub()
      await rundb.unspent('abc')
      expect(rundb.request.callCount).to.equal(1)
      expect(rundb.request.firstCall.firstArg).to.deep.equal(`${HOST}/unspent?scripthash=abc`)
    })
  })

  // --------------------------------------------------------------------------
  // load
  // --------------------------------------------------------------------------

  describe('load', () => {
    it('load code', async () => {
      const rundb = new RunDB(HOST)
      const responses = { }
      responses[`${HOST}/jig/5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o1`] = { kind: 'code', props: { deps: { Jig: { $jig: 'native://Jig' } }, location: '_o1', metadata: { emoji: '🐉' }, nonce: 1, origin: '_o1', owner: '14aJe8iM3HopTwa44Ed5ZQq2UxdDvrEMXo', satoshis: 0 }, src: 'class Dragon extends Jig {\n    init(name, age) {\n        this.name = name\n        this.age = age\n    }\n}', version: '04' }
      rundb.request = url => responses[url]
      const run = new Run({ cache: rundb, client: true, network: 'main', trust: 'cache' })
      const C = await run.load('5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o1')
      expect(C instanceof Run.Code).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('load jig', async () => {
      const rundb = new RunDB(HOST)
      const responses = { }
      responses[`${HOST}/jig/5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o1`] = { kind: 'code', props: { deps: { Jig: { $jig: 'native://Jig' } }, location: '_o1', metadata: { emoji: '🐉' }, nonce: 1, origin: '_o1', owner: '14aJe8iM3HopTwa44Ed5ZQq2UxdDvrEMXo', satoshis: 0 }, src: 'class Dragon extends Jig {\n    init(name, age) {\n        this.name = name\n        this.age = age\n    }\n}', version: '04' }
      responses[`${HOST}/jig/f97197db9e78d30403d967c3e10a95a31d61ac3cb4925ca5884e49338b3f1bbb_o1`] = { cls: { $jig: '5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o1' }, kind: 'jig', props: { age: 5, location: '_o1', name: 'Spot', nonce: 1, origin: '_o1', owner: '14aJe8iM3HopTwa44Ed5ZQq2UxdDvrEMXo', satoshis: 0 }, version: '04' }
      rundb.request = url => responses[url]
      const run = new Run({ cache: rundb, client: true, network: 'main', trust: 'cache' })
      const C = await run.load('f97197db9e78d30403d967c3e10a95a31d61ac3cb4925ca5884e49338b3f1bbb_o1')
      expect(C instanceof Run.Jig).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // live
  // --------------------------------------------------------------------------

  describe.skip('live', () => {
    it('load jig from cache', async () => {
      const rundb = new RunDB(HOST)
      const run = new Run({ cache: rundb, client: true, network: 'main', trust: 'cache' })
      await run.load('c07f9f41fc8a4d78be44a6c3e3d38d2ae58ae62f3ac6f33e567f4f4a653b5f20_o1')
    })

    // ------------------------------------------------------------------------

    it('throws if load missing', async () => {
      const rundb = new RunDB(HOST)
      const run = new Run({ cache: rundb, client: true, network: 'main', trust: 'cache' })
      await expect(run.load('1111111111111111111111111111111111111111111111111111111111111111_o1')).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('sync from origin', async () => {
      const rundb = new RunDB(HOST)
      const run = new Run({ cache: rundb, client: true, network: 'main', trust: [] })
      const ShuaCoin = await run.load('ce8629aa37a1777d6aa64d0d33cd739fd4e231dc85cfe2f9368473ab09078b78_o1')
      await ShuaCoin.sync()
    })

    // ------------------------------------------------------------------------

    it('gets unspent from inventory', async () => {
      const rundb = new RunDB(HOST)
      const run = new Run({ cache: rundb, client: true, network: 'main', trust: [] })
      run.owner = '1NERTLQqq1MwJSq31DW2MQXEtJsb6TyX3y'
      await run.inventory.sync()
      expect(run.inventory.jigs.length > 0).to.equal(true)
      expect(run.inventory.code.length > 0).to.equal(true)
    })
  })
})

// ------------------------------------------------------------------------------------------------
