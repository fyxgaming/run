/**
 * sha256.js
 *
 * On-chain SHA256
 */

const Editor = require('../kernel/editor')

// ------------------------------------------------------------------------------------------------
// sha256
// ------------------------------------------------------------------------------------------------

function sha256 (message) {
  if (!Array.isArray(message)) throw new Error(`Invalid bytes: ${message}`)

  // Based off https://github.com/emn178/js-sha256/blob/master/src/sha256.js

  const EXTRA = [-2147483648, 8388608, 32768, 128]
  const SHIFT = [24, 16, 8, 0]
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]

  const blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  let block = 0
  let start = 0
  let bytes = 0
  let hBytes = 0
  let first = true
  let hashed = false
  let lastByteIndex = 0

  update()
  finalize()
  return digest()

  function update () {
    let i
    let index = 0
    const length = message.length

    while (index < length) {
      if (hashed) {
        hashed = false
        blocks[0] = block
        blocks[16] = blocks[1] = blocks[2] = blocks[3] =
                blocks[4] = blocks[5] = blocks[6] = blocks[7] =
                blocks[8] = blocks[9] = blocks[10] = blocks[11] =
                blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0
      }

      for (i = start; index < length && i < 64; ++index) {
        blocks[i >> 2] |= message[index] << SHIFT[i++ & 3]
      }

      lastByteIndex = i
      bytes += i - start
      if (i >= 64) {
        block = blocks[16]
        start = i - 64
        hash()
        hashed = true
      } else {
        start = i
      }
    }

    if (bytes > 4294967295) {
      hBytes += bytes / 4294967296 << 0
      bytes = bytes % 4294967296
    }
  }

  function finalize () {
    blocks[16] = block
    blocks[lastByteIndex >> 2] |= EXTRA[lastByteIndex & 3]
    block = blocks[16]
    if (lastByteIndex >= 56) {
      if (!hashed) {
        hash()
      }
      blocks[0] = block
      blocks[16] = blocks[1] = blocks[2] = blocks[3] =
            blocks[4] = blocks[5] = blocks[6] = blocks[7] =
            blocks[8] = blocks[9] = blocks[10] = blocks[11] =
            blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0
    }
    blocks[14] = hBytes << 3 | bytes >>> 29
    blocks[15] = bytes << 3
    hash()
  }

  function hash () {
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7
    let j
    let s0
    let s1
    let maj
    let t1
    let t2
    let ch
    let ab
    let da
    let cd
    let bc

    for (j = 16; j < 64; ++j) {
      t1 = blocks[j - 15]
      s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3)
      t1 = blocks[j - 2]
      s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10)
      blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0
    }

    bc = b & c
    for (j = 0; j < 64; j += 4) {
      if (first) {
        ab = 704751109
        t1 = blocks[0] - 210244248
        h = t1 - 1521486534 << 0
        d = t1 + 143694565 << 0
        first = false
      } else {
        s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))
        s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))
        ab = a & b
        maj = ab ^ (a & c) ^ bc
        ch = (e & f) ^ (~e & g)
        t1 = h + s1 + ch + K[j] + blocks[j]
        t2 = s0 + maj
        h = d + t1 << 0
        d = t1 + t2 << 0
      }
      s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10))
      s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7))
      da = d & a
      maj = da ^ (d & b) ^ ab
      ch = (h & e) ^ (~h & f)
      t1 = g + s1 + ch + K[j + 1] + blocks[j + 1]
      t2 = s0 + maj
      g = c + t1 << 0
      c = t1 + t2 << 0
      s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10))
      s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7))
      cd = c & d
      maj = cd ^ (c & a) ^ da
      ch = (g & h) ^ (~g & e)
      t1 = f + s1 + ch + K[j + 2] + blocks[j + 2]
      t2 = s0 + maj
      f = b + t1 << 0
      b = t1 + t2 << 0
      s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10))
      s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7))
      bc = b & c
      maj = bc ^ (b & d) ^ cd
      ch = (f & g) ^ (~f & h)
      t1 = e + s1 + ch + K[j + 3] + blocks[j + 3]
      t2 = s0 + maj
      e = a + t1 << 0
      a = t1 + t2 << 0
    }

    h0 = h0 + a << 0
    h1 = h1 + b << 0
    h2 = h2 + c << 0
    h3 = h3 + d << 0
    h4 = h4 + e << 0
    h5 = h5 + f << 0
    h6 = h6 + g << 0
    h7 = h7 + h << 0
  }

  function digest () {
    return [
      (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,
      (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,
      (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,
      (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,
      (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF,
      (h5 >> 24) & 0xFF, (h5 >> 16) & 0xFF, (h5 >> 8) & 0xFF, h5 & 0xFF,
      (h6 >> 24) & 0xFF, (h6 >> 16) & 0xFF, (h6 >> 8) & 0xFF, h6 & 0xFF,
      (h7 >> 24) & 0xFF, (h7 >> 16) & 0xFF, (h7 >> 8) & 0xFF, h7 & 0xFF
    ]
  }
}

sha256.toString() // Preserves the class name during compilation

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

sha256.presets = {}
sha256.presets.main = {}
sha256.presets.test = {}

sha256.presets.main.location = '3b7ef411185bbe3d01caeadbe6f115b0103a546c4ef0ac7474aa6fbb71aff208_o1'
sha256.presets.main.origin = '3b7ef411185bbe3d01caeadbe6f115b0103a546c4ef0ac7474aa6fbb71aff208_o1'
sha256.presets.main.nonce = 1
sha256.presets.main.owner = '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx'
sha256.presets.main.satoshis = 0

sha256.presets.test.location = '4a1929527605577a6b30710e6001b9379400421d8089d34bb0404dd558529417_o1'
sha256.presets.test.origin = '4a1929527605577a6b30710e6001b9379400421d8089d34bb0404dd558529417_o1'
sha256.presets.test.nonce = 1
sha256.presets.test.owner = 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE'
sha256.presets.test.satoshis = 0

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(sha256)
