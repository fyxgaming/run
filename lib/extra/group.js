/**
 * group.js
 *
 * A group lock that requires m of n signatures to unlock
 */

const Editor = require('../kernel/editor')
const asm = require('./asm')
const Hex = require('./hex')

// ------------------------------------------------------------------------------------------------
// Group
// ------------------------------------------------------------------------------------------------

/**
 * A multi-signature lock for jigs
 */
class Group {
  constructor (pubkeys, required) {
    this.pubkeys = pubkeys
    this.required = typeof required === 'undefined' ? this.pubkeys.length : required
  }

  script () {
    // Check pubkeys
    if (!Array.isArray(this.pubkeys)) throw new Error('pubkeys not an array')
    if (this.pubkeys.length < 1) throw new Error('pubkeys must have at least one entry')
    if (this.pubkeys.length > 16) throw new Error('No more than 16 pubkeys allowed')
    const set = new Set()
    for (const pubkey of this.pubkeys) set.add(pubkey)
    if (set.size !== this.pubkeys.length) throw new Error('pubkeys contains duplicates')
    this.pubkeys.forEach(pubkey => Hex.stringToBytes(pubkey))

    // Check m
    const badRequired = typeof this.required !== 'number' || !Number.isInteger(this.required) || this.required < 1
    if (badRequired) throw new Error('required must be a non-negative integer')
    if (this.required > this.pubkeys.length) throw new Error('required must be <= the number of pubkeys')

    // Create script
    // ie. OP_2 <pk1> <pk2> <pk3> OP_3 OP_CHECKMULTISIG
    return asm(`OP_${this.required} ${this.pubkeys.join(' ')} OP_${this.pubkeys.length} OP_CHECKMULTISIG`)
  }

  domain () {
    return 1 + this.required * 74 // 1 (OP_0) + (1 + 73) * nsigs
  }

  add (pubkey) {
    if (!this.pubkeys.includes(pubkey)) {
      this.pubkeys.push(pubkey)
    }
  }
}

Group.deps = { asm, Hex }

Group.toString() // Preserves the class name during compilation

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

Group.presets = {
  main: {
    location: '90a3ece416f696731430efac9657d28071cc437ebfff5fb1eaf710fe4b3c8d4e_o1',
    origin: '90a3ece416f696731430efac9657d28071cc437ebfff5fb1eaf710fe4b3c8d4e_o1',
    nonce: 1,
    owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
    satoshis: 0
  },

  test: {
    location: '03320f1244e509bb421e6f1ff724bf1156182890c3768cfa4ea127a78f9913d2_o1',
    origin: '03320f1244e509bb421e6f1ff724bf1156182890c3768cfa4ea127a78f9913d2_o1',
    nonce: 1,
    owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
    satoshis: 0
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(Group)
