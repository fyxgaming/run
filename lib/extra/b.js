/**
 * b.js
 *
 * A berry for loading b:// protocol data
 */

const Berry = require('../kernel/berry')
const Editor = require('../kernel/editor')
const txo = require('./txo')

// ------------------------------------------------------------------------------------------------
// B
// ------------------------------------------------------------------------------------------------

class B extends Berry {
  init (data, mediaType, encoding, filename) {
    this.base64Data = data
    this.mediaType = mediaType
    this.encoding = encoding
    this.filename = filename
  }

  static async pluck (txid, fetch) {
    const data = txo(await fetch(txid))
    const out = data.out.find(o => o.s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut')
    return new B(out.b3, out.s4, out.s5, out.s6)
  }
}

B.deps = { txo }

B.toString() // Preserves the class name during compilation

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

B.presets = {}
B.presets.main = {}
B.presets.test = {}

B.presets.main.location = '24cde3638a444c8ad397536127833878ffdfe1b04d5595489bd294e50d77105a_o1'
B.presets.main.origin = '24cde3638a444c8ad397536127833878ffdfe1b04d5595489bd294e50d77105a_o1'
B.presets.main.nonce = 1
B.presets.main.owner = '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx'
B.presets.main.satoshis = 0

B.presets.test.location = '8d7846899722f154022e782049246d78eafd098fde16f56ad935df13e43d924c_o1'
B.presets.test.origin = '8d7846899722f154022e782049246d78eafd098fde16f56ad935df13e43d924c_o1'
B.presets.test.nonce = 1
B.presets.test.owner = 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE'
B.presets.test.satoshis = 0

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(B)
