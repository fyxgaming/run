/**
 * serialize.js
 *
 * Tests for lib/util/serialize.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../config')
const { serialize, deserialize } = Run._util

describe('util', () => {
  describe('serialize', () => {
    it('test', () => {
      console.log(serialize)
      console.log(deserialize)
    })
  })
})
