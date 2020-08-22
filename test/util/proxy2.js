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

  describe('Uint8Array', () => {
    // TODO
  })

  describe('misc', () => {
    // Normal proxy
    // GetTarget,Handler,etc.
  })

  it('test', () => {
    const h = {}
    h._intrinsicGetMethod = () => { console.log('  intrinsic get method') }
    h._intrinsicIn = x => { console.log('  intrinsic in', x); return x }
    h._intrinsicOut = x => { console.log('  intrinsic out', x); return x }
    h._intrinsicRead = () => { console.log('  intrinsic read') }
    h._intrinsicUpdate = () => { console.log('  intrinsic update') }

    const p = new Proxy2(new Set(), h)

    console.log('add 1, 2')
    expect(p.add(1)).to.equal(p)
    expect(p.add(2)).to.equal(p)

    console.log('for each')
    p.forEach(x => console.log(' ', x))

    console.log('iterator')
    for (const x of p) { console.log(' ', x) }

    console.log('entries')
    for (const x of p.entries()) { console.log(' ', x) }

    console.log('print set')
    console.log(' ', p)

    console.log('checking same method')
    expect(p.set).to.equal(p.set)

    console.log('another object')
    const addMethod = p.add
    expect(addMethod).not.to.equal(Set.prototype.add)
    addMethod.call(new Set(), 1)

    console.log('clear')
    p.clear()

    console.log('size getter')
    console.log(' ', p.size)
  })
})

// ------------------------------------------------------------------------------------------------
