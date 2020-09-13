/**
 * args.js
 *
 * Preparation and unification of method arguments and other jig actions
 */

const Universal = require('./universal')
const { _kernel } = require('../util/misc')
const { _deepVisit, _deepClone, _deepReplace } = require('../util/deep')
const Sandbox = require('../util/sandbox')
const { _sudo } = require('../util/admin')
const SI = Sandbox._intrinsics

// ------------------------------------------------------------------------------------------------
// _prepare
// ------------------------------------------------------------------------------------------------

function _prepare (thisArg, args) {
  const Code = require('./code')

  // If thisArg is already code, make sure its deployed
  if (thisArg instanceof Code) Code._editor(thisArg)._deploy()

  const kernel = _kernel()

  // Clone the value using sandbox intrinsics
  const clonedArgs = _deepClone(args, SI, x => {
    if (typeof x === 'function' && !(x instanceof Universal)) {
      const C = new Code(x)
      if (!kernel._manual) Code._editor(C)._deploy()
      return C
    }

    // If x is already code, make sure its deployed
    if (x instanceof Code && !kernel._manual) Code._editor(x)._deploy()
  })

  _unify([thisArg, clonedArgs])

  return clonedArgs
}

// ------------------------------------------------------------------------------------------------
// _unify
// ------------------------------------------------------------------------------------------------

function _unify (args) {
  if (_kernel()._manual) {
    // If in manual mode unify jigs by their location. This preserves user intention.
    _unifyByLocation(args)
  } else {
    // In automatic mode, unify by origin. This is more invasive but leads to less surprises for
    // beginners and simple use cases. For advanced use cases, there is manual mode.
    _unifyByOrigin(args)
  }
}

// ------------------------------------------------------------------------------------------------

function _unifyByLocation (args) {
  const key = x => x.origin.startsWith('error://') ? x : x.location

  _sudo(() => {
    const worldview = new Map() // Location | Jig -> Universal Jig

    _deepReplace(args, x => {
      if (x instanceof Universal) {
        const y = worldview.get(key(x)) || x
        worldview.set(key(x), y)
        return y
      }
    })
  })
}

// ------------------------------------------------------------------------------------------------

function _unifyByOrigin (args) {
  const key = x => x.origin.startsWith('error://') ? x : x.origin

  _sudo(() => {
    const worldview = new Map() // Origin | Jig -> Universal Jig

    _deepVisit(args, x => {
      if (x instanceof Universal) {
        const y = worldview.get(key(x)) || x
        if (x.nonce >= y.nonce) worldview.set(key(x), y)
      }
    })

    _deepReplace(args, x => {
      if (x instanceof Universal) {
        return worldview.get(key(x))
      }
    })
  })
}

// ------------------------------------------------------------------------------------------------

module.exports = { _prepare, _unify }
