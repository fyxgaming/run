/**
 * code.js
 *
 * Membrane for all code, including jigs, sidekicks, and native code.
 *
 * The methods provided are reserved in the Code class. We simply expose them here.
 * We also ensure these methods cannot be set or overridden. They are permanant by design.
 */

const Membrane = require('./membrane')
const Sandbox = require('../util/sandbox')

// ------------------------------------------------------------------------------------------------
// Methods
// ------------------------------------------------------------------------------------------------

// Creates a code prototype method that can be safely returned from the membrane
function makeCodeMethod (name) {
  const Code = require('../kernel/code')
  const script = `function ${name} (...args) { return Code.prototype.${name}.apply(this, args) }`
  const method = Sandbox._evaluate(script, { Code })[0]
  return Object.freeze(method)
}

// Methods on every code instance
const CODE_METHODS = {
  toString: makeCodeMethod('toString'),
  sync: makeCodeMethod('sync'),
  upgrade: makeCodeMethod('upgrade'),
  destroy: makeCodeMethod('destroy'),
  auth: makeCodeMethod('auth')
}

const CODE_METHOD_NAMES = Object.keys(CODE_METHODS)

// ------------------------------------------------------------------------------------------------
// CodeMethods
// ------------------------------------------------------------------------------------------------

class CodeMethods extends Membrane {
  defineProperty (target, prop, desc) {
    if (CODE_METHOD_NAMES.includes(prop)) throw new Error(`Cannot define ${prop}`)
    return super.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    if (CODE_METHOD_NAMES.includes(prop)) throw new Error(`Cannot delete ${prop}`)
    return super.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    if (CODE_METHOD_NAMES.includes(prop)) return CODE_METHODS[prop]
    return super.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    // Code methods are not owned properties by our definition
    if (CODE_METHOD_NAMES.includes(prop)) return undefined
    return super.getOwnPropertyDescriptor(target, prop)
  }

  has (target, prop) {
    if (CODE_METHOD_NAMES.includes(prop)) return true
    return super.has(target, prop)
  }

  set (target, prop, value, receiver) {
    if (CODE_METHOD_NAMES.includes(prop)) throw new Error(`Cannot set ${prop}`)
    return super.set(target, prop, value, receiver)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = CodeMethods
