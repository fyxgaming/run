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
// Presets
// ------------------------------------------------------------------------------------------------

GroupLock.originMainnet = '885d27c4484572f91e7b167768cf07b8e4a942ede5bf5b084f6682a95b427dde_o4'
GroupLock.locationMainnet = '885d27c4484572f91e7b167768cf07b8e4a942ede5bf5b084f6682a95b427dde_o4'
GroupLock.ownerMainnet = '19PGfePrnYiCya3zJM7AcansrBDkgBswZT'

GroupLock.originTestnet = 'ab24fc08193485666ad576f4f8885062ed8ce8593346ac3e9fc8fd9421836cfc_o4'
GroupLock.locationTestnet = 'ab24fc08193485666ad576f4f8885062ed8ce8593346ac3e9fc8fd9421836cfc_o4'
GroupLock.ownerTestnet = 'mtgCmYYxurn4k9PjcsSvVkHodt5HDtbZZM'

// ------------------------------------------------------------------------------------------------

module.exports = GroupLock
