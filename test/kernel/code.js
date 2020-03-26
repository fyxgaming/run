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
    // await run.deploy(function render () { return 1 })
    class Monster {}
    await run.deploy(class Dragon extends Monster {})
    // await run.deploy(x => x)
    // await run.deploy(class {})

    // TODO: Detect undeployable
    // await run.deploy('class A { }')

    // class B { }
    // B.locationMocknet = '123'
    // await run.deploy(B)
  })
})
