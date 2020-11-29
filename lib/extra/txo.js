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

  function xput (script) {
    const ret = { }
    chunks(script).forEach((c, n) => {
      if (c.buf) {
        ret['h' + n] = c.buf
        const enc = c.buf.replace(/[0-9a-f]{2}/g, '%$&')
        try { ret['s' + n] = decodeURIComponent(enc) } catch (e) { }
        ret['b' + n] = bytesToBase64(Hex.stringToBytes(c.buf))
      } else {
        ret['b' + n] = { op: c.opcodenum }
      }
    })
    return ret
  }

  function input (txin) {
    const ret = xput(txin.script)
    ret.e = { h: txin.prevTxId, i: txin.outputIndex }
    return ret
  }

  function output (txout, i) {
    const ret = xput(txout.script)
    ret.e = { v: txout.satoshis, i }
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

module.exports = Editor._preinstall(txo)
