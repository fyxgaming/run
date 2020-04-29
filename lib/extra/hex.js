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

hex.originMainnet = '6f246358cf94a7698e3cf6cc92eeff73affed54c8f8f9a214adb987a2fbd8fd2_o2'
hex.locationMainnet = '6f246358cf94a7698e3cf6cc92eeff73affed54c8f8f9a214adb987a2fbd8fd2_o2'
hex.ownerMainnet = '1JweCVFR1D6Uye5yBzxAyoDmXseBunVNHr'

hex.originTestnet = 'c9f9b15d73298bb807c3b22f62cb1f0b096d2a1c13678a9d29836a6fb538f901_o2'
hex.locationTestnet = 'c9f9b15d73298bb807c3b22f62cb1f0b096d2a1c13678a9d29836a6fb538f901_o2'
hex.ownerTestnet = 'mjs1rSdsm6tGAKdm79cUQ4rYXY1kvho34v'

// ------------------------------------------------------------------------------------------------

module.exports = hex
