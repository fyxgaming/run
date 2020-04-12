/**
 * group-lock.js
 *
 * A lock that requires m of n signatures to unlock
 */

// ------------------------------------------------------------------------------------------------
// GroupLock
// ------------------------------------------------------------------------------------------------

/**
 * A multi-signature lock for tokens
 */
class GroupLock {
  constructor (pubkeys, m) {
    this.pubkeys = pubkeys
    this.m = m
  }

  get script () {
    // Todo
    return new Uint8Array()
  }
}

/*
  // TO STRING

  get script() {
    return asm.compile(this.pubkey + ' OP_CHECKSIG')

    return asm.compile('{pubkey} OP_CHECKSIG', this.pubkey)

    /*
    if (typeof this.pubkey !== 'string' || this.pubkey.length % 2 !== 0) {
      throw new Error(`Bad pubkey: ${this.pubkey}`)
    }

    const pubkey = this.pubkey.toLowerCase()
    const pubkeyBytes = []
    const HEX_CHARS = '0123456789abcdef'.split('')

    for (let i = 0; i < pubkey.length; i += 2) {
      const high = HEX_CHARS.indexOf(pubkey[i])
      const low = HEX_CHARS.indexOf(pubkey[i + 1])

      if (high === -1 || low === -1) {
        throw new Error(`Bad pubkey hex: ${this.pubkey}`)
      }

      pubkeyBytes.push(high * 16 + low)
    }

    Script.from(`${pubkeyBytes} OP_CHECKSIG`)

    // <PK> OP_CHECKSIG
    const script = []
    script.push(OP.PUSH(pubkeyBytes))
    script.push(OP.CHECKSIG)

    OP.PUSH(pubkeyBytes).concat(OP_CHECKSIG)

    const scriptBytes = [pubkeyBytes.length, ...pubkeyBytes, 172]

    return new Uint8Array(scriptBytes)
  }
  */

// ------------------------------------------------------------------------------------------------

module.exports = GroupLock
