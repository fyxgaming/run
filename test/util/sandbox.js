/**
 * sandbox.js
 *
 * Tests for the sandbox
 */

const { describe, it } = require('mocha')

// ------------------------------------------------------------------------------------------------
// Sandbox
// ------------------------------------------------------------------------------------------------

describe('Sandbox', () => {
  it('sandboxes code', () => {

  })

  it('can set globals', () => {

  })

  it('intrinsics frozen', () => {
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

  it('intrinsic prototypes frozen', () => {
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
