/**
 * jig2.js
 *
 * The jig proxy handler for both code and objects
 */

// ------------------------------------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------------------------------------

class _JigHandler {
  /**
     * Disables the jig's handler making it function like the underlying target
     *
     * @param {function} callback Function to execute while disabled
     * @returns {*} Callback return value
     */
  static _disable (callback) {
    const prev = this._enabled
    try { this._enabled = false; return callback() } finally { this._enabled = prev }
  }
}

// Control state
_JigHandler._enabled = true

// ------------------------------------------------------------------------------------------------

module.exports = { _JigHandler }
