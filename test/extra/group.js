/**
 * group.js
 *
 * Tests for lib/extra/group.js
 */

const { describe, it } = require('mocha')

// ------------------------------------------------------------------------------------------------
// Group
// ------------------------------------------------------------------------------------------------

describe('Group', () => {
  it('test', async () => {
    const { Run } = require('../env/config')
    const { Jig } = Run
    class A extends Jig { set () { this.n = 1 } }
    const a = new A()
    a.set()
    await a.sync()
    console.log(a.n)
  })
})

// ------------------------------------------------------------------------------------------------
