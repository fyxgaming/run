/**
 * intrinsics.js
 *
 * Helpers for the known built-in objects in JavaScript
 */

const { _codeToGetIntrinsics, _hostIntrinsics } = require('../util/intrinsics')

// ------------------------------------------------------------------------------------------------
// Intrinsics
// ------------------------------------------------------------------------------------------------

/**
   * Manages known intrinsics
   */
class Intrinsics {
  constructor () {
    this.default = null
    this.allowed = []
    this.types = new Set()
    this.use(_hostIntrinsics)
  }

  set (intrinsics) {
    this.default = null
    this.allowed = []
    this.types = new Set()
    this.use(intrinsics)
    return this
  }

  allow (intrinsics) {
    this.allowed.push(intrinsics)
    Object.keys(intrinsics).forEach(name => this.types.add(intrinsics[name]))
    return this
  }

  use (intrinsics) {
    this.allow(intrinsics)
    this.default = intrinsics
    return this
  }
}

Intrinsics.defaultIntrinsics = new Intrinsics()

// ------------------------------------------------------------------------------------------------

module.exports = { _codeToGetIntrinsics, _hostIntrinsics, Intrinsics }
