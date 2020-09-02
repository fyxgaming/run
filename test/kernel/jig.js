/**
 * jig.js
 *
 * Tests for lib/kernel/jig.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const { testRecord } = require('../env/misc')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Jig
// ------------------------------------------------------------------------------------------------

describe('Jig', () => {
  describe('constructor', () => {
    it('basic jig', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      testRecord(record => {
        const a = new A() //eslint-disable-line
        console.log(record._creates.length)
      })
      // await a.sync()

      // TODO
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
