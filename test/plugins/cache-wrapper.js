/**
 * cache-wrapper.js
 *
 * Tests for lib/plugins/cache-wrapper.js
 */

const { describe, it } = require('mocha')
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
    expect(logger.info.args[0].join(' ').includes('[Cache] Get 123')).to.equal(true)
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
    expect(logger.info.args[0].join(' ').includes('[MyCache] Get 123')).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('logs set call', async () => {
    const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
    Log._logger = logger
    const cache = stub({ get: () => {}, set: () => {} })
    const wrapper = new CacheWrapper(cache)
    await wrapper.set('123', [])
    expect(logger.info.args[0].join(' ').includes('[Cache] Set 123')).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('logs get performance in debug', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('logs set performance in debug', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('validates get arguments', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('validates get response', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('validates set arguments', () => {
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
