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
  init (base64Data, mediaType, encoding, filename, metadata = {}) {
    this.base64Data = base64Data
    this.mediaType = mediaType
    this.encoding = encoding
    this.filename = filename
    this.metadata = metadata

    if (mediaType === 'image/svg+xml' || mediaType === 'image/png') {
      this.metadata.image = this
    }
  }

  static async pluck (path, fetch) {
    const txid = path.length === 64 ? path : JSON.parse(path).txid
    const metadata = path.length === 64 ? {} : JSON.parse(path).metadata
    const data = txo(await fetch(txid))
    const out = data.out.find(o => o.s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut')
    if (!out) throw new Error(`Cannot find B:// data in ${txid}`)
    return new B(out.b3, out.s4, out.s5, out.s6, metadata)
  }

  static async loadWithMetadata (txid, metadata) {
    return this.load(JSON.stringify({ txid, metadata }))
  }
}

B.metadata = {
  author: 'Run ▸ Extra',
  website: 'https://www.run.network',
  license: 'MIT'
}

B.deps = { txo }

B.toString() // Preserves the class name during compilation

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

B.presets = {}
B.presets.main = {}
B.presets.test = {}

B.presets.main.location = '05f67252e696160a7c0099ae8d1ec23c39592378773b3a5a55f16bd1286e7dcb_o3'
B.presets.main.origin = '05f67252e696160a7c0099ae8d1ec23c39592378773b3a5a55f16bd1286e7dcb_o3'
B.presets.main.nonce = 2
B.presets.main.owner = '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx'
B.presets.main.satoshis = 0

B.presets.test.location = 'd476fd7309a0eeb8b92d715e35c6e273ad63c0025ff6cca927bd0f0b64ed88ff_o3'
B.presets.test.origin = 'd476fd7309a0eeb8b92d715e35c6e273ad63c0025ff6cca927bd0f0b64ed88ff_o3'
B.presets.test.nonce = 2
B.presets.test.owner = 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE'
B.presets.test.satoshis = 0

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(B)
