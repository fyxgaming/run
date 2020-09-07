/**
 * transaction.js
 *
 * Tests for lib/kernel/transaction.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Transaction } = Run

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

describe('Transaction', () => {
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
})

// ------------------------------------------------------------------------------------------------
