/**
 * transaction.js
 *
 * Tests for ../lib/transaction.js
 */

const bsv = require('bsv')
const { Run, Jig, createRun, payFor } = require('./helpers')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const { expect } = chai
chai.use(chaiAsPromised)
const { describe, it, beforeEach, afterEach } = require('mocha')
const { extractRunData, encryptRunData, decryptRunData } = Run._util

describe('Transaction', () => {
  const run = createRun()
  const owner = run.owner.getOwner()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())
  afterEach(() => run.transaction.rollback())
  afterEach(() => run.sync())

  describe('inspect', () => {
    it('should support no actions', () => {
      expect(run.transaction.actions.length).to.equal(0)
      class A extends Jig { }
      new A() // eslint-disable-line
      expect(run.transaction.actions.length).to.equal(0)
      // expect(run.transaction.inputs.length).to.equal(0)
      // expect(run.transaction.outputs.length).to.equal(0)
    })

    it('should return new jig action', async () => {
      class A extends Jig { init (x) { this.x = x } }
      run.transaction.begin()
      const a = new A(1)
      expect(run.transaction.actions).to.deep.equal([{ target: a, method: 'init', args: [1] }])
      // expect(run.transaction.inputs.length).to.equal(0)
      // expect(run.transaction.outputs).to.deep.equal([a])
    })

    it('should return jig update action', () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      run.transaction.begin()
      a.set(a)
      expect(run.transaction.actions).to.deep.equal([{ target: a, method: 'set', args: [a] }])
      // expect(run.transaction.inputs).to.deep.equal([a])
      // expect(run.transaction.outputs).to.deep.equal([a])
    })

    it('should return batch of actions', () => {
      class A extends Jig { set (x) { this.x = x } }
      const b = new A()
      run.transaction.begin()
      const a = new A()
      a.set(1)
      a.set([a])
      b.set(2)
      expect(run.transaction.actions).to.deep.equal([
        { target: a, method: 'init', args: [] },
        { target: a, method: 'set', args: [1] },
        { target: a, method: 'set', args: [[a]] },
        { target: b, method: 'set', args: [2] }
      ])
      // expect(run.transaction.inputs).to.deep.equal([b])
      // expect(run.transaction.outputs).to.deep.equal([a, a])
    })
  })

  describe('export', () => {
    it('should create transaction with no operations', () => {
      expect(() => run.transaction.export()).to.throw('No transaction in progress')
      run.transaction.begin()
      const tx = run.transaction.export()
      expect(tx.inputs.length).to.equal(0)
      expect(tx.outputs.length).to.equal(1)
      const runData = extractRunData(tx)
      expect(runData).to.deep.equal({ code: [], actions: [], jigs: 0 })
    })

    it('should create transaction with new jig', () => {
      class A extends Jig { }
      run.transaction.begin()
      const a = new A() // eslint-disable-line
      const tx = run.transaction.export()
      expect(tx.inputs.length).to.equal(0)
      expect(tx.outputs.length).to.equal(3)
      const runData = extractRunData(tx)
      expect(runData).to.deep.equal({
        code: [{ text: A.toString(), owner: run.owner.getOwner() }],
        actions: [{ target: '_o1', method: 'init', args: [], creator: run.owner.getOwner() }],
        jigs: 1
      })
    })

    it('should throw if there are dependent queued transactions', () => {
      class A extends Jig { set (x) { this.x = x }}
      const a = new A()
      run.transaction.begin()
      a.set(1)
      expect(() => run.transaction.export()).to.throw('must not have any queued transactions before exporting')
    })

    it('should cache repeated calls to export', async () => {
      class A extends Jig { set (x) { this.x = x }}
      run.transaction.begin()
      const a = new A()
      const tx = run.transaction.export()
      expect(run.transaction.export()).to.deep.equal(tx)
      a.set(1)
      const tx2 = run.transaction.export()
      expect(tx2).not.to.deep.equal(tx)
      run.deploy(class B {})
      expect(run.transaction.export()).not.to.deep.equal(tx2)
    })
  })

  describe('import', () => {
    it('should support importing empty actions', async () => {
      run.transaction.begin()
      const tx = run.transaction.export()
      run.transaction.rollback()
      await run.transaction.import(tx)
      expect(run.transaction.actions.length).to.equal(0)
      class A extends Jig {}
      new A() // eslint-disable-line
      const tx2 = run.transaction.export()
      expect(tx2.outputs.length).to.equal(3)
    })

    it('should support importing new jig', async () => {
      run.transaction.begin()
      class B extends Jig { }
      class A extends B { set (x) { this.x = x }}
      A.author = 'abc'
      new A() // eslint-disable-line
      const tx = run.transaction.export()
      expect(tx.outputs.length).to.equal(4)
      run.transaction.rollback()
      await run.transaction.import(tx)
      expect(run.transaction.actions.length).to.equal(1)
      const a = run.transaction.actions[0].target
      expect(() => a.origin).to.throw('sync required before reading origin')
      a.set(1)
      expect(run.transaction.actions.length).to.equal(2)
      const tx2 = run.transaction.export()
      expect(tx2.outputs.length).to.equal(4)
    })

    it('should throw if invalid run transaction', async () => {
      await expect(run.transaction.import(new bsv.Transaction())).to.be.rejectedWith('not a run tx')
    })

    it('should throw if transaction already in progress', async () => {
      run.transaction.begin()
      run.deploy(class A {})
      const tx = run.transaction.export()
      run.transaction.rollback()
      run.transaction.begin()
      run.deploy(class A {})
      await expect(run.transaction.import(tx)).to.be.rejectedWith('transaction already in progress. cannot import.')
    })

    it('should support exporting then importing transaction', async () => {
      const run = createRun({ network: 'mock' })
      class Dragon extends Jig {}
      run.transaction.begin()
      new Dragon() // eslint-disable-line
      new Dragon() // eslint-disable-line
      await run.transaction.pay()
      await run.transaction.sign()
      const tx = run.transaction.export()
      const tx2 = new bsv.Transaction(tx.toBuffer())
      run.transaction.rollback()
      await run.transaction.import(tx2)
      run.transaction.end()
      await run.sync()
    })
  })

  describe('sign', () => {
    it('should fully sign transaction with owner keys', async () => {
      class A extends Jig { set (x) { this.x = x }}
      run.transaction.begin()
      const a = new A()
      // TODO: enable after owner inputs
      // expect(run.transaction.export().isFullySigned()).to.equal(false)
      await run.transaction.sign()
      expect(run.transaction.export().isFullySigned()).to.equal(true)
      run.transaction.end()
      await run.sync()
      run.transaction.begin()
      a.set(1)
      expect(run.transaction.export().isFullySigned()).to.equal(false)
      await run.transaction.sign()
      expect(run.transaction.export().isFullySigned()).to.equal(true)
    })

    it('should support atomic updates', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      await run.sync()

      const run2 = createRun({ blockchain: run.blockchain })
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
  })

  describe('pay', () => {
    it('should fully pay for transaction with purse', async () => {
      class A extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      await run.transaction.pay()
      const tx = run.transaction.export()
      expect(tx.outputs.length).to.equal(4)
      expect(tx.getFee() >= tx.toBuffer().length).to.equal(true)
    })
  })

  describe('publish', () => {
    const run = createRun({ app: 'biz', blockchain: new Run.Mockchain() })
    const owner = run.owner.address
    let tx = null; let data = null
    const origBroadcast = run.blockchain.broadcast.bind(run.blockchain)
    run.blockchain.broadcast = async txn => {
      tx = txn
      if (tx.outputs[0].script.isSafeDataOut()) {
        data = decryptRunData(tx.outputs[0].script.chunks[5].buf.toString('utf8'))
        expect(tx.outputs.length > data.code.length + data.jigs + 1)
      } else { data = null }
      return origBroadcast(tx)
    }
    beforeEach(() => run.activate())
    beforeEach(() => run.blockchain.block())

    it('should publish new basic jig', async () => {
      class A extends Jig {}
      const a = await new A().sync()
      expect(data.code).to.deep.equal([{ text: A.toString(), owner }])
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args: [], creator: owner }])
      expect(data.jigs).to.equal(1)
      expect(A.location).to.equal(`${tx.hash}_o1`)
      expect(a.location).to.equal(`${tx.hash}_o2`)
    })

    it('should corretly set owners on code and jig outputs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      class A extends Jig { f (owner) { this.owner = owner; return this } }
      const a = await new A().sync()
      expect(tx.outputs[1].script.toAddress().toString()).to.equal(run.owner.address)
      expect(tx.outputs[2].script.toAddress().toString()).to.equal(run.owner.address)
      await a.f(address.toString()).sync()
      expect(tx.outputs[1].script.toAddress().toString()).to.equal(address.toString())
    })

    it('should correctly set satoshis on code and jig outputs', async () => {
      class A extends Jig { f (satoshis) { this.satoshis = satoshis; return this } }
      const a = await new A().sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      expect(tx.outputs[2].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(1).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(0).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(bsv.Transaction.DUST_AMOUNT).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(bsv.Transaction.DUST_AMOUNT + 1).sync()
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

    it('should only deploy code once', async () => {
      class A extends Jig {}
      const a = new A()
      await new A().sync() // eslint-disable-line
      expect(data.code).to.deep.equal([])
      const target = `${a.origin.slice(0, 64)}_o1`
      expect(data.actions).to.deep.equal([{ target, method: 'init', args: [], creator: run.owner.getOwner() }])
      expect(data.jigs).to.equal(1)
    })

    it('should only deploy code once in batch', async () => {
      class A extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      new A() // eslint-disable-line
      await run.transaction.end().sync()
      expect(data.code).to.deep.equal([{ text: A.toString(), owner }])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.getOwner() },
        { target: '_o1', method: 'init', args: [], creator: run.owner.getOwner() }
      ])
      expect(data.jigs).to.equal(2)
    })

    it('should deploy code in batch', async () => {
      class A extends Jig {}
      class B extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      new B() // eslint-disable-line
      await run.transaction.end().sync()
      expect(data.code).to.deep.equal([
        { text: A.toString(), owner },
        { text: B.toString(), owner }
      ])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.getOwner() },
        { target: '_o2', method: 'init', args: [], creator: run.owner.getOwner() }
      ])
      expect(data.jigs).to.equal(2)
    })

    it('should support basic jig args', async () => {
      class A extends Jig { init (a, b) { this.a = a; this.b = b }}
      await new A(1, { a: 'a' }).sync() // eslint-disable-line
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args: [1, { a: 'a' }], creator: run.owner.getOwner() }])
    })

    it('should support passing jigs as args', async () => {
      class A extends Jig {
        init (n) { this.n = n }

        f (a) { this.x = a.n; return this }
      }
      const a = await new A(1).sync()
      const b = await new A(2).sync()
      await a.f(b).sync()
      const arg = { $ref: '_r0' }
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'f', args: [arg] }])
      expect(data.refs).to.deep.equal([b.location])
    })

    it('should support passing jigs as args without reading them', async () => {
      class A extends Jig { f (a) { this.a = a; return this } }
      const a = await new A().sync()
      const b = await new A().sync()
      await a.f(b, { a }, [b]).sync()
      const aref = { $ref: '_i0' }
      const bref = { $dup: 0 }
      const dups = [{ $ref: b.location }]
      const args = { $dedup: [bref, { a: aref }, [bref]], dups }
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'f', args: args }])
    })

    it('should support passing classes as args', async () => {
      class A extends Jig {
        init (a) { this.a = a }

        set (x) { this.x = x; return this }
      }
      class B { }
      class C extends A { }
      const a = await new A(A).sync()
      const args = [{ $ref: '_o1' }]
      expect(data.code).to.deep.equal([{ text: A.toString(), owner }])
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args, creator: run.owner.getOwner() }])
      expect(data.jigs).to.equal(1)
      await a.set(B).sync()
      expect(data.code).to.deep.equal([{ text: B.toString(), owner }])
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: '_o1' }] }])
      expect(data.jigs).to.equal(1)
      await new C().sync()
      await a.set(C).sync()
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: `${C.location}` }] }])
      await a.set(A).sync()
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: `${A.location}` }] }])
    })

    it('should support passing classes as args in a batch transaction', async () => {
      class A extends Jig { set (x) { this.x = x } }
      class B { }
      run.transaction.begin()
      const a = new A()
      a.set(B)
      run.transaction.end()
      await run.sync()
      expect(data.code).to.deep.equal([
        { text: A.toString(), owner },
        { text: B.toString(), owner }
      ])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.getOwner() },
        { target: '_o3', method: 'set', args: [{ $ref: '_o2' }] }
      ])
      expect(data.jigs).to.equal(1)
    })

    it('should support batch method calls', async () => {
      class A extends Jig { f (a) { this.a = a }}
      run.transaction.begin()
      const a = new A()
      a.f(1)
      a.f(2)
      a.f(3)
      await run.transaction.end().sync()
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.getOwner() },
        { target: '_o2', method: 'f', args: [1] },
        { target: '_o2', method: 'f', args: [2] },
        { target: '_o2', method: 'f', args: [3] }
      ])
      expect(data.jigs).to.equal(1)
    })

    it('should support reading class props', async () => {
      class B extends Jig { }
      const b = new B()
      await run.sync()
      class C extends Jig { }
      C.m = 'n'
      class A extends C { }
      A.s = 'a'
      A.n = 1
      A.a = [true, 'true']
      A.b = false
      A.x = null
      A.o = { x: 2 }
      A.j = b
      run.deploy(A)
      await run.sync()
      const defC = { text: C.toString(), props: { m: 'n' }, owner }
      const propsA = { s: 'a', n: 1, a: [true, 'true'], b: false, x: null, o: { x: 2 }, j: { $ref: `${b.location}` } }
      const defA = { text: A.toString(), deps: { C: '_o1' }, props: propsA, owner }
      expect(data.code).to.deep.equal([defC, defA])
      expect(data.actions).to.deep.equal([])
      expect(data.jigs).to.equal(0)
      expect(A.location).to.equal(`${tx.hash}_o2`)
    })

    it('should support non-spending reads', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      const b = new B()
      b.apply(a2)
      await run.sync()
      expect(data).to.deep.equal({
        code: [],
        actions: [{ target: '_i0', method: 'apply', args: [{ $ref: '_r0' }] }],
        jigs: 1,
        refs: [a2.location]
      })
      expect(b.n).to.equal(2)
    })

    it('should store custom app name', async () => {
      class A extends Jig { }
      await run.deploy(A)
      expect(tx.outputs[0].script.chunks[4].buf.toString('utf8')).to.equal('biz')
    })
  })

  describe('load', () => {
    const build = async (code, actions, inputLocations, outputAddr, jigs, refs = [], nout = jigs + code.length, satoshis) => {
      const bsvNetwork = Run._util.bsvNetwork(run.blockchain.network)
      const addr = outputAddr || new bsv.Address(run.owner.address, bsvNetwork).toString()
      const data = { code, actions, jigs, refs }
      const payload = Buffer.from(encryptRunData(data), 'utf8')
      const script = bsv.Script.buildSafeDataOut([
        Buffer.from('run', 'utf8'),
        Buffer.from([Run.protocol], 'hex'),
        Buffer.alloc(0),
        payload,
        Buffer.from('r11r', 'utf8')
      ])
      const tx = new bsv.Transaction().addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))
      for (let i = 0; i < nout; i++) { tx.to(addr, satoshis ? satoshis[i] : bsv.Transaction.DUST_AMOUNT) }
      for (const loc of inputLocations) {
        const txid = loc.slice(0, 64)
        const vout = parseInt(loc.slice(66))
        const output = (await run.blockchain.fetch(txid)).outputs[vout]
        tx.from({ txid, vout, script: output.script, satoshis: output.satoshis })
      }
      await payFor(tx, run.purse.bsvPrivateKey, run.blockchain)
      tx.sign(run.owner.bsvPrivateKey)
      await run.blockchain.broadcast(tx)
      return tx.hash
    }
    beforeEach(() => run.blockchain.fund(run.purse.address, 100000000))

    it('should load new jig', async () => {
      class A extends Jig { init (n) { this.n = n }}
      const code = [{ text: A.toString(), owner }]
      const actions = [{ target: '_o1', method: 'init', args: [3], creator: run.owner.address }]
      const txid = await build(code, actions, [], null, 1)
      const a = await run.load(txid + '_o2')
      expect(a.n).to.equal(3)
    })

    it('should load jig method call', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = await new A().sync()
      const actions = [{ target: '_i0', method: 'f', args: [1] }]
      const txid = await build([], actions, [a.location], null, 1)
      const a2 = await run.load(txid + '_o1')
      expect(a2.n).to.equal(1)
    })

    it('should load batch of jig updates', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = await new A().sync()
      const b = await new A().sync()
      const actions = [
        { target: '_i0', method: 'f', args: [1] },
        { target: '_i1', method: 'f', args: [2] }
      ]
      const txid = await build([], actions, [a.location, b.location], null, 2)
      const a2 = await run.load(txid + '_o1')
      const b2 = await run.load(txid + '_o2')
      expect(a2.n).to.equal(1)
      expect(b2.n).to.equal(2)
    })

    it('should load complex batch of updates', async () => {
      class B extends Jig { init () { this.n = 1 }}
      class A extends Jig { init (b) { this.n = b.n + 1 } }
      const code = [{ text: B.toString(), owner }, { text: A.toString(), owner }]
      const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.address }
      const args = [{ $ref: '_o3' }]
      const actions = [action1, { target: '_o2', method: 'init', args, creator: run.owner.address }]
      const txid = await build(code, actions, [], null, 2)
      const b = await run.load(txid + '_o3')
      const a = await run.load(txid + '_o4')
      expect(b.n).to.equal(1)
      expect(a.n).to.equal(2)
    })

    it('should load complex args with jig references', async () => {
      class B extends Jig { g () { this.n = 1 } }
      class A extends Jig { f (a, b) { this.a = a; b[0].g() }}
      const b = await new B().sync()
      const b2 = await new B().sync()
      const a = await new A().sync()
      const args = [{ $ref: `${b2.location}` }, [{ $ref: '_i1' }]]
      const actions = [{ target: '_i0', method: 'f', args }]
      const txid = await build([], actions, [a.location, b.location], null, 2)
      const a2 = await run.load(txid + '_o1')
      const b3 = await run.load(txid + '_o2')
      expect(b3.n).to.equal(1)
      expect(a2.a.origin).to.equal(b2.origin)
    })

    it('should support sending to new owner after changing networks', async () => {
      bsv.Networks.defaultNetwork = 'mainnet'
      class A extends Jig { send (to) { this.owner = to } }
      const a = await new A().sync()
      const privkey = new bsv.PrivateKey('testnet')
      const actions = [{ target: '_i0', method: 'send', args: [`${privkey.toAddress().toString()}`] }]
      const txid = await build([], actions, [a.location], privkey.toAddress().toString(), 1)
      await run.load(txid + '_o1')
    })

    it('should support non-spending read refs', async () => {
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A(1)
      const b = new B()
      await run.sync()
      const actions = [{ target: '_i0', method: 'apply', args: [{ $ref: '_r0' }] }]
      const txid = await build([], actions, [b.location], null, 1, [a.location])
      const b2 = await run.load(txid + '_o1')
      expect(b2.n).to.equal(1)
    })

    it('should support setting static class property jig', async () => {
      const run = createRun()
      class Store extends Jig {
        set (value) { this.value = value }
      }
      class SetAction extends Jig {
        init (value) { SetAction.store.set(value) }
      }
      SetAction.store = new Store()
      const action = new SetAction(10)
      await run.sync()

      // Clear caches and reload
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.load(action.location)
    })

    describe('errors', () => {
      it('should throw if no data', async () => {
        const tx = await payFor(new bsv.Transaction(), run.purse.bsvPrivateKey, run.blockchain)
        await run.blockchain.broadcast(tx)
        await expect(run.load(tx.hash + '_o0')).to.be.rejectedWith(`not a run tx: ${tx.hash}`)
        await expect(run.load(tx.hash + '_o1')).to.be.rejectedWith(`not a run tx: ${tx.hash}`)
      })

      it('should throw if bad output target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_o1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('target _o1 missing')
      })

      it('should throw if bad input target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_i1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        const tx = await run.blockchain.fetch(txid)
        const purseOutput = tx.inputs[1].prevTxId.toString('hex') + '_o' + tx.inputs[1].outputIndex
        const error = `Error loading ref _i1 at ${purseOutput}`
        await expect(run.load(txid + '_o1')).to.be.rejectedWith(error)
      })

      it('should throw if nonexistant target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: 'abc_o1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad method', async () => {
        class A extends Jig { }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad json args', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: 0 }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad class arg', async () => {
        class A extends Jig { f (n) { this.n = n } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [{ $class: 'Map' }] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('[object Object] cannot be deserialized')
      })

      it('should throw if nonexistant jig arg', async () => {
        class A extends Jig { f (a) { this.a = a } }
        const a = await new A().sync()
        const nonexistant = { $ref: 'abc_o2' }
        const actions = [{ target: '_i0', method: 'f', args: [nonexistant] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('bad number of jigs', async () => {
        class A extends Jig { f () { this.n = 1 } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 0)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('bad number of jigs')
      })

      it('should throw if missing read input', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const b = await new B().sync()
        const code = [{ text: A.toString(), owner }]
        const args = [{ $ref: `${b.location}` }]
        const actions = [{ target: '_o1', method: 'init', args, creator: run.owner.address }]
        const txid = await build(code, actions, [], null, 2)
        await expect(run.load(txid + '_o3')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing write input', async () => {
        class B extends Jig { f () { this.n = 1 } }
        class A extends Jig { f (b) { b.f() } }
        const b = await new B().sync()
        const a = await new A().sync()
        const args = [{ $ref: `${b.location}` }]
        const actions = [{ target: '_i1', method: 'f', args }]
        const txid = await build([], actions, [a.location], null, 2)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing read output', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const b = await new B().sync()
        const code = [{ text: A.toString(), owner }]
        const args = [{ $ref: '_i0' }]
        const actions = [{ target: '_o1', method: 'init', args, creator: run.owner.address }]
        const txid = await build(code, actions, [b.location], null, 2, [], 2)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing write output', async () => {
        class B extends Jig { f () { this.n = 1 } }
        class A extends Jig { f (b) { b.f() } }
        const b = await new B().sync()
        const a = await new A().sync()
        const args = [{ $ref: '_i0' }]
        const actions = [{ target: '_i1', method: 'f', args }]
        const txid = await build([], actions, [b.location, a.location], null, 2, [], 1)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if method throws', async () => {
        class A extends Jig { f () { throw new Error() } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('unexpected exception in f')
      })

      it('should throw if missing input in batch', async () => {
        class A extends Jig { f (b) { this.n = b.n + 1 } }
        const code = [{ text: A.toString(), owner }]
        const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.address }
        const args = [{ $ref: '_i0' }]
        const actions = [action1, { target: '_i1', method: 'f', args }]
        const txid = await build(code, actions, [], null, 2)
        await expect(run.load(txid + '_o3')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing output in batch', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const code = [{ text: B.toString(), owner }, { text: A.toString(), owner }]
        const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.getOwner() }
        const args = [{ $ref: '_o3' }]
        const actions = [action1, { target: '_o2', method: 'init', args, creator: run.owner.getOwner() }]
        const txid = await build(code, actions, [], null, 1, 2)
        await expect(run.load(txid + '_o4')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if initial jig owner does not match pk script', async () => {
        class A extends Jig { }
        const code = [{ text: A.toString(), owner }]
        const anotherOwner = new bsv.PrivateKey('testnet').publicKey.toString()
        const actions = [{ target: '_o1', method: 'init', args: [], creator: anotherOwner }]
        const txid = await build(code, actions, [], null, 1)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith('bad owner on output 2')
      })

      it('should throw if updated jig owner does not match pk script', async () => {
        class A extends Jig { send (to) { this.owner = to } }
        const a = await new A().sync()
        const privkey1 = new bsv.PrivateKey('testnet')
        const privkey2 = new bsv.PrivateKey('testnet')
        const actions = [{ target: '_i0', method: 'send', args: [`${privkey1.publicKey.toString()}`] }]
        const txid = await build([], actions, [a.location], privkey2.toAddress().toString(), 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('bad owner on output 1')
      })

      it('should throw if missing target', async () => {
        const actions = [{ target: '_o1`', method: 'init', args: '[]', creator: run.owner.getOwner() }]
        const txid = await build([], actions, [], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('missing target _o1')
      })

      it('should throw if satoshis amount is incorrect', async () => {
        class A extends Jig { f (satoshis) { this.satoshis = satoshis } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [1000] }]
        const txid = await build([], actions, [a.location], null, 1, [], 1, [bsv.Transaction.DUST_AMOUNT])
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('bad satoshis on output 1')
      })

      it('should throw if bad class props', async () => {
        class A extends Jig { }
        const code = [{ text: A.toString(), props: { n: { $class: 'Set' } }, owner }]
        const txid = await build(code, [], [], null, 0)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('[object Object] cannot be deserialized')
        const code2 = [{ text: A.toString(), props: { n: { $ref: 123 } }, owner }]
        const txid2 = await build(code2, [], [], null, 0)
        await expect(run.load(txid2 + '_o1')).to.be.rejectedWith('[object Object] cannot be scanned')
      })

      it('should throw if non-existant ref', async () => {
        class A extends Jig { init (n) { this.n = n } }
        class B extends Jig { apply (a) { this.n = a.n } }
        const a = new A(1)
        const b = new B()
        await run.sync()
        const actions = [{ target: '_i0', method: 'apply', args: [{ $ref: '_r1' }] }]
        const txid = await build([], actions, [b.location], null, 1, [a.location])
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('Unexpected ref _r1')
      })

      it('should throw if same jig used with different locations', async () => {
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
        const txid = await build([], actions, [b.location], null, 1, [a.location, a2.location])
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('Inconsistent worldview')
      })

      it('should throw if same ref has different locations', async () => {
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
        const txid = await build([], actions, [b.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('Inconsistent worldview')
      })

      it('should throw if bad refs array', async () => {
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
        const txid = await build([], actions, [b.location], null, 1, args)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad class owner', async () => {
        class A extends Jig { }
        const differentOwner = new bsv.PrivateKey().publicKey.toString()
        const code = [{ text: A.toString(), owner: differentOwner }]
        const txid = await build(code, [], [], null, 0)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith(`bad def owner: ${txid}_o1`)
      })

      it('should not load old protocol', async () => {
        const loc = '04b294f5d30daf37f075869c864a40a03946fc2b764d75c47f276908445b3bf4_o2'
        const run = createRun({ network: 'test' })
        await expect(run.load(loc)).to.be.rejectedWith('Unsupported run protocol in tx')
      })
    })
  })
})
