/**
 * transaction.js
 *
 * Tests for lib/kernel/transaction.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

describe('Transaction', () => {
  it('test', async () => {
    const run = new Run()
    class A extends Jig { }
    const [a, b] = run.transaction(() => [new A(), new A()])
    await run.sync()
    console.log('a', a)
    console.log('b', b)
  })
})

// ------------------------------------------------------------------------------------------------
