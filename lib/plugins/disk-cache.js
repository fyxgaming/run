/**
 * disk-cache.js
 *
 * Cache that stores state in files on the disk
 */

/* global VARIANT */

if (typeof VARIANT === 'undefined' || VARIANT === 'node') {
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
      const filename = path.join(this.dir, encodeURIComponent(key))

      return new Promise((resolve, reject) => {
        fs.writeFile(filename, JSON.stringify(value), (err) => {
          err ? reject(err) : resolve()
        })
      })
    }

    async get (key) {
      const filename = path.join(this.dir, encodeURIComponent(key))

      return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (err, data) => {
          if (err) {
            resolve(undefined)
          } else {
            try {
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
