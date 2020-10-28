/**
 * snapshot.js
 *
 * A snapshot of a jig at a point in time
 */

const { _text, _setOwnProperty } = require('./misc')
const { _deepClone } = require('./deep')
const { _sudo } = require('./admin')
const { _UNDEPLOYED_LOCATION, _compileLocation } = require('./bindings')
const SI = require('../sandbox/sandbox')._intrinsics
const Log = require('./log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Snapshot'

// ------------------------------------------------------------------------------------------------
// Snapshot
// ------------------------------------------------------------------------------------------------

class Snapshot {
  constructor (jig, bindingsOnly, readOnly) {
    if (Log._debugOn) Log._debug(TAG, 'Snapshot', _text(jig), bindingsOnly ? '(bindings only)' : '')

    this._jig = jig

    if (bindingsOnly) {
      this._captureBindings(readOnly)
    } else {
      this._captureAll()
    }
  }

  _captureBindings (readOnly) {
    const Berry = require('../kernel/berry')
    const jig = this._jig
    const props = this._props = {}

    this._bindingsOnly = true
    this._readOnly = readOnly

    _sudo(() => {
      props.location = jig.location
      props.origin = jig.origin
      props.nonce = jig.nonce

      if (!(jig instanceof Berry)) {
        props.owner = _deepClone(jig.owner, SI)
        props.satoshis = jig.satoshis
      }
    })
  }

  _captureAll () {
    const jig = this._jig

    this._bindingsOnly = false
    this._readOnly = false

    // Lazy dependencies for linking reasons
    const Jig = require('../kernel/jig')
    const Code = require('../kernel/code')
    const Berry = require('../kernel/berry')
    const Editor = require('../kernel/editor')

    // Get the jig type
    if (jig instanceof Jig) {
      this._kind = 'jig'
    } else if (jig instanceof Code) {
      this._kind = Editor._get(jig)._native ? 'native' : 'code'
    } else if (jig instanceof Berry) {
      this._kind = 'berry'
    } else {
      throw new Error(`Must only snapshot jigs: ${_text(jig)}`)
    }

    // Save the properties of the jig
    _sudo(() => {
      const props = Object.assign({}, jig)
      const clonedProps = _deepClone(props, SI)
      this._props = clonedProps
    })

    // Save the class
    if (this._kind === 'jig' || this._kind === 'berry') {
      this._cls = _sudo(() => jig.constructor)
    }

    // Save the source code and inner type
    if (this._kind === 'code') {
      const editor = Editor._get(jig)
      this._src = editor._src
      this._savepoint = editor._save()
    }
  }

  /**
   * Reverts the jig to the snapshot point
   */
  _rollback (e) {
    if (this._kind === 'native') return

    // If the snapshot is not for rolling back, skip
    if (this._readOnly) return

    return _sudo(() => {
      // If we are only storing bindings, then we go into an error state
      if (this._bindingsOnly) {
        if (e) {
          const errorLocation = _compileLocation({ error: `A previous error occurred\n\n${e}` })
          _setOwnProperty(this._jig, 'location', errorLocation)
        } else {
          _setOwnProperty(this._jig, 'location', _UNDEPLOYED_LOCATION)
        }
        return
      }

      // Restore the code for the class
      if (this._kind === 'code') {
        const Editor = require('../kernel/editor')
        const editor = Editor._get(this._jig)
        editor._restore(this._savepoint)
      }

      // Delete each existing owned property
      Object.keys(this._jig).forEach(key => { delete this._jig[key] })

      // Assign each new property as an owned property. Owned is important.
      Object.keys(this._props).forEach(key => {
        _setOwnProperty(this._jig, key, this._props[key])
      })

      // For undeployed jigs, a rollback is unrecoverable. Code can be redeployed.
      if (e) {
        const Jig = require('../kernel/jig')
        if (this._jig instanceof Jig && this._props.location === _UNDEPLOYED_LOCATION) {
          const errorLocation = _compileLocation({ error: `Deploy failed\n\n${e}` })
          _setOwnProperty(this._jig, 'origin', errorLocation)
          _setOwnProperty(this._jig, 'location', errorLocation)
        }
      }
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Snapshot
