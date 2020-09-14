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
// REST
// ------------------------------------------------------------------------------------------------

describe('REST', () => {
  // --------------------------------------------------------------------------
  // _get
  // --------------------------------------------------------------------------

  describe('_get', () => {
    it('returns json', async () => {
      const status = await REST._get('https://api.run.network/v1/test/status')
      expect(status.version > 0).to.equal(true)
    }).timeout(10000)

    // ------------------------------------------------------------------------

    it('timeout', async () => {
      await expect(REST._get('https://www.google.com:81', 100)).to.be.rejectedWith(TimeoutError)
    }).timeout(10000)

    // ------------------------------------------------------------------------

    it('client error', async () => {
      await expect(REST._get('123')).to.be.rejected
    }).timeout(10000)

    // ------------------------------------------------------------------------

    it('server error', async () => {
      await expect(REST._get('https://api.run.network/badurl')).to.be.rejectedWith(RequestError)
    }).timeout(10000)
  })

  // --------------------------------------------------------------------------
  // _post
  // --------------------------------------------------------------------------

  describe('_post', () => {
    it('posts json', async () => {
      const response = await REST._post('https://httpbin.org/post', 'hello')
      expect(response.data).to.equal('"hello"')
    }).timeout(10000)

    // ------------------------------------------------------------------------

    it('timeout', async () => {
      await expect(REST._post('https://www.google.com:81', {}, 100)).to.be.rejectedWith(TimeoutError)
    }).timeout(10000)

    // ------------------------------------------------------------------------

    it('client error', async () => {
      await expect(REST._post('abcdef', {})).to.be.rejected
    }).timeout(10000)

    // ------------------------------------------------------------------------

    it('server error', async () => {
      await expect(REST._post('https://api.run.network/badurl')).to.be.rejectedWith(RequestError)
    }).timeout(10000)
  })
})

// ------------------------------------------------------------------------------------------------
