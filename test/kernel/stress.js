/**
 * stress.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Stress
// ------------------------------------------------------------------------------------------------

describe('Stress', () => {
  it('jig and class updates', async () => {
    const run = new Run({ timeout: Number.MAX_VALUE })
    let last = null
    class B extends Jig { set (n) { this.n = n } }
    const b = new B()
    for (let i = 0; i < 1; i++) {
      console.log(i)
      run.transaction(() => {
        b.set(i)
        class A { }
        A.last = last
        last = run.deploy(A)
      })
      if (i % 10 === 0) run.blockchain.block()
      await last.sync()
    }
    const start = new Date()
    await run.load(last.location)
    console.log(new Date() - start)

    const start2 = new Date()
    run.cache = new LocalCache()
    await run.load(b.location)
    console.log(new Date() - start2)
  })
})

// ------------------------------------------------------------------------------------------------
