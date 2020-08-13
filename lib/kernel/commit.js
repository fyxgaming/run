/**
 * Commit.js
 *
 * A record that has been locked in and will be converted into a transaction
 */

const bsv = require('bsv')
const { crypto } = bsv
const Membrane = require('./membrane')
const { _assert, _kernel, _sameJig, _addJigs, _subtractJigs } = require('../util/misc')
const { _location, _BINDINGS } = require('../util/bindings')
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
    this._id = 'commit://' + crypto.Random.getRandomBuffer(32).toString('hex')
    Log._debug(TAG, 'Create', this._id)
    ACTIVE_COMMITS.set(this._id, this)

    // Store the record in case we need to make changes to it in a new commit
    this._record = record

    // Calculate transaction sets and copy actions
    this._inputs = _subtractJigs(_addJigs(record._updates, record._auths), record._creates)
    this._outputs = _subtractJigs(_addJigs(this._inputs, record._creates), record._deletes)
    this._refs = _subtractJigs(_subtractJigs(record._reads, this._inputs), this._outputs)
    this._creates = [...record._creates]
    this._deletes = [...record._deletes]
    this._actions = [...record._actions]

    // Check commit is valid
    _assert(this._actions.length)
    _assert(this._inputs.length || this._outputs.length)

    this._upstream = [] // commits we depend on
    this._downstream = [] // commits that depend on us

    // Link upstream commits
    this._inputs.forEach(jig => this._link(jig))
    this._refs.forEach(jig => this._link(jig))

    // Assign temporary location to all jigs
    this._assignCommitLocations()

    // Create before and after states
    this._before = new Map(record._snapshots)
    this._after = new Map()
    this._outputs.forEach(jig => {
      const snapshot = new Snapshot(jig)
      this._after.set(jig, snapshot)
    })

    // Create a set of listeners when the commit is published
    this._publishListeners = []
    this._done = false
    this._error = null

    // Save the kernel used to publish this commit
    this._kernel = _kernel()

    // Use a single import limit for publishing
    const { _ImportLimit } = require('./import')
    this._importLimit = new _ImportLimit()

    // Publish if necessary
    if (!this._upstream.length && this._record._autopublish) _publish(this)
  }

  // --------------------------------------------------------------------------

  /**
   * Waits for the commit to finish publishing
   */
  async _sync () {
    Log._debug(TAG, 'Sync', this._id)

    _assert(ACTIVE_COMMITS.has(this._id))

    // If already done, return directly
    if (this._done && !this._error) return
    if (this._done && this._error) throw this._error

    // Otherwise, listen for publish
    return new Promise((resolve, reject) => {
      this._publishListeners.push({ resolve, reject })
    })
  }

  // --------------------------------------------------------------------------

  /**
   * Assigns commit locations to jigs before they have tx locations
   */
  _assignCommitLocations () {
    Membrane._sudo(() => {
      this._outputs.forEach((jig, index) => {
        const location = `${this._id}_o${index + 1}`
        const deployed = !_location(jig.origin).undeployed

        jig.origin = deployed ? jig.origin : location
        jig.location = location
        jig.nonce = jig.nonce + 1
      })

      this._deletes.forEach((jig, index) => {
        const location = `${this._id}_d${index}`
        const deployed = !_location(jig.origin).undeployed

        jig.origin = deployed ? jig.origin : location
        jig.location = location
        jig.nonce = jig.nonce + 1
      })
    })
  }

  // --------------------------------------------------------------------------

  /**
   * Hooks up this commit to the upstream commit the jig is in
   */
  _link (jig) {
    const location = Membrane._sudo(() => jig.location)
    const { commitid } = _location(location)
    if (!commitid) return

    const commit = ACTIVE_COMMITS.get(commitid)
    _assert(commit)

    if (!commit._downstream.includes(this)) commit._downstream.push(this)
    if (!this._upstream.includes(commit)) this._upstream.push(commit)
  }

  // --------------------------------------------------------------------------

  /**
   * Notification when an upstream commit is published to start publishing this one.
   */
  _onUpstreamPublished (commit) {
    this._upstream = this._upstream.filter(c => c !== commit)

    for (const [jig, prevss] of commit._after) {
      const ours = this._inputs.find(j => _sameJig(j, jig)) ||
        this._refs.find(j => _sameJig(j, jig))
      if (!ours) continue

      // Update the before states with new bindings
      const before = this._before.get(ours)
      if (!before) continue

      _BINDINGS.forEach(binding => { before._props[binding] = prevss._props[binding] })

      const Unbound = require('../util/unbound')

      // Update the after states with new bindings
      const after = this._after.get(ours)
      if (after) {
        const props = after._props
        after._props.origin = prevss._props.origin
        if (props.owner instanceof Unbound && !props.owner._value) props.owner = prevss._props.owner
        if (props.satoshis instanceof Unbound && !props.satoshis._value) props.satoshis = prevss._props.satoshis
      }

      // Update our jig bindings if they were assigned
      if (!this._spentDownstream(ours)) {
        Membrane._sudo(() => {
          if (ours.owner instanceof Unbound && !ours.owner._value) ours.owner = prevss._props.owner
          if (ours.satoshis instanceof Unbound && !ours.satoshis._value) ours.satoshis = prevss._props.satoshis
        })
      }
    }

    // Start publishing if there are no more upstream dependencies
    if (!this._upstream.length && this._record._autopublish) _publish(this)
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

  /**
   * Deactivates this commit from being published. This is used during import.
   */
  _deactivate () {
    _assert(ACTIVE_COMMITS.delete(this._id))

    // Mark done without error
    this._done = true

    // There should be no listeners or downstream commits
    _assert(!this._publishListeners.length)
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
    this._publishListeners.forEach(s => s.resolve())
    this._publishListeners = []

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

    const unhandled = e && this._publishListeners.length === 0

    Log._error(TAG, unhandled ? 'Unhandled' : '', e)

    // Rollback the jigs
    Log._debug(TAG, `Rollback ${this._id}`)
    for (const [, snapshot] of this._before) {
      snapshot._rollback()
    }

    // If unhandled, all outputs and deleted have the error
    if (unhandled) {
      const errorLocation = `error://Unhandled ${e}`

      Membrane._sudo(() => {
        this._outputs.forEach(jig => { jig.location = errorLocation })
        this._deletes.forEach(jig => { jig.location = errorLocation })
      })
    }

    // Notify sync listeners of the failure if it is a failure
    if (e) {
      this._publishListeners.forEach(listener => listener.reject(e))
      this._publishListeners = []
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
