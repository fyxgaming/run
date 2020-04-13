/**
 * group-lock.js
 *
 * Tests for lib/extra/group-lock.js
 */

const { describe, it } = require('mocha')

// ------------------------------------------------------------------------------------------------
// GroupLock
// ------------------------------------------------------------------------------------------------

describe('GroupLock', () => {
  it('should support 1-1 multisig', async () => {
    const { Run } = require('../env/config')
    const { Jig, GroupLock } = Run
    const run = new Run()
    class A extends Jig {
      init (owner) { this.owner = owner }
      set () { this.n = 1 }
    }
    const a = new A(new GroupLock([run.owner.pubkey], 1))
    a.set()
    await a.sync()
  })

  it('should support 2-3 multisig', async () => {
    // TODO
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
