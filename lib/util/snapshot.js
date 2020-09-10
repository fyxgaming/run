/**
 * snapshot.js
 *
 * A snapshot of a jig at a point in time
 */

const { _text, _deanonymizeSourceCode, _setOwnProperty } = require('./misc')
const { _deepClone } = require('./deep')
const { _sudo } = require('./admin')
const Log = require('./log')
const Dynamic = require('./dynamic')

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
      const D = editor._D
      this._T = editor._T
      this._innerType = Dynamic._getInnerType(D)
      this._src = _deanonymizeSourceCode(D.toString(), editor._T.name)
    }
  }

  /**
   * Reverts the jig to the snapshot point
   */
  _rollback () {
    if (this._kind === 'native') return

    return _sudo(() => {
      if (this._kind === 'code') {
        const Code = require('../kernel/code')
        const editor = Code._editor(this._jig)
        editor._T = this._T
        const D = editor._D
        Dynamic._setInnerType(D, this._innerType)
      }

      // Delete each existing owned key
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
