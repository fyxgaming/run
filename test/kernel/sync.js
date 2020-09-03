/**
 * sync.js
 *
 * Tests for sync functionality
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { Transaction } = require('bsv')
const Run = require('../env/run')
const { Jig, LocalCache } = Run
const { payFor } = require('../env/misc')

// ------------------------------------------------------------------------------------------------
// Sync
// ------------------------------------------------------------------------------------------------

describe('Sync', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // Only waits for current record
  // TODO: Sync a destroyed jig
  // TODO: Sync a jig that failed to deploy to deploy it again
  // TODO: Forward sync code

  // --------------------------------------------------------------------------
  // Sync
  // --------------------------------------------------------------------------

  describe('Sync', () => {
    it.skip('sync with warning when UTXO is incorrectly spent', async () => {
      const run = new Run()

      class A { }
      const C = run.deploy(A)

      await C.sync()
      const location = C.location

      const utxos = await run.blockchain.utxos(run.owner.address)
      const tx = new Transaction().from(utxos)
      const paid = await payFor(tx, run)
      const signed = paid.sign(run.owner.privkey)
      await run.blockchain.broadcast(signed.toString('hex'))

      await C.sync()
      expect(C.location).to.equal(location)
    })

    // ------------------------------------------------------------------------

    it.skip('publishes after dependent transaction', async () => {
      const run = new Run()

      class A { }
      class B extends A { }
      A.B = B

      const A2 = run.deploy(A)
      await A2.sync()

      await run.load(A.location)

      const B2 = await run.load(B.location)

      class C extends B2 { }
      run.deploy(C)
      await run.sync()
    })

    // ------------------------------------------------------------------------

    it('throws if attempt to update an old state', async () => {
      const run = new Run()
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      await run.sync()
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      a2.set(1)
      await a2.sync()
      a.set(2)
      await expect(a.sync()).to.be.rejectedWith('txn-mempool-conflict')
      expect(a.x).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('throws if spend tx does not exist', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      run.blockchain.spends = () => '123'
      try {
        await expect(a.sync()).to.be.rejectedWith('No such mempool or blockchain transaction')
      } finally {
        run.deactivate()
      }
    })

    // ------------------------------------------------------------------------

    it('throws if spend is incorrect', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      const b = new A()
      await run.sync()
      run.blockchain.spends = () => b.location.slice(0, 64)
      try {
        await expect(a.sync()).to.be.rejectedWith('Jig not spent in the transaction')
      } finally {
        run.deactivate()
      }
    })

    // ------------------------------------------------------------------------

    it('disable forward sync', async () => {
      const run = new Run()
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      await run.sync()
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      a2.set(1)
      await a2.sync()
      expect(a.x).to.equal(undefined)
      await a.sync({ forward: false })
      expect(a.x).to.equal(undefined)
    })

    // ------------------------------------------------------------------------

    it('throws if forward sync is unsupported', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync() // pending transactions must publish first
      run.blockchain.spends = async () => { throw new Error('spends') }
      try {
        await expect(a.sync()).to.be.rejected
      } finally {
        run.deactivate()
      }
    })

    // ------------------------------------------------------------------------

    it('forward sync inner jigs', async () => {
      const run = new Run()
      class Store extends Jig { set (x, y) { this[x] = y } }
      const a = new Store()
      const b = new Store()
      a.set('b', b)
      await run.sync()
      run.cache = new LocalCache()
      const b2 = await run.load(b.location)
      b2.set('n', 1)
      await b2.sync()
      expect(a.b.n).to.equal(undefined)
      await a.sync()
      expect(a.b.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('forward sync circularly referenced jigs', async () => {
      const run = new Run()
      class A extends Jig { setB (b) { this.b = b } }
      class B extends Jig { setA (a) { this.a = a } }
      const a = new A()
      const b = new B()
      a.setB(b)
      await run.sync()
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      const b2 = await run.load(b.location)
      b2.setA(a2)
      await b2.sync()
      expect(a.b.a).to.equal(undefined)
      await a.sync()
      expect(a.b.a.location).to.equal(a.location)
    })

    // ------------------------------------------------------------------------

    it('forward sync', async () => {
      const run = new Run()
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      await a.sync()

      run.cache = new LocalCache()
      const a2 = await run.load(a.location)

      a2.set(1)
      a2.set(2)
      await a2.sync()

      expect(a.x).to.equal(undefined)
      await a.sync()
      expect(a.x).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('sync destroyed jig', async () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CA.destroy()
      await CA.sync()
      await CA.sync()
    })
  })

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    it('static class', async () => {
      const run = new Run()
      class A {}
      run.deploy(A)
      await run.sync()
      const A2 = await run.load(A.location)
      expect(A2.toString()).to.equal(A.toString())
      expect(A2.origin).to.equal(A.origin)
      expect(A2.location).to.equal(A.location)
    })

    // ------------------------------------------------------------------------

    it('deploys code', async () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      await CA.sync()
      expect(CA.location.length).to.equal(67)
    })
  })

  // --------------------------------------------------------------------------
  // Jig
  // --------------------------------------------------------------------------

  describe('Jig', () => {
    it('basic jig', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
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

    // ------------------------------------------------------------------------

    it('throws if called inside', () => {
      new Run() // eslint-disable-line
      class A extends Jig { init () { this.sync() } }
      class B extends Jig { f () { this.sync() } }
      expect(() => new A()).to.throw('sync cannot be called internally')
      const b = new B()
      expect(() => b.f()).to.throw('sync cannot be called internally')
    })

    // ------------------------------------------------------------------------

    it('sync jig updated by another', async () => {
      const run = new Run()
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
})

// ------------------------------------------------------------------------------------------------
