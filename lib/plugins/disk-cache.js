/**
 * disk-cache.js
 *
 * Cache that stores state in files on the disk
 */

/* global VARIANT */

if (typeof VARIANT === 'undefined' || VARIANT === 'node') {
  const { _sha256 } = require('../kernel/kernel')
  const fs = require('fs')
  const path = require('path')
  const Log = require('../kernel/log')

  // ----------------------------------------------------------------------------------------------
  // Globals
  // ----------------------------------------------------------------------------------------------

  const TAG = 'DiskCache'

  // ----------------------------------------------------------------------------------------------
  // DiskCache
  // ----------------------------------------------------------------------------------------------

  class DiskCache {
    constructor (options = { }) {
      this.dir = options.dir || './.runcache'

      // Try creating the local cache folder. Swallow errors.
      try {
        fs.mkdirSync(this.dir, { recursive: true })
      } catch (e) {
        if (Log._debugOn) Log._debugOn(TAG, `Failed to create cache directory: ${e.toString()}`)
      }
    }

    async set (key, value) {
      // Hash the key to generate the filename, or else some berries may be too long.
      // It also solve the problem of :// in the filenames.
      const hash = Buffer.from(await _sha256(Buffer.from(key, 'utf8'))).toString('hex')
      const filename = path.join(this.dir, hash)

      return new Promise((resolve, reject) => {
        const options = { encoding: 'utf8', flag: 'w' }
        fs.writeFile(filename, JSON.stringify(value), options, (err) => {
          err ? reject(err) : resolve()
        })
      })
    }

    async get (key) {
      // Hash the key to generate the filename, or else some berries may be too long.
      // It also solve the problem of :// in the filenames.
      const hash = Buffer.from(await _sha256(Buffer.from(key, 'utf8'))).toString('hex')
      const filename = path.join(this.dir, hash)

      return new Promise((resolve, reject) => {
        const options = { encoding: 'utf8', flag: 'r' }
        fs.readFile(filename, options, (err, data) => {
          if (err) {
            resolve(undefined)
          } else {
            try {
              // If we are simultaneously writing while reading, we may get an empty file
              // When this happens, do a synchronous read. (But could we get a partial read?)
              if (!data) data = fs.readFileSync(filename, options)
              resolve(JSON.parse(data))
            } catch (e) {
              reject(e)
            }
          }
        })
      })
    }
  }

  // ----------------------------------------------------------------------------------------------

  module.exports = DiskCache
} else {
  module.exports = null
}
