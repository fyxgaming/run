/**
 * snapshot.js
 *
 * A snapshot of a jig at a point in time
 */

const { _assert, _text } = require('./misc')
const { _deepClone } = require('./deep')
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
    Log._debug(TAG, 'Snapshot', _text(jig))

    this._jig = jig

    // Lazy dependencies for linking reasons
    const Jig = require('../kernel/jig')
    const Code = require('../kernel/code')
    const Berry = require('../kernel/berry')
    const Membrane = require('../kernel/membrane')

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
    Membrane._sudo(() => {
      const props = Object.assign({}, jig)
      const clonedProps = _deepClone(props)
      this._props = clonedProps
    })

    // Save the class
    if (this._kind === 'jig' || this._kind === 'berry') {
      this._cls = jig.constructor
    }

    // Save the source code
    if (this._kind === 'code') {
      this._innerType = Membrane._sudo(() => jig.__type__)
    }
  }

  /**
   * Reverts the jig to the snapshot point
   */
  _rollback () {
    const Membrane = require('../kernel/membrane')

    if (this._kind === 'native') return

    if (this._kind === 'code') {
      Membrane._sudo(() => { this._jig.__type__ = this._innerType })
      _assert(this._innerType.toString() === this._jig.toString())
    }

    Membrane._sudo(() => {
      Object.keys(this._jig).forEach(key => { delete this._jig[key] })
      Object.assign(this._jig, this._props)
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Snapshot
