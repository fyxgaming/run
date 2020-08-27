/**
 * intrinsics.js
 *
 * Tests for lib/membrane/intrinsics.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { _ownGetters, _ownMethods } = unmangle(unmangle(Run)._misc)
const Intrinsics = unmangle(unmangle(Run)._membrane)._Intrinsics
const Proxy = unmangle(Run)._Proxy

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const SET_GETTERS = _ownGetters(Set.prototype)
const MAP_GETTERS = _ownGetters(Map.prototype)
const UINT8ARRAY_GETTERS = _ownGetters(Uint8Array.prototype)
  .concat(_ownGetters(Object.getPrototypeOf(Uint8Array.prototype)))

const SET_METHODS = _ownMethods(Set.prototype)
const MAP_METHODS = _ownMethods(Map.prototype)
const UINT8ARRAY_METHODS = _ownMethods(Uint8Array.prototype)
  .concat(_ownMethods(Object.getPrototypeOf(Uint8Array.prototype)))

// ------------------------------------------------------------------------------------------------
// Intrinsics
// ------------------------------------------------------------------------------------------------

describe('Intrinsics', () => {
  describe('Set', () => {
    it('getters', () => {
      const p = new Proxy(new Set(), new Intrinsics())
      SET_GETTERS.forEach(name => p[name])
    })

    it('methods', () => {
      const p = new Proxy(new Set(), new Intrinsics())
      SET_METHODS.forEach(name => p[name](() => {}))
    })
  })

  describe('Map', () => {
    it('getters', () => {
      const p = new Proxy(new Map(), new Intrinsics())
      MAP_GETTERS.forEach(name => p[name])
    })

    it('methods', () => {
      const p = new Proxy(new Map(), new Intrinsics())
      MAP_METHODS.forEach(name => p[name](() => {}))
    })
  })

  describe('Uint8Array', () => {
    it('getters', () => {
      const p = new Proxy(new Uint8Array(), new Intrinsics())
      UINT8ARRAY_GETTERS.forEach(name => p[name])
    })

    it('methods', () => {
      const p = new Proxy(new Uint8Array(), new Intrinsics())
      UINT8ARRAY_METHODS.forEach(name => p[name](() => {}, 0))
    })
  })

  describe('misc', () => {
    it('non-intrinsic set', () => {
      const o = new Proxy({}, new Intrinsics())
      const arr = []
      o.a = arr
      expect(o.a).to.equal(arr)
    })

    it('non-intrinsic method', () => {
      const o = new Proxy({}, new Intrinsics())
      o.toString()
    })

    it('returns same intrinsic method each time', () => {
      const o = new Proxy(new Set(), new Intrinsics())
      expect(o.has).to.equal(o.has)
    })

    it('supports inner proxies', () => {
      const p1 = new Proxy(new Set(), new Intrinsics())
      const p2 = new Proxy(p1, new Intrinsics())
      p2.add(1)
      expect(p2.size).to.equal(1)
    })

    it('supports wrapped membranes', () => {
      const p = new Proxy(new Set(), new Intrinsics(new Intrinsics()))
      p.add(1)
      expect(p.size).to.equal(1)
    })
  })
})

// ------------------------------------------------------------------------------------------------
