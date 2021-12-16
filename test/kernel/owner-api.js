/**
 * owner-api.js
 *
 * Tests for the Owner plugin
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
require('chai').use(require('chai-as-promised'))
const Run = require('../env/run')
const { Jig } = Run
const bsv = require('bsv')

// ------------------------------------------------------------------------------------------------
// Owner API
// ------------------------------------------------------------------------------------------------

describe('Owner API', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // sign
  // --------------------------------------------------------------------------

  describe('sign', () => {
    it('throws if sign returns invalid tx', async () => {
      const run = new Run()
      class A extends Jig {}
      run.deploy(A)
      await run.sync()
      async function testFail (f) {
        run.owner.sign = f
        const error = 'Invalid raw transaction returned by owner'
        const tx = new Run.Transaction()
        tx.update(() => new A())
        await expect(tx.sign()).to.be.rejectedWith(error)
      }
      await testFail(() => undefined)
      await testFail(() => null)
      await testFail(() => new bsv.Transaction())
      await testFail(() => true)
      await testFail(() => 'abc')
      await testFail(rawtx => new bsv.Transaction(rawtx))
    })

    // ------------------------------------------------------------------------

    it.skip('throws if sign returns different tx', () => {
      // TODO
    })

    // TODO - Add tests
  })

  // --------------------------------------------------------------------------
  // nextOwner
  // --------------------------------------------------------------------------

  describe('nextOwner', () => {
    // TODO - Add tests
  })
})

// ------------------------------------------------------------------------------------------------
