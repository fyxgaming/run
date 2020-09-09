/**
 * stress.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { PERF } = require('../env/config')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Stress
// ------------------------------------------------------------------------------------------------

if (PERF) {
  describe('Stress', () => {
    it('long chain', async () => {
      const run = new Run({ timeout: Number.MAX_VALUE })
      let last = null
      class B extends Jig { set (n) { this.n = n } }

      const b = new B()
      for (let i = 0; i < 100; i++) {
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
      expect(new Date() - start < 1000).to.equal(true)

      const start2 = new Date()
      run.cache = new LocalCache()
      await run.load(b.location)
      expect(new Date() - start2 < 10000).to.equal(true)
    })

    // -------------------------------------------------------------------------

    it.skip('large graph', () => {
      // TODO
    })

    // -------------------------------------------------------------------------

    it('many publishes', async () => {
      const run = new Run()
      class A extends Jig { }
      for (let i = 0; i < 1000; i++) {
        const a = new A()
        await a.sync()
        if (i % 10 === 0) run.blockchain.block()
      }
    })

    // -------------------------------------------------------------------------

    it('many loads', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      for (let i = 0; i < 1000; i++) {
        run.cache = new LocalCache()
        await run.load(a.location)
        await run.load(a.location)
      }
    })
  })
}

// ------------------------------------------------------------------------------------------------
