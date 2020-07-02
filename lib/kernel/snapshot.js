/**
 * snapshot.js
 *
 * A snapshot of a jig at a point in time
 */

const { _text } = require('./misc')
const { _deepClone } = require('./deep')

// ------------------------------------------------------------------------------------------------
// Snapshot
// ------------------------------------------------------------------------------------------------

class Snapshot {
  constructor (jig) {
    this._jig = jig

    // Lazy dependencies for linking reasons
    const Jig = require('./jig')
    const Code = require('./code')
    const Berry = require('./berry')
    const Membrane = require('./membrane')

    // Get the jig type
    if (jig instanceof Jig) {
      this._kind = 'jig'
    } else if (jig instanceof Code) {
      this._kind = 'code'
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
      this._src = jig.toString()
    }
  }

  /**
   * Reverts the jig to the snapshot point
   */
  _rollback () {
    const Membrane = require('./membrane')

    Membrane._sudo(() => {
      Object.keys(this._jig).forEach(key => { delete this._jig[key] })
      Object.assign(this._jig, this._props)
    })

    if (this._kind === 'code' && this._src !== this._jig.toString()) {
      // TODO: Downgrade code
      console.log('TODO!')
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Snapshot
