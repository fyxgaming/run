/**
 * Commit.js
 *
 * A record that has been locked in and will be converted into a transaction
 */

const { _assert, _kernel, _sameJig, _addJigs, _subtractJigs } = require('../util/misc')
const { _sudo } = require('../util/admin')
const { _deepVisit } = require('../util/deep')
const { _BINDINGS, _compileLocation } = require('../util/bindings')
const Snapshot = require('../util/snapshot')
const Log = require('../util/log')
const _publish = require('./publish')
const { _PROTOCOL_VERSION } = require('../util/version')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Commit'

// All commits being published. This is tracked globally so we can look up commits.
const COMMITS_PUBLISHING = new Map() // ID -> Commit

// ------------------------------------------------------------------------------------------------
// Commit
// ------------------------------------------------------------------------------------------------

class Commit {
  /**
   * Creates a new commit from a record and starts publishing it
   */
  constructor (record) {
    // Generate a new random ID for this commit
    const recordId = record._id.split('record://')[1]
    this._id = `commit://${recordId}`
    if (Log._debugOn) Log._debug(TAG, 'Create', this._id)

    // Copy the protocol version
    try { this._app = _kernel()._app } catch (e) { this._app = '' }
    this._version = _PROTOCOL_VERSION

    // Store the record in case we need to make changes to it in a new commit
    this._record = record

    // Calculate transaction sets and copy actions
    const [inputs, outputs, refs] = Commit._calculateInputsOutputsRefs(record)
    this._inputs = inputs
    this._outputs = outputs
    this._refs = refs
    this._creates = [...record._creates]
    this._deletes = [...record._deletes]
    this._actions = [...record._actions]

    // Check commit is valid
    _assert(this._actions.length)
    _assert(this._inputs.length || this._outputs.length || this._deletes.length)

    this._upstream = record._deps.filter(commit => !commit._published) // commits we depend on
    this._downstream = [] // commits that depend on us

    // Hook up this commit to its deps
    this._upstream.forEach(commit => commit._downstream.push(this))

    // Save the bindings from the record in case we update the jigs again
    this._saveRecordBindings()

    // Assign temporary location to all jigs
    this._assignCommitLocations()

    // Create before and after snapshots
    this._before = new Map(record._snapshots)
    this._after = new Map()
    const outgoing = this._outputs.concat(this._deletes)
    outgoing.forEach(jig => {
      const snapshot = new Snapshot(jig)
      this._after.set(jig, snapshot)
    })
    this._refmap = record._commitRefmap

    // Transaction id when commit is replayed
    this._txid = null

    // Set of listeners when the commit has no more dependencies (ready),
    // and also when the tx is broadcast or fails to broadcast (publish).
    this._readyListeners = []
    this._publishListeners = []

    // State of publishing
    this._published = false

    // Save the kernel used to publish this commit
    this._kernel = _kernel()

    // Publish when ready
    if (this._record._autopublish) {
      this._setPublishing(true)
      this._onReady().then(() => _publish(this))
    }

    // Notify outputs and deletes
    if (!this._record._replaying) {
      this._outputs.forEach(jig => this._kernel._emit('update', jig))
      this._deletes.forEach(jig => this._kernel._emit('update', jig))
    }
  }

  // --------------------------------------------------------------------------

  _setPublishing (publishing) {
    if (publishing) {
      _assert(!this._published)
      _assert(!COMMITS_PUBLISHING.has(this._id))

      COMMITS_PUBLISHING.set(this._id, this)
    } else {
      COMMITS_PUBLISHING.delete(this._id)

      // We should have notified all publish listeners and downstream commits by now
      _assert(!this._publishListeners.length)
      _assert(!this._downstream.length)
    }
  }

  // --------------------------------------------------------------------------

  _publishing () {
    return COMMITS_PUBLISHING.has(this._id)
  }

  // --------------------------------------------------------------------------

  _onReady () {
    if (!this._upstream.length) return Promise.resolve()
    return new Promise((resolve, reject) => this._readyListeners.push({ resolve, reject }))
  }

  // --------------------------------------------------------------------------

  _onPublish () {
    _assert(this._publishing())
    return new Promise((resolve, reject) => this._publishListeners.push({ resolve, reject }))
  }

  // --------------------------------------------------------------------------

  _saveRecordBindings () {
    this._recordBindings = new Map()

    _sudo(() => {
      this._outputs.forEach((jig, index) => {
        const bindings = {}
        bindings.location = jig.location
        bindings.origin = jig.origin
        bindings.nonce = jig.nonce
        this._recordBindings.set(jig, bindings)
      })

      this._deletes.forEach((jig, index) => {
        const bindings = {}
        bindings.location = jig.location
        bindings.origin = jig.origin
        bindings.nonce = jig.nonce
        this._recordBindings.set(jig, bindings)
      })
    })
  }

  // --------------------------------------------------------------------------

  _restoreRecordBindings () {
    _sudo(() => {
      for (const [jig, bindings] of this._recordBindings.entries()) {
        Object.assign(jig, bindings)
      }
    })
  }

  // --------------------------------------------------------------------------

  /**
   * Assigns commit locations to jigs before they have tx locations
   */
  _assignCommitLocations () {
    _sudo(() => {
      this._outputs.forEach((jig, index) => {
        const location = `${this._id}_o${index + 1}`
        const deployed = jig.origin !== jig.location

        jig.origin = deployed ? jig.origin : location
        jig.location = location
        jig.nonce = jig.nonce + 1
      })

      this._deletes.forEach((jig, index) => {
        const location = `${this._id}_d${index}`
        const deployed = jig.origin !== jig.location

        jig.origin = deployed ? jig.origin : location
        jig.location = location
        jig.nonce = jig.nonce + 1
      })
    })
  }

  // --------------------------------------------------------------------------

  /**
   * Notification when an upstream commit is published to start publishing this one.
   */
  _onUpstreamPublished (commit) {
    const Unbound = require('../util/unbound')

    this._upstream = this._upstream.filter(c => c !== commit)

    for (const [jig, prevss] of commit._after) {
      const ours = this._inputs.find(j => _sameJig(j, jig)) ||
        this._refs.find(j => _sameJig(j, jig))
      if (!ours) continue

      // Update the before snapshots with new bindings
      const before = this._before.get(ours)
      if (before) _BINDINGS.forEach(binding => { before._props[binding] = prevss._props[binding] })

      // Update the after states with new bindings
      const after = this._after.get(ours)
      if (after) {
        const props = after._props
        after._props.origin = prevss._props.origin
        if (props.owner instanceof Unbound && !props.owner._value) props.owner = prevss._props.owner
        if (props.satoshis instanceof Unbound && !props.satoshis._value) props.satoshis = prevss._props.satoshis
      }

      // Update the record bindings
      const recordBindings = this._recordBindings.get(ours)
      if (recordBindings) { recordBindings.origin = prevss._props.origin }

      // Update our jig bindings if they were assigned
      if (!this._spentDownstream(ours)) {
        _sudo(() => {
          if (ours.owner instanceof Unbound && !ours.owner._value) ours.owner = prevss._props.owner
          if (ours.satoshis instanceof Unbound && !ours.satoshis._value) ours.satoshis = prevss._props.satoshis
        })
      }
    }

    if (!this._upstream.length) {
      this._readyListeners.forEach(s => s.resolve())
      this._readyListeners = []
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Returns whether the jig is an input in a downstream commit
   */
  _spentDownstream (jig) {
    for (const commit of this._downstream) {
      for (const jig2 of commit._inputs) {
        if (_sameJig(jig, jig2)) return true
      }
    }
    return false
  }

  // --------------------------------------------------------------------------

  async _buildRefmap (timeout) {
    if (this._refmap) return this._refmap

    // Get the jigs as they will be loaded by a future replay
    const Loader = require('./loader')
    const loader = new Loader(this._kernel, timeout)
    const incoming = this._inputs.concat(this._refs)
    const beforeLocations = incoming.map(jig => this._before.get(jig)._props.location)
    const beforeJigs = await Promise.all(beforeLocations.map(location => loader._load(location)))

    // Generate the refmap from those input jigs
    this._refmap = Commit._buildRefmapForIncoming(beforeJigs, timeout)
    return this._refmap
  }

  // --------------------------------------------------------------------------

  static async _buildRefmapForIncoming (incoming, timeout) {
    if (Log._debugOn) Log._debug(TAG, 'Build refmap')

    const Creation = require('./creation')
    const refmap = {}

    // Map all inner origins to locations
    _deepVisit(incoming, x => {
      if (x instanceof Creation) {
        _sudo(() => {
          if (!(x.origin in refmap) || refmap[x.origin][1] <= x.nonce) {
            refmap[x.origin] = [x.location, x.nonce]
          }
        })

        // Don't traverse deeply. Deep references are not part of a jig's state.
        // They should not contribute towards the refmap used to capture state nor
        // to the unification with other jigs.
        return incoming.includes(x)
      }
    })

    return refmap
  }

  // --------------------------------------------------------------------------

  /**
   * Called by the publisher on success
   */
  _onPublishSucceed () {
    // Mark published
    this._published = true

    // Notify listeners
    this._publishListeners.forEach(s => s.resolve())
    this._publishListeners = []

    // Notify downstream commits to start publishing
    this._downstream.forEach(commit => commit._onUpstreamPublished(this))
    this._downstream = []

    // Mark not publishing anymore
    this._setPublishing(false)

    // Emit publish events
    this._outputs
      .filter(jig => !this._spentDownstream(jig))
      .forEach(jig => this._kernel._emit('publish', jig))
    this._deletes
      .filter(jig => !this._spentDownstream(jig))
      .forEach(jig => this._kernel._emit('publish', jig))
  }

  // --------------------------------------------------------------------------

  /**
   * Called by the publisher on error
   */
  _onPublishFail (e) {
    _assert(e)

    // Mark not published
    this._published = false

    // Notify downstream commits, which will roll them back
    this._downstream.forEach(commit => commit._onPublishFail(e))

    const unhandled = e && this._publishListeners.length === 0

    if (Log._errorOn) Log._error(TAG, unhandled ? 'Unhandled' : '', e)

    // Rollback the jigs
    if (Log._debugOn) Log._debug(TAG, `Rollback ${this._id}`)
    for (const [, snapshot] of this._before) {
      snapshot._rollback(e)
    }

    // If unhandled, all outputs and deleted have the error
    if (unhandled) {
      const errorLocation = _compileLocation({ error: `Unhandled ${e}` })

      _sudo(() => {
        this._outputs.forEach(jig => { jig.location = errorLocation })
        this._deletes.forEach(jig => { jig.location = errorLocation })
      })
    }

    // Notify of the rollback
    if (!this._record._replaying) {
      this._outputs.forEach(jig => this._kernel._emit('update', jig))
      this._deletes.forEach(jig => this._kernel._emit('update', jig))
    }

    // Notify sync listeners of the failure if it is a failure
    if (e) {
      this._publishListeners.forEach(listener => listener.reject(e))
      this._publishListeners = []
    }

    // Mark not publishing anymore
    this._setPublishing(false)
  }
}

// ------------------------------------------------------------------------------------------------
// _get
// ------------------------------------------------------------------------------------------------

/**
 * Looks up a commit being published from its commit id
 */
Commit._findPublishing = id => {
  return COMMITS_PUBLISHING.get(id)
}

// ------------------------------------------------------------------------------------------------
// _sync
// ------------------------------------------------------------------------------------------------

/**
 * Waits for all current commits to finish publishing
 */
Commit._syncAll = async () => {
  const promises = []
  for (const commit of COMMITS_PUBLISHING.values()) {
    promises.push(commit._onPublish())
  }
  return Promise.all(promises)
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

/**
   * Calculates the inputs, outputs, and refs in deterministic order for the commit
   */
Commit._calculateInputsOutputsRefs = function (record) {
  const inputs = _subtractJigs(_addJigs(_addJigs(record._updates, record._auths), record._deletes), record._creates)
  const outputs = _subtractJigs(_addJigs(inputs, record._creates), record._deletes)
  const refs = _subtractJigs(_subtractJigs(_subtractJigs(record._reads, inputs), outputs), record._deletes)
  return [inputs, outputs, refs]
}

// ------------------------------------------------------------------------------------------------

module.exports = Commit
