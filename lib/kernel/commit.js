/**
 * Commit.js
 *
 * A record that has been locked in and will be converted into a transaction
 */

const bsv = require('bsv')
const { crypto } = bsv
const { _assert, _kernel, _sameCreation } = require('../util/misc')
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
    this._id = crypto.Random.getRandomBuffer(32).toString('hex')
    if (Log._debugOn) Log._debug(TAG, 'Create', this._id)

    // Save the kernel used to publish this commit
    this._kernel = _kernel()

    // Lock in the app and protocol version for this commit
    this._app = this._kernel._app
    this._version = _PROTOCOL_VERSION

    // Store the record that has all of the changes in this commit
    _assert(record._actions.length)
    _assert(record._inputs.length || record._outputs.length || record._deletes.length)
    this._record = record

    this._upstream = record._upstream.filter(commit => !commit._published) // commits we depend on
    this._downstream = [] // commits that depend on us

    // Hook up this commit to its deps
    this._upstream.forEach(commit => commit._downstream.push(this))

    // Save the bindings from the record in case we update the creations again
    this._saveRecordBindings()

    // Assign temporary location to all creations
    this._assignCommitLocations()

    // Copy before snapshots
    this._before = new Map(record._before)

    // Create after snapshots
    this._after = new Map()
    const outgoing = record._outputs.concat(record._deletes)
    outgoing.forEach(creation => {
      const snapshot = new Snapshot(creation)
      this._after.set(creation, snapshot)
    })

    // No refmap to start
    this._refmap = null

    // Transaction id when commit is replayed
    this._txid = null

    // Set of listeners when the commit has no more dependencies (ready),
    // and also when the tx is broadcast or fails to broadcast (publish).
    this._readyListeners = []
    this._publishListeners = []

    // State of publishing
    this._published = false

    // Publish when ready
    if (this._record._autopublish) {
      this._setPublishing(true)
      this._onReady().then(() => _publish(this))
    }

    // Notify outputs and deletes
    if (!this._record._replaying) {
      this._record._outputs.forEach(creation => this._kernel._emit('update', creation))
      this._record._deletes.forEach(creation => this._kernel._emit('update', creation))
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

  async _onReady () {
    if (!this._upstream.length) return
    await new Promise((resolve, reject) => this._readyListeners.push({ resolve, reject }))
  }

  // --------------------------------------------------------------------------

  async _onPublish () {
    _assert(this._publishing())
    await new Promise((resolve, reject) => this._publishListeners.push({ resolve, reject }))
  }

  // --------------------------------------------------------------------------

  _saveRecordBindings () {
    this._recordBindings = new Map()

    _sudo(() => {
      this._record._outputs.forEach((creation, index) => {
        const bindings = {}
        bindings.location = creation.location
        bindings.origin = creation.origin
        bindings.nonce = creation.nonce
        this._recordBindings.set(creation, bindings)
      })

      this._record._deletes.forEach((creation, index) => {
        const bindings = {}
        bindings.location = creation.location
        bindings.origin = creation.origin
        bindings.nonce = creation.nonce
        this._recordBindings.set(creation, bindings)
      })
    })
  }

  // --------------------------------------------------------------------------

  _restoreRecordBindings () {
    _sudo(() => {
      for (const [creation, bindings] of this._recordBindings.entries()) {
        Object.assign(creation, bindings)
      }
    })
  }

  // --------------------------------------------------------------------------

  /**
   * Assigns commit locations to creations before they have tx locations
   */
  _assignCommitLocations () {
    _sudo(() => {
      this._record._outputs.forEach((creation, index) => {
        const location = _compileLocation({ commit: this._id, vout: index + 1 })
        const deployed = creation.origin !== creation.location

        creation.origin = deployed ? creation.origin : location
        creation.location = location
        creation.nonce = creation.nonce + 1
      })

      this._record._deletes.forEach((creation, index) => {
        const location = _compileLocation({ commit: this._id, vdel: index })
        const deployed = creation.origin !== creation.location

        creation.origin = deployed ? creation.origin : location
        creation.location = location
        creation.nonce = creation.nonce + 1
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

    for (const [creation, prevss] of commit._after) {
      const ours = this._record._inputs.find(j => _sameCreation(j, creation)) ||
        this._record._refs.find(j => _sameCreation(j, creation))
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

      // Update our creation bindings if they were assigned
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
   * Returns whether the creation is an input in a downstream commit
   */
  _spentDownstream (creation) {
    for (const commit of this._downstream) {
      for (const creation2 of commit._record._inputs) {
        if (_sameCreation(creation, creation2)) return true
      }
    }
    return false
  }

  // --------------------------------------------------------------------------

  async _buildRefmap (timeout) {
    if (this._refmap) return this._refmap

    // Get the creations as they will be loaded by a future replay
    const Loader = require('./loader')
    const loader = new Loader(this._kernel, timeout)
    const record = this._record
    const incoming = record._inputs.concat(record._refs)
    const beforeLocations = incoming.map(creation => record._before.get(creation)._props.location)
    const beforeCreations = await Promise.all(beforeLocations.map(location => loader._load(location)))

    // Generate the refmap from those input creations
    this._refmap = Commit._buildRefmapForIncoming(beforeCreations, timeout)
    return this._refmap
  }

  // --------------------------------------------------------------------------

  static async _buildRefmapForIncoming (incoming, timeout) {
    if (Log._debugOn) Log._debug(TAG, 'Build refmap')

    const Creation = require('./creation')
    const refmap = {}

    // Map all inner origins to locations
    _sudo(() => _deepVisit(incoming, x => {
      if (x instanceof Creation) {
        _sudo(() => {
          if (!(x.origin in refmap) || refmap[x.origin][1] <= x.nonce) {
            refmap[x.origin] = [x.location, x.nonce]
          }
        })

        // Don't traverse deeply. Deep references are not part of a creation's state.
        // They should not contribute towards the refmap used to capture state nor
        // to the unification with other creations.
        return incoming.includes(x)
      }
    }))

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
    this._record._outputs
      .filter(creation => !this._spentDownstream(creation))
      .forEach(creation => this._kernel._emit('publish', creation))
    this._record._deletes
      .filter(creation => !this._spentDownstream(creation))
      .forEach(creation => this._kernel._emit('publish', creation))
  }

  // --------------------------------------------------------------------------

  /**
   * Called by the publisher on error
   */
  _onPublishFail (e) {
    _assert(e)

    const record = this._record

    // Mark not published
    this._published = false

    // Notify downstream commits, which will roll them back
    this._downstream.forEach(commit => commit._onPublishFail(e))

    const unhandled = e && this._publishListeners.length === 0

    if (Log._errorOn) Log._error(TAG, unhandled ? 'Unhandled' : '', e)

    // Rollback the creations
    if (Log._debugOn) Log._debug(TAG, `Rollback ${this._id}`)
    for (const [, snapshot] of this._before) {
      snapshot._rollback(e)
    }

    // If unhandled, all outputs and deleted have the error
    if (unhandled) {
      const errorLocation = _compileLocation({ error: `Unhandled ${e}` })

      _sudo(() => {
        record._outputs.forEach(creation => { creation.location = errorLocation })
        record._deletes.forEach(creation => { creation.location = errorLocation })
      })
    }

    // Notify of the rollback
    if (!record._replaying) {
      record._outputs.forEach(creation => this._kernel._emit('update', creation))
      record._deletes.forEach(creation => this._kernel._emit('update', creation))
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

module.exports = Commit
