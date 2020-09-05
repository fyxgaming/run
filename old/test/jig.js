/**
 * jig.js
 *
 * Tests for lib/kernel/jig.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { stub } = require('sinon')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Jig tests
// ------------------------------------------------------------------------------------------------

const createHookedRun = () => hookStoreAction(new Run())

describe('Jig', () => {
  afterEach(() => Run.instance && Run.instance.deactivate())

  describe('misc', () => {
    it('should serialize complex self-reference', async () => {
      // This test came from Cryptofights
      const run = new Run({ network: 'mock' })
      class f { }
      run.deploy(f)
      class A extends Jig {
        init (f) {
          this.f = f
          this.b = new B()
        }
      }
      class B extends Jig {
        init () { this.x = caller }
      }
      A.deps = { B }
      const a = new A(f)
      await a.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      await a2.sync()
      // Simulates a console.log, that would throw in the past
      Object.keys(a2.f)
    })

    it('should support custom toJSON method', () => {
      createHookedRun()
      class A extends Jig { toJSON () { return [1, 2, 3] } }
      const a = new A()
      expect(JSON.stringify(a)).to.equal('[1,2,3]')
      expectAction(a, 'init', [], [], [a], [])
    })

    it('should support $ properties and args', () => {
      createHookedRun()
      class A extends Jig {
        init () { this.o = { $class: 'undefined' } }
        f () { this.$ref = '123' }
        g (x) { this.x = x }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f()
      expectAction(a, 'f', [], [a], [a], [])
      a.g({ $undef: 1 })
      expectAction(a, 'g', [{ $undef: 1 }], [a], [a], [])
    })

    it('should be unusable after deploy fails', async () => {
      const run = createHookedRun()
      const oldPay = run.purse.pay
      run.purse.pay = async txhex => txhex
      class A extends Jig {
        init () { this.n = 1 }

        f () {}
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await expect(a.sync()).to.be.rejected
      expect(() => a.origin).to.throw()
      expect(() => a.n).to.throw()
      expect(() => Reflect.ownKeys(a)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
      try {
        console.log(a.n)
      } catch (e) {
        expect(e.toString().startsWith('Error: Deploy failed')).to.equal(true)
        expect(e.toString().indexOf('Error: Broadcast failed: tx has no inputs')).not.to.equal(-1)
      } finally {
        run.purse.pay = oldPay
      }
    })

    it('should throw if transaction is unpaid', async () => {
      const run = createHookedRun()
      class Store extends Jig { set (x) { this.x = x } }
      const a = new Store()
      await a.sync()
      const oldPay = run.purse.pay
      run.purse.pay = async txhex => txhex
      const b = new Store()
      // test when just init, no inputs
      expectAction(b, 'init', [], [], [b], [])
      await expect(run.sync()).to.be.rejectedWith('tx has no inputs')
      // test with a spend, pre-existing inputs
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
      await expect(run.sync()).to.be.rejectedWith('insufficient priority')
      run.purse.pay = oldPay
    })

    it('should throw if already spent', async () => {
      const run = createHookedRun()
      class Store extends Jig { set (x) { this.x = x } }
      const a = new Store()
      a.set(1)
      await a.sync()
      const a2 = await run.load(a.origin)
      a2.set(2)
      await expect(a2.sync()).to.be.rejectedWith('[jig Store] was spent in another transaction')
    })

    it('should throw if owner signature is missing', async () => {
      const run = createHookedRun()
      class A extends Jig {
        init () { this.n = 1 }

        f () { this.n = 2 }
      }
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      const oldSign = run.owner.sign
      run.owner.sign = async (tx) => { return tx }
      a.f()
      await expect(a.sync()).to.be.rejectedWith('Missing signature for A')
      run.owner.sign = oldSign
    })

    it('should pass reads and writes in correct order', async () => {
      createHookedRun()
      class B extends Jig {
        init (n) { this.n = n }

        inc () { this.n += 1 }
      }
      class A extends Jig {
        add (arr) {
          arr[1].inc()
          arr[0].inc()
          this.n = arr.reduce((s, t) => s + t.n, 0)
          return [new B(1), new B(2)]
        }
      }
      A.deps = { B }
      const b = new B(1)
      expectAction(b, 'init', [1], [], [b], [])
      const b2 = new B(2)
      expectAction(b2, 'init', [2], [], [b2], [])
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const [b3, b4] = a.add([b, b2])
      expectAction(a, 'add', [[b, b2]], [a, b2, b], [a, b2, b, b3, b4], [b2, b])
    })

    it('should detect uncaught errors', async () => {
      const run = createHookedRun()
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      const oldBroadcast = run.blockchain.broadcast
      run.blockchain.broadcast = async (tx) => { throw new Error() }
      expect(a.n).to.equal(undefined)
      a.f()
      expectAction(a, 'f', [], [a], [a], [])
      expect(a.n).to.equal(1)
      await new Promise(resolve => {
        setTimeout(() => {
          let completed = false
          try { a.origin } catch (e) { completed = true } // eslint-disable-line
          if (completed) {
            run.blockchain.broadcast = oldBroadcast
            expect(() => a.origin).to.throw('A previous update failed')
            expect(() => a.location).to.throw('A previous update failed')
            expect(() => a.owner).to.throw('A previous update failed')
            expect(() => a.n).to.throw('A previous update failed')
            expect(() => a.f()).to.throw('A previous update failed')
            resolve()
          }
        }, 1)
      })
    })

    it('should use SafeSet', async () => {
      const run = createHookedRun()
      class B extends Jig {}
      class A extends Jig {
        init () { this.set = new Set() }
        add (x) { this.set.add(x) }
      }
      const a = new A()
      const b = new B()
      await run.sync()
      const b2 = await run.load(b.location)
      a.add(b)
      a.add(b2)
      expect(a.set.size).to.equal(1)
      await run.sync()
      await run.load(a.location)
      run.cache.clear()
      await run.load(a.location)
    })

    it('should use SafeMap', async () => {
      const run = createHookedRun()
      class B extends Jig {}
      class A extends Jig {
        init () { this.map = new Map() }
        set (x, y) { this.map.set(x, y) }
      }
      const a = new A()
      await a.sync()
      const b = new B()
      await b.sync()
      const b2 = await run.load(b.location)
      a.set(b, 1)
      a.set(b2, 2)
      expect(a.map.size).to.equal(1)
      await run.sync()
      await run.load(a.location)
      run.cache.clear()
      await run.load(a.location)
    })

    it('should support arbitrary objects', async () => {
      const run = createHookedRun()
      class Store extends Jig { set (x) { this.x = x } }
      const store = new Store()
      class Dragon { }
      store.set(new Dragon())
      await store.sync()
      expect(!!Dragon.location).to.equal(true)
      await run.load(store.location)
      run.cache.clear()
      await run.load(store.location)
    })

    it('should support circular objects', async () => {
      const run = createHookedRun()
      class A extends Jig {
        init () {
          this.x = []
          this.x.push(this.x)
        }
      }
      const a = new A()
      await a.sync()
      await run.load(a.location)
      run.cache.clear()
      await run.load(a.location)
    })
  })

  describe('mempool chain', () => {
    it('should support long mempool chain for purse', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      for (let i = 0; i < 100; i++) { new A() } // eslint-disable-line
      await run.sync()
    })

    it.skip('should support long mempool chain for jig', async () => {
      createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      for (let i = 0; i < 100; i++) {
        a.set(i)
        await a.sync()
      }
    })

    it.skip('should support multiple jigs with different length chains', async () => {
      // TODO
    })
  })

  describe('toString', () => {
    it('should return a default value', () => {
      createHookedRun()
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.toString()).to.equal('[jig A]')
    })

    it('should support overriding toString', () => {
      createHookedRun()
      class A extends Jig { toString () { return 'hello' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.toString()).to.equal('hello')
    })
  })

  describe('origin', () => {
    it('throw if read origin before sync', async () => {
      createHookedRun()
      class A extends Jig { f () { this.origin2 = this.origin }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.origin).to.throw('sync() required before reading origin')
      expect(() => a.f()).to.throw('sync() required before reading origin')
      await a.sync()
      expect(() => a.origin).not.to.throw()
      expect(() => a.f()).not.to.throw()
    })

    it('should support reading internally after sync', async () => {
      createHookedRun()
      class A extends Jig { f () { this.origin2 = this.origin }}
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      a.f()
      expectAction(a, 'f', [], [a], [a], [])
    })

    it('should throw if delete origin', () => {
      createHookedRun()
      class A extends Jig { f () { delete this.origin }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.origin }).to.throw('must not delete origin')
      expectNoAction()
      expect(() => a.f()).to.throw('must not delete origin')
      expectNoAction()
    })

    it('should throw if set origin', () => {
      createHookedRun()
      class A extends Jig { f () { this.origin = '123' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.origin = '123' }).to.throw('must not set origin')
      expectNoAction()
      expect(() => a.f()).to.throw('must not set origin')
      expectNoAction()
    })

    it('should throw if origin method exists', () => {
      createHookedRun()
      class A extends Jig { origin () {} }
      expect(() => new A()).to.throw('must not override origin')
      expectNoAction()
    })
  })

  describe('location', () => {
    it('should throw if read before sync', async () => {
      createHookedRun()
      class A extends Jig {}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.location).to.throw('sync() required before reading location')
      await a.sync()
      expect(() => a.location).not.to.throw()
    })

    it('should support reading internally after sync', async () => {
      createHookedRun()
      class A extends Jig { f () { this.location2 = this.location }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await a.sync()
      a.f()
      expectAction(a, 'f', [], [a], [a], [a])
      expect(a.location2).to.equal(a.origin)
      expect(() => a.f()).to.throw('sync() required before reading location')
      expectNoAction()
      await a.sync()
      const secondLocation = a.location
      a.f()
      expectAction(a, 'f', [], [a], [a], [a])
      expect(a.location2).to.equal(secondLocation)
    })

    // TODO: This is probably possible to support in many cases
    it.skip('should support reading location quickly', async () => {
      createHookedRun()
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      expect(a.location).not.to.throw()
      a.f()
      expect(a.location).not.to.throw()
    })

    it('should throw if delete location', () => {
      createHookedRun()
      class A extends Jig { f () { delete this.location }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.location }).to.throw('must not delete location')
      expectNoAction()
      expect(() => a.f()).to.throw('must not delete location')
      expectNoAction()
    })

    it('should throw if set location', () => {
      createHookedRun()
      class A extends Jig { f () { this.location = '123' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.location = '123' }).to.throw('must not set location')
      expectNoAction()
      expect(() => a.f()).to.throw('must not set location')
      expectNoAction()
    })

    it('should throw if location method exists', () => {
      createHookedRun()
      class A extends Jig { location () {} }
      expect(() => new A()).to.throw('must not override location')
      expectNoAction()
    })
  })

  describe('load', () => {
    it('should load single jig', async () => {
      const run = createHookedRun()
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      a.f([2])
      expectAction(a, 'f', [[2]], [a], [a], [])
      a.f({ n: 3 })
      expectAction(a, 'f', [{ n: 3 }], [a], [a], [])
      await a.sync()
      const a2 = await run.load(a.location)
      expect(a2.n.n).to.equal(3)
    })

    it('should load older state', async () => {
      const run = createHookedRun()
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      await a.sync()
      const location1 = a.location
      a.f(2)
      expectAction(a, 'f', [2], [a], [a], [])
      await a.sync()
      const a2 = await run.load(location1)
      expect(a2.n).to.equal(1)
    })

    it('should throw if location is bad', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      await expect(run.load(a.location.slice(0, 64) + '_o0')).to.be.rejected
      await expect(run.load(a.location.slice(0, 64) + '_o3')).to.be.rejected
    })

    it('should support loading jig with multiple updates', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig {
        init () { this.a = new A() }

        set (n) { this.n = n; this.a.set(n) }
      }
      B.deps = { A }
      const b = new B()
      expectAction(b, 'init', [], [], [b, b.a], [])
      b.set(2)
      expectAction(b, 'set', [2], [b, b.a], [b, b.a], [b])
      await run.sync()
      const b2 = await run.load(b.location)
      const a2 = await run.load(b.a.location)
      expect(b2.n).to.equal(2)
      expect(a2.n).to.equal(2)
    })

    it('should support loading jigs that updated other jigs', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig { set (n, a) { a.set(n) } }
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.set(2, a)
      expectAction(b, 'set', [2, a], [b, a], [b, a], [])
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should support arguments with different instances of the same jig location', async () => {
      const run = createHookedRun()
      class Num extends Jig { init (n) { this.n = n }}
      const a = new Num(10)
      await a.sync()
      expectAction(a, 'init', [10], [], [a], [])
      const a2 = await run.load(a.location)
      const a3 = await run.load(a.location)
      class Sum extends Jig { init (x, y) { this.n = x.n + y.n }}
      const sum = new Sum(a2, a3)
      expectAction(sum, 'init', [a2, a3], [], [sum], [a2, a3])
      await run.sync()
      expect(sum.n).to.equal(20)
    })

    it('should throw if pass different locations of same jig as arguments', async () => {
      const run = createHookedRun()
      class A extends Jig { f (n) { this.n = n; return this }}
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      await a.f(1).sync()
      expectAction(a, 'f', [1], [a], [a], [])
      const a2 = await run.load(a.location)
      await a2.f(2).sync()
      expectAction(a2, 'f', [2], [a2], [a2], [])
      class B extends Jig { init (x, y) { this.n = x.n + y.n }}
      expect(() => new B(a, a2)).to.throw()
    })

    it('should support loading instances of extended classes', async () => {
      createHookedRun()
      class A extends Jig { }
      class B extends A { }
      const b = new B()
      await b.sync()
      expectAction(b, 'init', [], [], [b], [])
      const run2 = new Run()
      await run2.load(b.location)
    })

    it('should support reading jigs as arguments', async () => {
      const run = createHookedRun()
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { init (a) { this.n = a.n } }
      const a = new A(1)
      await a.sync()
      expectAction(a, 'init', [1], [], [a], [])
      const b = new B(a)
      await b.sync()
      expectAction(b, 'init', [a], [], [b], [a])
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(1)
    })

    it('should add inner jigs to reads', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig {
        init (a) { this.a = a }

        apply () { this.n = this.a.n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
      const b = new B(a)
      await b.sync()
      expectAction(b, 'init', [a], [], [b], [])
      a.set(2)
      expectAction(a, 'set', [2], [a], [a], [])
      b.apply()
      expectAction(b, 'apply', [], [b], [b], [b, a])
      expect(b.n).to.equal(2)
      await b.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(2)
    })
  })

  describe('cache', () => {
    it('should cache local updates', async () => {
      const run = createHookedRun()
      class A extends Jig {
        init () { this.undef = undefined }

        set (n) { this.n = n }
      }
      const a = new A()
      for (let i = 0; i < 10; i++) {
        a.set(i)
      }
      const b = new A()
      run.transaction.begin()
      const b2 = new A()
      a.set({ b, b2, A })
      run.transaction.end()
      b.set(1)
      await a.sync()

      const run2 = new Run({ cache: new Run.LocalCache() })
      const t0 = Date.now()
      await run2.load(a.location)
      const t1 = Date.now()
      await run2.load(a.location)
      const t2 = Date.now()
      expect((t1 - t0) / (t2 - t1) > 3).to.equal(true) // Load without cache is 3x slower
    })
  })

  describe('class props', () => {
    it('should be able to access class properties from instances', async () => {
      createHookedRun()
      class A extends Jig {}
      A.n = 1
      const a = new A()
      await a.sync()
      const run2 = new Run()
      const a2 = await run2.load(a.location)
      expect(a2.constructor.n).to.equal(1)
    })

    it('should support reads of class properties from inside jig methods', () => {
      createHookedRun()
      class A extends Jig { f () { this.n = this.constructor.n }}
      A.n = 1
      const a = new A()
      a.f()
      expect(a.n).to.equal(1)
    })

    it('should support reading properties on preset classes', () => {
      createHookedRun()
      class B extends Jig { }
      B.originMocknet = B.locationMocknet = '123'
      B.ownerMocknet = 'abc'
      B.n = 1
      class A extends Jig { init () { this.n = B.n }}
      A.originMocknet = A.locationMocknet = '456'
      A.ownerMocknet = 'def'
      A.deps = { B }
      const a = new A()
      expect(a.n).to.equal(1)
    })
  })

  describe('batch', () => {
    it('should support load of batch with multiple instantiations', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      run.transaction.begin()
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      run.transaction.end()
      await a.sync()
      const run2 = new Run()
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      expect(a.origin.slice(0, 64)).to.equal(b.origin.slice(0, 64))
      expect(a.origin).to.equal(a2.origin)
      expect(b.origin).to.equal(b2.origin)
    })

    it('should support load of batch with multiple jig updates', async () => {
      const run = createHookedRun()
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      run.transaction.begin()
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      b.f(2)
      expectAction(b, 'f', [2], [b], [b], [])
      run.transaction.end()
      await a.sync()
      const run2 = new Run()
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      expect(a2.location.slice(0, 64)).to.equal(b2.location.slice(0, 64))
      expect(a2.n).to.equal(1)
      expect(b2.n).to.equal(2)
    })

    it('should support load of batch with self-references', async () => {
      const run = createHookedRun()
      class A extends Jig { f (a) { this.n = a } }
      run.transaction.begin()
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(a)
      expectAction(a, 'f', [a], [a], [a], [])
      run.transaction.end()
      await a.sync()
      const run2 = new Run()
      const a2 = await run2.load(a.location)
      expect(a.origin).to.equal(a2.origin)
      expect(a2).to.deep.equal(a2.n)
      expect(a.n).to.deep.equal(a2.n)
      expect(a.owner).to.equal(a2.owner)
    })

    it('should support load of batch with circularly referenced jigs', async () => {
      const run = createHookedRun()
      class S extends Jig { set (x) { this.x = x } }
      run.transaction.begin()
      const a = new S()
      const b = new S()
      a.set(b)
      b.set(a)
      run.transaction.end()
      await run.sync()
      await run.load(a.location)
      await run.load(b.location)
    })

    it('should roll back all jigs from batch failures', async () => {
      const run = createHookedRun()
      stub(run.purse, 'pay').callThrough().onCall(3).returns()
      class A extends Jig { f (n) { this.n = n } }
      class B extends Jig { f (a, n) { a.f(a.n + 1); this.n = n } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      run.transaction.begin()
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      b.f(a, 20)
      expectAction(b, 'f', [a, 20], [b, a], [b, a], [a])
      run.transaction.end()
      run.transaction.begin()
      a.f(10)
      expectAction(a, 'f', [10], [a], [a], [])
      b.f(a, 30)
      expectAction(b, 'f', [a, 30], [b, a], [b, a], [a])
      run.transaction.end()
      expect(a.n).to.equal(11)
      expect(b.n).to.equal(30)
      await expect(a.sync()).to.be.rejected
      expect(a.n).to.equal(2)
      expect(b.n).to.equal(20)
    })
  })

  describe('private', () => {
    it('should handle has of private property', () => {
      createHookedRun()
      class J extends Jig {
        init () { this._x = 1 }

        has (a, x) { return x in a }
      }
      class K extends J { }
      class L extends Jig { has (a, x) { return x in a } }
      expect('_x' in new J()).to.equal(true)
      expect(new K().has(new K(), '_x')).to.equal(true)
      expect(() => new L().has(new J(), '_x')).to.throw('cannot check _x because it is private')
      expect(() => new K().has(new J(), '_x')).to.throw('cannot check _x because it is private')
      expect(() => new J().has(new K(), '_x')).to.throw('cannot check _x because it is private')
    })

    it('should handle get of private property', () => {
      createHookedRun()
      class J extends Jig {
        init () { this._x = 1 }

        get (a, x) { return a[x] }
      }
      class K extends J { }
      class L extends Jig { get (a, x) { return a[x] } }
      expect(new J()._x).to.equal(1)
      expect(new K().get(new K(), '_x')).to.equal(1)
      expect(() => new L().get(new J(), '_x')).to.throw('cannot get _x because it is private')
      expect(() => new K().get(new J(), '_x')).to.throw('cannot get _x because it is private')
      expect(() => new J().get(new K(), '_x')).to.throw('cannot get _x because it is private')
    })

    it('should handle private method', () => {
      createHookedRun()
      class J extends Jig {
        g () { return this._f() }

        _f () { return 1 }

        call (a, x) { return a[x]() }
      }
      class K extends J { }
      class L extends Jig { call (a, x) { return a[x]() } }
      expect(new J().g()).to.equal(1)
      expect(new K().call(new K(), '_f')).to.equal(1)
      expect(new L().call(new J(), 'g')).to.equal(1)
      expect(() => new J()._f()).to.throw('cannot call _f because it is private')
      expect(() => new L().call(new J(), '_f')).to.throw('cannot get _f because it is private')
      expect(() => new K().call(new J(), '_f')).to.throw('cannot get _f because it is private')
      expect(() => new J().call(new K(), '_f')).to.throw('cannot get _f because it is private')
    })

    it('should not return private properties in ownKeys', () => {
      createHookedRun()
      class J extends Jig {
        init () { this._x = 1 }

        ownKeys (a) { return Reflect.ownKeys(a) }
      }
      class K extends J { }
      class L extends Jig { ownKeys (a) { return Reflect.ownKeys(a) } }
      expect(Reflect.ownKeys(new J()).includes('_x')).to.equal(true)
      expect(new K().ownKeys(new K()).includes('_x')).to.equal(true)
      expect(new L().ownKeys(new J()).includes('_x')).to.equal(false)
      expect(new K().ownKeys(new J()).includes('_x')).to.equal(false)
      expect(new J().ownKeys(new K()).includes('_x')).to.equal(false)
    })
  })

  describe('caller', () => {
    it('should be null when called externally', async () => {
      const run = createHookedRun()
      class A extends Jig {
        init () { expect(caller).toBeNull() }
        f () { expect(caller).toBeNull() }
      }
      A.deps = { expect: Run.expect }
      const a = new A()
      a.f()
      await run.sync()
      await run.load(a.location)
    })

    it('should be the calling jig when called from another jig', async () => {
      const run = createHookedRun()
      class Parent extends Jig {
        init () { this.child = new Child(this) }
        f () { this.self = this.child.f(this) }
      }
      class Child extends Jig {
        init (parent) { expect(caller).toBe(parent) }
        f (parent) { expect(caller).toBe(parent); return parent }
      }
      Parent.deps = { Child }
      Child.deps = { expect: Run.expect }
      const parent = new Parent()
      parent.f()
      expect(parent.self).to.equal(parent)
      await run.sync()
      await run.load(parent.location)
    })

    it('should support caller being this', async () => {
      const run = createHookedRun()
      class A extends Jig {
        init () { this.f() }
        f () { this.caller = caller }
      }
      const a = new A()
      await a.sync()
      expect(a.caller).to.equal(a)
      const a2 = await run.load(a.location)
      expect(a2.caller).to.equal(a2)
    })

    it('should support calling a method on the caller', async () => {
      const run = createHookedRun()
      class A extends Jig {
        set (n) { this.n = n }
        apply (b) { b.apply() }
      }
      class B extends Jig { apply () { caller.set(1) } }
      const a = new A()
      const b = new B()
      a.apply(b)
      expect(a.n).to.equal(1)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)
    })

    it('should allow local variables named caller', async () => {
      const run = createHookedRun()
      class A extends Jig { init () { const caller = 2; this.n = caller } }
      const a = new A()
      await a.sync()
      expect(a.n).to.equal(2)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should allow dependencies named caller', async () => {
      const run = createHookedRun()
      function caller () { return 2 }
      class A extends Jig { init () { this.n = caller() } }
      A.deps = { caller }
      const a = new A()
      await a.sync()
      expect(a.n).to.equal(2)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should throw if set caller', () => {
      createHookedRun()
      class A extends Jig { init () { caller = 1 } } // eslint-disable-line
      expect(() => new A()).to.throw('Must not set caller')
    })
  })

  describe('internal properties and methods', () => {
    it('should support calling a read-only method on an internal property from outside', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.obj.toString()).not.to.throw()
      expect(() => a.arr.indexOf(3)).not.to.throw()
      expect(() => a.buf.indexOf(2)).not.to.throw()
    })

    it('should support calling a read-only method on an internal property from another jig', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) {
          this.x = a.obj.toString()
          this.y = a.arr.indexOf(3)
          this.z = a.buf.indexOf(2)
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).not.to.throw()
    })

    it('should support calling a write method on an internal property from outside', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([3, 2, 1])
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.arr.push(1)).to.throw('internal method push may not be called to change state')
      expectNoAction()
      expect(() => a.buf.sort()).to.throw('internal method sort may not be called to change state')
      expectNoAction()
    })

    it('should support calling a write method on an internal property from another jig', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([3, 2, 1])
        }
      }
      class B extends Jig {
        f (a) { a.arr.push(1) }

        g (a) { a.buf.sort() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('internal method push may not be called to change state')
      expectNoAction()
      expect(() => b.g(a)).to.throw('internal method sort may not be called to change state')
      expectNoAction()
    })

    it('should support internal methods that do not require args to be serializable', () => {
      createHookedRun()
      class A extends Jig { init () { this.arr = [1, 2, 3] } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.arr.filter(x => x === 1)).not.to.throw()
      expect(() => a.arr.indexOf(Symbol.hasInstance)).not.to.throw()
    })

    it('should throw if save an internal property on another jig', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) { this.x = a.obj }

        g (a) { this.y = a.arr }

        h (a) { this.z = a.buf }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('[object Object] belongs to a different resource')
      expect(() => b.g(a)).to.throw('[object Array] belongs to a different resource')
      expect(() => b.h(a)).to.throw('[object Uint8Array] belongs to a different resource')
    })

    it('should throw if save an arbitrary object from another jig', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          class Blob { f () { return 2 } }
          this.blob = new Blob()
        }
      }
      class B extends Jig {
        set (a) { this.x = a.blob }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.set(a)).to.throw('[object Blob] belongs to a different resource')
    })

    it('should not throw if save a copy of an internal property on another jig', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) { this.x = Object.assign({}, a.obj) }

        g (a) { this.y = [...a.arr] }

        h (a) {
          this.z = new Uint8Array(a.buf)
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).not.to.throw()
      expect(() => b.g(a)).not.to.throw()
      expect(() => b.h(a)).not.to.throw()
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Test hooks
// ------------------------------------------------------------------------------------------------

let action = null

function hookStoreAction (run) {
  const oldAction = unmangle(run.transaction)._storeAction.bind(run.transaction)
  unmangle(run.transaction)._storeAction = (target, method, args, inputs, outputs, reads, before, after, proxies) => {
    oldAction(target, method, args, inputs, outputs, reads, before, after, proxies)
    target = proxies.get(target)
    inputs = new Set(Array.from(inputs).map(i => proxies.get(i)))
    outputs = new Set(Array.from(outputs).map(o => proxies.get(o)))
    reads = new Set(Array.from(reads).map(o => proxies.get(o)))
    action = { target, method, args, inputs, outputs, reads }
  }
  return run
}

function expectAction (target, method, args, inputs, outputs, reads) {
  expect(action.target).to.equal(target)
  expect(action.method).to.equal(method)
  expect(action.args).to.deep.equal(args)
  expect(action.inputs.size).to.equal(inputs.length)
  Array.from(action.inputs.values()).forEach((i, n) => expect(i).to.equal(inputs[n]))
  expect(action.outputs.size).to.equal(outputs.length)
  Array.from(action.outputs.values()).forEach((o, n) => expect(o).to.equal(outputs[n]))
  expect(action.reads.size).to.equal(reads.length)
  Array.from(action.reads.values()).forEach((x, n) => expect(x).to.equal(reads[n]))
  action = null
}

function expectNoAction () {
  if (action) throw new Error('Unexpected transaction')
}

// ------------------------------------------------------------------------------------------------
