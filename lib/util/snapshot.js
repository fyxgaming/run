/**
 * snapshot.js
 *
 * A snapshot of a creation at a point in time
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
  constructor (creation, bindingsOnly, readOnly) {
    if (Log._debugOn) Log._debug(TAG, 'Snapshot', _text(creation), bindingsOnly ? '(bindings only)' : '')

    this._creation = creation

    if (bindingsOnly) {
      this._captureBindings(readOnly)
    } else {
      this._captureAll()
    }
  }

  _captureBindings (readOnly) {
    const creation = this._creation
    const props = this._props = {}

    this._bindingsOnly = true
    this._readOnly = readOnly

    _sudo(() => {
      props.location = creation.location
      props.origin = creation.origin
      props.nonce = creation.nonce
      props.owner = _deepClone(creation.owner, SI)
      props.satoshis = creation.satoshis
    })
  }

  _captureAll () {
    const creation = this._creation

    this._bindingsOnly = false
    this._readOnly = false

    // Lazy dependencies for linking reasons
    const Jig = require('../kernel/jig')
    const Code = require('../kernel/code')
    const Berry = require('../kernel/berry')
    const Editor = require('../kernel/editor')

    // Get the creation type
    if (creation instanceof Jig) {
      this._kind = 'jig'
    } else if (creation instanceof Code) {
      this._kind = Editor._get(creation)._native ? 'native' : 'code'
    } else if (creation instanceof Berry) {
      this._kind = 'berry'
    } else {
      throw new Error(`Must only snapshot creations: ${_text(creation)}`)
    }

    // Save the properties of the creation
    _sudo(() => {
      const props = Object.assign({}, creation)
      const clonedProps = _deepClone(props, SI)
      this._props = clonedProps
    })

    // Save the class
    if (this._kind === 'jig' || this._kind === 'berry') {
      this._cls = _sudo(() => creation.constructor)
    }

    // Save the source code and inner type
    if (this._kind === 'code') {
      const editor = Editor._get(creation)
      this._src = editor._src
      this._savepoint = editor._save()
    }
  }

  /**
   * Reverts the creation to the snapshot point
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
          _setOwnProperty(this._creation, 'location', errorLocation)
        } else {
          _setOwnProperty(this._creation, 'location', _UNDEPLOYED_LOCATION)
        }
        return
      }

      // Restore the code for the class
      if (this._kind === 'code') {
        const Editor = require('../kernel/editor')
        const editor = Editor._get(this._creation)
        editor._restore(this._savepoint)
      }

      // Delete each existing owned property
      Object.keys(this._creation).forEach(key => { delete this._creation[key] })

      // Assign each new property as an owned property. Owned is important.
      Object.keys(this._props).forEach(key => {
        _setOwnProperty(this._creation, key, this._props[key])
      })

      // For undeployed creations, a rollback is unrecoverable. Code can be redeployed.
      if (e) {
        const Jig = require('../kernel/jig')
        if (this._creation instanceof Jig && this._props.location === _UNDEPLOYED_LOCATION) {
          const errorLocation = _compileLocation({ error: `Deploy failed\n\n${e}` })
          _setOwnProperty(this._creation, 'origin', errorLocation)
          _setOwnProperty(this._creation, 'location', errorLocation)
        }
      }
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Snapshot
