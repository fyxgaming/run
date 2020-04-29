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

hex.originMainnet = '3317246b76b5944fa4a37e3d383d9a8c9118acf95d873a5cfc3f24cd0f52c297_o2'
hex.locationMainnet = '3317246b76b5944fa4a37e3d383d9a8c9118acf95d873a5cfc3f24cd0f52c297_o2'
hex.ownerMainnet = '14zsAvs6LMnmtopdmf1RRiivZu9rYLeVzo'

hex.originTestnet = '3d2db827cd8bbd379c4d2984bd4878b9d1703cad809a85bb3fcab752ff36dc59_o2'
hex.locationTestnet = '3d2db827cd8bbd379c4d2984bd4878b9d1703cad809a85bb3fcab752ff36dc59_o2'
hex.ownerTestnet = 'mghkHBc9R4zRgZhPx5rDfoSgXPdSRMeEih'

// ------------------------------------------------------------------------------------------------

module.exports = hex
