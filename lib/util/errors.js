/**
 * errors.js
 *
 * Custom Error classes thrown by RUN.
 *
 * Custom errors are used when the user is expected to be able to respond differently for them,
 * or when there is custom data that should be attached to the error.
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
// ClientModeError
// ------------------------------------------------------------------------------------------------

/**
 * Error when performing disallowed actions in client mode
 */
class ClientModeError extends Error {
  constructor (data, type) {
    const hint = `Only cached ${type}s may be loaded in client mode`
    const message = `Cannot load ${data}\n\n${hint}`
    super(message)
    this.data = data
    this.type = type
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
// TrustError
// ------------------------------------------------------------------------------------------------

/**
 * Error when a txid is not trusted and has code RUN tried to execute
 */
class TrustError extends Error {
  constructor (txid, method) {
    const hint = 'Hint: Trust this txid using run.trust(txid) if you know it is safe'
    const message = `Cannot load untrusted code${method ? ' via ' + method : ''}: ${txid}\n\n${hint}`
    super(message)
    this.txid = txid
    this.method = method
    this.name = this.constructor.name
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  ArgumentError,
  ClientModeError,
  InternalError,
  NotImplementedError,
  RequestError,
  TimeoutError,
  TrustError
}
