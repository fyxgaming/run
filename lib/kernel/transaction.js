/**
 * transaction.js
 *
 * Transaction API for building transactions manually
 */

const Record = require('./record')
const _publish = require('./publish')
const _import = require('./import')
const Log = require('../util/log')
const { _assert, _checkState, _text, _kernel, _Timeout, _addJigs, _subtractJigs, _checkArgument } = require('../util/misc')
const { _payload } = require('./loader')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Transaction'

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

class Transaction {
  constructor () {
    this._record = new Record()
    this._record._importing = false
    this._record._autopublish = false
    this._commit = null // Imported commit
    this._tx = null // Imported tx
    this._exportPromise = null
    this._publishPromise = null
    this._published = false
  }

  // --------------------------------------------------------------------------
  // getters
  // --------------------------------------------------------------------------

  get outputs () {
    const inputs = _addJigs(this._record._updates, this._record._auths)
    const outgoing = _addJigs(inputs, this._record._creates)
    return _subtractJigs(outgoing, this._record._deletes)
  }

  // --------------------------------------------------------------------------

  get deletes () {
    return [...this._record._deletes]
  }

  // --------------------------------------------------------------------------
  // update
  // --------------------------------------------------------------------------

  update (callback) {
    _checkArgument(typeof callback === 'function', 'Invalid callback')

    if (Log._infoOn) Log._info(TAG, 'Update')

    _checkState(!Transaction._ATOMICALLY_UPDATING, 'update disabled during atomic transaction')
    if (this._exportPromise) throw new Error('update disabled during export')
    if (this._publishPromise) throw new Error('update disabled during publish')
    if (this._published) throw new Error('update disabled once published')

    // Any updates clear the saved commit
    this._commit = null
    this._tx = null

    const savedRecord = Record._CURRENT_RECORD

    try {
      // Replace the current record with ours
      Record._CURRENT_RECORD = this._record

      // Begin recording
      Record._CURRENT_RECORD._begin()

      // Perform updates atomically
      let ret = null
      try {
        Transaction._ATOMICALLY_UPDATING = true
        ret = callback()
      } finally {
        Transaction._ATOMICALLY_UPDATING = false
      }

      // Async updates are not allowed because we require atomicity
      if (ret instanceof Promise) throw new Error('async transactions not supported')

      // Stop recording
      Record._CURRENT_RECORD._end()

      // Return the return value of the callback
      return ret
    } catch (e) {
      // When an error occurs, all changes are reverted
      this.rollback()

      // Rethrow
      throw e
    } finally {
      Record._CURRENT_RECORD = savedRecord
    }
  }

  // --------------------------------------------------------------------------
  // publish
  // --------------------------------------------------------------------------

  publish (options = { }) {
    if (Log._infoOn) Log._info(TAG, 'Publish')

    _checkState(!Transaction._ATOMICALLY_UPDATING, 'publish disabled during atomic transaction')
    if (this._exportPromise) throw new Error('publish disabled during export')

    // If we are already publishing or published, don't publish again
    if (this._publishPromise) return this._publishPromise
    if (this._published) return true

    // Extract options
    _checkArgument(typeof options.pay === 'undefined' || typeof options.pay === 'boolean', `Invalid pay: ${_text(options.pay)}`)
    _checkArgument(typeof options.sign === 'undefined' || typeof options.sign === 'boolean', `Invalid sign: ${_text(options.sign)}`)
    const pay = typeof options.pay === 'undefined' ? true : options.pay
    const sign = typeof options.sign === 'undefined' ? true : options.sign

    if (!this._commit) {
      this._publishPromise = this._buildAndPublish(pay, sign)
    } else {
      this._publishPromise = this._finishAndPublish(pay, sign)
    }

    // Wait for publish to finish
    this._publishPromise
      .then(() => { this._published = true; this._publishPromise = null })
      .catch(e => { this._publishPromise = null; throw e })

    return this._publishPromise
  }

  // --------------------------------------------------------------------------

  /**
   * Builds and publishes a new transaction
   */
  _buildAndPublish (pay, sign) {
    // Convert the record into a commit
    const commit = this._record._commit()

    // If no commit, then nothing to publish
    if (!commit) throw new Error('Nothing to publish')

    commit._pay = pay
    commit._sign = sign

    if (commit._upstream.length) {
      // Enable auto-publishing when we have to wait for upstream commits to publish first
      commit._record._autopublish = true
    } else {
      // Publish and save the promise so we don't publish again
      _publish(commit)
    }

    return commit._sync()
  }

  // --------------------------------------------------------------------------

  /**
   * Pays and signs for an existing transaction before publishing it
   */
  async _finishAndPublish (pay, sign) {
    const {
      _captureStates,
      _PURSE_SAFETY_QUEUE,
      _payForTx,
      _signTx,
      _checkTx,
      _cacheStates,
      _emitJigEvents
    } = require('./publish')

    const timeout = new _Timeout('publish')

    this._commit._activate()

    try {
      // Calculate the serialized states of output and deleted jigs
      const states = await _captureStates(this._commit, timeout)
      timeout._check()

      const tx = await _PURSE_SAFETY_QUEUE._enqueue(async () => {
        const partialTx = this._tx

        // Add inputs and outputs to pay for the transaction
        const paidtx = pay ? await _payForTx(partialTx, this._commit) : partialTx
        timeout._check()

        // Sign the jig owners
        const signedtx = sign ? await _signTx(paidtx, this._commit) : paidtx
        timeout._check()

        // Check that all signatures are present. This provides a nicer error.
        _checkTx(signedtx, this._commit)

        // Broadcast the rawtx to the blockchain
        const rawtx = signedtx.toString('hex')
        await _kernel()._blockchain.broadcast(rawtx)
        timeout._check()

        // Return the paid and signed transaction
        return signedtx
      })
      timeout._check()

      const txid = tx.hash

      // Add to cache, both outputs and deleted states
      await _cacheStates(this._commit, states, txid)
      timeout._check()

      // Add this txid to the trusted set
      this._commit._kernel._trusts.add(txid)

      // Emit events for each jig created, deleted or updated
      _emitJigEvents(this._commit)

      this._commit._onPublishSucceed()
    } catch (e) {
      this._commit._onPublishFail(e)

      // Emit events for each jig rolled back
      _emitJigEvents(this._commit)

      throw e
    }
  }

  // --------------------------------------------------------------------------
  // rollback
  // --------------------------------------------------------------------------

  rollback () {
    if (Log._infoOn) Log._info(TAG, 'Rollback')

    _checkState(!Transaction._ATOMICALLY_UPDATING, 'rollback disabled during atomic transaction')

    // Cannot rollback in the middle of publishing or exporting
    if (this._exportPromise) throw new Error('rollback disabled during export')
    if (this._publishPromise) throw new Error('rollback disabled during publish')
    if (this._published) throw new Error('rollback disabled once published')

    // Roll back the record which rolls back all states
    this._record._rollback()
    this._record = new Record()
    this._record._importing = false
    this._record._autopublish = false
  }

  // --------------------------------------------------------------------------
  // import
  // --------------------------------------------------------------------------

  static async _import (tx, txid) {
    if (Log._infoOn) Log._info(TAG, 'Import')

    const payload = _payload(tx)
    const kernel = _kernel()
    const published = false
    const commit = await _import(tx, txid, payload, kernel, published)

    const transaction = new Transaction()
    transaction._record = commit._record
    transaction._commit = commit
    transaction._tx = tx
    return transaction
  }

  // --------------------------------------------------------------------------
  // export
  // --------------------------------------------------------------------------

  export (options = {}) {
    if (Log._infoOn) Log._info(TAG, 'Export')

    _checkState(!Transaction._ATOMICALLY_UPDATING, 'export disabled during atomic transaction')
    if (this._publishPromise) throw new Error('export disabled during publish')

    // If already exporting, piggy-back on that
    if (this._exportPromise) return this._exportPromise

    // Extract options
    _checkArgument(typeof options.pay === 'undefined' || typeof options.pay === 'boolean', `Invalid pay: ${_text(options.pay)}`)
    _checkArgument(typeof options.sign === 'undefined' || typeof options.sign === 'boolean', `Invalid sign: ${_text(options.sign)}`)
    const pay = typeof options.pay === 'undefined' ? true : options.pay
    const sign = typeof options.sign === 'undefined' ? true : options.sign

    // Create a new timeout because there are async operations
    const timeout = new _Timeout('export')

    if (!this._commit) {
      this._exportPromise = this._buildAndExport(pay, sign, timeout)
    } else {
      this._exportPromise = this._finishAndExport(pay, sign, timeout)
    }

    this._exportPromise
      .then(rawtx => { this._exportPromise = null; return rawtx })
      .catch(e => { this._exportPromise = null; throw e })

    return this._exportPromise
  }

  // --------------------------------------------------------------------------

  /**
   * Creates a new trasaction from the record and exports it
   */
  _buildAndExport (pay, sign, timeout) {
    // Convert the record into a commit
    const commit = this._record._commit()

    // If no commit, then nothing to export
    if (!commit) throw new Error('Nothing to export')

    async function exportAsync () {
      // Wait for upstream dependencies to publish
      await commit._sync()

      try {
        // There must be no upstream dependencies
        _assert(!commit._upstream.length)

        const {
          _checkNoTimeTravel,
          _assignInitialOwners,
          _finalizeOwnersAndSatoshis,
          _createMasterList,
          _captureStates,
          _hashStates,
          _createExec,
          _createPayload,
          _PURSE_SAFETY_QUEUE,
          _createPartialTx,
          _payForTx,
          _signTx
        } = require('./publish')

        // Make sure references do not go back in time
        await _checkNoTimeTravel(commit, timeout)
        timeout._check()

        // Assigns initial unbound owners in the jigs after snapshots
        await _assignInitialOwners(commit)
        timeout._check()

        // Make owners and satoshis bound properties
        _finalizeOwnersAndSatoshis(commit)

        // Create the sorted master list used to serialize actions
        const masterList = _createMasterList(commit)

        // Calculate the serialized states of output and deleted jigs
        const states = await _captureStates(commit, timeout)
        timeout._check()

        // Calculate state hashes
        const hashes = _hashStates(states)

        // Convert the actions to executable statements
        const exec = _createExec(commit, masterList)

        // Create the OP_RETURN payload json
        const payload = _createPayload(commit, hashes, exec, masterList)

        // Create the unpaid and unsigned tx
        const partialtx = _createPartialTx(commit, payload)

        // Serialize from pay to broadcast because the purse may consume outputs that should not be
        // consumed again in another parallel publish, but the purse may not mark them as spent right
        // away. In the future we might consider making this serialization optional for smarter purses.
        const tx = await _PURSE_SAFETY_QUEUE._enqueue(async () => {
          // Add inputs and outputs to pay for the transaction
          const paidtx = pay ? await _payForTx(partialtx, commit) : partialtx
          timeout._check()

          // Sign the jig owners
          const signedtx = sign ? await _signTx(paidtx, commit) : paidtx
          timeout._check()

          // Return the paid and signed transaction
          return signedtx
        })
        timeout._check()

        return tx.toString('hex')
      } finally {
        commit._deactivate()
        commit._restoreRecordBindings()
      }
    }

    return exportAsync()
  }

  // --------------------------------------------------------------------------

  /**
   * Signs and pays for an already-existing transaction before exporting
   */
  async _finishAndExport (pay, sign, timeout) {
    const {
      _PURSE_SAFETY_QUEUE,
      _payForTx,
      _signTx
    } = require('./publish')

    // Serialize from pay to broadcast because the purse may consume outputs that should not be
    // consumed again in another parallel publish, but the purse may not mark them as spent right
    // away. In the future we might consider making this serialization optional for smarter purses.
    const tx = await _PURSE_SAFETY_QUEUE._enqueue(async () => {
      const partialTx = this._tx

      // Add inputs and outputs to pay for the transaction
      const paidtx = pay ? await _payForTx(partialTx, this._commit) : partialTx
      timeout._check()

      // Sign the jig owners
      const signedtx = sign ? await _signTx(paidtx, this._commit) : paidtx
      timeout._check()

      // Return the paid and signed transaction
      return signedtx
    })
    timeout._check()

    return tx.toString('hex')
  }
}

// ------------------------------------------------------------------------------------------------

// Variable indicating whether we are in an update() and should not allow changes to Run
Transaction._ATOMICALLY_UPDATING = false

module.exports = Transaction
