/**
 * rest.js
 *
 * Makes REST API requests for node and the browser
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
    return _browserRequest(url, method, body, timeout)
  } else {
    return _nodeRequest(url, method, body, timeout)
  }
}

// ------------------------------------------------------------------------------------------------
// _nodeRequest
// ------------------------------------------------------------------------------------------------

/*
        console.log(res.statusCode)
        console.log(res.statusMessage)
        console.log(res.headers)
        */

async function _nodeRequest (url, method, body, timeout) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const zlib = require('zlib')

    const headers = { 'Accept-Encoding': 'gzip' }
    if (body) headers['Content-Type'] = 'application/json'
    const options = { method, headers, timeout }

    function onData (res, data) {
      resolve(data.toString())
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
    req.end()
  })
}

// ------------------------------------------------------------------------------------------------
// _browserRequest
// ------------------------------------------------------------------------------------------------

async function _browserRequest (url, options) {
// TODO REMOVE
  const AbortController = {}
  const fetch = {}

  const timeout = options.timeout || 2000

  // Run and MatterCloud gzip responses, but this is only needed in node. In browser, it errors.
  // It seems like a good idea to use this for all fetches.
  if (typeof window === 'undefined') {
    options.headers = options.headers || {}
    options.headers['Accept-Encoding'] = 'gzip'
  }

  const controller = new AbortController()
  options.method = options.method || 'GET'
  options.signal = controller.signal
  let timedOut = false
  const timerId = setTimeout(() => { timedOut = true; controller.abort() }, timeout)

  try {
    const response = await fetch(url, options)
    return _parseJsonResponse(response)
  } catch (e) {
    if (timedOut) throw new Error(`Request timed out\n\n${options.method} ${url}`)
    throw e
  } finally {
    clearTimeout(timerId)
  }
}

// ------------------------------------------------------------------------------------------------
// _parseJsonResponse
// ------------------------------------------------------------------------------------------------

/**
 * When using the fetch library, this method safely parses responses to JSON
 * @param {Response} res Response
 */
async function _parseJsonResponse (res) {
  // Check for 200-299 status
  if (res.ok) {
    const contentType = res.headers.get('content-type') || '<missing>'
    if (contentType.includes('application/json')) {
      return res.json()
    } else if (contentType.includes('text/plain')) {
      return res.text()
    } else {
      throw new Error(`Unsupported content type: ${contentType}\n\n${res.url}`)
    }
  }

  // Error occured. Report it.
  let reason = 'Unknown reason'
  try {
    const data = await res.json()
    const message = data.message ? (data.message.message || data.message) : data
    reason = data.name && message ? `${data.name}: ${message}` : data.name || message
  } catch (e) { }
  const line1 = `${res.status} ${res.statusText}`
  const line2 = `${res.url}`
  const line3 = `${reason}`
  throw new Error(`${line1}\n\n${line2}\n\n${line3}`)
}

// ------------------------------------------------------------------------------------------------

module.exports = { _get, _post }
