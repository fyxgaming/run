/**
 * rest-node.js
 *
 * Makes requests in node
 */

const { TimeoutError } = require('./errors')

// ------------------------------------------------------------------------------------------------
// NodeRequester
// ------------------------------------------------------------------------------------------------

class NodeRequester {
  static async _request (url, method, body, timeout) {
    return new Promise((resolve, reject) => {
      const https = require('https')
      const zlib = require('zlib')

      const headers = { 'accept-encoding': 'gzip' }
      if (body) headers['content-type'] = 'application/json'
      const options = { method, headers, timeout }

      function onData (res, data) {
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
      req.on('timeout', () => { req.abort(); reject(new TimeoutError(`Request timed out after ${timeout}ms`)) })
      req.end()
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = NodeRequester
