/**
 * proxy2.js
 *
 * Tests for lib/util/proxy2.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { spy } = require('sinon')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { mangle } = unmangle
const Proxy2 = unmangle(Run)._Proxy2

// ------------------------------------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------------------------------------

function handler (methods = {}) {
  const handler = {
    _intrinsicGetMethod: () => {},
    _intrinsicIn: x => x,
    _intrinsicOut: x => x,
    _intrinsicRead: () => {},
    _intrinsicUpdate: () => {}
  }
  Object.keys(methods).forEach(key => { handler[key] = methods[key] })
  return mangle(spy(handler))
}

function resetHistory (h) {
  unmangle(h)._intrinsicGetMethod.resetHistory()
  unmangle(h)._intrinsicIn.resetHistory()
  unmangle(h)._intrinsicOut.resetHistory()
  unmangle(h)._intrinsicRead.resetHistory()
  unmangle(h)._intrinsicUpdate.resetHistory()
}

// ------------------------------------------------------------------------------------------------
// Proxy2
// ------------------------------------------------------------------------------------------------

describe('Proxy2', () => {
  // --------------------------------------------------------------------------
  // Set
  // --------------------------------------------------------------------------

  describe('Set', () => {
    it('add', () => {
      const h = handler()
      const p = new Proxy2(new Set(), h)
      p.add(1)
      p.add(p)
      p.add([])
      expect(unmangle(h)._intrinsicGetMethod.calledThrice).to.equal(true)
      expect(unmangle(h)._intrinsicIn.calledThrice).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.calledThrice).to.equal(true)
      expect(unmangle(h)._intrinsicOut.called).to.equal(false)
      expect(unmangle(h)._intrinsicRead.called).to.equal(false)
    })

    it('clear', () => {
      const h = handler()
      const p = new Proxy2(new Set(), h)
      p.add(1)
      resetHistory(h)
      p.clear()
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(false)
      expect(unmangle(h)._intrinsicRead.called).to.equal(false)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(true)
    })

    it('delete', () => {
      const h = handler()
      const p = new Proxy2(new Set(), h)
      p.add(1)
      resetHistory(h)
      expect(p.delete(1)).to.equal(true)
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(true)
      expect(unmangle(h)._intrinsicOut.called).to.equal(false)
      expect(unmangle(h)._intrinsicRead.called).to.equal(false)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(true)
    })

    it('entries', () => {
      const h = handler()
      const p = new Proxy2(new Set(), h)
      const v = [1, 2]
      v.forEach(x => p.add(x))
      resetHistory(h)
      for (const x of p.entries()) {
        const n = v.shift()
        expect(x).to.deep.equal([n, n])
      }
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(true)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })

    it('entries with conversion', () => {
      const h = handler({
        _intrinsicIn: x => x + 1,
        _intrinsicOut: x => x - 1
      })
      const p = new Proxy2(new Set(), h)
      const v = [1, 2]
      v.forEach(x => p.add(x))
      for (const x of p.entries()) {
        const n = v.shift()
        expect(x).to.deep.equal([n, n])
      }
    })

    it('forEach', () => {
      const h = handler({
        _intrinsicIn: x => x + 1,
        _intrinsicOut: x => x - 1
      })
      const p = new Proxy2(new Set(), h)
      const v = [1, 2]
      v.forEach(x => p.add(x))
      resetHistory(h)
      p.forEach(x => expect(x).to.deep.equal(v.shift()))
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(true)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })

    it('has', () => {
      const h = handler()
      const p = new Proxy2(new Set(), h)
      p.add(p)
      resetHistory(h)
      expect(p.has(p)).to.equal(true)
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(true)
      expect(unmangle(h)._intrinsicOut.called).to.equal(false)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })

    it('has with conversion', () => {
      const h = handler({ _intrinsicIn: x => x + 1 })
      const p = new Proxy2(new Set(), h)
      p.add(1)
      resetHistory(h)
      expect(p.has(1)).to.equal(true)
    })

    it('iterator', () => {
      const h = handler({
        _intrinsicIn: x => x + 1,
        _intrinsicOut: x => x - 1
      })
      const p = new Proxy2(new Set(), h)
      const v = [1, 2]
      v.forEach(x => p.add(x))
      resetHistory(h)
      for (const x of p) {
        expect(x).to.deep.equal(v.shift())
      }
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(true)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })

    it('size', () => {
      const h = handler()
      const p = new Proxy2(new Set([1, 2, 3]), h)
      expect(p.size).to.equal(3)
    })

    it('values', () => {
      const h = handler()
      const p = new Proxy2(new Set(), h)
      const v = [1, 2]
      v.forEach(x => p.add(x))
      resetHistory(h)
      for (const x of p.values()) {
        expect(x).to.deep.equal(v.shift())
      }
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(true)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })
  })

  // --------------------------------------------------------------------------
  // Map
  // --------------------------------------------------------------------------

  describe('Map', () => {
    it('clear', () => {
      const h = handler()
      const p = new Proxy2(new Map(), h)
      p.set(1, 2)
      resetHistory(h)
      p.clear()
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(false)
      expect(unmangle(h)._intrinsicRead.called).to.equal(false)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(true)
    })

    it('delete', () => {
      const h = handler()
      const p = new Proxy2(new Map(), h)
      p.set(1, 2)
      resetHistory(h)
      p.delete(1)
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(true)
      expect(unmangle(h)._intrinsicOut.called).to.equal(false)
      expect(unmangle(h)._intrinsicRead.called).to.equal(false)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(true)
    })

    it('entries', () => {
      const h = handler({
        _intrinsicIn: x => x * 2,
        _intrinsicOut: x => x / 2
      })
      const p = new Proxy2(new Map(), h)
      const val = [[1, 2], [3, 4]]
      val.forEach(([k, v]) => p.set(k, v))
      resetHistory(h)
      for (const x of p.entries()) {
        const n = val.shift()
        expect(n).to.deep.equal(x)
      }
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(true)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })

    it('forEach', () => {
      const h = handler({
        _intrinsicIn: x => [x],
        _intrinsicOut: x => x[0]
      })
      const p = new Proxy2(new Map(), h)
      const v = [[1, 2], [3, 4]]
      v.forEach((k, v) => p.set(k, v))
      resetHistory(h)
      p.forEach(x => expect(x).to.deep.equal(v.shift()))
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(true)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })

    it('get', () => {
      const h = handler()
      const p = new Proxy2(new Map(), h)
      p.set(1, 2)
      resetHistory(h)
      expect(p.get(1)).to.equal(2)
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(true)
      expect(unmangle(h)._intrinsicOut.called).to.equal(true)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })

    it('iterator', () => {
      const h = handler()
      const p = new Proxy2(new Map(), h)
      const val = [[1, 2], [3, 4]]
      val.forEach(([k, v]) => p.set(k, v))
      resetHistory(h)
      for (const x of p) {
        const n = val.shift()
        expect(n).to.deep.equal(x)
      }
    })

    it('keys', () => {
      const h = handler({
        _intrinsicIn: x => { return { x } },
        _intrinsicOut: o => o.x
      })
      const p = new Proxy2(new Map(), h)
      const val = [[1, 2], [3, 4]]
      val.forEach(([k, v]) => p.set(k, v))
      resetHistory(h)
      for (const x of p.keys()) {
        const n = val.shift()
        expect(n[0]).to.deep.equal(x)
      }
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(true)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })

    it('set', () => {
      const h = handler()
      const p = new Proxy2(new Map(), h)
      expect(p.set(1, 2)).to.equal(p)
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(true)
      expect(unmangle(h)._intrinsicOut.called).to.equal(false)
      expect(unmangle(h)._intrinsicRead.called).to.equal(false)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(true)
    })

    it('size', () => {
      const h = handler()
      const p = new Proxy2(new Map([[1, 2], [3, 4]]), h)
      expect(p.size).to.equal(2)
    })

    it('values', () => {
      const h = handler()
      const p = new Proxy2(new Map(), h)
      const val = [[1, 2], [3, 4]]
      val.forEach(([k, v]) => p.set(k, v))
      resetHistory(h)
      for (const x of p.values()) {
        const n = val.shift()
        expect(n[1]).to.deep.equal(x)
      }
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(true)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })
  })

  // --------------------------------------------------------------------------
  // Uint8Array
  // --------------------------------------------------------------------------

  describe('Uint8Array', () => {
    it('read methods', () => {
      const h = handler()
      const p = new Proxy2(new Uint8Array([1, 2, 3]), h)
      p.entries()
      p.every(() => {})
      p.filter(() => {})
      p.find(() => {})
      p.findIndex(() => {})
      p.forEach(() => {})
      p.includes()
      p.indexOf()
      p.lastIndexOf()
      p.join()
      p.keys()
      p.map(() => {})
      p.reduce(() => {})
      p.reduceRight(() => {})
      p.some(() => {})
      p.subarray()
      p.toLocaleString()
      p.toString()
      p.values()
      p[Symbol.iterator]()
      expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
      expect(unmangle(h)._intrinsicIn.called).to.equal(false)
      expect(unmangle(h)._intrinsicOut.called).to.equal(false)
      expect(unmangle(h)._intrinsicRead.called).to.equal(true)
      expect(unmangle(h)._intrinsicUpdate.called).to.equal(false)
    })

    it('update methods', () => {
      const h = handler()
      const p = new Proxy2(new Uint8Array([1, 2, 3]), h)
      function test (f) {
        resetHistory(h)
        f()
        expect(unmangle(h)._intrinsicGetMethod.called).to.equal(true)
        expect(unmangle(h)._intrinsicIn.called).to.equal(false)
        expect(unmangle(h)._intrinsicOut.called).to.equal(false)
        expect(unmangle(h)._intrinsicRead.called).to.equal(false)
        expect(unmangle(h)._intrinsicUpdate.called).to.equal(true)
      }
      test(() => p.copyWithin(0))
      test(() => p.fill(0))
      test(() => p.reverse())
      test(() => p.set([0]))
      test(() => p.sort())
    })

    it('length', () => {
      const h = handler()
      const p = new Proxy2(new Uint8Array([1, 2, 3]), h)
      expect(p.length).to.equal(3)
    })
  })

  describe('misc', () => {
    it('same methods when wrapped', () => {
      const h = handler()
      const p = new Proxy2(new Set(), h)
      expect(p.add).to.equal(p.add)
      expect(p[Symbol.iterator]).to.equal(p[Symbol.iterator])
    })

    it('can call method on a non-proxy intrinsic', () => {
      const h = handler()
      const p = new Proxy2(new Set(), h)
      const addMethod = p.add
      expect(addMethod).not.to.equal(Set.prototype.add)
      addMethod.call(new Set(), 1)
    })

    it('cannot create for same target twice', () => {
      const h = handler()
      const o = {}
      new Proxy2(o, h) // eslint-disable-line
      expect(() => new Proxy2(o, h)).to.throw()
    })
  })

  describe('getTarget', () => {
    it('returns target if exist', () => {
      const o = {}
      const p = new Proxy2(o, handler())
      expect(Proxy2._getTarget(p)).to.equal(o)
    })

    it('returns undefined if not exist', () => {
      expect(Proxy2._getTarget({})).to.equal(undefined)
    })
  })

  describe('getProxy', () => {
    it('returns proxy if exist', () => {
      const o = {}
      const p = new Proxy2(o, handler())
      expect(Proxy2._getProxy(o)).to.equal(p)
    })

    it('returns undefined if not exist', () => {
      expect(Proxy2._getProxy({})).to.equal(undefined)
    })
  })

  describe('getHandler', () => {
    it('returns handler if exist for target', () => {
      const h = handler()
      const p = new Proxy2({}, h)
      expect(Proxy2._getHandler(p)).to.equal(h)
    })

    it('returns handler if exist for proxy', () => {
      const h = handler()
      const o = {}
      new Proxy2(o, h) // eslint-disable-line
      expect(Proxy2._getHandler(o)).to.equal(h)
    })

    it('returns undefined if not exist', () => {
      expect(Proxy2._getHandler({})).to.equal(undefined)
    })
  })

  describe('handlers', () => {
    it('apply', () => {
      const h = handler({ _apply: (...args) => Reflect.apply(...args) })
      function f () { }
      const p = new Proxy2(f, h)
      p()
      expect(h._apply.called).to.equal(true)
    })

    it('construct', () => {
      const h = handler({ _construct: (...args) => Reflect.construct(...args) })
      class A { }
      const P = new Proxy2(A, h)
      new P() // eslint-disable-line
      expect(h._construct.called).to.equal(true)
    })

    it('defineProperty', () => {
      const h = handler({ _defineProperty: (...args) => Reflect.defineProperty(...args) })
      const p = new Proxy2({}, h)
      Object.defineProperty(p, 'n', { value: 1 })
      expect(h._defineProperty.called).to.equal(true)
    })

    it('deleteProperty', () => {
      const h = handler({ _deleteProperty: (...args) => Reflect.deleteProperty(...args) })
      const p = new Proxy2({ n: 1 }, h)
      delete p.n
      expect(h._deleteProperty.called).to.equal(true)
    })

    it('getPrototypeOf', () => {
      const h = handler({ _getPrototypeOf: (...args) => Reflect.getPrototypeOf(...args) })
      const p = new Proxy2({}, h)
      Object.getPrototypeOf(p)
      expect(h._getPrototypeOf.called).to.equal(true)
    })

    it('has', () => {
      const h = handler({ _has: (...args) => Reflect.has(...args) })
      const p = new Proxy2({ }, h)
      'n' in p // eslint-disable-line
      expect(h._has.called).to.equal(true)
    })

    it('isExtensible', () => {
      const h = handler({ _isExtensible: (...args) => Reflect.isExtensible(...args) })
      const p = new Proxy2({ }, h)
      Object.isExtensible(p)
      expect(h._isExtensible.called).to.equal(true)
    })
  })

  /* #101-111
  ownKeys (...args) { return this._handler._ownKeys ? this._handler._ownKeys(...args) : Reflect.ownKeys(...args) }
  preventExtensions (...args) { return this._handler._preventExtensions ? this._handler._preventExtensions(...args) : Reflect.preventExtensions(...args) }
  set (...args) { return this._handler.set ? this._handler._set(...args) : Reflect.set(...args) }
  setPrototypeOf (...args) { return this._handler._setPrototypeOf ? this._handler._setPrototypeOf(...args) : Reflect.setPrototypeOf(...args) }

  get ... not called for intrinsincs, but otherwise yes
  */
})

// ------------------------------------------------------------------------------------------------
