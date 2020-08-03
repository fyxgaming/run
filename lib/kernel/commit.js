/**
 * Commit.js
 *
 * A record that has been "locked in" and will be converted into a transaction
 */

const bsv = require('bsv')
const { crypto } = bsv
const Membrane = require('./membrane')
const { _kernel, _assert, _sameJig, _hasJig, _addJigs, _subtractJigs } = require('../util/misc')
const { _location, _BINDINGS } = require('../util/bindings')
const Snapshot = require('../util/snapshot')
const Log = require('../util/log')
const Publisher = require('./publisher')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Commit'

const COMMITS = new Map() // Unpublished, ID -> Commit

// ------------------------------------------------------------------------------------------------
// Commit
// ------------------------------------------------------------------------------------------------

class Commit {
  constructor (record) {
    const { _ImportLimit } = require('./import')

    this._id = 'commit://' + crypto.Random.getRandomBuffer(32).toString('hex')
    COMMITS.set(this._id, this)

    Log._debug(TAG, 'Create', this._id)

    this._kernel = _kernel()
    this._importLimit = new _ImportLimit()

    // Calculate transaction sets
    this._inputs = _subtractJigs(_addJigs(record._updates, record._auths), record._creates)
    this._outputs = _subtractJigs(_addJigs(this._inputs, record._creates), record._deletes)
    this._refs = _subtractJigs(_subtractJigs(record._reads, this._inputs), this._outputs)

    // Calculate commands
    this._actions = record._actions

    // Check the commit
    _assert(this._actions.length)
    _assert(this._inputs.length || this._outputs.length)

    // Link upstream commits
    this._inputs.forEach(jig => this._link(jig))
    this._refs.forEach(jig => this._link(jig))

    // Assign temporary location to all jigs
    Membrane._sudo(() => {
      this._outputs.forEach((jig, index) => {
        const location = `${this._id}_j${index}`
        const deployed = !_location(jig.origin).undeployed

        jig.origin = deployed ? jig.origin : location
        jig.location = location
        jig.nonce = jig.nonce + 1
      })
    })

    // Save the before state of jigs
    this._before = new Map(record._snapshots)

    // Capture the output state of jigs
    this._after = new Map()
    this._outputs.forEach(jig => {
      const snapshot = new Snapshot(jig)
      this._after.set(jig, snapshot)
    })

    this._states = new Map() // Jig -> Object
    this._stateHashes = new Map() // Jig -> string
    this._payload = null

    this._tx = null
    this._txid = null

    this._upstream = [] // commits we depend on
    this._downstream = [] // commits that depend on us

    this._syncListeners = []

    // If no upstream, them publish
    this._publisher = new Publisher(this)

    // if (PUBLISH_INTERCEPT) return PUBLISH_INTERCEPT(this)

    if (!this._upstream.length) {
      this._publisher._publish().catch(e => this._rollback(e))
    }
  }

  _link (jig) {
    const location = Membrane._sudo(() => jig.location)
    const { commit: commitId } = _location(location)
    if (!commitId) return

    const commit = COMMITS.get(commitId)
    _assert(commit)

    if (!commit._downstream.includes(this)) commit._downstream.push(this)
    if (!this._upstream.includes(commit)) this._upstream.push(commit)
  }

  _rollback (e) {
    if (!COMMITS.has(this._id)) return

    this._downstream.forEach(r => r._rollback(e))

    const unhandled = e && this._syncListeners.length === 0

    Log._error(TAG, unhandled ? 'Unhandled' : '', e)
    Log._debug(TAG, `Rollback ${this._id}`)

    for (const [, snapshot] of this._before) {
      snapshot._rollback()
    }

    // If unhandled, all outputs and deleted have the error
    if (unhandled) {
      const errorLocation = `error://Unhandled ${e}`

      Membrane._sudo(() => {
        this._spends
          .filter(jig => !_hasJig(this._deletes, jig))
          .forEach(jig => { jig.locatin = errorLocation })
        this._deletes.forEach(jig => { jig.location = errorLocation })
      })
    }

    // Notify sync listeners of the failure if it is a failure
    if (e) {
      this._syncListeners.forEach(listener => listener.reject(e))
      this._syncListeners = []
    }

    COMMITS.delete(this._id)
  }

  _spentDownstream (jig) {
    for (const record of this._downstream) {
      for (const jig2 of record._spends) {
        if (_sameJig(jig, jig2)) return true
      }
    }
    return false
  }

  _upstreamPublished (commit) {
    this._upstream = this._upstream.filter(r => r !== commit)

    for (const [jig, prevss] of commit._after) {
      const ours = this._jigs.find(j => _sameJig(j, jig))
      if (!ours) continue

      const before = this._before.get(ours)
      if (!before) continue

      _BINDINGS.forEach(binding => { before._props[binding] = prevss._props[binding] })

      const Unbound = require('../util/unbound')

      const after = this._after.get(ours)
      if (after) {
        const props = after._props
        after._props.origin = prevss._props.origin
        if (props.owner instanceof Unbound && !props.owner._value) props.owner = prevss._props.owner
        if (props.satoshis instanceof Unbound && !props.satoshis._value) props.satoshis = prevss._props.satoshis
      }

      if (!this._spentDownstream(ours)) {
        Membrane._sudo(() => {
          if (ours.owner instanceof Unbound && !ours.owner._value) ours.owner = prevss._props.owner
          if (ours.satoshis instanceof Unbound && !ours.satoshis._value) ours.satoshis = prevss._props.satoshis
        })
      }
    }

    this._publish()
  }

  _onPublish () {
    COMMITS.delete(this._id)
  }

  async _sync () {
    Log._debug(TAG, 'Sync', this._id)

    // _assert(this._state !== STATE_EDITING)
    _assert(COMMITS.has(this._id))

    // If already published, nothing to sync
    // if (this._state === STATE_PUBLISHED) return

    return new Promise((resolve, reject) => {
      this._syncListeners.push({ resolve, reject })
    })
  }
}

// ------------------------------------------------------------------------------------------------
// _get
// ------------------------------------------------------------------------------------------------

Commit._get = id => {
  return COMMITS.get(id)
}

// ------------------------------------------------------------------------------------------------
// _sync
// ------------------------------------------------------------------------------------------------

Commit._syncAll = async () => {
  const promises = []
  for (const record of COMMITS.values()) {
    promises.push(record._sync())
  }
  return Promise.all(promises)
}

// ------------------------------------------------------------------------------------------------

module.exports = Commit
