/**
 * rest.js
 *
 * Lightweight API to make REST requests in node and the browser
 */

/* global VARIANT */

const Log = require('./log')
const { RequestFailedError, TimeoutError } = require('./errors')

// ------------------------------------------------------------------------------------------------
// REST
// ------------------------------------------------------------------------------------------------

const TAG = 'REST'

class REST {
  static async _get (url, timeout = 2000) {
    return REST._request(url, 'GET', undefined, timeout)
  }

  static async _post (url, body, timeout = 2000) {
    return REST._request(url, 'POST', body, timeout)
  }

  static async _request (url, method, body, timeout) {
    Log._info(TAG, method, url)

    let result = null
    try {
      result = await request(url, method, body, timeout)
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
    throw new RequestFailedError(reason, status, statusText, method, url)
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
  request = async function (url, method, body, timeout) {
    const { AbortController, fetch } = window

    const controller = new AbortController()
    const headers = { accept: 'application/json' }
    if (body) headers['content-type'] = 'application/json'
    const options = { method, body: JSON.stringify(body), headers, signal: controller.signal }
    let timedOut = false
    const timerId = setTimeout(() => { timedOut = true; controller.abort() }, timeout)

    try {
      const res = await fetch(url, options)

      let data = null
      if (res.headers.get('content-type').includes('application/json')) {
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
  request = async function (url, method, body, timeout) {
    return new Promise((resolve, reject) => {
      const https = url.startsWith('http://') ? require('http') : require('https')
      const zlib = require('zlib')

      const headers = {
        accept: 'application/json',
        'accept-encoding': 'gzip'
      }
      if (body) headers['content-type'] = 'application/json'
      const options = { method, headers, timeout }

      function onData (res, data) {
        console.log('DATA', data)
        console.log('DATALEN', data && data.length)
        console.log('DATATYPE', typeof data)
        if (res.headers['content-type'].includes('application/json')) {
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

module.exports = REST
