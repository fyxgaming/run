/**
 * pubkey-lock.js
 *
 * A common lock that creates a P2PKH output for a public key
 */

// ------------------------------------------------------------------------------------------------
// PubKeyLock
// ------------------------------------------------------------------------------------------------

class PubKeyLock {
  constructor (pubkey) {
    if (typeof pubkey !== 'string') throw new Error(`Pubkey is not a string: ${pubkey}`)
    this.pubkey = pubkey
  }

  get script () {
    const H = '0123456789abcdef'.split('')
    const s = this.pubkey.toLowerCase()
    const pk = []
    if (s.length % 2 !== 0) throw new Error(`Pubkey has bad length: ${this.pubkey}`)
    for (let i = 0; i < s.length; i += 2) {
      const h1 = H.indexOf(s[i])
      const h2 = H.indexOf(s[i + 1])
      if (h1 === -1 || h2 === -1) throw new Error(`Invalid pubkey hex: ${s}`)
      pk.push(h1 * 16 + h2)
    }
    const script = [pk.length, ...pk, 172] // <PK> OP_CHECKSIG
    return new Uint8Array(script)
  }
}

PubKeyLock.originTestnet = '3bed4b59b8a4c475a0322d6f98ac5dce0abc0aedf216fa5b6195e2472699fbeb_o1'
PubKeyLock.locationTestnet = '3bed4b59b8a4c475a0322d6f98ac5dce0abc0aedf216fa5b6195e2472699fbeb_o1'
PubKeyLock.ownerTestnet = 'mu8Y36qE8d9vpCRN77assvioD2vJS8gnsH'
PubKeyLock.originMainnet = 'b36ae3757c2f57de01da8f2bfede0a97f3db974eb9fb65941ad7f2efea34ff04_o1'
PubKeyLock.locationMainnet = 'b36ae3757c2f57de01da8f2bfede0a97f3db974eb9fb65941ad7f2efea34ff04_o1'
PubKeyLock.ownerMainnet = '1Fytb1vq6SZZok9kwQMV2f3e653s4Vn7M9'

// ------------------------------------------------------------------------------------------------

module.exports = PubKeyLock
