/**
 * jig.js
 *
 * Tests for lib/kernel/jig.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

describe('Jig', () => {
  describe('constructor', () => {
    it('basic jig', async () => {
      // const run = new Run()
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      // await run.sync()
      await a.sync()
      console.log(a)
      // a.sync()
      /*
      expectAction(a, 'init', [], [], [a], [])
      expect(unmangle(run.code)._installs.has(A)).to.equal(true)
      await run.sync()
      expect(A.origin.length).to.equal(67)
      */
    })
  })
})

// ------------------------------------------------------------------------------------------------
