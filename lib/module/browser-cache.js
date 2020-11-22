/**
 * browser-cache.js
 */

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const DATABASE_NAME = 'run-browser-cache'
const DATABASE_VERSION = 1

// ------------------------------------------------------------------------------------------------
// BrowserCache
// ------------------------------------------------------------------------------------------------

class BrowserCache {
  constructor (options = { }) {
    // Make sure we are running in a browser environment with indexedDB
    if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
      throw new Error('Your browser doesn\'t support IndexedDB')
    }

    // Parse settings
    const name = typeof options.name !== 'undefined' ? options.name : DATABASE_NAME
    const version = typeof options.version !== 'undefined' ? options.version : DATABASE_VERSION

    // Setup initial cache state
    let dbResolve, dbReject
    this._dbPromise = new Promise((resolve, reject) => { dbResolve = resolve; dbReject = reject })

    // Open the database asyncronously
    const request = window.indexedDB.open(name, version)
    request.onsuccess = () => dbResolve(request.result)
    request.onerror = () => dbReject(new Error(`Cannot access BrowserCache database: ${request.error.message}`))
    request.onupgradeneeded = event => { if (event.oldVersion !== 0) dbReject(new Error('Upgrade not supported')) }
    request.onblocked = () => dbReject(new Error('Upgrade not supported'))
  }

  async set (key, value) {
    await this._dbPromise

    // TODO
  }

  async get (key, value) {
    await this._dbPromise

    // TODO
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = BrowserCache
