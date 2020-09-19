/**
 * transaction.js
 *
 * Tests for lib/kernel/transaction.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
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

  // --------------------------------------------------------------------------

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
    expect(() => a.f()).to.throw('Cannot update [jig A]: open transaction')
    tx.publish()
    a.f()
    await a.sync()
  })

  // --------------------------------------------------------------------------

  it('throws if auth outside before publish', async () => {
    new Run() // eslint-disable-line
    class A extends Jig { }
    const tx = new Transaction()
    const a = tx.update(() => new A())
    expect(() => a.auth()).to.throw('Cannot auth [jig A]: open transaction')
    await tx.export()
    expect(() => a.auth()).to.throw('Cannot auth [jig A]: open transaction')
    await tx.publish()
    a.auth()
    await a.sync()
  })

  // --------------------------------------------------------------------------

  it('allowed to read outside before publish', async () => {
    new Run() // eslint-disable-line
    class A extends Jig { g () { return this.n } }
    const tx = new Transaction()
    const a = tx.update(() => new A())
    a.g()
    tx.publish()
    a.g()
    await a.sync()
  })

  // --------------------------------------------------------------------------

  it('allowed to read after export', async () => {
    new Run() // eslint-disable-line
    class A extends Jig { g () { return this.n } }
    const tx = new Transaction()
    const a = tx.update(() => new A())
    a.g()
    const promise = tx.export()
    a.g()
    await promise
    a.g()
    tx.publish()
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

  it('throws if use undeployed jig after rollback', async () => {
    new Run() // eslint-disable-line
    class A extends Jig { }
    const tx = new Transaction()
    const a = tx.update(() => new A())
    tx.rollback()
    await expect(a.sync()).to.be.rejectedWith('Cannot sync')
    expect(() => a.location).to.throw('Cannot read location')
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

  it('export with upstream commits', async () => {
    new Run() // eslint-disable-line
    class B extends Jig { }
    class A extends Jig {
      init (b) {
        this.b = b
      }
    }
    const transaction = new Run.Transaction()
    const b = new B()
    transaction.update(() => new A(b))
    await transaction.export()
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

  it('upstream commits', async () => {
    const run = new Run()
    class A { }
    run.deploy(A)
    const B = run.transaction(() => run.deploy(class B extends A {}))
    await B.sync()
  })

  // --------------------------------------------------------------------------

  it('outputs and deletes', () => {
    new Run() // eslint-disable-line
    class A extends Jig { }
    const a = new A()
    const transaction = new Transaction()
    transaction.update(() => a.auth())
    const b = transaction.update(() => new A())
    transaction.update(() => b.destroy())
  })

  // --------------------------------------------------------------------------

  it.skip('placeholder', () => {
    // TODO
    // - Between begin and end, dont allow sync. nor load. nor import. publish failure
  })
})

// ------------------------------------------------------------------------------------------------
