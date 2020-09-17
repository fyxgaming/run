/**
 * recent.js
 *
 * Tests for mustBeRecent functionality
 */

const { describe, it } = require('mocha')

// ------------------------------------------------------------------------------------------------
// Recent
// ------------------------------------------------------------------------------------------------

describe('Recent', () => {
  it('TODO', () => {
  })

  // A destroyed jig does not fail recent

  /*
    it('throws if unknown whether read is stale', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      const b = new B()
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(1)
      run.blockchain.spends = async txid => {
        if (txid === a.origin.slice(0, 64)) throw new Error('hello')
        return null
      }
      b.apply(a)
      await expect(run.sync()).to.be.rejectedWith('Aborting broadcast. A referenced jig may not be the latest.')
    })

    it('throws if read is stale during load', async () => {
      const run = createHookedRun()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      const b = new B()
      a.set(1)
      await run.sync()
      b.apply(a)
      const a2 = await run.load(a.location)
      a2.set(2)
      await run.sync()
      // create a new run to not use the cache
      const run2 = new Run({ cache: new Run.LocalCache() })
      const oldFetch = run.blockchain.fetch
      try {
        run2.blockchain.time = async txid => {
          const hours = 60 * 60 * 1000
          if (txid === a.location.slice(0, 64)) return Date.now() - 8 * hours
          if (txid === a2.location.slice(0, 64)) return Date.now() - 6 * hours
          if (txid === b.location.slice(0, 64)) return Date.now()
        }
        await expect(run2.load(b.location)).to.be.rejectedWith(`${a.location} is stale. Aborting.`)
      } finally { run.blockchain.fetch = oldFetch }
    })
    */
})

// ------------------------------------------------------------------------------------------------
