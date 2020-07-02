/**
 * kernel.js
 *
 * Run central kernel, that loads resources and creates transactions
 */

const bsv = require('bsv')
const { Transaction } = bsv
const Record = require('./record')
const { _bsvNetwork, _assert } = require('./misc')
const Log = require('./log')
const { _location } = require('./bindings')
const Codec = require('./codec')
const Sandbox = require('./sandbox')
const Repository = require('./repository')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Kernel'

// ------------------------------------------------------------------------------------------------
// Kernel
// ------------------------------------------------------------------------------------------------

class Kernel {
  constructor () {
    this._blockchain = null
    this._purse = null
    this._cache = null
    this._app = null
    this._owner = null
    this._sandbox = true
    this._listeners = []
    this._importLimit = Infinity
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
    const rawtx = await this._blockchain.fetch(loc.txid)
    const tx = new Transaction(rawtx)

    // Extract the payload
    const payload = Record._payload(tx)

    // Check that our location is in range
    const { txid, vout, vdel } = loc
    const hasVout = 'vout' in loc && vout >= 1 && vout <= payload.out.length
    const hasVdel = 'vdel' in loc && vdel >= 0 && vdel < payload.del.length
    _assert(hasVout || hasVdel, `Jig does not exist: ${location}`)

    // Get the state cache
    const state = await this._cache.get(`jig://${location}`)

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

      let jig = null

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

        // Assign properties and deps

        console.log('---', C, SGlobal.length)

        jig = class A {}
      }

      if (decodedState.kind === 'jig') {
        jig = { $jig: 123 }

        // TODO
      }

      if (decodedState.kind === 'berry') {
        jig = { $berry: 123 }

        // TODO
      }

      _assert(jig, 'Jig cannot be hydrated')

      // Get direct dependency (parent class)
      // Preload the parent class

      // Load cache ..., part of load, partial loads
      // Preload callback
      // Dependency setting

      // Preload any direct dependencies
      // Preload the jig's container

      // Only use partial loads for state reconstruction

      //

      // Decode the state
      // Adjust origin and location to be full strings
      // Create the object (jig or code), then apply props

      console.log('REFS', refs)

      options._preloadCallback(jig)

      return jig

      // Load the referenced jigs, preventing infinite loops
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

  /**
   * Activates this kernel instance so its owner, blockchain, transaction queue and more are used.
   *
   * TODO: Activating also changes code presets
   */
  _activate () {
    // if (Kernel._instance === this) return
    // if (Kernel._instance) Kernel._instance._deactivate()
    Kernel._instance = this
    bsv.Networks.defaultNetwork = bsv.Networks[_bsvNetwork(this._blockchain.network)]
    // Code._activate(this._blockchain.network)
  }

  /**
   * Deactivates the current run instance, cleaning up anything in the process
   */
  _deactivate () {
    if (!Kernel._instance) return
    Kernel._instance = null
  }

  _on (event, listener) {
    this._listeners.push({ event, listener })
  }

  _emit (event, data) {
    if (event === 'jig') Repository._notify(data)

    this._listeners
      .filter(x => x.event === event)
      .forEach(x => x.listener(event, data))
  }
}

// ------------------------------------------------------------------------------------------------

// No kernel instance is active by default
Kernel._instance = null

// ------------------------------------------------------------------------------------------------

module.exports = Kernel
