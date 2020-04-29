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

GroupLock.originMainnet = '6f246358cf94a7698e3cf6cc92eeff73affed54c8f8f9a214adb987a2fbd8fd2_o4'
GroupLock.locationMainnet = '6f246358cf94a7698e3cf6cc92eeff73affed54c8f8f9a214adb987a2fbd8fd2_o4'
GroupLock.ownerMainnet = '1JweCVFR1D6Uye5yBzxAyoDmXseBunVNHr'

GroupLock.originTestnet = 'c9f9b15d73298bb807c3b22f62cb1f0b096d2a1c13678a9d29836a6fb538f901_o4'
GroupLock.locationTestnet = 'c9f9b15d73298bb807c3b22f62cb1f0b096d2a1c13678a9d29836a6fb538f901_o4'
GroupLock.ownerTestnet = 'mjs1rSdsm6tGAKdm79cUQ4rYXY1kvho34v'

// ------------------------------------------------------------------------------------------------

module.exports = GroupLock
