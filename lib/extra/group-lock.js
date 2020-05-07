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
 * A multi-signature lock for resources
 */
class GroupLock {
  constructor (pubkeys, m) {
    this.pubkeys = pubkeys
    this.m = typeof m === 'undefined' ? this.pubkeys.length : m
  }

  script () {
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

  domain () {
    return 1 + this.m * 74 // 1 (OP_0) + (1 + 73) * nsigs
  }
}

GroupLock.deps = { asm, hex }

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

GroupLock.originMainnet = 'e605fcd04483984c6554dffafef846db5912e1bc9a2077bf9b608eb63f65e070_o4'
GroupLock.locationMainnet = 'e605fcd04483984c6554dffafef846db5912e1bc9a2077bf9b608eb63f65e070_o4'
GroupLock.ownerMainnet = '1CrnNsX2ShSQTZSW3WSmbSNPfk5TSwf6Vc'

GroupLock.originTestnet = '6889a94e58aedb7d783430597ab1dc12ccd143449f8b0c27a7276f0acaebfd19_o4'
GroupLock.locationTestnet = '6889a94e58aedb7d783430597ab1dc12ccd143449f8b0c27a7276f0acaebfd19_o4'
GroupLock.ownerTestnet = 'mzCdogUopVoL82nUdpz3X67zoHhxen5qkQ'

// ------------------------------------------------------------------------------------------------

module.exports = GroupLock
