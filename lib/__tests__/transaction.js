const { createRun, Jig, Run, getObfuscatedKey } = require('./test-util')
const { extractRunData, encryptRunData, decryptRunData } = require('../util')
const bsv = require('bsv')

const util = Run[getObfuscatedKey('_util')]

describe('Transaction', () => {
  const run = createRun()
  const owner = run.owner.pubkey
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())
  afterEach(() => run.transaction.rollback())
  afterEach(() => run.sync())

  describe('inspect', () => {
    test('nothing', () => {
      expect(run.transaction.actions.length).toBe(0)
      class A extends Jig { }
      new A() // eslint-disable-line
      expect(run.transaction.actions.length).toBe(0)
      // expect(run.transaction.inputs.length).toBe(0)
      // expect(run.transaction.outputs.length).toBe(0)
    })

    test('init', () => {
      class A extends Jig { init (x) { this.x = x } }
      run.transaction.begin()
      const a = new A(1)
      expect(run.transaction.actions).toEqual([{ target: a, method: 'init', args: [1] }])
      // expect(run.transaction.inputs.length).toBe(0)
      // expect(run.transaction.outputs).toEqual([a])
    })

    test('method', () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      run.transaction.begin()
      a.set(a)
      expect(run.transaction.actions).toEqual([{ target: a, method: 'set', args: [a] }])
      // expect(run.transaction.inputs).toEqual([a])
      // expect(run.transaction.outputs).toEqual([a])
    })

    test('batch', () => {
      class A extends Jig { set (x) { this.x = x } }
      const b = new A()
      run.transaction.begin()
      const a = new A()
      a.set(1)
      a.set([a])
      b.set(2)
      expect(run.transaction.actions).toEqual([
        { target: a, method: 'init', args: [] },
        { target: a, method: 'set', args: [1] },
        { target: a, method: 'set', args: [[a]] },
        { target: b, method: 'set', args: [2] }
      ])
      // expect(run.transaction.inputs).toEqual([b])
      // expect(run.transaction.outputs).toEqual([a, a])
    })
  })

  describe('export', () => {
    test('nothing', () => {
      expect(() => run.transaction.export()).toThrow('No transaction in progress')
      run.transaction.begin()
      const tx = run.transaction.export()
      expect(tx.inputs.length).toBe(0)
      expect(tx.outputs.length).toBe(1)
      const runData = extractRunData(tx)
      expect(runData).toEqual({ code: [], actions: [], jigs: 0 })
    })

    test('basic jig', () => {
      class A extends Jig { }
      run.transaction.begin()
      const a = new A() // eslint-disable-line
      const tx = run.transaction.export()
      expect(tx.inputs.length).toBe(0)
      expect(tx.outputs.length).toBe(3)
      const runData = extractRunData(tx)
      expect(runData).toEqual({
        code: [{ text: A.toString(), owner: run.owner.pubkey }],
        actions: [{ target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }],
        jigs: 1
      })
    })

    test('any queued transactions throws', () => {
      class A extends Jig { set (x) { this.x = x }}
      const a = new A()
      run.transaction.begin()
      a.set(1)
      expect(() => run.transaction.export()).toThrow('must not have any queued transactions before exporting')
    })

    test('caches repeated calls', async () => {
      class A extends Jig { set (x) { this.x = x }}
      run.transaction.begin()
      const a = new A()
      const tx = run.transaction.export()
      expect(run.transaction.export()).toBe(tx)
      a.set(1)
      const tx2 = run.transaction.export()
      expect(tx2).not.toBe(tx)
      run.deploy(class B {})
      expect(run.transaction.export()).not.toBe(tx2)
    })
  })

  describe('import', () => {
    test('nothing then update', async () => {
      run.transaction.begin()
      const tx = run.transaction.export()
      run.transaction.rollback()
      await run.transaction.import(tx)
      expect(run.transaction.actions.length).toBe(0)
      class A extends Jig {}
      new A() // eslint-disable-line
      const tx2 = run.transaction.export()
      expect(tx2.outputs.length).toBe(3)
    })

    test('basic jig', async () => {
      run.transaction.begin()
      class B extends Jig { }
      class A extends B { set (x) { this.x = x }}
      A.author = 'abc'
      new A() // eslint-disable-line
      const tx = run.transaction.export()
      expect(tx.outputs.length).toBe(4)
      run.transaction.rollback()
      await run.transaction.import(tx)
      expect(run.transaction.actions.length).toBe(1)
      const a = run.transaction.actions[0].target
      expect(() => a.origin).toThrow('sync required before reading origin')
      a.set(1)
      expect(run.transaction.actions.length).toBe(2)
      const tx2 = run.transaction.export()
      expect(tx2.outputs.length).toBe(4)
    })

    test('invalid throws', async () => {
      await expect(run.transaction.import(new bsv.Transaction())).rejects.toThrow('not a run tx')
    })

    test('already in progress throws', async () => {
      run.transaction.begin()
      run.deploy(class A {})
      const tx = run.transaction.export()
      run.transaction.rollback()
      run.transaction.begin()
      run.deploy(class A {})
      await expect(run.transaction.import(tx)).rejects.toThrow('transaction already in progress. cannot import.')
    })

    test('export then import', async () => {
      const run = new Run({ network: 'mock' })
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
    test('fully signed', async () => {
      class A extends Jig { set (x) { this.x = x }}
      run.transaction.begin()
      const a = new A()
      // TODO: enable after owner inputs
      // expect(run.transaction.export().isFullySigned()).toBe(false)
      await run.transaction.sign()
      expect(run.transaction.export().isFullySigned()).toBe(true)
      run.transaction.end()
      await run.sync()
      run.transaction.begin()
      a.set(1)
      expect(run.transaction.export().isFullySigned()).toBe(false)
      await run.transaction.sign()
      expect(run.transaction.export().isFullySigned()).toBe(true)
    })

    test('atomic update', async () => {
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
    test('fully paid', async () => {
      class A extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      await run.transaction.pay()
      const tx = run.transaction.export()
      expect(tx.outputs.length).toBe(4)
      expect(tx.getFee() >= tx.toBuffer().length).toBe(true)
    })
  })

  describe('publish', () => {
    const run = createRun({ app: 'biz' })
    const owner = run.owner.pubkey
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

    test('basic jig', async () => {
      class A extends Jig {}
      const a = await new A().sync()
      expect(data.code).toEqual([{ text: A.toString(), owner }])
      expect(data.actions).toEqual([{ target: '_o1', method: 'init', args: [], creator: owner }])
      expect(data.jigs).toBe(1)
      expect(A.location).toBe(`${tx.hash}_o1`)
      expect(a.location).toBe(`${tx.hash}_o2`)
    })

    test('owners', async () => {
      const pubkey = new bsv.PrivateKey().toPublicKey()
      class A extends Jig { f (owner) { this.owner = owner; return this } }
      const a = await new A().sync()
      expect(tx.outputs[1].script.toAddress().toString()).toBe(run.owner.address)
      expect(tx.outputs[2].script.toAddress().toString()).toBe(run.owner.address)
      await a.f(pubkey.toString()).sync()
      expect(tx.outputs[1].script.toAddress().toString()).toBe(pubkey.toAddress().toString())
    })

    test('satoshis', async () => {
      class A extends Jig { f (satoshis) { this.satoshis = satoshis; return this } }
      const a = await new A().sync()
      expect(tx.outputs[1].satoshis).toBe(bsv.Transaction.DUST_AMOUNT)
      expect(tx.outputs[2].satoshis).toBe(bsv.Transaction.DUST_AMOUNT)
      await a.f(1).sync()
      expect(tx.outputs[1].satoshis).toBe(bsv.Transaction.DUST_AMOUNT)
      await a.f(0).sync()
      expect(tx.outputs[1].satoshis).toBe(bsv.Transaction.DUST_AMOUNT)
      await a.f(bsv.Transaction.DUST_AMOUNT).sync()
      expect(tx.outputs[1].satoshis).toBe(bsv.Transaction.DUST_AMOUNT)
      await a.f(bsv.Transaction.DUST_AMOUNT + 1).sync()
      expect(tx.outputs[1].satoshis).toBe(bsv.Transaction.DUST_AMOUNT + 1)
      run.blockchain.fund(run.purse.address, 300000000)
      run.transaction.begin()
      new A().f(1000)
      a.f(100000000)
      run.transaction.end()
      await run.sync()
      expect(tx.outputs[1].satoshis).toBe(1000)
      expect(tx.outputs[2].satoshis).toBe(100000000)
    })

    test('already installed', async () => {
      class A extends Jig {}
      const a = new A()
      await new A().sync() // eslint-disable-line
      expect(data.code).toEqual([])
      const target = `${a.origin.slice(0, 64)}_o1`
      expect(data.actions).toEqual([{ target, method: 'init', args: [], creator: run.owner.pubkey }])
      expect(data.jigs).toBe(1)
    })

    test('already installed batch', async () => {
      class A extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      new A() // eslint-disable-line
      await run.transaction.end().sync()
      expect(data.code).toEqual([{ text: A.toString(), owner }])
      expect(data.actions).toEqual([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
      ])
      expect(data.jigs).toBe(2)
    })

    test('batch install', async () => {
      class A extends Jig {}
      class B extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      new B() // eslint-disable-line
      await run.transaction.end().sync()
      expect(data.code).toEqual([
        { text: A.toString(), owner },
        { text: B.toString(), owner }
      ])
      expect(data.actions).toEqual([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o2', method: 'init', args: [], creator: run.owner.pubkey }
      ])
      expect(data.jigs).toBe(2)
    })

    test('basic args', async () => {
      class A extends Jig { init (a, b) { this.a = a; this.b = b }}
      await new A(1, { a: 'a' }).sync() // eslint-disable-line
      expect(data.actions).toEqual([{ target: '_o1', method: 'init', args: [1, { a: 'a' }], creator: run.owner.pubkey }])
    })

    test('jig args', async () => {
      class A extends Jig {
        init (n) { this.n = n }

        f (a) { this.x = a.n; return this }
      }
      const a = await new A(1).sync()
      const b = await new A(2).sync()
      await a.f(b).sync()
      const arg = { $ref: '_r0' }
      expect(data.actions).toEqual([{ target: '_i0', method: 'f', args: [arg] }])
      expect(data.refs).toEqual([b.location])
    })

    test('jig args without read', async () => {
      class A extends Jig { f (a) { this.a = a; return this } }
      const a = await new A().sync()
      const b = await new A().sync()
      await a.f(b, { a }, [b]).sync()
      const arg1 = { $ref: b.location }
      const arg2 = { a: { $ref: '_i0' } }
      const arg3 = [{ $ref: b.location }]
      const args = [arg1, arg2, arg3]
      expect(data.actions).toEqual([{ target: '_i0', method: 'f', args: args }])
    })

    test('class args', async () => {
      class A extends Jig {
        init (a) { this.a = a }

        set (x) { this.x = x; return this }
      }
      class B { }
      class C extends A { }
      const a = await new A(A).sync()
      const args = [{ $ref: '_o1' }]
      expect(data.code).toEqual([{ text: A.toString(), owner }])
      expect(data.actions).toEqual([{ target: '_o1', method: 'init', args, creator: run.owner.pubkey }])
      expect(data.jigs).toBe(1)
      await a.set(B).sync()
      expect(data.code).toEqual([{ text: B.toString(), owner }])
      expect(data.actions).toEqual([{ target: '_i0', method: 'set', args: [{ $ref: '_o1' }] }])
      expect(data.jigs).toBe(1)
      await new C().sync()
      await a.set(C).sync()
      expect(data.actions).toEqual([{ target: '_i0', method: 'set', args: [{ $ref: `${C.location}` }] }])
      await a.set(A).sync()
      expect(data.actions).toEqual([{ target: '_i0', method: 'set', args: [{ $ref: `${A.location}` }] }])
    })

    test('class args batch', async () => {
      class A extends Jig { set (x) { this.x = x } }
      class B { }
      run.transaction.begin()
      const a = new A()
      a.set(B)
      run.transaction.end()
      await run.sync()
      expect(data.code).toEqual([
        { text: A.toString(), owner },
        { text: B.toString(), owner }
      ])
      expect(data.actions).toEqual([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o3', method: 'set', args: [{ $ref: '_o2' }] }
      ])
      expect(data.jigs).toBe(1)
    })

    test('batch methods', async () => {
      class A extends Jig { f (a) { this.a = a }}
      run.transaction.begin()
      const a = new A()
      a.f(1)
      a.f(2)
      a.f(3)
      await run.transaction.end().sync()
      expect(data.actions).toEqual([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o2', method: 'f', args: [1] },
        { target: '_o2', method: 'f', args: [2] },
        { target: '_o2', method: 'f', args: [3] }
      ])
      expect(data.jigs).toBe(1)
    })

    test('class props', async () => {
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
      expect(data.code).toEqual([defC, defA])
      expect(data.actions).toEqual([])
      expect(data.jigs).toBe(0)
      expect(A.location).toBe(`${tx.hash}_o2`)
    })

    test('non-spending reads', async () => {
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
      expect(data).toEqual({
        code: [],
        actions: [{ target: '_i0', method: 'apply', args: [{ $ref: '_r0' }] }],
        jigs: 1,
        refs: [a2.location]
      })
      expect(b.n).toBe(2)
    })

    test('custom app', async () => {
      class A extends Jig { }
      await run.deploy(A)
      expect(tx.outputs[0].script.chunks[4].buf.toString('utf8')).toBe('biz')
    })
  })

  describe('load', () => {
    const build = async (code, actions, inputLocations, outputAddr, jigs, refs = [], nout = jigs + code.length, satoshis) => {
      const bsvNetwork = util.bsvNetwork(run.blockchain.network)
      const addr = outputAddr || new bsv.Address(run.owner.address, bsvNetwork).toString()
      const data = { code, actions, jigs, refs }
      const payload = Buffer.from(encryptRunData(data), 'utf8')
      const purseUtxos = await run.blockchain.utxos(run.purse.address)
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
      tx.from(purseUtxos).change(run.purse.address).sign(run.purse.privkey).sign(run.owner.bsvPrivateKey)
      await run.blockchain.broadcast(tx)
      return tx.hash
    }
    beforeEach(() => run.blockchain.fund(run.purse.address, 100000000))

    test('init', async () => {
      class A extends Jig { init (n) { this.n = n }}
      const code = [{ text: A.toString(), owner }]
      const actions = [{ target: '_o1', method: 'init', args: [3], creator: run.owner.pubkey }]
      const txid = await build(code, actions, [], null, 1)
      const a = await run.load(txid + '_o2')
      expect(a.n).toBe(3)
    })

    test('method', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = await new A().sync()
      const actions = [{ target: '_i0', method: 'f', args: [1] }]
      const txid = await build([], actions, [a.location], null, 1)
      const a2 = await run.load(txid + '_o1')
      expect(a2.n).toBe(1)
    })

    test('batch', async () => {
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
      expect(a2.n).toBe(1)
      expect(b2.n).toBe(2)
    })

    test('batch complex', async () => {
      class B extends Jig { init () { this.n = 1 }}
      class A extends Jig { init (b) { this.n = b.n + 1 } }
      const code = [{ text: B.toString(), owner }, { text: A.toString(), owner }]
      const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
      const args = [{ $ref: '_o3' }]
      const actions = [action1, { target: '_o2', method: 'init', args, creator: run.owner.pubkey }]
      const txid = await build(code, actions, [], null, 2)
      const b = await run.load(txid + '_o3')
      const a = await run.load(txid + '_o4')
      expect(b.n).toBe(1)
      expect(a.n).toBe(2)
    })

    test('complex args', async () => {
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
      expect(b3.n).toBe(1)
      expect(a2.a.origin).toBe(b2.origin)
    })

    test('send to new owner after changing networks', async () => {
      bsv.Networks.defaultNetwork = 'mainnet'
      class A extends Jig { send (to) { this.owner = to } }
      const a = await new A().sync()
      const privkey = new bsv.PrivateKey('testnet')
      const actions = [{ target: '_i0', method: 'send', args: [`${privkey.publicKey.toString()}`] }]
      const txid = await build([], actions, [a.location], privkey.toAddress().toString(), 1)
      await run.load(txid + '_o1')
    })

    test('non-spending ref', async () => {
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A(1)
      const b = new B()
      await run.sync()
      const actions = [{ target: '_i0', method: 'apply', args: [{ $ref: '_r0' }] }]
      const txid = await build([], actions, [b.location], null, 1, [a.location])
      const b2 = await run.load(txid + '_o1')
      expect(b2.n).toBe(1)
    })

    test('update class property jig in initializer', async () => {
      const run = new Run({ network: 'mock' })
      class Store extends Jig {
        set (value) { this.value = value }
      }
      class SetAction extends Jig {
        init (value) { SetAction.store.set(value) }
      }
      SetAction.store = new Store()
      const action = new SetAction(10)
      await run.sync()

      // Clear caches and load
      Run.code.flush()
      const cache = new Run.StateCache()
      const run2 = new Run({ network: 'mock', blockchain: run.blockchain, cache })
      await run2.load(action.location)
    })

    describe('errors', () => {
      test('no data', async () => {
        const utxos = await run.purse.utxos()
        const tx = new bsv.Transaction().from(utxos).change(run.purse.address).sign(run.purse.privkey)
        await run.blockchain.broadcast(tx)
        await expect(run.load(tx.hash + '_o0')).rejects.toThrow(`not a run tx: ${tx.hash}`)
        await expect(run.load(tx.hash + '_o1')).rejects.toThrow(`not a run tx: ${tx.hash}`)
      })

      test('bad output target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_o1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).rejects.toThrow('target _o1 missing')
      })

      test('bad input target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_i1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).rejects.toThrow('bad ref _i1')
      })

      test('nonexistant target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: 'abc_o1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).rejects.toThrow() // TODO: check error
      })

      test('bad method', async () => {
        class A extends Jig { }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).rejects.toThrow() // TODO: check error
      })

      test('bad json args', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: 0 }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).rejects.toThrow() // TODO: check error
      })

      test('bad class arg', async () => {
        class A extends Jig { f (n) { this.n = n } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [{ $class: 'Map' }] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).rejects.toThrow('$ properties must not be defined')
      })

      test('nonexistant jig arg', async () => {
        class A extends Jig { f (a) { this.a = a } }
        const a = await new A().sync()
        const nonexistant = { $ref: 'abc_o2' }
        const actions = [{ target: '_i0', method: 'f', args: [nonexistant] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).rejects.toThrow() // TODO: check error
      })

      test('bad number of jigs', async () => {
        class A extends Jig { f () { this.n = 1 } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 0)
        await expect(run.load(txid + '_o1')).rejects.toThrow('bad number of jigs')
      })

      test('missing read input', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const b = await new B().sync()
        const code = [{ text: A.toString(), owner }]
        const args = [{ $ref: `${b.location}` }]
        const actions = [{ target: '_o1', method: 'init', args, creator: run.owner.pubkey }]
        const txid = await build(code, actions, [], null, 2)
        await expect(run.load(txid + '_o3')).rejects.toThrow() // TODO: check error
      })

      test('missing write input', async () => {
        class B extends Jig { f () { this.n = 1 } }
        class A extends Jig { f (b) { b.f() } }
        const b = await new B().sync()
        const a = await new A().sync()
        const args = [{ $ref: `${b.location}` }]
        const actions = [{ target: '_i1', method: 'f', args }]
        const txid = await build([], actions, [a.location], null, 2)
        await expect(run.load(txid + '_o2')).rejects.toThrow() // TODO: check error
      })

      test('missing read output', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const b = await new B().sync()
        const code = [{ text: A.toString(), owner }]
        const args = [{ $ref: '_i0' }]
        const actions = [{ target: '_o1', method: 'init', args, creator: run.owner.pubkey }]
        const txid = await build(code, actions, [b.location], null, 2, [], 2)
        await expect(run.load(txid + '_o2')).rejects.toThrow() // TODO: check error
      })

      test('missing write output', async () => {
        class B extends Jig { f () { this.n = 1 } }
        class A extends Jig { f (b) { b.f() } }
        const b = await new B().sync()
        const a = await new A().sync()
        const args = [{ $ref: '_i0' }]
        const actions = [{ target: '_i1', method: 'f', args }]
        const txid = await build([], actions, [b.location, a.location], null, 2, [], 1)
        await expect(run.load(txid + '_o2')).rejects.toThrow() // TODO: check error
      })

      test('method throw', async () => {
        class A extends Jig { f () { throw new Error() } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).rejects.toThrow('unexpected exception in f')
      })

      test('batch missing input', async () => {
        class A extends Jig { f (b) { this.n = b.n + 1 } }
        const code = [{ text: A.toString(), owner }]
        const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
        const args = [{ $ref: '_i0' }]
        const actions = [action1, { target: '_i1', method: 'f', args }]
        const txid = await build(code, actions, [], null, 2)
        await expect(run.load(txid + '_o3')).rejects.toThrow() // TODO: check error
      })

      test('batch missing output', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const code = [{ text: B.toString(), owner }, { text: A.toString(), owner }]
        const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
        const args = [{ $ref: '_o3' }]
        const actions = [action1, { target: '_o2', method: 'init', args, creator: run.owner.pubkey }]
        const txid = await build(code, actions, [], null, 1, 2)
        await expect(run.load(txid + '_o4')).rejects.toThrow() // TODO: check error
      })

      test('initial jig owner does not match pk script', async () => {
        class A extends Jig { }
        const code = [{ text: A.toString(), owner }]
        const anotherOwner = new bsv.PrivateKey('testnet').publicKey.toString()
        const actions = [{ target: '_o1', method: 'init', args: [], creator: anotherOwner }]
        const txid = await build(code, actions, [], null, 1)
        await expect(run.load(txid + '_o2')).rejects.toThrow('bad owner on output 2')
      })

      test('updated jig owner does not match pk script', async () => {
        class A extends Jig { send (to) { this.owner = to } }
        const a = await new A().sync()
        const privkey1 = new bsv.PrivateKey('testnet')
        const privkey2 = new bsv.PrivateKey('testnet')
        const actions = [{ target: '_i0', method: 'send', args: [`${privkey1.publicKey.toString()}`] }]
        const txid = await build([], actions, [a.location], privkey2.toAddress().toString(), 1)
        await expect(run.load(txid + '_o1')).rejects.toThrow('bad owner on output 1')
      })

      test('missing target', async () => {
        const actions = [{ target: '_o1`', method: 'init', args: '[]', creator: run.owner.pubkey }]
        const txid = await build([], actions, [], null, 1)
        await expect(run.load(txid + '_o1')).rejects.toThrow('missing target _o1')
      })

      test('bad satoshis', async () => {
        class A extends Jig { f (satoshis) { this.satoshis = satoshis } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [1000] }]
        const txid = await build([], actions, [a.location], null, 1, [], 1, [bsv.Transaction.DUST_AMOUNT])
        await expect(run.load(txid + '_o1')).rejects.toThrow('bad satoshis on output 1')
      })

      test('bad class props', async () => {
        class A extends Jig { }
        const code = [{ text: A.toString(), props: { n: { $class: 'Set' } }, owner }]
        const txid = await build(code, [], [], null, 0)
        await expect(run.load(txid + '_o1')).rejects.toThrow('$ properties must not be defined')
        const code2 = [{ text: A.toString(), props: { n: { $ref: 123 } }, owner }]
        const txid2 = await build(code2, [], [], null, 0)
        await expect(run.load(txid2 + '_o1')).rejects.toThrow('typeof location is number - must be string')
      })

      test('non-existant ref', async () => {
        class A extends Jig { init (n) { this.n = n } }
        class B extends Jig { apply (a) { this.n = a.n } }
        const a = new A(1)
        const b = new B()
        await run.sync()
        const actions = [{ target: '_i0', method: 'apply', args: [{ $ref: '_r1' }] }]
        const txid = await build([], actions, [b.location], null, 1, [a.location])
        await expect(run.load(txid + '_o1')).rejects.toThrow('unexpected ref _r1')
      })

      test('same jig arg different locations', async () => {
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
        await expect(run.load(txid + '_o1')).rejects.toThrow('referenced different locations of same jig: [jig A]')
      })

      test('same ref different locations', async () => {
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
        await expect(run.load(txid + '_o1')).rejects.toThrow('referenced different locations of same jig: [jig A]')
      })

      test('bad refs array', async () => {
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
        await expect(run.load(txid + '_o1')).rejects.toThrow() // TODO: check error
      })

      test('bad def owner', async () => {
        class A extends Jig { }
        const differentOwner = new bsv.PrivateKey().publicKey.toString()
        const code = [{ text: A.toString(), owner: differentOwner }]
        const txid = await build(code, [], [], null, 0)
        await expect(run.load(txid + '_o1')).rejects.toThrow(`bad def owner: ${txid}_o1`)
      })
    })
  })
})
