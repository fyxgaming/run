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

  unlockSize () {
    return 1 + this.m * 74 // 1 (OP_0) + (1 + 73) * nsigs
  }
}

GroupLock.deps = { asm, hex }

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

GroupLock.originMainnet = '3317246b76b5944fa4a37e3d383d9a8c9118acf95d873a5cfc3f24cd0f52c297_o4'
GroupLock.locationMainnet = '3317246b76b5944fa4a37e3d383d9a8c9118acf95d873a5cfc3f24cd0f52c297_o4'
GroupLock.ownerMainnet = '14zsAvs6LMnmtopdmf1RRiivZu9rYLeVzo'

GroupLock.originTestnet = '3d2db827cd8bbd379c4d2984bd4878b9d1703cad809a85bb3fcab752ff36dc59_o4'
GroupLock.locationTestnet = '3d2db827cd8bbd379c4d2984bd4878b9d1703cad809a85bb3fcab752ff36dc59_o4'
GroupLock.ownerTestnet = 'mghkHBc9R4zRgZhPx5rDfoSgXPdSRMeEih'

// ------------------------------------------------------------------------------------------------

module.exports = GroupLock
