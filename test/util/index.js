/**
 * index.js
 *
 * Tests for lib/util/index.js
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const { Run } = require('../config')
const { expect } = require('chai')
const { AddressScript, PubKeyScript } = Run
const {
  _bsvNetwork,
  checkSatoshis,
  ownerScript,
  getNormalizedSourceCode,
  checkRunTransaction,
  extractRunData,
  _outputType,
  encryptRunData,
  decryptRunData,
  SerialTaskQueue
} = Run._util

describe('util', () => {
  describe('_bsvNetwork', () => {
    it('should return appropriate network', () => {
      expect(_bsvNetwork('main')).to.equal('mainnet')
      expect(_bsvNetwork('mainnet')).to.equal('mainnet')
      expect(_bsvNetwork('mainSideChain')).to.equal('mainnet')
      expect(_bsvNetwork('test')).to.equal('testnet')
      expect(_bsvNetwork('mock')).to.equal('testnet')
      expect(_bsvNetwork('stn')).to.equal('testnet')
    })
  })

  describe('checkSatoshis', () => {
    it('should support allowed values', () => {
      expect(() => checkSatoshis(0)).not.to.throw()
      expect(() => checkSatoshis(1)).not.to.throw()
      expect(() => checkSatoshis(bsv.Transaction.DUST_AMOUNT)).not.to.throw()
      expect(() => checkSatoshis(100000000)).not.to.throw()
    })

    it('should throw if bad satoshis', () => {
      expect(() => checkSatoshis()).to.throw('satoshis must be a number')
      expect(() => checkSatoshis(-1)).to.throw('satoshis must be non-negative')
      expect(() => checkSatoshis('0')).to.throw('satoshis must be a number')
      expect(() => checkSatoshis([0])).to.throw('satoshis must be a number')
      expect(() => checkSatoshis(1.5)).to.throw('satoshis must be an integer')
      expect(() => checkSatoshis(NaN)).to.throw('satoshis must be an integer')
      expect(() => checkSatoshis(Infinity)).to.throw('satoshis must be an integer')
      expect(() => checkSatoshis(100000001)).to.throw('satoshis must be <= 100000000')
    })
  })

  describe('ownerScript', () => {
    it('should support valid owners on different networks', () => {
      for (const bsvNetwork of ['mainnet', 'testnet']) {
        const privkey = new bsv.PrivateKey(bsvNetwork)
        const pubkey = privkey.publicKey.toString()
        const addr = privkey.toAddress().toString()
        const bytes = new AddressScript(addr).toBytes()
        expect(ownerScript(pubkey).toBytes()).to.deep.equal(bytes)
        expect(ownerScript(addr).toBytes()).to.deep.equal(bytes)
        expect(ownerScript(new PubKeyScript(pubkey)).toBytes()).to.deep.equal(new PubKeyScript(pubkey).toBytes())
        expect(ownerScript(new AddressScript(addr)).toBytes()).to.deep.equal(bytes)
      }
    })

    it('should throw if bad owner', () => {
      expect(() => ownerScript()).to.throw('Invalid owner: undefined')
      expect(() => ownerScript(123)).to.throw('Invalid owner: 123')
      expect(() => ownerScript('hello')).to.throw('Invalid owner: hello')
      expect(() => ownerScript(new bsv.PrivateKey())).to.throw('Invalid owner')
      expect(() => ownerScript(new bsv.PrivateKey().publicKey)).to.throw('Invalid owner')
      expect(() => ownerScript([new bsv.PrivateKey().publicKey.toString()])).to.throw('Invalid owner')
    })
  })

  function buildRunTransaction (prefixString, protocolVersionArray, runData, scriptBuilder,
    containDebugInfo, numAdditionalOutputs) {
    const Buffer = bsv.deps.Buffer
    const prefix = Buffer.from(prefixString, 'utf8')
    const protocolVersion = Buffer.from(protocolVersionArray, 'hex')
    const appId = Buffer.from('my-app', 'utf8')
    const payload = Buffer.from(encryptRunData(runData), 'utf8')
    const debugInfo = Buffer.from('r11r', 'utf8')
    const parts = containDebugInfo
      ? [prefix, protocolVersion, appId, payload, debugInfo]
      : [prefix, protocolVersion, appId, payload]
    const script = bsv.Script[scriptBuilder](parts)
    const tx = new bsv.Transaction().addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))
    for (let i = 0; i < numAdditionalOutputs; i++) { tx.to(new bsv.PrivateKey().toAddress(), 100) }
    return tx
  }

  describe('checkRunTransaction', () => {
    it('should detect valid run transaction', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).not.to.throw()
    })

    it('should throw if a money transaction', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('should throw if bad prefix', () => {
      const tx = buildRunTransaction('run0', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('should throw if bad protocol version', () => {
      const tx1 = buildRunTransaction('run', [0x00, Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx1)).to.throw(`Unsupported run protocol in tx: ${tx1.hash}`)
      const tx2 = buildRunTransaction('run', [0x01], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx2)).to.throw(`Unsupported run protocol in tx: ${tx2.hash}`)
      const tx3 = buildRunTransaction('run', [0x03], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx3)).to.throw(`Unsupported run protocol in tx: ${tx3.hash}`)
    })

    it('should throw if not op_false op_return', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('should throw if no debug info', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', false, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })
  })

  describe('extractRunData', () => {
    it('should decrypt data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(extractRunData(tx)).to.deep.equal({ code: [1], jigs: 2 })
    })

    it('should throw if not a run tx', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(() => extractRunData(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })
  })

  describe('_outputType', () => {
    it('should return rundata', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(_outputType(tx, 0)).to.equal('rundata')
    })

    it('should return code', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(_outputType(tx, 1)).to.equal('code')
    })

    it('should return jig', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(_outputType(tx, 2)).to.equal('jig')
      expect(_outputType(tx, 3)).to.equal('jig')
    })

    it('should return other for change', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(_outputType(tx, 4)).to.equal('other')
    })

    it('should return other for money', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(_outputType(tx, 0)).to.equal('other')
    })

    it('should return other for bad run data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], 'hello, world', 'buildSafeDataOut', true, 4)
      expect(_outputType(tx, 4)).to.equal('other')
    })
  })

  describe('getNormalizedSourceCode', () => {
    // Node 8 and Node 12 have slightly different spacing for getNormalizedSourceCode('function () { return 1 }')
    // We don't need the normalized code to always be exactly the same, as long as it functions the same.
    // Compiled build also add semicolons, so we normlize that too.
    function expectNormalizedSourceCode (type, text) {
      const normalize = str => str.replace(/\s+/g, '').replace(/;/g, '')
      expect(normalize(getNormalizedSourceCode(type))).to.equal(normalize(text))
    }

    it('should get code for basic class', () => {
      class A {}
      expectNormalizedSourceCode(A, 'class A {}')
    })

    it('should get code for basic function', () => {
      function f () { return 1 }
      expectNormalizedSourceCode(f, 'function f () { return 1 }')
    })

    it('should get code for class that extends another class', () => {
      const SomeLibrary = { B: class B { } }
      class A extends SomeLibrary.B {}
      expectNormalizedSourceCode(A, 'class A extends B {}')
    })

    it('should get code for single-line class', () => {
      class B { }
      class A extends B { f () {} }
      expectNormalizedSourceCode(A, 'class A extends B { f () {} }')
    })
  })

  describe('encryptRunData', () => {
    it('should encrypt run data', () => {
      const encrypted = encryptRunData({ a: 1 })
      expect(encrypted).not.to.equal(JSON.stringify({ a: 1 }))
    })
  })

  describe('decryptRunData', () => {
    it('should decrypt run data', () => {
      const encrypted = encryptRunData({ a: 1 })
      expect(decryptRunData(encrypted)).to.deep.equal({ a: 1 })
    })

    it('should throw for bad data', () => {
      expect(() => decryptRunData(JSON.stringify({ a: 1 }))).to.throw('unable to parse decrypted run data')
    })
  })

  describe('SerialTaskQueue', () => {
    const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }

    it('should serialize tasks in order', async () => {
      const queue = new SerialTaskQueue()
      const order = []; const promises = []
      promises.push(queue.enqueue(async () => { await sleep(5); order.push(1) }))
      promises.push(queue.enqueue(async () => { await sleep(3); order.push(2) }))
      promises.push(queue.enqueue(async () => { await sleep(1); order.push(3) }))
      await Promise.all(promises)
      expect(order).to.deep.equal([1, 2, 3])
    })

    it('should support stops and starts', async () => {
      const queue = new SerialTaskQueue()
      let done1 = false; let done2 = false
      await queue.enqueue(() => { done1 = true })
      expect(done1).to.equal(true)
      await queue.enqueue(() => { done2 = true })
      expect(done2).to.equal(true)
    })
  })
})
