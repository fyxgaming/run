/**
 * berry.js
 *
 * Tests for lib/kernel/berry.js
 */

const { describe, it, afterEach } = require('mocha')
const Run = require('../env/run')
const { Berry } = Run

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

describe('Berry', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  it('basic berry', async () => {
    const run = new Run()
    class B extends Berry { static pluck () { return new B() } }
    const CB = run.deploy(B)
    await run.sync()
    const b = await run.load('abc', { berry: CB })
    console.log(b)
  })

  // Tests
  // - load with undeployed berry class
  // - load with invalid string throws
  // - load with non-berry class throws
  // - immutable externally
  // - immutable internally
  // - can call functions
  // - not a jig - no auth, destroy, sync, etc.
  // - cannot be upgraded
  // - if dependencies are upgraded, when berry is loaded, it uses original
  // - instanceof code
  // - instanceof local
  // - instanceof authd, destroyd
  // - sync destroyed/authd berry in jig
})

// ------------------------------------------------------------------------------------------------
