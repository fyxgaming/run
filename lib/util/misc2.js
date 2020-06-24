/**
 * misc2.js
 *
 * Helper functions
 */

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function _sameJig (a, b) {
  const Membrane = require('../kernel/v2/membrane')
  return Membrane._sudo(() => {
    if (a === b) return true
    if (a.origin !== b.origin) return false
    if (a.location !== b.location) throw new Error('Inconsistent worldview')
    return true
  })
}

// ------------------------------------------------------------------------------------------------

const _jigMapKey = (map, jig) => Array.from(map.keys()).find(x => _sameJig(x, jig)) || jig
const _jigInArray = (arr, jig) => arr.some(x => _sameJig(x, jig))
const _jigInMapKeys = (map, jig) => _jigInArray(Array.from(map.keys()), jig)
const _indexOfJigInArray = (arr, jig) => arr.findIndex(x => _sameJig(x, jig))
const _indexOfJigInMapKeys = (map, jig) => _indexOfJigInArray(Array.from(map.keys()), jig)

// ------------------------------------------------------------------------------------------------

module.exports = { _sameJig, _jigMapKey, _jigInArray, _jigInMapKeys, _indexOfJigInArray, _indexOfJigInMapKeys }
