/**
 * cache-wrapper.js
 *
 * Tests for lib/plugins/cache-wrapper.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { stub } = require('sinon')
const Run = require('../env/run')
const { CacheWrapper } = Run.plugins
const unmangle = require('../env/unmangle')
const Log = unmangle(unmangle(Run)._Log)

// ------------------------------------------------------------------------------------------------
// CacheWrapper
// ------------------------------------------------------------------------------------------------

describe('CacheWrapper', () => {
  it('wraps get', async () => {
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    cache.get.returns(456)
    const response = await wrapper.get('123')
    expect(response).to.equal(456)
  })

  // --------------------------------------------------------------------------

  it('wraps set', async () => {
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    await wrapper.set('123', 456)
    expect(cache.set.calledWith('123', 456)).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('logs get call', async () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    await wrapper.get('123')
    expect(logger.info.args.some(args => args.join(' ').includes('[Cache] Get 123'))).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('logs preferably with class name', async () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    class MyCache {
      get () {}
      set () {}
    }
    const cache = stub(new MyCache())
    const wrapper = new CacheWrapper(cache)
    await wrapper.get('123')
    expect(logger.info.args.some(args => args.join(' ').includes('[MyCache] Get 123'))).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('logs set call', async () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    await wrapper.set('123', [])
    expect(logger.info.args.some(args => args.join(' ').includes('[Cache] Set 123'))).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('logs get performance in debug', async () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    await wrapper.get('123')
    expect(logger.debug.args.some(args => args.join(' ').includes('[Cache] Get (end): '))).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('logs set performance in debug', async () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    await wrapper.set('123', [])
    expect(logger.debug.args.some(args => args.join(' ').includes('[Cache] Set (end): '))).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('logs get value in debug', async () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    const cache = stub({ get: () => {}, set: () => {} })
    cache.get.returns(true)
    const wrapper = new CacheWrapper(cache)
    await wrapper.get('123')
    expect(logger.debug.args.some(args => args.join(' ').includes('[Cache] Value: true'))).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('logs set value in debug', async () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    await wrapper.set('123', null)
    expect(logger.debug.args.some(args => args.join(' ').includes('[Cache] Value: null'))).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('validates get key is string', async () => {
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    await expect(wrapper.get(null)).to.be.rejectedWith('Invalid key: null')
    await expect(wrapper.get('')).to.be.rejectedWith('Invalid key: ""')
    await expect(wrapper.get([])).to.be.rejectedWith('Invalid key: [object Array]')
    await expect(wrapper.get(true)).to.be.rejectedWith('Invalid key: true')
  })

  // --------------------------------------------------------------------------

  it('validates get response is json or undefined', async () => {
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    cache.get.returns(new Set())
    await expect(wrapper.get('123')).to.be.rejectedWith('Invalid value retrieved for 123')
    cache.get.returns(Infinity)
    await expect(wrapper.get('123')).to.be.rejectedWith('Invalid value retrieved for 123')
    cache.get.returns([Infinity])
    await expect(wrapper.get('123')).to.be.rejectedWith('Invalid value retrieved for 123')
  })

  // --------------------------------------------------------------------------

  it('validates set key is string', async () => {
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    await expect(wrapper.set(null, true)).to.be.rejectedWith('Invalid key: null')
    await expect(wrapper.set('', true)).to.be.rejectedWith('Invalid key: ""')
    await expect(wrapper.set([], true)).to.be.rejectedWith('Invalid key: [object Array]')
    await expect(wrapper.set(true, true)).to.be.rejectedWith('Invalid key: true')
  })

  // --------------------------------------------------------------------------

  it('validates set value is json', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('enforces immutable keys', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('updates code filter', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('disable wrapping', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('enable wrapping', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
