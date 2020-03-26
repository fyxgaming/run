/**
 * code.js
 *
 * Tests for code deployment, loading, and sandboxing.
 */

const { describe, it } = require('mocha')
const { Run } = require('../config')

describe('Code', () => {
  it.only('should deploy', async () => {
    const run = new Run({ logger: console })
    function f () { return 1 }
    const location = await run.deploy(f)
    console.log(location)
  })
})
