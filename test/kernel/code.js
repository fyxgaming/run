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
    await run.deploy(function render () { return 1 })
    await run.deploy(class Dragon {})
    await run.deploy(x => x)
    await run.deploy(class {})

    await run.deploy('class A { }')
  })
})
