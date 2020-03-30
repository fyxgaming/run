/**
 * serialize.js
 *
 * Tests for lib/util/serialize.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../config')
const { _serialize } = Run._util
const DeterministicRealm = require('@runonbitcoin/sandbox')

const realm = new DeterministicRealm()
const compartment = realm.makeCompartment()
const Object = compartment.evaluate('Object')
const Array = compartment.evaluate('Array')

describe('util', () => {
  describe('serialize', () => {
    it('test', () => {
      const o = Object.create(Object.prototype)
      o.n = 1
      o.m = o
      const p = Array.from([o, o])
      console.log(JSON.stringify(_serialize(p)))

      console.log(JSON.stringify(_serialize({ $hello: 'world' })))

      console.log(JSON.stringify(_serialize(new Set([1, 'a', 2, {}]))))

      console.log(JSON.stringify(_serialize(new Map([[1, 2], [{}, 'o']]))))
    })
  })
})
