/**
 * b.js
 *
 * A berry for loading b:// protocol data
 */

const Berry = require('../kernel/berry')
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

module.exports = B
