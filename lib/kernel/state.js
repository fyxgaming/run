/**
 * state.js
 *
 * Captures and recreates jig and berry state for the cache
 */

// ------------------------------------------------------------------------------------------------
// _recreate
// ------------------------------------------------------------------------------------------------

/**
 * Recreates a jig or berry from the cache, or returns undefined if it doesn't exist.
 */
async function _recreate (key, hash = undefined) {
  Log._debug(TAG, 'Recreating', key)

  // Get the state from the cache if it exists
  const state = await this._kernel._cache.get(key)
  if (!state) return

  // Check that the version is supported by this loader
  const { _PROTOCOL_VERSION } = require('./commit')
  const version = Buffer.from(_PROTOCOL_VERSION).toString('hex')
  _checkState(state.version === version, `Unsupported state version: ${state.version}`)

  // Extract the txid from the key
  const txid = key.split('//')[1].split('_')[0]

  // Check that the hash matches
  if (hash) {
    const stateString = JSON.stringify(state)
    const stateBuffer = new bsv.deps.Buffer(stateString, 'utf8')
    const stateHash = bsv.crypto.Hash.sha256(stateBuffer)
    const stateHashHex = stateHash.toString('hex')
    _checkState(stateHashHex === hash, `State hash mismatch for ${key}`)
  }

  // Get the referenced jigs out of the state by decoding with dummy jigs
  // Dummy jigs are classes so that setPrototypeOf works for arbitrary objects
  const refs = new Map()
  const makeDummyJig = x => { class A {}; A.location = x; return A }
  const codec = new Codec()._loadJigs(x => { refs.set(x, null); return makeDummyJig(x) })
  const decodedState = codec._decode(state)

  switch (decodedState.kind) {
    case 'code': return _recreateCode(decodedState, refs, txid, state)
    case 'jig': return _recreateJig(decodedState, txid)
    case 'berry': return _recreateBerry(decodedState, txid)
    default: throw new StateError(`Unknown jig kind: ${decodedState.kind}`)
  }
}

// ------------------------------------------------------------------------------------------------

async function _recreateCode (decodedState, refs, txid, state) {
  const env = {}

  // Preload the parent if there is one
  const parentName = _parentName(decodedState.src)
  if (parentName) {
    const parentLocation = decodedState.props.deps[parentName].location
    const parentFullLocation = parentLocation.startsWith('_') ? txid + parentLocation : parentLocation
    const Parent = await this._load(parentFullLocation)
    env[parentName] = Parent
  }

  // Create the code without any properties
  const [S, SGlobal] = Sandbox._evaluate(decodedState.src, env)
  const file = new File(S, false /* local */)

  // Finishing loading the jig in parallel in a completer
  const complete = async () => {
    // Load the remaining refs
    for (const ref of refs.keys()) {
      const refFullLocation = ref.startsWith('_') ? txid + ref : ref
      const jig = await this._load(refFullLocation)
      refs.set(ref, jig)
    }

    // Redecode the state with the partially loaded refs
    const codec2 = new Codec()._loadJigs(x => {
      const refFullLocation = x.startsWith('_') ? txid + x : x
      const jig = refs.get(x)
      _checkState(jig, `Jig not loaded: ${refFullLocation}`)
      return jig
    })
    const redecodedState = codec2._decode(state)

    // Update the code with the new dependencies
    Object.assign(SGlobal, redecodedState.props.deps)

    const C = file._jig

    // Apply the props to the code
    Membrane._sudo(() => {
      Object.assign(C, redecodedState.props)
      if (C.origin.startsWith('_')) C.origin = txid + C.origin
      if (C.location.startsWith('_')) C.location = txid + C.location
    })
  }

  const promise = complete()
  this._completers.push(promise)

  return file._jig
}

// ------------------------------------------------------------------------------------------------

async function _recreateJig (decodedState, txid) {
// TODO
  return { $jig: 123 }
}

// ------------------------------------------------------------------------------------------------

async function _recreateBerry (decodedState, txid) {
// TODO
  return { $berry: 123 }
}

// ------------------------------------------------------------------------------------------------

module.exports = { _recreate }
