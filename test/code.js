/**
 * code.js
 *
 * Tests for ../lib/code.js
 */

// TODO: Do we need to pass run.blockchain into tests?

const { describe, it, beforeEach } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, Jig, createRun, hookPay } = require('./helpers')

// ------------------------------------------------------------------------------------------------
// Code tests
// ------------------------------------------------------------------------------------------------

// These are set in 'should deploy to testnet' and used in 'should load from testnet'.
let deployedCodeLocation = null
let deployedCodeOwner = null

describe('Code', () => {
  const run = createRun()
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
      expect(B.origin).to.equal(undefined)
      expect(A.origin).to.equal(undefined)
      expect(B.location).to.equal(undefined)
      expect(A.location).to.equal(undefined)
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
      expect(A.origin).to.equal(undefined)
      expect(B.origin).to.equal(undefined)
      expect(C.origin).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(B.location).to.equal(undefined)
      expect(C.location).to.equal(undefined)
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
      hookPay(run, false)
      class A { }
      await expect(run.deploy(A)).to.be.rejected
      expect(A.origin).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(A.originMocknet).to.equal(undefined)
      expect(A.locationMocknet).to.equal(undefined)
    })

    it('should revert metadata for queued deploy failures', async () => {
      hookPay(run, true, false)
      class A { }
      class B { }
      run.deploy(A).catch(e => {})
      run.deploy(B).catch(e => {})
      expect(A.origin).to.equal(undefined)
      expect(B.origin).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(B.location).to.equal(undefined)
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

    it('should deploy to testnet', async () => {
      const run = createRun({ network: 'test' })
      class C { g () { return 1 } }
      class B { }
      class A extends B {
        f () { return 1 }

        createC () { return new C() }
      }
      A.deps = { B, C }
      await run.deploy(A)
      expect(A.origin.split('_')[0].length).to.equal(64)
      expect(B.origin.split('_')[0].length).to.equal(64)
      expect(C.origin.split('_')[0].length).to.equal(64)
      expect(A.originTestnet.split('_')[0].length).to.equal(64)
      expect(B.originTestnet.split('_')[0].length).to.equal(64)
      expect(C.originTestnet.split('_')[0].length).to.equal(64)
      expect(A.origin.endsWith('_o2')).to.equal(true)
      expect(B.origin.endsWith('_o1')).to.equal(true)
      expect(C.origin.endsWith('_o3')).to.equal(true)
      expect(A.originTestnet.endsWith('_o2')).to.equal(true)
      expect(B.originTestnet.endsWith('_o1')).to.equal(true)
      expect(C.originTestnet.endsWith('_o3')).to.equal(true)
      expect(A.location.split('_')[0].length).to.equal(64)
      expect(B.location.split('_')[0].length).to.equal(64)
      expect(C.location.split('_')[0].length).to.equal(64)
      expect(A.locationTestnet.split('_')[0].length).to.equal(64)
      expect(B.locationTestnet.split('_')[0].length).to.equal(64)
      expect(C.locationTestnet.split('_')[0].length).to.equal(64)
      expect(A.location.endsWith('_o2')).to.equal(true)
      expect(B.location.endsWith('_o1')).to.equal(true)
      expect(C.location.endsWith('_o3')).to.equal(true)
      expect(A.locationTestnet.endsWith('_o2')).to.equal(true)
      expect(B.locationTestnet.endsWith('_o1')).to.equal(true)
      expect(C.locationTestnet.endsWith('_o3')).to.equal(true)
      deployedCodeLocation = A.originTestnet
      deployedCodeOwner = A.ownerTestnet
    }).timeout(30000)

    it('should support presets', async () => {
      const run = createRun({ network: 'test' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      const run2 = createRun({ network: 'test' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).to.equal(A.originTestnet)
      expect(A.location).to.equal(A.locationTestnet)
      expect(location).to.equal(A.locationTestnet)
    }).timeout(30000)

    it('should support origin-only presets', async () => {
      const run = createRun({ network: 'main' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      const run2 = createRun({ network: 'main' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).to.equal(A.originMainnet)
      expect(A.location).to.equal(A.originMainnet)
      expect(location).to.equal(A.locationMainnet)
    }).timeout(30000)

    it('should support location-only presets', async () => {
      const run = createRun({ network: 'test' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      delete A.originTestnet
      const run2 = createRun({ network: 'test' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).to.equal(undefined)
      expect(A.location).to.equal(A.locationTestnet)
      expect(location).to.equal(A.locationTestnet)
    }).timeout(30000)
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
      const run2 = createRun({ blockchain: run.blockchain })
      const A3 = await run2.load(A.origin)
      expect(A2).to.equal(A3)
    })

    it('should load from mockchain when uncached', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const A3 = await run2.load(A.origin)
      expect(A2.owner).to.equal(run.owner.address)
      expect(A2.owner).to.equal(A2.ownerMocknet)
      expect(A3.owner).to.equal(A2.owner)
    })

    it('should load from testnet', async () => {
      const run = createRun({ network: 'test' })
      const A = await run.load(deployedCodeLocation)
      expect(A.origin).to.equal(deployedCodeLocation)
      expect(A.location).to.equal(deployedCodeLocation)
      expect(A.originTestnet).to.equal(deployedCodeLocation)
      expect(A.locationTestnet).to.equal(deployedCodeLocation)
      expect(A.owner).to.equal(deployedCodeOwner)
      expect(A.ownerTestnet).to.equal(deployedCodeOwner)
      expect(new A().f()).to.equal(1)
      expect(new A().createC().g()).to.equal(1)
    }).timeout(30000)

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
      const run2 = createRun({ blockchain: run.blockchain })
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
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.load(C.location)
    })
  })

  describe('static props', () => {
    it('should support circular props', async () => {
      class A extends Jig { }
      class B extends Jig { }
      A.B = B
      B.A = A
      await run.deploy(A)
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const A2 = await run2.load(A.location)
      const B2 = await run2.load(B.location)
      expect(A2.B).to.equal(B2)
      expect(B2.A).to.equal(A2)
    })

    it('should correctly deploy then load static properties', async () => {
      // TODO: Arbitrary code, support, maps, sets, circular, anonymous class
      class B { }
      class A extends B { }
      class J extends Jig {}
      class K extends Jig {}
      class C { }
      A.deps = { C }
      A.n = 1
      A.s = 'a'
      A.a = [1, 2, 3]
      A.b = true
      A.x = null
      A.o = { m: 1, n: '2' }
      A.j = new J()
      A.k = [new K()]
      class D { }
      A.D = D
      A.E = class E { }
      A.F = { R: class R { } }
      A.Self = A
      A.G = function g () { return 1 }
      // A.anonymousClass = class {}
      // A.anonymousFunction = function () {}
      // A.anonymousLambda = () => {}
      await run.deploy(A)
      expect(D.origin.length > 66 && D.location.length > 66).to.equal(true)
      expect(A.E.origin.length > 66 && A.E.location.length > 66).to.equal(true)
      expect(A.F.R.origin.length > 66 && A.F.R.location.length > 66).to.equal(true)
      const run2 = createRun({ blockchain: run.blockchain })
      const checkAllProperties = async T => {
        expect(T.n).to.equal(A.n)
        expect(T.s).to.equal(A.s)
        expect(T.a).to.deep.equal(A.a)
        expect(T.b).to.equal(A.b)
        expect(T.x).to.equal(A.x)
        expect(T.o).to.deep.equal(A.o)
        expect(T.j.origin).to.equal(A.j.origin)
        expect(T.j.location).to.equal(A.j.location)
        expect(T.k[0].origin).to.equal(A.k[0].origin)
        expect(T.k[0].location).to.equal(A.k[0].location)
        const D2 = await run2.load(A.D.origin)
        expect(T.D).to.equal(D2)
        const E2 = await run2.load(A.E.origin)
        expect(T.E).to.equal(E2)
        const R2 = await run2.load(A.F.R.origin)
        expect(T.F.R).to.equal(R2)
        const C2 = await run2.load(C.origin)
        expect(T.deps).to.deep.equal({ C: C2 })
        expect(T.Self).to.equal(T)
        const G2 = await run2.load(A.G.origin)
        expect(T.G).to.equal(G2)
        // expect(T.anonymousClass).to.equal(await run2.load(A.anonymousClass.origin))
        // expect(T.anonymousFunction).to.equal(await run2.load(A.anonymousFunction.origin))
        // expect(T.anonymousLambda).to.equal(await run2.load(A.anonymousLambda.origin))
      }
      await checkAllProperties(await run2.load(A.origin))
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

    it('should throw if unpackable', async () => {
      class A { }
      A.date = new Date()
      await expect(run.deploy(A)).to.be.rejectedWith('A static property of A is not supported')
      class B { }
      B.Math = Math
      await expect(run.deploy(B)).to.be.rejectedWith('A static property of B is not supported')
      class C { }
      C.weakSet = new WeakSet()
      await expect(run.deploy(C)).to.be.rejectedWith('A static property of C is not supported')
    })
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
      const run2 = createRun({ blockchain: run.blockchain })
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
    it('should support activating different network', async () => {
      if (Run.instance) Run.instance.deactivate()
      const run = createRun() // Create a new run to have a new code cache
      class A { }
      await run.deploy(A)
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationMocknet)
      expect(A.owner).to.equal(run.owner.address)
      expect(A.ownerMocknet).to.equal(run.owner.address)
      const run2 = createRun({ network: 'test' })
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
      expect(run.code.installs.size).to.equal(TEST_MODE === 'cover' ? 7 : 8)
    }).timeout(30000)

    it('should set correct owner for different networks', async () => {
      class A { }
      class B extends Jig { init () { if (this.owner !== A.owner) throw new Error() } }
      B.deps = { A }
      for (const network of ['test', 'mock']) {
        const run = createRun({ network })
        run.transaction.begin()
        run.deploy(A)
        run.deploy(B)
        run.transaction.end()
        await run.sync()
        const b = new B()
        await b.sync()
        run.deactivate()
        const run2 = createRun({ network, owner: run.owner.privkey })
        await run2.sync()
      }
    }).timeout(30000)
  })
})

// ------------------------------------------------------------------------------------------------
