/**
 * rest.js
 *
 * Tests for lib/util/rest.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { TimeoutError, RequestError } = Run.errors
const unmangle = require('../env/unmangle')
const REST = unmangle(unmangle(Run)._REST)

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TIMEOUT = 10000

// ------------------------------------------------------------------------------------------------
// REST
// ------------------------------------------------------------------------------------------------

describe('REST', () => {
  // --------------------------------------------------------------------------
  // _get
  // --------------------------------------------------------------------------

  describe('_get', () => {
    it('returns json', async function () {
      this.timeout(TIMEOUT)
      const status = await REST._get('https://api.run.network/v1/test/status', TIMEOUT)
      expect(status.version > 0).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('timeout', async function () {
      this.timeout(TIMEOUT)
      await expect(REST._get('https://www.google.com:81', 100)).to.be.rejectedWith(TimeoutError)
    })

    // ------------------------------------------------------------------------

    it('client error', async function () {
      this.timeout(TIMEOUT)
      await expect(REST._get('123', TIMEOUT)).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('server error', async function () {
      this.timeout(TIMEOUT)
      await expect(REST._get('https://api.run.network/badurl', TIMEOUT)).to.be.rejectedWith(RequestError)
    })

    // ------------------------------------------------------------------------

    it('custom headers', async function () {
      this.timeout(TIMEOUT)
      const headers = { Date: (new Date()).toUTCString() }
      const response = await REST._get('https://httpbin.org/get', TIMEOUT, headers)
      expect(response.headers.Date).to.equal(headers.Date)
    })
  })

  // --------------------------------------------------------------------------
  // _post
  // --------------------------------------------------------------------------

  describe('_post', () => {
    it('posts json', async function () {
      this.timeout(TIMEOUT)
      const response = await REST._post('https://httpbin.org/post', 'hello', TIMEOUT)
      expect(response.data).to.equal('"hello"')
    })

    // ------------------------------------------------------------------------

    it('timeout', async function () {
      this.timeout(TIMEOUT)
      await expect(REST._post('https://www.google.com:81', {}, 100)).to.be.rejectedWith(TimeoutError)
    })

    // ------------------------------------------------------------------------

    it('client error', async function () {
      this.timeout(TIMEOUT)
      await expect(REST._post('abcdef', {}, TIMEOUT)).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('server error', async function () {
      this.timeout(TIMEOUT)
      await expect(REST._post('https://api.run.network/badurl', TIMEOUT)).to.be.rejectedWith(RequestError)
    })

    // ------------------------------------------------------------------------

    it('custom headers', async function () {
      this.timeout(TIMEOUT)
      const headers = { Date: (new Date()).toUTCString() }
      const response = await REST._post('https://httpbin.org/post', 'hello', TIMEOUT, headers)
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
      const promise1 = REST._dedup(cache, key, f)
      expect(key in cache).to.equal(true)
      const promise2 = REST._dedup(cache, key, f)
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
      const promise1 = REST._dedup(cache, key, f)
      expect(key in cache).to.equal(true)
      const promise2 = REST._dedup(cache, key, f)
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
      const promise1 = REST._dedup(cache, key, f)
      resolver('abc')
      expect(await promise1).to.equal('abc')
      const promise2 = REST._dedup(cache, key, f)
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
      expect(await REST._cache(cache, '123', 10, f)).to.equal('abc')
      expect(await REST._cache(cache, '123', 10, f)).to.equal('abc')
      expect(count).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('caches error', async () => {
      const cache = {}
      let count = 0
      const error = new Error('abc')
      const f = async () => { count++; throw error }
      await expect(REST._cache(cache, '123', 10, f)).to.be.rejectedWith(error)
      await expect(REST._cache(cache, '123', 10, f)).to.be.rejectedWith(error)
      expect(count).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('expires result', async () => {
      const cache = {}
      let count = 0
      const f = async () => { count++; return 'abc' }
      expect(await REST._cache(cache, '123', 1, f)).to.equal('abc')
      await new Promise((resolve, reject) => setTimeout(resolve, 10))
      expect(await REST._cache(cache, '123', 1, f)).to.equal('abc')
      expect(count).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('expires error', async () => {
      const cache = {}
      let count = 0
      const error = new Error('abc')
      const f = async () => { count++; throw error }
      await expect(REST._cache(cache, '123', 1, f)).to.be.rejectedWith(error)
      await new Promise((resolve, reject) => setTimeout(resolve, 10))
      await expect(REST._cache(cache, '123', 1, f)).to.be.rejectedWith(error)
      expect(count).to.equal(2)
    })
  })
})

// ------------------------------------------------------------------------------------------------
