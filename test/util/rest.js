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
})

// ------------------------------------------------------------------------------------------------
