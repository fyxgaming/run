/**
 * util.js
 *
 * Tests for ../lib/util.js
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run, Jig, createRun } = require('./helpers')
const {
  checkOwner,
  checkSatoshis,
  getNormalizedSourceCode,
  deployable,
  checkRunTransaction,
  extractRunData,
  outputType,
  encryptRunData,
  decryptRunData,
  richObjectToJson,
  jsonToRichObject,
  extractJigsAndCodeToArray,
  injectJigsAndCodeFromArray,
  SerialTaskQueue
} = Run._util

const run = createRun()

describe('util', () => {
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

  describe('checkOwner', () => {
    it('should support valid owners on different networks', () => {
      expect(() => checkOwner(new bsv.PrivateKey('mainnet').publicKey.toString())).not.to.throw()
      expect(() => checkOwner(new bsv.PrivateKey('testnet').publicKey.toString())).not.to.throw()
    })

    it('should throw if bad owner', () => {
      expect(() => checkOwner()).to.throw('owner must be a pubkey string')
      expect(() => checkOwner(123)).to.throw('owner must be a pubkey string')
      expect(() => checkOwner('hello')).to.throw('owner is not a valid public key')
      expect(() => checkOwner(new bsv.PrivateKey())).to.throw('owner must be a pubkey string')
      expect(() => checkOwner(new bsv.PrivateKey().publicKey)).to.throw('owner must be a pubkey string')
      expect(() => checkOwner([new bsv.PrivateKey().publicKey.toString()])).to.throw('owner must be a pubkey string')
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
      const tx2 = buildRunTransaction('run', [0x02], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx2)).to.throw(`Unsupported run protocol in tx: ${tx2.hash}`)
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

    it('should return false for anonymous types', () => {
      expect(deployable(() => {})).to.equal(false)
      expect(deployable(function () { })).to.equal(false)
      expect(deployable(class {})).to.equal(false)
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

  describe('richObjectToJson', () => {
    it('should convert number', () => {
      expect(richObjectToJson(1)).to.equal(1)
      expect(richObjectToJson(-1)).to.equal(-1)
      expect(richObjectToJson(0)).to.equal(0)
      expect(richObjectToJson(1.5)).to.equal(1.5)
      expect(richObjectToJson(Number.MAX_SAFE_INTEGER)).to.equal(Number.MAX_SAFE_INTEGER)
      expect(richObjectToJson(Number.MAX_VALUE)).to.equal(Number.MAX_VALUE)
      expect(richObjectToJson(Number.MIN_SAFE_INTEGER)).to.equal(Number.MIN_SAFE_INTEGER)
      expect(richObjectToJson(Number.MIN_VALUE)).to.equal(Number.MIN_VALUE)
      expect(() => richObjectToJson(NaN)).to.throw('NaN cannot be serialized to json')
      expect(() => richObjectToJson(Infinity)).to.throw('Infinity cannot be serialized to json')
    })

    it('should convert boolean', () => {
      expect(richObjectToJson(true)).to.equal(true)
      expect(richObjectToJson(false)).to.equal(false)
    })

    it('should convert string', () => {
      expect(richObjectToJson('')).to.equal('')
      expect(richObjectToJson('123abc')).to.equal('123abc')
      expect(richObjectToJson('🐉')).to.equal('🐉')
    })

    it('should throw for function', () => {
      expect(() => richObjectToJson(() => {})).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(function () {})).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(Math.sin)).to.throw('cannot be serialized to json')
    })

    it('should throw for symbol', () => {
      expect(() => richObjectToJson(Symbol.hasInstance)).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
    })

    it('should convert object', () => {
      expect(richObjectToJson(null)).to.equal(null)
      expect(richObjectToJson({})).to.deep.equal({})
      expect(richObjectToJson({ a: 'a', n: 1, b: false })).to.deep.equal({ a: 'a', n: 1, b: false })
      expect(richObjectToJson({ o: { n: 1 } })).to.deep.equal({ o: { n: 1 } })
      expect(() => richObjectToJson({ s: Symbol.hasInstance })).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expect(() => richObjectToJson({ f: () => {} })).to.throw('() => {} cannot be serialized to json')
    })

    it('should convert array', () => {
      expect(richObjectToJson([])).to.deep.equal([])
      expect(richObjectToJson([1, 2, 3])).to.deep.equal([1, 2, 3])
      expect(richObjectToJson([{ a: '1' }, ['b']])).to.deep.equal([{ a: '1' }, ['b']])
      expect(() => richObjectToJson([Symbol.hasInstance])).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expect(() => richObjectToJson([() => {}])).to.throw('() => {} cannot be serialized to json')
    })

    it('should convert uint8array', () => {
      expect(richObjectToJson(new Uint8Array(0))).to.deep.equal({ $class: 'Uint8Array', base64Data: '' })
      expect(richObjectToJson(new Uint8Array(1))).to.deep.equal({ $class: 'Uint8Array', base64Data: 'AA==' })
      expect(richObjectToJson(new Uint8Array([1, 2, 3]))).to.deep.equal({ $class: 'Uint8Array', base64Data: 'AQID' })
      expect(richObjectToJson(new Uint8Array([255, 255, 255]))).to.deep.equal({ $class: 'Uint8Array', base64Data: '////' })
    })

    it('should allow duplicates', () => {
      const o = {}
      expect(() => richObjectToJson({ a: o, b: o })).not.to.throw()
    })

    it('should throw for circular references', () => {
      const a = {}
      const b = { a }
      a.b = b
      expect(() => richObjectToJson(a)).to.throw('circular reference detected: a')
    })

    it('should throw for unserializable types', () => {
      expect(() => richObjectToJson(new class {}())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(new class extends Array {}())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(new Set())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(new Map())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(Buffer.alloc(0))).to.throw('cannot be serialized to json')
    })

    it('should convert undefined', () => {
      expect(richObjectToJson(undefined)).to.deep.equal({ $class: 'undefined' })
    })

    it('should throw for $ properties', () => {
      expect(() => richObjectToJson({ $class: 'unknown' })).to.throw('$ properties must not be defined')
      expect(() => richObjectToJson({ $ref: 'unknown' })).to.throw('$ properties must not be defined')
      expect(() => richObjectToJson({ $n: 1 })).to.throw('$ properties must not be defined')
    })

    it('should support custom packers', () => {
      const setPacker = x => { if (x && x.constructor === Set) return { $class: 'set' } }
      const mapPacker = x => { if (x && x.constructor === Map) return { $class: 'map' } }
      expect(richObjectToJson({ a: [1], s: new Set(), m: new Map() }, [setPacker, mapPacker]))
        .to.deep.equal({ a: [1], s: { $class: 'set' }, m: { $class: 'map' } })
    })
  })

  describe('jsonToRichObject', () => {
    it('should convert number', () => {
      expect(jsonToRichObject(1)).to.equal(1)
      expect(jsonToRichObject(-1)).to.equal(-1)
      expect(jsonToRichObject(0)).to.equal(0)
      expect(jsonToRichObject(1.5)).to.equal(1.5)
      expect(jsonToRichObject(Number.MAX_SAFE_INTEGER)).to.equal(Number.MAX_SAFE_INTEGER)
      expect(jsonToRichObject(Number.MAX_VALUE)).to.equal(Number.MAX_VALUE)
      expect(jsonToRichObject(Number.MIN_SAFE_INTEGER)).to.equal(Number.MIN_SAFE_INTEGER)
      expect(jsonToRichObject(Number.MIN_VALUE)).to.equal(Number.MIN_VALUE)
      expect(() => jsonToRichObject(NaN)).to.throw('JSON should not contain NaN')
      expect(() => jsonToRichObject(Infinity)).to.throw('JSON should not contain Infinity')
    })

    it('should convert boolean', () => {
      expect(jsonToRichObject(true)).to.equal(true)
      expect(jsonToRichObject(false)).to.equal(false)
    })

    it('should convert string', () => {
      expect(jsonToRichObject('')).to.equal('')
      expect(jsonToRichObject('123abc')).to.equal('123abc')
      expect(jsonToRichObject('🐉')).to.equal('🐉')
    })

    it('should throw for function', () => {
      expect(() => jsonToRichObject(() => {})).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(function () {})).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(Math.sin)).to.throw('JSON should not contain function')
    })

    it('should throw for symbol', () => {
      expect(() => jsonToRichObject(Symbol.hasInstance)).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
    })

    it('should convert object', () => {
      expect(jsonToRichObject(null)).to.equal(null)
      expect(jsonToRichObject({})).to.deep.equal({})
      expect(jsonToRichObject({ a: 'a', n: 1, b: false })).to.deep.equal({ a: 'a', n: 1, b: false })
      expect(jsonToRichObject({ o: { n: 1 } })).to.deep.equal({ o: { n: 1 } })
      expect(() => jsonToRichObject({ s: Symbol.hasInstance })).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
      expect(() => jsonToRichObject({ f: () => {} })).to.throw('JSON should not contain () => {}')
    })

    it('should convert array', () => {
      expect(jsonToRichObject([])).to.deep.equal([])
      expect(jsonToRichObject([1, 2, 3])).to.deep.equal([1, 2, 3])
      expect(jsonToRichObject([{ a: '1' }, ['b']])).to.deep.equal([{ a: '1' }, ['b']])
      expect(() => jsonToRichObject([Symbol.hasInstance])).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
      expect(() => jsonToRichObject([() => {}])).to.throw('JSON should not contain () => {}')
    })

    it('should convert uint8array', () => {
      const Uint8Array = run.code.intrinsics.default.Uint8Array
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: '' })).to.deep.equal(new Uint8Array(0))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: 'AA==' })).to.deep.equal(new Uint8Array(1))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: 'AQID' })).to.deep.equal(new Uint8Array([1, 2, 3]))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: '////' })).to.deep.equal(new Uint8Array([255, 255, 255]))
    })

    it('should throw for unserializable types', () => {
      expect(() => jsonToRichObject(new class {}())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(new class extends Array {}())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(new Set())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(new Map())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(Buffer.alloc(0))).to.throw('JSON should not contain')
    })

    it('should convert undefined', () => {
      expect(jsonToRichObject({ undef: { $class: 'undefined' } })).to.deep.equal({ undef: undefined })
      expect(jsonToRichObject({ $class: 'undefined' })).to.equal(undefined)
    })

    it('should throw for $class', () => {
      expect(() => jsonToRichObject({ $class: 'unknown' })).to.throw('$ properties must not be defined')
    })

    it('should support custom unpackers', () => {
      const setUnpacker = x => { if (x.$class === 'set') return new Set() }
      const mapUnpacker = x => { if (x.$class === 'map') return new Map() }
      expect(jsonToRichObject({ a: [1], s: { $class: 'set' }, m: { $class: 'map' } }, [setUnpacker, mapUnpacker])).to.deep.equal({ a: [1], s: new Set(), m: new Map() })
      const rootUnpacker = (x, p, k) => { if (p === null) return 1 }
      expect(jsonToRichObject({}, [rootUnpacker])).to.equal(1)
      const namedUnpacker = (x, p, k) => { if (k === 'a') return 1 }
      expect(jsonToRichObject({ a: [], b: 2 }, [namedUnpacker])).to.deep.equal({ a: 1, b: 2 })
    })
  })

  describe('extractJigsAndCodeToArray', () => {
    it('should support basic extraction', () => {
      class A extends Jig { }
      const arr = []
      const obj = { a: new A(), b: [new A(), A] }
      const json = richObjectToJson(obj, [extractJigsAndCodeToArray(arr)])
      expect(json).to.deep.equal({ a: { $index: 0 }, b: [{ $index: 1 }, { $index: 2 }] })
      expect(arr.length).to.equal(3)
      expect(arr[0]).to.equal(obj.a)
      expect(arr[1]).to.equal(obj.b[0])
      expect(arr[2]).to.equal(obj.b[1])
    })
  })

  describe('injectJigsAndCodeFromArray', () => {
    it('should support basic injection', () => {
      class A extends Jig { }
      const arr = [new A(), new A(), A]
      const json = { a: { $index: 0 }, b: [{ $index: 1 }, { $index: 2 }] }
      const obj = jsonToRichObject(json, [injectJigsAndCodeFromArray(arr)])
      expect(obj.a).to.equal(arr[0])
      expect(obj.b[0]).to.equal(arr[1])
      expect(obj.b[1]).to.equal(arr[2])
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
