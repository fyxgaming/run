const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { PrivateKey } = require('bsv')
const Run = require('./run')
const { Jig } = Run
const { createRun, hookPay, hookStoreAction, expectAction, expectNoAction } = require('./helpers')

const run = hookStoreAction(createRun())

beforeEach(() => run.blockchain.block())
beforeEach(() => run.activate())
beforeEach(() => Run.code.flush())

// Turn this on for easier debugging because the tests won't bleed into one another.
// (We leave this off by default to enable state bleeding and more complexity in the tests)
// afterEach(() => run.sync())

describe('Jig', () => {
  describe('constructor', () => {
    it('basic jig', async () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(run.constructor.code.installs.has(A)).to.equal(true)
      await run.sync()
      expect(A.origin.length).to.equal(67)
    })

    it('must be extended', () => {
      expect(() => new Jig()).to.throw()
      expectNoAction()
    })

    it('must not have constructor', () => {
      class A extends Jig { constructor () { super(); this.n = 1 } }
      expect(() => new A()).to.throw('Jig must use init() instead of constructor()')
      expectNoAction()
    })

    it('calls init with args', () => {
      class A extends Jig { init (a, b) { this.a = a; this.b = b } }
      const a = new A(1, 'z')
      expectAction(a, 'init', [1, 'z'], [], [a], [])
      expect(a.a).to.equal(1)
      expect(a.b).to.equal('z')
    })

    it('grandchildren', async () => {
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
  })

  describe('sandbox', () => {
    it('locals and globals inaccessible', () => {
      let n = 1 // eslint-disable-line
      class A extends Jig { init () { n = 2 } }
      expect(() => new A()).to.throw()
      expectNoAction()
      global.x = 1 // eslint-disable-line
      class B extends Jig { init () { x = 2 } } // eslint-disable-line
      expect(() => new B()).to.throw()
      expectNoAction()
    })

    it('jig env inaccessible', () => {
      class A extends Jig { init () { control.stack.push(1) } } // eslint-disable-line
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('inaccessible globals', () => {
      class A extends Jig {
        isUndefined (x) {
          return typeof (typeof window !== 'undefined' ? window : global)[x] === 'undefined'
        }
      }
      const a = new A()
      const bad = ['Date', 'Math', 'eval', 'XMLHttpRequest', 'FileReader', 'WebSocket', 'setTimeout', 'setInterval']
      bad.forEach(x => expect(a.isUndefined(x)).to.equal(true))
    })

    it('useful error when creating date', () => {
      class A extends Jig { createDate () { return new Date() } }
      const a = new A()
      expect(() => a.createDate()).to.throw('Hint: Date is disabled inside jigs because it is non-deterministic.')
    })
  })

  describe('instanceof', () => {
    it('match basic jigs', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a).to.be.instanceOf(A)
      expect(a).to.be.instanceOf(Jig)
    })

    it('match extensions', () => {
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

    it('fail to match non-instances', () => {
      expect(new class { }()).not.to.be.instanceOf(Jig)
      expect(new class { }() instanceof Jig).to.equal(false)
    })

    it('search for uninstalled class', async () => {
      class A extends Jig { }
      class B extends Jig { }
      const a = new A() // eslint-disable-line
      await a.sync()
      run.owner.jigs.find(jig => jig instanceof B)
    })

    it('standard library', async () => {
      class A extends Jig { }
      const a = new A()
      await run.sync()
      Run.code.flush()
      const a2 = await run.load(a.location)
      expect(a2 instanceof A).to.equal(true)
    })

    it('does not match prototypes', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.constructor.prototype instanceof Jig).to.equal(false)
      expect(Object.getPrototypeOf(a) instanceof Jig).to.equal(false)
    })
  })

  describe('init', () => {
    it('throws if called externally', () => {
      class A extends Jig { init (n) { this.n = n } }
      const a = new A(5)
      expectAction(a, 'init', [5], [], [a], [])
      expect(() => a.init(6)).to.throw()
      expectNoAction()
    })

    it('throws if called internally', () => {
      class A extends Jig {
        init (n) { this.n = n }

        f (n) { this.init(n) }
      }
      const a = new A(5)
      expectAction(a, 'init', [5], [], [a], [])
      expect(() => a.f(6)).to.throw()
      expectNoAction()
    })

    it('throws if return', async () => {
      class A extends Jig { init () { return {} }}
      expect(() => new A()).to.throw()
    })
  })

  describe('sync', () => {
    it('sets origins and locations on class and instance', async () => {
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

    it('throws if called internally', () => {
      class A extends Jig { init () { this.sync() } }
      class B extends Jig { f () { this.sync() } }
      expect(() => new A()).to.throw()
      expectNoAction()
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f()).to.throw()
      expectNoAction()
    })

    it('throws if override sync', () => {
      class A extends Jig { sync () { } }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('forward', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      await run.sync()
      const a2 = await run2.load(a.location)
      a2.set(1)
      a2.set(2)
      await a2.sync()
      run.activate()
      expect(a.x).to.equal(undefined)
      await a.sync()
      expect(a.x).to.equal(2)
    })

    it('forward inner', async () => {
      class A extends Jig { set (x, y) { this[x] = y } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      a.set('b', b)
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const b2 = await run2.load(b.location)
      b2.set('n', 1)
      await b2.sync()
      run.activate()
      expect(a.b.n).to.equal(undefined)
      await a.sync()
      expect(a.b.n).to.equal(1)
    })

    it('forward circular', async () => {
      class A extends Jig { set (x, y) { this[x] = y } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      a.set('b', b)
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      b2.set('a', a2)
      await b2.sync()
      run.activate()
      expect(a.b.a).to.equal(undefined)
      await a.sync()
      expect(a.b.a.location).to.equal(a.location)
    })

    it('forward off', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      a2.set(1)
      await a2.sync()
      run.activate()
      expect(a.x).to.equal(undefined)
      await a.sync({ forward: false })
      expect(a.x).to.equal(undefined)
    })

    it('forward unsupported', async () => {
      class A extends Jig { }
      const a = new A()
      await a.sync() // pending transactions must publish first
      const oldFetch = run.blockchain.fetch
      run.blockchain.fetch = async (...args) => {
        const tx = await oldFetch.call(run.blockchain, ...args)
        tx.outputs.forEach(output => delete output.spentTxId)
        tx.outputs.forEach(output => delete output.spentIndex)
        tx.outputs.forEach(output => delete output.spentHeight)
        return tx
      }
      await expect(a.sync()).to.be.rejectedWith('Blockchain API does not support forward syncing.')
      run.blockchain.fetch = oldFetch
    })

    it('forward conflict', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      a2.set(1)
      await a2.sync()
      run.activate()
      a.set(2)
      await expect(a.sync()).to.be.rejectedWith('tx input 0 missing or spent')
      expect(a.x).to.equal(1)
    })

    it('missing spentTxId', async () => {
      class A extends Jig { }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const tx = await run.blockchain.fetch(a.location.slice(0, 64))
      tx.outputs[2].spentTxId = '123'
      await expect(a.sync()).to.be.rejectedWith('tx not found')
    })

    it('wrong spentTxId', async () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      await run.sync()
      const tx = await run.blockchain.fetch(a.location.slice(0, 64))
      tx.outputs[2].spentTxId = b.location.slice(0, 64)
      await expect(a.sync()).to.be.rejectedWith('jig not found')
    })
  })

  describe('method', () => {
    it('null args', async () => {
      class Dragon extends Jig {
        init (lair) {
          this.lair = lair
        }
      }
      const dragon = new Dragon(null)
      await dragon.sync()
      run.state.cache.clear()
      const dragon2 = await run.load(dragon.location)
      expect(dragon).to.deep.equal(dragon2)
    })

    it('rearrange jigs', () => {
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

    it('restores on error', () => {
      class C extends Jig { f () { this.n = 1 } }
      class B extends Jig { g () { this.z = 1 } }
      class A extends Jig {
        init () {
          this.n = 1
          this.arr = ['a', { b: 1 }]
          this.self = this
          this.b = new B()
        }

        f (c) {
          c.f()
          this.n = 2
          this.arr[2].b = 2
          this.arr.push(3)
          this.b.g()
          throw new Error()
        }
      }
      A.deps = { B }
      const a = new A()
      expectAction(a, 'init', [], [], [a, a.b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      expect(() => a.f(c)).to.throw()
      expectNoAction()
      expect(a.n).to.equal(1)
      expect(a.arr).to.deep.equal(['a', { b: 1 }])
      expect(a.self).to.equal(a)
      expect(a.b.z).to.equal(undefined)
      expect(c.n).to.equal(undefined)
    })

    it('internal errors', () => {
      class B extends Jig { init () { throw new Error('some error message') } }
      class A extends Jig { f () { try { return new B() } catch (e) { } } }
      A.deps = { B }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('internal errors must not be swallowed\n\nError: some error message')
      expectNoAction()
    })

    it('static libraries', () => {
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

    it('bounce call stack set', () => {
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

    it('inactive network', async () => {
      class A extends Jig { f () { this.n = 1; return this } }
      const a = await new A().sync()
      createRun({ network: 'test' })
      await expect(a.f().sync()).to.be.rejected
    })
  })

  describe('arguments', () => {
    it('allowed', () => {
      class A extends Jig { f (...args) { this.args = args } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      a.f(1, 'a', true)
      expectAction(a, 'f', [1, 'a', true], [a], [a], [])
      a.f({ n: 1 }, [1, 2, 3])
      expectAction(a, 'f', [{ n: 1 }, [1, 2, 3]], [a], [a], [])
      a.f({ a: { b: {} } }, { a: [1, 2, 3] })
      expectAction(a, 'f', [{ a: { b: {} } }, { a: [1, 2, 3] }], [a], [a], [])
      a.f(a, [a], { a })
      expectAction(a, 'f', [a, [a], { a }], [a], [a], [])
    })

    it('throws if not allowed', () => {
      class A extends Jig { f (...args) { this.args = args } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f(NaN)).to.throw('NaN cannot be serialized to json')
      expectNoAction()
      expect(() => a.f(Infinity)).to.throw('Infinity cannot be serialized to json')
      expectNoAction()
      expect(() => a.f(new Set())).to.throw('Set cannot be serialized to json')
      expectNoAction()
      expect(() => a.f(new Map())).to.throw('Map cannot be serialized to json')
      expectNoAction()
      expect(() => a.f(Symbol.hasInstance)).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expectNoAction()
      expect(() => a.f(() => { })).to.throw('cannot be serialized to json')
    })

    it('changes in method', () => {
      class A extends Jig { f (arr, obj) { arr.pop(); obj.n = 1; this.n = 0 } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f([1], { n: 0 })
      expectAction(a, 'f', [[1], { n: 0 }], [a], [a], [])
    })

    it('constructor checks', async () => {
      class A extends Jig { init (b) { this.test = b.constructor === B } }
      class B extends Jig { init () { this.x = A.owner } }
      A.deps = { B }
      B.deps = { A }
      await run.deploy(A)
      await run.deploy(B)
      const b = new B()
      const a = new A(b)
      expect(b.x).to.equal(run.owner.pubkey)
      expect(a.test).to.equal(true)
      await run.sync()
      Run.code.flush()
      await run.sync()
    })
  })

  describe('get', () => {
    it('no change no action', () => {
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

    it('does not spend undefined reads', () => {
      class B extends Jig { }
      class A extends Jig { init (b) { this.n = b.n } }
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const a = new A(b)
      expectAction(a, 'init', [b], [], [a], [b])
    })

    it('getter', async () => {
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
  })

  describe('spending rules', () => {
    it('changed jigs spend callers', async () => {
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

    it('creates spend callers', async () => {
      class A extends Jig { create () { return new A() } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = a.create()
      expectAction(a, 'create', [], [a], [a, a2], [])
      await run.sync()
      await run.load(a2.location)
    })

    it('multiple caller stacks', async () => {
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

    it('call self in stack', async () => {
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

    // TODO: Long term, this probably should not spend.
    it('uninvolved reads spend', async () => {
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
    it('basic refs', async () => {
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

    it('different read instances', async () => {
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
      expect(() => b.apply(a2)).to.throw('referenced different locations of same jig: [jig A]')
    })

    it('different read and write instances', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a, a2) { this.n = a.n; a2.set(3) } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      const b = new B()
      expect(() => b.apply(a, a2)).to.throw('referenced different locations of same jig: [jig A]')
    })

    it('different read instances batch', async () => {
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

    it('prevents stale posts', async () => {
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

    it('prevents maybe stale posts', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      const b = new B()
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(1)
      const oldFetch = run.blockchain.fetch
      try {
        run.blockchain.fetch = async txid => {
          const tx = await oldFetch.call(run.blockchain, txid)
          if (txid === a.origin.slice(0, 64)) {
            const vout = parseInt(a.origin.slice(66))
            delete tx.outputs[vout].spentTxId
            delete tx.outputs[vout].spentIndex
            delete tx.outputs[vout].spentHeight
          }
          return tx
        }
        b.apply(a)
        await expect(run.sync()).to.be.rejectedWith(`Read ${a.location} may not be latest. Blockchain did not return spentTxId. Aborting`)
      } finally { run.blockchain.fetch = oldFetch }
    })

    it('load stale', async () => {
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
      // create a new run to not use the state cache
      const run2 = createRun({ blockchain: run.blockchain, state: new Run.StateCache() })
      const oldFetch = run.blockchain.fetch
      try {
        run2.blockchain.fetch = async txid => {
          const tx = await oldFetch.call(run.blockchain, txid)
          if (txid !== a2.location.slice(0, 64)) tx.time = Date.now() - 6 * 60 * 60 * 1000
          if (txid === b.location.slice(0, 64)) tx.time = Date.now()
          return tx
        }
        await expect(run2.load(b.location)).to.be.rejectedWith(`${a.location} is stale. Aborting.`)
      } finally { run.blockchain.fetch = oldFetch }
    })
  })

  describe('uint8array', () => {
    it('basic checks', async () => {
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

    it('gets and returns', async () => {
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
        expect(buf.constructor === Run.code.intrinsics.Uint8Array).to.equal(true)
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
    it('throws if unsupported', () => {
      class A extends Jig {
        f () { this.n = new Set() }

        g () { this.n = Symbol.hasInstance }

        h () { this.n = () => { } }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('Set cannot be serialized to json')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
      expect(() => a.g()).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
      expect(() => a.h()).to.throw('cannot be serialized to json')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
    })

    it('throws if external', () => {
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

    it('cannot override methods', () => {
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

    it('cannot set properties on internal methods', () => {
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

    it('unchanged', () => {
      class A extends Jig {
        init () { this.n = 1 }

        set (n) { this.n = n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.set(1)
      expectNoAction()
    })
  })

  describe.only('delete', () => {
    it('allowed internally', () => {
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

    it('throws if external', () => {
      class A extends Jig { init () { this.n = 1 }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.n }).to.throw()
      expectNoAction()
    })

    it('cannot delete methods', () => {
      class A extends Jig { f () { } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.sync }).to.throw()
    })

    it('unchanged', () => {
      class A extends Jig { delete () { this.n = 1; delete this.n } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.delete()
      expectNoAction()
    })
  })

  describe('getPrototypeOf', () => {
    it('does not read', () => {
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
    it('throws', () => {
      class A extends Jig { f () { Reflect.setPrototypeOf(this, Object) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Reflect.setPrototypeOf(a, Object)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('preventExtensions', () => {
    it('throws', () => {
      class A extends Jig { f () { Object.preventExtensions(this) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Object.preventExtensions(a)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('defineProperty', () => {
    it('throws', () => {
      class A extends Jig { f () { Object.defineProperty(this, 'n', { value: 1 }) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Object.defineProperty(a, 'n', { value: 1 })).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('has', () => {
    it('reads non-permanents', () => {
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

    it('does not read permanents', () => {
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

    it('undefined', () => {
      class A extends Jig {
        init () { this.x = undefined }
      }
      const a = new A()
      expect('x' in a).to.equal(true)
    })
  })

  describe('ownKeys', () => {
    it('reads if change', () => {
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
    it('reads if change', () => {
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
    it('push internally', async () => {
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

    it('throws if write externally', () => {
      class A extends Jig {
        init () { this.a = [3, 1, 2, 5, 0] }

        add (n) { this.a.push(n) }
      }
      class B extends Jig { init () { new A().a.push(1) } }
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const err = func => `internal method ${func} may not be called to change state`
      const writeOps = [
        () => expect(() => a.a.copyWithin(1)).to.throw(err('copyWithin')),
        () => expect(() => a.a.pop()).to.throw(err('pop')),
        () => expect(() => a.a.push(1)).to.throw(err('push')),
        () => expect(() => a.a.reverse()).to.throw(err('reverse')),
        () => expect(() => a.a.shift()).to.throw(err('shift')),
        () => expect(() => a.a.sort()).to.throw(err('sort')),
        () => expect(() => a.a.splice(0, 1)).to.throw(err('splice')),
        () => expect(() => a.a.unshift(4)).to.throw(err('unshift')),
        () => expect(() => a.a.fill(0)).to.throw(err('fill')),
        () => expect(() => new B()).to.throw(err('push'))
      ]
      writeOps.forEach(op => { op(); expectNoAction() })
    })

    it('read-only methods', () => {
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

    it('iterate', () => {
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
      expect(Array.from(a.a)).to.equal([1, 2])
      expectNoAction()
      const e = [1, 2]
      for (const x of a.a) { expect(x).to.equal(e.shift()) }
      expectNoAction()
    })

    it('throws if overwrite or delete method', () => {
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
    it('defined before init', () => {
      class A extends Jig { init () { this.ownerAtInit = this.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [a])
      expect(a.ownerAtInit).to.equal(run.owner.pubkey)
    })

    it('assigned to creator', async () => {
      class A extends Jig {
        send (to) { this.owner = to }

        createA () { return new A() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const bsvNetwork = Run._util.bsvNetwork(run.blockchain.network)
      const privateKey = new PrivateKey(bsvNetwork)
      const pubkey = privateKey.publicKey.toString()
      a.send(pubkey)
      expectAction(a, 'send', [pubkey], [a], [a], [])
      await a.sync()
      const run2 = hookStoreAction(createRun({ blockchain: run.blockchain, owner: privateKey }))
      const a2 = await run2.load(a.location)
      const a3 = a2.createA()
      expectAction(a2, 'createA', [], [a2], [a2, a3], [])
      await a2.sync()
      expect(a3.owner).to.equal(pubkey)
    })

    it('throws if not public key', async () => {
      class A extends Jig { send (owner) { this.owner = owner }}
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const publicKey = new PrivateKey().publicKey
      expect(() => a.send(publicKey)).to.throw('PublicKey cannot be serialized to json')
      expect(() => a.send(JSON.parse(JSON.stringify(publicKey)))).to.throw('owner must be a pubkey string')
      expect(() => a.send('123')).to.throw('owner is not a valid public key')
      expectNoAction()
    })

    it('delete throws', () => {
      class A extends Jig { f () { delete this.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.owner }).to.throw()
      expectNoAction()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })

    it('set externally throws', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.owner = '123' }).to.throw()
      expectNoAction()
    })

    it('owner method throws', () => {
      class A extends Jig { owner () {} }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('reads if changed', () => {
      class A extends Jig { f (a) { this.x = a.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = new A()
      expectAction(a2, 'init', [], [], [a2], [])
      a.f(a2)
      expectAction(a, 'f', [a2], [a], [a], [a2])
    })

    it('only class owner may create instances', async () => {
      const privkey = new PrivateKey()
      class A extends Jig {
        init (owner) {
          if (this.owner !== A.owner) throw new Error()
          this.owner = owner
        }
      }
      const run = createRun()
      const a = new A(privkey.publicKey.toString())
      await run.sync()
      Run.code.flush()
      const run2 = createRun({ blockchain: run.blockchain, owner: privkey })
      await run2.load(a.location)
    })
  })

  describe('satoshis', () => {
    it('defined before init', () => {
      class A extends Jig { init () { this.satoshisAtInit = this.satoshis }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [a])
      expect(a.satoshisAtInit).to.equal(0)
    })

    it('set valid', async () => {
      class A extends Jig { f (s) { this.satoshis = s }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      a.f(100000)
      expectAction(a, 'f', [100000], [a], [a], [])
      a.f(0)
      expectAction(a, 'f', [0], [a], [a], [])
      await run.sync()
    })

    it('load mocknet', async () => {
      class A extends Jig { f (s) { this.satoshis = s }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(50)
      expectAction(a, 'f', [50], [a], [a], [])
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.satoshis).to.equal(50)
    })

    it('load testnet', async () => {
      const run = createRun({ network: 'test' })
      class A extends Jig { f (s) { this.satoshis = s }}
      const a = new A()
      a.f(50)
      await run.sync()
      await run.load(a.location)
    })

    it('set invalid', () => {
      class A extends Jig {
        f (s) { this.satoshis = s }

        g () { this.satoshis = NaN }

        h () { this.satoshis = Infinity }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f(-1)).to.throw()
      expectNoAction()
      expect(() => a.f('1')).to.throw()
      expectNoAction()
      expect(() => a.f(100000001)).to.throw()
      expectNoAction()
      expect(() => a.g()).to.throw()
      expectNoAction()
      expect(() => a.h()).to.throw()
      expectNoAction()
    })

    it('satoshis method throws', () => {
      class A extends Jig { owner () {} }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('delete throws', () => {
      class A extends Jig { f () { delete this.satoshis }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.satoshis }).to.throw()
      expectNoAction()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })

    it('set externally throws', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.satoshis = 1 }).to.throw()
      expectNoAction()
    })

    it('decrease adds to purse', async () => {
      class A extends Jig { f (satoshis) { this.satoshis = satoshis; return this }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await a.f(10000).sync()
      expectAction(a, 'f', [10000], [a], [a], [])
      const before = await run.purse.balance()
      await a.f(0).sync()
      expectAction(a, 'f', [0], [a], [a], [])
      const after = await run.purse.balance()
      expect(after - before > 8000).to.equal(true)
    })
  })

  describe('misc', () => {
    it('custom toJSON method', () => {
      class A extends Jig { toJSON () { return [1, 2, 3] } }
      const a = new A()
      expect(JSON.stringify(a)).to.equal('[1,2,3]')
      expectAction(a, 'init', [], [], [a], [])
    })

    it('throws if $class or $ref property', () => {
      class A extends Jig { init () { this.o = { $class: 'undefined' } } }
      expect(() => new A()).to.throw()
      expectNoAction()
      class B extends Jig { init () { this.o = { $ref: '123' } } }
      expect(() => new B()).to.throw()
      expectNoAction()
    })

    it('throws if $class or $ref arg', () => {
      class A extends Jig { init (o) { this.o = o } }
      expect(() => new A({ $class: 'undefined' })).to.throw()
      expectNoAction()
      expect(() => new A({ $ref: '123' })).to.throw()
      expectNoAction()
    })

    it('deploy failed', async () => {
      const oldPay = run.purse.pay
      run.purse.pay = async tx => tx
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
      try { console.log(a.n) } catch (e) {
        expect(e.toString().startsWith('Error: deploy failed')).to.equal(true)
        expect(e.toString().indexOf('Error: Broadcast failed, tx has no inputs')).not.to.equal(-1)
      }
      run.purse.pay = oldPay
    })

    it('pay incomplete', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = await new A().sync()
      const oldPay = run.purse.pay
      run.purse.pay = async (tx) => { return tx }
      const a2 = new A()
      // test when just init, no inputs
      expectAction(a2, 'init', [], [], [a2], [])
      const suggestion = 'Hint: Is the purse funded to pay for this transaction?'
      await expect(run.sync()).to.be.rejectedWith(`Broadcast failed, tx has no inputs\n\n${suggestion}`)
      // test with a spend, pre-existing inputs
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
      await expect(run.sync()).to.be.rejectedWith(`Broadcast failed, tx fee too low\n\n${suggestion}`)
      run.purse.pay = oldPay
    })

    it('sign incomplete', async () => {
      class A extends Jig {
        init () { this.n = 1 }

        f () { this.n = 2 }
      }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const oldSign = run._sign
      run._sign = async (tx) => { return tx }
      a.f()
      await expect(a.sync()).to.be.rejectedWith('Signature missing for A')
      run._sign = oldSign
    })

    it('ordering', async () => {
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

    it('uncaught errors', async done => {
      class A extends Jig { f () { this.n = 1 } }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const oldBroadcast = run.blockchain.broadcast
      run.blockchain.broadcast = async (tx) => { throw new Error() }
      expect(a.n).to.equal(undefined)
      a.f()
      expectAction(a, 'f', [], [a], [a], [])
      expect(a.n).to.equal(1)
      setTimeout(() => {
        let completed = false
        try { a.origin } catch (e) { completed = true } // eslint-disable-line
        if (completed) {
          run.blockchain.broadcast = oldBroadcast
          expect(() => a.origin).to.throw('a previous update failed')
          expect(() => a.location).to.throw('a previous update failed')
          expect(() => a.owner).to.throw('a previous update failed')
          expect(() => a.n).to.throw('a previous update failed')
          expect(() => a.f()).to.throw('a previous update failed')
          done()
        }
      }, 1)
    })
  })

  describe('mempool chain', () => {
    it('long mempool chain (purse)', async () => {
      class A extends Jig { }
      for (let i = 0; i < 100; i++) { new A() } // eslint-disable-line
      await run.sync()
    })

    it.skip('long mempool chain (jig)', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      for (let i = 0; i < 100; i++) {
        a.set(i)
        await a.sync()
      }
    })

    it.skip('multiple jigs different lengths', async () => {
      // TODO
    })
  })

  describe('toString', () => {
    it('default', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.toString()).to.equal('[jig A]')
    })

    it('override', () => {
      class A extends Jig { toString () { return 'hello' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.toString()).to.equal('hello')
    })
  })

  describe('origin', () => {
    it('read before sync throws', async () => {
      class A extends Jig { f () { this.origin2 = this.origin }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.origin).to.throw('sync required before reading origin')
      expect(() => a.f()).to.throw('sync required before reading origin')
      await a.sync()
      expect(() => a.origin).not.to.throw()
      expect(() => a.f()).not.to.throw()
    })

    it('read internally after sync', async () => {
      class A extends Jig { f () { this.origin2 = this.origin }}
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      a.f()
      expectAction(a, 'f', [], [a], [a], [])
    })

    it('delete throws', () => {
      class A extends Jig { f () { delete this.origin }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.origin }).to.throw('must not delete origin')
      expectNoAction()
      expect(() => a.f()).to.throw('must not delete origin')
      expectNoAction()
    })

    it('set throws', () => {
      class A extends Jig { f () { this.origin = '123' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.origin = '123' }).to.throw('must not set origin')
      expectNoAction()
      expect(() => a.f()).to.throw('must not set origin')
      expectNoAction()
    })

    it('origin method throws', () => {
      class A extends Jig { origin () {} }
      expect(() => new A()).to.throw('must not override origin')
      expectNoAction()
    })
  })

  describe('location', () => {
    it('read before sync throws', async () => {
      class A extends Jig {}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.location).to.throw('sync required before reading location')
      await a.sync()
      expect(() => a.location).not.to.throw()
    })

    it('read internally after sync', async () => {
      class A extends Jig { f () { this.location2 = this.location }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await a.sync()
      a.f()
      expectAction(a, 'f', [], [a], [a], [a])
      expect(a.location2).to.equal(a.origin)
      expect(() => a.f()).to.throw('sync required before reading location')
      expectNoAction()
      await a.sync()
      const secondLocation = a.location
      a.f()
      expectAction(a, 'f', [], [a], [a], [a])
      expect(a.location2).to.equal(secondLocation)
    })

    it.skip('read quickly', async () => {
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      expect(a.location).not.to.throw()
      a.f()
      expect(a.location).not.to.throw()
    })

    it('delete throws', () => {
      class A extends Jig { f () { delete this.location }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.location }).to.throw('must not delete location')
      expectNoAction()
      expect(() => a.f()).to.throw('must not delete location')
      expectNoAction()
    })

    it('set throws', () => {
      class A extends Jig { f () { this.location = '123' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.location = '123' }).to.throw('must not set location')
      expectNoAction()
      expect(() => a.f()).to.throw('must not set location')
      expectNoAction()
    })

    it('location method throws', () => {
      class A extends Jig { location () {} }
      expect(() => new A()).to.throw('must not override location')
      expectNoAction()
    })
  })

  describe('load', () => {
    it('single jig', async () => {
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

    it('previous state', async () => {
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

    it('throws if bad id', async () => {
      class A extends Jig { }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      await expect(run.load(a.location.slice(0, 64) + '_o0')).to.be.rejected
      await expect(run.load(a.location.slice(0, 64) + '_o3')).to.be.rejected
    })

    it('multiple writes', async () => {
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

    it('arg writes', async () => {
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

    it('same locations different jigs', async () => {
      class A extends Jig { init (n) { this.n = n }}
      const a = await new A(1).sync()
      expectAction(a, 'init', [1], [], [a], [])
      const a2 = await run.load(a.location)
      const a3 = await run.load(a.location)
      class B extends Jig { init (x, y) { this.n = x.n + y.n }}
      const b = new B(a2, a3)
      expectAction(b, 'init', [a2, a3], [], [b], [a2, a3])
      await run.sync()
      expect(b.n).to.equal(2)
    })

    it('same origins different locations', async () => {
      class A extends Jig { f (n) { this.n = n; return this }}
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      await a.f(1).sync()
      expectAction(a, 'f', [1], [a], [a], [])
      const a2 = await run.load(a.location)
      await a2.f(2).sync()
      expectAction(a2, 'f', [2], [a2], [a2], [])
      class B extends Jig { init (x, y) { this.n = x.n + y.n }}
      expect(() => new B(a, a2)).to.throw()
    })

    it('children', async () => {
      class A extends Jig { }
      class B extends A { }
      const b = await new B().sync()
      expectAction(b, 'init', [], [], [b], [])
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.load(b.location)
    })

    it('arg read', async () => {
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { init (a) { this.n = a.n } }
      const a = await new A(1).sync()
      expectAction(a, 'init', [1], [], [a], [])
      const b = await new B(a).sync()
      expectAction(b, 'init', [a], [], [b], [a])
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(1)
    })

    it('inner read', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig {
        init (a) { this.a = a }

        apply () { this.n = this.a.n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
      const b = await new B(a).sync()
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

  describe('state cache', () => {
    it('caches local updates', async () => {
      class A extends Jig {
        init () { this.undef = undefined }

        set (n) { this.n = n }
      }
      const a = new A()
      const t0 = Date.now()
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
      const t1 = Date.now()
      await run.load(a.location)
      const t2 = Date.now()
      expect(t1 - t0 > 1000).to.equal(true)
      expect(t2 - t1 < 100).to.equal(true)

      const run2 = createRun({ blockchain: run.blockchain, state: new Run.StateCache() })
      const t3 = Date.now()
      await run2.load(a.location)
      const t4 = Date.now()
      await run2.load(a.location)
      const t5 = Date.now()
      expect(t4 - t3 > 1000).to.equal(true)
      expect(t5 - t4 < 100).to.equal(true)
    })
  })

  describe('class props', () => {
    it('read from outside', async () => {
      class A extends Jig {}
      A.n = 1
      const a = await new A().sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      expect(a2.constructor.n).to.equal(1)
    })

    it('read from inside', () => {
      class A extends Jig { f () { this.n = this.constructor.n }}
      A.n = 1
      const a = new A()
      a.f()
      expect(a.n).to.equal(1)
    })

    it('read dependencies from inside from pre-deployed', () => {
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
    it('load multiple inits', async () => {
      class A extends Jig { }
      run.transaction.begin()
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      run.transaction.end()
      await a.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      expect(a.origin.slice(0, 64)).to.equal(b.origin.slice(0, 64))
      expect(a.origin).to.equal(a2.origin)
      expect(b.origin).to.equal(b2.origin)
    })

    it('load multiple updates', async () => {
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
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      expect(a2.location.slice(0, 64)).to.equal(b2.location.slice(0, 64))
      expect(a2.n).to.equal(1)
      expect(b2.n).to.equal(2)
    })

    it('load with self reference', async () => {
      class A extends Jig { f (a) { this.n = a } }
      run.transaction.begin()
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(a)
      expectAction(a, 'f', [a], [a], [a], [])
      run.transaction.end()
      await a.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      expect(a.origin).to.equal(a2.origin)
      expect(a2).to.equal(a2.n)
      expect(a.n).to.equal(a2.n)
      expect(a.owner).to.equal(a2.owner)
    })

    it('circular reference in same transaction', async () => {
      class A extends Jig { set (x) { this.x = x } }
      run.transaction.begin()
      const a = new A()
      const b = new A()
      a.set(b)
      b.set(a)
      run.transaction.end()
      await run.sync()
      await run.load(a.location)
      await run.load(b.location)
    })

    it('batch fail with args rollback', async () => {
      hookPay(run, true, true, true, false)
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
    it('has', () => {
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

    it('get', () => {
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

    it('method', () => {
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

    it('ownKeys', () => {
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
    it('caller is null', async () => {
      class A extends Jig {
        init () {
          if (caller !== null) throw new Error()
        }

        f () { this.caller = caller }
      }
      const a = new A()
      a.f()
      expect(a.caller).toBeNull()
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.caller).toBeNull()
    })

    it('caller is parent', async () => {
      class Parent extends Jig {
        createChild () { return new Child(this.origin) }

        callChild (child) { child.f() }
      }
      class Child extends Jig {
        init (parentOrigin) {
          if (caller.origin !== parentOrigin) throw new Error()
          if (caller.constructor !== Parent) throw new Error()
        }

        f () { this.caller = caller }
      }
      Parent.deps = { Child }
      Child.deps = { Parent }
      const parent = await new Parent().sync()
      const child = parent.createChild()
      parent.callChild(child)
      expect(child.caller.origin).to.equal(parent.origin)
      expect(child.caller.constructor.name).to.equal('Parent') // TODO: compare with type
      await run.sync()
      await run.load(parent.location)
      const child2 = await run.load(child.location)
      expect(child2.caller.origin).to.equal(parent.origin)
      expect(child2.caller.constructor.name).to.equal('Parent') // TODO: compare with type
    })

    it('caller is this', async () => {
      class A extends Jig {
        init () { this.f() }

        f () { this.caller = caller }
      }
      const a = await new A().sync()
      expect(a.caller).to.equal(a)
      const a2 = await run.load(a.location)
      expect(a2.caller).to.equal(a2)
    })

    it('calling a method on the caller', async () => {
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

    it('local variable caller takes precedence', async () => {
      class A extends Jig { init () { const caller = 2; this.n = caller } }
      const a = await new A().sync()
      expect(a.n).to.equal(2)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('dependency caller takes precedence', async () => {
      function caller () { return 2 }
      class A extends Jig { init () { this.n = caller() } }
      A.deps = { caller }
      const a = await new A().sync()
      expect(a.n).to.equal(2)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('set caller is error', () => {
      class A extends Jig { init () { caller = 1 } } // eslint-disable-line
      expect(() => new A()).to.throw('Cannot set property caller')
    })
  })

  describe('internal properties and methods', () => {
    it('calling a read-only method on an internal property from outside', () => {
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

    it('calling a read-only method on an internal property from another jig', () => {
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

    it('calling a write method on an internal property from outside', () => {
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

    it('calling a write method on an internal property from another jig', () => {
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

    it('internal methods do not require args to be serializable', () => {
      class A extends Jig { init () { this.arr = [1, 2, 3] } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.arr.filter(x => x === 1)).not.to.throw()
      expect(() => a.arr.indexOf(Symbol.hasInstance)).not.to.throw()
    })

    it('saving an internal property on another jig throws', () => {
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
      expect(() => b.f(a)).to.throw('property x is owned by a different jig')
      expect(() => b.g(a)).to.throw('property y is owned by a different jig')
      expect(() => b.h(a)).to.throw('property z is owned by a different jig')
    })

    it('saving a copy of an internal property on another jig does not throw', () => {
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) { this.x = { ...a.obj } }

        g (a) { this.y = [...a.arr] }

        h (a) { this.z = new Uint8Array(a.buf) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).not.to.throw()
      expect(() => b.g(a)).not.to.throw()
      expect(() => b.h(a)).not.to.throw()
    })

    it('saving an internal method on another jig throws', () => {
      class A extends Jig { init () { this.arr = [] } }
      class B extends Jig { f (a) { this.x = a.arr.filter } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('property x is owned by a different jig')
    })
  })
})
