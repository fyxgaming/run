/**
 * timeout.js
 *
 * Tests for global timeout functionality
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { stub } = require('sinon')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Timeout
// ------------------------------------------------------------------------------------------------

describe('Timeout', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // ------------------------------------------------------------------------

  it('load', async () => {
    const run = new Run()
    class A extends Jig { inc () { this.n = (this.n || 0) + 1 } }
    const a = new A()
    for (let i = 0; i < 10; i++) { a.inc() }
    await run.sync()
    run.cache = new LocalCache()
    run.timeout = 10
    await expect(run.load(a.location)).to.be.rejectedWith('load timeout')
  })

  // ------------------------------------------------------------------------

  it('sync', async () => {
    const run = new Run()
    class A extends Jig { inc () { this.n = (this.n || 0) + 1 } }
    const a = new A()
    for (let i = 0; i < 10; i++) { a.inc() }
    await run.sync()
    const a2 = await run.load(a.origin)
    run.cache = new LocalCache()
    run.timeout = 10
    await expect(a2.sync()).to.be.rejectedWith('sync timeout')
  })

  // ------------------------------------------------------------------------

  it('import', async () => {
    const run = new Run()
    class A extends Jig { inc () { this.n = (this.n || 0) + 1 } }
    const a = new A()
    for (let i = 0; i < 10; i++) { a.inc() }
    await run.sync()
    run.cache = new LocalCache()
    run.timeout = 10
    const txid = a.location.slice(0, 64)
    const rawtx = await run.blockchain.fetch(txid)
    await expect(run.import(rawtx)).to.be.rejectedWith('import timeout')
  })

  // ------------------------------------------------------------------------

  it('publish', async () => {
    const run = new Run()
    class A extends Jig { }
    const sleep = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))
    stub(run.purse, 'pay').callsFake(x => sleep(1000))
    run.timeout = 10
    const C = run.deploy(A)
    await expect(C.sync()).to.be.rejectedWith('publish timeout')
  })

  // ------------------------------------------------------------------------

  it('infinite timeout', async () => {
    const run = new Run()
    class A extends Jig { inc () { this.n = (this.n || 0) + 1 } }
    const a = new A()
    for (let i = 0; i < 10; i++) { a.inc() }
    await run.sync()
    run.cache = new LocalCache()
    run.timeout = Infinity
    await run.load(a.location)
  })
})

// ------------------------------------------------------------------------------------------------
