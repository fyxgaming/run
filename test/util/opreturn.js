/**
 * opreturn.js
 *
 * Tests for lib/util/opreturn.js
 */

const bsv = require('bsv')
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../config')
const {
  _checkRunTransaction,
  _extractRunData,
  _outputType,
  _encryptRunData,
  _decryptRunData
} = Run._util

// ------------------------------------------------------------------------------------------------
// _checkRunTransaction
// ------------------------------------------------------------------------------------------------

describe('_checkRunTransaction', () => {
  it('should detect valid run transaction', () => {
    const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
    expect(() => _checkRunTransaction(tx)).not.to.throw()
  })

  it('should throw if a money transaction', () => {
    const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
    expect(() => _checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
  })

  it('should throw if bad prefix', () => {
    const tx = buildRunTransaction('run0', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
    expect(() => _checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
  })

  it('should throw if bad protocol version', () => {
    const tx1 = buildRunTransaction('run', [0x00, Run.protocol], {}, 'buildSafeDataOut', true, 0)
    expect(() => _checkRunTransaction(tx1)).to.throw(`Unsupported run protocol in tx: ${tx1.hash}`)
    const tx2 = buildRunTransaction('run', [0x01], {}, 'buildSafeDataOut', true, 0)
    expect(() => _checkRunTransaction(tx2)).to.throw(`Unsupported run protocol in tx: ${tx2.hash}`)
    const tx3 = buildRunTransaction('run', [0x03], {}, 'buildSafeDataOut', true, 0)
    expect(() => _checkRunTransaction(tx3)).to.throw(`Unsupported run protocol in tx: ${tx3.hash}`)
  })

  it('should throw if not op_false op_return', () => {
    const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildDataOut', true, 0)
    expect(() => _checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
  })

  it('should throw if no debug info', () => {
    const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', false, 0)
    expect(() => _checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
  })
})

// ------------------------------------------------------------------------------------------------
// _extractRunData
// ------------------------------------------------------------------------------------------------

describe('_extractRunData', () => {
  it('should decrypt data', () => {
    const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
    expect(_extractRunData(tx)).to.deep.equal({ code: [1], jigs: 2 })
  })

  it('should throw if not a run tx', () => {
    const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
    expect(() => _extractRunData(tx)).to.throw(`not a run tx: ${tx.hash}`)
  })
})

// ------------------------------------------------------------------------------------------------
// _outputType
// ------------------------------------------------------------------------------------------------

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

// ------------------------------------------------------------------------------------------------
// _encryptRunData
// ------------------------------------------------------------------------------------------------

describe('_encryptRunData', () => {
  it('should encrypt run data', () => {
    const encrypted = _encryptRunData({ a: 1 })
    expect(encrypted).not.to.equal(JSON.stringify({ a: 1 }))
  })
})

// ------------------------------------------------------------------------------------------------
// _decryptRunData
// ------------------------------------------------------------------------------------------------

describe('_decryptRunData', () => {
  it('should decrypt run data', () => {
    const encrypted = _encryptRunData({ a: 1 })
    expect(_decryptRunData(encrypted)).to.deep.equal({ a: 1 })
  })

  it('should throw for bad data', () => {
    expect(() => _decryptRunData(JSON.stringify({ a: 1 }))).to.throw('unable to parse decrypted run data')
  })
})

// ------------------------------------------------------------------------------------------------
// buildRunTransaction
// ------------------------------------------------------------------------------------------------

function buildRunTransaction (prefixString, protocolVersionArray, runData, scriptBuilder,
  containDebugInfo, numAdditionalOutputs) {
  const Buffer = bsv.deps.Buffer
  const prefix = Buffer.from(prefixString, 'utf8')
  const protocolVersion = Buffer.from(protocolVersionArray, 'hex')
  const appId = Buffer.from('my-app', 'utf8')
  const payload = Buffer.from(_encryptRunData(runData), 'utf8')
  const debugInfo = Buffer.from('r11r', 'utf8')
  const parts = containDebugInfo
    ? [prefix, protocolVersion, appId, payload, debugInfo]
    : [prefix, protocolVersion, appId, payload]
  const script = bsv.Script[scriptBuilder](parts)
  const tx = new bsv.Transaction().addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))
  for (let i = 0; i < numAdditionalOutputs; i++) { tx.to(new bsv.PrivateKey().toAddress(), 100) }
  return tx
}

// ------------------------------------------------------------------------------------------------
