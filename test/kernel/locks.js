/**
 * locks.js
 *
 * Tests for custom owner locks
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// Locks
// ------------------------------------------------------------------------------------------------

describe('Locks', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  describe('deploy', () => {
    it.skip('deploys with custom lock', async () => {
      // TODO: Use custom owner

      const run = new Run()

      class L {
        script () { return new Uint8Array() }
        domain () { return 0 }
      }
      run.deploy()

      class A {
        static send (to) { this.owner = to }
      }

      A.send = () => { throw new Error('Must call methods on jigs') }
      const CA = run.deploy(A)
      run.deploy(CA)
      await run.sync()
      CA.send(new L())
      await CA.sync()
      expect(A.location.startsWith('commit://'))
    })

    // ------------------------------------------------------------------------

    it.skip('fails to deploy if lock class undeployed', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
