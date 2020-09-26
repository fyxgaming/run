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

  it.skip('time travel', async () => {
    const loc = '62641f7433aca39be0bc9f0554cec02681895615b1e4c48696836e740731f28c_o1'

    const run = new Run({ network: 'test' })
    run.timeout = 100000

    const a = await run.load(loc)
    console.log('a sync')
    await a.sync()
    console.log('a sync done')

    const loc2 = '0ae342ebe0a31dd3562e155f120e8ed287655066b6f36cce56b234a6a48adda0_o1'
    const b = await run.load(loc2)

    console.log('b sync')
    await b.sync()
  })
})
