/**
 * loader.js
 *
 * Loads jigs for a given kernel
 */

const bsv = require('bsv')
const { Transaction } = bsv
const Log = require('./log')
const { _assert } = require('./misc')
const { _location } = require('./bindings')
const Record = require('./record')
const Repository = require('./repository')
const Codec = require('./codec')
const Sandbox = require('./sandbox')
const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Loader'

// ------------------------------------------------------------------------------------------------
// Bundle
// ------------------------------------------------------------------------------------------------

class Bundle {
  constructor (kernel, options) {
    this._kernel = kernel
    this._options = options

    this._location = null
    this._payload = null
    this._tx = null
    this._txid = null
    this._vout = null
    this._vdel = null
    this._hasVout = null
    this._hasVdel = null
    this._state = null

    this._partial = false
    this._jig = null

    this._refs = null
    this._S = null
    this._SGlobal = null
  }

  async _initialize (location) {
    // Make sure the location is valid
    const loc = _location(location)
    _assert(!loc.error && (loc.native || (loc.txid && !loc.record && !loc.vjig)), `Bad location: ${location}`)

    // Return native code directly
    if (loc.native) {
      const NativeCode = Repository._getNativeDep(loc.native)
      _assert(NativeCode, `Native code not found: ${location}`)
      return NativeCode
    }

    // Get the on-chain tx
    const rawtx = await this._kernel._blockchain.fetch(loc.txid)
    const tx = new Transaction(rawtx)

    // Extract the payload
    const payload = Record._payload(tx)

    // Check that our location is in range
    const { txid, vout, vdel } = loc
    const hasVout = 'vout' in loc && vout >= 1 && vout <= payload.out.length
    const hasVdel = 'vdel' in loc && vdel >= 0 && vdel < payload.del.length
    _assert(hasVout || hasVdel, `Jig does not exist: ${location}`)

    // Get the state cache
    const state = await this._kernel._cache.get(`jig://${location}`)

    this._location = location
    this._payload = payload
    this._tx = tx
    this._txid = txid
    this._vout = vout
    this._vdel = vdel
    this._hasVout = hasVout
    this._hasVdel = hasVdel
    this._state = state
  }
}

// ------------------------------------------------------------------------------------------------
// Loader
// ------------------------------------------------------------------------------------------------

class Loader {
  constructor (kernel) {
    this._kernel = kernel
  }

  async _load (location, options = {}) {
    Log._info(TAG, 'Load', location)

    const bundle = await this._partialLoad(location, options)

    return await this._completeLoad(bundle)
  }

  async _partialLoad (location, options = {}) {
    // A map for partially loaded bundles
    options._bundles = options._bundles || new Map() // Location -> Bundle

    if (options._bundles.has(location)) {
      return options._bundles.get(location)
    }

    Log._debug(TAG, 'Partial load', location)

    const bundle = new Bundle(this._kernel, options)
    await bundle._initialize(location)

    options._bundles.set(location, bundle)

    if (bundle._state) {
      await this._partialLoadFromState(bundle)
    } else {
      await this._loadViaReplay(bundle)
    }

    return bundle
  }

  async _partialLoadFromState (bundle) {
    const { _hasVout, _hasVdel, _payload, _txid, _vout, _vdel, _state, _options } = bundle

    Log._debug(TAG, 'Hydrating from cache')

    // Check that the state matches the transaction
    const stateString = JSON.stringify(_state)
    const stateBuffer = new bsv.deps.Buffer(stateString, 'utf8')
    const stateHash = bsv.crypto.Hash.sha256(stateBuffer)
    const stateHashHex = stateHash.toString('hex')
    if (_hasVout) _assert(stateHashHex === _payload.out[_vout - 1])
    if (_hasVdel) _assert(stateHashHex === _payload.del[_vdel])

    // Get the referenced jigs out of the state
    const refs = new Set()
    const codec = new Codec()._loadJigs(x => { refs.add(x); return x })
    const decodedState = codec._decode(_state)

    bundle._refs = refs
    bundle._partial = true

    if (decodedState.kind === 'code') {
      const env = {}

      // Preload the parent if there is one
      const parentRegex = /^\s*class\s+[a-zA-Z0-9_$]+\s+extends\s+([a-zA-Z0-9_$]+)\s*{.*$/
      const parentMatch = decodedState.src.match(parentRegex)
      if (parentMatch) {
        const parentName = parentMatch[1]
        const parentLocation = decodedState.props.deps[parentName]
        const parentFullLocation = parentLocation.startsWith('_') ? _txid + parentLocation : parentLocation

        if (!_options._bundles.has(parentFullLocation)) {
          await this._partialLoad(parentFullLocation, _options)
        }

        const Parent = _options._bundles.get(parentFullLocation)._jig
        env[parentName] = Parent
      }

      // Create the code without any properties
      const [S, SGlobal] = Sandbox._evaluate(decodedState.src, env)
      const C = Repository._install(S)

      bundle._S = S
      bundle._SGlobal = SGlobal
      bundle._jig = C
    }

    if (decodedState.kind === 'jig') {
      // TODO
      const jig = { $jig: 123 }
      bundle._jig = jig
    }

    if (decodedState.kind === 'berry') {
      // TODO
      const berry = { $berry: 123 }
      bundle._jig = berry
    }

    _assert(bundle._jig, 'Jig cannot be hydrated')
  }

  async _completeLoad (bundle) {
    const { _refs, _txid, _options, _state } = bundle

    if (bundle._partial) {
      // Partial load the remaining refs
      for (const ref of _refs) {
        const refFullLocation = ref.startsWith('_') ? _txid + ref : ref
        await this._partialLoad(refFullLocation, _options)
      }

      // Redecode the state with the partial refs
      const codec2 = new Codec()._loadJigs(x => {
        const refFullLocation = x.startsWith('_') ? _txid + x : x
        return _options._bundles.get(refFullLocation)._jig
      })
      const redecodedState = codec2._decode(_state)

      if (redecodedState.kind === 'code') {
        const C = bundle._jig

        // Apply the props to the code
        Membrane._sudo(() => {
          Object.assign(C, redecodedState.props)
          if (C.origin.startsWith('_')) C.origin = _txid + C.origin
          if (C.location.startsWith('_')) C.location = _txid + C.location
        })
      }

      if (redecodedState.kind === 'jig') {
        // TODO
      }

      if (redecodedState.kind === 'berry') {
        // TODO
      }

      bundle._partial = false

      // Wait for other refs to load
      const promises = Array.from(_options._bundles.values())
        .map(bundle => this._completeLoad(bundle))
      await Promise.all(promises)
    }

    return bundle._jig
  }

  async _loadViaReplay (bundle) {
    const { _tx, _payload, _options, _hasVout, _hasVdel, _vout, _vdel, _location } = bundle

    Log._debug(TAG, 'Replaying transaction')

    // Load the record
    const record = await Record._import(_tx, _payload, true /* published */, null /* jigToSync */, _options._importLimit)

    // Get the jig out of the record
    if (_hasVout && _vout >= 1 && _vout <= record._outputs.length) bundle._jig = record._outputs[_vout - 1]
    if (_hasVdel && _vdel >= 0 && _vdel <= record._deletes.length - 1) bundle._jig = record._deletes[_vdel]

    _assert(bundle._jig, `Jig not found: ${_location}`)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Loader
