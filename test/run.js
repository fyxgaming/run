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

  it('zhell infinite loop', async () => {
    const run = new Run({ network: 'test' })
    const location = '7dca6829e7ffd1d5cd3db43955ab2c3b6f58900db03c4cd4e2d14e703dea5a18_o1'
    const X = await run.load(location)
    await X.sync()
  })

  it.only('infinite loop during inner sync', async () => {
    const run = new Run()
    class A extends Jig { set (x) { this.x = x } }
    const a = new A()
    const b = new A()
    a.set(b)
    await a.sync()
    const ao = await run.load(a.origin)
    b.set(ao)
    await b.sync()
    await run.sync()
    await ao.sync()
  })
})
