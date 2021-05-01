/**
 * request.js
 *
 * Tests for lib/util/request.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { TimeoutError, RequestError } = Run.errors
const unmangle = require('../env/unmangle')
const request = unmangle(Run)._request
const { _dedup, _cache } = unmangle(request)

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const timeout = 10000

// ------------------------------------------------------------------------------------------------
// request
// ------------------------------------------------------------------------------------------------

describe('request', () => {
  // --------------------------------------------------------------------------
  // request
  // --------------------------------------------------------------------------

  describe('request', () => {
    it('get returns json', async function () {
      this.timeout(timeout)
      const status = await request('https://api.run.network/v1/test/status', { timeout })
      expect(status.version > 0).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('posts json', async function () {
      this.timeout(timeout)
      const options = { method: 'POST', body: 'hello', timeout }
      const response = await request('https://httpbin.org/post', options)
      expect(response.data).to.equal('"hello"')
    })

    // ------------------------------------------------------------------------

    it('timeout', async function () {
      this.timeout(timeout)
      await expect(request('https://www.google.com:81', { timeout: 100 })).to.be.rejectedWith(TimeoutError)
    })

    // ------------------------------------------------------------------------

    it('client error', async function () {
      this.timeout(timeout)
      await expect(request('123', { timeout })).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('server error', async function () {
      this.timeout(timeout)
      await expect(request('https://api.run.network/badurl', { timeout })).to.be.rejectedWith(RequestError)
    })

    // ------------------------------------------------------------------------

    it('custom headers', async function () {
      this.timeout(timeout)
      const headers = { Date: (new Date()).toUTCString() }
      const response = await request('https://httpbin.org/get', { timeout, headers })
      expect(response.headers.Date).to.equal(headers.Date)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _dedup
  // ----------------------------------------------------------------------------------------------

  describe('_dedup', () => {
    it('returns same result', async () => {
      const cache = {}
      let resolver = null
      let count = 0
      const f = () => new Promise((resolve, reject) => { count++; resolver = resolve })
      const key = '123'
      const result = 'abc'
      const promise1 = _dedup(cache, key, f)
      expect(key in cache).to.equal(true)
      const promise2 = _dedup(cache, key, f)
      resolver(result)
      expect(count).to.equal(1)
      expect(await promise1).to.equal(result)
      expect(await promise2).to.equal(result)
      expect(key in cache).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns same error', async () => {
      const cache = {}
      let rejecter = null
      let count = 0
      const error = new Error('abc')
      const f = () => new Promise((resolve, reject) => { count++; rejecter = reject })
      const key = '123'
      const promise1 = _dedup(cache, key, f)
      expect(key in cache).to.equal(true)
      const promise2 = _dedup(cache, key, f)
      rejecter(error)
      expect(count).to.equal(1)
      await expect(promise1).to.be.rejectedWith(error)
      await expect(promise2).to.be.rejectedWith(error)
      expect(key in cache).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('does not dedup after completion', async () => {
      const cache = {}
      let resolver = null
      let count = 0
      const f = () => new Promise((resolve, reject) => { count++; resolver = resolve })
      const key = '123'
      const promise1 = _dedup(cache, key, f)
      resolver('abc')
      expect(await promise1).to.equal('abc')
      const promise2 = _dedup(cache, key, f)
      resolver('def')
      expect(await promise2).to.equal('def')
      expect(count).to.equal(2)
    })
  })

  // ----------------------------------------------------------------------------------------------
  // _cache
  // ----------------------------------------------------------------------------------------------

  describe('_cache', () => {
    it('caches result', async () => {
      const cache = {}
      let count = 0
      const f = async () => { count++; return 'abc' }
      expect(await _cache(cache, '123', 10, f)).to.equal('abc')
      expect(await _cache(cache, '123', 10, f)).to.equal('abc')
      expect(count).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('caches error', async () => {
      const cache = {}
      let count = 0
      const error = new Error('abc')
      const f = async () => { count++; throw error }
      await expect(_cache(cache, '123', 10, f)).to.be.rejectedWith(error)
      await expect(_cache(cache, '123', 10, f)).to.be.rejectedWith(error)
      expect(count).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('expires result', async () => {
      const cache = {}
      let count = 0
      const f = async () => { count++; return 'abc' }
      expect(await _cache(cache, '123', 1, f)).to.equal('abc')
      await new Promise((resolve, reject) => setTimeout(resolve, 10))
      expect(await _cache(cache, '123', 1, f)).to.equal('abc')
      expect(count).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('expires error', async () => {
      const cache = {}
      let count = 0
      const error = new Error('abc')
      const f = async () => { count++; throw error }
      await expect(_cache(cache, '123', 1, f)).to.be.rejectedWith(error)
      await new Promise((resolve, reject) => setTimeout(resolve, 10))
      await expect(_cache(cache, '123', 1, f)).to.be.rejectedWith(error)
      expect(count).to.equal(2)
    })
  })
})

// ------------------------------------------------------------------------------------------------
