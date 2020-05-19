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

GroupLock.originMainnet = 'b6cd82f20242845ebef6867e05fd048c7763edf966cc3f8bc236a9e221843ce0_o4'
GroupLock.locationMainnet = 'b6cd82f20242845ebef6867e05fd048c7763edf966cc3f8bc236a9e221843ce0_o4'
GroupLock.ownerMainnet = '13B8kvB8i2ka8JUKQYa3B1x33AZx5n7cXw'

GroupLock.originTestnet = '6d626438e7a4fdbad1855b6656bb1abf74d0e2e500cc46b47ee79083838b429f_o4'
GroupLock.locationTestnet = '6d626438e7a4fdbad1855b6656bb1abf74d0e2e500cc46b47ee79083838b429f_o4'
GroupLock.ownerTestnet = 'mzHqorB2BvtguytBnC65v325cTH9b6qSgb'

// ------------------------------------------------------------------------------------------------

module.exports = GroupLock
