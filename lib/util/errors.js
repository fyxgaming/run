/**
 * errors.js
 *
 * Custom error types thrown by Run
 */

// ------------------------------------------------------------------------------------------------
// ArgumentError
// ------------------------------------------------------------------------------------------------

class ArgumentError extends Error {
  constructor (message = 'Unknown reason') {
    super(message)
    this.name = this.constructor.name
  }
}

// ------------------------------------------------------------------------------------------------
// InternalError
// ------------------------------------------------------------------------------------------------

class InternalError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
  }
}

// ------------------------------------------------------------------------------------------------
// RequestError
// ------------------------------------------------------------------------------------------------

/**
 * Error when a network request does not return 200
 */
class RequestError extends Error {
  constructor (reason, status, statusText, method, url) {
    super(`${status} ${statusText}\n\n${method} ${url}\n\n${reason}`)
    this.reason = reason
    this.status = status
    this.statusText = statusText
    this.method = method
    this.url = url
    this.name = this.constructor.name
  }
}

// ------------------------------------------------------------------------------------------------
// StateError
// ------------------------------------------------------------------------------------------------

class StateError extends Error {
  constructor (message = 'Unknown reason') {
    super(message/*  */)
    this.name = this.constructor.name
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
// UnimplementedError
// ------------------------------------------------------------------------------------------------

/**
 * Error when a method is deliberately not implemented
 */
class UnimplementedError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  ArgumentError,
  InternalError,
  RequestError,
  StateError,
  TimeoutError,
  UnimplementedError
}
