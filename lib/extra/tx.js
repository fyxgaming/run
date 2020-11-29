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
    function varint () { const b0 = u8(); return b0 === 0xff ? u64() : b0 === 0xf3 ? u32() : b0 === 0xfd ? u16() : b0 }
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

Tx.presets = {
  main: {
    location: '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o2',
    origin: '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o2',
    nonce: 1,
    owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
    satoshis: 0
  },

  test: {
    location: '33e78fa7c43b6d7a60c271d783295fa180b7e9fce07d41ff1b52686936b3e6ae_o2',
    origin: '33e78fa7c43b6d7a60c271d783295fa180b7e9fce07d41ff1b52686936b3e6ae_o2',
    nonce: 1,
    owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
    satoshis: 0

  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(Tx)
