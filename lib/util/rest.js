/**
 * rest.js
 *
 * Lightweight API to make REST requests in node and the browser
 */

/* global VARIANT */

const Log = require('./log')
const { RequestError, TimeoutError } = require('../util/errors')
const { _limit } = require('./misc')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'REST'

// ------------------------------------------------------------------------------------------------
// REST
// ------------------------------------------------------------------------------------------------

class REST {
  static async _get (url, timeout = REST._timeout, headers = {}) {
    for (let i = 0; i <= REST._retries; i++) {
      try {
        return await REST._request(url, 'GET', undefined, timeout, headers)
      } catch (e) {
        if (i === REST._retries) throw e
        if (Log._warnOn) Log._warn(e.toString())
        if (Log._warnOn) Log._info(TAG, 'GET', url, `(Retry ${i + 1}/${REST._retries})`)
      }
    }
  }

  static async _post (url, body, timeout = REST._timeout, headers = {}) {
    for (let i = 0; i <= REST._retries; i++) {
      try {
        return await REST._request(url, 'POST', body, timeout, headers)
      } catch (e) {
        if (i === REST._retries) throw e
        if (Log._warnOn) Log._warn(e.toString())
        if (Log._warnOn) Log._info(TAG, 'POST', url, `(Retry ${i + 1}/${REST._retries})`)
      }
    }
  }

  static async _request (url, method, body, timeout, headers) {
    if (Log._infoOn) Log._info(TAG, method, url)

    let result = null
    try {
      result = await request(url, method, body, timeout, headers)
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
    throw new RequestError(reason, status, statusText, method, url)
  }
}

// ------------------------------------------------------------------------------------------------
// Request function
// ------------------------------------------------------------------------------------------------

/**
 * Makes an HTTP request.
 *
 * This is set differently for browser or node
 * @param {string} url Url to request
 * @param {string} method GET or POST
 * @param {?object} body Optional body for POST methods
 * @param {number} timeout Timeout in milliseconds
 * @returns {Promise<{data, status, statusText}>} Response data, status code, and status message
 */
let request = null

// ------------------------------------------------------------------------------------------------
// Browser request function
// ------------------------------------------------------------------------------------------------

if (typeof VARIANT !== 'undefined' && VARIANT === 'browser') {
  request = async function (url, method, body, timeout, headers) {
    const { AbortController, fetch } = window

    const controller = new AbortController()
    headers.accept = 'application/json'
    if (body) headers['content-type'] = 'application/json'
    const options = { method, body: JSON.stringify(body), headers, signal: controller.signal }
    let timedOut = false
    const timerId = setTimeout(() => { timedOut = true; controller.abort() }, _limit(timeout, 'timeout'))

    try {
      const res = await fetch(url, options)

      let data = null
      const contentTypeHeaders = res.headers.get('content-type')
      if (contentTypeHeaders && contentTypeHeaders.includes('application/json')) {
        data = await res.json()
      } else {
        data = await res.text()
      }

      return { data, status: res.status, statusText: res.statusText }
    } catch (e) {
      if (timedOut) throw new TimeoutError(`Request timed out after ${timeout}ms`)
      throw e
    } finally {
      clearTimeout(timerId)
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Node request function
// ------------------------------------------------------------------------------------------------

if (typeof VARIANT === 'undefined' || VARIANT === 'node') {
  request = async function (url, method, body, timeout, headers) {
    return new Promise((resolve, reject) => {
      const https = url.startsWith('http://') ? require('http') : require('https')
      const zlib = require('zlib')

      headers.accept = 'application/json'
      headers['accept-encoding'] = 'gzip'
      if (body) headers['content-type'] = 'application/json'
      const options = { method, headers, timeout: _limit(timeout, 'timeout') }

      function onData (res, data) {
        const contentTypeHeaders = res.headers['content-type']
        if (contentTypeHeaders && contentTypeHeaders.includes('application/json') && data) {
          data = JSON.parse(data)
        }
        resolve({ data, status: res.statusCode, statusText: res.statusMessage })
      }

      function onResponse (res) {
        let data = Buffer.alloc(0)
        res.on('data', part => { data = Buffer.concat([data, part]) })

        res.on('end', () => {
          if (res.headers['content-encoding'] === 'gzip') {
            zlib.gunzip(data, function (err, unzipped) {
              if (err) return reject(err)
              onData(res, unzipped.toString())
            })
          } else {
            onData(res, data.toString())
          }
        })
      }

      const req = https.request(url, options, onResponse)
      if (body) req.write(JSON.stringify(body))

      req.on('error', e => reject(e))

      req.on('timeout', () => {
        req.abort()
        reject(new TimeoutError(`Request timed out after ${timeout}ms`))
      })

      req.end()
    })
  }
}

// ------------------------------------------------------------------------------------------------
// _dedup
// ------------------------------------------------------------------------------------------------

/**
 * Dedups async tasks that return the same value
 * @param {object} cache Cache to store duplicate task
 * @param {string} key String that uniquely identifies this task
 * @param {function} request Async function to perform the task
 */
async function _dedup (cache, key, request) {
  const prev = cache[key]

  if (prev) {
    return new Promise((resolve, reject) => prev.push({ resolve, reject }))
  }

  const promises = cache[key] = []

  try {
    const result = await request()

    promises.forEach(x => x.resolve(result))

    return result
  } catch (e) {
    promises.forEach(x => x.reject(e))

    throw e
  } finally {
    delete cache[key]
  }
}

// ------------------------------------------------------------------------------------------------
// _cache
// ------------------------------------------------------------------------------------------------

/**
 * Caches the result or error of an async task for a period of time
 * @param {*} cache Cache to store results
 * @param {*} key String that uniquely identifies this task
 * @param {*} ms Milliseconds to cache the result
 * @param {*} request Async function to perform the task
 */
async function _cache (cache, key, ms, request) {
  const now = Date.now()
  const prev = cache[key]

  for (const cachedKey of Object.keys(cache)) {
    if (now > cache[cachedKey].expiration) {
      delete cache[cachedKey]
    }
  }

  if (prev && now < prev.expiration) {
    if (prev.error) throw prev.error
    return prev.result
  }

  try {
    const result = await request()
    cache[key] = { expiration: now + ms, result }
    return result
  } catch (error) {
    cache[key] = { expiration: now + ms, error }
    throw error
  }
}

// ------------------------------------------------------------------------------------------------
// Settings
// ------------------------------------------------------------------------------------------------

// Network timeout for each retry
REST._timeout = 30000

// Number of retries to attempt per call
REST._retries = 2

// ------------------------------------------------------------------------------------------------

REST._dedup = _dedup
REST._cache = _cache

module.exports = REST
