/**
 * run.js
 *
 * Tests for lib/run.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('./env/run')
const { Jig } = Run

describe('Run', () => {
  it('payload', async () => {
    const run = new Run()
    class A extends Jig { }
    run.deploy(A)
    await run.sync()
    const txid = A.location.slice(0, 64)
    const tx = await run.blockchain.fetch(txid)
    expect(typeof run.payload(tx)).to.equal('object')
  })
})
