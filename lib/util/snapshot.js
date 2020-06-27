/**
 * snapshot.js
 *
 * A snapshot of a jig at a point in time
 */

const { _text } = require('./type')
const { _deepClone } = require('./deep')

// ------------------------------------------------------------------------------------------------
// Snapshot
// ------------------------------------------------------------------------------------------------

class Snapshot {
  constructor (jig) {
    this._jig = jig

    // Lazy dependencies for linking reasons
    const { Jig, JigControl } = require('../kernel/jig')
    const Code = require('../kernel/v2/code')
    const { Berry } = require('../kernel/berry')
    const Membrane = require('../kernel/v2/membrane')

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
      JigControl._disableSafeguards(() => {
        const props = Object.assign({}, jig)
        const clonedProps = _deepClone(props)
        this._props = clonedProps
      })
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
    const Membrane = require('../kernel/v2/membrane')
    const { JigControl } = require('../kernel/jig')

    Membrane._sudo(() => {
      JigControl._disableSafeguards(() => {
        Object.keys(this._jig).forEach(key => { delete this._jig[key] })
        Object.assign(this._jig, this._props)
      })
    })

    if (this._kind === 'code' && this._src !== this._jig.toString()) {
      // TODO: Downgrade code
      console.log('TODO!')
    }
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Snapshot
