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

// TODOo
// USE TXO PRESETS

/*
{ [Function: Tx]
  deps:
   { Hex:
      { [Function: Hex]
        deps: {},
        location:
         '1f0abf8d94477b1cb57629d861376616f6e1d7b78aba23a19da3e6169caf489e_o2',
        nonce: 1,
        origin:
         '1f0abf8d94477b1cb57629d861376616f6e1d7b78aba23a19da3e6169caf489e_o2',
        owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
        satoshis: 0 } },
  location:
   '85f3cbcbd529eade71c467f47d56ac6c71f882e1a84d802a77d18066facda8de_o1',
  nonce: 1,
  origin:
   '85f3cbcbd529eade71c467f47d56ac6c71f882e1a84d802a77d18066facda8de_o1',
  owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
  satoshis: 0 }

  { [Function: Tx]
    deps:
     { Hex:
        { [Function: Hex]
          deps: {},
          location:
           '727e7b423b7ee40c0b5be87fba7fa5673ea2d20a74259040a7295d9c32a90011_o1',
          nonce: 1,
          origin:
           '727e7b423b7ee40c0b5be87fba7fa5673ea2d20a74259040a7295d9c32a90011_o1',
          owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
          satoshis: 0 } },
    location:
     '04a2aa605a6886c5496959924653a591c685230922d02766aed2e10fecba7fd2_o1',
    nonce: 1,
    origin:
     '04a2aa605a6886c5496959924653a591c685230922d02766aed2e10fecba7fd2_o1',
    owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
    satoshis: 0 }
    */

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(Tx)
