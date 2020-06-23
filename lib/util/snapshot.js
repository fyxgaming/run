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
    // Lazy dependencies for linking reasons
    const { Jig } = require('../kernel/jig')
    const Code = require('../kernel/v2/code')
    const { Berry } = require('../kernel/berry')
    const Membrane = require('../kernel/v2/membrane')

    // Get the jig type
    if (jig instanceof Jig) {
      this._type = 'jig'
    } else if (jig instanceof Code) {
      this._type = 'code'
    } else if (jig instanceof Berry) {
      this._type = 'berry'
    } else {
      throw new Error(`Must only snapshot jigs: ${_text(jig)}`)
    }

    // Save the properties of the jig
    Membrane._sudo(() => {
      const props = Object.assign({}, jig)
      const clonedProps = _deepClone(props)
      this._props = clonedProps
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Snapshot
