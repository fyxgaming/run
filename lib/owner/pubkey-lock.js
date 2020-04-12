/**
 * pubkey-lock.js
 *
 * A common lock that creates a P2PK output for a public key
 */

// ------------------------------------------------------------------------------------------------
// PubKeyLock
// ------------------------------------------------------------------------------------------------

class PubKeyLock {
  constructor (pubkey) {
    this.pubkey = pubkey
  }

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
}


  /[0-9a-f]+ OP_CHECKSIG/.test(asm.compile(this.script))

PubKeyLock.originTestnet = '3bed4b59b8a4c475a0322d6f98ac5dce0abc0aedf216fa5b6195e2472699fbeb_o1'
PubKeyLock.locationTestnet = '3bed4b59b8a4c475a0322d6f98ac5dce0abc0aedf216fa5b6195e2472699fbeb_o1'
PubKeyLock.ownerTestnet = 'mu8Y36qE8d9vpCRN77assvioD2vJS8gnsH'
PubKeyLock.originMainnet = 'b36ae3757c2f57de01da8f2bfede0a97f3db974eb9fb65941ad7f2efea34ff04_o1'
PubKeyLock.locationMainnet = 'b36ae3757c2f57de01da8f2bfede0a97f3db974eb9fb65941ad7f2efea34ff04_o1'
PubKeyLock.ownerMainnet = '1Fytb1vq6SZZok9kwQMV2f3e653s4Vn7M9'

// ------------------------------------------------------------------------------------------------

module.exports = PubKeyLock
