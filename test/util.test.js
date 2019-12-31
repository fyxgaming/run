const bsv = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { createRun, Run, Jig, getObfuscatedKey } = require('./test-util')

const util = Run[getObfuscatedKey('_util')]
const checkOwner = util[getObfuscatedKey('checkOwner')]
const checkSatoshis = util[getObfuscatedKey('checkSatoshis')]
const codeText = util[getObfuscatedKey('codeText')]
const deployable = util[getObfuscatedKey('deployable')]
const checkRunTransaction = util[getObfuscatedKey('checkRunTransaction')]
const extractRunData = util[getObfuscatedKey('extractRunData')]
const outputType = util[getObfuscatedKey('outputType')]
const encryptRunData = util[getObfuscatedKey('encryptRunData')]
const decryptRunData = util[getObfuscatedKey('decryptRunData')]
const richObjectToJson = util[getObfuscatedKey('richObjectToJson')]
const jsonToRichObject = util[getObfuscatedKey('jsonToRichObject')]
const extractJigsAndCodeToArray = util[getObfuscatedKey('extractJigsAndCodeToArray')]
const injectJigsAndCodeFromArray = util[getObfuscatedKey('injectJigsAndCodeFromArray')]
const deepTraverse = util[getObfuscatedKey('deepTraverse')]
const SerialTaskQueue = util[getObfuscatedKey('SerialTaskQueue')]
const intrinsicsKey = getObfuscatedKey('intrinsics')

createRun()

describe('util', () => {
  describe('checkSatoshis', () => {
    it('allowed values', () => {
      expect(() => checkSatoshis(0)).not.to.throw()
      expect(() => checkSatoshis(1)).not.to.throw()
      expect(() => checkSatoshis(bsv.Transaction.DUST_AMOUNT)).not.to.throw()
      expect(() => checkSatoshis(100000000)).not.to.throw()
    })

    it('bad satoshis', () => {
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
    it('any network', () => {
      expect(() => checkOwner(new bsv.PrivateKey('mainnet').publicKey.toString())).not.to.throw()
      expect(() => checkOwner(new bsv.PrivateKey('testnet').publicKey.toString())).not.to.throw()
    })

    it('bad owners throw', () => {
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
    it('detects valid', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).not.to.throw()
    })

    it('money transaction', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('bad prefix', () => {
      const tx = buildRunTransaction('run0', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('bad protocol version', () => {
      const tx1 = buildRunTransaction('run', [0x00, Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx1)).to.throw(`Unsupported run protocol in tx: ${tx1.hash}`)
      const tx2 = buildRunTransaction('run', [0x02], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx2)).to.throw(`Unsupported run protocol in tx: ${tx2.hash}`)
    })

    it('not op_false op_return', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('no debug info', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', false, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })
  })

  describe('extractRunData', () => {
    it('decrypts data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(extractRunData(tx)).to.deep.equal({ code: [1], jigs: 2 })
    })

    it('not a run tx', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(() => extractRunData(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })
  })

  describe('outputType', () => {
    it('rundata', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(outputType(tx, 0)).to.equal('rundata')
    })

    it('code', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 1)).to.equal('code')
    })

    it('jig', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 2)).to.equal('jig')
      expect(outputType(tx, 3)).to.equal('jig')
    })

    it('change', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 4)).to.equal('other')
    })

    it('money', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(outputType(tx, 0)).to.equal('other')
    })

    it('bad run data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], 'hello, world', 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 4)).to.equal('other')
    })
  })

  describe('codeText', () => {
    it('basic class', () => {
      class A {}
      expect(codeText(A)).to.equal('class A {}')
    })

    it('basic function', () => {
      function f () { return 1 }
      expect(codeText(f)).to.equal('function f () { return 1 }')
    })

    it('class extends different parent', () => {
      const SomeLibrary = { B: class B { } }
      class A extends SomeLibrary.B {}
      expect(codeText(A)).to.equal('class A extends B {}')
    })
  })

  describe('deployable', () => {
    it('allowed', () => {
      class B { }
      expect(deployable(class A { })).to.equal(true)
      expect(deployable(class A extends B { })).to.equal(true)
      expect(deployable(function f () {})).to.equal(true)
    })

    it('non-functions', () => {
      expect(deployable()).to.equal(false)
      expect(deployable(1)).to.equal(false)
      expect(deployable({})).to.equal(false)
      expect(deployable(true)).to.equal(false)
    })

    it('standard library', () => {
      expect(deployable(Array)).to.equal(false)
      expect(deployable(Uint8Array)).to.equal(false)
      expect(deployable(Math.sin)).to.equal(false)
    })

    it('anonymous types', () => {
      expect(deployable(() => {})).to.equal(false)
      expect(deployable(function () { })).to.equal(false)
      expect(deployable(class {})).to.equal(false)
    })
  })

  describe('encryptRunData', () => {
    it('basic encryption', () => {
      const encrypted = encryptRunData({ a: 1 })
      expect(encrypted).not.to.equal(JSON.stringify({ a: 1 }))
    })
  })

  describe('decryptRunData', () => {
    it('basic decryption', () => {
      const encrypted = encryptRunData({ a: 1 })
      expect(decryptRunData(encrypted)).to.deep.equal({ a: 1 })
    })

    it('bad data', () => {
      expect(() => decryptRunData(JSON.stringify({ a: 1 }))).to.throw('unable to parse decrypted run data')
    })
  })

  describe('richObjectToJson', () => {
    it('number', () => {
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

    it('boolean', () => {
      expect(richObjectToJson(true)).to.equal(true)
      expect(richObjectToJson(false)).to.equal(false)
    })

    it('string', () => {
      expect(richObjectToJson('')).to.equal('')
      expect(richObjectToJson('123abc')).to.equal('123abc')
      expect(richObjectToJson('🐉')).to.equal('🐉')
    })

    it('function', () => {
      expect(() => richObjectToJson(() => {})).to.throw('() => {} cannot be serialized to json')
      expect(() => richObjectToJson(function () {})).to.throw('function () {} cannot be serialized to json')
      expect(() => richObjectToJson(Math.sin)).to.throw('function sin() { [native code] } cannot be serialized to json')
    })

    it('symbol', () => {
      expect(() => richObjectToJson(Symbol.hasInstance)).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
    })

    it('object', () => {
      expect(richObjectToJson(null)).to.equal(null)
      expect(richObjectToJson({})).to.deep.equal({})
      expect(richObjectToJson({ a: 'a', n: 1, b: false })).to.deep.equal({ a: 'a', n: 1, b: false })
      expect(richObjectToJson({ o: { n: 1 } })).to.deep.equal({ o: { n: 1 } })
      expect(() => richObjectToJson({ s: Symbol.hasInstance })).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expect(() => richObjectToJson({ f: () => {} })).to.throw('() => {} cannot be serialized to json')
    })

    it('array', () => {
      expect(richObjectToJson([])).to.deep.equal([])
      expect(richObjectToJson([1, 2, 3])).to.deep.equal([1, 2, 3])
      expect(richObjectToJson([{ a: '1' }, ['b']])).to.deep.equal([{ a: '1' }, ['b']])
      expect(() => richObjectToJson([Symbol.hasInstance])).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expect(() => richObjectToJson([() => {}])).to.throw('() => {} cannot be serialized to json')
    })

    it('uint8array', () => {
      expect(richObjectToJson(new Uint8Array(0))).to.deep.equal({ $class: 'Uint8Array', base64Data: '' })
      expect(richObjectToJson(new Uint8Array(1))).to.deep.equal({ $class: 'Uint8Array', base64Data: 'AA==' })
      expect(richObjectToJson(new Uint8Array([1, 2, 3]))).to.deep.equal({ $class: 'Uint8Array', base64Data: 'AQID' })
      expect(richObjectToJson(new Uint8Array([255, 255, 255]))).to.deep.equal({ $class: 'Uint8Array', base64Data: '////' })
    })

    it('duplicate allowed', () => {
      const o = {}
      expect(() => richObjectToJson({ a: o, b: o })).not.to.throw()
    })

    it('circular throws', () => {
      const a = {}
      const b = { a }
      a.b = b
      expect(() => richObjectToJson(a)).to.throw('circular reference detected: a')
    })

    it('unsupported type', () => {
      expect(() => richObjectToJson(new class {}())).to.throw('[object Object] cannot be serialized to json')
      expect(() => richObjectToJson(new class extends Array {}())).to.throw('Array cannot be serialized to json')
      expect(() => richObjectToJson(new Set())).to.throw('Set cannot be serialized to json')
      expect(() => richObjectToJson(new Map())).to.throw('Map cannot be serialized to json')
      expect(() => richObjectToJson(Buffer.alloc(0))).to.throw('Buffer cannot be serialized to json')
    })

    it('undefined', () => {
      expect(richObjectToJson(undefined)).to.deep.equal({ $class: 'undefined' })
    })

    it('$ properties', () => {
      expect(() => richObjectToJson({ $class: 'unknown' })).to.throw('$ properties must not be defined')
      expect(() => richObjectToJson({ $ref: 'unknown' })).to.throw('$ properties must not be defined')
      expect(() => richObjectToJson({ $n: 1 })).to.throw('$ properties must not be defined')
    })

    it('custom', () => {
      const setPacker = x => { if (x && x.constructor === Set) return { $class: 'set' } }
      const mapPacker = x => { if (x && x.constructor === Map) return { $class: 'map' } }
      expect(richObjectToJson({ a: [1], s: new Set(), m: new Map() }, [setPacker, mapPacker]))
        .to.deep.equal({ a: [1], s: { $class: 'set' }, m: { $class: 'map' } })
    })
  })

  describe('jsonToRichObject', () => {
    it('number', () => {
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

    it('boolean', () => {
      expect(jsonToRichObject(true)).to.equal(true)
      expect(jsonToRichObject(false)).to.equal(false)
    })

    it('string', () => {
      expect(jsonToRichObject('')).to.equal('')
      expect(jsonToRichObject('123abc')).to.equal('123abc')
      expect(jsonToRichObject('🐉')).to.equal('🐉')
    })

    it('function', () => {
      expect(() => jsonToRichObject(() => {})).to.throw('JSON should not contain () => {}')
      expect(() => jsonToRichObject(function () {})).to.throw('JSON should not contain function () {}')
      expect(() => jsonToRichObject(Math.sin)).to.throw('JSON should not contain function sin() { [native code] }')
    })

    it('symbol', () => {
      expect(() => jsonToRichObject(Symbol.hasInstance)).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
    })

    it('object', () => {
      expect(jsonToRichObject(null)).to.equal(null)
      expect(jsonToRichObject({})).to.deep.equal({})
      expect(jsonToRichObject({ a: 'a', n: 1, b: false })).to.deep.equal({ a: 'a', n: 1, b: false })
      expect(jsonToRichObject({ o: { n: 1 } })).to.deep.equal({ o: { n: 1 } })
      expect(() => jsonToRichObject({ s: Symbol.hasInstance })).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
      expect(() => jsonToRichObject({ f: () => {} })).to.throw('JSON should not contain () => {}')
    })

    it('array', () => {
      expect(jsonToRichObject([])).to.deep.equal([])
      expect(jsonToRichObject([1, 2, 3])).to.deep.equal([1, 2, 3])
      expect(jsonToRichObject([{ a: '1' }, ['b']])).to.deep.equal([{ a: '1' }, ['b']])
      expect(() => jsonToRichObject([Symbol.hasInstance])).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
      expect(() => jsonToRichObject([() => {}])).to.throw('JSON should not contain () => {}')
    })

    it('uint8array', () => {
      const Uint8Array = Run.code[intrinsicsKey].Uint8Array
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: '' })).to.deep.equal(new Uint8Array(0))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: 'AA==' })).to.deep.equal(new Uint8Array(1))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: 'AQID' })).to.deep.equal(new Uint8Array([1, 2, 3]))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: '////' })).to.deep.equal(new Uint8Array([255, 255, 255]))
    })

    it('unsupported types', () => {
      expect(() => jsonToRichObject(new class {}())).to.throw('JSON should not contain [object Object]')
      expect(() => jsonToRichObject(new class extends Array {}())).to.throw('JSON should not contain Array')
      expect(() => jsonToRichObject(new Set())).to.throw('JSON should not contain Set')
      expect(() => jsonToRichObject(new Map())).to.throw('JSON should not contain Map')
      expect(() => jsonToRichObject(Buffer.alloc(0))).to.throw('JSON should not contain Buffer')
    })

    it('undefined', () => {
      expect(jsonToRichObject({ undef: { $class: 'undefined' } })).to.deep.equal({ undef: undefined })
      expect(jsonToRichObject({ $class: 'undefined' })).to.equal(undefined)
    })

    it('bad $class', () => {
      expect(() => jsonToRichObject({ $class: 'unknown' })).to.throw('$ properties must not be defined')
    })

    it('custom', () => {
      const setUnpacker = x => { if (x.$class === 'set') return new Set() }
      const mapUnpacker = x => { if (x.$class === 'map') return new Map() }
      expect(jsonToRichObject({ a: [1], s: { $class: 'set' }, m: { $class: 'map' } },
        [setUnpacker, mapUnpacker])).to.deep.equal
({ a: [1], s: new Set(), m: new Map() })
      const rootUnpacker = (x, p, k) => { if (p === null) return 1 }
      expect(jsonToRichObject({}, [rootUnpacker])).to.equal(1)
      const namedUnpacker = (x, p, k) => { if (k === 'a') return 1 }
      expect(jsonToRichObject({ a: [], b: 2 }, [namedUnpacker])).to.deep.equal
({ a: 1, b: 2 })
    })
  })

  describe('extractJigsAndCodeToArray', () => {
    it('basic extraction', () => {
      class A extends Jig { }
      const arr = []
      const obj = { a: new A(), b: [new A(), A] }
      const json = richObjectToJson(obj, [extractJigsAndCodeToArray(arr)])
      expect(json).to.deep.equal
({ a: { $index: 0 }, b: [{ $index: 1 }, { $index: 2 }] })
      expect(arr.length).to.equal(3)
      expect(arr[0]).to.equal(obj.a)
      expect(arr[1]).to.equal(obj.b[0])
      expect(arr[2]).to.equal(obj.b[1])
    })
  })

  describe('injectJigsAndCodeFromArray', () => {
    it('basic injection', () => {
      class A extends Jig { }
      const arr = [new A(), new A(), A]
      const json = { a: { $index: 0 }, b: [{ $index: 1 }, { $index: 2 }] }
      const obj = jsonToRichObject(json, [injectJigsAndCodeFromArray(arr)])
      expect(obj.a).to.equal(arr[0])
      expect(obj.b[0]).to.equal(arr[1])
      expect(obj.b[1]).to.equal(arr[2])
    })
  })

  describe('deepTraverse', () => {
    function expectTraverse (target, expectedVisitArgs) {
      deepTraverse(target, (target, parent, name) => {
        const [expectedTarget, expectedParent, expectedName] = expectedVisitArgs.shift()
        expect(target).to.deep.equal
(expectedTarget)
        expect(parent).to.deep.equal
(expectedParent)
        expect(name).to.deep.equal
(expectedName)
      })
    }

    it('basic types', () => {
      expectTraverse(0, [[0, null, null]])
      expectTraverse(1, [[1, null, null]])
      expectTraverse(1.5, [[1.5, null, null]])
      expectTraverse('hello', [['hello', null, null]])
      expectTraverse(true, [[true, null, null]])
      expectTraverse(false, [[false, null, null]])
      expectTraverse(NaN, [[NaN, null, null]])
      expectTraverse(Infinity, [[Infinity, null, null]])
      expectTraverse(null, [[null, null, null]])
      expectTraverse({}, [[{}, null, null]])
      expectTraverse([], [[[], null, null]])
    })

    it('nested objects', () => {
      const target = { a: { b: 1 }, c: 2 }
      expectTraverse(target, [
        [target, null, null],
        [target.a, target, 'a'],
        [target.a.b, target.a, 'b'],
        [target.c, target, 'c']
      ])
    })

    it('duplicate objects', () => {
      const a = { n: 1 }
      const target = { a, b: { a } }
      expectTraverse(target, [
        [target, null, null],
        [target.a, target, 'a'],
        [target.a.n, target.a, 'n'],
        [target.b, target, 'b'],
        [target.b.a, target.b, 'a']
      ])
    })

    it('circular objects', () => {
      const target = { }
      target.target = target
      expectTraverse(target, [
        [target, null, null],
        [target.target, target, 'target']
      ])
    })

    it('arrays', () => {
      const target = [1, '2', [3]]
      expectTraverse(target, [
        [target, null, null],
        [target[0], target, '0'],
        [target[1], target, '1'],
        [target[2], target, '2'],
        [target[2][0], target[2], '0']
      ])
    })

    it('multiple visiters', () => {
      let numVisited = 0
      deepTraverse({}, [() => { numVisited += 1 }, () => { numVisited += 1 }])
      expect(numVisited).to.equal(2)
    })
  })

  describe('SerialTaskQueue', () => {
    const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }

    it('serializes tasks in order', async () => {
      const queue = new SerialTaskQueue()
      const order = []; const promises = []
      promises.push(queue.enqueue(async () => { await sleep(5); order.push(1) }))
      promises.push(queue.enqueue(async () => { await sleep(3); order.push(2) }))
      promises.push(queue.enqueue(async () => { await sleep(1); order.push(3) }))
      await Promise.all(promises)
      expect(order).to.deep.equal([1, 2, 3])
    })

    it('stops and starts', async () => {
      const queue = new SerialTaskQueue()
      let done1 = false; let done2 = false
      await queue.enqueue(() => { done1 = true })
      expect(done1).to.equal(true)
      await queue.enqueue(() => { done2 = true })
      expect(done2).to.equal(true)
    })
  })
})
