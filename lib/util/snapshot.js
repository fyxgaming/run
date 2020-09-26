/**
 * snapshot.js
 *
 * A snapshot of a jig at a point in time
 */

const { _text, _setOwnProperty } = require('./misc')
const { _deepClone } = require('./deep')
const { _sudo } = require('./admin')
const Log = require('./log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Snapshot'

// ------------------------------------------------------------------------------------------------
// Snapshot
// ------------------------------------------------------------------------------------------------

class Snapshot {
  constructor (jig) {
    if (Log._debugOn) Log._debug(TAG, 'Snapshot', _text(jig))

    this._jig = jig

    // Lazy dependencies for linking reasons
    const Jig = require('../kernel/jig')
    const Code = require('../kernel/code')
    const Berry = require('../kernel/berry')

    // Get the jig type
    if (jig instanceof Jig) {
      this._kind = 'jig'
    } else if (jig instanceof Code) {
      this._kind = Code._editor(jig)._native ? 'native' : 'code'
    } else if (jig instanceof Berry) {
      this._kind = 'berry'
    } else {
      throw new Error(`Must only snapshot jigs: ${_text(jig)}`)
    }

    // Save the properties of the jig
    _sudo(() => {
      const props = Object.assign({}, jig)
      const clonedProps = _deepClone(props)
      this._props = clonedProps
    })

    // Save the class
    if (this._kind === 'jig' || this._kind === 'berry') {
      this._cls = jig.constructor
    }

    // Save the source code and inner type
    if (this._kind === 'code') {
      const editor = Code._editor(jig)
      this._src = editor._src
      this._savepoint = editor._save()
    }
  }

  /**
   * Reverts the jig to the snapshot point
   */
  _rollback () {
    if (this._kind === 'native') return

    return _sudo(() => {
      // Restore the code for the class
      if (this._kind === 'code') {
        const Code = require('../kernel/code')
        const editor = Code._editor(this._jig)
        editor._restore(this._savepoint)
      }

      // Delete each existing owned property
      Object.keys(this._jig).forEach(key => { delete this._jig[key] })

      // Assign each new property as an owned property. Owned is important.
      Object.keys(this._props).forEach(key => {
        _setOwnProperty(this._jig, key, this._props[key])
      })
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Snapshot
