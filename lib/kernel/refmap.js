/**
 * refmap.js
 *
 * Create and load reference maps
 *
 * A reference map is a optimization data structure for producing transactions faster. Like the
 * state, it is tied to a particular location. It stores list of a jigs referenced by that jig
 * and any inner jigs (unlike the state) in a form that may be combined with other reference maps
 * from other jigs to quickly determine the set of all jigs referenced by a group. This is used
 * to quickly calculate all incoming references into a transaction to quickly save state.
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
 * These entries are cached in the state cache using the refmap://<location> key.
 */

const { _sudo } = require('../util/admin')
const { _deepVisit } = require('../util/deep')
const Log = require('../util/log')
const { _assert, _text } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Refmap'

// ------------------------------------------------------------------------------------------------
// _refmap
// ------------------------------------------------------------------------------------------------

async function _refmap (location, kernel, timeout) {
  const key = `refmap://${location}`
  const prev = await kernel._cache.get(key)
  if (prev) return prev

  const refs = await _loadRefmap(location, kernel, timeout)

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
// _loadRefmap
// ------------------------------------------------------------------------------------------------

async function _loadRefmap (location, kernel, timeout) {
  // Load the jig before any changes. Ideally, with inner jigs only partially loaded.
  const Loader = require('./loader')
  const loader = new Loader(kernel, timeout)
  const jig = await loader._load(location)

  return _createRefmap(jig)
}

// ------------------------------------------------------------------------------------------------
// _createRefmap
// ------------------------------------------------------------------------------------------------

function _createRefmap (jig) {
  const refmap = {}

  const Jig = require('./jig')
  const Code = require('./code')
  const Berry = require('./berry')

  // Map all inner origins to locations
  _deepVisit(jig, x => {
    if (x instanceof Jig || x instanceof Code) {
      _sudo(() => { refmap[x.origin] = [x.location, x.nonce] })
    }

    if (x instanceof Berry) {
      _sudo(() => { refmap[x.location] = [x.location, 0] })
    }
  })

  // Add ourselves too
  refmap[jig.origin] = [jig.location, jig.nonce]

  return refmap
}

// ------------------------------------------------------------------------------------------------
// _captureAndCacheRefmap
// ------------------------------------------------------------------------------------------------

async function _captureAndCacheRefmap (jig, commit, txid, timeout) {
  if (Log._debugOn) Log._debug(TAG, 'Capture', _text(jig))

  const after = commit._after.get(jig)
  _assert(after)

  // Load the previous state's references to use when we don't spend
  const incomingRefmap = await commit._getRefmap(timeout)
  timeout._check()

  return incomingRefmap

  // Get reference info
  /*
  function getRefInfo () {
    const vout = commit._outputs.findIndex(y => _sameJig(x, y))
    if (vout >= 0) return `_o${vout + 1}`

    const vdel = commit._deletes.findIndex(y => _sameJig(x, y))
    if (vdel >= 0) return `_d${vdel}`

    const ref = commit._refs.find(y => _sameJig(x, y))
    if (ref) return commit._before.get(ref)._props.location

    const origin = _sudo(() => x.origin)
    if (origin.startsWith('native://')) return origin

    const incomingRefLocation = incomingRefmap[origin] && incomingRefmap[origin][0]
    _assert(incomingRefLocation)
    return incomingRefLocation
  }

  _deepVisit(jig, x => {
    if (x instanceof Jig || x instanceof Code) {
      _sudo(() => { refs[x.origin] = [x.location, x.nonce] })
    }

    if (x instanceof Berry) {
      _sudo(() => { refs[x.location] = [x.location, 0] })
    }
  })
  */

  // Cache
}

// ------------------------------------------------------------------------------------------------

module.exports = { _refmap, _combinedRefmap, _captureAndCacheRefmap }
