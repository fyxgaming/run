/**
 * rest.js
 *
 * Tests for lib/util/rest.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const REST = unmangle(unmangle(Run)._util)._REST

describe('rest', () => {
  describe('_get', () => {
    it('should return json', async () => {
      console.log(await REST._get('https://api.run.network/v1/test/status'))
    })
  })
})
