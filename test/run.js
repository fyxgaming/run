/**
 * run.js
 *
 * Tests for lib/run.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('./env/run')
const { Jig, LocalCache } = Run

describe('Run', () => {
  it('code whitelist', async () => {
    const run = new Run()
    class A extends Jig { }
    run.deploy(A)
    await run.sync()

    const run2 = new Run({ codeWhitelist: [] })
    run2.cache = new LocalCache()
    await expect(run2.load(A.location)).to.be.rejectedWith('Transaction not whitelisted for code')
    run2.codeWhitelist = [A.location.slice(0, 64)]
    await run2.load(A.location)
  })
})
