/**
 * checkpoint.js
 *
 * A save point for a jig to easily revert its state
 */

const ResourceJSON = require('./json')
const { JigControl } = require('../jig')
const { _resourceType } = require('../../lib/kernel/misc')

class Checkpoint {
  constructor (x, code, owner) {
    this._refs = []

    // Checkpoints do not cache, because we need every resource intact. Even dups. For now.
    // Otherwise, reads are lost.
    this._opts = {
      _replacer:
        ResourceJSON._replace._multiple(
          ResourceJSON._replace._resources(resource => { this._refs.push(resource); return this._refs.length - 1 }),
          ResourceJSON._replace._arbitraryObjects()),

      _reviver: ResourceJSON._revive._multiple(
        ResourceJSON._revive._resources(ref => this._refs[ref]),
        ResourceJSON._revive._arbitraryObjects())
    }

    JigControl._disableSafeguards(() => {
      JigControl._disableProxy(() => {
        this._serialized = ResourceJSON._serialize(x, this._opts)
      })
    })

    this._refs.forEach(ref => {
      if (_resourceType(ref) === 'code') {
        code.deploy(ref)
      }
    })
  }

  restore () {
    this._restored = this._restored || ResourceJSON._deserialize(this._serialized, this._opts)

    return this._restored
  }

  equals (other) {
    const deepEqual = (a, b) => {
      if (typeof a !== typeof b) return false
      if (typeof a === 'object' && typeof b === 'object') {
        if (a === null && b === null) return true
        if (a === null || b === null) return false
        if (Object.keys(a).length !== Object.keys(b).length) return false
        return Object.keys(a).every(key => deepEqual(a[key], b[key]))
      }
      return a === b
    }

    if (!deepEqual(this._serialized, other._serialized)) return false
    if (this._refs.length !== other._refs.length) return false
    return this._refs.every((ref, n) => this._refs[n] === other._refs[n])
  }
}

module.exports = Checkpoint
