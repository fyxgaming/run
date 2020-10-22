/**
 * hex.js
 *
 * Helpers methods to convert to and from hex strings
 */

const Editor = require('../kernel/editor')

// ------------------------------------------------------------------------------------------------
// Hex
// ------------------------------------------------------------------------------------------------

class Hex {
  static stringToBytes (s) {
    if (typeof s !== 'string' || s.length % 2 !== 0) {
      throw new Error(`Bad hex: ${s}`)
    }

    s = s.toLowerCase()

    const HEX_CHARS = '0123456789abcdef'.split('')
    const bytes = []

    for (let i = 0; i < s.length; i += 2) {
      const high = HEX_CHARS.indexOf(s[i])
      const low = HEX_CHARS.indexOf(s[i + 1])

      if (high === -1 || low === -1) {
        throw new Error(`Bad hex: ${s}`)
      }

      bytes.push(high * 16 + low)
    }

    return bytes
  }

  static bytesToString (b) {
    if (!Array.isArray(b)) throw new Error(`Bad bytes: ${b}`)

    const validDigit = x => Number.isInteger(x) && x >= 0 && x < 256
    b.forEach(x => { if (!validDigit(x)) throw new Error(`Bad digit: ${x}`) })

    return b
      .map(x => x.toString('16'))
      .map(x => x.length === 1 ? '0' + x : x)
      .join('')
  }
}

Hex.toString() // Preserves the class name during compilation

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

// TODO

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(Hex)
