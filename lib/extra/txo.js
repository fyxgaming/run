/**
 * txo.js
 *
 * A parser from a bitcoin transaction to the txo data format
 *
 * Supported
 *    -bN (base58)
 *    -hN (hex)
 *    -sN (utf8)
 *    -bN.op (opcode num)
 *    -e.h (txid)
 *    -e.i (output index)
 *    -e.v (satoshis)
 *    -seq
 *    -i
 *
 * Unsupported
 *    -e.a (address)
 *    -lbN (large base58)
 *    -xlbN (extra large base58)
 *    -tx.h (txid)
 *    -confirmations (num confs)
 *
 * Original TXO parser: https://github.com/interplanaria/txo/blob/master/index.js
 */

const Editor = require('../kernel/editor')
const Tx = require('./tx')
const Hex = require('./hex')

// ------------------------------------------------------------------------------------------------
// txo
// ------------------------------------------------------------------------------------------------

function txo (rawtx) {
  const ret = { }

  function chunks (script) {
    const b = Hex.stringToBytes(script)
    let i = 0

    function u8 () { return b[i++] }
    function u16 () { return u8() + u8() * 256 }
    function u32 () { return u16() + u16() * 256 * 256 }
    function buf (n) { const h = Hex.bytesToString(b.slice(i, i + n)); i += n; return h }

    const OP_PUSHDATA1 = 0x4c
    const OP_PUSHDATA2 = 0x4d
    const OP_PUSHDATA4 = 0x4e

    const chunks = []
    while (i < b.length) {
      const opcodenum = u8()
      if (opcodenum > 0 && opcodenum < OP_PUSHDATA1) {
        chunks.push({ buf: buf(opcodenum), len: opcodenum, opcodenum })
      } else if (opcodenum === OP_PUSHDATA1) {
        const len = u8()
        chunks.push({ buf: buf(len), len, opcodenum })
      } else if (opcodenum === OP_PUSHDATA2) {
        const len = u16()
        chunks.push({ buf: buf(len), len, opcodenum })
      } else if (opcodenum === OP_PUSHDATA4) {
        const len = u32()
        chunks.push({ buf: buf(len), len, opcodenum })
      } else {
        chunks.push({ opcodenum })
      }
    }
    return chunks
  }

  // https://stackoverflow.com/questions/23190056/hex-to-base64-converter-for-javascript
  function bytesToBase64 (arr) {
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/' // base64 alphabet
    const bin = n => n.toString(2).padStart(8, 0) // convert num to 8-bit binary string
    const l = arr.length
    let result = ''
    for (let i = 0; i <= (l - 1) / 3; i++) {
      const c1 = i * 3 + 1 >= l // case when "=" is on end
      const c2 = i * 3 + 2 >= l // case when "=" is on end
      const chunk = bin(arr[3 * i]) + bin(c1 ? 0 : arr[3 * i + 1]) + bin(c2 ? 0 : arr[3 * i + 2])
      const r = chunk.match(/.{1,6}/g).map((x, j) => j === 3 && c2 ? '=' : (j === 2 && c1 ? '=' : abc[+('0b' + x)]))
      result += r.join('')
    }
    return result
  }

  function xput (script, output) {
    const ret = { }
    chunks(script).forEach((c, n) => {
      if (c.buf) {
        ret['b' + n] = bytesToBase64(Hex.stringToBytes(c.buf))
        const enc = c.buf.replace(/[0-9a-f]{2}/g, '%$&')
        if (output) try { ret['s' + n] = decodeURIComponent(enc) } catch (e) { }
        if (output) ret['h' + n] = c.buf
      } else {
        ret['b' + n] = { op: c.opcodenum }
      }
    })
    return ret
  }

  function input (txin, i) {
    const ret = xput(txin.script)
    ret.e = { h: txin.prevTxId, i: txin.outputIndex }
    ret.i = i
    ret.seq = txin.sequenceNumber
    return ret
  }

  function output (txout, i) {
    const ret = xput(txout.script, true)
    ret.e = { v: txout.satoshis, i }
    ret.i = i
    return ret
  }

  const tx = new Tx(rawtx)
  ret.in = tx.inputs.map(input)
  ret.out = tx.outputs.map(output)
  ret.lock = tx.nLockTime
  return ret
}

txo.deps = { Tx, Hex }

Tx.toString() // Preserves the class name during compilation

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

/*
{ [Function: txo]
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
        satoshis: 0 },
     Tx:
      { [Function: Tx]
        deps: [Object],
        location:
         '33e78fa7c43b6d7a60c271d783295fa180b7e9fce07d41ff1b52686936b3e6ae_o2',
        nonce: 1,
        origin:
         '33e78fa7c43b6d7a60c271d783295fa180b7e9fce07d41ff1b52686936b3e6ae_o2',
        owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
        satoshis: 0 } },
  location:
   '33e78fa7c43b6d7a60c271d783295fa180b7e9fce07d41ff1b52686936b3e6ae_o1',
  nonce: 1,
  origin:
   '33e78fa7c43b6d7a60c271d783295fa180b7e9fce07d41ff1b52686936b3e6ae_o1',
  owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
  satoshis: 0 }

  { [Function: txo]
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
          satoshis: 0 },
       Tx:
        { [Function: Tx]
          deps: [Object],
          location:
           '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o2',
          nonce: 1,
          origin:
           '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o2',
          owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
          satoshis: 0 } },
    location:
     '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o1',
    nonce: 1,
    origin:
     '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o1',
    owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
    satoshis: 0 }
    */

module.exports = Editor._preinstall(txo)
