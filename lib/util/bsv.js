/**
 * bsv.js
 *
 * Patches for the bsv library and helpers to use in Run
 */

const bsv = require('bsv')

const { Script, Transaction } = bsv
const { Interpreter } = Script
const { Input } = Transaction
const { ECDSA, Signature } = bsv.crypto
const { BufferReader, BufferWriter } = bsv.encoding
const { BN } = bsv.deps.bnjs

// ------------------------------------------------------------------------------------------------
// _patchBsv
// ------------------------------------------------------------------------------------------------

/**
 * Patches the bsv library to support Run.
 *
 * These changes should all be optional within Run. They may improve performance, handle edge
 * cases, etc., but not change the core functionality. Sometimes multiple bsv instances happen
 * and we want to minimize any monkey patches.
 * @param {object} bsv bsv library instance
 */
function _patchBsv (bsv) {
  if (bsv._patchedByRun) return
  bsv._patchedByRun = true

  // On Bitcoin SV, 0.25 sats/byte are normal now, but 0.5 sat/byte is still safer
  Transaction.FEE_PER_KB = 500

  // Modify sign() to skip isValidSignature(), which is slow and unnecessary
  const oldSign = Transaction.prototype.sign
  Transaction.prototype.sign = function (...args) {
    const oldIsValidSignature = Input.prototype.isValidSignature
    Input.prototype.isValidSignature = () => true
    const ret = oldSign.call(this, ...args)
    Input.prototype.isValidSignature = oldIsValidSignature
    return ret
  }

  // Disable signature errors, because we support custom scripts, and check custom scripts
  // using the bsv library's interpreter.
  Input.prototype.clearSignatures = () => {}
  Input.prototype.getSignatures = () => []
  Input.prototype.isFullySigned = function () { return !!this.script.toBuffer().length }
  Transaction.prototype.isFullySigned = function () {
    return !this.inputs.some(input => !input.isFullySigned())
  }
  Transaction.prototype.isValidSignature = function (signature) {
    const interpreter = new Interpreter()
    const vin = signature.inputIndex
    const input = this.inputs[vin]
    const flags = Interpreter.SCRIPT_VERIFY_STRICTENC |
      Interpreter.SCRIPT_VERIFY_DERSIG |
      Interpreter.SCRIPT_VERIFY_LOW_S |
      Interpreter.SCRIPT_VERIFY_NULLDUMMY |
      Interpreter.SCRIPT_VERIFY_SIGPUSHONLY |
      Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES |
      Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES |
      Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID
    return interpreter.verify(input.script, input.output.script, this, vin, flags, input.output.satoshisBN)
  }
}

// ------------------------------------------------------------------------------------------------
// _calculateDust
// ------------------------------------------------------------------------------------------------

function _calculateDust (scriptLen, feePerKb) {
  // See: https://github.com/bitcoin-sv/bitcoin-sv/blob/782c043fb39060bfc12179792a590b6405b91f3c/src/primitives/transaction.h

  const outputLen = 8 + (scriptLen <= 75 ? 1 : scriptLen <= 255 ? 2 : scriptLen <= 65535 ? 3 : 5) + scriptLen
  const p2pkhInputLen = 148
  const nSize = outputLen + p2pkhInputLen

  return Math.ceil(3 * nSize * feePerKb / 1000)
}

// ------------------------------------------------------------------------------------------------
// _scripthash
// ------------------------------------------------------------------------------------------------

async function _scripthash (script) {
  script._hash = script._hash || (await _sha256(script.toBuffer())).reverse().toString('hex')
  return script._hash
}

// ------------------------------------------------------------------------------------------------
// _sighash
// ------------------------------------------------------------------------------------------------

// A modified sighash function from bsv library that caches values
async function _sighash (tx, sighashType, inputNumber, subscript, satoshisBN) {
  const input = tx.inputs[inputNumber]

  async function getPrevoutsHash () {
    if (tx._hashPrevouts) return tx._hashPrevouts
    const writer = new BufferWriter()
    tx.inputs.forEach(input => {
      writer.writeReverse(input.prevTxId)
      writer.writeUInt32LE(input.outputIndex)
    })
    const buf = writer.toBuffer()
    tx._hashPrevouts = await _sha256d(buf)
    return tx._hashPrevouts
  }

  async function getSequenceHash () {
    if (tx._hashSequence) return tx._hashSequence
    const writer = new BufferWriter()
    tx.inputs.forEach(input => {
      writer.writeUInt32LE(input.sequenceNumber)
    })
    const buf = writer.toBuffer()
    tx._hashSequence = await _sha256d(buf)
    return tx._hashSequence
  }

  async function getOutputsHash (n) {
    const writer = new BufferWriter()
    if (typeof n === 'undefined') {
      if (tx._hashOutputsAll) return tx._hashOutputsAll
      tx.outputs.forEach(output => {
        output.toBufferWriter(writer)
      })
    } else {
      tx.outputs[n].toBufferWriter(writer)
    }
    const buf = writer.toBuffer()
    const hash = await _sha256d(buf)
    if (typeof n === 'undefined') tx._hashOutputsAll = hash
    return hash
  }

  let hashPrevouts = Buffer.alloc(32)
  let hashSequence = Buffer.alloc(32)
  let hashOutputs = Buffer.alloc(32)

  if (!(sighashType & Signature.SIGHASH_ANYONECANPAY)) {
    hashPrevouts = await getPrevoutsHash()
  }

  if (!(sighashType & Signature.SIGHASH_ANYONECANPAY) &&
        (sighashType & 31) !== Signature.SIGHASH_SINGLE &&
        (sighashType & 31) !== Signature.SIGHASH_NONE) {
    hashSequence = await getSequenceHash()
  }

  if ((sighashType & 31) !== Signature.SIGHASH_SINGLE && (sighashType & 31) !== Signature.SIGHASH_NONE) {
    hashOutputs = await getOutputsHash()
  } else if ((sighashType & 31) === Signature.SIGHASH_SINGLE && inputNumber < tx.outputs.length) {
    hashOutputs = await getOutputsHash(inputNumber)
  }

  const writer = new BufferWriter()
  writer.writeInt32LE(tx.version)
  writer.write(hashPrevouts)
  writer.write(hashSequence)
  writer.writeReverse(input.prevTxId)
  writer.writeUInt32LE(input.outputIndex)
  writer.writeVarintNum(subscript.toBuffer().length)
  writer.write(subscript.toBuffer())
  writer.writeUInt64LEBN(satoshisBN)
  writer.writeUInt32LE(input.sequenceNumber)
  writer.write(hashOutputs)
  writer.writeUInt32LE(tx.nLockTime)
  writer.writeUInt32LE(sighashType >>> 0)

  const buf = writer.toBuffer()
  const hash = await _sha256d(buf)
  return new BufferReader(hash).readReverse()
}

// ------------------------------------------------------------------------------------------------
// _signature
// ------------------------------------------------------------------------------------------------

async function _signature (tx, vin, script, satoshis, privateKey, sighashType = Signature.SIGHASH_ALL) {
  sighashType |= Signature.SIGHASH_FORKID
  const satoshisBN = new BN(satoshis)
  const hashbuf = await _sighash(tx, sighashType, vin, script, satoshisBN)
  const sig = ECDSA.sign(hashbuf, privateKey, 'little')
  const sigbuf = Buffer.from(sig.toDER())
  const buf = Buffer.concat([sigbuf, Buffer.from([sighashType & 0xff])])
  return buf.toString('hex')
}

// ------------------------------------------------------------------------------------------------
// _sha256Internal
// ------------------------------------------------------------------------------------------------

function _sha256Internal (data) {
  const bsvbuf = bsv.deps.Buffer.from(data)
  const hash = bsv.crypto.Hash.sha256(bsvbuf)
  return new Uint8Array(hash)
}

// ------------------------------------------------------------------------------------------------
// _sha256
// ------------------------------------------------------------------------------------------------

async function _sha256 (data) {
  const sha256 = require('../run').sha256
  const uint8arrayHash = await sha256(data)
  return bsv.deps.Buffer.from(uint8arrayHash)
}

// ------------------------------------------------------------------------------------------------
// _sha256d
// ------------------------------------------------------------------------------------------------

async function _sha256d (data) {
  const hash = await _sha256(data)
  return await _sha256(hash)
}

// ------------------------------------------------------------------------------------------------

module.exports = { _patchBsv, _calculateDust, _scripthash, _sighash, _signature, _sha256, _sha256Internal }
