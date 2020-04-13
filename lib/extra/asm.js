/**
 * asm.js
 *
 * Simple script compiler for custom output scripts
 */

const { parseHex } = require('./parse')

// ------------------------------------------------------------------------------------------------
// OP_CODES
// ------------------------------------------------------------------------------------------------

// See: https://wiki.bitcoinsv.io/index.php/Opcodes_used_in_Bitcoin_Script
const OP_CODES = {
  // Constants
  // OP_PUSH(N) = (OP_0 + N), 1 <= N <= 75
  OP_FALSE: 0x00,
  OP_0: 0x00,
  OP_PUSHDATA1: 0x4c,
  OP_PUSHDATA2: 0x4d,
  OP_PUSHDATA4: 0x4e,
  OP_1NEGATE: 0x4f,
  //   OP_RESERVED: 0x50, (Unused)
  OP_TRUE: 0x51,
  OP_1: 0x51,
  OP_2: 0x52,
  OP_3: 0x53,
  OP_4: 0x54,
  OP_5: 0x55,
  OP_6: 0x56,
  OP_7: 0x57,
  OP_8: 0x58,
  OP_9: 0x59,
  OP_10: 0x5a,
  OP_11: 0x5b,
  OP_12: 0x5c,
  OP_13: 0x5d,
  OP_14: 0x5e,
  OP_15: 0x5f,
  OP_16: 0x60,

  // Flow control
  OP_NOP: 0x61,
  //   OP_VER: 0x62, (Disabled)
  OP_IF: 0x63,
  OP_NOTIF: 0x64,
  //   OP_VERIF: 0x65, (Disabled)
  //   OP_VERNOTIF: 0x66, (Disabled)
  OP_ELSE: 0x67,
  OP_ENDIF: 0x68,
  OP_VERIFY: 0x69,
  OP_RETURN: 0x6a,

  // Stack
  OP_TOALTSTACK: 0x6b,
  OP_FROMALTSTACK: 0x6c,
  OP_2DROP: 0x6d,
  OP_2DUP: 0x6e,
  OP_3DUP: 0x6f,
  OP_2OVER: 0x70,
  OP_2ROT: 0x71,
  OP_2SWAP: 0x72,
  OP_IFDUP: 0x73,
  OP_DEPTH: 0x74,
  OP_DROP: 0x75,
  OP_DUP: 0x76,
  OP_NIP: 0x77,
  OP_OVER: 0x78,
  OP_PICK: 0x79,
  OP_ROLL: 0x7a,
  OP_ROT: 0x7b,
  OP_SWAP: 0x7c,
  OP_TUCK: 0x7d,

  // Data manipulation
  OP_CAT: 0x7e,
  OP_SPLIT: 0x7f,
  OP_NUM2BIN: 0x80,
  OP_BIN2NUM: 0x81,
  OP_SIZE: 0x82,

  // Bitwise logic
  OP_INVERT: 0x83,
  OP_AND: 0x84,
  OP_OR: 0x85,
  OP_XOR: 0x86,
  OP_EQUAL: 0x87,
  OP_EQUALVERIFY: 0x88,
  //   OP_RESERVED1: 0x89, (Unused)
  //   OP_RESERVED2: 0x8a, (Unused)

  // Arithmetic
  OP_1ADD: 0x8b,
  OP_1SUB: 0x8c,
  //   OP_2MUL: 0x8d, (Disabled)
  //   OP_2DIV: 0x8e, (Disabled)
  OP_NEGATE: 0x8f,
  OP_ABS: 0x90,
  OP_NOT: 0x91,
  OP_0NOTEQUAL: 0x92,
  OP_ADD: 0x93,
  OP_SUB: 0x94,
  OP_MUL: 0x95,
  OP_DIV: 0x96,
  OP_MOD: 0x97,
  OP_LSHIFT: 0x98,
  OP_RSHIFT: 0x99,
  OP_BOOLAND: 0x9a,
  OP_BOOLOR: 0x9b,
  OP_NUMEQUAL: 0x9c,
  OP_NUMEQUALVERIFY: 0x9d,
  OP_NUMNOTEQUAL: 0x9e,
  OP_LESSTHAN: 0x9f,
  OP_GREATERTHAN: 0xa0,
  OP_LESSTHANOREQUAL: 0xa1,
  OP_GREATERTHANOREQUAL: 0xa2,
  OP_MIN: 0xa3,
  OP_MAX: 0xa4,
  OP_WITHIN: 0xa5,

  // Cryptography
  OP_RIPEMD160: 0xa6,
  OP_SHA1: 0xa7,
  OP_SHA256: 0xa8,
  OP_HASH160: 0xa9,
  OP_HASH256: 0xaa,
  OP_CODESEPARATOR: 0xab,
  OP_CHECKSIG: 0xac,
  OP_CHECKSIGVERIFY: 0xad,
  OP_CHECKMULTISIG: 0xae,
  OP_CHECKMULTISIGVERIFY: 0xaf,

  // Reserved words
  OP_NOP1: 0xb0,
  OP_NOP2: 0xb1, // No-op, previously OP_CHECKLOCKTIMEVERIFY
  OP_NOP3: 0xb2, // No-op, previously OP_CHECKSEQUENCEVERIFY
  OP_NOP4: 0xb3,
  OP_NOP5: 0xb4,
  OP_NOP6: 0xb5,
  OP_NOP7: 0xb6,
  OP_NOP8: 0xb7,
  OP_NOP9: 0xb8,
  OP_NOP10: 0xb9,

  // Pseudo words (not valid in actual scripts)
  OP_PUBKEYHASH: 0xfd,
  OP_PUBKEY: 0xfe,
  OP_INVALIDOPCODE: 0xff
}

// ------------------------------------------------------------------------------------------------
// asm.compile
// ------------------------------------------------------------------------------------------------

function compile (asm) {
  const tokens = asm.split(' ')
  let out = []

  for (const next of tokens) {
    // If one of our predefined op-codes
    if (typeof compile.OP_CODES[next] !== 'undefined') {
      out.push(compile.OP_CODES[next])
      continue
    }

    // Hex data
    const bytes = parseHex(next)

    // OP_0
    if (bytes[0] === 0) {
      out.push(bytes[0]) // OP_0
      continue
    }

    // OP_1-OP_16
    if (bytes.length === 1 && bytes[0] >= 1 && bytes[0] <= 16) {
      out.push(bytes[0] + 0x50)
      continue
    }

    // OP_PUSH+[1-75] <bytes>
    if (bytes.length <= 75) {
      out = out.concat(bytes.length).concat(bytes)
      continue
    }

    // OP_PUSHDATA1 <len> <bytes>
    if (bytes.length < 256) {
      out = out.concat(compile.OP_CODES.OP_PUSHDATA1).concat([bytes.length]).concat(bytes)
      continue
    }

    // OP_PUSHDATA2 <len> <bytes>
    if (bytes.length < 256 * 256) {
      const len = [bytes.length / 256, bytes.length % 256]
      out = out.concat(compile.OP_CODES.OP_PUSHDATA2).concat(len).concat(bytes)
      continue
    }

    // OP_PUSHDATA4 <len> <bytes>
    if (bytes.length < 256 * 256 * 256 * 256) {
      const len = [
        bytes.length / 256 / 256 / 256,
        (bytes.length / 256 / 256) % 256,
        (bytes.length / 256) % 256,
        bytes.length % 256
      ]
      out = out.concat(compile.OP_CODES.OP_PUSHDATA4).concat(len).concat(bytes)
      continue
    }

    throw new Error('Hex data too long')
  }

  return new Uint8Array(out)
}

compile.OP_CODES = OP_CODES

compile.deps = { parseHex }

// ------------------------------------------------------------------------------------------------
// asm.parse
// ------------------------------------------------------------------------------------------------

function parse (buf) {

}

parse.OP_CODES = OP_CODES

// ------------------------------------------------------------------------------------------------

module.exports = { compile, parse }
