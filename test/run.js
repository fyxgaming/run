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

  it.only('zhell infinite loop', async () => {
    const run = new Run({ network: 'test' })
    const location = '7dca6829e7ffd1d5cd3db43955ab2c3b6f58900db03c4cd4e2d14e703dea5a18_o1'
    const X = await run.load(location)
    console.log('--')
    await X.sync()
  })

  it('no infinite loops during forward sync inner jigs', async () => {
    const run = new Run()

    class A extends Jig { set (x) { this.x = x } }
    const a = new A()
    const b = new A()
    a.set(b)
    await a.sync()
    const ao = await run.load(a.origin)
    b.set(ao)
    await b.sync()

    // ao will be synced to a newer state where it has CB set
    // but b will refer back to ao again
    await ao.sync()

    expect(ao.location).to.equal(ao.x.x.location)
    expect(ao.x.location).to.equal(ao.x.x.x.location)
  })

  it('no infinite loops during forward sync inner code', async () => {
    const run = new Run()

    class A extends Jig { static set (x) { this.x = x } }
    class B extends Jig { static set (x) { this.x = x } }
    const CA = await run.deploy(A)
    const CB = await run.deploy(B)
    CA.set(CB)
    await CA.sync()
    const CAO = await run.load(CA.origin)
    CB.set(CAO)
    await CB.sync()

    // CAO will be synced to a newer state where it has CB set
    // but CB will refer back to CAO again
    await CAO.sync()

    expect(CAO.location).to.equal(CAO.x.x.location)
    expect(CAO.x.location).to.equal(CAO.x.x.x.location)
  })
})
