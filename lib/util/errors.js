/**
 * errors.js
 *
 * Custom error types thrown by Run
 */

// ------------------------------------------------------------------------------------------------
// NotImplementedError
// ------------------------------------------------------------------------------------------------

/**
 * Error when a method is deliberately not implemented
 */
class NotImplementedError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { NotImplementedError }
