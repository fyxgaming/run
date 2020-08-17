
/**
 * native.js
 *
 * A native code membrane that adds two methods: toString and sync.
 */

const Membrane = require('./membrane')
const Sandbox = require('../util/sandbox')
const Code = require('../kernel/code')
const { _assert } = require('../util/misc')

// ------------------------------------------------------------------------------------------------
// Native toString
// ------------------------------------------------------------------------------------------------

// The native code version of toString always returns a source with [native code] in it
function nativeToString () {
  // Get the code "editor" for the current caller
  const editor = Code._editor(this)

  // Check if native
  if (!editor || !editor._native) throw new Error('Native toString() must run on native code')

  // Get the source code
  const D = editor._D
  const src = D.toString()

  // Native code will always have a name
  _assert(D.name)

  // Modify the source code to appear as native code
  if (src.startsWith('class')) {
    return `class ${D.name} { [native code] }`
  } else {
    return `function ${D.name}() { [native code] }`
  }
}

const sandboxedNativeToString = Sandbox._sandboxType(nativeToString, { Code }, true)[0]

// ------------------------------------------------------------------------------------------------
// Native sync
// ------------------------------------------------------------------------------------------------

// The native code version of sync() always returns immediately
function nativeSync () {
  // Get the code "editor" for the current caller
  const editor = Code._editor(this)

  // Check if native
  if (!editor || !editor._native) throw new Error('Native sync() must run on native code')
}

const sandboxedNativeSync = Sandbox._sandboxType(nativeSync, { Code }, true)[0]

// ------------------------------------------------------------------------------------------------
// NativeCodeMembrane
// ------------------------------------------------------------------------------------------------

class NativeCodeMembrane extends Membrane {
  defineProperty (target, prop, desc) {
    if (prop === 'toString') throw new Error('Cannot define toString')
    if (prop === 'sync') throw new Error('Cannot define sync')

    return super.defineProperty(target, prop, desc)
  }

  deleteProperty (target, prop) {
    if (prop === 'toString') throw new Error('Cannot delete toString')
    if (prop === 'sync') throw new Error('Cannot delete sync')

    return super.deleteProperty(target, prop)
  }

  get (target, prop, receiver) {
    if (isNativeCode(receiver)) {
      if (prop === 'toString') return sandboxedNativeToString
      if (prop === 'sync') return sandboxedNativeSync
    }

    return super.get(target, prop, receiver)
  }

  getOwnPropertyDescriptor (target, prop) {
    // toString and sync are not owned properties by our definition
    if (prop === 'toString') return undefined
    if (prop === 'sync') return undefined

    return super.getOwnPropertyDescriptor(target, prop)
  }

  has (target, prop) {
    if (prop === 'toString') return true
    if (prop === 'sync') return true

    return super.has(target, prop)
  }

  ownKeys (target) {
    // toString and sync are not owned properties and require no special handling
    return super.ownKeys(target)
  }

  set (target, prop, value, receiver) {
    if (isNativeCode(receiver)) {
      if (prop === 'toString') throw new Error('Cannot set toString')
      if (prop === 'sync') throw new Error('Cannot set sync')
    }

    return super.set(target, prop, value, receiver)
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function isNativeCode (x) {
  const editor = Code._editor(x)
  return editor && editor._native
}

// ------------------------------------------------------------------------------------------------

module.exports = NativeCodeMembrane
