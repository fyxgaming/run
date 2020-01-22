const { describe, it } = require('mocha')
const { expect } = require('chai')
const { RunSet, RunMap } = require('../../lib/v2/datatypes')
const Protocol = require('../../lib/v2/protocol')

// ------------------------------------------------------------------------------------------------
// RunSet
// ------------------------------------------------------------------------------------------------

describe('RunSet', () => {
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

  describe('add', () => {
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

    it('should add tokens once', () => {
      const token1 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
      const token2 = { $protocol: Protocol.BcatProtocol, location: 'abc' }
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
        constructor() { this.arr = [] }
        push(x) { this.arr.push(x) }
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

    it ('should return false for missing tokens', () => {
      expect(new RunSet().has({ $protocol: Protocol.RunProtocol, location: 'abc'})).to.equal(false)
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
    // TODO
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
  it('test', () => {
    console.log(new RunMap())
  })
})

// ------------------------------------------------------------------------------------------------
