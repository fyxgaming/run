/**
 * set.js
 *
 * Allows a Set instance to be mutated and tracked
 */

/*
const Record = require('../kernel/record')
const Proxy = require('../util/proxy')
const { _text, _checkState } = require('../util/misc')
const Sandbox = require('../util/sandbox')
const { _deepClone, _deepVisit, _deepReplace } = require('../util/deep')
const { _sudo } = require('../util/admin')
const SI = Sandbox._intrinsics

const OWNED_OBJECTS = new WeakMap() // Object -> Proxy

const PENDING = new Set()

// Jig methods protected like code form sets

// Because classes can be upgraded, instances might have hidden methods after an upgrade. So,
// we don't prevent jigs from setting properties named after methods. The consistency principle
// suggests that classes should behave the same so that will. Now, the only exception are that
// classes cannot override special methods like upgrade, auth, etc. Therefore, instances also
// cannot override these special methods. This is a consistent perspective.

class JigMethod extends Immutable {
  constructor (name, container) {
    this._name = name
    this._container = container
  }

  _methodArgs (args, proxy) {
    // At the top level, code that is passed in gets automatically deployed
    if (topLevel()) {
      const clonedArgs = _deepClone(args, SI, x => {
        if (typeof x === 'function' && !(x instanceof Code)) {
          const C = new Code(x)
          Code._editor(C)._deploy()
          return C
        }
      })

      // Unify the worldview if at the top level
      // This will unify everything. No need for inner worldview unifications.
      this._unifyWorldview(proxy, methodArgs)

      return clonedArgs
    }

    // If a jig is calling another jig, clone args for safety. Otherwise, the args could be
    // still held by the calling jig and could be changed outside of the rules of the other.
    if (crossing(proxy)) {
      return _deepClone(args, SI, x => {
        // New code cannot be deployed internally for now.
        _checkArgument(typeof x !== 'function' || x instanceof Code, `${_text(x)}`)
      })
    }

    // Jig is calling itself. No need to clone anything.
    return args
  }

  _unifyWorldview (...args) {
    const worldview = new Map() // Location -> Jig | Code | Berry
    _sudo(() => _deepReplace(x => {
      const relevant = x instanceof Jig || x instanceof Code || x instanceof Berry
      if (!relevant) return

      const y = worldview.get(x.location) || x
      worldview.set(x.location, y)
      return y
    }))
  }
}

function topLevel () { return !Record._CURRENT_RECORD._stack.length }
function crossing (proxy) {
  const stack = Record._CURRENT_RECORD._stack
  return stack.length && stack[stack.length - 1]._jig === proxy
}
*/
