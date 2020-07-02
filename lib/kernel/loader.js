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
  }

  async _initialize (location) {
    // Make sure the location is valid
    const loc = _location(location)
    _assert(!loc.error && (loc.native || (loc.txid && !loc.record && !loc.vjig)), `Bad location: ${location}`)

    // Return native code directly
    if (loc.native) {
      const NativeCode = Repository._getNative(loc.native)
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
    Log._debug(TAG, 'Partial load', location)

    // A map for partially loaded bundles
    options._bundles = options._bundles || new Map() // Location -> Bundle

    const bundle = new Bundle(this._kernel, options)
    await bundle._initialize(location)

    if (bundle._state) {
      await this._partialLoadFromState(bundle)
    } else {
      await this._loadViaReplay(bundle)
    }

    return bundle
  }

  async _partialLoadFromState (bundle) {
    const { _hasVout, _hasVdel, _payload, _location, _txid, _vout, _vdel, _state, _options } = bundle

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

      console.log(typeof SGlobal, typeof Membrane)

      bundle._jig = C
      bundle._partial = true
      _options._bundles.set(_location, bundle)
    }

    if (decodedState.kind === 'jig') {
      // TODO
      const jig = { $jig: 123 }
      bundle._jig = jig
      bundle._partial = true
      _options._partialLoads.set(_location, jig)
    }

    if (decodedState.kind === 'berry') {
      // TODO
      const berry = { $berry: 123 }
      bundle._jig = berry
      bundle._partial = true
      _options._partialLoads.set(_location, berry)
    }

    _assert(bundle._jig, 'Jig cannot be hydrated')
  }

  async _completeLoad (bundle) {
    if (bundle._partial) {
      // TODO
      bundle._partial = false
    }

    return bundle._jig

    /*
      const loadedRefs = new Map()

      for (const ref of Array.from(refs)) {
        let Ref = null
        const refFullLocation = ref.startsWith('_') ? _txid + ref : ref

        if (_options._partialLoads.has(refFullLocation)) {
          console.log('PARTTTT')
          Ref = _options._partialLoads.get(refFullLocation)
        } else {
          const options2 = Object.assign({}, _options)
          options2._preloadCallback = PreloadedRef => {
            console.log('PRELOAD FINISHED', PreloadedRef)
            Ref = PreloadedRef
          }
          await this._load(refFullLocation, options2)
        }

        loadedRefs.set(ref, Ref)
      }

      console.log('LAODED', loadedRefs)

      // Redecode the state but this time with the refs
      const codec2 = new Codec()._loadJigs(x => loadedRefs.get(x))
      const redecodedState = codec2._decode(_state)
      console.log('REDECODED', redecodedState)

      // Apply the props to the code
      Membrane._sudo(() => {
        Object.assign(C, redecodedState.props)
        if (C.origin.startsWith('_')) C.origin = _txid + C.origin
        if (C.location.startsWith('_')) C.location = _txid + C.location
      })

      console.log('DONE', C)
      */
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
