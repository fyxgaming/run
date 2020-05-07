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

hex.originMainnet = 'e605fcd04483984c6554dffafef846db5912e1bc9a2077bf9b608eb63f65e070_o2'
hex.locationMainnet = 'e605fcd04483984c6554dffafef846db5912e1bc9a2077bf9b608eb63f65e070_o2'
hex.ownerMainnet = '1CrnNsX2ShSQTZSW3WSmbSNPfk5TSwf6Vc'

hex.originTestnet = '6889a94e58aedb7d783430597ab1dc12ccd143449f8b0c27a7276f0acaebfd19_o2'
hex.locationTestnet = '6889a94e58aedb7d783430597ab1dc12ccd143449f8b0c27a7276f0acaebfd19_o2'
hex.ownerTestnet = 'mzCdogUopVoL82nUdpz3X67zoHhxen5qkQ'

// ------------------------------------------------------------------------------------------------

module.exports = hex
