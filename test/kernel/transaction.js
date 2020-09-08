/**
 * transaction.js
 *
 * Tests for lib/kernel/transaction.js
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Transaction } = Run

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

describe('Transaction', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // ------------------------------------------------------------------------

  it('basic', async () => {
    const run = new Run()
    class A extends Jig { }
    const [a, b] = run.transaction(() => [new A(), new A()])
    await run.sync()
    expect(a.location.slice(0, 64)).to.equal(b.location.slice(0, 64))
  })

  // --------------------------------------------------------------------------

  it('manual publish', async () => {
    new Run() // eslint-disable-line
    class A extends Jig { }
    const tx = new Transaction()
    const a = tx.update(() => new A())
    const b = tx.update(() => new A())
    await tx.publish()
    expect(a.location.slice(0, 64)).to.equal(b.location.slice(0, 64))
  })

  // --------------------------------------------------------------------------

  it('throws if update outside before publish', async () => {
    new Run() // eslint-disable-line
    class A extends Jig { f () { this.n = 1 } }
    const tx = new Transaction()
    const a = tx.update(() => new A())
    expect(() => a.f()).to.throw('Cannot link')
    await tx.publish()
    a.f()
    await a.sync()
  })

  // --------------------------------------------------------------------------

  it('rollback', async () => {
    new Run() // eslint-disable-line
    class A extends Jig { f () { this.n = 1 } }
    const a = new A()
    await a.sync()
    const tx = new Transaction()
    tx.update(() => a.f())
    expect(a.n).to.equal(1)
    tx.rollback()
    expect(typeof a.n).to.equal('undefined')
    expect(a.location).to.equal(a.origin)
  })

  // --------------------------------------------------------------------------

  it('export', async () => {
    const run = new Run()
    class A extends Jig { }
    const tx = new Transaction(() => run.deploy(A))
    const rawtx = await tx.export()
    expect(typeof rawtx).to.equal('string')
    expect(rawtx.length > 0).to.equal(true)
  })

  // --------------------------------------------------------------------------

  it('import', async () => {
    const run = new Run()
    class A extends Jig { }
    const tx = new Transaction(() => run.deploy(A))
    const rawtx = await tx.export()
    const tx2 = await run.import(rawtx)
    tx2.update(() => run.deploy(class B { }))
    await tx2.publish()
  })

  // --------------------------------------------------------------------------

  it.skip('placeholder', () => {
    // TODO
    // - Between begin and end, dont allow sync. nor load. nor import.
  })
})

// ------------------------------------------------------------------------------------------------
