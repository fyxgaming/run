/**
 * rest.js
 *
 * Tests for lib/util/rest.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const REST = unmangle(unmangle(unmangle(Run)._util)._REST)

describe('rest', () => {
  describe('_get', () => {
    it('should return json', async () => {
      // console.log(await REST._get('https://api.run.network/v1/test/status'))
      // console.log(await REST._get('https://api.run.network/v1/test/utxos/mhjSrMHzs97CCvhPtBn1qbfuJqqfmMzWQ4'))
      console.log(await REST._get('https://api.run.network/v1/test/abc'))
      // console.log(await REST._get('123'))
      // console.log(await REST._get('http://api.run.network/v1/test/status'))
    })
  })
})
