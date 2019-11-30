const bsv = require('bsv')
const { createRun, Jig } = require('./test-util')

const run = createRun()

describe('Purse', () => {
  describe('constructor', () => {
    test('generates random purse', () => {
      expect(run.purse.privkey.toString()).not.toBe(createRun().purse.privkey.toString())
    })

    test('address expected', () => {
      expect(run.purse.privkey.toAddress().toString()).toBe(run.purse.address.toString())
    })

    test('supports passing in privkey', () => {
      const privkey = new bsv.PrivateKey()
      const run = createRun({ purse: privkey })
      expect(run.purse.privkey.toString()).toBe(privkey.toString())
    })

    test('purse privkey on wrong network', () => {
      const purse = new bsv.PrivateKey('mainnet').toString()
      expect(() => createRun({ purse, network: 'test' })).toThrow('Private key network mismatch')
    })
  })

  describe('pay', () => {
    test('adds inputs and outputs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, 100)
      const tx2 = await run.purse.pay(tx)
      expect(tx2.inputs.length).toBe(1)
      expect(tx2.outputs.length).toBe(2)
    })

    test('not enough funds', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, Number.MAX_SAFE_INTEGER)
      await expect(run.purse.pay(tx)).rejects.toThrow('not enough funds')
    })

    test('automatically splits utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      await run.purse.pay(new bsv.Transaction().to(address, 100))
      const utxos = await run.blockchain.utxos(run.purse.address)
      expect(utxos.length).toBe(10)
    })
  })

  describe('balance', () => {
    test('sum of non-jig and non-class utxos', async () => {
      const utxos = await run.blockchain.utxos(run.purse.address)
      const address = new bsv.PrivateKey().toAddress()
      const send = new bsv.Transaction().from(utxos).to(address, 9999)
        .change(run.purse.address).sign(run.purse.privkey)
      await run.blockchain.broadcast(send)
      createRun({ owner: run.purse.privkey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      const utxos2 = await run.blockchain.utxos(run.purse.address)
      const nonJigUtxos = utxos2.filter(utxo => utxo.satoshis > 100000)
      const balance = nonJigUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
      expect(await run.purse.balance()).toBe(balance)
    })
  })

  describe('utxos', () => {
    test('non-jig and non-class utxos', async () => {
      const run2 = createRun({ owner: run.purse.privkey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      expect((await run2.purse.utxos()).length).toBe(10)
    })
  })
})
