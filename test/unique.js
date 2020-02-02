const { describe, it } = require('mocha')
const { expect } = require('chai')
const bsv = require('bsv')
const { UniqueSet, UniqueMap } = require('../lib/unique')
const Protocol = require('../lib/protocol')
const { createRun } = require('./helpers')
const Location = require('../lib/location')

createRun()

// ------------------------------------------------------------------------------------------------
// A temporary token used for testing
// ------------------------------------------------------------------------------------------------

const randomLocation = () => `${bsv.crypto.Random.getRandomBuffer(32).toString('hex')}_o0`
const randomTempLocation = () => `??${bsv.crypto.Random.getRandomBuffer(31).toString('hex')}_o0`
const testToken = (origin, location) => {
  const token = () => {}
  token.owner = 'someone'
  token.origin = origin
  token.location = location
  token.deploy = () => { token.location = token.origin = randomTempLocation(); return token }
  token.update = () => { token.location = randomTempLocation(); return token }
  token.publish = () => {
    if (!token.origin || !Location.parse(token.origin).txid) token.origin = randomLocation()
    if (!token.location || !Location.parse(token.location).txid) token.location = randomLocation()
    return token
  }
  token.duplicate = () => { return testToken(token.origin, token.location) }
  return token
}

// ------------------------------------------------------------------------------------------------
// UniqueMap
// ------------------------------------------------------------------------------------------------

describe('UniqueMap', () => {
  describe('constructor', () => {
    it('should create empty map', () => {
      expect(new UniqueMap().size).to.equal(0)
    })

    it('should create map from array', () => {
      const arr = [[1, 2], ['a', 'b']]
      const map = new UniqueMap(arr)
      expect(map.size).to.equal(arr.length)
      arr.forEach(x => expect(map.has(x[0])).to.equal(true))
    })

    it('should create map from map', () => {
      const arr = [[1, 2], ['a', 'b']]
      const map = new UniqueMap(arr)
      const map2 = new UniqueMap(map)
      expect(map2.size).to.equal(arr.length)
      arr.forEach(([x]) => expect(map2.has(x)).to.equal(true))
      arr.forEach(([x, y]) => expect(map2.get(x)).to.equal(y))
    })
  })

  describe('clear', () => {
    it('should not throw on empty map', () => {
      expect(() => new UniqueMap().clear()).not.to.throw()
    })

    it('should empty contents', () => {
      const map = new UniqueMap()
      map.set(1, 2)
      map.clear()
      expect(map.size).to.equal(0)
    })

    it('should clear token states', () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const map = new UniqueMap([[a, 1], [b, 2]])
      map.clear()
      expect(map.size).to.equal(0)
      a.publish()
      const a2 = a.duplicate().update()
      const b2 = b.duplicate().update()
      map.set(a2, 1)
      map.set(b2, 2)
    })
  })

  describe('delete', () => {
    it('should return false if item is not present', () => {
      expect(new UniqueMap().delete(1)).to.equal(false)
      expect(new UniqueMap().delete(testToken())).to.equal(false)
      expect(new UniqueMap().delete(testToken().deploy())).to.equal(false)
      expect(new UniqueMap().delete(testToken().deploy().publish())).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new UniqueMap([[1, 1]]).delete(1)).to.equal(true)
    })

    it('should clear token states', () => {
      const a = testToken()
      const b = testToken().deploy()
      const map = new UniqueMap([[a, 1], [b, 1]])
      map.delete(a)
      map.delete(b)
      expect(map.size).to.equal(0)
      const a2 = a.deploy().publish().duplicate().update()
      const b2 = b.publish().duplicate().update()
      map.set(a2, 1)
      map.set(b2, 1)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken().deploy().publish()
      const map = new UniqueMap([[a, a]])
      const a2 = a.duplicate().update()
      expect(() => map.delete(a2)).to.throw('Inconsistent worldview')
    })
  })

  describe('entries', () => {
    it('should iterate across entries', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      for (const entry of map.entries()) {
        const next = entries.shift()
        expect(entry).to.deep.equal(next)
      }
    })
  })

  describe('forEach', () => {
    it('should execute function for each entry', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      class A {
        constructor () { this.arr = [] }
        push (x, y) { this.arr.push([x, y]) }
      }
      const a = new A()
      map.forEach(a.push, a)
      expect(a.arr).to.deep.equal([[2, 1], ['b', 'a'], [true, false], [[], {}]])
    })
  })

  describe('get', () => {
    it('should return values for basic types and objects in set', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      entries.forEach(entry => expect(map.get(entry[0])).to.equal(entry[1]))
    })

    it('should return undefined for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const map = new UniqueMap()
      entries.forEach(entry => expect(map.get(entry)).to.equal(undefined))
    })

    it('should return undefined after object is deleted', () => {
      const obj = {}
      const map = new UniqueMap([[obj, 1]])
      expect(map.get(obj)).to.equal(1)
      map.delete(obj)
      expect(map.get(obj)).to.equal(undefined)
    })

    it('should return value for tokens in map', () => {
      const a = testToken()
      const b = testToken().deploy()
      const c = testToken().deploy().publish()
      const map = new UniqueMap([[a, 'abc'], [b, 'def'], [c, 'ghi']])
      expect(map.get(a)).to.equal('abc')
      expect(map.get(b)).to.equal('def')
      expect(map.get(c)).to.equal('ghi')
      const a2 = a.deploy().publish().duplicate()
      const b2 = b.publish().duplicate()
      const c2 = c.duplicate()
      expect(map.get(a2)).to.equal('abc')
      expect(map.get(b2)).to.equal('def')
      expect(map.get(c2)).to.equal('ghi')
    })

    it('should return undefined for missing tokens', () => {
      expect(new UniqueMap().get(testToken().deploy())).to.equal(undefined)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken()
      const b = testToken().deploy()
      const c = testToken().deploy().publish()
      const map = new UniqueMap([[a, 1], [b, 2], [c, 3]])
      expect(map.get(a)).to.equal(1)
      expect(map.get(b)).to.equal(2)
      expect(map.get(c)).to.equal(3)
      const a2 = a.deploy().publish().duplicate().update()
      const b2 = b.publish().duplicate().update()
      const c2 = c.duplicate().update().publish()
      expect(() => map.get(a2)).to.throw('Inconsistent worldview')
      expect(() => map.get(b2)).to.throw('Inconsistent worldview')
      expect(() => map.get(c2)).to.throw('Inconsistent worldview')
    })
  })

  describe('has', () => {
    it('should return true for basic types and objects in set', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      entries.forEach(entry => expect(map.has(entry[0])).to.equal(true))
    })

    it('should return false for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const map = new UniqueMap()
      entries.forEach(entry => expect(map.has(entry)).to.equal(false))
    })

    it('should return false after object is deleted', () => {
      const obj = {}
      const map = new UniqueMap([[obj, 1]])
      expect(map.has(obj)).to.equal(true)
      map.delete(obj)
      expect(map.has(obj)).to.equal(false)
    })

    it('should return true for tokens in map', () => {
      const a = testToken()
      const b = testToken().deploy().publish().update()
      const map = new UniqueMap([[a, {}], [b, {}]])
      expect(map.has(a)).to.equal(true)
      expect(map.has(b)).to.equal(true)
      expect(map.has(b.duplicate())).to.equal(true)
    })

    it('should return false for missing tokens', () => {
      expect(new UniqueMap().has(testToken())).to.equal(false)
      expect(new UniqueMap().has(testToken().deploy())).to.equal(false)
      expect(new UniqueMap().has(testToken().deploy().publish())).to.equal(false)
      expect(new UniqueMap().has(testToken().deploy().publish().update())).to.equal(false)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken().deploy().publish().update().publish()
      const map = new UniqueMap([[a, []]])
      expect(map.has(a)).to.equal(true)
      expect(() => map.has(a.duplicate().update())).to.throw('Inconsistent worldview')
    })
  })

  describe('set', () => {
    it('should return map regardless', () => {
      const map = new UniqueMap()
      expect(map.set(1, 1)).to.equal(map)
      expect(map.set(1, 1)).to.equal(map)
    })

    it('should set basic types and objects as keys once', () => {
      const map = new UniqueMap()
      const entries = [[1, 2], ['abc', 'def'], [true, false], [{}, []]]
      entries.forEach(([x, y]) => map.set(x, y))
      entries.forEach(([x, y]) => map.set(x, y))
      expect(map.size).to.equal(entries.length)
    })

    it('should set tokens once', () => {
      const a = testToken().deploy().publish()
      const map = new UniqueMap()
      map.set(a, 0)
      const a2 = a.duplicate()
      map.set(a2, 1)
      expect(map.size).to.equal(1)
      expect(map.get(a2)).to.equal(1)
    })

    it('should throw if add two of the same tokens at different states', () => {
      const a = testToken().deploy().publish()
      const a2 = a.duplicate().update()
      const map = new UniqueMap()
      map.set(a2, a2)
      expect(() => map.set(a, {})).to.throw('Inconsistent worldview')
    })
  })

  describe('values', () => {
    it('should return values iterator', () => {
      const entries = [[1, 2], [3, 4]]
      const map = new UniqueMap(entries)
      const arr = []
      for (const val of map.values()) { arr.push(val) }
      expect(arr).to.deep.equal([2, 4])
    })
  })

  describe('misc', () => {
    it('should return UniqueMap for Symbol.species', () => {
      expect(new UniqueMap()[Symbol.species]).to.equal(UniqueMap)
    })

    it('should return iterator for Symbol.iterator', () => {
      expect(new UniqueMap()[Symbol.species]).to.equal(UniqueMap)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// UniqueSet
// ------------------------------------------------------------------------------------------------

describe('UniqueSet', () => {
  describe('constructor', () => {
    it('should create empty set', () => {
      expect(new UniqueSet().size).to.equal(0)
    })

    it('should create set from array', () => {
      const arr = [1, 2, 3]
      const set = new UniqueSet(arr)
      expect(set.size).to.equal(arr.length)
      arr.forEach(x => expect(set.has(x)).to.equal(true))
    })

    it('should create set from set', () => {
      const arr = [1, 2, 3]
      const set = new UniqueSet(arr)
      const set2 = new UniqueSet(set)
      expect(set2.size).to.equal(arr.length)
      arr.forEach(x => expect(set2.has(x)).to.equal(true))
    })
  })

  describe('add', () => {
    it('should return set regardless', () => {
      const set = new UniqueSet()
      expect(set.add(1)).to.equal(set)
      expect(set.add(1)).to.equal(set)
    })

    it('should add basic types and objects once', () => {
      const set = new UniqueSet()
      const entries = [1, 'abc', true, {}, []]
      entries.forEach(entry => set.add(entry))
      entries.forEach(entry => set.add(entry))
      expect(set.size).to.equal(entries.length)
    })

    it('should add tokens once', async () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const set = new UniqueSet()
      set.add(a)
      set.add(b)
      set.add(b.duplicate())
      expect(set.size).to.equal(2)
    })

    it('should throw if add two of the same tokens at different states', () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const set = new UniqueSet()
      set.add(a)
      set.add(b)
      const a2 = a.deploy().publish().duplicate().update()
      const b2 = a.duplicate().update().publish()
      expect(() => set.add(a2)).to.throw('Inconsistent worldview')
      expect(() => set.add(b2)).to.throw('Inconsistent worldview')
    })
  })

  describe('clear', () => {
    it('should not throw on empty set', () => {
      expect(() => new UniqueSet().clear()).not.to.throw()
    })

    it('should empty contents', () => {
      const set = new UniqueSet()
      set.add(1)
      set.clear()
      expect(set.size).to.equal(0)
    })

    it('should clear token states', () => {
      const set = new UniqueSet()
      const a = testToken().deploy()
      const b = testToken().deploy().publish()
      set.add(a)
      set.add(b)
      set.clear()
      expect(set.size).to.equal(0)
      set.add(a.publish().duplicate())
      set.add(b.duplicate().update())
      expect(set.size).to.equal(2)
    })
  })

  describe('delete', () => {
    it('should return false if item is not present', () => {
      expect(new UniqueSet().delete(1)).to.equal(false)
      expect(new UniqueSet().delete(testToken())).to.equal(false)
      expect(new UniqueSet().delete(testToken().deploy().publish())).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new UniqueSet([1]).delete(1)).to.equal(true)
    })

    it('should clear token states', () => {
      const set = new UniqueSet()
      const token = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      set.add(token)
      set.delete(token)
      expect(set.size).to.equal(0)
      set.add({ protocol: Protocol.RunProtocol, location: 'def', origin: '123' })
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const set = new UniqueSet([a, b])
      expect(() => set.delete(a.deploy().publish().duplicate().update())).to.throw('Inconsistent worldview')
      expect(() => set.delete(b.duplicate().update().publish())).to.throw('Inconsistent worldview')
    })
  })

  describe('entries', () => {
    it('should iterate across entries', () => {
      const arr = [1, 2, 3]
      const set = new UniqueSet(arr)
      for (const entry of set.entries()) {
        const next = arr.shift()
        expect(entry).to.deep.equal([next, next])
      }
    })
  })

  describe('forEach', () => {
    it('should execute function for each entry', () => {
      const set = new UniqueSet([1, 2, 3])
      class A {
        constructor () { this.arr = [] }
        push (x) { this.arr.push(x) }
      }
      const a = new A()
      set.forEach(a.push, a)
      expect(a.arr).to.deep.equal([1, 2, 3])
    })
  })

  describe('has', () => {
    it('should return true for basic types and objects in set', () => {
      const entries = [1, 'a', false, {}, []]
      const set = new UniqueSet(entries)
      entries.forEach(entry => expect(set.has(entry)).to.equal(true))
    })

    it('should return false for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const set = new UniqueSet()
      entries.forEach(entry => expect(set.has(entry)).to.equal(false))
    })

    it('should return false after object is deleted', () => {
      const obj = {}
      const set = new UniqueSet([obj])
      expect(set.has(obj)).to.equal(true)
      set.delete(obj)
      expect(set.has(obj)).to.equal(false)
    })

    it('should return true for tokens in set', () => {
      const a = testToken().deploy().publish()
      const set = new UniqueSet([a])
      expect(set.has(a)).to.equal(true)
      expect(set.has(a.duplicate())).to.equal(true)
    })

    it('should return false for missing tokens', () => {
      expect(new UniqueSet().has(testToken())).to.equal(false)
      expect(new UniqueSet().has(testToken().deploy())).to.equal(false)
      expect(new UniqueSet().has(testToken().deploy().publish())).to.equal(false)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken().deploy()
      const b = testToken().deploy().publish().update()
      const set = new UniqueSet([a, b])
      expect(set.has(a)).to.equal(true)
      expect(set.has(b)).to.equal(true)
      expect(() => set.has(a.publish().duplicate().update())).to.throw('Inconsistent worldview')
      expect(() => set.has(b.duplicate().publish())).to.throw('Inconsistent worldview')
    })
  })

  describe('values', () => {
    it('should return values iterator', () => {
      const arr = []
      const set = new UniqueSet([1, 2, 3])
      for (const val of set.values()) { arr.push(val) }
      expect(arr).to.deep.equal([1, 2, 3])
    })
  })

  describe('misc', () => {
    it('should return UniqueSet for Symbol.species', () => {
      expect(new UniqueSet()[Symbol.species]).to.equal(UniqueSet)
    })

    it('should return iterator for Symbol.iterator', () => {
      expect(new UniqueSet()[Symbol.species]).to.equal(UniqueSet)
    })
  })
})

// ------------------------------------------------------------------------------------------------
