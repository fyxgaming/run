/**
 * rest-browser.js
 *
 * Makes requests in the browser
 */

// ------------------------------------------------------------------------------------------------
// _browserRequest
// ------------------------------------------------------------------------------------------------

async function _browserRequest (url, options) {
  console.log('BROWSER')
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

module.exports = _browserRequest
