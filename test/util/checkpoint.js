/**
 * checkpoint.js
 *
 * Tests for lib/util/checkpoint.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../config')
const { Jig } = Run
const { Checkpoint } = Run._util

describe('Checkpoint', () => {
  describe('constructor', () => {
    it('test', async () => {
      const run = new Run() // eslint-disable-line

      class Store extends Jig {
        init (x) { this.x = x }
      }

      const a = new Store({})
      const b = new Store({ ...a.x })
      //   const b = new Store(a.x)

      await run.sync()

      // eslint-disable-next-line
      const checkpoint = new Checkpoint(b, run.code, run.owner)
    })
  })
})
