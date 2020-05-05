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

hex.originMainnet = '0f99a89c41a857402973fe2d767de69488fbdaf54067a2b1eb500c9d0eb3d21a_o2'
hex.locationMainnet = '0f99a89c41a857402973fe2d767de69488fbdaf54067a2b1eb500c9d0eb3d21a_o2'
hex.ownerMainnet = '1CscRyquNBh5UAVYhfxvy1HfnQrSLe85MG'

hex.originTestnet = 'ddcee5e04c67c2077026d813b2315c69a871ad38b47209d83f9e213a15663c57_o2'
hex.locationTestnet = 'ddcee5e04c67c2077026d813b2315c69a871ad38b47209d83f9e213a15663c57_o2'
hex.ownerTestnet = 'mqvDyKXEfdbUYTepHbi3vvtCxRrGVDgGcb'

// ------------------------------------------------------------------------------------------------

module.exports = hex
