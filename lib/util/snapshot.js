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
    const Repository = require('../kernel/repository')

    // Get the jig type
    if (jig instanceof Jig) {
      this._kind = 'jig'
    } else if (jig instanceof Code) {
      this._kind = Repository._native()._get(jig) ? 'native' : 'code'
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
      const Repository = require('../kernel/repository')
      this._codeTarget = Repository._getCodeTarget(jig)
    }
  }

  /**
   * Reverts the jig to the snapshot point
   */
  _rollback () {
    const Membrane = require('../kernel/membrane')
    const Repository = require('../kernel/repository')

    if (this._kind === 'native') return

    Membrane._sudo(() => {
      Object.keys(this._jig).forEach(key => { delete this._jig[key] })
      Object.assign(this._jig, this._props)
    })

    if (this._kind === 'code' && this._src !== this._jig.toString()) {
      Repository._setCodeTarget(this._jig, this._codeTarget)
      _assert(this._codeTarget.toString() === this._jig.toString())
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Snapshot
