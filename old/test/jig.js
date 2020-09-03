/**
 * jig.js
 *
 * Tests for lib/kernel/jig.js
 */

const { describe, it, afterEach, beforeEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { stub } = require('sinon')
const { PrivateKey } = require('bsv')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const { Jig, Mockchain } = Run
const { UnimplementedError } = Run.errors

// ------------------------------------------------------------------------------------------------
// Jig tests
// ------------------------------------------------------------------------------------------------

const createHookedRun = () => hookStoreAction(new Run())

describe('Jig', () => {
  afterEach(() => Run.instance && Run.instance.deactivate())

  describe('instanceof', () => {
    it('should match class extensions', () => {
      createHookedRun()
      class A extends Jig { }
      class B extends A { }
      class C extends Jig { }
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      expect(b).to.be.instanceOf(A)
      expect(b).to.be.instanceOf(B)
      expect(b).to.be.instanceOf(Jig)
      expect(c).not.to.be.instanceOf(B)
      expect(c).to.be.instanceOf(Jig)
    })

    it('should not match non-instances', () => {
      createHookedRun()
      expect(new class { }()).not.to.be.instanceOf(Jig)
      expect(new class { }() instanceof Jig).to.equal(false)
    })

    it('should support searching owner for an uninstalled class', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      class B extends Jig { }
      const a = new A() // eslint-disable-line
      await a.sync()
      run.inventory.jigs.find(jig => jig instanceof B)
    })

    it('should match loaded instances', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      const a = new A()
      await run.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      expect(a2 instanceof A).to.equal(true)
    })

    it('should not match prototypes', () => {
      createHookedRun()
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.constructor.prototype instanceof Jig).to.equal(false)
      expect(Object.getPrototypeOf(a) instanceof Jig).to.equal(false)
    })
  })

  describe('init', () => {
    it('should throw if called externally', () => {
      createHookedRun()
      class A extends Jig { init (n) { this.n = n } }
      const a = new A(5)
      expectAction(a, 'init', [5], [], [a], [])
      expect(() => a.init(6)).to.throw()
      expectNoAction()
    })

    it('should throw if called internally', () => {
      createHookedRun()
      class A extends Jig {
        init (n) { this.n = n }

        f (n) { this.init(n) }
      }
      const a = new A(5)
      expectAction(a, 'init', [5], [], [a], [])
      expect(() => a.f(6)).to.throw()
      expectNoAction()
    })

    it('should throw if init returns a value', async () => {
      createHookedRun()
      class A extends Jig { init () { return {} }}
      expect(() => new A()).to.throw()
    })
  })

  describe('sync', () => {
    it('should set origins and locations on class and instance', async () => {
      createHookedRun()
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = await a.sync()
      expect(a).to.equal(a2)
      expect(A.origin.length).to.equal(67)
      expect(A.origin.endsWith('_o1')).to.equal(true)
      expect(A.location.length).to.equal(67)
      expect(A.location.endsWith('_o1')).to.equal(true)
      expect(a.origin.length).to.equal(67)
      expect(a.origin.endsWith('_o2')).to.equal(true)
      expect(a.location.length).to.equal(67)
      expect(a.location.endsWith('_o2')).to.equal(true)
    })

    it('should throw if called internally', () => {
      createHookedRun()
      class A extends Jig { init () { this.sync() } }
      class B extends Jig { f () { this.sync() } }
      expect(() => new A()).to.throw()
      expectNoAction()
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f()).to.throw()
      expectNoAction()
    })

    it('should throw if override sync', () => {
      createHookedRun()
      class A extends Jig { sync () { } }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should forward sync', async () => {
      const run = createHookedRun()
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await run.sync()
      const run2 = new Run({ owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      a2.set(1)
      a2.set(2)
      await a2.sync()
      run.activate()
      expect(a.x).to.equal(undefined)
      await a.sync()
      expect(a.x).to.equal(2)
    })

    it('should forward sync inner jigs', async () => {
      const run = createHookedRun()
      class Store extends Jig { set (x, y) { this[x] = y } }
      const a = new Store()
      expectAction(a, 'init', [], [], [a], [])
      const b = new Store()
      expectAction(b, 'init', [], [], [b], [])
      a.set('b', b)
      await run.sync()
      const run2 = new Run({ owner: run.owner.privkey })
      const b2 = await run2.load(b.location)
      b2.set('n', 1)
      await b2.sync()
      run.activate()
      expect(a.b.n).to.equal(undefined)
      await a.sync()
      expect(a.b.n).to.equal(1)
    })

    it('should forward sync circularly referenced jigs', async () => {
      const run = createHookedRun()
      class A extends Jig { setB (b) { this.b = b } }
      class B extends Jig { setA (a) { this.a = a } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      a.setB(b)
      await run.sync()
      const run2 = new Run({ owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      b2.setA(a2)
      await b2.sync()
      run.activate()
      expect(a.b.a).to.equal(undefined)
      await a.sync()
      expect(a.b.a.location).to.equal(a.location)
    })

    it('should support disabling forward sync', async () => {
      const run = createHookedRun()
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await run.sync()
      const run2 = new Run({ owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      a2.set(1)
      await a2.sync()
      run.activate()
      expect(a.x).to.equal(undefined)
      await a.sync({ forward: false })
      expect(a.x).to.equal(undefined)
    })

    it('should throw if forward sync is unsupported', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      const a = new A()
      await a.sync() // pending transactions must publish first
      run.blockchain.spends = async () => { throw new UnimplementedError('spends') }
      await expect(a.sync()).to.be.rejectedWith('Failed to forward sync jig')
    })

    it('should throw if attempt to update an old state', async () => {
      const run = createHookedRun()
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await run.sync()
      const run2 = new Run({ owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      a2.set(1)
      await a2.sync()
      run.activate()
      a.set(2)
      await expect(a.sync()).to.be.rejectedWith('txn-mempool-conflict')
      expect(a.x).to.equal(1)
    })

    it('should throw if spend tx does not exist', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      run.blockchain.spends = () => '123'
      await expect(a.sync()).to.be.rejectedWith('No such mempool or blockchain transaction')
    })

    it('should throw if spend is incorrect', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      await run.sync()
      run.blockchain.spends = () => b.location.slice(0, 64)
      await expect(a.sync()).to.be.rejectedWith('Blockchain returned an incorrect spend')
    })

    it('should not throw if sync jig updated by another', async () => {
      const run = createHookedRun()
      class A extends Jig {
        set (x) { this.x = x }
      }
      class B extends Jig {
        init (a) { this.a = a }
        setA (x) { this.a.set(x) }
      }
      const a = new A()
      const b = new B(a)
      b.setA(1)
      await run.sync()
      const a2 = await run.load(a.origin)
      await expect(a2.sync()).not.to.be.rejected
    })
  })

  describe('method', () => {
    it('should update basic jig', async () => {
      const run = createHookedRun()
      class Sword extends Jig {
        upgrade () { this.upgrades = (this.upgrades || 0) + 1 }
      }
      const sword = new Sword()
      await run.sync()
      sword.upgrade()
      await run.sync()
      expect(sword.upgrades).to.equal(1)
    })

    it('should support passing null in args', async () => {
      const run = createHookedRun()
      class Dragon extends Jig {
        init (lair) {
          this.lair = lair
        }
      }
      const dragon = new Dragon(null)
      await dragon.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const dragon2 = await run2.load(dragon.location)
      expect(dragon).to.deep.equal(dragon2)
    })

    it('should support swapping inner jigs', () => {
      createHookedRun()
      class A extends Jig {
        setX (a) { this.x = a }

        setY (a) { this.y = a }

        swapXY () { const t = this.x; this.x = this.y; this.y = t }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      const c = new A()
      expectAction(c, 'init', [], [], [c], [])
      a.setX(b)
      expectAction(a, 'setX', [b], [a], [a], [])
      a.setY(c)
      expectAction(a, 'setY', [c], [a], [a], [])
      a.swapXY()
      expectAction(a, 'swapXY', [], [a], [a], [a])
    })

    it('should restore old state if method throws', () => {
      createHookedRun()
      class Outer extends Jig { setN () { this.n = 1 } }
      class Inner extends Jig { setZ () { this.z = 1 } }
      class Revertable extends Jig {
        init () {
          this.n = 1
          this.arr = ['a', { b: 1 }]
          this.self = this
          this.inner = new Inner()
        }

        methodThatThrows (outer) {
          outer.setN()
          this.n = 2
          this.arr[1].b = 2
          this.arr.push(3)
          this.inner.setZ()
          throw new Error('an error')
        }
      }
      Revertable.deps = { Inner }
      const main = new Revertable()
      expectAction(main, 'init', [], [], [main, main.inner], [])
      const outer = new Outer()
      expectAction(outer, 'init', [], [], [outer], [])
      expect(() => main.methodThatThrows(outer)).to.throw()
      expectNoAction()
      expect(main.n).to.equal(1)
      expect(main.arr).to.deep.equal(['a', { b: 1 }])
      expect(main.self).to.equal(main)
      expect(main.inner.z).to.equal(undefined)
      expect(outer.n).to.equal(undefined)
    })

    it('should throw if swallow internal errors', () => {
      createHookedRun()
      class B extends Jig { init () { throw new Error('some error message') } }
      class A extends Jig { f () { try { return new B() } catch (e) { } } }
      A.deps = { B }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('internal errors must not be swallowed\n\nError: some error message')
      expectNoAction()
    })

    it('should support calling super method', async () => {
      createHookedRun()
      class A extends Jig { f () { this.a = true }}
      class B extends A { f () { super.f(); this.b = true }}
      class C extends B { f () { super.f(); this.c = true }}
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      c.f()
      expectAction(c, 'f', [], [c], [c], [])
      expect(c.a).to.equal(true)
      expect(c.b).to.equal(true)
      expect(c.c).to.equal(true)
    })

    it('should support calling static helpers', () => {
      createHookedRun()
      class Preconditions { static checkArgument (b) { if (!b) throw new Error() } }
      class A extends Jig { set (n) { $.checkArgument(n > 0); this.n = n } } // eslint-disable-line
      A.deps = { $: Preconditions }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.set(0)).to.throw()
      expectNoAction()
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
    })

    it('should throw if set a property directly on another jig in the call stack', () => {
      createHookedRun()
      class A extends Jig {
        setB (b) { this.b = b }

        g () { this.b.n = 1 }
      }
      class B extends Jig {
        setA (a) { this.a = a }

        f () { this.a.g() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      a.setB(b)
      expectAction(a, 'setB', [b], [a], [a], [])
      b.setA(a)
      expectAction(b, 'setA', [a], [b], [b], [])
      expect(() => b.f()).to.throw()
      expectNoAction()
    })

    it('should throw if update on different network', async () => {
      const run = createHookedRun()
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      await run.sync()
      const run2 = new Run({ blockchain: new Mockchain() })
      a.f()
      await expect(run2.sync()).to.be.rejectedWith('No such mempool or blockchain transaction')
    })

    it('should return host intrinsics to user', () => {
      createHookedRun()
      class A extends Jig {
        returnObject () { return {} }
        returnArray () { return [] }
        returnSet () { return new Set() }
        returnMap () { return new Map() }
        returnUint8Array () { return new Uint8Array() }
      }
      const a = new A()
      expect(a.returnObject().constructor).to.equal(Object)
      expect(a.returnArray().constructor).to.equal(Array)
      expect(a.returnSet().constructor).to.equal(Set)
      expect(a.returnMap().constructor).to.equal(Map)
      expect(a.returnUint8Array().constructor).to.equal(Uint8Array)
    })

    it.skip('should throw if async', async () => {
      createHookedRun()
      class A extends Jig {
        async f () {}
        g () { return new Promise((resolve, reject) => { }) }
      }
      const a = new A()
      expect(() => a.f()).to.throw('123')
      expect(() => a.g()).to.throw('123')
    })

    it.skip('should not be able to modify return values', async () => {
      createHookedRun()
      class A extends Jig {
        f () {
          const x = { }
          this.x = x
          return x
        }
      }
      const a = new A()
      expect(() => { a.f().n = 1 }).to.throw('123')
      class B extends Jig {
        f (a) { a.f().n = 1 }
      }
      const b = new B()
      expect(() => b.f(a)).to.throw('123')
    })
  })

  describe('arguments', () => {
    const run = createHookedRun()
    beforeEach(() => run.activate())

    async function testArgumentPass (...args) {
      class A extends Jig { f (...args) { this.args = args } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(...args)
      expectAction(a, 'f', args, [a], [a], [])
      await a.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(a.location)
      // TODO: Re-enable. Right now, proxy objects are always different. Infinite loop.
      // const a2 = ...
      // expect(a2.args).to.deep.equal(args)
    }

    it('should pass nothing', () => testArgumentPass())
    it('should pass positive zero', () => testArgumentPass(0))
    it('should pass negative zero', () => testArgumentPass(-0))
    it('should pass integer', () => testArgumentPass(1))
    it('should pass negative float', () => testArgumentPass(-1.5))
    it('should pass min integer', () => testArgumentPass(Number.MIN_SAFE_INTEGER))
    it('should pass max value', () => testArgumentPass(Number.MAX_VALUE))
    it('should pass NaN', () => testArgumentPass(NaN))
    it('should pass Infinity', () => testArgumentPass(Infinity))
    it('should pass true', () => testArgumentPass(true))
    it('should pass false', () => testArgumentPass(false))
    it('should pass empty string', () => testArgumentPass(''))
    it('should pass normal strings', () => testArgumentPass('abc'))
    it('should pass multiple', () => testArgumentPass(1, true, 'a', [], {}, new Set(), new Map()))
    it('should pass objects', () => testArgumentPass({ n: 1, m: [], k: { l: new Set([1]) } }))
    it('should pass set', () => testArgumentPass(new Set(['a', {}, null])))
    it('should pass map', () => testArgumentPass(new Map([[0, 0]])))
    const o = { }
    o.o = o
    it('should pass circular reference', () => testArgumentPass(o))
    it('should pass arbitrary object', () => testArgumentPass(new (class Blob {})()))
    it('should pass class', () => testArgumentPass(class Dragon extends Jig { }))
    it('should pass anonymous function', () => testArgumentPass(() => {}))
    it('should pass jig', () => testArgumentPass(new (class A extends Jig {})()))

    function testArgumentFail (...args) {
      createHookedRun()
      class A extends Jig { f (...args) { this.args = args } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f(Symbol.hasInstance)).to.throw('Cannot serialize Symbol(Symbol.hasInstance)')
    }

    it('should throw if pass symbol', () => testArgumentFail(Symbol.hasInstance))
    it('should throw if pass built-in intrinsic', () => testArgumentFail(Math))
    it('should throw if pass date', () => testArgumentFail(new Date()))

    it('should dedup resources passed in set', async () => {
      const run = createHookedRun()
      class A extends Jig { f (...args) { this.args = args } }
      const b1 = new A()
      await run.sync()
      const b2 = await run.load(b1.location)
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const set = new Set([b1, b2])
      expect(set.size).to.equal(2)
      a.f(set)
      expectAction(a, 'f', [set], [a], [a], [b1, b2])
      expect(a.args[0].size).to.equal(1)
      await a.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      expect(a2.args[0].size).to.equal(1)
    })

    it('should support changing args in method', () => {
      createHookedRun()
      class A extends Jig { f (arr, obj) { arr.pop(); obj.n = 1; this.n = 0 } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f([1], { n: 0 })
      expectAction(a, 'f', [[1], { n: 0 }], [a], [a], [])
    })

    it('should allow checking jig constructors', async () => {
      const run = createHookedRun()
      class A extends Jig { init (b) { this.test = b.constructor === B } }
      class B extends Jig { init () { this.x = A.owner } }
      A.deps = { B }
      B.deps = { A }
      await run.deploy(A)
      await run.deploy(B)
      const b = new B()
      const a = new A(b)
      expect(b.x).to.equal(run.owner.address)
      expect(a.test).to.equal(true)
      await run.sync()
      run.deactivate()
      const run2 = new Run({ owner: run.owner.privkey })
      await run2.sync()
    })
  })

  describe('get', () => {
    it('should not publish transaction if no changes', () => {
      createHookedRun()
      class B extends Jig {
        set (n) { this.n = n }

        get (n) { return this.n + n }
      }
      class A extends B {
        init () { this.b = new B(); this.b.set(1) }

        get (n) { return this.b.get(4) + super.get(n) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a, a.b], [a])
      a.set(2)
      expectAction(a, 'set', [2], [a], [a], [])
      expect(a.get(3)).to.equal(10)
      expectNoAction()
    })

    it('should not spend reads', () => {
      createHookedRun()
      class B extends Jig { }
      class A extends Jig { init (b) { this.n = b.n } }
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const a = new A(b)
      expectAction(a, 'init', [b], [], [a], [b])
    })

    it('should support gettesr', async () => {
      const run = createHookedRun()
      class A extends Jig {
        init () { this.n = 1 }

        get nplusone () { return this.n + 1 }
      }
      class B extends Jig {
        init (a) { this.n = a.nplusone }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.nplusone).to.equal(2)
      const b = new B(a)
      expectAction(b, 'init', [a], [], [b], [a])
      expect(b.n).to.equal(2)
      await run.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(2)
    })

    it('should get host intrinsics to user', () => {
      createHookedRun()
      class A extends Jig {
        init () {
          this.object = {}
          this.array = []
          this.set = new Set()
          this.map = new Map()
          this.buffer = new Uint8Array()
        }
      }
      const a = new A()
      expect(a.object.constructor).to.equal(Object)
      expect(a.array.constructor).to.equal(Array)
      expect(a.set.constructor).to.equal(Set)
      expect(a.map.constructor).to.equal(Map)
      expect(a.buffer.constructor).to.equal(Uint8Array)
    })
  })

  describe('spending rules', () => {
    it('should spend all callers when a jig changes', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig { set (a, n) { a.set(n); return this } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.set(a, 2)
      expectAction(b, 'set', [a, 2], [b, a], [b, a], [])
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should spend all callers for instantiation', async () => {
      const run = createHookedRun()
      class A extends Jig { create () { return new A() } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = a.create()
      expectAction(a, 'create', [], [a], [a, a2], [])
      await run.sync()
      await run.load(a2.location)
    })

    it('should spend all callers across multiple call stacks', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { f (a, c) { a.set(1); c.g(a) } }
      class C extends Jig { g (a) { a.set(2) } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      b.f(a, c)
      expectAction(b, 'f', [a, c], [b, c, a], [b, c, a], [])
      expect(a.n).to.equal(2)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should support calling self', async () => {
      const run = createHookedRun()
      class A extends Jig {
        g (b, c) { b.h(this, c) }

        set (n) { this.n = n }
      }
      class B extends Jig {
        f (a, c) { a.g(this, c) }

        h (a, c) { c.set(a, 1) }
      }
      class C extends Jig {
        set (a, n) { a.set(n) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      b.f(a, c)
      expectAction(b, 'f', [a, c], [b, a, c], [b, a, c], [])
      expect(a.n).to.equal(1)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)
    })

    // TODO: Long term, this probably should not spend if we can figure out a way to do it.
    it('should spend reads uninvolved in the change', async () => {
      const run = createHookedRun()
      class A extends Jig {
        set (n) { this.n = n }

        get () { return this.n }
      }
      class B extends Jig {
        f (a, c) { a.set(1); a.set(c.get(a) + 1) }
      }
      class C extends Jig {
        get (a) { return a.get() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      b.f(a, c)
      expectAction(b, 'f', [a, c], [b, c, a], [b, c, a], [a])
      expect(a.n).to.equal(2)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })
  })

  describe('non-spending reads', () => {
    it('should reference but not spend reads', async () => {
      const run = createHookedRun()
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig {
        init () { this.a = new A(3) }

        set (a) { this.n = a.n + this.a.n }
      }
      B.deps = { A }
      const b = new B()
      expectAction(b, 'init', [], [], [b, b.a], [])
      const a = new A(2)
      expectAction(a, 'init', [2], [], [a], [])
      b.set(a)
      expect(b.n).to.equal(5)
      expectAction(b, 'set', [a], [b], [b], [a, b, b.a])
      await run.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(5)
    })

    it('should throw if read different instances of same jig', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      class B extends Jig {
        init (a) { this.a = a }

        apply (a2) { this.n = this.a + a2.n }
      }
      const b = new B(a)
      expect(() => b.apply(a2)).to.throw('Inconsistent worldview')
    })

    it('should throw if read different instance than written', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a, a2) { this.n = a.n; a2.set(3) } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      const b = new B()
      expect(() => b.apply(a, a2)).to.throw('Inconsistent worldview')
    })

    it('should throw if read different instances of a jig across a batch', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      run.transaction.begin()
      const b = new B()
      const b2 = new B()
      b.apply(a)
      b2.apply(a2)
      run.transaction.end()
      await expect(run.sync()).to.be.rejectedWith(`read different locations of same jig ${a.origin}`)
    })

    it('should throw if write difference locations of the same jig', async () => {
      const run = createHookedRun()
      class Store extends Jig { set (x) { this.x = x } }
      class Setter extends Jig { set (a, x) { a.set(x) } }
      const a = new Store()
      const b = new Setter()
      a.set(1)
      await a.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      await a2.sync()
      run.transaction.begin()
      b.set(a, 3)
      expect(() => b.set(a2, 3)).to.throw('Different location for [jig Store] found in set()')
      run.transaction.rollback()
    })

    it('should throw if write difference instances but same location of the same jig', async () => {
      const run = createHookedRun()
      class Store extends Jig { set (x) { this.x = x } }
      class Setter extends Jig { set (a, x) { a.set(x) } }
      const a = new Store()
      const b = new Setter()
      a.set(1)
      await a.sync()
      const a2 = await run.load(a.location)
      run.transaction.begin()
      b.set(a, 2)
      expect(() => b.set(a2, 3)).to.throw('Different location for [jig Store] found in set()')
      run.transaction.rollback()
    })

    it('should throw if attempt to read old version of jig', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      class B extends Jig { apply (a) { this.n = a.n } }
      const b = new B()
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(1)
      b.apply(a)
      await expect(run.sync()).to.be.rejectedWith(`Read ${a.location} is not the latest. Must sync() jigs`)
    })

    it('should throw if unknown whether read is stale', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      const b = new B()
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(1)
      run.blockchain.spends = async txid => {
        if (txid === a.origin.slice(0, 64)) throw new Error('hello')
        return null
      }
      b.apply(a)
      await expect(run.sync()).to.be.rejectedWith('Aborting broadcast. A referenced jig may not be the latest.')
    })

    it('should throw if read is stale during load', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      const b = new B()
      a.set(1)
      await run.sync()
      b.apply(a)
      const a2 = await run.load(a.location)
      a2.set(2)
      await run.sync()
      // create a new run to not use the cache
      const run2 = new Run({ cache: new Run.LocalCache() })
      const oldFetch = run.blockchain.fetch
      try {
        run2.blockchain.time = async txid => {
          const hours = 60 * 60 * 1000
          if (txid === a.location.slice(0, 64)) return Date.now() - 8 * hours
          if (txid === a2.location.slice(0, 64)) return Date.now() - 6 * hours
          if (txid === b.location.slice(0, 64)) return Date.now()
        }
        await expect(run2.load(b.location)).to.be.rejectedWith(`${a.location} is stale. Aborting.`)
      } finally { run.blockchain.fetch = oldFetch }
    })
  })

  describe('uint8array', () => {
    it('should match instanceof checks', async () => {
      const run = createHookedRun()
      class A extends Jig {
        set () { this.buf = Uint8Array.from([1, 2, 3]) }

        check1 (buf) { return buf instanceof Uint8Array }

        check2 () { return this.buf instanceof Uint8Array }
      }
      class B extends A {
        check3 () { return this.buf instanceof Uint8Array }
      }
      const a = new A()
      a.set()
      expect(a.check1(new Uint8Array([1, 2, 3]))).to.equal(true)
      const b = new B()
      b.set()
      await b.sync()
      const b2 = await run.load(b.location)
      expect(b.buf.length).to.equal(b2.buf.length)
      for (let i = 0; i < b.buf.length; i++) {
        expect(b.buf[i]).to.equal(b2.buf[i])
      }
    })

    it('should support gets and returns', async () => {
      const run = createHookedRun()
      class A extends Jig {
        init () { this.buf = new Uint8Array([1, 2, 3]) }

        get buf2 () { return this.buf }

        getBuf () { return this.buf }
      }
      const a = new A()
      function testBuf (buf) {
        expect(buf.length).to.equal(3)
        expect(buf[0]).to.equal(1)
        expect(buf[1]).to.equal(2)
        expect(buf[2]).to.equal(3)
        expect(buf.constructor === Uint8Array).to.equal(true)
      }
      testBuf(a.buf)
      testBuf(a.buf2)
      testBuf(a.getBuf())
      await run.sync()
      const a2 = await run.load(a.location)
      testBuf(a2.buf)
      testBuf(a2.buf2)
      testBuf(a2.getBuf())
    })
  })

  describe('set', () => {
    it('should throw if unserializable value', () => {
      createHookedRun()
      class A extends Jig {
        f () { this.n = new WeakMap() }
        g () { this.n = Symbol.hasInstance }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('Cannot serialize WeakMap')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
      expect(() => a.g()).to.throw('Cannot serialize Symbol(Symbol.hasInstance)')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
    })

    it('should throw if set is external', () => {
      createHookedRun()
      class A extends Jig { }
      class B extends Jig { init () { this.a = new A(); this.a.n = 1 }}
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.n = 1 }).to.throw()
      expectNoAction()
      expect(() => new B()).to.throw()
      expectNoAction()
    })

    it('should throw if attempt to override methods', () => {
      createHookedRun()
      class A extends Jig {
        f () { }

        g () { this.f = 1 }

        h () { this.sync = [] }

        i () { this.init = 'hello' }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.g()).to.throw()
      expectNoAction()
      expect(() => a.h()).to.throw()
      expectNoAction()
      expect(() => a.i()).to.throw()
      expectNoAction()
    })

    it('should throw if set properties on methods', () => {
      createHookedRun()
      class A extends Jig {
        init () { this.arr = [] }

        f () { this.sync.n = 1 }

        g () { this.arr.filter.n = 2 }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('must not set n on method sync')
      expectNoAction()
      expect(() => a.g()).to.throw('must not set n on method filter')
      expectNoAction()
    })

    it('should not create transaction if no value change', () => {
      createHookedRun()
      class A extends Jig {
        init () { this.n = 1 }

        set (n) { this.n = n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.set(1)
      expectNoAction()
    })

    it('should support setting zero-length properties', async () => {
      const run = createHookedRun()
      class A extends Jig {
        init () { this[''] = 1 }
      }
      const a = new A()
      await a.sync()
      expect(a['']).to.equal(1)
      const a2 = await run.load(a.location)
      expect(a2['']).to.equal(1)
    })
  })

  describe('delete', () => {
    it('should support deleting internally', () => {
      createHookedRun()
      class A extends Jig {
        init () { this.n = 1 }

        delete () { delete this.n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.delete()
      expectAction(a, 'delete', [], [a], [a], [])
      expect(a.n).to.equal(undefined)
    })

    it('should throw if delete externally', () => {
      createHookedRun()
      class A extends Jig { init () { this.n = 1 }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.n }).to.throw()
      expectNoAction()
    })

    it('should throw if delete method', () => {
      createHookedRun()
      class A extends Jig { f () { } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.sync }).to.throw()
    })

    it('should not create transaction if delete did not change object', () => {
      createHookedRun()
      class A extends Jig { delete () { this.n = 1; delete this.n } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.delete()
      expectNoAction()
    })
  })

  describe('getPrototypeOf', () => {
    it('should not spend or reference jigs', () => {
      createHookedRun()
      class A extends Jig {
        f () { this.a2 = new A() }

        g () {
          this.x = this.a2 instanceof A
          this.y = this.a2.constructor.prototype === 'hello'
          this.z = Object.getPrototypeOf(this.a2) === 'world'
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f()
      expectAction(a, 'f', [], [a], [a, a.a2], [])
      a.g()
      expectAction(a, 'g', [], [a], [a], [a])
    })
  })

  describe('setPrototypeOf', () => {
    it('should throw if change prototype', () => {
      createHookedRun()
      class A extends Jig { f () { Reflect.setPrototypeOf(this, Object) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Reflect.setPrototypeOf(a, Object)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('preventExtensions', () => {
    it('should throw if prevent extensions', () => {
      createHookedRun()
      class A extends Jig { f () { Object.preventExtensions(this) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Object.preventExtensions(a)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('defineProperty', () => {
    it('should throw is define property', () => {
      createHookedRun()
      class A extends Jig { f () { Object.defineProperty(this, 'n', { value: 1 }) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Object.defineProperty(a, 'n', { value: 1 })).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('has', () => {
    it('should add non-permanent properties to reads', () => {
      createHookedRun()
      class A extends Jig { init () { this.arr = [1] }}
      class B extends Jig {
        f (a) { this.x = 'n' in a }

        g (a) { this.y = 'arr' in a }

        h (a) { this.z = '1' in a.arr }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [a])
      b.g(a)
      expectAction(b, 'g', [a], [b], [b], [a])
      b.h(a)
      expectAction(b, 'h', [a], [b], [b], [a])
    })

    it('should not add permanant properties to reads', () => {
      createHookedRun()
      class A extends Jig { f () {} }
      class B extends Jig {
        f (a) {
          this.x1 = 'f' in a
          this.x2 = 'origin' in a
          this.x3 = 'location' in a
          this.x4 = 'owner' in a
          this.x5 = 'satoshis' in a
          this.x6 = 'sync' in a
          this.x7 = 'constructor' in a
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [])
    })

    it('should support has for undefined values', () => {
      createHookedRun()
      class A extends Jig {
        init () { this.x = undefined }
      }
      const a = new A()
      expect('x' in a).to.equal(true)
    })
  })

  describe('ownKeys', () => {
    it('should add to reads if call ownKeys', () => {
      createHookedRun()
      class A extends Jig {}
      class B extends Jig { f (a) { this.x = Reflect.ownKeys(a) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [a])
    })
  })

  describe('getOwnPropertyDescriptor', () => {
    it('should add to reads if call getOwnPropertyDescriptor', () => {
      createHookedRun()
      class A extends Jig { init () { this.n = 1 }}
      class B extends Jig { f (a) { this.x = Object.getOwnPropertyDescriptor(a, 'n') }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [a])
    })
  })

  describe('array', () => {
    it('should support calling push internally', async () => {
      createHookedRun()
      class A extends Jig {
        init () { this.a = [] }

        add (n) { this.a.push(n) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.add(1)
      expect(a.a[0]).to.equal(1)
      expectAction(a, 'add', [1], [a], [a], [a])
    })

    it('should throw if change array externally', async () => {
      createHookedRun()
      class A extends Jig {
        init () { this.a = [3, 1, 2, 5, 0] }

        add (n) { this.a.push(n) }
      }
      class B extends Jig { init () { new A().a.push(1) } }
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const expectArrayError = (method, ...args) => {
        const err = `internal method ${method} may not be called to change state`
        expect(() => a.a[method](...args)).to.throw(err)
        expectNoAction()
      }
      expectArrayError('copyWithin', 1)
      expectArrayError('pop')
      expectArrayError('push', 1)
      expectArrayError('reverse')
      expectArrayError('shift')
      expectArrayError('sort')
      expectArrayError('splice', 0, 1)
      expectArrayError('unshift', 4)
      expectArrayError('fill', 0)
      expect(() => new B()).to.throw()
      expectNoAction()
    })

    it('should support read-only methods without spending', () => {
      createHookedRun()
      class A extends Jig { init () { this.a = [] } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const readOps = [
        () => expect(a.a.length).to.equal(0),
        () => expect(() => a.a.concat([1])).not.to.throw(),
        () => expect(() => a.a.entries()).not.to.throw(),
        () => expect(() => a.a.every(() => true)).not.to.throw(),
        () => expect(() => a.a.filter(() => true)).not.to.throw(),
        () => expect(() => a.a.find(() => true)).not.to.throw(),
        () => expect(() => a.a.findIndex(() => true)).not.to.throw(),
        () => expect(() => a.a.forEach(() => {})).not.to.throw(),
        () => expect(() => a.a.includes(1)).not.to.throw(),
        () => expect(() => a.a.indexOf(1)).not.to.throw(),
        () => expect(() => a.a.join()).not.to.throw(),
        () => expect(() => a.a.keys()).not.to.throw(),
        () => expect(() => a.a.lastIndexOf(1)).not.to.throw(),
        () => expect(() => a.a.map(() => true)).not.to.throw(),
        () => expect(() => a.a.reduce(() => true, 0)).not.to.throw(),
        () => expect(() => a.a.reduceRight(() => true, 0)).not.to.throw(),
        () => expect(() => a.a.slice(0)).not.to.throw(),
        () => expect(() => a.a.some(() => true)).not.to.throw(),
        () => expect(() => a.a.toLocaleString()).not.to.throw(),
        () => expect(() => a.a.toString()).not.to.throw()
      ]
      readOps.forEach(op => { op(); expectNoAction() })

      // TODO: test no change
    })

    it('should support iteration', () => {
      createHookedRun()
      class A extends Jig {
        init () { this.a = [] }

        add (x) { this.a.push(x) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.add(1)
      expectAction(a, 'add', [1], [a], [a], [a])
      a.add(2)
      expectAction(a, 'add', [2], [a], [a], [a])
      expect(Array.from(a.a)).to.deep.equal([1, 2])
      expectNoAction()
      const e = [1, 2]
      for (const x of a.a) { expect(x).to.equal(e.shift()) }
      expectNoAction()
    })

    it('should throw if overwrite or delete method on array', () => {
      createHookedRun()
      class A extends Jig {
        init () { this.a = [] }

        f () { this.a.filter = 2 }

        g () { delete this.a.filter }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw()
      expectNoAction()
      expect(() => a.g()).to.throw()
      expectNoAction()
    })
  })

  describe('owner', () => {
    it('should be defined before init is called', () => {
      const run = createHookedRun()
      class A extends Jig { init () { this.ownerAtInit = this.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [a])
      expect(a.ownerAtInit).to.equal(run.owner.address)
    })

    it('should be assigned to creator', async () => {
      const run = createHookedRun()
      class A extends Jig {
        send (to) { this.owner = to }

        createA () { return new A() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const bsvNetwork = unmangle(unmangle(Run)._util)._bsvNetwork(run.blockchain.network)
      const privateKey = new PrivateKey(bsvNetwork)
      const pubkey = privateKey.publicKey.toString()
      a.send(pubkey)
      expectAction(a, 'send', [pubkey], [a], [a], [])
      await a.sync()
      const run2 = hookStoreAction(new Run({ owner: privateKey }))
      const a2 = await run2.load(a.location)
      const a3 = a2.createA()
      expectAction(a2, 'createA', [], [a2], [a2, a3], [])
      await a2.sync()
      expect(a3.owner).to.equal(pubkey)
    })

    it('should throw if set to an invalid owner', async () => {
      createHookedRun()
      class A extends Jig { send (owner) { this.owner = owner }}
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      const publicKey = new PrivateKey().publicKey
      expect(() => a.send(publicKey)).to.throw('is not deployable')
      expect(() => a.send(JSON.parse(JSON.stringify(publicKey)))).to.throw('Invalid owner: [object Object]')
      expect(() => a.send('123')).to.throw('Invalid owner: "123"')
      expectNoAction()
    })

    it('should throw if set to address on another network', async () => {
      createHookedRun()
      class A extends Jig { send (addr) { this.owner = addr } }
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      const addr = new PrivateKey('mainnet').toAddress().toString()
      expect(() => a.send(addr)).to.throw('Invalid owner')
    })

    it('should throw if delete owner', () => {
      createHookedRun()
      class A extends Jig { f () { delete this.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.owner }).to.throw()
      expectNoAction()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })

    it('should throw if set owner externally', () => {
      createHookedRun()
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.owner = '123' }).to.throw()
      expectNoAction()
    })

    it('should throw if define owner method', () => {
      createHookedRun()
      class A extends Jig { owner () {} }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should add to reads', () => {
      createHookedRun()
      class A extends Jig { f (a) { this.x = a.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = new A()
      expectAction(a2, 'init', [], [], [a2], [])
      a.f(a2)
      expectAction(a, 'f', [a2], [a], [a], [a2])
    })

    it('should support only class owner creating instances', async () => {
      class A extends Jig {
        init (owner) {
          if (this.owner !== A.owner) throw new Error()
          this.owner = owner
        }
      }
      const run = new Run()
      const privkey = new PrivateKey()
      const a = new A(privkey.publicKey.toString())
      await run.sync()
      run.deactivate()
      const run2 = new Run({ owner: privkey, blockchain: run.blockchain })
      await run2.load(a.location)
    })

    it('should load non-standard owner', async () => {
      class CustomLock {
        script () { return new Uint8Array([1, 2, 3]) }
        domain () { return 1 }
      }
      class CustomOwner {
        owner () { return new CustomLock() }
        async sign (rawtx) { return rawtx }
      }
      const run = new Run({ owner: new CustomOwner() })
      class A extends Jig { }
      const a = new A()
      await a.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(a.location)
    })

    it('should support copying non-standard owner to another jig', async () => {
      createHookedRun()
      class CustomLock {
        script () { return new Uint8Array([1, 2, 3]) }
        domain () { return 1 }
      }
      class A extends Jig { init () { this.owner = new CustomLock() } }
      A.deps = { CustomLock }
      class B extends Jig { init (a) { this.owner = a.owner } }
      expect(() => new B(new A())).not.to.throw()
    })

    it('should return a copy of owners to outside', async () => {
      createHookedRun()
      class CustomLock {
        constructor (n) { this.n = n }
        script () { return new Uint8Array([this.n]) }
        domain () { return 1 }
      }
      class A extends Jig { init (n) { this.owner = new CustomLock(n) } }
      A.deps = { CustomLock }
      class B extends Jig {
        init (a, n) { this.owner = a.owner; this.owner.n = n }
      }
      const a = new A(1)
      const b = new B(a, 2)
      expect(a.owner.n).to.equal(1)
      expect(b.owner.n).to.equal(2)
    })

    it('should return the original owner inside', async () => {
      createHookedRun()
      class A extends Jig {
        init (owner) { this.owner = owner }
        copyOwner () { this.owner2 = this.owner; this.owner2.n = 2 }
      }
      class CustomLock {
        constructor () { this.n = 1 }
        script () { return new Uint8Array([this.n]) }
        domain () { return 1 }
      }
      const a = new A(new CustomLock())
      a.copyOwner()
      expect(a.owner).to.deep.equal(a.owner2)
      await expect(a.sync()).to.be.rejected
    })
  })

  describe('satoshis', () => {
    async function testSetAndLoad (amount) {
      const run = createHookedRun()
      class A extends Jig { f (s) { this.satoshis = s } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(amount)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.satoshis).to.equal(amount)
    }

    // minimum amount
    it('should set and load 0 satoshis', () => testSetAndLoad(0))

    // less than dust
    it('should set and load 50 satoshis', () => testSetAndLoad(50))

    // more than dust
    it('should set and load 600 satoshis', () => testSetAndLoad(600))

    function testFailToSet (amount, err) {
      createHookedRun()
      class A extends Jig { f (s) { this.satoshis = s } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f(amount)).to.throw(err)
      expectNoAction()
    }

    it('should throw if set to negative', () => testFailToSet(-1, 'satoshis must be non-negative'))
    it('should throw if set to float', () => testFailToSet(1.1, 'satoshis must be an integer'))
    it('should throw if set to string', () => testFailToSet('1', 'satoshis must be a number'))
    it('should throw if set above 100M', () => testFailToSet(100000001, 'satoshis must be <= 100000000'))
    it('should throw if set to NaN', () => testFailToSet(NaN, 'satoshis must be an integer'))
    it('should throw if set to Infinity', () => testFailToSet(Infinity, 'satoshis must be an integer'))
    it('should throw if set to undefined', () => testFailToSet(undefined, 'satoshis must be a number'))

    it('should initialize to 0 satoshis', () => {
      createHookedRun()
      class A extends Jig { init () { this.satoshisAtInit = this.satoshis }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [a])
      expect(a.satoshisAtInit).to.equal(0)
    })

    it('should throw if satoshis method exists', () => {
      createHookedRun()
      class A extends Jig { owner () {} }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should throw if delete satoshis property', () => {
      createHookedRun()
      class A extends Jig { f () { delete this.satoshis }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.satoshis }).to.throw()
      expectNoAction()
      expect(() => a.f()).to.throw('must not delete satoshis')
      expectNoAction()
    })

    it('should throw if set externally', () => {
      createHookedRun()
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.satoshis = 1 }).to.throw('must not set satoshis outside of a method')
      expectNoAction()
    })

    it('should add to purse when satoshis decreased', async () => {
      const run = createHookedRun()
      class A extends Jig { f (satoshis) { this.satoshis = satoshis; return this }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await a.f(5000).sync()
      expectAction(a, 'f', [5000], [a], [a], [])
      const before = await run.purse.balance()
      await a.f(0).sync()
      expectAction(a, 'f', [0], [a], [a], [])
      const after = await run.purse.balance()
      expect(after - before > 3000).to.equal(true)
    })
  })

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
