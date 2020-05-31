/**
 * jig-sys.js
 *
 * The system controller for all jigs
 */

// ------------------------------------------------------------------------------------------------
// JIGSYS
// ------------------------------------------------------------------------------------------------

const JIGSYS = {
  // Whether jigs are being used by users and need protection, or by the system
  _admin: false,
  // Whether to enable reading special properties, specifically $target
  _special: false
}

/**
 * Disables the jig handler checks making it function like the underlying target
 *
 * @param {function} callback Function to execute while admin
 * @returns {*} Callback return value
 */
JIGSYS._sudo = function (callback) {
  const prev = this._admin
  try {
    this._admin = true
    return callback()
  } finally {
    this._admin = prev
  }
}

/**
 * Reads the jig's underlying target which is useful for performance
 *
 * @param {*} x Jig object or code proxy
 * @returns {*} Underlying jig object or code target
 */
JIGSYS._target = function (x) {
  const prev = this._special
  try {
    this._special = true
    return x.$target
  } finally {
    this._special = prev
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = JIGSYS
