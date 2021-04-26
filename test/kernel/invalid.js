/**
 * invalid.js
 *
 * Tests to ensure that invalid transactions are not loaded
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const bsv = require('bsv')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { _calculateDust } = unmangle(unmangle(Run)._bsv)

// ------------------------------------------------------------------------------------------------
// Invalid
// ------------------------------------------------------------------------------------------------

describe('Invalid', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------

  it('throws if no metadata', async () => {
    const run = new Run()
    const bsvtx = new bsv.Transaction()
    const rawtx = bsvtx.toString('hex')
    await expect(run.import(rawtx)).to.be.rejectedWith('Not a run transaction: invalid op_return protocol')
  })

  // --------------------------------------------------------------------------

  it('throws if empty metadata', async () => {
    const run = new Run()
    const rawtx = createRunTransaction({ metadata: {} })
    await expect(run.import(rawtx)).to.be.rejectedWith('Not a run transaction: invalid run metadata')
  })

  // --------------------------------------------------------------------------

  it('throws if no exec statements', async () => {
    const run = new Run()
    const rawtx = createRunTransaction({
      metadata: { in: 0, ref: [], out: [], del: [], cre: [], exec: [] },
      outputs: [{ script: '', satoshis: 1000 }]
    })
    await expect(run.import(rawtx)).to.be.rejectedWith('Invalid metadata: no commit generated')
  })

  // --------------------------------------------------------------------------

  it('throws if load payment output', async () => {
    const run = new Run()
    const config = buildDeployConfig()
    const rawtx = createRunTransaction(config)
    const txid = new bsv.Transaction(rawtx).hash
    run.blockchain.fetch = txid => rawtx
    await expect(run.load(`${txid}_o2`)).to.be.rejectedWith('Jig not found')
  })

  // --------------------------------------------------------------------------

  it('throws if invalid output script', async () => {
    const run = new Run()
    const config = buildDeployConfig()
    config.outputs[0].script = ''
    const rawtx = createRunTransaction(config)
    await expect(run.import(rawtx)).to.be.rejectedWith('Script mismatch on output 1')
  })

  // --------------------------------------------------------------------------

  it('throws if invalid output satoshis', async () => {
    const run = new Run()
    const deployConfig = buildDeployConfig()
    const deployRawtx = createRunTransaction(deployConfig)
    const deployTxid = new bsv.Transaction(deployRawtx).hash
    run.blockchain.fetch = txid => txid === deployTxid ? deployRawtx : undefined
    const instantiateConfig = buildInstantiateConfig(deployRawtx, 1000)
    instantiateConfig.outputs[0].satoshis = 999
    const instantiateRawtx = createRunTransaction(instantiateConfig)
    await expect(run.import(instantiateRawtx)).to.be.rejectedWith('Satoshis mismatch on output 1')
  })

  // --------------------------------------------------------------------------

  it('throws if cre owner too short', async () => {
    const run = new Run()
    const config = buildDeployConfig()
    config.metadata.cre[0] = 'abc'
    const rawtx = createRunTransaction(config)
    await expect(run.import(rawtx)).to.be.rejectedWith('Address too short: abc')
  })

  // --------------------------------------------------------------------------

  it('throws if cre owner is number', async () => {
    const run = new Run()
    const config = buildDeployConfig()
    config.metadata.cre[0] = 123
    const rawtx = createRunTransaction(config)
    await expect(run.import(rawtx)).to.be.rejectedWith('Invalid owner: 123')
  })

  // --------------------------------------------------------------------------

  it('throws if missing output', async () => {
    const run = new Run()
    const config = buildDeployConfig()
    config.outputs = []
    const rawtx = createRunTransaction(config)
    await expect(run.import(rawtx)).to.be.rejectedWith('Jig output missing for _o1')
  })

  // --------------------------------------------------------------------------

  it('throws if call missing method', async () => {
    const run = new Run()
    const deployConfig = buildDeployConfig()
    const deployRawtx = createRunTransaction(deployConfig)
    const deployTxid = new bsv.Transaction(deployRawtx).hash
    run.blockchain.fetch = txid => txid === deployTxid ? deployRawtx : undefined
    const callConfig = buildCallConfig(deployRawtx)
    callConfig.metadata.exec[0].data[1] = 'g'
    const callRawtx = createRunTransaction(callConfig)
    await expect(run.import(callRawtx)).to.be.rejectedWith('Cannot call A.g()')
  })

  // --------------------------------------------------------------------------

  it('throws if missing input call target', async () => {
    const run = new Run()
    const deployConfig = buildDeployConfig()
    const deployRawtx = createRunTransaction(deployConfig)
    const deployTxid = new bsv.Transaction(deployRawtx).hash
    run.blockchain.fetch = txid => txid === deployTxid ? deployRawtx : undefined
    const callConfig = buildCallConfig(deployRawtx)
    callConfig.metadata.exec[0].data[0].$jig = 1
    const callRawtx = createRunTransaction(callConfig)
    await expect(run.import(callRawtx)).to.be.rejectedWith('Cannot decode "{"$jig":1}"')
  })

  // --------------------------------------------------------------------------

  it('throws if invalid input call target', async () => {
    const run = new Run()
    const deployConfig = buildDeployConfig()
    const deployRawtx = createRunTransaction(deployConfig)
    const deployTxid = new bsv.Transaction(deployRawtx).hash
    run.blockchain.fetch = txid => txid === deployTxid ? deployRawtx : undefined
    const callConfig = buildCallConfig(deployRawtx)
    callConfig.metadata.exec[0].data[0].$jig = null
    const callRawtx = createRunTransaction(callConfig)
    await expect(run.import(callRawtx)).to.be.rejectedWith('Cannot decode "{"$jig":null}"')
  })

  // --------------------------------------------------------------------------

  it('throws if missing output new target', async () => {
    const run = new Run()
    const config = buildDeployAndInstantiateConfig()
    config.metadata.exec[1].data[0].$jig = 2
    const rawtx = createRunTransaction(config)
    await expect(run.import(rawtx)).to.be.rejectedWith('Cannot decode "{"$jig":2}"')
  })

  // --------------------------------------------------------------------------

  it('throws if missing cre entry', async () => {
    const run = new Run()
    const config = buildDeployAndInstantiateConfig()
    config.metadata.cre.length = 1
    const rawtx = createRunTransaction(config)
    await expect(run.import(rawtx)).to.be.rejectedWith('Invalid number of cre entries')
  })

  // --------------------------------------------------------------------------

  it('throws if incorrect out hash', async () => {
    const run = new Run()
    const config = buildDeployConfig()
    config.metadata.out = ['0000000000000000000000000000000000000000000000000000000000000000']
    const rawtx = createRunTransaction(config)
    await expect(run.import(rawtx)).to.be.rejectedWith('Metadata mismatch')
  })

  // --------------------------------------------------------------------------

  it('throws if missing out hash', async () => {
    const run = new Run()
    const config = buildDeployConfig()
    config.metadata.out = []
    const rawtx = createRunTransaction(config)
    await expect(run.import(rawtx)).to.be.rejectedWith('Metadata mismatch')
  })

  // --------------------------------------------------------------------------

  it('throws if invalid out hash', async () => {
    const run = new Run()
    const config = buildDeployConfig()
    config.metadata.out = [null]
    const rawtx = createRunTransaction(config)
    await expect(run.import(rawtx)).to.be.rejectedWith('Not a run transaction: invalid run metadata')
  })

  // --------------------------------------------------------------------------

  it('throws if incorrect del hash', async () => {
    const run = new Run()
    const deployConfig = buildDeployConfig()
    const deployRawtx = createRunTransaction(deployConfig)
    const deployTxid = new bsv.Transaction(deployRawtx).hash
    run.blockchain.fetch = txid => txid === deployTxid ? deployRawtx : undefined
    const destroyConfig = buildDestroyConfig(deployRawtx)
    destroyConfig.metadata.del = ['1111111111111111111111111111111111111111111111111111111111111111']
    const destroyRawtx = createRunTransaction(destroyConfig)
    await expect(run.import(destroyRawtx)).to.be.rejectedWith('Metadata mismatch')
  })

  // --------------------------------------------------------------------------

  it('throws if missing del hash', async () => {
    const run = new Run()
    const deployConfig = buildDeployConfig()
    const deployRawtx = createRunTransaction(deployConfig)
    const deployTxid = new bsv.Transaction(deployRawtx).hash
    run.blockchain.fetch = txid => txid === deployTxid ? deployRawtx : undefined
    const destroyConfig = buildDestroyConfig(deployRawtx)
    destroyConfig.metadata.del = []
    const destroyRawtx = createRunTransaction(destroyConfig)
    await expect(run.import(destroyRawtx)).to.be.rejectedWith('Metadata mismatch')
  })

  // --------------------------------------------------------------------------

  it('throws if invalid del hash', async () => {
    const run = new Run()
    const deployConfig = buildDeployConfig()
    const deployRawtx = createRunTransaction(deployConfig)
    const deployTxid = new bsv.Transaction(deployRawtx).hash
    run.blockchain.fetch = txid => txid === deployTxid ? deployRawtx : undefined
    const destroyConfig = buildDestroyConfig(deployRawtx)
    destroyConfig.metadata.del = [{}]
    const destroyRawtx = createRunTransaction(destroyConfig)
    await expect(run.import(destroyRawtx)).to.be.rejectedWith('Not a run transaction: invalid run metadata')
  })

  // TODO

  // Tests
  //  -Bad metadata structure
  //  -Not enough inputs
  //  -Invalid inputs

  /*
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
  */
})

// ------------------------------------------------------------------------------------------------

/**
 * Manually creates a run transaction
 * @param {object} options Options object
 * @param {object} options.metadata Metadata JSON
 * @param {?string} options.prefix OP_RETURN prefix
 * @param {?string} options.version Version hex string
 * @param {?string} options.app App string
 * @param {?string} options.base Raw transaction base
 * @param {?Array<{script,satoshis}>} options.outputs Outputs after the metadata
 * @param {?Array<{txid,vout}>} options.inputs Inputs spent
 * @returns {string} Raw transaction
 */
function createRunTransaction (options) {
  const Buffer = bsv.deps.Buffer
  const prefix = Buffer.from(options.prefix || 'run', 'utf8')
  const ver = Buffer.from([options.version || 0x05])
  const app = Buffer.from(options.app || '', 'utf8')
  const json = Buffer.from(JSON.stringify(options.metadata), 'utf8')
  const script = bsv.Script.buildSafeDataOut([prefix, ver, app, json])
  const opreturn = new bsv.Transaction.Output({ script, satoshis: 0 })
  const bsvtx = options.base ? new bsv.Transaction(options.base) : new bsv.Transaction()
  bsvtx.addOutput(opreturn)
  if (options.outputs) options.outputs.forEach(output => bsvtx.addOutput(new bsv.Transaction.Output(output)))
  if (options.inputs) options.inputs.forEach(input => bsvtx.from(input))
  const rawtx = bsvtx.toString('hex')
  return rawtx
}

// ------------------------------------------------------------------------------------------------

function buildDeployConfig () {
  const src = `class A extends Jig {
    init(satoshis = 0) { this.satoshis = satoshis }
    static set(n) { this.n = n }
  }`
  const address = new bsv.PrivateKey().toAddress().toString()
  const hash = new bsv.Address(address).hashBuffer.toString('hex')
  const asm = `OP_DUP OP_HASH160 ${hash} OP_EQUALVERIFY OP_CHECKSIG`
  const script = bsv.Script.fromASM(asm).toHex()
  const dust = _calculateDust(script.length / 2, bsv.Transaction.FEE_PER_KB)
  const state = {
    kind: 'code',
    props: {
      deps: { Jig: { $jig: 'native://Jig' } },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: address,
      satoshis: 0
    },
    src,
    version: '04'
  }
  const stateBuffer = bsv.deps.Buffer.from(JSON.stringify(state), 'utf8')
  const stateHash = bsv.crypto.Hash.sha256(stateBuffer).toString('hex')
  const options = {
    metadata: {
      in: 0,
      ref: ['native://Jig'],
      out: [stateHash],
      del: [],
      cre: [address],
      exec: [{ op: 'DEPLOY', data: [src, { deps: { Jig: { $jig: 0 } } }] }]
    },
    outputs: [
      { script, satoshis: dust }
    ]
  }
  return options
}

// ------------------------------------------------------------------------------------------------

function buildInstantiateConfig (deployRawtx, satoshis = 0) {
  const deployTxid = new bsv.Transaction(deployRawtx).hash
  const address = new bsv.PrivateKey().toAddress().toString()
  const hash = new bsv.Address(address).hashBuffer.toString('hex')
  const asm = `OP_DUP OP_HASH160 ${hash} OP_EQUALVERIFY OP_CHECKSIG`
  const script = bsv.Script.fromASM(asm).toHex()
  const dust = _calculateDust(script.length / 2, bsv.Transaction.FEE_PER_KB)
  const state = {
    cls: { $jig: `${deployTxid}_o1` },
    kind: 'jig',
    props: {
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: address,
      satoshis
    },
    version: '04'
  }
  const stateBuffer = bsv.deps.Buffer.from(JSON.stringify(state), 'utf8')
  const stateHash = bsv.crypto.Hash.sha256(stateBuffer).toString('hex')
  const options = {
    metadata: {
      in: 0,
      ref: [`${deployTxid}_o1`],
      out: [stateHash],
      del: [],
      cre: [address],
      exec: [{ op: 'NEW', data: [{ $jig: 0 }, [satoshis]] }]
    },
    outputs: [
      { script, satoshis: Math.max(dust, satoshis) }
    ]
  }
  return options
}

// ------------------------------------------------------------------------------------------------

function buildCallConfig (deployRawtx) {
  const deployMetadata = Run.util.metadata(deployRawtx)
  const deployTxid = new bsv.Transaction(deployRawtx).hash
  const address = deployMetadata.cre[0]
  const src = deployMetadata.exec[0].data[0]
  const hash = new bsv.Address(address).hashBuffer.toString('hex')
  const asm = `OP_DUP OP_HASH160 ${hash} OP_EQUALVERIFY OP_CHECKSIG`
  const script = bsv.Script.fromASM(asm).toHex()
  const dust = _calculateDust(script.length / 2, bsv.Transaction.FEE_PER_KB)
  const state = {
    kind: 'code',
    props: {
      deps: { Jig: { $jig: 'native://Jig' } },
      location: '_o1',
      n: 1,
      nonce: 2,
      origin: `${deployTxid}_o1`,
      owner: address,
      satoshis: 0
    },
    src,
    version: '04'
  }
  const stateBuffer = bsv.deps.Buffer.from(JSON.stringify(state), 'utf8')
  const stateHash = bsv.crypto.Hash.sha256(stateBuffer).toString('hex')
  const options = {
    metadata: {
      in: 1,
      ref: [],
      out: [stateHash],
      del: [],
      cre: [],
      exec: [{ op: 'CALL', data: [{ $jig: 0 }, 'set', [1]] }]
    },
    inputs: [
      { txid: deployTxid, vout: 1, script, satoshis: dust }
    ],
    outputs: [
      { script, satoshis: dust }
    ]
  }
  return options
}

// ------------------------------------------------------------------------------------------------

function buildDeployAndInstantiateConfig () {
  const src = 'class A extends Jig { }'
  const address = new bsv.PrivateKey().toAddress().toString()
  const hash = new bsv.Address(address).hashBuffer.toString('hex')
  const asm = `OP_DUP OP_HASH160 ${hash} OP_EQUALVERIFY OP_CHECKSIG`
  const script = bsv.Script.fromASM(asm).toHex()
  const dust = _calculateDust(script.length / 2, bsv.Transaction.FEE_PER_KB)
  const codeState = {
    kind: 'code',
    props: {
      deps: { Jig: { $jig: 'native://Jig' } },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: address,
      satoshis: 0
    },
    src,
    version: '04'
  }
  const codeStateBuffer = bsv.deps.Buffer.from(JSON.stringify(codeState), 'utf8')
  const codeStateHash = bsv.crypto.Hash.sha256(codeStateBuffer).toString('hex')
  const jigState = {
    cls: { $jig: '_o1' },
    kind: 'jig',
    props: {
      location: '_o2',
      nonce: 1,
      origin: '_o2',
      owner: address,
      satoshis: 0
    },
    version: '04'
  }
  const jigStateBuffer = bsv.deps.Buffer.from(JSON.stringify(jigState), 'utf8')
  const jigStateHash = bsv.crypto.Hash.sha256(jigStateBuffer).toString('hex')
  const options = {
    metadata: {
      in: 0,
      ref: ['native://Jig'],
      out: [codeStateHash, jigStateHash],
      del: [],
      cre: [address, address],
      exec: [
        { op: 'DEPLOY', data: [src, { deps: { Jig: { $jig: 0 } } }] },
        { op: 'NEW', data: [{ $jig: 1 }, []] }
      ]
    },
    outputs: [
      { script, satoshis: dust },
      { script, satoshis: dust }
    ]
  }
  return options
}

// ------------------------------------------------------------------------------------------------

function buildDestroyConfig (deployRawtx) {
  const deployMetadata = Run.util.metadata(deployRawtx)
  const deployTxid = new bsv.Transaction(deployRawtx).hash
  const address = deployMetadata.cre[0]
  const src = deployMetadata.exec[0].data[0]
  const hash = new bsv.Address(address).hashBuffer.toString('hex')
  const asm = `OP_DUP OP_HASH160 ${hash} OP_EQUALVERIFY OP_CHECKSIG`
  const script = bsv.Script.fromASM(asm).toHex()
  const dust = _calculateDust(script.length / 2, bsv.Transaction.FEE_PER_KB)
  const state = {
    kind: 'code',
    props: {
      deps: { Jig: { $jig: 'native://Jig' } },
      location: '_d0',
      nonce: 2,
      origin: `${deployTxid}_o1`,
      owner: null,
      satoshis: 0
    },
    src,
    version: '04'
  }
  const stateBuffer = bsv.deps.Buffer.from(JSON.stringify(state), 'utf8')
  const stateHash = bsv.crypto.Hash.sha256(stateBuffer).toString('hex')
  const options = {
    metadata: {
      in: 1,
      ref: [],
      out: [],
      del: [stateHash],
      cre: [],
      exec: [{ op: 'CALL', data: [{ $jig: 0 }, 'destroy', []] }]
    },
    inputs: [
      { txid: deployTxid, vout: 1, script, satoshis: dust }
    ],
    outputs: [
      { script, satoshis: dust }
    ]
  }
  return options
}

// ------------------------------------------------------------------------------------------------
