/**
 * transaction.js
 *
 * Tests for lib/kernel/transaction.js
 */

const bsv = require('bsv')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const { expect } = chai
chai.use(chaiAsPromised)
const { describe, it } = require('mocha')
const { Run, payFor } = require('../env/config')
const { Jig } = Run
const { unmangle } = require('../env/unmangle')
const { _extractRunData, _encryptRunData, _decryptRunData, _bsvNetwork } = unmangle(unmangle(Run)._util)

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

describe('Transaction', () => {
  describe('inspect', () => {
    it('should support no actions', () => {
      const run = new Run()
      expect(run.transaction.actions.length).to.equal(0)
      class A extends Jig { }
      new A() // eslint-disable-line
      expect(run.transaction.actions.length).to.equal(0)
      // TODO re-enable
      // expect(run.transaction.inputs.length).to.equal(0)
      // expect(run.transaction.outputs.length).to.equal(0)
    })

    it('should return new jig action', async () => {
      const run = new Run()
      class A extends Jig { init (x) { this.x = x } }
      run.transaction.begin()
      const a = new A(1)
      expect(run.transaction.actions).to.deep.equal([{ target: a, method: 'init', args: [1] }])
      // TODO re-enable
      // expect(run.transaction.inputs.length).to.equal(0)
      // expect(run.transaction.outputs).to.deep.equal([a])
    })

    it('should return jig update action', () => {
      const run = new Run()
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      run.transaction.begin()
      a.set(a)
      expect(run.transaction.actions).to.deep.equal([{ target: a, method: 'set', args: [a] }])
      run.transaction.rollback()
      // TODO re-enable
      // expect(run.transaction.inputs).to.deep.equal([a])
      // expect(run.transaction.outputs).to.deep.equal([a])
    })

    it('should return batch of actions', () => {
      const run = new Run()
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
      const run = new Run()
      expect(() => run.transaction.export()).to.throw('No transaction in progress')
      run.transaction.begin()
      const tx = run.transaction.export()
      expect(tx.inputs.length).to.equal(0)
      expect(tx.outputs.length).to.equal(1)
      const runData = _extractRunData(tx)
      expect(runData).to.deep.equal({ code: [], actions: [], jigs: 0 })
    })

    it('should create transaction with new jig', () => {
      const run = new Run()
      const creator = run.owner.address
      class A extends Jig { }
      run.transaction.begin()
      const a = new A() // eslint-disable-line
      const tx = run.transaction.export()
      expect(tx.inputs.length).to.equal(0)
      expect(tx.outputs.length).to.equal(3)
      const runData = _extractRunData(tx)
      expect(runData).to.deep.equal({
        code: [{ text: A.toString(), owner: creator }],
        actions: [{ target: '_o1', method: 'init', args: [], creator }],
        jigs: 1
      })
    })

    it('should throw if there are dependent queued transactions', () => {
      const run = new Run()
      class A extends Jig { set (x) { this.x = x }}
      const a = new A()
      run.transaction.begin()
      a.set(1)
      expect(() => run.transaction.export()).to.throw('must not have any queued transactions before exporting')
    })

    it('should cache repeated calls to export', async () => {
      const run = new Run()
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
      const run = new Run()
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
      const run = new Run()
      run.transaction.begin()
      class B extends Jig { }
      class A extends B { set (x) { this.x = x } }
      A.author = 'abc'
      new A() // eslint-disable-line
      const tx = run.transaction.export()
      expect(tx.outputs.length).to.equal(4)
      run.transaction.rollback()
      await run.transaction.import(tx)
      expect(run.transaction.actions.length).to.equal(1)
      const a = run.transaction.actions[0].target
      expect(() => a.origin).to.throw('sync() required before reading origin')
      a.set(1)
      expect(run.transaction.actions.length).to.equal(2)
      const tx2 = run.transaction.export()
      expect(tx2.outputs.length).to.equal(4)
    })

    it('should throw if invalid run transaction', async () => {
      const run = new Run()
      await expect(run.transaction.import(new bsv.Transaction())).to.be.rejectedWith('not a run tx')
    })

    it('should throw if transaction already in progress', async () => {
      const run = new Run()
      run.transaction.begin()
      run.deploy(class A {})
      const tx = run.transaction.export()
      run.transaction.rollback()
      run.transaction.begin()
      run.deploy(class A {})
      await expect(run.transaction.import(tx)).to.be.rejectedWith('Cannot import: Transaction already in progress')
    })

    it('should support exporting then importing transaction', async () => {
      const run = new Run()
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

    it('should not add updated resources to the inventory after import', async () => {
      const run = new Run()
      class Dragon extends Jig {}
      run.transaction.begin()
      new Dragon() // eslint-disable-line
      await run.transaction.pay()
      await run.transaction.sign()
      expect(run.inventory.jigs.length).to.equal(1)
      expect(run.inventory.code.length).to.equal(1)
      const tx = run.transaction.export()
      run.transaction.rollback()
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(0)
      await run.transaction.import(tx)
      expect(run.inventory.jigs.length).to.equal(0)
      expect(run.inventory.code.length).to.equal(0)
      await run.transaction.pay()
      await run.transaction.sign()
      run.transaction.end()
      await run.sync()
      expect(run.inventory.jigs.length).to.equal(1)
      expect(run.inventory.code.length).to.equal(1)
    })
  })

  describe('sign', () => {
    it('should fully sign transaction with owner keys', async () => {
      const run = new Run()
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
  })

  describe('pay', () => {
    it('should fully pay for transaction with purse', async () => {
      const run = new Run()
      class A extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      await run.transaction.pay()
      const tx = run.transaction.export()
      expect(tx.outputs.length >= 4).to.equal(true)
      expect(tx.getFee() >= tx.toBuffer().length * bsv.Transaction.FEE_PER_KB / 1000).to.equal(true)
    })
  })

  describe('publish', () => {
    let tx = null; let data = null
    const hookRun = run => {
      const origBroadcast = run.blockchain.broadcast.bind(run.blockchain)
      run.blockchain.broadcast = async txn => {
        tx = txn
        if (tx.outputs[0].script.isSafeDataOut()) {
          data = _decryptRunData(tx.outputs[0].script.chunks[5].buf.toString('utf8'))
          expect(tx.outputs.length > data.code.length + data.jigs + 1)
        } else { data = null }
        return origBroadcast(tx)
      }
      return run
    }

    it('should publish new basic jig', async () => {
      const run = hookRun(new Run())
      const creator = run.owner.address
      class A extends Jig {}
      const a = await new A().sync()
      expect(data.code).to.deep.equal([{ text: A.toString(), owner: creator }])
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args: [], creator }])
      expect(data.jigs).to.equal(1)
      expect(A.location).to.equal(`${tx.hash}_o1`)
      expect(a.location).to.equal(`${tx.hash}_o2`)
    })

    it('should correctly set owners on code and jig outputs', async () => {
      const run = hookRun(new Run())
      const address = new bsv.PrivateKey().toAddress()
      class A extends Jig { f (owner) { this.owner = owner; return this } }
      const a = await new A().sync()
      expect(tx.outputs[1].script.toAddress().toString()).to.equal(run.owner.address)
      expect(tx.outputs[2].script.toAddress().toString()).to.equal(run.owner.address)
      await a.f(address.toString()).sync()
      expect(tx.outputs[1].script.toAddress().toString()).to.equal(address.toString())
    })

    it('should correctly set satoshis on code and jig outputs', async () => {
      const run = hookRun(new Run())
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
      const run = hookRun(new Run())
      const creator = run.owner.address
      class A extends Jig {}
      const a = new A()
      await new A().sync() // eslint-disable-line
      expect(data.code).to.deep.equal([])
      const target = `${a.origin.slice(0, 64)}_o1`
      expect(data.actions).to.deep.equal([{ target, method: 'init', args: [], creator }])
      expect(data.jigs).to.equal(1)
    })

    it('should only deploy code once in batch', async () => {
      const run = hookRun(new Run())
      const creator = run.owner.address
      class A extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      new A() // eslint-disable-line
      await run.transaction.end().sync()
      expect(data.code).to.deep.equal([{ text: A.toString(), owner: creator }])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator },
        { target: '_o1', method: 'init', args: [], creator }
      ])
      expect(data.jigs).to.equal(2)
    })

    it('should deploy code in batch', async () => {
      const run = hookRun(new Run())
      const creator = run.owner.address
      class A extends Jig {}
      class B extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      new B() // eslint-disable-line
      await run.transaction.end().sync()
      expect(data.code).to.deep.equal([
        { text: A.toString(), owner: creator },
        { text: B.toString(), owner: creator }
      ])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator },
        { target: '_o2', method: 'init', args: [], creator }
      ])
      expect(data.jigs).to.equal(2)
    })

    it('should support basic jig args', async () => {
      const run = hookRun(new Run())
      const creator = run.owner.address
      class A extends Jig { init (a, b) { this.a = a; this.b = b }}
      await new A(1, { a: 'a' }).sync() // eslint-disable-line
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args: [1, { a: 'a' }], creator }])
    })

    it('should support passing jigs as args', async () => {
      hookRun(new Run())
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
      hookRun(new Run())
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
      const run = hookRun(new Run())
      const creator = run.owner.address
      class A extends Jig {
        init (a) { this.a = a }

        set (x) { this.x = x; return this }
      }
      class B { }
      class C extends A { }
      const a = await new A(A).sync()
      const args = [{ $ref: '_o1' }]
      expect(data.code).to.deep.equal([{ text: A.toString(), owner: creator }])
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args, creator }])
      expect(data.jigs).to.equal(1)
      await a.set(B).sync()
      expect(data.code).to.deep.equal([{ text: B.toString(), owner: creator }])
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: '_o1' }] }])
      expect(data.jigs).to.equal(1)
      await new C().sync()
      await a.set(C).sync()
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: `${C.location}` }] }])
      await a.set(A).sync()
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: `${A.location}` }] }])
    })

    it('should support passing classes as args in a batch transaction', async () => {
      const run = hookRun(new Run())
      const creator = run.owner.address
      class A extends Jig { set (x) { this.x = x } }
      class B { }
      run.transaction.begin()
      const a = new A()
      a.set(B)
      run.transaction.end()
      await run.sync()
      expect(data.code).to.deep.equal([
        { text: A.toString(), owner: creator },
        { text: B.toString(), owner: creator }
      ])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator },
        { target: '_o3', method: 'set', args: [{ $ref: '_o2' }] }
      ])
      expect(data.jigs).to.equal(1)
    })

    it('should support batch method calls', async () => {
      const run = hookRun(new Run())
      const creator = run.owner.address
      class A extends Jig { f (a) { this.a = a }}
      run.transaction.begin()
      const a = new A()
      a.f(1)
      a.f(2)
      a.f(3)
      await run.transaction.end().sync()
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator },
        { target: '_o2', method: 'f', args: [1] },
        { target: '_o2', method: 'f', args: [2] },
        { target: '_o2', method: 'f', args: [3] }
      ])
      expect(data.jigs).to.equal(1)
    })

    it('should support reading class props', async () => {
      const run = hookRun(new Run())
      const creator = run.owner.address
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
      const defC = { text: C.toString(), props: { m: 'n' }, owner: creator }
      const propsA = { s: 'a', n: 1, a: [true, 'true'], b: false, x: null, o: { x: 2 }, j: { $ref: `${b.location}` } }
      const defA = { text: A.toString(), deps: { C: '_o1' }, props: propsA, owner: creator }
      expect(data.code).to.deep.equal([defC, defA])
      expect(data.actions).to.deep.equal([])
      expect(data.jigs).to.equal(0)
      expect(A.location).to.equal(`${tx.hash}_o2`)
    })

    it('should support non-spending reads', async () => {
      const run = hookRun(new Run())
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
      const run = hookRun(new Run({ app: 'biz' }))
      class A extends Jig { }
      await run.deploy(A)
      expect(tx.outputs[0].script.chunks[4].buf.toString('utf8')).to.equal('biz')
    })
  })

  describe('load', () => {
    const build = async (run, code, actions, inputLocations, outputAddr, jigs, refs = [], nout = jigs + code.length, satoshis) => {
      const bsvNetwork = _bsvNetwork(run.blockchain.network)
      const addr = outputAddr || new bsv.Address(run.owner.address, bsvNetwork).toString()
      const data = { code, actions, jigs, refs }
      const payload = Buffer.from(_encryptRunData(data), 'utf8')
      const script = bsv.Script.buildSafeDataOut([
        Buffer.from('run', 'utf8'),
        Buffer.from([Run.protocol], 'hex'),
        Buffer.alloc(0),
        payload,
        Buffer.from('r11r', 'utf8')
      ])
      let tx = new bsv.Transaction().addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))
      for (let i = 0; i < nout; i++) { tx.to(addr, satoshis ? satoshis[i] : bsv.Transaction.DUST_AMOUNT) }
      for (const loc of inputLocations) {
        const txid = loc.slice(0, 64)
        const vout = parseInt(loc.slice(66))
        const output = (await run.blockchain.fetch(txid)).outputs[vout]
        tx.from({ txid, vout, script: output.script, satoshis: output.satoshis })
      }
      tx = await payFor(tx, run)
      tx.sign(run.owner.bsvPrivateKey)
      await run.blockchain.broadcast(tx)
      return tx.hash
    }

    it('should load new jig', async () => {
      const run = new Run()
      const creator = run.owner.address
      class A extends Jig { init (n) { this.n = n }}
      const code = [{ text: A.toString(), owner: creator }]
      const actions = [{ target: '_o1', method: 'init', args: [3], creator }]
      const txid = await build(run, code, actions, [], null, 1)
      const a = await run.load(txid + '_o2')
      expect(a.n).to.equal(3)
    })

    it('should load jig method call', async () => {
      const run = new Run()
      class A extends Jig { f (n) { this.n = n }}
      const a = await new A().sync()
      const actions = [{ target: '_i0', method: 'f', args: [1] }]
      const txid = await build(run, [], actions, [a.location], null, 1)
      const a2 = await run.load(txid + '_o1')
      expect(a2.n).to.equal(1)
    })

    it('should load batch of jig updates', async () => {
      const run = new Run()
      class A extends Jig { f (n) { this.n = n }}
      const a = await new A().sync()
      const b = await new A().sync()
      const actions = [
        { target: '_i0', method: 'f', args: [1] },
        { target: '_i1', method: 'f', args: [2] }
      ]
      const txid = await build(run, [], actions, [a.location, b.location], null, 2)
      const a2 = await run.load(txid + '_o1')
      const b2 = await run.load(txid + '_o2')
      expect(a2.n).to.equal(1)
      expect(b2.n).to.equal(2)
    })

    it('should load complex batch of updates', async () => {
      const run = new Run()
      const creator = run.owner.address
      class B extends Jig { init () { this.n = 1 }}
      class A extends Jig { init (b) { this.n = b.n + 1 } }
      const code = [{ text: B.toString(), owner: creator }, { text: A.toString(), owner: creator }]
      const action1 = { target: '_o1', method: 'init', args: [], creator }
      const args = [{ $ref: '_o3' }]
      const actions = [action1, { target: '_o2', method: 'init', args, creator }]
      const txid = await build(run, code, actions, [], null, 2)
      const b = await run.load(txid + '_o3')
      const a = await run.load(txid + '_o4')
      expect(b.n).to.equal(1)
      expect(a.n).to.equal(2)
    })

    it('should load complex args with jig references', async () => {
      const run = new Run()
      class B extends Jig { g () { this.n = 1 } }
      class A extends Jig { f (a, b) { this.a = a; b[0].g() }}
      const b = await new B().sync()
      const b2 = await new B().sync()
      const a = await new A().sync()
      const args = [{ $ref: `${b2.location}` }, [{ $ref: '_i1' }]]
      const actions = [{ target: '_i0', method: 'f', args }]
      const txid = await build(run, [], actions, [a.location, b.location], null, 2)
      const a2 = await run.load(txid + '_o1')
      const b3 = await run.load(txid + '_o2')
      expect(b3.n).to.equal(1)
      expect(a2.a.origin).to.equal(b2.origin)
    })

    it('should support sending to new owner after changing networks', async () => {
      const run = new Run()
      bsv.Networks.defaultNetwork = bsv.Networks.mainnet
      class A extends Jig { send (to) { this.owner = to } }
      const a = await new A().sync()
      const privkey = new bsv.PrivateKey('testnet')
      const actions = [{ target: '_i0', method: 'send', args: [`${privkey.toAddress().toString()}`] }]
      const txid = await build(run, [], actions, [a.location], privkey.toAddress().toString(), 1)
      await run.load(txid + '_o1')
    })

    it('should support non-spending read refs', async () => {
      const run = new Run()
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A(1)
      const b = new B()
      await run.sync()
      const actions = [{ target: '_i0', method: 'apply', args: [{ $ref: '_r0' }] }]
      const txid = await build(run, [], actions, [b.location], null, 1, [a.location])
      const b2 = await run.load(txid + '_o1')
      expect(b2.n).to.equal(1)
    })

    it('should support setting static class property jig', async () => {
      const run = new Run()
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
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(action.location)
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
        const a = await new A().sync()
        const actions = [{ target: '_o1', method: 'f', args: [] }]
        const txid = await build(run, [], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('target _o1 missing')
      })

      it('should throw if bad input target', async () => {
        const run = new Run()
        class A extends Jig { f () { } }
        const a = await new A().sync()
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
        const a = await new A().sync()
        const actions = [{ target: 'abc_o1', method: 'f', args: [] }]
        const txid = await build(run, [], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad method', async () => {
        const run = new Run()
        class A extends Jig { }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build(run, [], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad json args', async () => {
        const run = new Run()
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: 0 }]
        const txid = await build(run, [], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad class arg', async () => {
        const run = new Run()
        class A extends Jig { f (n) { this.n = n } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [{ $class: 'Map' }] }]
        const txid = await build(run, [], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('Cannot deserialize [object Object')
      })

      it('should throw if nonexistant jig arg', async () => {
        const run = new Run()
        class A extends Jig { f (a) { this.a = a } }
        const a = await new A().sync()
        const nonexistant = { $ref: 'abc_o2' }
        const actions = [{ target: '_i0', method: 'f', args: [nonexistant] }]
        const txid = await build(run, [], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('bad number of jigs', async () => {
        const run = new Run()
        class A extends Jig { f () { this.n = 1 } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build(run, [], actions, [a.location], null, 0)
        await expect(run.load(txid + '_o1')).to.be.rejected
      })

      it('should throw if missing read input', async () => {
        const run = new Run()
        const creator = run.owner.address
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const b = await new B().sync()
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
        const b = await new B().sync()
        const a = await new A().sync()
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
        const b = await new B().sync()
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
        const b = await new B().sync()
        const a = await new A().sync()
        const args = [{ $ref: '_i0' }]
        const actions = [{ target: '_i1', method: 'f', args }]
        const txid = await build(run, [], actions, [b.location, a.location], null, 2, [], 1)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if method throws', async () => {
        const run = new Run()
        class A extends Jig { f () { throw new Error() } }
        const a = await new A().sync()
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
        const a = await new A().sync()
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
        const a = await new A().sync()
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

  it('should error when import and queue twice', async () => {
    const run = new Run()
    class A extends Jig { set (n) { this.n = n } }
    const a = new A()
    await run.sync()

    run.transaction.begin()
    a.set(1)
    const tx = run.transaction.export()
    run.transaction.rollback()

    expect(a.location).to.equal(a.origin)

    // Import twice with some other transactions queued, so that we'll attempt to spend the
    // same inputs. This should error if things are working.

    for (let i = 0; i < 3; i++) {
      new A() // eslint-disable-line
    }

    await run.transaction.import(tx)
    // Deploy something, so we trigger our tx to be paid with different UTXOs
    new A() // eslint-disable-line
    run.transaction.end()

    await run.transaction.import(tx)
    new A() // eslint-disable-line
    run.transaction.end()

    await expect(run.sync()).to.be.rejected

    await a.sync()
  })
})

// ------------------------------------------------------------------------------------------------
