/**
 * publish.js
 *
 * Tests for Publish functionality
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Mockchain } = Run

// ------------------------------------------------------------------------------------------------
// Publish
// ------------------------------------------------------------------------------------------------

describe('Publish', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  it('throws if inconsistent jig classes', async () => {
    const run = new Run()
    class A extends Jig {
      static setOnClass (s) { this.s = s }
      setOnInstance (t) { this.t = t.toString() }
    }
    const CA = run.deploy(A)
    await CA.sync()
    const a1 = new CA()
    const CA2 = await run.load(CA.location)
    CA2.setOnClass(1)
    await CA2.sync()
    expect(CA.location).not.to.equal(CA2.location)
    const a2 = new CA2()
    expect(() => a2.setOnInstance(a1)).to.throw('Inconsistent worldview')
  })

  // --------------------------------------------------------------------------

  it('throws if inconsistent jig instances', async () => {
    const run = new Run()
    class A extends Jig { set (x) { this.x = x } }
    const a1 = new A()
    a1.set(1)
    await a1.sync()
    const a2 = await run.load(a1.origin)
    const b = new A()
    expect(() => b.set(a1, a2)).to.throw('Inconsistent worldview')
  })

  // --------------------------------------------------------------------------

  it('throws if different network', async () => {
    const run = new Run()
    class A extends Jig { f () { this.n = 1 } }
    const a = new A()
    await run.sync()
    const run2 = new Run({ blockchain: new Mockchain() })
    a.f()
    await expect(run2.sync()).to.be.rejectedWith('No such mempool or blockchain transaction')
  })
})

// ------------------------------------------------------------------------------------------------
