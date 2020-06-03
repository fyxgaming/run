/**
 * set.js
 *
 * Tests for lib/util/set.js
 */

const { describe, it, beforeEach } = require('mocha')
const { expect } = require('chai')
const bsv = require('bsv')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const util = unmangle(unmangle(Run)._util)
const Location = util._Location
const SafeSet = util._SafeSet
const SafeMap = util._SafeMap

// ------------------------------------------------------------------------------------------------
// A temporary resource for testing
// ------------------------------------------------------------------------------------------------

const randomLocation = () => `${bsv.crypto.Random.getRandomBuffer(32).toString('hex')}_o0`
const randomTempLocation = () => `??${bsv.crypto.Random.getRandomBuffer(31).toString('hex')}_o0`
const testResource = (origin, location) => {
  const resource = () => {}
  resource.owner = 'someone'
  resource.origin = origin
  resource.location = location
  resource.deploy = () => { resource.location = resource.origin = randomTempLocation(); return resource }
  resource.update = () => { resource.location = randomTempLocation(); return resource }
  resource.publish = () => {
    if (!resource.origin || !Location.parse(resource.origin).txid) resource.origin = randomLocation()
    if (!resource.location || !Location.parse(resource.location).txid) resource.location = randomLocation()
    return resource
  }
  resource.duplicate = () => { return testResource(resource.origin, resource.location) }
  return resource
}

// ------------------------------------------------------------------------------------------------
// SafeMap
// ------------------------------------------------------------------------------------------------

describe('SafeMap', () => {
  const run = new Run()
  beforeEach(() => run.activate())

  describe('constructor', () => {
    it('should create empty map', () => {
      expect(new SafeMap().size).to.equal(0)
    })

    it('should create map from array', () => {
      const arr = [[1, 2], ['a', 'b']]
      const map = new SafeMap(arr)
      expect(map.size).to.equal(arr.length)
      arr.forEach(x => expect(map.has(x[0])).to.equal(true))
    })

    it('should create map from map', () => {
      const arr = [[null, null]]
      const map = new SafeMap(arr)
      const map2 = new SafeMap(map)
      expect(map2.size).to.equal(arr.length)
      arr.forEach(([x]) => expect(map2.has(x)).to.equal(true))
      arr.forEach(([x, y]) => expect(map2.get(x)).to.equal(y))
    })
  })

  describe('clear', () => {
    it('should not throw on empty map', () => {
      expect(() => new SafeMap().clear()).not.to.throw()
    })

    it('should empty contents', () => {
      const map = new SafeMap()
      map.set(1, 2)
      map.clear()
      expect(map.size).to.equal(0)
    })

    it('should clear resource states', () => {
      const a = testResource()
      const b = testResource().deploy().publish()
      const map = new SafeMap([[a, 1], [b, 2]])
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
      expect(new SafeMap().delete(1)).to.equal(false)
      expect(new SafeMap().delete(testResource())).to.equal(false)
      expect(new SafeMap().delete(testResource().deploy())).to.equal(false)
      expect(new SafeMap().delete(testResource().deploy().publish())).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new SafeMap([[1, 1]]).delete(1)).to.equal(true)
    })

    it('should clear resource states', () => {
      const a = testResource()
      const b = testResource().deploy()
      const map = new SafeMap([[a, 1], [b, 1]])
      map.delete(a)
      map.delete(b)
      expect(map.size).to.equal(0)
      const a2 = a.deploy().publish().duplicate().update()
      const b2 = b.publish().duplicate().update()
      map.set(a2, 1)
      map.set(b2, 1)
    })

    it('should throw for same resources at different states', () => {
      const a = testResource().deploy().publish()
      const map = new SafeMap([[a, a]])
      const a2 = a.duplicate().update()
      expect(() => map.delete(a2)).to.throw('Inconsistent worldview')
    })
  })

  describe('entries', () => {
    it('should iterate across entries', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new SafeMap(entries)
      for (const entry of map.entries()) {
        const next = entries.shift()
        expect(entry).to.deep.equal(next)
      }
    })
  })

  describe('forEach', () => {
    it('should execute function for each entry', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new SafeMap(entries)
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
      const map = new SafeMap(entries)
      entries.forEach(entry => expect(map.get(entry[0])).to.equal(entry[1]))
    })

    it('should return undefined for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const map = new SafeMap()
      entries.forEach(entry => expect(map.get(entry)).to.equal(undefined))
    })

    it('should return undefined after object is deleted', () => {
      const obj = {}
      const map = new SafeMap([[obj, 1]])
      expect(map.get(obj)).to.equal(1)
      map.delete(obj)
      expect(map.get(obj)).to.equal(undefined)
    })

    it('should return value for resources in map', () => {
      const a = testResource()
      const b = testResource().deploy()
      const c = testResource().deploy().publish()
      const map = new SafeMap([[a, 'abc'], [b, 'def'], [c, 'ghi']])
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

    it('should return undefined for missing resources', () => {
      expect(new SafeMap().get(testResource().deploy())).to.equal(undefined)
    })

    it('should throw for same resources at different states', () => {
      const a = testResource()
      const b = testResource().deploy()
      const c = testResource().deploy().publish()
      const map = new SafeMap([[a, 1], [b, 2], [c, 3]])
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
      const map = new SafeMap(entries)
      entries.forEach(entry => expect(map.has(entry[0])).to.equal(true))
    })

    it('should return false for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const map = new SafeMap()
      entries.forEach(entry => expect(map.has(entry)).to.equal(false))
    })

    it('should return false after object is deleted', () => {
      const obj = {}
      const map = new SafeMap([[obj, 1]])
      expect(map.has(obj)).to.equal(true)
      map.delete(obj)
      expect(map.has(obj)).to.equal(false)
    })

    it('should return true for resources in map', () => {
      const a = testResource()
      const b = testResource().deploy().publish().update()
      const map = new SafeMap([[a, {}], [b, {}]])
      expect(map.has(a)).to.equal(true)
      expect(map.has(b)).to.equal(true)
      expect(map.has(b.duplicate())).to.equal(true)
    })

    it('should return false for missing resources', () => {
      expect(new SafeMap().has(testResource())).to.equal(false)
      expect(new SafeMap().has(testResource().deploy())).to.equal(false)
      expect(new SafeMap().has(testResource().deploy().publish())).to.equal(false)
      expect(new SafeMap().has(testResource().deploy().publish().update())).to.equal(false)
    })

    it('should throw for same resources at different states', () => {
      const a = testResource().deploy().publish().update().publish()
      const map = new SafeMap([[a, []]])
      expect(map.has(a)).to.equal(true)
      expect(() => map.has(a.duplicate().update())).to.throw('Inconsistent worldview')
    })
  })

  describe('set', () => {
    it('should return map regardless', () => {
      const map = new SafeMap()
      expect(map.set(1, 1)).to.equal(map)
      expect(map.set(1, 1)).to.equal(map)
    })

    it('should set basic types and objects as keys once', () => {
      const map = new SafeMap()
      const entries = [[1, 2], ['abc', 'def'], [true, false], [{}, []]]
      entries.forEach(([x, y]) => map.set(x, y))
      entries.forEach(([x, y]) => map.set(x, y))
      expect(map.size).to.equal(entries.length)
    })

    it('should set resources once', () => {
      const a = testResource().deploy().publish()
      const map = new SafeMap()
      map.set(a, 0)
      const a2 = a.duplicate()
      map.set(a2, 1)
      expect(map.size).to.equal(1)
      expect(map.get(a2)).to.equal(1)
    })

    it('should throw if add two of the same resources at different states', () => {
      const a = testResource().deploy().publish()
      const a2 = a.duplicate().update()
      const map = new SafeMap()
      map.set(a2, a2)
      expect(() => map.set(a, {})).to.throw('Inconsistent worldview')
    })
  })

  describe('values', () => {
    it('should return values iterator', () => {
      const entries = [[1, 2], [3, 4]]
      const map = new SafeMap(entries)
      const arr = []
      for (const val of map.values()) { arr.push(val) }
      expect(arr).to.deep.equal([2, 4])
    })
  })

  describe('misc', () => {
    it('should return SafeMap for Symbol.species', () => {
      expect(new SafeMap()[Symbol.species]).to.equal(SafeMap)
    })

    it('should return iterator for Symbol.iterator', () => {
      expect(new SafeMap()[Symbol.species]).to.equal(SafeMap)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// SafeSet
// ------------------------------------------------------------------------------------------------

describe('SafeSet', () => {
  describe('constructor', () => {
    it('should create empty set', () => {
      expect(new SafeSet().size).to.equal(0)
    })

    it('should create set from array', () => {
      const arr = [null]
      const set = new SafeSet(arr)
      expect(set.size).to.equal(arr.length)
      arr.forEach(x => expect(set.has(x)).to.equal(true))
    })

    it('should create set from set', () => {
      const arr = [1, 2, 3]
      const set = new SafeSet(arr)
      const set2 = new SafeSet(set)
      expect(set2.size).to.equal(arr.length)
      arr.forEach(x => expect(set2.has(x)).to.equal(true))
    })
  })

  describe('add', () => {
    it('should return set regardless', () => {
      const set = new SafeSet()
      expect(set.add(1)).to.equal(set)
      expect(set.add(1)).to.equal(set)
    })

    it('should add basic types and objects once', () => {
      const set = new SafeSet()
      const entries = [1, 'abc', true, {}, []]
      entries.forEach(entry => set.add(entry))
      entries.forEach(entry => set.add(entry))
      expect(set.size).to.equal(entries.length)
    })

    it('should add resources once', async () => {
      const a = testResource()
      const b = testResource().deploy().publish()
      const set = new SafeSet()
      set.add(a)
      set.add(b)
      set.add(b.duplicate())
      expect(set.size).to.equal(2)
    })

    it('should throw if add two of the same resources at different states', () => {
      const a = testResource()
      const b = testResource().deploy().publish()
      const set = new SafeSet()
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
      expect(() => new SafeSet().clear()).not.to.throw()
    })

    it('should empty contents', () => {
      const set = new SafeSet()
      set.add(1)
      set.clear()
      expect(set.size).to.equal(0)
    })

    it('should clear resource states', () => {
      const set = new SafeSet()
      const a = testResource().deploy()
      const b = testResource().deploy().publish()
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
      expect(new SafeSet().delete(1)).to.equal(false)
      expect(new SafeSet().delete(testResource())).to.equal(false)
      expect(new SafeSet().delete(testResource().deploy().publish())).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new SafeSet([1]).delete(1)).to.equal(true)
    })

    it('should clear resource states', () => {
      const set = new SafeSet()
      const resource = testResource().deploy().publish()
      set.add(resource)
      set.delete(resource)
      expect(set.size).to.equal(0)
      set.add(resource.update().publish())
    })

    it('should throw for same resources at different states', () => {
      const a = testResource()
      const b = testResource().deploy().publish()
      const set = new SafeSet([a, b])
      expect(() => set.delete(a.deploy().publish().duplicate().update())).to.throw('Inconsistent worldview')
      expect(() => set.delete(b.duplicate().update().publish())).to.throw('Inconsistent worldview')
    })
  })

  describe('entries', () => {
    it('should iterate across entries', () => {
      const arr = [1, 2, 3]
      const set = new SafeSet(arr)
      for (const entry of set.entries()) {
        const next = arr.shift()
        expect(entry).to.deep.equal([next, next])
      }
    })
  })

  describe('forEach', () => {
    it('should execute function for each entry', () => {
      const set = new SafeSet([1, 2, 3])
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
      const set = new SafeSet(entries)
      entries.forEach(entry => expect(set.has(entry)).to.equal(true))
    })

    it('should return false for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const set = new SafeSet()
      entries.forEach(entry => expect(set.has(entry)).to.equal(false))
    })

    it('should return false after object is deleted', () => {
      const obj = {}
      const set = new SafeSet([obj])
      expect(set.has(obj)).to.equal(true)
      set.delete(obj)
      expect(set.has(obj)).to.equal(false)
    })

    it('should return true for resources in set', () => {
      const a = testResource().deploy().publish()
      const set = new SafeSet([a])
      expect(set.has(a)).to.equal(true)
      expect(set.has(a.duplicate())).to.equal(true)
    })

    it('should return false for missing resources', () => {
      expect(new SafeSet().has(testResource())).to.equal(false)
      expect(new SafeSet().has(testResource().deploy())).to.equal(false)
      expect(new SafeSet().has(testResource().deploy().publish())).to.equal(false)
    })

    it('should throw for same resources at different states', () => {
      const a = testResource().deploy()
      const b = testResource().deploy().publish().update()
      const set = new SafeSet([a, b])
      expect(set.has(a)).to.equal(true)
      expect(set.has(b)).to.equal(true)
      expect(() => set.has(a.publish().duplicate().update())).to.throw('Inconsistent worldview')
      expect(() => set.has(b.duplicate().publish())).to.throw('Inconsistent worldview')
    })
  })

  describe('values', () => {
    it('should return values iterator', () => {
      const arr = []
      const set = new SafeSet([1, 2, 3])
      for (const val of set.values()) { arr.push(val) }
      expect(arr).to.deep.equal([1, 2, 3])
    })
  })

  describe('misc', () => {
    it('should return SafeSet for Symbol.species', () => {
      expect(new SafeSet()[Symbol.species]).to.equal(SafeSet)
    })

    it('should return iterator for Symbol.iterator', () => {
      expect(new SafeSet()[Symbol.species]).to.equal(SafeSet)
    })
  })
})

// ------------------------------------------------------------------------------------------------
