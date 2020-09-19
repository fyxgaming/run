/**
 * Commit.js
 *
 * A record that has been locked in and will be converted into a transaction
 */

const { _assert, _kernel, _sameJig, _addJigs, _subtractJigs } = require('../util/misc')
const { _sudo } = require('../util/admin')
const { _deepVisit } = require('../util/deep')
const { _BINDINGS, _UNDEPLOYED } = require('../util/bindings')
const Snapshot = require('../util/snapshot')
const Log = require('../util/log')
const _publish = require('./publish')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Commit'

const ACTIVE_COMMITS = new Map() // Unpublished, ID -> Commit

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

    // Store the record in case we need to make changes to it in a new commit
    this._record = record

    // Calculate transaction sets and copy actions
    this._inputs = _subtractJigs(_addJigs(_addJigs(record._updates, record._auths), record._deletes), record._creates)
    this._outputs = _subtractJigs(_addJigs(this._inputs, record._creates), record._deletes)
    this._refs = _subtractJigs(_subtractJigs(_subtractJigs(record._reads, this._inputs), this._outputs), record._deletes)
    this._creates = [...record._creates]
    this._deletes = [...record._deletes]
    this._actions = [...record._actions]

    // Check commit is valid
    _assert(this._actions.length)
    _assert(this._inputs.length || this._outputs.length || this._deletes.length)

    this._upstream = record._deps.filter(commit => !commit._done) // commits we depend on
    this._downstream = [] // commits that depend on us

    // Hook up this commit to its deps
    this._upstream.forEach(commit => commit._downstream.push(this))

    // Save the bindings from the record in case we update the jigs again
    this._saveRecordBindings()

    // Assign temporary location to all jigs
    this._assignCommitLocations()

    // Create before and after states
    this._before = new Map(record._snapshots)
    this._after = new Map()
    const outgoing = this._outputs.concat(this._deletes)
    outgoing.forEach(jig => {
      const snapshot = new Snapshot(jig)
      this._after.set(jig, snapshot)
    })
    this._refmap = record._commitRefmap

    // Create a set of listeners when the commit is published
    this._syncListeners = []
    this._done = false
    this._error = null
    this._publishing = false

    // Save the kernel used to publish this commit
    this._kernel = _kernel()

    // Add this commit to the sync set
    ACTIVE_COMMITS.set(this._id, this)

    // Publish if necessary
    if (!this._upstream.length && this._record._autopublish) _publish(this)

    // Notify outputs and deletes
    if (!this._record._importing) {
      this._outputs.forEach(jig => this._kernel._emit('update', jig))
      this._deletes.forEach(jig => this._kernel._emit('update', jig))
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Waits for upstream dependencise to finish publishing and then this to publish
   */
  async _sync () {
    if (Log._debugOn) Log._debug(TAG, 'Sync', this._id)

    // If we're not going to publish, then there's nothing to sync
    if (!this._publishing && !this._record._autopublish && !this._upstream.length) return

    _assert(ACTIVE_COMMITS.has(this._id))

    // If already done, return directly
    if (this._done && !this._error) return
    if (this._done && this._error) throw this._error

    // Otherwise, listen for publish
    return new Promise((resolve, reject) => {
      this._syncListeners.push({ resolve, reject })
    })
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

      // Update the before states with new bindings
      const before = this._before.get(ours)
      if (!before) continue

      _BINDINGS.forEach(binding => { before._props[binding] = prevss._props[binding] })

      // Update the after states with new bindings
      const after = this._after.get(ours)
      if (after) {
        const props = after._props
        after._props.origin = prevss._props.origin
        if (props.owner instanceof Unbound && !props.owner._value) props.owner = prevss._props.owner
        if (props.satoshis instanceof Unbound && !props.satoshis._value) props.satoshis = prevss._props.satoshis
      }

      // Update the record bindings
      const rb = this._recordBindings.get(ours)
      if (rb) { rb.origin = prevss._props.origin }

      // Update our jig bindings if they were assigned
      if (!this._spentDownstream(ours)) {
        _sudo(() => {
          if (ours.owner instanceof Unbound && !ours.owner._value) ours.owner = prevss._props.owner
          if (ours.satoshis instanceof Unbound && !ours.satoshis._value) ours.satoshis = prevss._props.satoshis
        })
      }
    }

    if (!this._upstream.length) {
      // Start publishing if there are no more upstream dependencies
      if (this._record._autopublish) {
        _publish(this)
      } else {
        // If not auto-publishing (ie. a transaction), we are done
        this._syncListeners.forEach(s => s.resolve())
        this._syncListeners = []
      }
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

  static async _buildRefmap (incoming, timeout) {
    if (Log._debugOn) Log._debug(TAG, 'Build refmap')

    const Jig = require('./jig')
    const Code = require('./code')
    const Berry = require('./berry')

    const refmap = {}

    // Map all inner origins to locations
    _deepVisit(incoming, x => {
      if (x instanceof Jig || x instanceof Code) {
        _sudo(() => {
          if (!(x.origin in refmap) || refmap[x.origin][1] <= x.nonce) {
            refmap[x.origin] = [x.location, x.nonce]
          }
        })
      }

      if (x instanceof Berry) {
        _sudo(() => { refmap[x.location] = [x.location, 0] })
      }
    })

    return refmap
  }

  // --------------------------------------------------------------------------

  async _buildRefmap (timeout) {
    if (this._refmap) return this._refmap

    // Get the jigs as they will be loaded by a future import
    const Loader = require('./loader')
    const loader = new Loader(this._kernel, timeout)
    const incoming = this._inputs.concat(this._refs)
    const beforeLocations = incoming.map(jig => this._before.get(jig)._props.location)
    const beforeJigs = await Promise.all(beforeLocations.map(location => loader._load(location)))

    // Generate the refmap from those input jigs
    this._refmap = Commit._buildRefmap(beforeJigs, timeout)
    return this._refmap
  }

  // --------------------------------------------------------------------------

  /**
   * Deactivates this commit from being published and restores the record state of jigs
   */
  _deactivate () {
    _assert(ACTIVE_COMMITS.delete(this._id))

    // Mark done without error
    this._done = true

    // There should be no listeners or downstream commits
    _assert(!this._syncListeners.length)
    _assert(!this._downstream.length)
  }

  // --------------------------------------------------------------------------

  /**
   * Called by the publisher on success
   */
  _onPublishSucceed () {
    _assert(ACTIVE_COMMITS.delete(this._id))

    // Mark done without error
    this._done = true

    // Notify listeners
    this._syncListeners.forEach(s => s.resolve())
    this._syncListeners = []

    // Notify downstream commits to start publishing
    this._downstream.forEach(commit => commit._onUpstreamPublished(this))
  }

  // --------------------------------------------------------------------------

  /**
   * Called by the publisher on error
   */
  _onPublishFail (e) {
    _assert(ACTIVE_COMMITS.delete(this._id))

    // Mark done with an error
    _assert(e)
    this._done = true
    this._error = e

    // Notify downstream commits, which will roll them back
    this._downstream.forEach(commit => commit._onPublishFail(e))

    const unhandled = e && this._syncListeners.length === 0

    if (Log._errorOn) Log._error(TAG, unhandled ? 'Unhandled' : '', e)

    // Rollback the jigs
    if (Log._debugOn) Log._debug(TAG, `Rollback ${this._id}`)
    for (const [jig, snapshot] of this._before) {
      snapshot._rollback()

      // For undeployed jigs, a rollback is unrecoverable. Code can be redeployed.
      _sudo(() => {
        const Jig = require('./jig')
        if (jig instanceof Jig && jig.location === _UNDEPLOYED) {
          jig.origin = 'error://Deploy failed'
          jig.location = 'error://Deploy failed'
        }
      })
    }

    // If unhandled, all outputs and deleted have the error
    if (unhandled) {
      const errorLocation = `error://Unhandled ${e}`

      _sudo(() => {
        this._outputs.forEach(jig => { jig.location = errorLocation })
        this._deletes.forEach(jig => { jig.location = errorLocation })
      })
    }

    // Notify of the rollback
    if (!this._record._importing) {
      this._outputs.forEach(jig => this._kernel._emit('update', jig))
      this._deletes.forEach(jig => this._kernel._emit('update', jig))
    }

    // Notify sync listeners of the failure if it is a failure
    if (e) {
      this._syncListeners.forEach(listener => listener.reject(e))
      this._syncListeners = []
    }
  }
}

// ------------------------------------------------------------------------------------------------
// _get
// ------------------------------------------------------------------------------------------------

/**
 * Looks up a commit from its commit id
 */
Commit._get = id => {
  return ACTIVE_COMMITS.get(id)
}

// ------------------------------------------------------------------------------------------------
// _sync
// ------------------------------------------------------------------------------------------------

/**
 * Waits for all current commits to finish publishing
 */
Commit._syncAll = async () => {
  const promises = []
  for (const commit of ACTIVE_COMMITS.values()) {
    promises.push(commit._sync())
  }
  return Promise.all(promises)
}

// ------------------------------------------------------------------------------------------------

module.exports = Commit
