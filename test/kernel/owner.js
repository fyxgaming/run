/**
 * owner.js
 *
 * Tests for owner binding changes
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const { Jig } = Run
const { LocalCache } = Run.plugins
const PrivateKey = require('bsv/lib/privatekey')

// ------------------------------------------------------------------------------------------------
// Owner
// ------------------------------------------------------------------------------------------------

describe('Owner', () => {
  it('assigned to creator owner', async () => {
    const run = new Run()
    class A extends Jig { init () { this.ownerAtInit = this.owner } }
    class B extends Jig { create () { return new A() } }
    B.deps = { A }
    function test (a, b) {
      expect(a.owner).to.equal(b.owner)
      expect(a.ownerAtInit).to.equal(b.owner)
    }
    const b = new B()
    await b.sync()
    const a = b.create()
    test(a, b)
    await a.sync()
    const a2 = await run.load(a.location)
    const b2 = await run.load(b.location)
    test(a2, b2)
    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    const b3 = await run.load(b.location)
    test(a3, b3)
  })

  // --------------------------------------------------------------------------

  it('set owner during init', async () => {
    const run = new Run()
    class A extends Jig { init (owner) { this.owner = owner } }
    const network = run.blockchain.network === 'main' ? 'mainnet' : 'testnet'
    const addr = new PrivateKey(network).toPublicKey().toAddress().toString()
    function test (a) { expect(a.owner).to.equal(addr) }
    const a = new A(addr)
    await a.sync()
    test(a)
    const a2 = await run.load(a.location)
    test(a2)
    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    test(a3)
  })

  // --------------------------------------------------------------------------

  it.skip('may change assigned creator owner', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('throws if creator owner is undetermined', () => {
      new Run() // eslint-disable-line
    class A extends Jig { init () { this.ownerAtInit = this.owner } }
    class B extends Jig { create () { return new A() } }
    B.deps = { A }
    const b = new B()
    expect(() => b.create()).to.throw('Cannot read owner')
  })

  // --------------------------------------------------------------------------

  it('throws if read before assigned', () => {
      new Run() // eslint-disable-line
    class A extends Jig { init () { this.ownerAtInit = this.owner }}
    expect(() => new A()).to.throw('Cannot read owner')
  })

  // --------------------------------------------------------------------------

  it('throws if invalid', () => {
      new Run() // eslint-disable-line
    class A extends Jig { f (owner) { this.owner = owner } }
    const a = new A()
    expect(() => a.f(new PrivateKey().publicKey)).to.throw()
    expect(() => a.f('123')).to.throw()
    expect(() => a.f(null)).to.throw()
    expect(() => a.f(undefined)).to.throw()
  })

  // --------------------------------------------------------------------------

  it('throws if delete bound owner', () => {
      new Run() // eslint-disable-line
    class A extends Jig { f () { delete this.owner }}
    const a = new A()
    expect(() => { delete a.owner }).to.throw('Cannot delete owner')
    expect(() => a.f()).to.throw('Cannot delete owner')
  })

  // --------------------------------------------------------------------------

  it.skip('throws if delete unassigned owner', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it.skip('throws if delete unbound owner', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it.skip('throws if set externally', () => {
      new Run () // eslint-disable-line
    class A extends Jig { }
    const a = new A()
    const error = 'Attempt to update [jig A] outside of a method'
    const addr = new PrivateKey().publicKey.toAddress().toString()
    expect(() => { a.owner = addr }).to.throw(error)
  })

  // --------------------------------------------------------------------------

  it('throws if set to address on another network', async () => {
      new Run() // eslint-disable-line
    class A extends Jig { send (addr) { this.owner = addr } }
    const a = new A()
    await a.sync()
    const addr = new PrivateKey('mainnet').toAddress().toString()
    a.send(addr)
    await expect(a.sync()).to.be.rejectedWith('Invalid owner')
  })

  // --------------------------------------------------------------------------

  it.skip('may read if assigned from parent', () => {

  })

  // --------------------------------------------------------------------------

  it.skip('bound if assigned from bound parent', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it.skip('unbound if assigned from unbound parent', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it.skip('unbound if assigned to owner in init', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it.skip('may change until marked unbound', () => {
      new Run() // eslint-disable-line
    class A extends Jig { f (owner) { this.owner = owner; this.owner = owner } }
    const addr = new PrivateKey().toPublicKey().toAddress().toString()
    const a = new A(addr)
    expect(() => a.f(addr)).to.throw('Cannot set owner')
  })

  // --------------------------------------------------------------------------

  it.skip('marks unbound after first inner method leaves', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it.skip('throws if change after unbound', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('reads jig', async () => {
    const run = new Run()
    class A extends Jig { f (a) { this.x = a.owner }}
    const a = new A()
    const b = new A()
    await run.sync()

    function test (a, b) { expect(b.x).to.equal(a.owner) }

    expectTx({
      nin: 1,
      nref: 2,
      nout: 1,
      ndel: 0,
      ncre: 0,
      exec: [
        {
          op: 'CALL',
          data: [{ $jig: 0 }, 'f', [{ $jig: 1 }]]
        }
      ]
    })

    b.f(a)
    test(a, b)
    await b.sync()

    const a2 = await run.load(a.location)
    const b2 = await run.load(b.location)
    test(a2, b2)

    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    const b3 = await run.load(b.location)
    test(a3, b3)
  })

  // --------------------------------------------------------------------------

  it('only class can create instance', async () => {
    class A extends Jig {
      init () { if (this.owner !== A.owner) throw new Error() }
      static create () { return new A() }
    }
    const run = new Run()
    const A2 = run.deploy(A)
    await A2.sync()
    expect(() => new A()).to.throw()
    const a = A2.create()
    await a.sync()
    await run.load(a.location)
    run.cache = new LocalCache()
    await run.load(a.location)
  })
})

// ------------------------------------------------------------------------------------------------
