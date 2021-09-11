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
        if (!e.toString().includes('already exists')) {
          if (Log._errorOn) Log._error(TAG, `Failed to create cache directory: ${e.toString()}`)
        }
      }
    }

    async set (key, value) {
      const filename = await this._filename(key)

      return new Promise((resolve, reject) => {
        const options = { encoding: 'utf8', flag: 'w' }
        fs.writeFile(filename, JSON.stringify(value), options, (err) => {
          // Swallow the errors. There might be race conditions, or disk failures.
          // Ideally we would report, but right now the cache should be able to fail.
          if (err && Log._errorOn) Log._error(TAG, `Failed to save ${key}: ${err}`)

          resolve()
        })
      })
    }

    async get (key) {
      const filename = await this._filename(key)

      return new Promise((resolve, reject) => {
        const options = { encoding: 'utf8', flag: 'r' }
        fs.readFile(filename, options, (err, data) => {
          if (err) {
            if (!err.toString().includes('no such file')) {
              if (Log._errorOn) Log._error(TAG, `Failed to read ${key}: ${err.toString()}`)
            }
            resolve(undefined)
          } else {
            try {
              // If we are simultaneously writing while reading, we may get an empty file.
              // When this happens, do a synchronous read. We might get a partial read, but
              // because of the JSON format, there should always be a terminal character
              // so JSON.parse will fail. This allows us to avoid a lock file. We retry
              // a few times just in case. If the data can't be read, we silently fail,
              // because the cache is designed to be resilent, and these are most likely
              // commonly-changed keys, like config://code-filter, where the impact is low.
              let value
              let jsonError
              for (let i = 0; i < 3; i++) {
                if (!data) data = fs.readFileSync(filename, options)
                try { value = JSON.parse(data) } catch (e) { jsonError = e; continue }
              }
              if (jsonError && Log._errorOn) Log._error(TAG, `Failed to read ${key}: ${jsonError}`)
              resolve(value)
            } catch (e) {
              reject(e)
            }
          }
        })
      })
    }

    async _filename (key) {
      // Hash the key to generate the filename, or else some berries may be too long.
      // It also solve the problem of :// in the filenames.
      const hash = Buffer.from(await _sha256(Buffer.from(key, 'utf8'))).toString('hex')
      return path.join(this.dir, hash)
    }
  }

  // ----------------------------------------------------------------------------------------------

  module.exports = DiskCache
} else {
  module.exports = null
}
