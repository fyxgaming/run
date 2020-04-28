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

hex.originMainnet = '885d27c4484572f91e7b167768cf07b8e4a942ede5bf5b084f6682a95b427dde_o2'
hex.locationMainnet = '885d27c4484572f91e7b167768cf07b8e4a942ede5bf5b084f6682a95b427dde_o2'
hex.ownerMainnet = '19PGfePrnYiCya3zJM7AcansrBDkgBswZT'

hex.originTestnet = 'ab24fc08193485666ad576f4f8885062ed8ce8593346ac3e9fc8fd9421836cfc_o2'
hex.locationTestnet = 'ab24fc08193485666ad576f4f8885062ed8ce8593346ac3e9fc8fd9421836cfc_o2'
hex.ownerTestnet = 'mtgCmYYxurn4k9PjcsSvVkHodt5HDtbZZM'

// ------------------------------------------------------------------------------------------------

module.exports = hex
