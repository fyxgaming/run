const bsv = require('bsv')
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
const intrinsicsKey = getObfuscatedKey('intrinsics')

createRun()

describe('util', () => {
  describe('checkSatoshis', () => {
    test('allowed values', () => {
      expect(() => checkSatoshis(0)).not.toThrow()
      expect(() => checkSatoshis(1)).not.toThrow()
      expect(() => checkSatoshis(bsv.Transaction.DUST_AMOUNT)).not.toThrow()
      expect(() => checkSatoshis(100000000)).not.toThrow()
    })

    test('bad satoshis', () => {
      expect(() => checkSatoshis()).toThrow('satoshis must be a number')
      expect(() => checkSatoshis(-1)).toThrow('satoshis must be non-negative')
      expect(() => checkSatoshis('0')).toThrow('satoshis must be a number')
      expect(() => checkSatoshis([0])).toThrow('satoshis must be a number')
      expect(() => checkSatoshis(1.5)).toThrow('satoshis must be an integer')
      expect(() => checkSatoshis(NaN)).toThrow('satoshis must be an integer')
      expect(() => checkSatoshis(Infinity)).toThrow('satoshis must be an integer')
      expect(() => checkSatoshis(100000001)).toThrow('satoshis must be less than 100000000')
    })
  })

  describe('checkOwner', () => {
    test('any network', () => {
      expect(() => checkOwner(new bsv.PrivateKey('mainnet').publicKey.toString())).not.toThrow()
      expect(() => checkOwner(new bsv.PrivateKey('testnet').publicKey.toString())).not.toThrow()
    })

    test('bad owners throw', () => {
      expect(() => checkOwner()).toThrow('owner must be a pubkey string')
      expect(() => checkOwner(123)).toThrow('owner must be a pubkey string')
      expect(() => checkOwner('hello')).toThrow('owner is not a valid public key')
      expect(() => checkOwner(new bsv.PrivateKey())).toThrow('owner must be a pubkey string')
      expect(() => checkOwner(new bsv.PrivateKey().publicKey)).toThrow('owner must be a pubkey string')
      expect(() => checkOwner([new bsv.PrivateKey().publicKey.toString()])).toThrow('owner must be a pubkey string')
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
    test('detects valid', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).not.toThrow()
    })

    test('money transaction', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(() => checkRunTransaction(tx)).toThrow(`not a run tx: ${tx.hash}`)
    })

    test('bad prefix', () => {
      const tx = buildRunTransaction('run0', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).toThrow(`not a run tx: ${tx.hash}`)
    })

    test('bad protocol version', () => {
      const tx1 = buildRunTransaction('run', [0x00, Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx1)).toThrow(`Unsupported run protocol in tx: ${tx1.hash}`)
      const tx2 = buildRunTransaction('run', [0x02], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx2)).toThrow(`Unsupported run protocol in tx: ${tx2.hash}`)
    })

    test('not op_false op_return', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).toThrow(`not a run tx: ${tx.hash}`)
    })

    test('no debug info', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', false, 0)
      expect(() => checkRunTransaction(tx)).toThrow(`not a run tx: ${tx.hash}`)
    })
  })

  describe('extractRunData', () => {
    test('decrypts data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(extractRunData(tx)).toEqual({ code: [1], jigs: 2 })
    })

    test('not a run tx', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(() => extractRunData(tx)).toThrow(`not a run tx: ${tx.hash}`)
    })
  })

  describe('outputType', () => {
    test('rundata', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(outputType(tx, 0)).toEqual('rundata')
    })

    test('code', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 1)).toEqual('code')
    })

    test('jig', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 2)).toEqual('jig')
      expect(outputType(tx, 3)).toEqual('jig')
    })

    test('change', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 4)).toEqual('other')
    })

    test('money', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(outputType(tx, 0)).toEqual('other')
    })

    test('bad run data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], 'hello, world', 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 4)).toEqual('other')
    })
  })

  describe('codeText', () => {
    test('basic class', () => {
      class A {}
      expect(codeText(A)).toBe('class A {}')
    })

    test('basic function', () => {
      function f () { return 1 }
      expect(codeText(f)).toBe('function f() {\n        return 1;\n      }')
    })

    test('class extends different parent', () => {
      const SomeLibrary = { B: class B { } }
      class A extends SomeLibrary.B {}
      expect(codeText(A)).toBe('class A extends B {}')
    })
  })

  describe('deployable', () => {
    test('allowed', () => {
      class B { }
      expect(deployable(class A { })).toBe(true)
      expect(deployable(class A extends B { })).toBe(true)
      expect(deployable(function f () {})).toBe(true)
    })

    test('non-functions', () => {
      expect(deployable()).toBe(false)
      expect(deployable(1)).toBe(false)
      expect(deployable({})).toBe(false)
      expect(deployable(true)).toBe(false)
    })

    test('standard library', () => {
      expect(deployable(Array)).toBe(false)
      expect(deployable(Uint8Array)).toBe(false)
      expect(deployable(Math.sin)).toBe(false)
    })

    test('anonymous types', () => {
      expect(deployable(() => {})).toBe(false)
      expect(deployable(function () { })).toBe(false)
      expect(deployable(class {})).toBe(false)
    })
  })

  describe('encryptRunData', () => {
    test('basic encryption', () => {
      const encrypted = encryptRunData({ a: 1 })
      expect(encrypted).not.toBe(JSON.stringify({ a: 1 }))
    })
  })

  describe('decryptRunData', () => {
    test('basic decryption', () => {
      const encrypted = encryptRunData({ a: 1 })
      expect(decryptRunData(encrypted)).toEqual({ a: 1 })
    })

    test('bad data', () => {
      expect(() => decryptRunData(JSON.stringify({ a: 1 }))).toThrow('unable to parse decrypted run data')
    })
  })

  describe('richObjectToJson', () => {
    test('number', () => {
      expect(richObjectToJson(1)).toBe(1)
      expect(richObjectToJson(-1)).toBe(-1)
      expect(richObjectToJson(0)).toBe(0)
      expect(richObjectToJson(1.5)).toBe(1.5)
      expect(richObjectToJson(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
      expect(richObjectToJson(Number.MAX_VALUE)).toBe(Number.MAX_VALUE)
      expect(richObjectToJson(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER)
      expect(richObjectToJson(Number.MIN_VALUE)).toBe(Number.MIN_VALUE)
      expect(() => richObjectToJson(NaN)).toThrow('NaN cannot be serialized to json')
      expect(() => richObjectToJson(Infinity)).toThrow('Infinity cannot be serialized to json')
    })

    test('boolean', () => {
      expect(richObjectToJson(true)).toBe(true)
      expect(richObjectToJson(false)).toBe(false)
    })

    test('string', () => {
      expect(richObjectToJson('')).toBe('')
      expect(richObjectToJson('123abc')).toBe('123abc')
      expect(richObjectToJson('🐉')).toBe('🐉')
    })

    test('function', () => {
      expect(() => richObjectToJson(() => {})).toThrow('() => {} cannot be serialized to json')
      expect(() => richObjectToJson(function () {})).toThrow('function () {} cannot be serialized to json')
      expect(() => richObjectToJson(Math.sin)).toThrow('function sin() { [native code] } cannot be serialized to json')
    })

    test('symbol', () => {
      expect(() => richObjectToJson(Symbol.hasInstance)).toThrow('Symbol(Symbol.hasInstance) cannot be serialized to json')
    })

    test('object', () => {
      expect(richObjectToJson(null)).toEqual(null)
      expect(richObjectToJson({})).toEqual({})
      expect(richObjectToJson({ a: 'a', n: 1, b: false })).toEqual({ a: 'a', n: 1, b: false })
      expect(richObjectToJson({ o: { n: 1 } })).toEqual({ o: { n: 1 } })
      expect(() => richObjectToJson({ s: Symbol.hasInstance })).toThrow('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expect(() => richObjectToJson({ f: () => {} })).toThrow('() => {} cannot be serialized to json')
    })

    test('array', () => {
      expect(richObjectToJson([])).toEqual([])
      expect(richObjectToJson([1, 2, 3])).toEqual([1, 2, 3])
      expect(richObjectToJson([{ a: '1' }, ['b']])).toEqual([{ a: '1' }, ['b']])
      expect(() => richObjectToJson([Symbol.hasInstance])).toThrow('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expect(() => richObjectToJson([() => {}])).toThrow('() => {} cannot be serialized to json')
    })

    test('uint8array', () => {
      expect(richObjectToJson(new Uint8Array(0))).toEqual({ $class: 'Uint8Array', base64Data: '' })
      expect(richObjectToJson(new Uint8Array(1))).toEqual({ $class: 'Uint8Array', base64Data: 'AA==' })
      expect(richObjectToJson(new Uint8Array([1, 2, 3]))).toEqual({ $class: 'Uint8Array', base64Data: 'AQID' })
      expect(richObjectToJson(new Uint8Array([255, 255, 255]))).toEqual({ $class: 'Uint8Array', base64Data: '////' })
    })

    test('duplicate allowed', () => {
      const o = {}
      expect(() => richObjectToJson({ a: o, b: o })).not.toThrow()
    })

    test('circular throws', () => {
      const a = {}
      const b = { a }
      a.b = b
      expect(() => richObjectToJson(a)).toThrow('circular reference detected: a')
    })

    test('unsupported type', () => {
      expect(() => richObjectToJson(new class {}())).toThrow('[object Object] cannot be serialized to json')
      expect(() => richObjectToJson(new class extends Array {}())).toThrow('Array cannot be serialized to json')
      expect(() => richObjectToJson(new Set())).toThrow('Set cannot be serialized to json')
      expect(() => richObjectToJson(new Map())).toThrow('Map cannot be serialized to json')
      expect(() => richObjectToJson(Buffer.alloc(0))).toThrow('Buffer cannot be serialized to json')
    })

    test('undefined', () => {
      expect(richObjectToJson(undefined)).toEqual({ $class: 'undefined' })
    })

    test('$ properties', () => {
      expect(() => richObjectToJson({ $class: 'unknown' })).toThrow('$ properties must not be defined')
      expect(() => richObjectToJson({ $ref: 'unknown' })).toThrow('$ properties must not be defined')
      expect(() => richObjectToJson({ $n: 1 })).toThrow('$ properties must not be defined')
    })

    test('custom', () => {
      const setPacker = x => { if (x && x.constructor === Set) return { $class: 'set' } }
      const mapPacker = x => { if (x && x.constructor === Map) return { $class: 'map' } }
      expect(richObjectToJson({ a: [1], s: new Set(), m: new Map() }, [setPacker, mapPacker]))
        .toEqual({ a: [1], s: { $class: 'set' }, m: { $class: 'map' } })
    })
  })

  describe('jsonToRichObject', () => {
    test('number', () => {
      expect(jsonToRichObject(1)).toBe(1)
      expect(jsonToRichObject(-1)).toBe(-1)
      expect(jsonToRichObject(0)).toBe(0)
      expect(jsonToRichObject(1.5)).toBe(1.5)
      expect(jsonToRichObject(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
      expect(jsonToRichObject(Number.MAX_VALUE)).toBe(Number.MAX_VALUE)
      expect(jsonToRichObject(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER)
      expect(jsonToRichObject(Number.MIN_VALUE)).toBe(Number.MIN_VALUE)
      expect(() => jsonToRichObject(NaN)).toThrow('JSON should not contain NaN')
      expect(() => jsonToRichObject(Infinity)).toThrow('JSON should not contain Infinity')
    })

    test('boolean', () => {
      expect(jsonToRichObject(true)).toBe(true)
      expect(jsonToRichObject(false)).toBe(false)
    })

    test('string', () => {
      expect(jsonToRichObject('')).toBe('')
      expect(jsonToRichObject('123abc')).toBe('123abc')
      expect(jsonToRichObject('🐉')).toBe('🐉')
    })

    test('function', () => {
      expect(() => jsonToRichObject(() => {})).toThrow('JSON should not contain () => {}')
      expect(() => jsonToRichObject(function () {})).toThrow('JSON should not contain function () {}')
      expect(() => jsonToRichObject(Math.sin)).toThrow('JSON should not contain function sin() { [native code] }')
    })

    test('symbol', () => {
      expect(() => jsonToRichObject(Symbol.hasInstance)).toThrow('JSON should not contain Symbol(Symbol.hasInstance)')
    })

    test('object', () => {
      expect(jsonToRichObject(null)).toEqual(null)
      expect(jsonToRichObject({})).toEqual({})
      expect(jsonToRichObject({ a: 'a', n: 1, b: false })).toEqual({ a: 'a', n: 1, b: false })
      expect(jsonToRichObject({ o: { n: 1 } })).toEqual({ o: { n: 1 } })
      expect(() => jsonToRichObject({ s: Symbol.hasInstance })).toThrow('JSON should not contain Symbol(Symbol.hasInstance)')
      expect(() => jsonToRichObject({ f: () => {} })).toThrow('JSON should not contain () => {}')
    })

    test('array', () => {
      expect(jsonToRichObject([])).toEqual([])
      expect(jsonToRichObject([1, 2, 3])).toEqual([1, 2, 3])
      expect(jsonToRichObject([{ a: '1' }, ['b']])).toEqual([{ a: '1' }, ['b']])
      expect(() => jsonToRichObject([Symbol.hasInstance])).toThrow('JSON should not contain Symbol(Symbol.hasInstance)')
      expect(() => jsonToRichObject([() => {}])).toThrow('JSON should not contain () => {}')
    })

    test('uint8array', () => {
      const Uint8Array = Run.code[intrinsicsKey].Uint8Array
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: '' })).toEqual(new Uint8Array(0))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: 'AA==' })).toEqual(new Uint8Array(1))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: 'AQID' })).toEqual(new Uint8Array([1, 2, 3]))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: '////' })).toEqual(new Uint8Array([255, 255, 255]))
    })

    test('unsupported types', () => {
      expect(() => jsonToRichObject(new class {}())).toThrow('JSON should not contain [object Object]')
      expect(() => jsonToRichObject(new class extends Array {}())).toThrow('JSON should not contain Array')
      expect(() => jsonToRichObject(new Set())).toThrow('JSON should not contain Set')
      expect(() => jsonToRichObject(new Map())).toThrow('JSON should not contain Map')
      expect(() => jsonToRichObject(Buffer.alloc(0))).toThrow('JSON should not contain Buffer')
    })

    test('undefined', () => {
      expect(jsonToRichObject({ undef: { $class: 'undefined' } })).toEqual({ undef: undefined })
      expect(jsonToRichObject({ $class: 'undefined' })).toEqual(undefined)
    })

    test('bad $class', () => {
      expect(() => jsonToRichObject({ $class: 'unknown' })).toThrow('$ properties must not be defined')
    })

    test('custom', () => {
      const setUnpacker = x => { if (x.$class === 'set') return new Set() }
      const mapUnpacker = x => { if (x.$class === 'map') return new Map() }
      expect(jsonToRichObject({ a: [1], s: { $class: 'set' }, m: { $class: 'map' } },
        [setUnpacker, mapUnpacker])).toEqual({ a: [1], s: new Set(), m: new Map() })
      const rootUnpacker = (x, p, k) => { if (p === null) return 1 }
      expect(jsonToRichObject({}, [rootUnpacker])).toBe(1)
      const namedUnpacker = (x, p, k) => { if (k === 'a') return 1 }
      expect(jsonToRichObject({ a: [], b: 2 }, [namedUnpacker])).toEqual({ a: 1, b: 2 })
    })
  })

  describe('extractJigsAndCodeToArray', () => {
    test('basic extraction', () => {
      class A extends Jig { }
      const arr = []
      const obj = { a: new A(), b: [new A(), A] }
      const json = richObjectToJson(obj, [extractJigsAndCodeToArray(arr)])
      expect(json).toEqual({ a: { $index: 0 }, b: [{ $index: 1 }, { $index: 2 }] })
      expect(arr.length).toBe(3)
      expect(arr[0]).toBe(obj.a)
      expect(arr[1]).toBe(obj.b[0])
      expect(arr[2]).toBe(obj.b[1])
    })
  })

  describe('injectJigsAndCodeFromArray', () => {
    test('basic injection', () => {
      class A extends Jig { }
      const arr = [new A(), new A(), A]
      const json = { a: { $index: 0 }, b: [{ $index: 1 }, { $index: 2 }] }
      const obj = jsonToRichObject(json, [injectJigsAndCodeFromArray(arr)])
      expect(obj.a).toBe(arr[0])
      expect(obj.b[0]).toBe(arr[1])
      expect(obj.b[1]).toBe(arr[2])
    })
  })

  describe('deepTraverse', () => {
    function expectTraverse (target, expectedVisitArgs) {
      deepTraverse(target, (target, parent, name) => {
        const [expectedTarget, expectedParent, expectedName] = expectedVisitArgs.shift()
        expect(target).toEqual(expectedTarget)
        expect(parent).toEqual(expectedParent)
        expect(name).toEqual(expectedName)
      })
    }

    test('basic types', () => {
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

    test('nested objects', () => {
      const target = { a: { b: 1 }, c: 2 }
      expectTraverse(target, [
        [target, null, null],
        [target.a, target, 'a'],
        [target.a.b, target.a, 'b'],
        [target.c, target, 'c']
      ])
    })

    test('duplicate objects', () => {
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

    test('circular objects', () => {
      const target = { }
      target.target = target
      expectTraverse(target, [
        [target, null, null],
        [target.target, target, 'target']
      ])
    })

    test('arrays', () => {
      const target = [1, '2', [3]]
      expectTraverse(target, [
        [target, null, null],
        [target[0], target, '0'],
        [target[1], target, '1'],
        [target[2], target, '2'],
        [target[2][0], target[2], '0']
      ])
    })

    test('multiple visiters', () => {
      let numVisited = 0
      deepTraverse({}, [() => { numVisited += 1 }, () => { numVisited += 1 }])
      expect(numVisited).toBe(2)
    })
  })
})
