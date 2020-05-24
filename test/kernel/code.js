/**
 * code.js
 *
 * Tests for lib/code.js
 */

const { describe, it, beforeEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { stub } = require('sinon')
const { Run, COVER } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const { Jig } = Run
const { _resourceType } = unmangle(unmangle(Run)._util)

// ------------------------------------------------------------------------------------------------
// Code tests
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  const run = new Run()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())

  describe('deploy', () => {
    it('should deploy a basic class', async () => {
      class A { }
      await run.deploy(A)
      expect(A.location).not.to.equal(undefined)
      expect(A.location).to.equal(A.origin)
      expect(A.originMocknet).to.equal(A.origin)
      expect(A.locationMocknet).to.equal(A.origin)
      expect(A.owner).to.equal(run.owner.address)
      expect(A.ownerMocknet).to.equal(run.owner.address)
    })

    it('should support custom owners', async () => {
      class CustomOwner {
        script () { return new Uint8Array() }
        domain () { return 1 }
      }
      const run = new Run({ owner: new CustomOwner() })
      class A { }
      await run.deploy(A)
      expect(A.owner instanceof CustomOwner).to.equal(true)
    })

    it('should not deploy previous install', async () => {
      class A { }
      const loc = await run.deploy(A)
      expect(loc).to.equal(await run.deploy(A))
    })

    it('should deploy functions', async () => {
      function f (a, b) { return a + b }
      const loc = await run.deploy(f)
      expect(f.origin).to.equal(loc)
      expect(f.location).to.equal(loc)
    })

    it('should throw for non-deployables', async () => {
      await expect(run.deploy(2)).to.be.rejected
      await expect(run.deploy('abc')).to.be.rejected
      await expect(run.deploy({ n: 1 })).to.be.rejected
      await expect(run.deploy(Math.random)).to.be.rejected
    })

    it('should throw if parent dep mismatch', async () => {
      class C { }
      class B { }
      class A extends B { }
      A.deps = { B: C }
      await expect(run.deploy(A)).to.be.rejectedWith('unexpected parent dependency B')
    })

    it('should support parent dep set to its sandbox', async () => {
      class B { }
      const B2 = await run.load(await run.deploy(B))
      class A extends B { }
      A.deps = { B: B2 }
      await run.deploy(A)
    })

    it('should deploy parents', async () => {
      class Grandparent { }
      class Parent extends Grandparent { f () { this.n = 1 } }
      class Child extends Parent { f () { super.f(); this.n += 1 } }
      const Child2 = await run.load(await run.deploy(Child))
      const child = new Child2()
      child.f()
      expect(child.n).to.equal(2)
      expect(run.code.installs.has(Parent)).to.equal(true)
      expect(run.code.installs.has(Grandparent)).to.equal(true)
    })

    it('should deploy dependencies', async () => {
      class A { createB () { return new B() } }
      class B { constructor () { this.n = 1 } }
      A.deps = { B }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().createB().n).to.equal(1)
    })

    it('should always deploy parents', async () => {
      function f () { }
      class A { callF () { f() } }
      A.deps = { f }
      class B extends A { callF2 () { f() } }
      const B2 = await run.load(await run.deploy(B))
      const b = new B2()
      expect(() => b.callF()).not.to.throw()
      expect(() => b.callF2()).to.throw()
    })

    it('should return deployed dependencies in jigs', async () => {
      class B { }
      class A {
        bInstanceofB () { return new B() instanceof B }
        bPrototype () { return Object.getPrototypeOf(new B()) }
        nameOfB () { return B.name }
      }
      A.deps = { B }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().nameOfB()).to.equal('B')
      const B2 = await run.load(await run.deploy(B))
      expect(new A2().bPrototype()).to.equal(B2.prototype)
    })

    it('should support renaming dependencies', async () => {
      class A { createB() { return new B() } } // eslint-disable-line
      class C { constructor () { this.n = 1 } }
      A.deps = { B: C }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().createB().n).to.equal(1)
    })

    it('should throw for undefined dependencies', async () => {
      class B { }
      class A { createB () { return new B() } }
      const A2 = await run.load(await run.deploy(A))
      expect(() => new A2().createB()).to.throw('B is not defined')
    })

    it('should support circular dependencies', async () => {
      class A { createB () { return new B() } }
      class B { createA () { return new A() } }
      A.deps = { B }
      B.deps = { A }
      const A2 = await run.load(await run.deploy(A))
      const B2 = await run.load(await run.deploy(B))
      expect(new A2().createB()).to.be.instanceOf(B2)
      expect(new B2().createA()).to.be.instanceOf(A2)
    })

    it('should set temporary origins and locations before sync', async () => {
      class B { }
      class A { }
      A.deps = { B }
      const locationPromise = run.deploy(A)
      expect(B.origin).to.equal('_d1')
      expect(A.origin).to.equal('_d0')
      expect(B.location).to.equal('_d1')
      expect(A.location).to.equal('_d0')
      expect(B.originMocknet).to.equal('_d1')
      expect(A.originMocknet).to.equal('_d0')
      expect(B.locationMocknet).to.equal('_d1')
      expect(A.locationMocknet).to.equal('_d0')
      const location = await locationPromise
      expect(location.startsWith('_')).to.equal(false)
      expect(B.origin.startsWith('_')).to.equal(false)
      expect(A.origin.startsWith('_')).to.equal(false)
      expect(B.location.startsWith('_')).to.equal(false)
      expect(A.location.startsWith('_')).to.equal(false)
      expect(B.originMocknet.startsWith('_')).to.equal(false)
      expect(A.originMocknet.startsWith('_')).to.equal(false)
      expect(B.locationMocknet.startsWith('_')).to.equal(false)
      expect(A.locationMocknet.startsWith('_')).to.equal(false)
    })

    it('should support batch deploys', async () => {
      class A { }
      class B { }
      class C { }
      run.transaction.begin()
      run.deploy(A)
      run.deploy(B)
      run.deploy(C)
      run.transaction.end()
      expect(A.origin).to.equal('_d0')
      expect(B.origin).to.equal('_d1')
      expect(C.origin).to.equal('_d2')
      expect(A.location).to.equal('_d0')
      expect(B.location).to.equal('_d1')
      expect(C.location).to.equal('_d2')
      expect(A.originMocknet).to.equal('_d0')
      expect(B.originMocknet).to.equal('_d1')
      expect(C.originMocknet).to.equal('_d2')
      expect(A.locationMocknet).to.equal('_d0')
      expect(B.locationMocknet).to.equal('_d1')
      expect(C.locationMocknet).to.equal('_d2')
      await run.sync()
      const txid = A.origin.split('_')[0]
      expect(A.origin.startsWith(txid)).to.equal(true)
      expect(B.origin.startsWith(txid)).to.equal(true)
      expect(C.origin.startsWith(txid)).to.equal(true)
      expect(A.location.startsWith(txid)).to.equal(true)
      expect(B.location.startsWith(txid)).to.equal(true)
      expect(C.location.startsWith(txid)).to.equal(true)
      expect(A.originMocknet.startsWith(txid)).to.equal(true)
      expect(B.originMocknet.startsWith(txid)).to.equal(true)
      expect(C.originMocknet.startsWith(txid)).to.equal(true)
      expect(A.locationMocknet.startsWith(txid)).to.equal(true)
      expect(B.locationMocknet.startsWith(txid)).to.equal(true)
      expect(C.locationMocknet.startsWith(txid)).to.equal(true)
    })

    it('should deploy all queued', async () => {
      class A { }
      class B { }
      run.deploy(A)
      run.deploy(B)
      await run.sync()
      expect(A.origin.split('_')[0]).not.to.equal(B.origin.split('_')[0])
      expect(A.location.split('_')[0]).not.to.equal(B.location.split('_')[0])
    })

    it('should revert metadata for deploy failures', async () => {
      const run = new Run()
      stub(run.purse, 'pay').returns()
      class A { }
      await expect(run.deploy(A)).to.be.rejected
      expect(A.origin).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(A.originMocknet).to.equal(undefined)
      expect(A.locationMocknet).to.equal(undefined)
    })

    // TODO: Re-enable
    it.skip('should revert metadata for queued deploy failures', async () => {
      const run = new Run()
      stub(run.purse, 'pay').callThrough().onSecondCall().returns()
      class A { }
      class B { }
      run.deploy(A).catch(e => {})
      run.deploy(B).catch(e => {})
      expect(A.origin.startsWith('_')).to.equal(true)
      expect(B.origin.startsWith('_')).to.equal(true)
      expect(A.location.startsWith('_')).to.equal(true)
      expect(B.location.startsWith('_')).to.equal(true)
      expect(A.originMocknet.startsWith('_')).to.equal(true)
      expect(B.originMocknet.startsWith('_')).to.equal(true)
      expect(A.locationMocknet.startsWith('_')).to.equal(true)
      expect(B.locationMocknet.startsWith('_')).to.equal(true)
      await expect(run.sync()).to.be.rejectedWith('tx has no inputs')
      expect(A.origin.endsWith('_o1')).to.equal(true)
      expect(A.originMocknet.endsWith('_o1')).to.equal(true)
      expect(B.origin).to.equal(undefined)
      expect(B.originMocknet).to.equal(undefined)
      expect(A.location.endsWith('_o1')).to.equal(true)
      expect(A.locationMocknet.endsWith('_o1')).to.equal(true)
      expect(B.location).to.equal(undefined)
      expect(B.locationMocknet).to.equal(undefined)
    })

    it('should support presets', async () => {
      const run = new Run()
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      run.deactivate()
      const run2 = new Run()
      const oldBroadcast = run2.blockchain.broadcast
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      try {
        const location = await run2.deploy(A)
        const networkSuffix = unmangle(unmangle(Run)._util)._networkSuffix(run2.blockchain.network)
        expect(A.origin).to.equal(A[`origin${networkSuffix}`])
        expect(A.location).to.equal(A[`location${networkSuffix}`])
        expect(location).to.equal(A[`location${networkSuffix}`])
      } finally {
        run2.blockchain.broadcast = oldBroadcast
      }
    })

    it('should support origin-only presets', async () => {
      const run = new Run()
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      run.deactivate()
      const run2 = new Run()
      const oldBroadcast = run2.blockchain.broadcast
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      try {
        const location = await run2.deploy(A)
        const networkSuffix = unmangle(unmangle(Run)._util)._networkSuffix(run2.blockchain.network)
        expect(A.origin).to.equal(A[`origin${networkSuffix}`])
        expect(A.location).to.equal(A[`location${networkSuffix}`])
        expect(location).to.equal(A[`location${networkSuffix}`])
      } finally {
        run2.blockchain.broadcast = oldBroadcast
      }
    })

    it('should support location-only presets', async () => {
      const run = new Run()
      class A { }
      await run.deploy(A)
      run.deactivate()
      const run2 = new Run()
      const oldBroadcast = run2.blockchain.broadcast
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      try {
        delete A.location
        delete A.origin
        const networkSuffix = unmangle(unmangle(Run)._util)._networkSuffix(run2.blockchain.network)
        delete A[`origin${networkSuffix}`]
        const location = await run2.deploy(A)
        expect(A.origin).to.equal(undefined)
        expect(A.location).to.equal(A[`location${networkSuffix}`])
        expect(location).to.equal(A[`location${networkSuffix}`])
      } finally {
        run2.blockchain.broadcast = oldBroadcast
      }
    })
  })

  describe('load', () => {
    it('should load from cache', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      expect(await run.load(A.origin)).to.equal(A2)
    })

    it('should load from mockchain when cached', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      const run2 = new Run()
      const A3 = await run2.load(A.origin)
      expect(A2).to.equal(A3)
    })

    it('should load from mockchain when uncached', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const A3 = await run2.load(A.origin)
      expect(A2.owner).to.equal(run.owner.address)
      expect(A2.owner).to.equal(A2.ownerMocknet)
      expect(A3.owner).to.equal(A2.owner)
    })

    it('should throw if load temporary location', async () => {
      class A { f () { return 1 } }
      run.deploy(A).catch(e => {})
      await expect(run.load(A.locationMocknet)).to.be.rejected
    })

    it('should load functions', async () => {
      function f (a, b) { return a + b }
      const f2 = await run.load(await run.deploy(f))
      expect(f(1, 2)).to.equal(f2(1, 2))
    })

    it('should load after deploy with preset', async () => {
      // get a location
      class A { }
      await run.deploy(A)
      // deactivating, which will leave A.location set
      run.deactivate()
      expect(typeof A.location).to.equal('string')
      // deploy the same code again
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.deploy(A)
      // find the sandbox directly, without using load, because we want to make sure deploy works correctly.
      // and using load, make sure the sandboxes are the same
      expect(run2.code.installs.get(A)).to.equal(await run2.load(A.location))
    })

    it('should support dependencies in different transactions', async () => {
      class A {}
      class B extends A {}
      class C {}
      C.B1 = B
      C.B2 = B
      run.deploy(A)
      run.deploy(B)
      run.deploy(C)
      await run.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(C.location)
    })
  })

  describe('static props', () => {
    async function testStaticPropPass (x) {
      // Test with a child class and various properties to ensure variation
      class A { }
      class B extends A { }
      B.x = x
      B.y = [x]
      B.s = new Set()
      B.s.x = x
      const B2 = await run.load(await run.deploy(B))
      const props = [B2.x, B2.y[0], B2.s.x]
      props.forEach(y => {
        if (_resourceType(y)) {
          expect(y.origin).to.equal(x.origin)
          expect(y.location).to.equal(x.location)
        } else {
          expect(y).to.deep.equal(x)
        }
      })
    }

    it('should support static prop that is zero', () => testStaticPropPass(0))
    it('should support static prop that is negative number', () => testStaticPropPass(-1))
    it('should support static prop that is max integer', () => testStaticPropPass(Number.MAX_SAFE_INTEGER))
    it('should support static prop that is NaN', () => testStaticPropPass(NaN))
    it('should support static prop that is negative infinity', () => testStaticPropPass(-Infinity))
    it('should support static prop that is true', () => testStaticPropPass(true))
    it('should support static prop that is false', () => testStaticPropPass(false))
    it('should support static prop that is null', () => testStaticPropPass(null))
    it('should support static prop that is empty string', () => testStaticPropPass(''))
    it('should support static prop that is emoji string', () => testStaticPropPass('😊'))
    it('should support static prop that is object', () => testStaticPropPass({ m: 1, n: 2, o: [] }))
    it('should support static prop that is array', () => testStaticPropPass([1, 2, 3]))
    it('should support static prop that is buffer', () => testStaticPropPass(new Uint8Array([0, 1, 2])))
    it('should support static prop that is class', () => testStaticPropPass(class A { }))
    it('should support static prop that is anonymous class', () => testStaticPropPass(class { }))
    it('should support static prop that is anonymous function', () => testStaticPropPass(function () { }))
    it('should support static prop that is a jig', () => testStaticPropPass(new (class A extends Jig {})()))
    it('should support static prop that is a arbitrary object', () =>
      testStaticPropPass(new (class A { constructor () { this.n = 1 }})()))

    it('should support static prop that is self-reference', async () => {
      class A { }
      A.A = A
      const A2 = await run.load(await run.deploy(A))
      expect(A2.A).to.equal(A2)
    })

    it('should dedup set and map keys in static props', async () => {
      class A extends Jig { }
      const a1 = new A()
      await run.sync()
      const a2 = await run.load(a1.location)
      function b () { }
      b.set = new Set([a1, a2, null])
      b.map = new Map([[a1, 0], [a2, 1]])
      const b2 = await run.load(await run.deploy(b))
      expect(b2.set.size).to.equal(2)
      expect(b2.map.size).to.equal(1)
    })

    it('should support circular props', async () => {
      class A extends Jig { }
      class B extends Jig { }
      A.B = B
      B.A = A
      await run.deploy(A)
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const A2 = await run2.load(A.location)
      const B2 = await run2.load(B.location)
      expect(A2.B).to.equal(B2)
      expect(B2.A).to.equal(A2)
    })

    it('should throw for bad deps', async () => {
      class B { }
      class A extends Jig { }
      A.deps = [B]
      await expect(run.deploy(A)).to.be.rejectedWith('deps must be an object')
      A.deps = B
      await expect(run.deploy(A)).to.be.rejectedWith('deps must be an object')
    })

    it('should throw for bad strings', async () => {
      class A extends Jig { }
      const stringProps = ['origin', 'location', 'originMainnet', 'locationMainnet', 'originTestnet',
        'locationTestnet', 'originStn', 'locationStn', 'originMocknet', 'locationMocknet']
      for (const s of stringProps) {
        A[s] = {}
        await expect(run.deploy(A)).to.be.rejectedWith(`${s} must be a string`)
        A[s] = 123
        await expect(run.deploy(A)).to.be.rejectedWith(`${s} must be a string`)
        delete A[s]
      }
    })

    async function testStaticPropFail (x) {
      class A { }
      A.x = x
      await expect(run.deploy(A)).to.be.rejectedWith('A static property of A is not supported')
    }

    it('should throw for static prop that is a Date', () => testStaticPropFail(new Date()))
    it('should throw for static prop that is the Math intrinsic', () => testStaticPropFail(Math))
    it('should throw for static prop that is a WeakSet', () => testStaticPropFail(new WeakSet()))
    it('should throw for static prop that is a Int32Array', () => testStaticPropFail(new Int32Array()))
  })

  describe('sandbox', () => {
    it('should sandbox methods from locals', async () => {
      const s = 'abc'
      class A {
        add (n) { return n + 1 }

        break () { return s }
      }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().add(1)).to.equal(2)
      expect(new A().break()).to.equal('abc')
      expect(() => new A2().break()).to.throw()
    })

    it('should sandbox methods from globals', async () => {
      class A {
        isUndefined (x) {
          if (typeof window !== 'undefined') return typeof window[x] === 'undefined'
          if (typeof global !== 'undefined') return typeof global[x] === 'undefined'
          return true
        }
      }
      const A1 = await run.load(await run.deploy(A))
      const a1 = new A1()
      const bad = ['Date', 'Math', 'eval', 'XMLHttpRequest', 'FileReader', 'WebSocket', 'setTimeout', 'setInterval']
      bad.forEach(x => expect(a1.isUndefined(x)).to.equal(true))
      await run.sync()
      const run2 = new Run()
      const A2 = await run2.load(A.origin)
      const a2 = new A2()
      bad.forEach(x => expect(a2.isUndefined(x)).to.equal(true))
    })
  })

  describe('misc', () => {
    it('should pass instanceof checks', async () => {
      class A { }
      const A2 = await run.load(await run.deploy(A))
      expect(new A()).to.be.instanceOf(A)
      expect(new A()).not.to.be.instanceOf(A2)
      expect(new A2()).not.to.be.instanceOf(A)
      expect(new A2()).to.be.instanceOf(A2)
    })
  })

  describe('activate', () => {
    it.skip('should support activating different network', async () => {
      if (Run.instance) Run.instance.deactivate()
      const run = new Run() // Create a new run to have a new code cache
      class A { }
      await run.deploy(A)
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationMocknet)
      expect(A.owner).to.equal(run.owner.address)
      expect(A.ownerMocknet).to.equal(run.owner.address)
      const run2 = new Run({ network: 'test' })
      expect(A.location).to.equal(undefined)
      expect(A.locationMocknet.length).to.equal(67)
      expect(A.owner).to.equal(undefined)
      expect(A.ownerMocknet).to.equal(run.owner.address)
      await run2.deploy(A)
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationTestnet)
      expect(A.owner).to.equal(A.ownerTestnet)
      run.activate()
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationMocknet)
      expect(A.owner).to.equal(A.ownerMocknet)
      expect(run.code.installs.size).to.equal(COVER ? 7 : 8)
    })

    it.skip('should set correct owner for different networks', async () => {
      class A { }
      class B extends Jig { init () { if (this.owner !== A.owner) throw new Error() } }
      B.deps = { A }
      for (const network of ['test', 'mock']) {
        const run = new Run({ network })
        run.transaction.begin()
        run.deploy(A)
        run.deploy(B)
        run.transaction.end()
        await run.sync()
        const b = new B()
        await b.sync()
        run.deactivate()
        const run2 = new Run({ network, owner: run.owner.privkey })
        await run2.sync()
      }
    })
  })
})

// ------------------------------------------------------------------------------------------------
