/**
 * group-lock.js
 *
 * Tests for lib/extra/group-lock.js
 */

const { describe, it, beforeEach } = require('mocha')
const { Run } = require('../env/config')
const { Jig, GroupLock } = Run

// ------------------------------------------------------------------------------------------------
// GroupLock
// ------------------------------------------------------------------------------------------------

describe('GroupLock', () => {
  const run = new Run()
  beforeEach(() => run.activate())

  it('should support 1-1 multisig', async () => {
    class A extends Jig {
      init (owner) { this.owner = owner }
      set () { this.n = 1 }
    }
    const a = new A(new GroupLock([run.owner.pubkey], 1))
    a.set()
    await a.sync()
  })

  it('should support 2-3 multisig', async () => {
    const run2 = new Run()
    const run3 = new Run()
    class A extends Jig {
      init (owner) { this.owner = owner }
      set () { this.n = 1 }
    }

    // Create a jig with a 2-3 group owner
    run.activate()
    const a = new A(new GroupLock([run.owner.pubkey, run2.owner.pubkey, run3.owner.pubkey], 2))
    await a.sync()

    // Sign with pubkey 1 and export tx
    run.transaction.begin()
    a.set()
    await run.transaction.pay()
    await run.transaction.sign()
    const tx = run.transaction.export()
    run.transaction.rollback()

    // Sign with pubkey 2 and broadcast
    run2.activate()
    await run2.transaction.import(tx)
    await run2.transaction.sign()
    run2.transaction.end()
    await run2.sync()
  })

  // Move to local owner?
  it('should not sign if already signed', () => {
    // TODO
  })

  it('should throw if pubkeys is not array', () => {
    // TODO
  })

  it('should throw if pubkeys is empty', () => {
    // TODO
  })

  it('should throw if pubkeys are not valid hex strings', () => {
    // TODO
  })

  it('should throw if m is out of range', () => {
    // TODO
  })

  it('should throw if more than 16 pubkeys', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
