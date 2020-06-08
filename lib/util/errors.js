/**
 * errors.js
 *
 * Custom error types thrown by Run
 */

const { _text } = require('./type')

// ------------------------------------------------------------------------------------------------
// InstallFailedError
// ------------------------------------------------------------------------------------------------

class InstallFailedError extends Error {
  constructor (T, reason = 'Unknown reason') {
    super(`Cannot install ${_text(T)}\n\n${reason}`)
  }
}

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
// RequestFailedError
// ------------------------------------------------------------------------------------------------

/**
 * Error when a network request does not return 200
 */
class RequestFailedError extends Error {
  constructor (reason, status, statusText, method, url) {
    super(`${status} ${statusText}\n\n${method} ${url}\n\n${reason}`)
    this.reason = reason
    this.status = status
    this.statusText = statusText
    this.method = method
    this.url = url
  }
}

// ------------------------------------------------------------------------------------------------
// TimeoutError
// ------------------------------------------------------------------------------------------------

/**
 * Error when an async call times out
 */
class TimeoutError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { InstallFailedError, NotImplementedError, RequestFailedError, TimeoutError }
