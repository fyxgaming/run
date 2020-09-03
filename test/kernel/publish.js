/**
 * publish.js
 *
 * Tests for Publish functionality
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Publish
// ------------------------------------------------------------------------------------------------

describe('Publish', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  it('should throw if inconsistent classes', async () => {
    const run = new Run()

    class A extends Jig {
      static f () { this.n = 1 }
      g (a2) { this.a2 = a2 }
    }

    const A2 = run.deploy(A)
    await A2.sync()

    const a1 = new A2()

    const A3 = await run.load(A2.location)
    A3.f()
    await A3.sync()
    expect(A2.location).not.to.equal(A3.location)

    const a2 = new A3()

    a2.g(a1)
    await expect(a2.sync()).to.be.rejectedWith('Inconsistent worldview')
  })
})

// ------------------------------------------------------------------------------------------------
