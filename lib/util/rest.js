/**
 * rest.js
 *
 * Lightweight API to make REST requests in node and the browser
 */

const Log = require('./log')
const { NotImplementedError } = require('./errors')

// ------------------------------------------------------------------------------------------------
// REST
// ------------------------------------------------------------------------------------------------

const TAG = 'REST'

class REST {
  static async _get (url, timeout = 2000) {
    return REST._request(url, 'GET', {}, timeout)
  }

  static async _post (url, body = {}, timeout = 2000) {
    return REST._request(url, 'POST', body, timeout)
  }

  static async _request (url, method, body, timeout) {
    Log._info(TAG, method, url)

    let requester = null
    // eslint-disable-next-line
    if (typeof VARIANT !== 'undefined' && VARIANT === 'browser') {
      requester = require('./rest-browser')
    } else {
      requester = require('./rest-node')
    }

    let result = null
    try {
      result = await requester._request(url, method, body, timeout)
    } catch (e) {
      // Add the url to the request error
      e.message += `\n\n${method} ${url}`
      throw e
    }

    // Parse the result
    const { data, status, statusText } = result

    // Success
    if (status >= 200 && status < 300) return data

    // Error. Report it.
    const message = data.message ? (data.message.message || data.message) : data
    const reason = data.name && message ? `${data.name}: ${message}` : data.name || message
    throw new Error(`${status} ${statusText}\n\n${method} ${url}\n\n${reason}`)
  }
}

// ------------------------------------------------------------------------------------------------
// Requester API
// ------------------------------------------------------------------------------------------------

/**
 * Requester API that both rest-node and rest-browser implement.
 */
class Requester {
  /**
   * Makes a HTTPS request
   * @param {string} url Url to request
   * @param {string} method GET or POST
   * @param {?object} body Optional body for POST methods
   * @param {number} timeout Timeout in milliseconds
   * @returns {Promise<{data, status, statusText}>} Response data, status code, and status message
   */
  async _request (url, method, body, timeout) { throw new NotImplementedError() }
}

REST._Requester = Requester

// ------------------------------------------------------------------------------------------------

module.exports = REST
