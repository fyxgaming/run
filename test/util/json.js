/**
 * json.js
 *
 * Tests for lib/util/json.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../config')
const { _toTokenJson, _fromTokenJson } = Run._util
const DeterministicRealm = require('@runonbitcoin/sandbox')

const _hostIntrinsics = { Object, Array, Set, Map }

const realm = new DeterministicRealm()
const compartment = realm.makeCompartment()

const _sandboxIntrinsics = {
  Object: compartment.evaluate('Object'),
  Array: compartment.evaluate('Array'),
  Set: compartment.evaluate('Object'),
  Map: compartment.evaluate('Array')
}

const options = { _hostIntrinsics, _sandboxIntrinsics }

describe('util', () => {
  describe('_toTokenJson', () => {
    it.only('test', () => {
      console.log(JSON.stringify(_toTokenJson({ n: 1 })))
      console.log(JSON.stringify(_toTokenJson({ $hello: 'world' })))
      console.log(JSON.stringify(_toTokenJson(new Set([1, 'a', 2, {}]))))
      console.log(JSON.stringify(_toTokenJson(new Map([[1, 2], [{}, 'o']]))))
      const s = new Set()
      s.x = 1
      console.log(JSON.stringify(_toTokenJson(s)))
      const o = Object.create(Object.prototype)
      o.n = 1
      o.m = o
      const p = Array.from([o, o])
      console.log(JSON.stringify(_toTokenJson(p)))

      // Custom object
      class Dragon { }
      const dragon = new Dragon()
      dragon.name = 'Empress'
      dragon.self = dragon
      const _replaceCustomObjects = deployables => {
        return (x, opts) => {
          console.log(x)
          if (typeof x === 'object') {
            if (Run._util.deployable(x.constructor)) {
            // add to deployable list
              deployables.push(x.constructor)
            }
            // TODO: use _newObject
            const y = { }
            opts._cache.set(x, y)
            y.$arb = _toTokenJson(Object.assign({}, x), opts)
            y.T = '123'
            return y
          }
        }
      }

      const _replaceDeployables = deployables => {
        return () => {}
      }

      const _firstResult = (...callbacks) => {
        return (...args) => {
          for (const callback of callbacks) {
            const y = callback(...args)
            if (y) return y
          }
        }
      }

      const deployables = []

      const _replacer = _firstResult(
        _replaceDeployables(deployables),
        _replaceCustomObjects(deployables))

      console.log(JSON.stringify(_toTokenJson(dragon, { _replacer })))
      console.log(deployables)

      // Tests
      // Multiple dups
      // Dups in custom objects
    })
  })

  describe('_fromTokenJson', () => {
    it('test', () => {
      console.log(JSON.stringify(_fromTokenJson(_toTokenJson({ n: 1 }))))

      const x = { $hello: 'world' }
      const y = _toTokenJson(x, { options, _outputIntrinsics: _sandboxIntrinsics })
      console.log(y)
      console.log(y.constructor === _hostIntrinsics.Object)
      console.log(y.constructor === _sandboxIntrinsics.Object)
      const z = _fromTokenJson(y, options)
      console.log(z)

      console.log(_fromTokenJson(_toTokenJson(new Set([1, 'a', 2, {}]))))
      console.log(_fromTokenJson(_toTokenJson(new Map([[1, 2], [{}, 'o']]))))

      const s = new Set()
      s.x = 1
      console.log(_fromTokenJson(_toTokenJson(s)).x)

      const o = Object.create(Object.prototype)
      o.n = 1
      o.m = o
      const p = Array.from([o, o])
      const q = _fromTokenJson(_toTokenJson(p))
      console.log(q[0] === q[1])
      // console.log(q)

      class Dragon {}
      const dragon = new Dragon()
      const opts = {
        _replacer: x => x instanceof Dragon && { $dragon: x },
        _reviver: x => x.$dragon
      }
      console.log(_fromTokenJson(_toTokenJson(dragon, opts), opts))
    })
  })
})
