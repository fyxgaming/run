/**
 * group-lock.js
 *
 * A group lock that requires m of n signatures to unlock
 */

const asm = require('./asm')
const hex = require('./hex')

// ------------------------------------------------------------------------------------------------
// GroupLock
// ------------------------------------------------------------------------------------------------

/**
 * A multi-signature lock for tokens
 */
class GroupLock {
  constructor (pubkeys, m) {
    this.pubkeys = pubkeys
    this.m = typeof m === 'undefined' ? this.pubkeys.length : m
  }

  get script () {
    // Check pubkeys
    if (!Array.isArray(this.pubkeys)) throw new Error('pubkeys not an array')
    if (this.pubkeys.length < 1) throw new Error('pubkeys must have at least one entry')
    if (this.pubkeys.length > 16) throw new Error('No more than 16 pubkeys allowed')
    const set = new Set()
    for (const pubkey of this.pubkeys) set.add(pubkey)
    if (set.size !== this.pubkeys.length) throw new Error('pubkeys contains duplicates')
    this.pubkeys.forEach(pubkey => hex(pubkey))

    // Check m
    const badM = typeof this.m !== 'number' || !Number.isInteger(this.m) || this.m < 1
    if (badM) throw new Error('m must be a non-negative integer')
    if (this.m > this.pubkeys.length) throw new Error('m must be <= the number of pubkeys')

    // Create script
    // ie. OP_2 <pk1> <pk2> <pk3> OP_3 OP_CHECKMULTISIG
    return asm(`OP_${this.m} ${this.pubkeys.join(' ')} OP_${this.pubkeys.length} OP_CHECKMULTISIG`)
  }
}

GroupLock.deps = { asm, hex }

// ------------------------------------------------------------------------------------------------

GroupLock.originMainnet = 'ef260b26fa34cf6347b3b85ba07ec88b27e90d611c88b43f51416adc1f0f92b5_o1'
GroupLock.locationMainnet = 'ef260b26fa34cf6347b3b85ba07ec88b27e90d611c88b43f51416adc1f0f92b5_o1'
GroupLock.ownerMainnet = '1Arq17WV4J3k2mDVkZ9bMtqvimm95FT373'

GroupLock.originTestnet = '78dedf2d43e47d1c7cdb55fa047e36aba38eff67b3ad3a930a3f7a2c8276998c_o1'
GroupLock.locationTestnet = '78dedf2d43e47d1c7cdb55fa047e36aba38eff67b3ad3a930a3f7a2c8276998c_o1'
GroupLock.ownerTestnet = 'mnVD9Vr3xcq1XNwwcJXCLQfT89CSeqKAmx'

module.exports = GroupLock
