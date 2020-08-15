/**
 * sealed.js
 *
 * Tests for sealed functionality on code
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const unmangle = require('../env/unmangle')
const { LocalCache } = unmangle(Run)

// ------------------------------------------------------------------------------------------------
// Sealed
// ------------------------------------------------------------------------------------------------

describe('Sealed', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Deploy
  // --------------------------------------------------------------------------

  describe('deploy', () => {
    it('owner sealed by default', async () => {
      const run = new Run()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      expectTx({
        nin: 1,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class B extends A { }',
              {
                deps: { A: { $jig: 0 } }
              }
            ]
          }
        ]
      })

      class B extends A { }
      const CB = run.deploy(B)
      await CB.sync()

      run.cache = new LocalCache()
      await run.load(CB.location)
    })

    // ------------------------------------------------------------------------

    it('sealed', async () => {
      const run = new Run()
      class A { }
      A.sealed = true
      const CA = run.deploy(A)
      await CA.sync()
      class B extends A {}
      expect(() => run.deploy(B)).to.throw('Parent class sealed')
    })

    // ------------------------------------------------------------------------

    it('unsealed', async () => {
      const run = new Run()

      class A { }
      A.sealed = false
      const CA = run.deploy(A)
      await CA.sync()

      expectTx({
        nin: 0,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 1,
        exec: [
          {
            op: 'DEPLOY',
            data: [
              'class B extends A { }',
              {
                deps: { A: { $jig: 0 } }
              }
            ]
          }
        ]
      })

      class B extends A { }
      const CB = run.deploy(B)
      await CB.sync()
    })

    // ------------------------------------------------------------------------

    it('throws if sealed and undeployed', () => {
      const run = new Run()
      class A { }
      A.sealed = true
      class B extends A { }
      const error = 'Parent class sealed'
      expect(() => run.deploy(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if invalid', () => {
      const run = new Run()
      class A { }
      A.sealed = null
      expect(() => run.deploy(A)).to.throw('Invalid sealed option: null')
      A.sealed = 1
      expect(() => run.deploy(A)).to.throw('Invalid sealed option: 1')
    })

    // ------------------------------------------------------------------------

    it.skip('unseal and extend then reseal in a method', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Upgrade
  // --------------------------------------------------------------------------

  describe('upgrade', () => {
    it('owner sealed', async () => {
      const run = new Run()

      class O { }
      const CO = run.deploy(O)
      await CO.sync()

      class A { }
      const CA = run.deploy(A)
      await CA.sync()

      expectTx({
        nin: 2,
        nref: 0,
        nout: 2,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class B extends A { }',
              {
                deps: { A: { $jig: 1 } }
              }
            ]
          }
        ]
      })

      class B extends CA { }
      const CB = CO.upgrade(B)
      await CB.sync()

      run.cache = new LocalCache()
      await run.load(CB.location)
    })

    // ------------------------------------------------------------------------

    it('unsealed', async () => {
      const run = new Run()

      class O { }
      const CO = run.deploy(O)
      await CO.sync()

      class A { }
      A.sealed = false
      const CA = run.deploy(A)
      await CA.sync()

      expectTx({
        nin: 1,
        nref: 1,
        nout: 1,
        ndel: 0,
        ncre: 0,
        exec: [
          {
            op: 'UPGRADE',
            data: [
              { $jig: 0 },
              'class B extends A { }',
              {
                deps: { A: { $jig: 1 } }
              }
            ]
          }
        ]
      })

      class B extends CA { }
      const CB = CO.upgrade(B)
      await CB.sync()

      run.cache = new LocalCache()
      await run.load(CB.location)
    })

    // ------------------------------------------------------------------------

    it('throws if parent sealed', async () => {
      const run = new Run()

      class O { }
      const CO = run.deploy(O)

      class A { }
      A.sealed = true
      const CA = run.deploy(A)

      class B extends CA { }
      const error = 'Parent class sealed'
      expect(() => CO.upgrade(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if sealed and undeployed', () => {
      const run = new Run()
      class O { }
      const CO = run.deploy(O)
      class A { }
      A.sealed = true
      class B extends A { }
      const error = 'Parent class sealed'
      expect(() => CO.upgrade(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if invalid', () => {
      const run = new Run()
      class O { }
      const CO = run.deploy(O)
      class A { }
      A.sealed = null
      expect(() => CO.upgrade(A)).to.throw('Invalid sealed option: null')
      A.sealed = 1
      expect(() => CO.upgrade(A)).to.throw('Invalid sealed option: 1')
    })

    // ------------------------------------------------------------------------

    it.skip('unseal and extend then reseal in a method', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
