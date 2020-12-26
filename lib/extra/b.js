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
  init (base64Data, mediaType, filename, metadata = {}) {
    this.base64Data = base64Data
    this.mediaType = mediaType
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
    const out = data.out.find(o => o.s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut' && o.s5 === 'binary')
    if (!out) throw new Error(`Cannot find B:// binary data in ${txid}`)
    return new B(out.b3, out.s4, out.s6, metadata)
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

B.presets.main.location = '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o1'
B.presets.main.origin = '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o1'
B.presets.main.nonce = 1
B.presets.main.owner = '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx'
B.presets.main.satoshis = 0

B.presets.test.location = '5435ae2760dc35f4329501c61c42e24f6a744861c22f8e0f04735637c20ce987_o1'
B.presets.test.origin = '5435ae2760dc35f4329501c61c42e24f6a744861c22f8e0f04735637c20ce987_o1'
B.presets.test.nonce = 1
B.presets.test.owner = 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE'
B.presets.test.satoshis = 0

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(B)
