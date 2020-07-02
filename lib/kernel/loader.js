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
// Loader
// ------------------------------------------------------------------------------------------------

class Loader {
  constructor (kernel) {
    this._kernel = kernel
  }

  async _load (location, options = {}) {
    Log._info(TAG, 'Load', location)

    // Setup default options used in state hydration
    options._partialLoads = options._partialLoads || new Map() // Location -> Jig
    options._preloadCallback = options._preloadCallback || (() => {})

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

    if (state) {
      Log._debug(TAG, 'Hydrating from cache')

      console.log('STATE', state)

      // Check that the state matches the transaction
      const stateString = JSON.stringify(state)
      const stateBuffer = new bsv.deps.Buffer(stateString, 'utf8')
      const stateHash = bsv.crypto.Hash.sha256(stateBuffer)
      const stateHashHex = stateHash.toString('hex')
      if (hasVout) _assert(stateHashHex === payload.out[vout - 1])
      if (hasVdel) _assert(stateHashHex === payload.del[vdel])

      // Get the referenced jigs out of the state
      const refs = new Set()
      const codec = new Codec()._loadJigs(x => { refs.add(x); return x })
      const decodedState = codec._decode(state)

      console.log('REFS', refs)

      if (decodedState.kind === 'code') {
        const env = {}

        // Preload the parent if there is one
        const parentRegex = /^\s*class\s+[a-zA-Z0-9_$]+\s+extends\s+([a-zA-Z0-9_$]+)\s*{.*$/
        const parentMatch = decodedState.src.match(parentRegex)
        let Parent = null
        if (parentMatch) {
          const parentName = parentMatch[1]
          const parentLocation = decodedState.props.deps[parentName]
          const parentFullLocation = parentLocation.startsWith('_') ? txid + parentLocation : parentLocation
          console.log('PARENT', parentFullLocation)

          if (options._partialLoads.has(parentFullLocation)) {
            Parent = options._partialLoads.get(parentFullLocation)
          } else {
            const options2 = Object.assign({}, options)
            options2._preloadCallback = PreloadedParent => {
              console.log('PRELOAD FINISHED', PreloadedParent)
              Parent = PreloadedParent
            }
            await this._load(parentFullLocation, options2)
          }

          env[parentName] = Parent
        }

        console.log('PARENT', Parent)
        console.log('DECODED', decodedState)

        const [S, SGlobal] = Sandbox._evaluate(decodedState.src, env)

        const C = Repository._install(S)

        console.log('---', C, SGlobal.length)

        options._partialLoads.set(location, C)
        options._preloadCallback(C)

        // bundle = preload()
        // load ({ preload: true })
        // preload all dependencies too
        // postload (preloads)

        const loadedRefs = new Map()

        for (const ref of Array.from(refs)) {
          let Ref = null
          const refFullLocation = ref.startsWith('_') ? txid + ref : ref

          if (options._partialLoads.has(refFullLocation)) {
            console.log('PARTTTT')
            Ref = options._partialLoads.get(refFullLocation)
          } else {
            const options2 = Object.assign({}, options)
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
        const redecodedState = codec2._decode(state)
        console.log('REDECODED', redecodedState)

        // Apply the props to the code
        Membrane._sudo(() => {
          Object.assign(C, redecodedState.props)
          if (C.origin.startsWith('_')) C.origin = txid + C.origin
          if (C.location.startsWith('_')) C.location = txid + C.location
        })

        console.log('DONE', C)

        // TODO: This preload isn't going to work, because it waits until load finishes

        return C
      }

      if (decodedState.kind === 'jig') {
        const jig = { $jig: 123 }

        options._partialLoads.set(location, jig)
        options._preloadCallback(jig)

        // TODO

        return jig
      }

      if (decodedState.kind === 'berry') {
        const berry = { $berry: 123 }

        options._partialLoads.set(location, berry)
        options._preloadCallback(berry)

        // TODO

        return berry
      }

      _assert(false, 'Jig cannot be hydrated')
    } else {
      Log._debug(TAG, 'Replaying transaction')

      // Load the record
      const record = await Record._import(tx, payload, true /* published */, null /* jigToSync */, options._importLimit)

      // Get the jig out of the record
      let ret = null
      if ('vout' in loc && vout >= 1 && vout <= record._outputs.length) ret = record._outputs[loc.vout - 1]
      if ('vdel' in loc && vdel >= 0 && vdel <= record._deletes.length - 1) ret = record._deletes[loc.vdel]

      _assert(ret, `Jig not found: ${location}`)

      options._preloadCallback(ret)

      return ret
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Loader
