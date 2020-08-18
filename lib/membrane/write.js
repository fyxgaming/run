/**
 * write.js
 *
 * Records updates on the current record
 */

const Membrane = require('./membrane')
const Proxy = require('../util/proxy')
const { _assert } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const RECORD = () => require('../kernel/record')._CURRENT_RECORD

// ------------------------------------------------------------------------------------------------
// RecordWrites
// ------------------------------------------------------------------------------------------------

class RecordWrites extends Membrane {
  defineProperty (target, prop, desc) {
    // Defining a property requires an update and must be in another action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._get(target))

    return this._inner.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    // Deleting a property requires an update and must be in another action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._get(target))

    return this._inner.deleteProperty(target, prop)
  }

  preventExtensions (target) {
    // Preventing extensions requires an update and must be in an action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._get(target))

    return this._inner.preventExtensions(target)
  }

  set (target, prop, value, receiver) {
    // Setting a property requires an update and must be in an action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._get(target))

    return this._inner.set(target, prop, value, receiver)
  }

  setPrototypeOf (target, prototype) {
    // Changing the prototype requires an update and must be in an action
    _assert(RECORD()._stack.length)
    RECORD()._update(Proxy._get(target))

    return this._inner.setPrototypeOf(target, prototype)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = RecordWrites
