/**
 * transaction.js
 *
 * Tests for lib/kernel/transaction.js
 */

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

/*
describe('Transaction', () => {
  // cosign
  it('should support atomic updates', async () => {
    const run = new Run()
    class A extends Jig { set (x) { this.x = x } }
    const a = new A()
    await run.sync()

    const run2 = new Run({ blockchain: run.blockchain })
    const b = new A()
    await run2.sync()

    run2.transaction.begin()
    a.set(1)
    b.set(1)
    await run2.transaction.pay()
    await run2.transaction.sign()
    const tx = run2.transaction.export()

    run.activate()
    await run.transaction.import(tx)
    run.transaction.end()
    await run.sync()
  })

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

  describe('errors', () => {
    it('should throw if no data', async () => {
      const run = new Run()
      const tx = await payFor(new bsv.Transaction(), run)
      await run.blockchain.broadcast(tx)
      await expect(run.load(tx.hash + '_o0')).to.be.rejectedWith(`Not a token: ${tx.hash}`)
      await expect(run.load(tx.hash + '_o1')).to.be.rejectedWith(`Not a token: ${tx.hash}`)
    })

    it('should throw if bad output target', async () => {
      const run = new Run()
      class A extends Jig { f () { } }
      const a = new A()
      await a.sync()
      const actions = [{ target: '_o1', method: 'f', args: [] }]
      const txid = await build(run, [], actions, [a.location], null, 1)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith('target _o1 missing')
    })

    it('should throw if bad input target', async () => {
      const run = new Run()
      class A extends Jig { f () { } }
      const a = new A()
      await a.sync()
      const actions = [{ target: '_i1', method: 'f', args: [] }]
      const txid = await build(run, [], actions, [a.location], null, 1)
      const tx = await run.blockchain.fetch(txid)
      const purseOutput = tx.inputs[1].prevTxId.toString('hex') + '_o' + tx.inputs[1].outputIndex
      const error = `Error loading ref _i1 at ${purseOutput}`
      await expect(run.load(txid + '_o1')).to.be.rejectedWith(error)
    })

    it('should throw if nonexistant target', async () => {
      const run = new Run()
      class A extends Jig { f () { } }
      const a = new A()
      await a.sync()
      const actions = [{ target: 'abc_o1', method: 'f', args: [] }]
      const txid = await build(run, [], actions, [a.location], null, 1)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
    })

    it('should throw if bad method', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const actions = [{ target: '_i0', method: 'f', args: [] }]
      const txid = await build(run, [], actions, [a.location], null, 1)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
    })

    it('should throw if bad json args', async () => {
      const run = new Run()
      class A extends Jig { f () { } }
      const a = new A()
      await a.sync()
      const actions = [{ target: '_i0', method: 'f', args: 0 }]
      const txid = await build(run, [], actions, [a.location], null, 1)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
    })

    it('should throw if bad class arg', async () => {
      const run = new Run()
      class A extends Jig { f (n) { this.n = n } }
      const a = new A()
      await a.sync()
      const actions = [{ target: '_i0', method: 'f', args: [{ $class: 'Map' }] }]
      const txid = await build(run, [], actions, [a.location], null, 1)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith('Cannot deserialize [object Object')
    })

    it('should throw if nonexistant jig arg', async () => {
      const run = new Run()
      class A extends Jig { f (a) { this.a = a } }
      const a = new A()
      await a.sync()
      const nonexistant = { $ref: 'abc_o2' }
      const actions = [{ target: '_i0', method: 'f', args: [nonexistant] }]
      const txid = await build(run, [], actions, [a.location], null, 1)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
    })

    it('bad number of jigs', async () => {
      const run = new Run()
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      await a.sync()
      const actions = [{ target: '_i0', method: 'f', args: [] }]
      const txid = await build(run, [], actions, [a.location], null, 0)
      await expect(run.load(txid + '_o1')).to.be.rejected
    })

    it('should throw if missing read input', async () => {
      const run = new Run()
      const creator = run.owner.address
      class B extends Jig { }
      class A extends Jig { init (b) { this.n = b.n } }
      const b = new B()
      await b.sync()
      const code = [{ text: A.toString(), owner: creator }]
      const args = [{ $ref: `${b.location}` }]
      const actions = [{ target: '_o1', method: 'init', args, creator }]
      const txid = await build(run, code, actions, [], null, 2)
      await expect(run.load(txid + '_o3')).to.be.rejectedWith() // TODO: check error
    })

    it('should throw if missing write input', async () => {
      const run = new Run()
      class B extends Jig { f () { this.n = 1 } }
      class A extends Jig { f (b) { b.f() } }
      const b = new B()
      await b.sync()
      const a = new A()
      await a.sync()
      const args = [{ $ref: `${b.location}` }]
      const actions = [{ target: '_i1', method: 'f', args }]
      const txid = await build(run, [], actions, [a.location], null, 2)
      await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
    })

    it('should throw if missing read output', async () => {
      const run = new Run()
      const creator = run.owner.address
      class B extends Jig { }
      class A extends Jig { init (b) { this.n = b.n } }
      const b = new B()
      await b.sync()
      const code = [{ text: A.toString(), owner: creator }]
      const args = [{ $ref: '_i0' }]
      const actions = [{ target: '_o1', method: 'init', args, creator }]
      const txid = await build(run, code, actions, [b.location], null, 2, [], 2)
      await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
    })

    it('should throw if missing write output', async () => {
      const run = new Run()
      class B extends Jig { f () { this.n = 1 } }
      class A extends Jig { f (b) { b.f() } }
      const b = new B()
      await b.sync()
      const a = new A()
      await a.sync()
      const args = [{ $ref: '_i0' }]
      const actions = [{ target: '_i1', method: 'f', args }]
      const txid = await build(run, [], actions, [b.location, a.location], null, 2, [], 1)
      await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
    })

    it('should throw if method throws', async () => {
      const run = new Run()
      class A extends Jig { f () { throw new Error() } }
      const a = new A()
      await a.sync()
      const actions = [{ target: '_i0', method: 'f', args: [] }]
      const txid = await build(run, [], actions, [a.location], null, 1)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith('unexpected exception in f')
    })

    it('should throw if missing input in batch', async () => {
      const run = new Run()
      const creator = run.owner.address
      class A extends Jig { f (b) { this.n = b.n + 1 } }
      const code = [{ text: A.toString(), creator }]
      const action1 = { target: '_o1', method: 'init', args: [], creator }
      const args = [{ $ref: '_i0' }]
      const actions = [action1, { target: '_i1', method: 'f', args }]
      const txid = await build(run, code, actions, [], null, 2)
      await expect(run.load(txid + '_o3')).to.be.rejectedWith() // TODO: check error
    })

    it('should throw if missing output in batch', async () => {
      const run = new Run()
      const creator = run.owner.address
      class B extends Jig { }
      class A extends Jig { init (b) { this.n = b.n } }
      const code = [{ text: B.toString(), owner: creator }, { text: A.toString(), owner: creator }]
      const action1 = { target: '_o1', method: 'init', args: [], creator }
      const args = [{ $ref: '_o3' }]
      const actions = [action1, { target: '_o2', method: 'init', args, creator }]
      const txid = await build(run, code, actions, [], null, 1, 2)
      await expect(run.load(txid + '_o4')).to.be.rejectedWith() // TODO: check error
    })

    it('should throw if initial jig owner does not match pk script', async () => {
      const run = new Run()
      const creator = run.owner.address
      class A extends Jig { }
      const code = [{ text: A.toString(), owner: creator }]
      const anotherOwner = new bsv.PrivateKey('testnet').publicKey.toString()
      const actions = [{ target: '_o1', method: 'init', args: [], creator: anotherOwner }]
      const txid = await build(run, code, actions, [], null, 1)
      await expect(run.load(txid + '_o2')).to.be.rejectedWith('Owner mismatch on output 2')
    })

    it('should throw if updated jig owner does not match pk script', async () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      const a = new A()
      await a.sync()
      const privkey1 = new bsv.PrivateKey('testnet')
      const privkey2 = new bsv.PrivateKey('testnet')
      const actions = [{ target: '_i0', method: 'send', args: [`${privkey1.publicKey.toString()}`] }]
      const txid = await build(run, [], actions, [a.location], privkey2.toAddress().toString(), 1)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith('Owner mismatch on output 1')
    })

    it('should throw if missing target', async () => {
      const run = new Run()
      const actions = [{ target: '_o1`', method: 'init', args: '[]', creator: run.owner.address }]
      const txid = await build(run, [], actions, [], null, 1)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith('missing target _o1')
    })

    it('should throw if satoshis amount is incorrect', async () => {
      const run = new Run()
      class A extends Jig { f (satoshis) { this.satoshis = satoshis } }
      const a = new A()
      await a.sync()
      const actions = [{ target: '_i0', method: 'f', args: [1000] }]
      const txid = await build(run, [], actions, [a.location], null, 1, [], 1, [bsv.Transaction.DUST_AMOUNT])
      await expect(run.load(txid + '_o1')).to.be.rejectedWith('bad satoshis on output 1')
    })

    it('should throw if bad class props', async () => {
      const run = new Run()
      const creator = run.owner.address
      class A extends Jig { }
      const code = [{ text: A.toString(), props: { n: { $class: 'Set' } }, owner: creator }]
      const txid = await build(run, code, [], [], null, 0)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith('Cannot deserialize [object Object]')
      const code2 = [{ text: A.toString(), props: { n: { $ref: 123 } }, owner: creator }]
      const txid2 = await build(run, code2, [], [], null, 0)
      await expect(run.load(txid2 + '_o1')).to.be.rejected
    })

    it('should throw if non-existant ref', async () => {
      const run = new Run()
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A(1)
      const b = new B()
      await run.sync()
      const actions = [{ target: '_i0', method: 'apply', args: [{ $ref: '_r1' }] }]
      const txid = await build(run, [], actions, [b.location], null, 1, [a.location])
      await expect(run.load(txid + '_o1')).to.be.rejectedWith('Unexpected ref _r1')
    })

    it('should throw if same jig used with different locations', async () => {
      const run = new Run()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a, a2) { this.n = a.n + a2.n } }
      const a = new A()
      const b = new B()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      await run.sync()
      const args = [{ $ref: '_r0' }, { $ref: '_r1' }]
      const actions = [{ target: '_i0', method: 'apply', args }]
      const txid = await build(run, [], actions, [b.location], null, 1, [a.location, a2.location])
      await expect(run.load(txid + '_o1')).to.be.rejectedWith('Inconsistent worldview')
    })

    it('should throw if same ref has different locations', async () => {
      const run = new Run()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a, a2) { this.n = a.n + a2.n } }
      const a = new A()
      const b = new B()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      await run.sync()
      const args = [{ $ref: `${a.location}` }, { $ref: `${a2.location}` }]
      const actions = [{ target: '_i0', method: 'apply', args }]
      const txid = await build(run, [], actions, [b.location], null, 1)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith('Inconsistent worldview')
    })

    it('should throw if bad refs array', async () => {
      const run = new Run()
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a, a2) { this.n = a.n + a2.n } }
      const a = new A()
      const b = new B()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      await run.sync()
      const args = [{ $ref: '_r0' }, { $ref: '_r1' }]
      const actions = [{ target: '_i0', method: 'apply', args }]
      const txid = await build(run, [], actions, [b.location], null, 1, args)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
    })

    it('should throw if bad class owner', async () => {
      const run = new Run()
      class A extends Jig { }
      const differentOwner = new bsv.PrivateKey().publicKey.toString()
      const code = [{ text: A.toString(), owner: differentOwner }]
      const txid = await build(run, code, [], [], null, 0)
      await expect(run.load(txid + '_o1')).to.be.rejectedWith(`bad def owner: ${txid}_o1`)
    })

    it('should not load old protocol', async () => {
      const loc = '04b294f5d30daf37f075869c864a40a03946fc2b764d75c47f276908445b3bf4_o2'
      const run = new Run({ network: 'test' })
      await expect(run.load(loc)).to.be.rejected
    })
  })
})
*/

// ------------------------------------------------------------------------------------------------
