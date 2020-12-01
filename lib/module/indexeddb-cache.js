/**
 * indexeddb-cache.js
 *
 * A persistent cache for use in the browser
 */

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const DATABASE_NAME = 'run-browser-cache'
const DATABASE_VERSION = 1
const DATABASE_OBJECT_STORE = 'run-objects'

// ------------------------------------------------------------------------------------------------
// IndexedDbCache
// ------------------------------------------------------------------------------------------------

class IndexedDbCache {
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
    request.onerror = () => dbReject(new Error(`Cannot access database: ${request.error.message}`))
    request.onblocked = () => dbReject(new Error('Upgrade not supported'))
    request.onupgradeneeded = event => {
      if (event.oldVersion !== 0) { dbReject(new Error('Upgrade not supported')); return }
      const db = request.result
      db.createObjectStore(DATABASE_OBJECT_STORE)
    }
  }

  async set (key, value) {
    // Open the object store that has all keys
    const db = await this._dbPromise
    const tx = db.transaction(DATABASE_OBJECT_STORE, 'readwrite')
    const objs = tx.objectStore(DATABASE_OBJECT_STORE)

    // Add the value with the key
    return new Promise((resolve, reject) => {
      const request = objs.put(value, key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(request.error)
    })
  }

  async get (key) {
    // Open the object store that has all keys in read-only mode
    const db = await this._dbPromise
    const tx = db.transaction(DATABASE_OBJECT_STORE, 'readonly')
    const objs = tx.objectStore(DATABASE_OBJECT_STORE)

    // Get the value using the key
    return new Promise((resolve, reject) => {
      const request = objs.get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(request.error)
    })
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = IndexedDbCache
