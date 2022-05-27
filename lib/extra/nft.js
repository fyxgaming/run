/**
 * nft.js
 *
 * Simple NFT Jig designed to be compatible with the Relay DEX.
 */

const Jig = require('../kernel/jig')
const Editor = require('../kernel/editor')

// ----------------------------------------------------------------------------
// Token
// ----------------------------------------------------------------------------

class NFT extends Jig {
  init (owner, number, metadata) {
    // The base NFT class cannot be created on its own
    const extended = this.constructor !== NFT
    if (!extended) throw new Error('NFT must be extended')

    // Make sure we are calling from ourself
    const minting = caller === this.constructor
    if (!minting) throw new Error('Must create token using mint()')

    if (owner) this.owner = owner
    if (metadata) this.metadata = metadata

    if (number) {
      this.number = number
      this.no = number // relay compat
    }
  }

  static mint (owner, metadata) {
    const max = this.maxSupply || this.max // relay compat
    if (max && this.supply >= max) {
      throw new Error('Maximum supply exceeded')
    }

    this.supply++
    this.total++ // relay compat

    return new this(owner, this.supply, metadata)
  }

  send (to) {
    this.sender = this.owner
    this.owner = to
  }
}

NFT.sealed = false
NFT.supply = 0
NFT.total = 0
NFT.version = '1.0'

NFT.toString() // Preserves the class name during compilation

// ----------------------------------------------------------------------------
// Presets
// ----------------------------------------------------------------------------

NFT.presets = {}
// NFT.presets.main = { }
// NFT.presets.test = { }
//
// NFT.presets.main.location = ''
// NFT.presets.main.origin = ''
// NFT.presets.main.nonce = 1
// NFT.presets.main.owner = ''
// NFT.presets.main.satoshis = 0
//
// NFT.presets.test.location = ''
// NFT.presets.test.origin = ''
// NFT.presets.test.nonce = 1
// NFT.presets.test.owner = ''
// NFT.presets.test.satoshis = 0

// ----------------------------------------------------------------------------

module.exports = Editor._preinstall(NFT)
