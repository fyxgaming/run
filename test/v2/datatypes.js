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
      expect(() => set.add(token2)).to.throw('Detected two of the same tokens with different locations')
    })
  })

  describe('has', () => {
    it('should return true for basic types and objects in set', () => {

    })

    it('should return false for basic types and objects not in set', () => {

    })

    it('should return true for tokens in set', () => {

    })

    it('should throw for same tokens at different states', () => {

    })

    it('should throw for tokens of unknown protocol', () => {

    })
  })

  describe('misc', () => {
    it('should return RunSet for species', () => {
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
