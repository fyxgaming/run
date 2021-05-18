/**
 * tx.js
 *
 * Parse raw transactions
 */

const Editor = require('../kernel/editor')
const Hex = require('./hex')

// ------------------------------------------------------------------------------------------------
// Tx
// ------------------------------------------------------------------------------------------------

class Tx {
  constructor (rawtx) {
    const b = Hex.stringToBytes(rawtx)
    let i = 0

    function u8 () { return b[i++] }
    function u16 () { return u8() + u8() * 256 }
    function u32 () { return u16() + u16() * 256 * 256 }
    function u64 () { return u32() + u32() * 256 * 256 * 256 * 256 }
    function varint () { const b0 = u8(); return b0 === 0xff ? u64() : b0 === 0xfe ? u32() : b0 === 0xfd ? u16() : b0 }
    function txid () { const h = Hex.bytesToString(b.slice(i, i + 32).reverse()); i += 32; return h }
    function script () { const n = varint(); const h = Hex.bytesToString(b.slice(i, i + n)); i += n; return h }

    this.version = u32()

    const nin = varint()
    this.inputs = []
    for (let vin = 0; vin < nin; vin++) {
      this.inputs.push({
        prevTxId: txid(),
        outputIndex: u32(),
        script: script(),
        sequenceNumber: u32()
      })
    }

    const nout = varint()
    this.outputs = []
    for (let vout = 0; vout < nout; vout++) {
      this.outputs.push({
        satoshis: u64(),
        script: script()
      })
    }

    this.nLockTime = u32()
  }
}

Tx.deps = { Hex }

Tx.toString() // Preserves the class name during compilation

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

Tx.presets = {}
Tx.presets.main = {}
Tx.presets.test = {}

Tx.presets.main.location = '05f67252e696160a7c0099ae8d1ec23c39592378773b3a5a55f16bd1286e7dcb_o1'
Tx.presets.main.origin = '05f67252e696160a7c0099ae8d1ec23c39592378773b3a5a55f16bd1286e7dcb_o1'
Tx.presets.main.nonce = 2
Tx.presets.main.owner = '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx'
Tx.presets.main.satoshis = 0

Tx.presets.test.location = 'd476fd7309a0eeb8b92d715e35c6e273ad63c0025ff6cca927bd0f0b64ed88f_o1'
Tx.presets.test.origin = 'd476fd7309a0eeb8b92d715e35c6e273ad63c0025ff6cca927bd0f0b64ed88f_o1'
Tx.presets.test.nonce = 2
Tx.presets.test.owner = 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE'
Tx.presets.test.satoshis = 0

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(Tx)
