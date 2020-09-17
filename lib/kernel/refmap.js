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
const { _assert, _text, _sameJig } = require('../util/misc')
const Jig = require('./jig')
const Berry = require('./berry')
const Code = require('./code')

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

  // Load the previous state's references to use when we don't spend
  const incomingRefmap = await commit._getRefmap(timeout)
  timeout._check()

  const refmap = {}
  _sudo(() => console.log(jig))

  const after = commit._after.get(jig)
  _assert(after)

  _deepVisit(jig, x => {
    _sudo(() => console.log(', -', x))
    if (x instanceof Jig || x instanceof Code) {
      const xjig = commit._record._jigs.find(y => _sameJig(x, y))
      const xafter = commit._after.get(xjig)
      if (xafter) {
        refmap[xafter._props.origin] = [xafter._props.location, xafter._props.nonce]
        return
      }

      const ref = commit._refs.find(y => _sameJig(x, y))
      if (ref) {
        const before = commit._before.get(ref)
        refmap[before._props.origin] = [before._props.location, before._props.nonce]
        return
      }

      const origin = _sudo(() => x.origin)
      const incomingRef = incomingRefmap[origin]
      console.log('-------------')
      _sudo(() => console.log(x, incomingRef))
      console.log('-------------')
      _assert(incomingRef)
      refmap[origin] = incomingRef
    }

    if (x instanceof Berry) {
      _sudo(() => { refmap[x.location] = [x.location, 0] })
    }
  })

  refmap[after._props.origin] = [after._props.location, after._props.nonce]
  console.log(after._props)

  const key = `refmap://${after._props.location}`
  await commit._kernel._cache.set(key, refmap)
}

// ------------------------------------------------------------------------------------------------

module.exports = { _refmap, _combinedRefmap, _captureAndCacheRefmap }
