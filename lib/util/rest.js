/**
 * rest.js
 *
 * Lightweight API to make REST requests in node and the browser
 */

const Log = require('./log')

// ------------------------------------------------------------------------------------------------
// _get
// ------------------------------------------------------------------------------------------------

async function _get (url, timeout = 2000) {
  return _request(url, 'GET', {}, timeout)
}

// ------------------------------------------------------------------------------------------------
// _post
// ------------------------------------------------------------------------------------------------

async function _post (url, body = {}, timeout = 2000) {
  return _request(url, 'POST', body, timeout)
}

// ------------------------------------------------------------------------------------------------
// _request
// ------------------------------------------------------------------------------------------------

const TAG = 'REST'

async function _request (url, method, body, timeout) {
  Log._info(TAG, method, url)

  // eslint-disable-next-line
  if (typeof VARIANT !== 'undefined' && VARIANT === 'browser') {
    return require('./rest-browser')(url, method, body, timeout)
  } else {
    return require('./rest-node')(url, method, body, timeout)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { _get, _post }
