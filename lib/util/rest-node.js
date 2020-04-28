/**
 * rest-node.js
 *
 * Makes requests in node
 */

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

module.exports = _nodeRequest
