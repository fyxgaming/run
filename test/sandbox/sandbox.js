/**
 * sandbox.js
 *
 * Tests for the sandbox
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Sandbox = unmangle(unmangle(Run)._Sandbox)

// ------------------------------------------------------------------------------------------------
// Sandbox
// ------------------------------------------------------------------------------------------------

describe('Sandbox', () => {
  it.skip('sandboxes code', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it('proxies console', () => {
    const logs = []
    const oldConsoleLog = console.log
    try {
      console.log = (msg) => logs.push(msg)
      Sandbox._evaluate('console.log("hello")')
      const A = Sandbox._evaluate('class A { static f() { console.log("world") } }')[0]
      A.f()
    } finally {
      console.log = oldConsoleLog
    }
    expect(logs).to.deep.equal(['hello', 'world'])
  })

  // --------------------------------------------------------------------------

  it('configuration objects not present', () => {
    expect(Sandbox._evaluate('typeof makeDeterministic')[0]).to.equal('undefined')
    expect(Sandbox._evaluate('typeof SES')[0]).to.equal('undefined')
    expect(Sandbox._evaluate('typeof Compartment')[0]).to.equal('undefined')
    expect(Sandbox._evaluate('typeof m')[0]).to.equal('undefined')
    expect(Sandbox._evaluate('typeof n')[0]).to.equal('undefined')
    expect(Sandbox._evaluate('typeof C')[0]).to.equal('undefined')
  })

  // --------------------------------------------------------------------------

  it.skip('can set globals', () => {
    // TODO
  })

  // --------------------------------------------------------------------------

  it.skip('intrinsics frozen', () => {
    /*
    const run = new Run()
    function f () {
      Array.n = 1
      // Array.prototype.filter.n = 1
      return Array.prototype.filter.n
    }
    const cf = run.deploy(f)
    console.log(cf())
    */
  })

  // --------------------------------------------------------------------------

  it.skip('intrinsic prototypes frozen', () => {
    /*
    const run = new Run()
    function f () {
      Array.n = 1
      // Array.prototype.filter.n = 1
      return Array.prototype.filter.n
    }
    const cf = run.deploy(f)
    console.log(cf())
    */
  })
})

// ------------------------------------------------------------------------------------------------
