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

hex.originMainnet = '87cd529983d7fa5e0fc3c70a0d6f488f9f251aaffd3c86aea5f88ac364895795_o2'
hex.locationMainnet = '87cd529983d7fa5e0fc3c70a0d6f488f9f251aaffd3c86aea5f88ac364895795_o2'
hex.ownerMainnet = '13HMuzt7FMHiicG2Pi4PLkJopkzydQGcug'

hex.originTestnet = '10a88faafc164b73957e0bdf983d9168e6d7a83fea4a5c68669e331cda07188b_o2'
hex.locationTestnet = '10a88faafc164b73957e0bdf983d9168e6d7a83fea4a5c68669e331cda07188b_o2'
hex.ownerTestnet = 'mpPoB3cgrvUz9rxp9zqDGHUYNBVMWs2Xy7'

// ------------------------------------------------------------------------------------------------

module.exports = hex
