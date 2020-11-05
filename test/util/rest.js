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
    it('returns json', async () => {
      const status = await REST._get('https://api.run.network/v1/test/status', TIMEOUT)
      expect(status.version > 0).to.equal(true)
    }).timeout(TIMEOUT)

    // ------------------------------------------------------------------------

    it('timeout', async () => {
      await expect(REST._get('https://www.google.com:81', 100)).to.be.rejectedWith(TimeoutError)
    }).timeout(TIMEOUT)

    // ------------------------------------------------------------------------

    it('client error', async () => {
      await expect(REST._get('123', TIMEOUT)).to.be.rejected
    }).timeout(TIMEOUT)

    // ------------------------------------------------------------------------

    it('server error', async () => {
      await expect(REST._get('https://api.run.network/badurl', TIMEOUT)).to.be.rejectedWith(RequestError)
    }).timeout(TIMEOUT)

    // ------------------------------------------------------------------------

    it('custom headers', async () => {
      const headers = { Date: (new Date()).toUTCString() }
      const response = await REST._get('https://httpbin.org/get', TIMEOUT, headers)
      expect(response.headers.Date).to.equal(headers.Date)
    })
  })

  // --------------------------------------------------------------------------
  // _post
  // --------------------------------------------------------------------------

  describe('_post', () => {
    it('posts json', async () => {
      const response = await REST._post('https://httpbin.org/post', 'hello', TIMEOUT)
      expect(response.data).to.equal('"hello"')
    }).timeout(TIMEOUT)

    // ------------------------------------------------------------------------

    it('timeout', async () => {
      await expect(REST._post('https://www.google.com:81', {}, 100)).to.be.rejectedWith(TimeoutError)
    }).timeout(TIMEOUT)

    // ------------------------------------------------------------------------

    it('client error', async () => {
      await expect(REST._post('abcdef', {}, TIMEOUT)).to.be.rejected
    }).timeout(TIMEOUT)

    // ------------------------------------------------------------------------

    it('server error', async () => {
      await expect(REST._post('https://api.run.network/badurl', TIMEOUT)).to.be.rejectedWith(RequestError)
    }).timeout(TIMEOUT)

    // ------------------------------------------------------------------------

    it('custom headers', async () => {
      const headers = { Date: (new Date()).toUTCString() }
      const response = await REST._post('https://httpbin.org/post', 'hello', TIMEOUT, headers)
      expect(response.headers.Date).to.equal(headers.Date)
    })
  })
})

// ------------------------------------------------------------------------------------------------
