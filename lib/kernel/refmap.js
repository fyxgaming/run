/**
 * refmap.js
 *
 * Create and load reference maps
 *
 * A reference map is a data structure, like the state, that is tied to a particular location.
 * It stores list of a jigs referenced by that jig in a form that may be compared to other
 * reference maps easily. The purpose of the reference map is to be able to quickly calculate
 * states when creating a run transaction.
 *
 * Its format is:
 *
 *      {
 *          <origin1>: [<location1>, <nonce1>],
 *          <origin2>: [<location2>, <nonce2>],
 *          ...
 *      }
 *
 * The refmap should contain the jig itself too.
 *
 * These entries are cached in the state cache using the ref://<location> key.
 */

const { _sudo } = require('../util/admin')
const { _deepVisit } = require('../util/deep')

// ------------------------------------------------------------------------------------------------
// _refmap
// ------------------------------------------------------------------------------------------------

async function _refmap (location, kernel, timeout) {
  const key = `ref://${location}`
  const prev = await kernel._cache.get(key)
  if (prev) return prev

  const refs = await _generateRefmap(location, kernel, timeout)

  await kernel._cache.set(key, refs)

  return refs
}

// ------------------------------------------------------------------------------------------------
// _combinedRefmap
// ------------------------------------------------------------------------------------------------

async function _combinedRefmap (locations, kernel, timeout) {
  const refmaps = await Promise.all(locations.map(location => _refmap(location, kernel, timeout)))

  const combinedRefmap = {}

  // Always take the latest references for every jig
  for (const refmap of refmaps) {
    for (const origin of Object.keys(refmap)) {
      if (!(origin in combinedRefmap) || refmap[origin][1] > combinedRefmap[origin[1]]) {
        combinedRefmap[origin] = refmap[origin]
      }
    }
  }

  return combinedRefmap
}

// ------------------------------------------------------------------------------------------------
// _generateRefmap
// ------------------------------------------------------------------------------------------------

async function _generateRefmap (location, kernel, timeout) {
  // Load the jig before any changes. Ideally, with inner jigs only partially loaded.
  const Loader = require('./loader')
  const loader = new Loader(kernel, timeout)
  const prev = await loader._load(location)

  const refs = {}

  const Jig = require('./jig')
  const Code = require('./code')
  const Berry = require('./berry')

  // Map all inner origins to locations
  _deepVisit(prev, x => {
    if (x instanceof Jig || x instanceof Code) {
      _sudo(() => { refs[x.origin] = [x.location, x.nonce] })
    }

    if (x instanceof Berry) {
      _sudo(() => { refs[x.location] = [x.location, 0] })
    }
  })

  // Add ourselves too
  refs[prev.origin] = [prev.location, prev.nonce]

  return refs
}

// ------------------------------------------------------------------------------------------------

module.exports = { _refmap, _combinedRefmap }
