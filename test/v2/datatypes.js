const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const { RunSet, RunMap } = require('../../lib/v2/datatypes')
const Protocol = require('../../lib/v2/protocol')
const { createRun } = require('../helpers')
const { Jiglet } = require('../../lib/v2/jiglet')
const { Loader } = Protocol

createRun()

// ------------------------------------------------------------------------------------------------
// Mock Jiglets
// ------------------------------------------------------------------------------------------------

class MockJiglet extends Jiglet {
  init (location) {
    this.location = location
  }
}

class MockLoader extends Loader {
  static async load (location, blockchain) {
    return new MockJiglet(location)
  }
}

MockJiglet.loader = MockLoader

// ------------------------------------------------------------------------------------------------
// RunSet
// ------------------------------------------------------------------------------------------------

describe('RunSet', () => {
  before(() => Protocol.install(MockLoader))
  after(() => Protocol.uninstall(MockLoader))

  describe('constructor', () => {
    it('should create empty set', () => {
      expect(new RunSet().size).to.equal(0)
    })

    it('should create set from array', () => {
      const arr = [1, 2, 3]
      const set = new RunSet(arr)
      expect(set.size).to.equal(arr.length)
      arr.forEach(x => expect(set.has(x)).to.equal(true))
    })

    it('should create set from set', () => {
      const arr = [1, 2, 3]
      const set = new RunSet(arr)
      const set2 = new RunSet(set)
      expect(set2.size).to.equal(arr.length)
      arr.forEach(x => expect(set2.has(x)).to.equal(true))
    })
  })

  describe.only('add', () => {
    it('should return set regardless', () => {
      const set = new RunSet()
      expect(set.add(1)).to.equal(set)
      expect(set.add(1)).to.equal(set)
    })

    it('should add basic types and objects once', () => {
      const set = new RunSet()
      const entries = [1, 'abc', true, {}, []]
      entries.forEach(entry => set.add(entry))
      entries.forEach(entry => set.add(entry))
      expect(set.size).to.equal(entries.length)
    })

    it('should add tokens once', async () => {
      const token1 = await Protocol.loadJiglet('abc')
      const token2 = await Protocol.loadJiglet('abc')
      const set = new RunSet()
      set.add(token1)
      set.add(token2)
      expect(set.size).to.equal(1)
    })

    it('should throw if add token with unknown protocol', () => {
      expect(() => new RunSet().add({ $protocol: {} })).to.throw('Unknown token protocol')
    })

    it('should throw if add two of the same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      const set = new RunSet()
      set.add(token1)
      expect(() => set.add(token2)).to.throw('Detected two of the same token with different locations')
    })
  })

  describe('clear', () => {
    it('should not throw on empty set', () => {
      expect(() => new RunSet().clear()).not.to.throw()
    })

    it('should empty contents', () => {
      const set = new RunSet()
      set.add(1)
      set.clear()
      expect(set.size).to.equal(0)
    })

    it('should clear token states', () => {
      const set = new RunSet()
      const token = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      set.add(token)
      set.clear()
      expect(set.size).to.equal(0)
      set.add({ protocol: Protocol.RunProtocol, location: 'def', origin: '123' })
    })
  })

  describe('delete', () => {
    it('should return false if item is not present', () => {
      expect(new RunSet().delete(1)).to.equal(false)
      expect(new RunSet().delete({ $protocol: Protocol.BcatProtocol, location: 'abc' })).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new RunSet([1]).delete(1)).to.equal(true)
    })

    it('should clear token states', () => {
      const set = new RunSet()
      const token = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      set.add(token)
      set.delete(token)
      expect(set.size).to.equal(0)
      set.add({ protocol: Protocol.RunProtocol, location: 'def', origin: '123' })
    })

    it('should throw for same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const set = new RunSet([token1])
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      expect(() => set.delete(token2)).to.throw('Detected two of the same token with different locations')
    })
  })

  describe('entries', () => {
    it('should iterate across entries', () => {
      const arr = [1, 2, 3]
      const set = new RunSet(arr)
      for (const entry of set.entries()) {
        const next = arr.shift()
        expect(entry).to.deep.equal([next, next])
      }
    })
  })

  describe('forEach', () => {
    it('should execute function for each entry', () => {
      const set = new RunSet([1, 2, 3])
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
      const set = new RunSet(entries)
      entries.forEach(entry => expect(set.has(entry)).to.equal(true))
    })

    it('should return false for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const set = new RunSet()
      entries.forEach(entry => expect(set.has(entry)).to.equal(false))
    })

    it('should return false after object is deleted', () => {
      const obj = {}
      const set = new RunSet([obj])
      expect(set.has(obj)).to.equal(true)
      set.delete(obj)
      expect(set.has(obj)).to.equal(false)
    })

    it('should return true for tokens in set', () => {
      const token1 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const set = new RunSet([token1])
      expect(set.has(token1)).to.equal(true)
      const token2 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      expect(set.has(token2)).to.equal(true)
    })

    it('should return false for missing tokens', () => {
      expect(new RunSet().has({ $protocol: Protocol.RunProtocol, location: 'abc' })).to.equal(false)
    })

    it('should throw for same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const set = new RunSet([token1])
      expect(set.has(token1)).to.equal(true)
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      expect(() => set.has(token2)).to.throw('Detected two of the same token with different location')
    })

    it('should throw for tokens of unknown protocol', () => {
      const set = new RunSet()
      const token = { $protocol: {}, location: 'abc' }
      expect(() => set.delete(token)).to.throw('Unknown token protocol')
    })
  })

  describe('values', () => {
    it('should return values iterator', () => {
      const arr = []
      const set = new RunSet([1, 2, 3])
      for (const val of set.values()) { arr.push(val) }
      expect(arr).to.deep.equal([1, 2, 3])
    })
  })

  describe('misc', () => {
    it('should return RunSet for Symbol.species', () => {
      expect(new RunSet()[Symbol.species]).to.equal(RunSet)
    })

    it('should return iterator for Symbol.iterator', () => {
      expect(new RunSet()[Symbol.species]).to.equal(RunSet)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Map
// ------------------------------------------------------------------------------------------------

describe('RunMap', () => {
  describe('constructor', () => {
    it('should create empty map', () => {
      expect(new RunMap().size).to.equal(0)
    })

    it('should create map from array', () => {
      const arr = [[1, 2], ['a', 'b']]
      const map = new RunMap(arr)
      expect(map.size).to.equal(arr.length)
      arr.forEach(x => expect(map.has(x[0])).to.equal(true))
    })

    it('should create map from map', () => {
      const arr = [[1, 2], ['a', 'b']]
      const map = new RunMap(arr)
      const map2 = new RunMap(map)
      expect(map2.size).to.equal(arr.length)
      arr.forEach(([x]) => expect(map2.has(x)).to.equal(true))
      arr.forEach(([x, y]) => expect(map2.get(x)).to.equal(y))
    })
  })

  describe('clear', () => {
    it('should not throw on empty map', () => {
      expect(() => new RunMap().clear()).not.to.throw()
    })

    it('should empty contents', () => {
      const map = new RunMap()
      map.set(1, 2)
      map.clear()
      expect(map.size).to.equal(0)
    })

    it('should clear token states', () => {
      const token = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const map = new RunMap([[token, token]])
      map.clear()
      expect(map.size).to.equal(0)
      map.set({ protocol: Protocol.RunProtocol, location: 'def', origin: '123' }, 1)
    })
  })

  describe('delete', () => {
    it('should return false if item is not present', () => {
      expect(new RunMap().delete(1)).to.equal(false)
      expect(new RunMap().delete({ $protocol: Protocol.BcatProtocol, location: 'abc' })).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new RunMap([[1, 1]]).delete(1)).to.equal(true)
    })

    it('should clear token states', () => {
      const token = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const map = new RunMap([[token, 1]])
      map.delete(token)
      expect(map.size).to.equal(0)
      map.set({ protocol: Protocol.RunProtocol, location: 'def', origin: '123' }, 1)
    })

    it('should throw for same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const map = new RunMap([[token1, token1]])
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      expect(() => map.delete(token2)).to.throw('Detected two of the same token with different locations')
    })
  })

  describe('entries', () => {
    it('should iterate across entries', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new RunMap(entries)
      for (const entry of map.entries()) {
        const next = entries.shift()
        expect(entry).to.deep.equal(next)
      }
    })
  })

  describe('forEach', () => {
    it('should execute function for each entry', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new RunMap(entries)
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
      const map = new RunMap(entries)
      entries.forEach(entry => expect(map.get(entry[0])).to.equal(entry[1]))
    })

    it('should return undefined for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const map = new RunMap()
      entries.forEach(entry => expect(map.get(entry)).to.equal(undefined))
    })

    it('should return undefined after object is deleted', () => {
      const obj = {}
      const map = new RunMap([[obj, 1]])
      expect(map.get(obj)).to.equal(1)
      map.delete(obj)
      expect(map.get(obj)).to.equal(undefined)
    })

    it('should return value for tokens in map', () => {
      const token1 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const map = new RunMap([[token1, 'abc']])
      expect(map.get(token1)).to.equal('abc')
      const token2 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      expect(map.get(token2)).to.equal('abc')
    })

    it('should return undefined for missing tokens', () => {
      expect(new RunMap().get({ $protocol: Protocol.RunProtocol, location: 'abc' })).to.equal(undefined)
    })

    it('should throw for same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const map = new RunMap([[token1, 1]])
      expect(map.get(token1)).to.equal(1)
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      expect(() => map.get(token2)).to.throw('Detected two of the same token with different location')
    })

    it('should throw for tokens of unknown protocol', () => {
      const map = new RunMap()
      const token = { $protocol: {}, location: 'abc' }
      expect(() => map.get(token)).to.throw('Unknown token protocol')
    })
  })

  describe('has', () => {
    it('should return true for basic types and objects in set', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new RunMap(entries)
      entries.forEach(entry => expect(map.has(entry[0])).to.equal(true))
    })

    it('should return false for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const map = new RunMap()
      entries.forEach(entry => expect(map.has(entry)).to.equal(false))
    })

    it('should return false after object is deleted', () => {
      const obj = {}
      const map = new RunMap([[obj, 1]])
      expect(map.has(obj)).to.equal(true)
      map.delete(obj)
      expect(map.has(obj)).to.equal(false)
    })

    it('should return true for tokens in map', () => {
      const token1 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const map = new RunMap([[token1, {}]])
      expect(map.has(token1)).to.equal(true)
      const token2 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      expect(map.has(token2)).to.equal(true)
    })

    it('should return false for missing tokens', () => {
      expect(new RunMap().has({ $protocol: Protocol.RunProtocol, location: 'abc' })).to.equal(false)
    })

    it('should throw for same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const map = new RunMap([[token1, []]])
      expect(map.has(token1)).to.equal(true)
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      expect(() => map.has(token2)).to.throw('Detected two of the same token with different location')
    })

    it('should throw for tokens of unknown protocol', () => {
      const map = new RunMap()
      const token = { $protocol: {}, location: 'abc' }
      expect(() => map.has(token)).to.throw('Unknown token protocol')
    })
  })

  describe('set', () => {
    it('should return map regardless', () => {
      const map = new RunMap()
      expect(map.set(1, 1)).to.equal(map)
      expect(map.set(1, 1)).to.equal(map)
    })

    it('should set basic types and objects as keys once', () => {
      const map = new RunMap()
      const entries = [[1, 2], ['abc', 'def'], [true, false], [{}, []]]
      entries.forEach(([x, y]) => map.set(x, y))
      entries.forEach(([x, y]) => map.set(x, y))
      expect(map.size).to.equal(entries.length)
    })

    it('should set tokens once', () => {
      const token1 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const token2 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const map = new RunMap()
      map.set(token1, 0)
      map.set(token2, 1)
      expect(map.size).to.equal(1)
      expect(map.get(token1)).to.equal(1)
    })

    it('should throw if set token with unknown protocol', () => {
      expect(() => new RunMap().set({ $protocol: {} }, 0)).to.throw('Unknown token protocol')
    })

    it('should throw if add two of the same tokens at different states', () => {
      const token1 = { $protocol: Protocol.RunProtocol, location: 'abc', origin: '123' }
      const token2 = { $protocol: Protocol.RunProtocol, location: 'def', origin: '123' }
      const map = new RunMap()
      map.set(token1, token1)
      expect(() => map.set(token2, {})).to.throw('Detected two of the same token with different locations')
    })
  })

  describe('values', () => {
    it('should return values iterator', () => {
      const entries = [[1, 2], [3, 4]]
      const map = new RunMap(entries)
      const arr = []
      for (const val of map.values()) { arr.push(val) }
      expect(arr).to.deep.equal([2, 4])
    })
  })

  describe('misc', () => {
    it('should return RunMap for Symbol.species', () => {
      expect(new RunMap()[Symbol.species]).to.equal(RunMap)
    })

    it('should return iterator for Symbol.iterator', () => {
      expect(new RunMap()[Symbol.species]).to.equal(RunMap)
    })
  })
})

// ------------------------------------------------------------------------------------------------
