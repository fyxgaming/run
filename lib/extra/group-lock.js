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

GroupLock.originMainnet = '87cd529983d7fa5e0fc3c70a0d6f488f9f251aaffd3c86aea5f88ac364895795_o4'
GroupLock.locationMainnet = '87cd529983d7fa5e0fc3c70a0d6f488f9f251aaffd3c86aea5f88ac364895795_o4'
GroupLock.ownerMainnet = '13HMuzt7FMHiicG2Pi4PLkJopkzydQGcug'

GroupLock.originTestnet = '10a88faafc164b73957e0bdf983d9168e6d7a83fea4a5c68669e331cda07188b_o4'
GroupLock.locationTestnet = '10a88faafc164b73957e0bdf983d9168e6d7a83fea4a5c68669e331cda07188b_o4'
GroupLock.ownerTestnet = 'mpPoB3cgrvUz9rxp9zqDGHUYNBVMWs2Xy7'

// ------------------------------------------------------------------------------------------------

module.exports = GroupLock
