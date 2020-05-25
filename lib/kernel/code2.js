/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 *
 * Terminology
 *   - T means any type, meaning a class or function
 *   - S means specifically a sandboxed typed
 */

const { _text } = require('../util/misc')
const Log = require('../util/log')

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

const TAG = 'Code'

/**
 * Code repository, installer, and deployer
 *
 * This manager is specific to a single network. It may, however, be shared across multiple
 * Run instances on that network.
 */
class Code {
  constructor (network) {
    this._network = network
    this._localDescriptors = new Map() // T -> CodeDescriptor
    this._sandboxDescriptors = new Map() // S -> CodeDescriptor
    this._locationDescriptors = new Map() // Location -> CodeDescriptor
  }

  _install (T) {
    const prev = this._find(T)
    if (prev) return prev

    Log._info(TAG, 'Installing', _text(T))

    checkValid(T)

    const desc = new CodeDescriptor()
    desc._T = T
    desc._locals = new Set([T])
    desc._S = this._sandbox(T)

    this._localDescriptors.set(T, desc)
    this._sandboxDescriptors.set(desc._S, desc)

    // If there are presets, apply them

    return desc
  }

  _installNative (T) {
    // TODO
  }

  _deploy (T) {
    // install
    // then deploy
  }

  _find (T) {
    const desc = this._localDescriptors.get(T) || this._sandboxDescriptors.get(T)
    if (desc) return desc

    // There may be multiple copies of a class when we are loading libraries containing
    // copies with the same presets. We treat these copies all the same.
    const location = preset('location', T, this._network)
    const desc2 = this._locationDescriptors.get(location)
    if (desc2) {
      desc2._locals.add(T)
      return desc2
    }
  }

  _sandbox (T) {
    // TODO
  }
}

// ------------------------------------------------------------------------------------------------
// CodeDescriptor
// ------------------------------------------------------------------------------------------------

/**
 * Holds all the various versions and metadata for a particular type
 */
class CodeDescriptor {
  constructor () {
    this._T = null
    this._S = null
    this._locals = new Set() // All versions of T
    this._deploying = false
    this._deployed = false
    this._native = false
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function preset (name, T, network) {
  // TODO
}

function checkValid (T) {
  // TODO
}

// ------------------------------------------------------------------------------------------------

module.exports = Code
