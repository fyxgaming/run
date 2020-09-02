/**
 * static.js
 *
 * Tests for static code
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// Static Code
// ------------------------------------------------------------------------------------------------

describe('Static Code', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  it('can return unserializables', () => {
    const run = new Run()
    function f () { return /abc/ }
    const cf = run.deploy(f)
    expect(() => cf()).not.to.throw()
  })

  // --------------------------------------------------------------------------

  it('can pass unserializable args', () => {
    const run = new Run()
    function f () { }
    const cf = run.deploy(f)
    expect(() => cf(Promise.resolve())).not.to.throw()
  })

  // --------------------------------------------------------------------------

  it('no this inside', () => {
    const run = new Run()
    function f () { return this }
    const cf = run.deploy(f)
    expect(cf()).to.equal(undefined)
  })
})

// ------------------------------------------------------------------------------------------------
