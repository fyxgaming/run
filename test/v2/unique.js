const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const bsv = require('bsv')
const { UniqueSet, UniqueMap } = require('../../lib/v2/unique')
const Protocol = require('../../lib/v2/protocol')
const { createRun } = require('../helpers')
const { Jiglet } = require('../../lib/v2/jiglet')
const Location = require('../../lib/location')
const { Loader } = Protocol

createRun()

// ------------------------------------------------------------------------------------------------
// A temporary token used for testing
// ------------------------------------------------------------------------------------------------

const randomLocation = () => `${bsv.crypto.Random.getRandomBuffer(32).toString('hex')}_o0`
const randomTempLocation = () => `${bsv.crypto.Random.getRandomBuffer(32).toString('hex')}_o0`
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

  describe.only('clear', () => {
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
      expect(new UniqueMap().delete({ $protocol: Protocol.BcatProtocol, location: 'abc' })).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new UniqueMap([[1, 1]]).delete(1)).to.equal(true)
    })

    it('should clear token states', () => {
      const token = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const map = new UniqueMap([[token, 1]])
      map.delete(token)
      expect(map.size).to.equal(0)
      map.set({ protocol: Protocol.RunProtocol, location: 'def', origin: '123' }, 1)
    })

    it('should throw for same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const map = new UniqueMap([[token1, token1]])
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      expect(() => map.delete(token2)).to.throw('Detected two of the same token with different locations')
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
      const token1 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const map = new UniqueMap([[token1, 'abc']])
      expect(map.get(token1)).to.equal('abc')
      const token2 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      expect(map.get(token2)).to.equal('abc')
    })

    it('should return undefined for missing tokens', () => {
      expect(new UniqueMap().get({ $protocol: Protocol.RunProtocol, location: 'abc' })).to.equal(undefined)
    })

    it('should throw for same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const map = new UniqueMap([[token1, 1]])
      expect(map.get(token1)).to.equal(1)
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      expect(() => map.get(token2)).to.throw('Detected two of the same token with different location')
    })

    it('should throw for tokens of unknown protocol', () => {
      const map = new UniqueMap()
      const token = { $protocol: {}, location: 'abc' }
      expect(() => map.get(token)).to.throw('Unknown token protocol')
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
      const token1 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const map = new UniqueMap([[token1, {}]])
      expect(map.has(token1)).to.equal(true)
      const token2 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      expect(map.has(token2)).to.equal(true)
    })

    it('should return false for missing tokens', () => {
      expect(new UniqueMap().has({ $protocol: Protocol.RunProtocol, location: 'abc' })).to.equal(false)
    })

    it('should throw for same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const map = new UniqueMap([[token1, []]])
      expect(map.has(token1)).to.equal(true)
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      expect(() => map.has(token2)).to.throw('Detected two of the same token with different location')
    })

    it('should throw for tokens of unknown protocol', () => {
      const map = new UniqueMap()
      const token = { $protocol: {}, location: 'abc' }
      expect(() => map.has(token)).to.throw('Unknown token protocol')
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
      const token1 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const token2 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const map = new UniqueMap()
      map.set(token1, 0)
      map.set(token2, 1)
      expect(map.size).to.equal(1)
      expect(map.get(token1)).to.equal(1)
    })

    it('should throw if set token with unknown protocol', () => {
      expect(() => new UniqueMap().set({ $protocol: {} }, 0)).to.throw('Unknown token protocol')
    })

    it('should throw if add two of the same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      const map = new UniqueMap()
      map.set(token1, token1)
      expect(() => map.set(token2, {})).to.throw('Detected two of the same token with different locations')
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
  before(() => Protocol.install(MockLoader))
  after(() => Protocol.uninstall(MockLoader))

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
      const token1 = await Protocol.loadJiglet('abc')
      const token2 = await Protocol.loadJiglet('abc')
      const set = new UniqueSet()
      set.add(token1)
      set.add(token2)
      expect(set.size).to.equal(1)
    })

    it('should throw if add token with unknown protocol', () => {
      expect(() => new UniqueSet().add({ $protocol: {} })).to.throw('Unknown token protocol')
    })

    it('should throw if add two of the same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      const set = new UniqueSet()
      set.add(token1)
      expect(() => set.add(token2)).to.throw('Detected two of the same token with different locations')
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
      const token = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      set.add(token)
      set.clear()
      expect(set.size).to.equal(0)
      set.add({ protocol: Protocol.RunProtocol, location: 'def', origin: '123' })
    })
  })

  describe('delete', () => {
    it('should return false if item is not present', () => {
      expect(new UniqueSet().delete(1)).to.equal(false)
      expect(new UniqueSet().delete({ $protocol: Protocol.BcatProtocol, location: 'abc' })).to.equal(false)
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
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const set = new UniqueSet([token1])
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      expect(() => set.delete(token2)).to.throw('Detected two of the same token with different locations')
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
      const token1 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const set = new UniqueSet([token1])
      expect(set.has(token1)).to.equal(true)
      const token2 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      expect(set.has(token2)).to.equal(true)
    })

    it('should return false for missing tokens', () => {
      expect(new UniqueSet().has({ $protocol: Protocol.RunProtocol, location: 'abc' })).to.equal(false)
    })

    it('should throw for same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const set = new UniqueSet([token1])
      expect(set.has(token1)).to.equal(true)
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      expect(() => set.has(token2)).to.throw('Detected two of the same token with different location')
    })

    it('should throw for tokens of unknown protocol', () => {
      const set = new UniqueSet()
      const token = { $protocol: {}, location: 'abc' }
      expect(() => set.delete(token)).to.throw('Unknown token protocol')
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
