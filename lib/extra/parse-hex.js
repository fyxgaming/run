/**
 * parse-hex.js
 *
 * Utility method in deployed code to parse hex
 */

// ------------------------------------------------------------------------------------------------
// parseHex
// ------------------------------------------------------------------------------------------------

function parseHex (s) {
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

// ------------------------------------------------------------------------------------------------

module.exports = parseHex
