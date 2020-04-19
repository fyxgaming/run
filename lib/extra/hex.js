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

hex.originMainnet = '4add375f29686d865b7d758ccd14c7ea74e58b55162849581de6bb1f718ad94c_o1'
hex.locationMainnet = '4add375f29686d865b7d758ccd14c7ea74e58b55162849581de6bb1f718ad94c_o1'
hex.ownerMainnet = '13mBm6NHsoQ34NcrpWDwwr3xkSaCwyNXb7'

hex.originTestnet = '7af61ceb832ff42f1813fdda88791b264f3abd7d1811607c77f8269bf47038e5_o1'
hex.locationTestnet = '7af61ceb832ff42f1813fdda88791b264f3abd7d1811607c77f8269bf47038e5_o1'
hex.ownerTestnet = 'n3bsyTRRP294KLtY57wHbP82KrE9kVeu4P'

module.exports = hex
