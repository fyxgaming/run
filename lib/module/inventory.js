/**
 * inventory.js
 *
 * An object that tracks the jigs and code for the current owner
 */

// const Log = require('../util/log')
// const { _owner } = require('../util/bindings')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// const TAG = 'Inventory'

// ------------------------------------------------------------------------------------------------
// Inventory
// ------------------------------------------------------------------------------------------------

// const TAG = 'Inventory'

class Inventory {
  constructor (owner) {
    // this._listener = (event, data) => this._detectOurs(data)
    this._jigs = []

    /*
    // Kickoff a request to get the lock for this owner which is async
    const ownerPromise = owner.owner()

    // Check that this method is indeed async
    if (ownerPromise instanceof Promise) {
      this._lock = null
      this._ownerPromise = ownerPromise
      this._pendingDetection = []

      console.log(ownerPromise)

      // If getting the owner fails, then disable the inventory
      this._ownerPromise.catch(e => {
        Log._error(TAG, `Inventory disabled: ${e}`)
        this._pendingDetection = null
      })

      // When we do have an owner, run detect for all pending jigs
      this._ownerPromise.then(owner => {
        this._lock = _owner(owner)
        this._pendingDetection = null
        this._pendingDetection.forEach(jig => this._detectOurs(jig))
      })
    } else {
      // If the owner method is not async, then we should just have a lock
      this._lock = _owner(ownerPromise)
    }
    */
  }

  get jigs () {
    console.log('Inventory temporarily disabled')
    return []

    // const Jig = require('../kernel/jig')
    // this._jigs = this._jigs.filter(x => this._ours(x))
    // return this.jigs.filter(x => x instanceof Jig)
  }

  get code () {
    console.log('Inventory temporarily disabled')
    return []

    // const Code = require('../kernel/code')
    // this._jigs = this._jigs.filter(x => this._ours(x))
    // return this.jigs.filter(x => x instanceof Code)
  }

  async sync () {
    console.log('Inventory temporarily disabled')

    /*
    // Wait to get an owner lock. Otherwise, we can't detect jigs.
    if (this._ownerPromise) await this._ownerPromise

    // Make sure we have a lock
    if (!this._lock) return

    // One sync at a time
    if (this._sync) return this._sync

    // Lock if off and return the promise
    this._sync = this._syncLatest()
      .then(() => { this._sync = null })
      .catch(e => { this._sync = null; throw e })

    return this._sync
    */
  }

  async _syncLatest () {
    // TODO
  }

  _detectOurs (jig) {
    /*
    // If we don't have a lock yet, add this jig to a pending set to detect soon
    if (!this._lock && this._pendingNotify) {
      this._pendingNotify.push(jig)
      return
    }

    // If not ours, nothing to do
    if (!this._ours(jig)) return

    this._jigs.push(jig)
    // this._jigs = this._jigs.filter(x => this._ours(x))
    // if (this._ours(jig) && !_hasJig(this._jigs, jig)) this._jigs.push(jig)
    */
  }

  _cleanUpJigs () {

  }

  _ours (jig) {
    /*
    try {
      const jigLock = _owner(jig.owner)
      const jigScript = jigLock.script()
      const ourScript = this._lock.script()
      if (jigScript.length !== ourScript.length) return false
      for (let i = 0; i < jigScript.length; i++) {
        if (jigScript[i] !== ourScript[i]) return false
      }
      return true
    } catch (e) {
      return false
    }
    */
  }

  _activate (kernel) {
    /*
    Log._debug(TAG, 'Activate')
    if (kernel._listeners.some(x => x._listener === this._listener)) return
    kernel._listeners.push({ _event: 'jig', _listener: this._listener })
    */
  }

  _deactivate (kernel) {
    /*
    Log._debug(TAG, 'Deactivate')
    kernel._listeners = kernel._listeners.filter(x => x._listener === this._listener)
    */
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Inventory
