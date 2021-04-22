/**
 * build.js
 *
 * Tests that check properties of the transactions RUN builds
 */

const { describe } = require('mocha')

// ------------------------------------------------------------------------------------------------
// Build
// ------------------------------------------------------------------------------------------------

describe('Build', () => {
  // TODO

  /*
  // export & publish
  it('should correctly set owners on code and jig outputs', async () => {
    const run = hookRun(new Run())
    const address = new bsv.PrivateKey().toAddress()
    class A extends Jig { f (owner) { this.owner = owner } }
    const a = new A()
    await a.sync()
    expect(tx.outputs[1].script.toAddress().toString()).to.equal(run.owner.address)
    expect(tx.outputs[2].script.toAddress().toString()).to.equal(run.owner.address)
    a.f(address.toString())
    await a.sync()
    expect(tx.outputs[1].script.toAddress().toString()).to.equal(address.toString())
  })

  // export & publish
  it('should correctly set satoshis on code and jig outputs', async () => {
    const run = hookRun(new Run())
    class A extends Jig { f (satoshis) { this.satoshis = satoshis } }
    const a = new A()
    await a.sync()
    expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
    expect(tx.outputs[2].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
    a.f(1)
    await a.sync()
    expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
    a.f(0)
    await a.sync()
    expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
    a.f(bsv.Transaction.DUST_AMOUNT)
    await a.sync()
    expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
    a.f(bsv.Transaction.DUST_AMOUNT + 1)
    await a.sync()
    expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT + 1)
    run.blockchain.fund(run.purse.address, 300000000)
    run.transaction.begin()
    new A().f(1000)
    a.f(100000000)
    run.transaction.end()
    await run.sync()
    expect(tx.outputs[1].satoshis).to.equal(1000)
    expect(tx.outputs[2].satoshis).to.equal(100000000)
  })

  // export & publish
  it('should store custom app name', async () => {
    const run = hookRun(new Run({ app: 'biz' }))
    class A extends Jig { }
    await run.deploy(A)
    expect(tx.outputs[0].script.chunks[4].buf.toString('utf8')).to.equal('biz')
  })
  */
})

// ------------------------------------------------------------------------------------------------
