/**
 * hex.js
 *
 * Utility method in deployed code to parse hex
 */

// ------------------------------------------------------------------------------------------------
// hex
// ------------------------------------------------------------------------------------------------

function hex (s) {
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
// Presets
// ------------------------------------------------------------------------------------------------

hex.originMainnet = 'b6cd82f20242845ebef6867e05fd048c7763edf966cc3f8bc236a9e221843ce0_o2'
hex.locationMainnet = 'b6cd82f20242845ebef6867e05fd048c7763edf966cc3f8bc236a9e221843ce0_o2'
hex.ownerMainnet = '13B8kvB8i2ka8JUKQYa3B1x33AZx5n7cXw'

hex.originTestnet = '6d626438e7a4fdbad1855b6656bb1abf74d0e2e500cc46b47ee79083838b429f_o2'
hex.locationTestnet = '6d626438e7a4fdbad1855b6656bb1abf74d0e2e500cc46b47ee79083838b429f_o2'
hex.ownerTestnet = 'mzHqorB2BvtguytBnC65v325cTH9b6qSgb'

// ------------------------------------------------------------------------------------------------

module.exports = hex
