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
})

// ------------------------------------------------------------------------------------------------
