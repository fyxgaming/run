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
  _name,
  checkSatoshis,
  ownerScript,
  getNormalizedSourceCode,
  deployable,
  checkRunTransaction,
  extractRunData,
  outputType,
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

  describe('_name', () => {
    it('should create short names', () => {
      // Strings
      expect(_name('')).to.equal('""')
      expect(_name('abc')).to.equal('"abc"')
      expect(_name('Hello, world!')).to.equal('"Hello, wor…"')
      // Booleans
      expect(_name(true)).to.equal('true')
      expect(_name(false)).to.equal('false')
      // Numbers
      expect(_name(1)).to.equal('1')
      expect(_name(-1)).to.equal('-1')
      expect(_name(1.5)).to.equal('1.5')
      expect(_name(NaN)).to.equal('NaN')
      expect(_name(-Infinity)).to.equal('-Infinity')
      // Symbols
      expect(_name(Symbol.iterator)).to.equal('Symbol(Symbol.iterator)')
      expect(_name(Symbol.unscopables)).to.equal('Symbol(Symbol.unscopables)')
      // Undefined
      expect(_name(undefined)).to.equal('undefined')
      // Objects
      expect(_name(null)).to.equal('null')
      expect(_name({})).to.equal('[object Object]')
      expect(_name({ a: 1 })).to.equal('[object Object]')
      expect(_name([1, 2, 3])).to.equal('[object Array]')
      expect(_name(new class Dragon {}())).to.equal('[object Dragon]')
      // Functions
      expect(_name(function f () { })).to.equal('f')
      expect(_name(class A { })).to.equal('A')
      expect(_name(function () { })).to.equal('[anonymous function]')
      expect(_name(() => { })).to.equal('[anonymous function]')
      expect(_name(class { })).to.equal('[anonymous class]')
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
      expect(() => checkSatoshis(100000001)).to.throw('satoshis must be less than 100000000')
    })
  })

  describe('ownerScript', () => {
    it('should support valid owners on different networks', () => {
      const networks = [['main', 'mainnet'], ['test', 'testnet']]
      for (const [network, bsvNetwork] of networks) {
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
    it('should detects valid run transaction', () => {
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

  describe('outputType', () => {
    it('should return rundata', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(outputType(tx, 0)).to.equal('rundata')
    })

    it('should return code', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 1)).to.equal('code')
    })

    it('should return jig', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 2)).to.equal('jig')
      expect(outputType(tx, 3)).to.equal('jig')
    })

    it('should return other for change', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 4)).to.equal('other')
    })

    it('should return other for money', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(outputType(tx, 0)).to.equal('other')
    })

    it('should return other for bad run data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], 'hello, world', 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 4)).to.equal('other')
    })
  })

  describe('getNormalizedSourceCode', () => {
    // Node 8 and Node 12 have slightly different spacing for getNormalizedSourceCode('function () { return 1 }')
    // We don't need the normalized code to always be exactly the same, as long as it functions the same.
    function expectNormalizedSourceCode (type, text) {
      const removeWhitespace = str => str.replace(/\s+/g, '')
      expect(removeWhitespace(getNormalizedSourceCode(type))).to.equal(removeWhitespace(text))
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

  describe('deployable', () => {
    it('should return true for allowed', () => {
      class B { }
      expect(deployable(class A { })).to.equal(true)
      expect(deployable(class A extends B { })).to.equal(true)
      expect(deployable(function f () {})).to.equal(true)
      expect(deployable(() => {})).to.equal(true)
      expect(deployable(function () { })).to.equal(true)
      expect(deployable(class {})).to.equal(true)
    })

    it('should return false for non-functions', () => {
      expect(deployable()).to.equal(false)
      expect(deployable(1)).to.equal(false)
      expect(deployable({})).to.equal(false)
      expect(deployable(true)).to.equal(false)
    })

    it('should return false for standard library objects', () => {
      expect(deployable(Array)).to.equal(false)
      expect(deployable(Uint8Array)).to.equal(false)
      expect(deployable(Math.sin)).to.equal(false)
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