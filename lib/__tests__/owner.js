const bsv = require('bsv')
const { createRun, hookPay, Jig } = require('./test-util')

describe('Owner', () => {
  describe('constructor', () => {
    test('from bsv private key (testnet)', () => {
      const privkey = new bsv.PrivateKey('testnet')
      const run = createRun({ owner: privkey })
      expect(run.owner.privkey).toBe(privkey.toString())
      expect(run.owner.pubkey).toBe(privkey.publicKey.toString())
      expect(run.owner.address).toBe(privkey.toAddress().toString())
    })

    test('from string private key (mainnet)', () => {
      const privkey = new bsv.PrivateKey('mainnet')
      const run = createRun({ network: 'main', owner: privkey.toString() })
      expect(run.owner.privkey).toBe(privkey.toString())
      expect(run.owner.pubkey).toBe(privkey.publicKey.toString())
      expect(run.owner.address).toBe(privkey.toAddress().toString())
    })

    test('from bsv public key (mainnet)', () => {
      const pubkey = new bsv.PrivateKey('mainnet').publicKey
      const run = createRun({ network: 'main', owner: pubkey })
      expect(run.owner.privkey).toBeUndefined()
      expect(run.owner.pubkey).toBe(pubkey.toString())
      expect(run.owner.address).toBe(pubkey.toAddress().toString())
    })

    test('from string public key (mocknet)', () => {
      const pubkey = new bsv.PrivateKey('testnet').publicKey
      const run = createRun({ network: 'mock', owner: pubkey.toString() })
      expect(run.owner.privkey).toBeUndefined()
      expect(run.owner.pubkey).toBe(pubkey.toString())
      expect(run.owner.address).toBe(pubkey.toAddress().toString())
    })

    test('from bsv address (stn)', () => {
      const address = new bsv.PrivateKey('testnet').toAddress()
      const run = createRun({ network: 'stn', owner: address })
      expect(run.owner.privkey).toBeUndefined()
      expect(run.owner.pubkey).toBeUndefined()
      expect(run.owner.address).toBe(address.toString())
    })

    test('from string address (mainnet)', () => {
      const address = new bsv.PrivateKey('livenet').toAddress()
      const run = createRun({ network: 'main', owner: address.toString() })
      expect(run.owner.privkey).toBeUndefined()
      expect(run.owner.pubkey).toBeUndefined()
      expect(run.owner.address).toBe(address.toString())
    })

    test('bad owner', () => {
      expect(() => createRun({ owner: '123' })).toThrow('bad owner key or address: 123')
    })

    test('owner privkey on wrong network', () => {
      const owner = new bsv.PrivateKey('testnet').toString()
      expect(() => createRun({ owner, network: 'main' })).toThrow('Private key network mismatch')
    })
  })

  describe('code', () => {
    test('live updates', async () => {
      const run = createRun()
      class A extends Jig { set (x) { this.x = x }}
      run.deploy(A)
      expect(run.owner.code.length).toBe(1)
      expect(run.owner.code[0].name).toBe('A')
      expect(run.owner.code[0].origin).toBe(A.origin)
      expect(run.owner.code[0].location).toBe(A.location)
      await run.sync()
      expect(run.owner.code.length).toBe(1)
      expect(run.owner.code[0].name).toBe('A')
      expect(run.owner.code[0].origin).toBe(A.origin)
      expect(run.owner.code[0].location).toBe(A.location)
      const a = new A()
      a.set(function add (a, b) { return a + b })
      expect(run.owner.code.length).toBe(2)
      await run.sync()
      expect(run.owner.code.length).toBe(2)
    })

    test('fail to post', async () => {
      const run = createRun()
      hookPay(run, false)
      class A {}
      run.deploy(A)
      expect(run.owner.code.length).toBe(1)
      expect(run.owner.code[0].name).toBe('A')
      expect(run.owner.code[0].origin).toBe(A.origin)
      expect(run.owner.code[0].location).toBe(A.location)
      await expect(run.sync()).rejects.toThrow()
      expect(run.owner.code.length).toBe(0)
    })
  })

  describe('jigs', () => {
    test('live updates', async () => {
      const run = createRun()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { send (to) { this.owner = to } }
      A.deps = { B }
      const a = new A()
      expect(run.owner.jigs).toEqual([a])
      const b = a.createB()
      expect(run.owner.jigs).toEqual([a, b])
      await run.sync()
      expect(run.owner.jigs).toEqual([a, b])
      b.send(new bsv.PrivateKey().publicKey.toString())
      expect(run.owner.jigs).toEqual([a])
      await run.sync()
      expect(run.owner.jigs).toEqual([a])
    })

    test('sync', async () => {
      const run = createRun()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { }
      A.deps = { B }
      const a = new A()
      const b = a.createB()
      expect(run.owner.jigs).toEqual([a, b])
      await run.sync()
      const run2 = createRun({ owner: run.owner.privkey, blockchain: run.blockchain })
      const c = new A()
      await run2.sync()
      expect(run2.owner.jigs).toEqual([c, a, b])
    })

    test('fail to post', async () => {
      const run = createRun()
      hookPay(run, false)
      class A extends Jig {}
      const a = new A()
      expect(run.owner.jigs).toEqual([a])
      expect(run.owner.code.length).toBe(1)
      await expect(run.sync()).rejects.toThrow('tx has no inputs')
      expect(run.owner.jigs.length).toBe(0)
      expect(run.owner.code.length).toBe(0)
    })

    test('filter by class', async () => {
      const run = createRun()
      class A extends Jig {}
      class B extends Jig {}
      const a = new A()
      new B() // eslint-disable-line
      expect(run.owner.jigs.find(x => x instanceof A)).toEqual(a)
    })

    test('without key', async () => {
      const run = createRun()
      class A extends Jig {}
      const a = await new A().sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.pubkey })
      await run2.sync()
      expect(run2.owner.privkey).toBeUndefined()
      expect(run2.owner.jigs).toEqual([a])
    })
  })
})
