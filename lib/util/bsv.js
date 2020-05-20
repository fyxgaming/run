/**
 * bsv.js
 *
 * Patches the bsv library for use in Run
 */

const bsv = require('bsv')

// ------------------------------------------------------------------------------------------------
// _populatePreviousOutputs
// ------------------------------------------------------------------------------------------------

/**
 * Adds the previous output information for each input to sign and verify the transaction.
 * @param {bsv.Transaction} tx Tx to modify
 * @param {Blockchain} blockchain Blockchain to fetch inputs
 */
async function _populatePreviousOutputs (tx, blockchain) {
  for (let i = 0; i < tx.inputs.length; i++) {
    const input = tx.inputs[i]

    if (!input.output) {
      const prevtxid = input.prevTxId.toString('hex')
      const prevrawtx = await blockchain.fetch(prevtxid)
      const prevtx = new bsv.Transaction(prevrawtx)

      // Add the output, which gives us the script and satoshis
      input.output = prevtx.outputs[input.outputIndex]

      // Set the type of the input if we can determine it.
      // Run doesn't require this to work but it may help users.
      if (input.output.script.isPublicKeyHashOut()) {
        Reflect.setPrototypeOf(input, bsv.Transaction.Input.PublicKeyHash.prototype)
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------
// _scripthash
// ------------------------------------------------------------------------------------------------

function _scripthash (script) {
  const { Hash } = bsv.crypto
  script._hash = script._hash || Hash.sha256(script.toBuffer()).reverse().toString('hex')
  return script._hash
}

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
  if (bsv.patchedByRun) return
  bsv.patchedByRun = true

  const { Script, Transaction } = bsv
  const { Interpreter } = Script
  const { Input } = Transaction
  const { ECDSA, Hash, Signature } = bsv.crypto
  const { BufferReader, BufferWriter } = bsv.encoding

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

  // A modified sighash function from bsv library that caches values
  function sighash (tx, sighashType, inputNumber, subscript, satoshisBN) {
    const input = tx.inputs[inputNumber]

    function getPrevoutsHash () {
      if (tx._hashPrevouts) return tx._hashPrevouts
      const writer = new BufferWriter()
      tx.inputs.forEach(input => {
        writer.writeReverse(input.prevTxId)
        writer.writeUInt32LE(input.outputIndex)
      })
      const buf = writer.toBuffer()
      tx._hashPrevouts = Hash.sha256sha256(buf)
      return tx._hashPrevouts
    }

    function getSequenceHash () {
      if (tx._hashSequence) return tx._hashSequence
      const writer = new BufferWriter()
      tx.inputs.forEach(input => {
        writer.writeUInt32LE(input.sequenceNumber)
      })
      const buf = writer.toBuffer()
      tx._hashSequence = Hash.sha256sha256(buf)
      return tx._hashSequence
    }

    function getOutputsHash (n) {
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
      const hash = Hash.sha256sha256(buf)
      if (typeof n === 'undefined') tx._hashOutputsAll = hash
      return hash
    }

    let hashPrevouts = Buffer.alloc(32)
    let hashSequence = Buffer.alloc(32)
    let hashOutputs = Buffer.alloc(32)

    if (!(sighashType & Signature.SIGHASH_ANYONECANPAY)) {
      hashPrevouts = getPrevoutsHash()
    }

    if (!(sighashType & Signature.SIGHASH_ANYONECANPAY) &&
        (sighashType & 31) !== Signature.SIGHASH_SINGLE &&
        (sighashType & 31) !== Signature.SIGHASH_NONE) {
      hashSequence = getSequenceHash()
    }

    if ((sighashType & 31) !== Signature.SIGHASH_SINGLE && (sighashType & 31) !== Signature.SIGHASH_NONE) {
      hashOutputs = getOutputsHash()
    } else if ((sighashType & 31) === Signature.SIGHASH_SINGLE && inputNumber < tx.outputs.length) {
      hashOutputs = getOutputsHash(inputNumber)
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
    const hash = Hash.sha256sha256(buf)
    return new BufferReader(hash).readReverse()
  }

  // A signature helper on the Transaction
  Transaction.prototype.signature = function (vin, privateKey, sighashType = Signature.SIGHASH_ALL) {
    sighashType |= Signature.SIGHASH_FORKID
    const subscript = this.inputs[vin].output.script
    const satoshisBN = this.inputs[vin].output.satoshisBN
    const flags = Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID
    const hashbuf = sighash(this, sighashType, vin, subscript, satoshisBN, flags)
    const sig = ECDSA.sign(hashbuf, privateKey, 'little')
    const sigbuf = Buffer.from(sig.toDER())
    const buf = Buffer.concat([sigbuf, Buffer.from([sighashType & 0xff])])
    return buf
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { _populatePreviousOutputs, _scripthash, _patchBsv }
